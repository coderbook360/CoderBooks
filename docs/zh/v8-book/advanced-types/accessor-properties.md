# 访问器属性：getter 与 setter 的底层机制

在上一章中，我们了解了属性描述符的基础知识。现在让我们深入探讨一种特殊的属性类型：**访问器属性**（Accessor Property）。

你是否思考过，为什么访问 `obj.property` 可以触发函数调用？为什么 Vue 2 的响应式系统能够监听属性变化？为什么有些属性看起来像数据，但实际上在背后执行了复杂的逻辑？

访问器属性通过 getter 和 setter 函数提供了对属性访问的完全控制，让我们能够在读取或写入属性时插入自定义逻辑。本章将深入 V8 引擎，了解访问器属性的底层实现机制、性能特征和最佳实践。

## 访问器属性基础

### 定义访问器属性

访问器属性由一对函数定义：`get` 和 `set`。

```javascript
const obj = {
    _temperature: 0,  // 私有存储（约定用 _ 前缀）
    
    get temperature() {
        console.log('Reading temperature');
        return this._temperature;
    },
    
    set temperature(value) {
        console.log('Setting temperature to', value);
        if (typeof value !== 'number') {
            throw new TypeError('Temperature must be a number');
        }
        this._temperature = value;
    }
};

obj.temperature = 25;  // 'Setting temperature to 25'
console.log(obj.temperature);  // 'Reading temperature', 输出 25

obj.temperature = 'hot';  // TypeError: Temperature must be a number
```

与数据属性不同，访问器属性：
- **没有 `value` 和 `writable`**：取而代之的是 `get` 和 `set` 函数
- **保留 `enumerable` 和 `configurable`**：控制是否可枚举和可配置

### 使用 Object.defineProperty 定义

```javascript
const obj = {
    _value: 0
};

Object.defineProperty(obj, 'value', {
    get() {
        return this._value;
    },
    set(newValue) {
        this._value = newValue;
    },
    enumerable: true,
    configurable: true
});

obj.value = 10;
console.log(obj.value);  // 10
```

### 只读和只写访问器

```javascript
// 只读访问器（只有 getter）
const obj1 = {
    get readOnly() {
        return 42;
    }
};

console.log(obj1.readOnly);  // 42
obj1.readOnly = 100;  // 严格模式下 TypeError，非严格模式下静默失败
console.log(obj1.readOnly);  // 仍然是 42

// 只写访问器（只有 setter）
const obj2 = {
    _log: [],
    set writeOnly(value) {
        this._log.push(value);
    }
};

obj2.writeOnly = 'message';
console.log(obj2.writeOnly);  // undefined（没有 getter）
console.log(obj2._log);  // ['message']
```

## V8 中的访问器属性实现

### AccessorPair 对象

V8 使用 `AccessorPair` 对象存储访问器属性的 getter 和 setter 函数。

回顾第15章，Map 的 Descriptors 数组存储属性元数据：

```
访问器属性的 Descriptor：
+---------------------------+
| Key: 'temperature'        |
+---------------------------+
| Details: 访问器类型标志    |
+---------------------------+
| AccessorPair 指针         |  ← 指向 AccessorPair 对象
+---------------------------+

AccessorPair 对象：
+---------------------------+
| Map 指针                  |
+---------------------------+
| getter 函数指针           |  ← 指向 JSFunction（或 null）
+---------------------------+
| setter 函数指针           |  ← 指向 JSFunction（或 null）
+---------------------------+
```

当访问 `obj.temperature` 时：

1. V8 查找对象的 Map，定位到 `temperature` 的 Descriptor
2. 检测到是访问器属性，获取 AccessorPair 对象
3. 取出 getter 函数指针
4. 调用 getter 函数，将 `obj` 作为 `this`
5. 返回 getter 的返回值

### 访问器属性的查找

访问器属性的查找流程与数据属性类似，但多了函数调用：

```javascript
function getValue(obj, key) {
    // V8 内部简化逻辑
    const descriptor = obj[Map].descriptors.find(key);
    
    if (descriptor.type === 'data') {
        // 数据属性：直接返回值
        return descriptor.value;
    } else if (descriptor.type === 'accessor') {
        // 访问器属性：调用 getter
        const getter = descriptor.accessorPair.getter;
        if (getter === null) {
            return undefined;  // 没有 getter
        }
        return getter.call(obj);  // 调用 getter，this 是 obj
    }
}
```

### 原型链上的访问器属性

访问器属性可以定义在原型上，被所有实例共享：

```javascript
function Temperature(value) {
    this._value = value;
}

Object.defineProperty(Temperature.prototype, 'celsius', {
    get() {
        return this._value;
    },
    set(value) {
        this._value = value;
    }
});

Object.defineProperty(Temperature.prototype, 'fahrenheit', {
    get() {
        return this._value * 9 / 5 + 32;
    },
    set(value) {
        this._value = (value - 32) * 5 / 9;
    }
});

const temp = new Temperature(0);
console.log(temp.celsius);     // 0
console.log(temp.fahrenheit);  // 32

temp.fahrenheit = 100;
console.log(temp.celsius);     // 37.77...
```

所有 `Temperature` 实例共享原型上的访问器属性定义（AccessorPair 对象），但访问时的 `this` 绑定到各自的实例，访问各自的 `_value`。

## 性能特征

### 访问器属性 vs 数据属性

访问器属性需要函数调用，性能低于数据属性：

```javascript
// 数据属性
const dataObj = { x: 1 };

// 访问器属性
const accessorObj = {
    _x: 1,
    get x() {
        return this._x;
    }
};

// 性能测试
function testDataProperty() {
    let sum = 0;
    for (let i = 0; i < 1000000; i++) {
        sum += dataObj.x;
    }
    return sum;
}

function testAccessorProperty() {
    let sum = 0;
    for (let i = 0; i < 1000000; i++) {
        sum += accessorObj.x;
    }
    return sum;
}

console.time('Data Property');
testDataProperty();
console.timeEnd('Data Property');
// 典型输出：Data Property: 2ms

console.time('Accessor Property');
testAccessorProperty();
console.timeEnd('Accessor Property');
// 典型输出：Accessor Property: 15ms（慢 7-8 倍）
```

**性能差异原因**：

1. **函数调用开销**：每次访问都需要调用 getter/setter 函数
2. **栈帧创建**：函数调用需要创建新的执行上下文和栈帧
3. **参数传递**：setter 需要传递参数
4. **返回值处理**：getter 需要返回值
5. **优化限制**：访问器属性难以内联优化

### TurboFan 的优化

尽管访问器属性本质上需要函数调用，V8 的 TurboFan 编译器仍会尝试优化：

```javascript
class Point {
    constructor(x, y) {
        this._x = x;
        this._y = y;
    }
    
    get x() {
        return this._x;
    }
    
    get y() {
        return this._y;
    }
}

function distance(p1, p2) {
    const dx = p1.x - p2.x;  // 访问器属性
    const dy = p1.y - p2.y;  // 访问器属性
    return Math.sqrt(dx * dx + dy * dy);
}

// 多次调用后，TurboFan 可能内联 getter 函数
const p1 = new Point(0, 0);
const p2 = new Point(3, 4);

for (let i = 0; i < 10000; i++) {
    distance(p1, p2);
}
// TurboFan 可能将 p1.x 优化为直接访问 p1._x
```

TurboFan 的优化策略：

1. **内联 getter/setter**：如果 getter/setter 很简单，TurboFan 可能内联函数体
2. **类型推断**：如果类型稳定，生成针对特定类型的优化代码
3. **去虚化**：消除间接调用，直接调用目标函数

但这些优化有限制：
- getter/setter 必须简单（通常只是返回或设置一个字段）
- 对象类型必须稳定（单态或少量多态）
- 不能有副作用或复杂逻辑

## 访问器属性的典型应用

### 1. 数据验证

```javascript
class User {
    constructor(name, age) {
        this._name = name;
        this._age = age;
    }
    
    get age() {
        return this._age;
    }
    
    set age(value) {
        if (typeof value !== 'number' || value < 0 || value > 150) {
            throw new RangeError('Invalid age');
        }
        this._age = value;
    }
}

const user = new User('Alice', 25);
user.age = 26;  // OK
console.log(user.age);  // 26

try {
    user.age = -5;  // 抛出 RangeError
} catch (e) {
    console.log(e.message);  // 'Invalid age'
}
```

### 2. 计算属性

```javascript
class Rectangle {
    constructor(width, height) {
        this.width = width;
        this.height = height;
    }
    
    get area() {
        return this.width * this.height;
    }
    
    get perimeter() {
        return 2 * (this.width + this.height);
    }
}

const rect = new Rectangle(5, 10);
console.log(rect.area);       // 50
console.log(rect.perimeter);  // 30

rect.width = 8;
console.log(rect.area);       // 80（自动重新计算）
```

### 3. 懒加载/缓存

```javascript
class ExpensiveResource {
    get data() {
        if (!this._dataCache) {
            console.log('Loading expensive data...');
            this._dataCache = this._loadData();
        }
        return this._dataCache;
    }
    
    _loadData() {
        // 模拟昂贵的计算或 I/O
        return { value: 42 };
    }
}

const resource = new ExpensiveResource();
console.log(resource.data);  // 'Loading expensive data...', { value: 42 }
console.log(resource.data);  // { value: 42 }（直接返回缓存）
```

或者更激进的优化：第一次访问后，将访问器属性替换为数据属性（如第15章所示）：

```javascript
class LazyResource {
    get data() {
        const value = this._computeData();
        
        // 将访问器属性替换为数据属性
        Object.defineProperty(this, 'data', {
            value: value,
            writable: false,
            configurable: false
        });
        
        return value;
    }
    
    _computeData() {
        console.log('Computing...');
        return { result: 42 };
    }
}

const resource = new LazyResource();
console.log(resource.data);  // 'Computing...', { result: 42 }
console.log(resource.data);  // { result: 42 }（现在是数据属性，更快）
```

### 4. 响应式系统（Vue 2 风格）

Vue 2 使用 `Object.defineProperty` 实现响应式：

```javascript
function defineReactive(obj, key, value) {
    const observers = [];  // 观察者列表
    
    Object.defineProperty(obj, key, {
        get() {
            // 如果有当前正在执行的观察者，添加到列表
            if (currentObserver) {
                observers.push(currentObserver);
            }
            return value;
        },
        set(newValue) {
            if (newValue === value) return;
            value = newValue;
            // 通知所有观察者
            observers.forEach(observer => observer());
        },
        enumerable: true,
        configurable: true
    });
}

let currentObserver = null;

function observe(fn) {
    currentObserver = fn;
    fn();  // 执行一次，收集依赖
    currentObserver = null;
}

// 使用示例
const data = {};
defineReactive(data, 'count', 0);

observe(() => {
    console.log('Count is:', data.count);
});
// 输出：'Count is: 0'

data.count = 1;  // 触发 setter，输出：'Count is: 1'
data.count = 2;  // 输出：'Count is: 2'
```

这是一个简化版本，真实的 Vue 2 响应式系统更复杂，但核心思想是通过访问器属性拦截读写操作。

### 5. 私有属性模拟（ES2022 之前）

```javascript
const privateData = new WeakMap();

class BankAccount {
    constructor(balance) {
        privateData.set(this, { balance });
    }
    
    get balance() {
        return privateData.get(this).balance;
    }
    
    set balance(value) {
        if (value < 0) {
            throw new Error('Balance cannot be negative');
        }
        privateData.get(this).balance = value;
    }
    
    deposit(amount) {
        this.balance += amount;
    }
    
    withdraw(amount) {
        this.balance -= amount;
    }
}

const account = new BankAccount(1000);
console.log(account.balance);  // 1000
account.deposit(500);
console.log(account.balance);  // 1500

// 无法直接访问 _balance（因为根本没有这个属性）
console.log(account._balance);  // undefined
```

## 性能优化策略

### 1. 简化 getter/setter 逻辑

```javascript
// ❌ 不推荐：复杂的 getter
class ComplexGetter {
    get value() {
        // 复杂计算
        return this._data
            .filter(x => x > 0)
            .map(x => x * 2)
            .reduce((a, b) => a + b, 0);
    }
}

// ✅ 推荐：缓存计算结果
class OptimizedGetter {
    constructor() {
        this._data = [];
        this._cachedValue = null;
        this._dirty = true;
    }
    
    get value() {
        if (this._dirty) {
            this._cachedValue = this._data
                .filter(x => x > 0)
                .map(x => x * 2)
                .reduce((a, b) => a + b, 0);
            this._dirty = false;
        }
        return this._cachedValue;
    }
    
    updateData(newData) {
        this._data = newData;
        this._dirty = true;  // 标记需要重新计算
    }
}
```

### 2. 避免在热路径使用访问器

```javascript
// ❌ 性能关键代码中使用访问器
class Point {
    get x() {
        return this._x;
    }
    get y() {
        return this._y;
    }
}

function processPoints(points) {
    let sum = 0;
    for (let i = 0; i < points.length; i++) {
        sum += points[i].x + points[i].y;  // 每次迭代调用 4 次函数
    }
    return sum;
}

// ✅ 性能关键代码使用数据属性或缓存
class Point {
    constructor(x, y) {
        this.x = x;  // 数据属性，直接访问
        this.y = y;
    }
}

function processPoints(points) {
    let sum = 0;
    for (let i = 0; i < points.length; i++) {
        const p = points[i];
        sum += p.x + p.y;  // 直接访问，更快
    }
    return sum;
}

// 或者缓存访问器值
function processPointsWithAccessors(points) {
    let sum = 0;
    for (let i = 0; i < points.length; i++) {
        const p = points[i];
        const px = p.x;  // 只调用一次 getter
        const py = p.y;
        sum += px + py;
    }
    return sum;
}
```

### 3. 考虑使用方法代替访问器

如果属性访问有明显的计算成本，使用方法更明确：

```javascript
// 访问器：看起来像属性，但实际上很昂贵
class ExpensiveProperty {
    get result() {
        // 昂贵的计算
        return this.heavyComputation();
    }
    
    heavyComputation() {
        // ...
    }
}

const obj = new ExpensiveProperty();
console.log(obj.result);  // 看起来很轻量，但实际上很慢

// 方法：明确表明这是一个操作
class ExplicitMethod {
    computeResult() {
        // 昂贵的计算
        return this.heavyComputation();
    }
    
    heavyComputation() {
        // ...
    }
}

const obj2 = new ExplicitMethod();
console.log(obj2.computeResult());  // 明确表明这是一个计算
```

## 访问器属性的陷阱

### 陷阱 1：忘记处理 this 绑定

```javascript
const obj = {
    _value: 42,
    get value() {
        return this._value;
    }
};

console.log(obj.value);  // 42

const getValue = obj.value;
console.log(getValue);  // 42（返回的是 getter 函数本身！）

// 应该：
const boundGetter = () => obj.value;
console.log(boundGetter());  // 42
```

### 陷阱 2：在 getter 中修改状态

```javascript
// ❌ 不推荐：getter 有副作用
class Counter {
    constructor() {
        this._count = 0;
    }
    
    get count() {
        this._count++;  // 副作用！
        return this._count;
    }
}

const counter = new Counter();
console.log(counter.count);  // 1
console.log(counter.count);  // 2（每次访问都改变状态）
console.log(counter.count);  // 3
```

Getter 应该是纯函数，没有副作用。上述代码应该改为方法：

```javascript
// ✅ 推荐：使用方法表示有副作用的操作
class Counter {
    constructor() {
        this._count = 0;
    }
    
    get count() {
        return this._count;  // 纯 getter
    }
    
    increment() {
        this._count++;  // 明确的方法
        return this._count;
    }
}
```

### 陷阱 3：无限递归

```javascript
// ❌ 错误：setter 调用自己
const obj = {
    set value(v) {
        this.value = v;  // 无限递归！
    }
};

obj.value = 10;  // RangeError: Maximum call stack size exceeded

// ✅ 正确：存储在不同的属性
const obj = {
    set value(v) {
        this._value = v;  // 存储到 _value
    },
    get value() {
        return this._value;
    }
};
```

## 本章小结

访问器属性是 JavaScript 强大的特性，通过 getter 和 setter 函数提供对属性访问的完全控制。V8 使用 AccessorPair 对象存储访问器函数，并在访问时调用相应的函数。

**核心概念**：
- **访问器属性**：由 `get` 和 `set` 函数定义，而非 `value` 和 `writable`
- **AccessorPair**：V8 内部对象，存储 getter 和 setter 函数指针
- **函数调用开销**：访问器属性比数据属性慢 5-10 倍
- **TurboFan 优化**：简单的 getter/setter 可能被内联优化

**典型应用**：
- 数据验证和类型检查
- 计算属性（基于其他属性计算）
- 懒加载和缓存
- 响应式系统（Vue 2）
- 私有属性模拟

**性能考虑**：
- 访问器属性需要函数调用，性能低于数据属性
- 简化 getter/setter 逻辑，便于 TurboFan 优化
- 在热路径避免使用访问器，或缓存访问器值
- 昂贵的计算使用方法而非 getter，更明确

**最佳实践**：
- Getter 应该是纯函数，无副作用
- 避免在 getter/setter 中执行复杂逻辑
- 使用 `_property` 约定标记私有存储
- 考虑在首次访问后将访问器替换为数据属性（懒加载模式）

在下一章中，我们将探讨对象不可变性机制（`Object.freeze`、`Object.seal`、`Object.preventExtensions`），了解 V8 如何实现这些约束以及它们的性能影响。

**思考题**：

1. 为什么 Vue 3 使用 Proxy 而不是 `Object.defineProperty` 实现响应式？Proxy 相比访问器属性有哪些优势？
2. 如果一个类有 10 个访问器属性，所有实例是共享这 10 个 AccessorPair 对象，还是每个实例都有自己的副本？
3. TurboFan 在什么情况下能够内联 getter/setter？有哪些限制？
