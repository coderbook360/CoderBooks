# V8友好代码：高级优化技巧

在上一章中，我们学习了基础优化原则：对象形状一致性、类型稳定性、数组优化等。这些是编写高性能代码的基石。

本章将深入**高级优化技巧**：如何避免去优化、函数优化、作用域管理、集合类型选择、内存管理等。这些技巧能让你的代码性能更上一层楼。

## 避免去优化（Deoptimization）

回顾之前学到的知识：TurboFan编译器会对热点函数进行**激进优化**，但当假设被打破时会触发**去优化**，回退到解释执行。

### 常见去优化触发点

#### 触发点1：类型变化

```javascript
function process(x) {
  return x * 2;
}

// 初始调用：假设x是整数
for (let i = 0; i < 10000; i++) {
  process(10);  // TurboFan优化：整数乘法
}

// 类型变化
process('10');  // 去优化！字符串不能相乘
```

**为什么去优化？**

TurboFan生成的优化代码假设：
- `x` 是Smi（小整数）
- `x * 2` 是整数乘法指令

当传入字符串时：
- 类型检查失败
- 去优化，回退到字节码
- 重新进入解释器

#### 触发点2：对象形状变化

```javascript
function getX(obj) {
  return obj.x;
}

const point1 = { x: 1, y: 2 };
getX(point1);  // TurboFan优化：假设obj是{x, y}形状

const point2 = { y: 2, x: 1 };  // 不同的形状！
getX(point2);  // 去优化！
```

**根本原因**：

- TurboFan假设`obj`有特定的隐藏类
- 优化代码直接从固定偏移量读取`x`
- 不同形状的对象导致偏移量不匹配
- 去优化

#### 触发点3：数组越界

```javascript
function sumArray(arr) {
  let sum = 0;
  for (let i = 0; i < arr.length; i++) {
    sum += arr[i];
  }
  return sum;
}

const numbers = [1, 2, 3, 4, 5];
sumArray(numbers);  // TurboFan优化

// 数组越界访问
function getElement(arr, i) {
  return arr[i];
}

getElement(numbers, 0);    // OK
getElement(numbers, 100);  // 去优化！越界
```

**优化假设**：

TurboFan假设：
- 数组访问不会越界
- 可以省略边界检查

越界访问打破假设 → 去优化

#### 触发点4：修改原型

```javascript
class MyClass {
  method() {
    return 42;
  }
}

function callMethod(obj) {
  return obj.method();
}

const instance = new MyClass();
callMethod(instance);  // TurboFan优化

// 修改原型
MyClass.prototype.method = function() {
  return 100;
};

callMethod(instance);  // 去优化！原型变了
```

### 避免去优化的策略

#### 策略1：类型防护

```javascript
// ❌ 不好：没有类型检查
function process(x) {
  return x * 2;
}

// ✅ 好：添加类型防护
function process(x) {
  if (typeof x !== 'number') {
    throw new TypeError('Expected number');
  }
  return x * 2;
}

// ✅ 更好：分离不同类型的函数
function processNumber(x) {
  return x * 2;
}

function processString(x) {
  return x + x;
}
```

**效果**：

- 类型稳定 → TurboFan能生成专门优化的代码
- 避免类型混合导致的去优化

#### 策略2：使用类保证形状

```javascript
// ❌ 不好：对象字面量，形状不稳定
function createPoint(x, y) {
  const point = {};
  point.x = x;
  if (y !== undefined) point.y = y;  // 条件属性
  return point;
}

// ✅ 好：类确保形状一致
class Point {
  constructor(x, y = 0) {
    this.x = x;
    this.y = y;  // 总是存在
  }
}

function getX(point) {
  return point.x;
}

// 所有Point实例形状相同，不会去优化
```

#### 策略3：边界检查前置

```javascript
// ❌ 不好：可能越界
function getElement(arr, i) {
  return arr[i];  // 未检查边界
}

// ✅ 好：明确边界检查
function getElement(arr, i) {
  if (i < 0 || i >= arr.length) {
    return undefined;  // 或抛出错误
  }
  return arr[i];
}
```

**权衡**：

- ✅ 避免去优化
- ⚠️ 增加了边界检查的开销
- 💡 适合：数组访问是性能瓶颈的场景

#### 策略4：不修改原型

```javascript
// ❌ 不好：运行时修改原型
class MyClass {
  method1() {}
}

// 运行时添加方法
MyClass.prototype.method2 = function() {};  // 可能触发去优化

// ✅ 好：初始化时定义所有方法
class MyClass {
  method1() {}
  method2() {}
}

// 之后不再修改原型
```

## 函数优化技巧

### 技巧1：保持函数小巧

小函数容易被内联，大函数难以优化。

```javascript
// ❌ 不好：单个大函数
function processUserData(data) {
  // 验证数据（20行）
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid data');
  }
  if (!data.name || typeof data.name !== 'string') {
    throw new Error('Invalid name');
  }
  // ... 更多验证
  
  // 转换数据（30行）
  const transformed = {
    name: data.name.trim().toLowerCase(),
    email: data.email?.toLowerCase(),
    // ... 更多转换
  };
  
  // 处理数据（50行）
  // ... 复杂的业务逻辑
  
  // 返回结果（10行）
  return {
    user: transformed,
    timestamp: Date.now()
  };
}
```

**问题**：

- 函数太大，TurboFan不会内联
- 难以优化
- 难以维护和测试

**解决方案：拆分为小函数**

```javascript
// ✅ 好：拆分为多个小函数
function validateUserData(data) {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid data');
  }
  if (!data.name || typeof data.name !== 'string') {
    throw new Error('Invalid name');
  }
  // 简洁的验证逻辑
}

function transformUserData(data) {
  return {
    name: data.name.trim().toLowerCase(),
    email: data.email?.toLowerCase()
  };
}

function processUserData(data) {
  validateUserData(data);              // 小函数，可内联
  const transformed = transformUserData(data);  // 小函数，可内联
  
  return {
    user: transformed,
    timestamp: Date.now()
  };
}
```

**效果**：

- 每个函数都很小，容易被内联
- 逻辑清晰，易于维护
- TurboFan可以优化单个小函数

**内联的条件**：

- 函数体小于约600字节的字节码
- 不包含复杂控制流（try/catch、with等）
- 调用栈深度不超过限制

### 技巧2：保持单态调用

多态调用难以内联和优化。

```javascript
// ❌ 不好：多态调用
function process(handler) {
  return handler.run();  // handler类型多变
}

class HandlerA {
  run() { return 'A'; }
}

class HandlerB {
  run() { return 'B'; }
}

class HandlerC {
  run() { return 'C'; }
}

// IC变成多态
process(new HandlerA());
process(new HandlerB());
process(new HandlerC());
```

**优化方案1：分离函数**

```javascript
// ✅ 好：单态调用
function processA(handler) {
  return handler.run();  // 只处理HandlerA
}

function processB(handler) {
  return handler.run();  // 只处理HandlerB
}

processA(new HandlerA());  // IC单态
processB(new HandlerB());  // IC单态
```

**优化方案2：类型统一**

```javascript
// ✅ 好：统一接口
class BaseHandler {
  run() {
    throw new Error('Not implemented');
  }
}

class HandlerA extends BaseHandler {
  run() { return 'A'; }
}

class HandlerB extends BaseHandler {
  run() { return 'B'; }
}

// 虽然多态，但形状一致，性能较好
```

### 技巧3：避免动态特性

某些JavaScript特性会阻止优化。

#### 避免eval

```javascript
// ❌ 不好：eval阻止优化
function calculate(expr) {
  return eval(expr);  // 完全阻止优化
}

// ✅ 好：使用映射
const operations = {
  '+': (a, b) => a + b,
  '-': (a, b) => a - b,
  '*': (a, b) => a * b,
  '/': (a, b) => a / b
};

function calculate(op, a, b) {
  return operations[op](a, b);
}
```

#### 避免with

```javascript
// ❌ 不好：with阻止优化
function getValue(obj) {
  with (obj) {
    return value;  // 运行时查找
  }
}

// ✅ 好：直接访问
function getValue(obj) {
  return obj.value;
}
```

#### 避免arguments泄露

```javascript
// ❌ 不好：arguments泄露
function sum() {
  return Array.from(arguments).reduce((a, b) => a + b, 0);
}

// ✅ 好：使用剩余参数
function sum(...numbers) {
  return numbers.reduce((a, b) => a + b, 0);
}
```

**为什么arguments有问题？**

- `arguments`是类数组对象，不是真正的数组
- 泄露`arguments`会阻止某些优化
- 剩余参数是真数组，性能更好

### 技巧4：避免复杂控制流

```javascript
// ❌ 不好：try/catch包裹整个函数
function process(data) {
  try {
    // 大量代码（100行）
    // ...
    return result;
  } catch (e) {
    return null;
  }
}

// ✅ 好：隔离可能抛出错误的代码
function process(data) {
  let parsed;
  
  try {
    parsed = JSON.parse(data);  // 只包裹可能出错的部分
  } catch (e) {
    return null;
  }
  
  // 其他代码不受try/catch影响
  return transformData(parsed);
}
```

## 集合类型选择

选择合适的数据结构，性能差异巨大。

### Map vs Object

**Object 的优势**：

- 属性访问快（内联缓存）
- 适合：固定的键、频繁的属性访问

```javascript
// ✅ 适合用Object
const config = {
  timeout: 3000,
  retries: 3,
  url: 'https://api.example.com'
};

console.log(config.timeout);  // 快，内联缓存
```

**Map 的优势**：

- 任意类型的键
- 频繁增删改
- 需要遍历
- 需要知道大小

```javascript
// ✅ 适合用Map
const cache = new Map();

// 任意类型的键
cache.set(obj1, 'value1');
cache.set(obj2, 'value2');

// 快速增删
cache.set('key3', 'value3');
cache.delete('key3');

// 遍历
for (const [key, value] of cache) {
  console.log(key, value);
}

// 大小
console.log(cache.size);  // O(1)
```

**性能对比**：

```javascript
// 测试：1000次插入和查找

// Object
const obj = {};
console.time('Object insert');
for (let i = 0; i < 1000; i++) {
  obj[`key${i}`] = i;
}
console.timeEnd('Object insert');

console.time('Object lookup');
for (let i = 0; i < 1000; i++) {
  const value = obj[`key${i}`];
}
console.timeEnd('Object lookup');

// Map
const map = new Map();
console.time('Map insert');
for (let i = 0; i < 1000; i++) {
  map.set(`key${i}`, i);
}
console.timeEnd('Map insert');

console.time('Map lookup');
for (let i = 0; i < 1000; i++) {
  const value = map.get(`key${i}`);
}
console.timeEnd('Map lookup');

// 典型结果：
// Object insert: 0.5ms
// Object lookup: 0.3ms (内联缓存，最快)
// Map insert: 0.8ms
// Map lookup: 0.6ms
```

**选择原则**：

| 场景 | 推荐 | 原因 |
|------|------|------|
| 固定键，频繁访问 | Object | 内联缓存优化 |
| 动态键，频繁增删 | Map | 专门优化 |
| 需要遍历键值对 | Map | 迭代器性能好 |
| 需要非字符串键 | Map | Object只支持字符串/Symbol |

### Set vs Array

**Array 的优势**：

- 索引访问O(1)
- 适合：有序数据、频繁索引访问

**Set 的优势**：

- 去重
- 快速查找O(1)
- 快速增删O(1)

```javascript
// 场景：检查元素是否存在

// Array（O(n)）
const arr = [1, 2, 3, 4, 5, /* ... 1000个元素 */];
arr.includes(999);  // 需要遍历，慢

// Set（O(1)）
const set = new Set([1, 2, 3, 4, 5, /* ... 1000个元素 */]);
set.has(999);  // 哈希查找，快
```

**性能对比**：

```javascript
const size = 10000;

// Array
const arr = Array.from({ length: size }, (_, i) => i);
console.time('Array includes');
arr.includes(9999);
console.timeEnd('Array includes');

// Set
const set = new Set(arr);
console.time('Set has');
set.has(9999);
console.timeEnd('Set has');

// 典型结果：
// Array includes: 0.15ms (O(n)，随size增长)
// Set has: 0.001ms (O(1)，恒定时间)
```

### WeakMap/WeakSet 的特殊用途

**特点**：

- 键是弱引用
- 键只能是对象
- 不可遍历
- 自动清理

**适用场景**：缓存、元数据存储

```javascript
// 场景：为DOM元素关联元数据

// ❌ 不好：用Map
const metadata = new Map();

function attachMetadata(element, data) {
  metadata.set(element, data);  // 强引用，element无法被GC
}

// 元素被移除，但metadata仍持有引用 → 内存泄漏

// ✅ 好：用WeakMap
const metadata = new WeakMap();

function attachMetadata(element, data) {
  metadata.set(element, data);  // 弱引用
}

// 元素被移除 → WeakMap自动清理 → 无内存泄漏
```

## 作用域与闭包优化

### 避免意外的闭包捕获

```javascript
// ❌ 不好：闭包捕获大对象
function createHandlers(largeData) {
  const summary = analyzeLargeData(largeData);  // 提取需要的数据
  
  return {
    getSummary() {
      return summary;  // 只需要summary
    },
    // 但闭包捕获了整个largeData！
  };
}

// ✅ 好：只捕获必要的数据
function createHandlers(largeData) {
  const summary = analyzeLargeData(largeData);
  // largeData可以被回收
  
  return {
    getSummary() {
      return summary;  // 只捕获summary
    }
  };
}
```

### 避免全局变量

```javascript
// ❌ 不好：全局变量查找慢
let globalCounter = 0;

function increment() {
  globalCounter++;  // 查找全局作用域
}

// ✅ 好：局部变量
function createCounter() {
  let counter = 0;  // 局部变量，快
  
  return {
    increment() {
      counter++;
    },
    get() {
      return counter;
    }
  };
}
```

## 内存管理

### 及时释放引用

```javascript
// ❌ 不好：事件监听器未清理
class Component {
  constructor(element) {
    this.element = element;
    this.handler = () => this.handleClick();
    this.element.addEventListener('click', this.handler);
  }
  
  // 组件销毁，但监听器仍存在 → 内存泄漏
}

// ✅ 好：清理资源
class Component {
  constructor(element) {
    this.element = element;
    this.handler = () => this.handleClick();
    this.element.addEventListener('click', this.handler);
  }
  
  destroy() {
    this.element.removeEventListener('click', this.handler);
    this.element = null;
    this.handler = null;
  }
}
```

### 使用对象池

```javascript
// 对象池模式：减少GC压力
class ObjectPool {
  constructor(create, reset, initialSize = 10) {
    this.create = create;
    this.reset = reset;
    this.pool = Array.from({ length: initialSize }, create);
  }
  
  acquire() {
    return this.pool.pop() || this.create();
  }
  
  release(obj) {
    this.reset(obj);
    this.pool.push(obj);
  }
}

// 使用示例：Vector3对象池
const vectorPool = new ObjectPool(
  () => ({ x: 0, y: 0, z: 0 }),
  (v) => { v.x = 0; v.y = 0; v.z = 0; }
);

function calculate() {
  const v = vectorPool.acquire();  // 复用对象
  v.x = 1; v.y = 2; v.z = 3;
  
  // 使用v...
  
  vectorPool.release(v);  // 归还对象
}
```

## 本章小结

1. **避免去优化**：类型防护、使用类、边界检查、不修改原型

2. **函数优化**：小函数、单态调用、避免eval/with/arguments泄露

3. **集合选择**：
   - 固定键频繁访问 → Object
   - 动态键频繁增删 → Map
   - 去重快速查找 → Set
   - DOM元数据存储 → WeakMap

4. **作用域优化**：避免闭包捕获大对象、减少全局变量

5. **内存管理**：及时释放引用、使用对象池

在下一章中，我们将总结一份完整的优化检查清单，帮助你系统化地检查和优化代码。
