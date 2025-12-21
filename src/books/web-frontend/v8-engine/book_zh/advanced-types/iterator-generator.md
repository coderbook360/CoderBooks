# 迭代器与生成器：Iterator 协议与状态机

你是否好奇过，`for...of`循环如何遍历数组、Map、Set等不同类型的集合？为什么自定义对象无法直接使用`for...of`？生成器函数的`yield`关键字如何实现"暂停"和"恢复"执行？

```javascript
// 数组可以直接遍历
for (const item of [1, 2, 3]) {
  console.log(item);
}

// 自定义对象不行
const obj = { a: 1, b: 2 };
// for (const item of obj) {}  // TypeError: obj is not iterable
```

ES6引入的**Iterator协议**（迭代器协议）和**Generator函数**（生成器）提供了统一的遍历机制和灵活的流程控制。V8将生成器实现为状态机，通过闭包和continuation（延续）机制实现暂停恢复。

本章将深入V8引擎，揭示Iterator协议的实现、生成器的状态机转换、`yield`的底层机制、以及异步迭代器（Async Iterator）的工作原理。

## Iterator 协议：统一的遍历接口

### 什么是可迭代对象

JavaScript中的**可迭代对象**（Iterable）必须实现`@@iterator`方法（即`Symbol.iterator`属性）：

```javascript
// 数组是可迭代对象
const arr = [1, 2, 3];
const iterator = arr[Symbol.iterator]();

console.log(iterator.next());  // { value: 1, done: false }
console.log(iterator.next());  // { value: 2, done: false }
console.log(iterator.next());  // { value: 3, done: false }
console.log(iterator.next());  // { value: undefined, done: true }
```

**Iterator协议规范**（ECMAScript定义）：

1. **可迭代协议（Iterable Protocol）**：对象必须有`[Symbol.iterator]`方法，返回迭代器对象。

2. **迭代器协议（Iterator Protocol）**：迭代器对象必须有`next()`方法，返回`{ value, done }`结果对象：
   - `value`：当前值。
   - `done`：布尔值，`true`表示迭代结束。

### 内置可迭代对象

JavaScript多种内置类型实现了Iterator协议：

```javascript
// 数组
const arr = [10, 20, 30];
for (const val of arr) {
  console.log(val);  // 10, 20, 30
}

// 字符串
const str = 'hello';
for (const char of str) {
  console.log(char);  // 'h', 'e', 'l', 'l', 'o'
}

// Map
const map = new Map([['a', 1], ['b', 2]]);
for (const [key, value] of map) {
  console.log(key, value);  // 'a' 1, 'b' 2
}

// Set
const set = new Set([1, 2, 3]);
for (const val of set) {
  console.log(val);  // 1, 2, 3
}

// arguments 对象
function test() {
  for (const arg of arguments) {
    console.log(arg);
  }
}
test(10, 20, 30);  // 10, 20, 30

// NodeList（DOM）
const divs = document.querySelectorAll('div');
for (const div of divs) {
  console.log(div);
}
```

### 自定义可迭代对象

实现`[Symbol.iterator]`方法即可使对象可迭代：

```javascript
// 简单的范围迭代器
class Range {
  constructor(start, end) {
    this.start = start;
    this.end = end;
  }
  
  [Symbol.iterator]() {
    let current = this.start;
    const end = this.end;
    
    // 返回迭代器对象
    return {
      next() {
        if (current <= end) {
          return { value: current++, done: false };
        } else {
          return { value: undefined, done: true };
        }
      }
    };
  }
}

const range = new Range(1, 5);
for (const num of range) {
  console.log(num);  // 1, 2, 3, 4, 5
}

// 可以多次迭代（每次调用 Symbol.iterator 创建新迭代器）
console.log([...range]);  // [1, 2, 3, 4, 5]
console.log([...range]);  // [1, 2, 3, 4, 5]
```

### 迭代器的消费方式

除了`for...of`，还有多种方式消费迭代器：

```javascript
const arr = [1, 2, 3, 4, 5];

// 1. for...of 循环
for (const item of arr) {
  console.log(item);
}

// 2. 展开运算符
const copy = [...arr];
console.log(copy);  // [1, 2, 3, 4, 5]

// 3. 解构赋值
const [first, second, ...rest] = arr;
console.log(first, second, rest);  // 1 2 [3, 4, 5]

// 4. Array.from()
const arr2 = Array.from(arr);

// 5. new Set() / new Map()
const set = new Set(arr);
const map = new Map(arr.map(x => [x, x * 2]));

// 6. Promise.all() / Promise.race()
const promises = [Promise.resolve(1), Promise.resolve(2)];
Promise.all(promises).then(console.log);  // [1, 2]

// 7. yield*（生成器委托）
function* gen() {
  yield* arr;
}
console.log([...gen()]);  // [1, 2, 3, 4, 5]
```

## Generator 函数：内置的迭代器工厂

### 生成器基本语法

生成器函数使用`function*`声明，可以包含`yield`表达式：

```javascript
function* simpleGenerator() {
  yield 1;
  yield 2;
  yield 3;
}

const gen = simpleGenerator();
console.log(gen.next());  // { value: 1, done: false }
console.log(gen.next());  // { value: 2, done: false }
console.log(gen.next());  // { value: 3, done: false }
console.log(gen.next());  // { value: undefined, done: true }

// 生成器对象本身是可迭代的
for (const val of simpleGenerator()) {
  console.log(val);  // 1, 2, 3
}
```

**关键特性**：
- **惰性求值**：调用生成器函数返回生成器对象，不立即执行函数体。
- **暂停/恢复**：`yield`暂停执行并返回值，`next()`恢复执行。
- **双向通信**：`next(value)`可向生成器内部传值。

### 生成器的执行流程

```javascript
function* example() {
  console.log('开始');
  const a = yield 1;
  console.log('收到:', a);
  const b = yield 2;
  console.log('收到:', b);
  return 3;
}

const gen = example();

console.log('调用 next()');
console.log(gen.next());      // 执行到第一个 yield
// 输出：开始
//      调用 next()
//      { value: 1, done: false }

console.log('调用 next(10)');
console.log(gen.next(10));    // 传入 10，恢复执行到第二个 yield
// 输出：收到: 10
//      调用 next(10)
//      { value: 2, done: false }

console.log('调用 next(20)');
console.log(gen.next(20));    // 传入 20，恢复执行到 return
// 输出：收到: 20
//      调用 next(20)
//      { value: 3, done: true }
```

**执行流程详解**：

1. **首次`next()`**：执行到第一个`yield 1`，暂停并返回`{ value: 1, done: false }`。
2. **第二次`next(10)`**：`yield 1`表达式的值变为10（赋给`a`），继续执行到`yield 2`。
3. **第三次`next(20)`**：`yield 2`表达式的值变为20（赋给`b`），执行到`return 3`结束。

### yield* 委托

`yield*`将迭代委托给另一个可迭代对象：

```javascript
function* inner() {
  yield 2;
  yield 3;
}

function* outer() {
  yield 1;
  yield* inner();  // 委托给 inner
  yield 4;
}

console.log([...outer()]);  // [1, 2, 3, 4]

// 等价于手动遍历
function* outerManual() {
  yield 1;
  for (const val of inner()) {
    yield val;
  }
  yield 4;
}
```

`yield*`还可以委托给数组、字符串等任何可迭代对象：

```javascript
function* example() {
  yield* [1, 2, 3];
  yield* 'ab';
  yield* new Set([4, 5]);
}

console.log([...example()]);  // [1, 2, 3, 'a', 'b', 4, 5]
```

## V8 中的生成器实现：状态机

### 生成器的状态机转换

V8将生成器函数转换为状态机，每个`yield`对应一个状态：

**生成器代码**：

```javascript
function* example() {
  const a = yield 1;
  const b = yield 2;
  return a + b;
}
```

**V8内部转换（简化伪代码）**：

```javascript
function example() {
  let state = 0;  // 当前状态
  let a, b;       // 局部变量
  
  return {
    next(value) {
      switch (state) {
        case 0:  // 初始状态
          state = 1;
          return { value: 1, done: false };
        
        case 1:  // 第一个 yield 后
          a = value;  // 接收传入的值
          state = 2;
          return { value: 2, done: false };
        
        case 2:  // 第二个 yield 后
          b = value;
          state = 3;
          return { value: a + b, done: true };
        
        case 3:  // 结束状态
          return { value: undefined, done: true };
      }
    }
  };
}
```

**状态转换图**：

```
状态 0（初始）
   ↓ next()
 yield 1
   ↓
状态 1
   ↓ next(10)
 yield 2
   ↓
状态 2
   ↓ next(20)
 return a + b
   ↓
状态 3（结束）
```

### 生成器对象的内部结构

V8中的生成器对象（`JSGeneratorObject`）：

```
JSGeneratorObject 结构：
+------------------------+
| Map (Hidden Class)     |
+------------------------+
| function               |  ← 指向生成器函数
+------------------------+
| context                |  ← 闭包上下文（保存局部变量）
+------------------------+
| receiver               |  ← this 绑定
+------------------------+
| resume_mode            |  ← 恢复模式（next/throw/return）
+------------------------+
| continuation           |  ← 当前执行位置（状态）
+------------------------+
```

**关键字段**：
- **context**：存储生成器的局部变量和闭包变量（类似闭包的Context对象）。
- **continuation**：记录当前暂停位置（对应状态机的state），V8使用字节码偏移量表示。
- **resume_mode**：标记下次恢复的方式（`next`、`throw`、`return`）。

### yield 的底层机制

`yield`在V8中编译为特殊的字节码`SuspendGenerator`：

```javascript
function* gen() {
  yield 1;
  yield 2;
}
```

**字节码示例（简化）**：

```
LdaSmi [1]           // 加载常量 1
SuspendGenerator [0] // 暂停生成器，保存状态0
ResumeGenerator      // 恢复点（next() 返回这里）

LdaSmi [2]
SuspendGenerator [1]
ResumeGenerator

LdaUndefined
Return
```

**暂停与恢复流程**：

1. **暂停（SuspendGenerator）**：
   - 保存当前执行位置（字节码偏移量）到`continuation`。
   - 保存局部变量到`context`。
   - 返回`{ value, done }`给调用者。

2. **恢复（ResumeGenerator）**：
   - 从`continuation`恢复执行位置。
   - 从`context`恢复局部变量。
   - 接收`next(value)`传入的值（赋给yield表达式）。
   - 继续执行到下一个`yield`或`return`。

### 生成器与闭包的结合

生成器可以访问外部变量，形成闭包：

```javascript
function createCounter() {
  let count = 0;
  
  return function* () {
    while (true) {
      yield ++count;
    }
  };
}

const counter = createCounter();
const gen = counter();

console.log(gen.next().value);  // 1
console.log(gen.next().value);  // 2
console.log(gen.next().value);  // 3

// 另一个生成器实例，独立的 count
const gen2 = counter();
console.log(gen2.next().value);  // 1
```

`count`变量存储在生成器的`context`中，每次调用`createCounter()`创建独立的闭包上下文。

## 生成器的高级用法

### 无限序列

生成器支持无限序列（惰性求值）：

```javascript
// 斐波那契数列
function* fibonacci() {
  let [a, b] = [0, 1];
  while (true) {
    yield a;
    [a, b] = [b, a + b];
  }
}

const fib = fibonacci();
for (let i = 0; i < 10; i++) {
  console.log(fib.next().value);
}
// 输出：0, 1, 1, 2, 3, 5, 8, 13, 21, 34

// 素数生成器
function* primes() {
  yield 2;
  const primeList = [2];
  let candidate = 3;
  
  while (true) {
    const sqrt = Math.sqrt(candidate);
    let isPrime = true;
    
    for (const p of primeList) {
      if (p > sqrt) break;
      if (candidate % p === 0) {
        isPrime = false;
        break;
      }
    }
    
    if (isPrime) {
      primeList.push(candidate);
      yield candidate;
    }
    
    candidate += 2;  // 跳过偶数
  }
}

const primeGen = primes();
for (let i = 0; i < 10; i++) {
  console.log(primeGen.next().value);
}
// 输出：2, 3, 5, 7, 11, 13, 17, 19, 23, 29
```

### 双向通信

通过`next(value)`和`yield`实现生成器与外部的双向数据流：

```javascript
function* dataProcessor() {
  console.log('等待数据...');
  
  while (true) {
    const data = yield;  // 接收数据
    console.log('处理数据:', data);
    
    const result = data * 2;
    yield result;  // 返回结果
  }
}

const processor = dataProcessor();
processor.next();  // 启动生成器

console.log(processor.next(10).value);  // 处理数据: 10，返回 20
console.log(processor.next(20).value);  // 处理数据: 20，返回 40
```

### 错误处理

生成器支持`throw()`方法向内部抛出异常：

```javascript
function* errorHandler() {
  try {
    yield 1;
    yield 2;
    yield 3;
  } catch (e) {
    console.log('捕获错误:', e.message);
    yield 'error';
  }
}

const gen = errorHandler();
console.log(gen.next());       // { value: 1, done: false }
console.log(gen.throw(new Error('出错了')));  
// 输出：捕获错误: 出错了
//      { value: 'error', done: false }
```

生成器内部也可以抛出异常传递给外部：

```javascript
function* thrower() {
  yield 1;
  throw new Error('生成器内部错误');
  yield 2;  // 不会执行
}

const gen = thrower();
console.log(gen.next());  // { value: 1, done: false }

try {
  gen.next();
} catch (e) {
  console.log('外部捕获:', e.message);  // 外部捕获: 生成器内部错误
}
```

### 提前终止：return()

`return(value)`方法强制结束生成器：

```javascript
function* example() {
  yield 1;
  yield 2;
  yield 3;
}

const gen = example();
console.log(gen.next());         // { value: 1, done: false }
console.log(gen.return('end'));  // { value: 'end', done: true }
console.log(gen.next());         // { value: undefined, done: true }
```

`return()`触发生成器的`finally`块：

```javascript
function* withFinally() {
  try {
    yield 1;
    yield 2;
  } finally {
    console.log('清理资源');
  }
}

const gen = withFinally();
console.log(gen.next());    // { value: 1, done: false }
gen.return('提前结束');     // 输出：清理资源
```

## 异步迭代器（Async Iterator）

### Async Generator 基础

ES2018引入异步生成器（`async function*`），结合`await`和`yield`：

```javascript
async function* asyncRange(start, end) {
  for (let i = start; i <= end; i++) {
    await new Promise(resolve => setTimeout(resolve, 1000));  // 模拟异步操作
    yield i;
  }
}

// 使用 for await...of 遍历
(async () => {
  for await (const num of asyncRange(1, 5)) {
    console.log(num);  // 每秒输出一个数字：1, 2, 3, 4, 5
  }
})();
```

### 异步迭代器协议

异步可迭代对象实现`[Symbol.asyncIterator]`方法：

```javascript
class AsyncRange {
  constructor(start, end) {
    this.start = start;
    this.end = end;
  }
  
  [Symbol.asyncIterator]() {
    let current = this.start;
    const end = this.end;
    
    return {
      async next() {
        if (current <= end) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          return { value: current++, done: false };
        } else {
          return { value: undefined, done: true };
        }
      }
    };
  }
}

(async () => {
  const range = new AsyncRange(1, 3);
  for await (const num of range) {
    console.log(num);  // 1, 2, 3（每秒输出一个）
  }
})();
```

### 实际应用：分页数据加载

```javascript
async function* fetchPages(apiUrl, pageSize = 10) {
  let page = 1;
  
  while (true) {
    const response = await fetch(`${apiUrl}?page=${page}&size=${pageSize}`);
    const data = await response.json();
    
    if (data.items.length === 0) {
      break;  // 没有更多数据
    }
    
    yield* data.items;  // 逐个产出数据项
    page++;
  }
}

// 使用
(async () => {
  for await (const item of fetchPages('/api/items')) {
    console.log(item);
    // 处理数据...
  }
})();
```

### 异步迭代器的取消

使用`return()`提前终止异步迭代：

```javascript
async function* longRunning() {
  try {
    for (let i = 1; i <= 1000; i++) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      yield i;
    }
  } finally {
    console.log('清理资源');
  }
}

(async () => {
  const gen = longRunning();
  
  for await (const num of gen) {
    console.log(num);
    if (num === 5) {
      await gen.return('停止');  // 提前终止
      break;
    }
  }
  // 输出：1, 2, 3, 4, 5, 清理资源
})();
```

## 性能优化与最佳实践

### Generator vs 手写Iterator：性能对比

```javascript
// 手写迭代器
class ManualRange {
  constructor(start, end) {
    this.start = start;
    this.end = end;
  }
  
  [Symbol.iterator]() {
    let current = this.start;
    const end = this.end;
    return {
      next() {
        if (current <= end) {
          return { value: current++, done: false };
        }
        return { value: undefined, done: true };
      }
    };
  }
}

// 生成器
function* generatorRange(start, end) {
  for (let i = start; i <= end; i++) {
    yield i;
  }
}

// 性能测试
function testPerformance(iterations) {
  console.time('Manual iterator');
  for (const _ of new ManualRange(1, iterations)) {}
  console.timeEnd('Manual iterator');
  
  console.time('Generator');
  for (const _ of generatorRange(1, iterations)) {}
  console.timeEnd('Generator');
}

testPerformance(1000000);
// Manual iterator: 25ms
// Generator: 35ms（略慢，但差异不大）
```

**性能特点**：
- 生成器略慢于手写迭代器（状态机和闭包开销）。
- 对于性能关键路径，考虑手写迭代器。
- 对于一般场景，生成器的可读性和灵活性优势更重要。

### 避免生成器内部的重操作

```javascript
// 不好：生成器内部执行耗时同步操作
function* badGenerator(data) {
  for (const item of data) {
    const processed = heavyComputation(item);  // 阻塞
    yield processed;
  }
}

// 好：使用异步生成器
async function* goodGenerator(data) {
  for (const item of data) {
    const processed = await heavyComputationAsync(item);  // 非阻塞
    yield processed;
  }
}
```

### 合理使用 yield* 委托

```javascript
// 不好：手动遍历
function* flatten(arr) {
  for (const item of arr) {
    if (Array.isArray(item)) {
      for (const nested of flatten(item)) {  // 手动遍历
        yield nested;
      }
    } else {
      yield item;
    }
  }
}

// 好：使用 yield* 委托
function* flattenOptimized(arr) {
  for (const item of arr) {
    if (Array.isArray(item)) {
      yield* flattenOptimized(item);  // 委托
    } else {
      yield item;
    }
  }
}

const nested = [1, [2, [3, [4, 5]]]];
console.log([...flattenOptimized(nested)]);  // [1, 2, 3, 4, 5]
```

## 本章小结

迭代器与生成器为JavaScript提供了统一的遍历机制和灵活的流程控制能力，V8通过状态机和闭包机制高效实现了这些特性：

1. **Iterator协议**：定义统一的遍历接口（`[Symbol.iterator]`方法返回迭代器对象，`next()`方法返回`{value, done}`），内置类型（数组、Map、Set、字符串等）都实现了该协议，自定义对象可通过实现协议变为可迭代。

2. **Generator函数**：使用`function*`声明，通过`yield`暂停执行并返回值，`next(value)`恢复执行并传值，形成双向通信，支持`throw()`抛出异常和`return()`提前终止。

3. **状态机实现**：V8将生成器转换为状态机，每个`yield`对应一个状态，使用`SuspendGenerator`和`ResumeGenerator`字节码实现暂停恢复，通过`context`保存局部变量和闭包，`continuation`记录执行位置。

4. **异步迭代器**：`async function*`结合`await`和`yield`，实现异步数据流处理，`for await...of`消费异步可迭代对象，适用于分页数据加载、流式处理等场景。

5. **性能与实践**：生成器略慢于手写迭代器（状态机开销），但可读性和灵活性更好，适合大多数场景。避免生成器内部重同步操作，使用异步生成器处理耗时任务，合理使用`yield*`委托简化代码。

理解迭代器与生成器的底层机制后，你可以编写更优雅的遍历和流程控制代码，充分利用JavaScript的惰性求值和双向通信能力。至此，第三部分（高级类型与数据结构）全部完成，下一章我们将进入第四部分，探讨ES Module模块系统的加载、解析与执行机制。

### 思考题

1. 为什么V8使用状态机而非传统的栈帧（Stack Frame）保存来实现生成器的暂停恢复？状态机相比栈帧有什么优势？

2. 实现一个`take(n)`生成器工具函数，从任意可迭代对象中取前n个元素，支持无限序列。例如：`[...take(5, fibonacci())]`返回前5个斐波那契数。

3. 解释为什么异步生成器（`async function*`）不能在普通的`for...of`中使用，必须使用`for await...of`？V8如何区分同步和异步迭代器协议？
