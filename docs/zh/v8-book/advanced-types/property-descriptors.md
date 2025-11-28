# 属性描述符：对象属性的完整控制

你是否思考过，为什么有些对象属性可以被修改，有些却不能？为什么 `Object.keys()` 能列出某些属性，但列不出另一些？为什么 `const` 对象的属性仍然可以被修改？

这些问题的答案都指向一个核心概念：**属性描述符**（Property Descriptor）。在第11章中，我们了解了对象属性的存储方式（快慢属性）。本章将深入探讨属性的元数据——属性描述符，以及 V8 如何在内存中高效地存储和管理这些元数据。

## 属性的两种类型

ECMAScript 规范定义了两种属性类型：

1. **数据属性**（Data Property）：存储值的普通属性
2. **访问器属性**（Accessor Property）：通过 getter/setter 函数访问的属性

### 数据属性

数据属性包含四个特性（attributes）：

```javascript
const obj = {};
Object.defineProperty(obj, 'name', {
    value: 'Alice',         // [[Value]]：属性的值
    writable: true,         // [[Writable]]：是否可写
    enumerable: true,       // [[Enumerable]]：是否可枚举
    configurable: true      // [[Configurable]]：是否可配置
});

console.log(obj.name);  // 'Alice'
```

**特性详解**：

- **`value`**：属性的实际值
- **`writable`**：如果为 `false`，属性值不能被赋值运算符改变
- **`enumerable`**：如果为 `false`，属性不会出现在 `for...in`、`Object.keys()` 中
- **`configurable`**：如果为 `false`，属性不能被删除，且特性（除了 `value` 和 `writable`）不能被修改

### 访问器属性

访问器属性也包含四个特性：

```javascript
const obj = {
    _value: 0
};

Object.defineProperty(obj, 'value', {
    get() {                 // [[Get]]：getter 函数
        console.log('getting value');
        return this._value;
    },
    set(newValue) {         // [[Set]]：setter 函数
        console.log('setting value to', newValue);
        this._value = newValue;
    },
    enumerable: true,       // [[Enumerable]]
    configurable: true      // [[Configurable]]
});

obj.value = 10;   // 调用 setter
console.log(obj.value);  // 调用 getter，输出 10
```

**特性详解**：

- **`get`**：getter 函数，访问属性时调用
- **`set`**：setter 函数，给属性赋值时调用
- **`enumerable`** 和 **`configurable`**：与数据属性相同

## 默认属性描述符

不同的属性创建方式，默认的描述符不同：

```javascript
// 方式1：直接赋值
const obj1 = {};
obj1.x = 1;
console.log(Object.getOwnPropertyDescriptor(obj1, 'x'));
// { value: 1, writable: true, enumerable: true, configurable: true }
// 所有特性都是 true

// 方式2：对象字面量
const obj2 = { y: 2 };
console.log(Object.getOwnPropertyDescriptor(obj2, 'y'));
// { value: 2, writable: true, enumerable: true, configurable: true }
// 同样，所有特性都是 true

// 方式3：Object.defineProperty（默认都是 false）
const obj3 = {};
Object.defineProperty(obj3, 'z', {
    value: 3
    // 未指定其他特性
});
console.log(Object.getOwnPropertyDescriptor(obj3, 'z'));
// { value: 3, writable: false, enumerable: false, configurable: false }
// 未指定的特性默认为 false！
```

这是一个重要的陷阱：使用 `Object.defineProperty` 时，未指定的特性默认为 `false`，与直接赋值的行为不同。

## V8 中的属性描述符存储

V8 需要高效地存储属性描述符。如果为每个属性都存储完整的四个特性，会占用大量内存。V8 采用了优化策略。

### 快属性模式下的描述符

回顾第11章，快属性存储在对象的 Properties 数组或 In-object slots 中。那么，属性的特性存储在哪里？

**答案是：Map（隐藏类）的 Descriptors 数组**。

Map 结构（详见第12章）：

```
Map 对象：
+------------------------+
| ...                    |
+------------------------+
| Descriptors 数组        |  ← 存储属性描述符
+------------------------+
```

Descriptors 数组的每个条目包含：

```
Descriptor 条目：
+------------------------+
| Key（属性名）           |
+------------------------+
| Details（特性标志）     |  ← 编码 writable、enumerable、configurable
+------------------------+
| Value/Index            |  ← 数据属性的值位置，或访问器属性的 getter/setter
+------------------------+
```

**Details 字段编码**：

V8 使用位标志（bit flags）压缩存储三个布尔特性：

```
Details 的二进制位布局（简化）：
+---+---+---+--------+
| W | E | C | 其他位  |
+---+---+---+--------+
  ↑   ↑   ↑
  |   |   └─ Configurable
  |   └───── Enumerable  
  └───────── Writable
```

这样，三个布尔值只占用 3 个比特位，非常节省空间。

### 示例：查看属性描述符

```javascript
const obj = {};
obj.x = 1;
obj.y = 2;

Object.defineProperty(obj, 'z', {
    value: 3,
    writable: false,
    enumerable: false,
    configurable: false
});

// x 和 y 共享一个 Map（都是默认特性）
// z 的特性不同，可能导致 Map 转换

console.log(Object.getOwnPropertyDescriptor(obj, 'x'));
// { value: 1, writable: true, enumerable: true, configurable: true }

console.log(Object.getOwnPropertyDescriptor(obj, 'z'));
// { value: 3, writable: false, enumerable: false, configurable: false }
```

### 慢属性模式下的描述符

当对象转换为慢属性模式（使用字典存储），属性描述符直接存储在字典中的每个条目：

```
字典条目（NameDictionary）：
+------------------------+
| Key（属性名）           |
+------------------------+
| Value（属性值）         |
+------------------------+
| Details（特性标志）     |  ← 直接存储在字典中
+------------------------+
```

慢属性模式更灵活，但访问速度慢于快属性。

## 属性特性的影响

### 1. `writable: false` —— 不可写属性

```javascript
const obj = {};
Object.defineProperty(obj, 'const_value', {
    value: 42,
    writable: false,
    enumerable: true,
    configurable: true
});

console.log(obj.const_value);  // 42

obj.const_value = 100;  // 严格模式下抛出 TypeError，非严格模式下静默失败
console.log(obj.const_value);  // 仍然是 42

// 但 configurable 为 true，可以通过 defineProperty 改变
Object.defineProperty(obj, 'const_value', {
    value: 100
});
console.log(obj.const_value);  // 100
```

**注意**：`writable: false` 只防止赋值运算符修改，但如果 `configurable: true`，仍可通过 `Object.defineProperty` 修改。

### 2. `enumerable: false` —— 不可枚举属性

```javascript
const obj = {
    visible: 1
};

Object.defineProperty(obj, 'hidden', {
    value: 2,
    enumerable: false
});

console.log(Object.keys(obj));           // ['visible']
console.log(Object.getOwnPropertyNames(obj));  // ['visible', 'hidden']

for (const key in obj) {
    console.log(key);  // 只输出 'visible'
}

console.log(obj.hidden);  // 2（仍然可以直接访问）
```

**用途**：
- 内置对象的很多属性是不可枚举的（如 `Array.prototype.forEach`）
- 隐藏内部实现细节，避免在遍历时暴露

### 3. `configurable: false` —— 不可配置属性

```javascript
const obj = {};
Object.defineProperty(obj, 'permanent', {
    value: 42,
    writable: true,
    enumerable: true,
    configurable: false  // 不可配置
});

// 无法删除
delete obj.permanent;  // 严格模式下抛出 TypeError，非严格模式下返回 false
console.log(obj.permanent);  // 仍然是 42

// 无法改变特性（除了 value 和 writable）
try {
    Object.defineProperty(obj, 'permanent', {
        enumerable: false  // 尝试改变 enumerable
    });
} catch (e) {
    console.log(e.message);  // TypeError: Cannot redefine property: permanent
}

// 但可以改变 value（因为 writable 为 true）
obj.permanent = 100;
console.log(obj.permanent);  // 100

// 也可以将 writable 从 true 改为 false（单向操作）
Object.defineProperty(obj, 'permanent', {
    writable: false
});
// 但不能从 false 改回 true
```

**重要规则**：
- `configurable: false` 后，大部分特性不能被改变
- 例外：`writable` 可以从 `true` 改为 `false`（但不能反向）
- 例外：即使 `configurable: false`，如果 `writable: true`，`value` 仍可修改

## 访问器属性的实现

访问器属性（getter/setter）是 JavaScript 强大的特性。V8 如何实现？

### 基础示例

```javascript
const obj = {
    _value: 0,
    
    get value() {
        console.log('getter called');
        return this._value;
    },
    
    set value(newValue) {
        console.log('setter called with', newValue);
        this._value = newValue;
    }
};

obj.value = 10;   // 'setter called with 10'
console.log(obj.value);  // 'getter called', 输出 10
```

### V8 存储

访问器属性在 Map 的 Descriptors 中存储为特殊条目：

```
访问器属性的 Descriptor 条目：
+------------------------+
| Key: 'value'           |
+------------------------+
| Details: Accessor类型  |  ← 标记为访问器属性
+------------------------+
| AccessorPair 指针      |  ← 指向 AccessorPair 对象
+------------------------+

AccessorPair 对象：
+------------------------+
| getter 函数指针         |
+------------------------+
| setter 函数指针         |
+------------------------+
```

访问 `obj.value` 时，V8 检测到是访问器属性，调用相应的 getter/setter 函数。

### 性能考虑

访问器属性比数据属性慢，因为需要函数调用：

```javascript
const dataObj = { x: 1 };
const accessorObj = {
    get x() {
        return 1;
    }
};

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

访问器属性适用于需要验证、计算或懒加载的场景，但不应在性能关键路径上过度使用。

## 常见模式与陷阱

### 陷阱 1：`Object.defineProperty` 的默认值

```javascript
// ❌ 错误：忘记设置特性，导致属性不可写、不可枚举、不可配置
const obj = {};
Object.defineProperty(obj, 'x', {
    value: 1
});

obj.x = 2;  // 静默失败（或严格模式下报错）
console.log(obj.x);  // 1

console.log(Object.keys(obj));  // []（不可枚举）

// ✅ 正确：显式设置所有特性
Object.defineProperty(obj, 'y', {
    value: 1,
    writable: true,
    enumerable: true,
    configurable: true
});
```

### 陷阱 2：`const` 不等于不可变

```javascript
const obj = { x: 1 };

// const 只防止重新赋值
// obj = {};  // TypeError: Assignment to constant variable

// 但属性仍可修改
obj.x = 2;
console.log(obj.x);  // 2

// 要使属性不可修改，需要 Object.freeze
Object.freeze(obj);
obj.x = 3;  // 严格模式下 TypeError，非严格模式下静默失败
console.log(obj.x);  // 2
```

### 模式 1：创建常量属性

```javascript
function createConstantProperty(obj, key, value) {
    Object.defineProperty(obj, key, {
        value: value,
        writable: false,
        enumerable: true,
        configurable: false  // 完全不可变
    });
}

const config = {};
createConstantProperty(config, 'API_URL', 'https://api.example.com');

config.API_URL = 'https://evil.com';  // 无法修改
delete config.API_URL;  // 无法删除
console.log(config.API_URL);  // 'https://api.example.com'
```

### 模式 2：懒加载属性

```javascript
class ExpensiveResource {
    get data() {
        // 第一次访问时计算，然后替换为数据属性
        const value = this._computeExpensiveData();
        
        // 替换访问器属性为数据属性（如果 configurable: true）
        Object.defineProperty(this, 'data', {
            value: value,
            writable: false,
            enumerable: true,
            configurable: false
        });
        
        return value;
    }
    
    _computeExpensiveData() {
        console.log('Computing expensive data...');
        return { result: 42 };
    }
}

const resource = new ExpensiveResource();
console.log(resource.data);  // 'Computing expensive data...', { result: 42 }
console.log(resource.data);  // { result: 42 }（不再计算）
```

### 模式 3：属性验证

```javascript
function createValidatedProperty(obj, key, validator) {
    let value;
    
    Object.defineProperty(obj, key, {
        get() {
            return value;
        },
        set(newValue) {
            if (!validator(newValue)) {
                throw new TypeError(`Invalid value for ${key}: ${newValue}`);
            }
            value = newValue;
        },
        enumerable: true,
        configurable: true
    });
}

const person = {};
createValidatedProperty(person, 'age', age => typeof age === 'number' && age >= 0);

person.age = 25;  // OK
console.log(person.age);  // 25

try {
    person.age = -5;  // 抛出 TypeError
} catch (e) {
    console.log(e.message);
}
```

## 性能影响与优化

### 特性对 Map 的影响

改变属性特性会导致 Map 转换，影响性能：

```javascript
const obj1 = { x: 1, y: 2 };
const obj2 = { x: 3, y: 4 };
// obj1 和 obj2 共享 Map

Object.defineProperty(obj1, 'x', {
    writable: false  // 改变特性
});
// obj1 转换到新的 Map，与 obj2 不再共享

// 如果函数同时处理 obj1 和 obj2，会变成多态，性能下降
function getX(obj) {
    return obj.x;
}

// 现在 getX 看到两种 Map，从单态变为多态
```

### 最佳实践：一致的属性定义

```javascript
// ✅ 推荐：使用工厂函数保证一致性
function createPoint(x, y) {
    const obj = {};
    Object.defineProperties(obj, {
        x: {
            value: x,
            writable: true,
            enumerable: true,
            configurable: true
        },
        y: {
            value: y,
            writable: true,
            enumerable: true,
            configurable: true
        }
    });
    return obj;
}

const p1 = createPoint(1, 2);
const p2 = createPoint(3, 4);
// 所有点共享相同的 Map

// ❌ 避免：动态改变特性
const p3 = createPoint(5, 6);
Object.defineProperty(p3, 'x', { writable: false });
// p3 现在有不同的 Map
```

## 调试属性描述符

使用 `Object.getOwnPropertyDescriptor` 和相关 API：

```javascript
const obj = {
    x: 1
};

Object.defineProperty(obj, 'y', {
    value: 2,
    enumerable: false
});

// 获取单个属性描述符
console.log(Object.getOwnPropertyDescriptor(obj, 'x'));
// { value: 1, writable: true, enumerable: true, configurable: true }

console.log(Object.getOwnPropertyDescriptor(obj, 'y'));
// { value: 2, writable: false, enumerable: false, configurable: false }

// 获取所有属性描述符
console.log(Object.getOwnPropertyDescriptors(obj));
// {
//   x: { value: 1, writable: true, enumerable: true, configurable: true },
//   y: { value: 2, writable: false, enumerable: false, configurable: false }
// }

// 列出所有属性名（包括不可枚举）
console.log(Object.getOwnPropertyNames(obj));  // ['x', 'y']

// 只列出可枚举属性
console.log(Object.keys(obj));  // ['x']
```

## 本章小结

属性描述符是 JavaScript 对象系统的核心，提供了对属性行为的细粒度控制。V8 通过在 Map 的 Descriptors 数组中压缩存储这些元数据，在灵活性和性能之间取得平衡。

**核心概念**：
- **数据属性**：`value`、`writable`、`enumerable`、`configurable` 四个特性
- **访问器属性**：`get`、`set`、`enumerable`、`configurable` 四个特性
- **Descriptors 存储**：快属性模式下存储在 Map 中，慢属性模式下存储在字典中
- **位标志压缩**：三个布尔特性只占用几个比特位

**关键规则**：
- `Object.defineProperty` 未指定的特性默认为 `false`（陷阱！）
- `configurable: false` 后，大部分特性不可更改
- `writable` 可从 `true` 改为 `false`，但不能反向
- 改变属性特性会导致 Map 转换，影响性能

**性能影响**：
- 访问器属性比数据属性慢 5-10 倍
- 改变属性特性会破坏 Map 共享，导致多态
- 保持属性定义一致性对性能至关重要

**最佳实践**：
- 显式设置所有特性，避免依赖默认值
- 使用工厂函数或类保证对象结构一致
- 在性能关键路径避免过度使用访问器属性
- 合理利用 `writable: false` 和 `configurable: false` 创建不可变属性

在下一章中，我们将深入探讨访问器属性（getter/setter）的更多细节和高级用法，了解它们如何与属性描述符系统协作。

**思考题**：

1. 如果一个对象有 100 个属性，每个属性都有不同的特性组合，V8 如何避免创建 100 个不同的 Map？
2. 为什么 `configurable: false` 后，`writable` 可以从 `true` 改为 `false`，但不能反向？这个设计有什么考量？
3. 访问器属性是否总是比数据属性慢？在什么情况下 V8 可能优化访问器属性？
