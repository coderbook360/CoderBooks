# Node.js中的V8优化技巧

理解V8的优化机制后，我们可以写出对引擎更友好的代码。本章总结实用的优化技巧，帮助你在关键路径上获得更好的性能。

## 优化原则

在开始具体技巧之前，先明确几个原则：

```
┌─────────────────────────────────────────────────────────────┐
│                     优化原则                                 │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. 先测量，再优化                                           │
│     没有数据支撑的优化是盲目的                                │
│                                                             │
│  2. 优化热点，忽略冷路径                                     │
│     80% 的时间花在 20% 的代码上                              │
│                                                             │
│  3. 可读性优先                                               │
│     微优化可能让代码难以维护                                  │
│                                                             │
│  4. 相信编译器                                               │
│     V8 已经很聪明，不要过度"帮助"它                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## 保持对象结构一致

V8使用**隐藏类**（Hidden Classes）加速属性访问。对象结构一致时，可以共享隐藏类。

### 问题代码

```javascript
// ❌ 属性添加顺序不一致
function createUser(name, age) {
  const user = {};
  if (name) user.name = name;  // 可能先添加 name
  if (age) user.age = age;     // 可能先添加 age
  return user;
}

const user1 = createUser('Alice', 30);  // { name, age }
const user2 = createUser(null, 25);     // { age }
const user3 = createUser('Bob', null);  // { name }

// 三个对象有不同的隐藏类，无法优化
```

### 优化代码

```javascript
// ✅ 保持一致的对象结构
function createUser(name, age) {
  return {
    name: name || null,
    age: age || null
  };
}

// 或使用类
class User {
  constructor(name, age) {
    this.name = name;
    this.age = age;
  }
}

// 所有实例共享相同的隐藏类
```

### 使用类而非动态对象

```javascript
// ✅ 类天然保持结构一致
class Point {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }
  
  distance(other) {
    const dx = this.x - other.x;
    const dy = this.y - other.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
}

// 比动态创建对象更优化友好
const points = Array.from({ length: 1000 }, (_, i) => new Point(i, i));
```

## 保持类型稳定

V8为特定类型优化代码。类型变化会导致反优化。

### 问题代码

```javascript
// ❌ 类型不稳定
function add(a, b) {
  return a + b;
}

add(1, 2);       // 整数加法
add(1.5, 2.5);   // 浮点加法 → 反优化
add('a', 'b');   // 字符串拼接 → 反优化
```

### 优化代码

```javascript
// ✅ 类型稳定的函数
function addNumbers(a, b) {
  return a + b;  // 只用于数字
}

function concatenate(a, b) {
  return a + b;  // 只用于字符串
}

// 或使用 TypeScript 保证类型
```

### 避免混合数组

```javascript
// ❌ 混合类型数组
const mixed = [1, 'two', { three: 3 }, null];

// V8 需要用更通用（更慢）的表示

// ✅ 同类型数组
const numbers = [1, 2, 3, 4, 5];
const strings = ['a', 'b', 'c'];

// V8 可以使用优化的内存布局
```

### 使用TypedArray

```javascript
// 密集数值计算使用 TypedArray
const float64 = new Float64Array(1000);
const int32 = new Int32Array(1000);

// 比普通数组更快，内存更紧凑
function sumTypedArray(arr) {
  let sum = 0;
  for (let i = 0; i < arr.length; i++) {
    sum += arr[i];
  }
  return sum;
}
```

## 避免反优化陷阱

### 避免arguments对象

```javascript
// ❌ 使用 arguments
function sum() {
  let total = 0;
  for (let i = 0; i < arguments.length; i++) {
    total += arguments[i];
  }
  return total;
}

// ✅ 使用 rest 参数
function sum(...numbers) {
  let total = 0;
  for (let i = 0; i < numbers.length; i++) {
    total += numbers[i];
  }
  return total;
}

// 或者更简洁
function sum(...numbers) {
  return numbers.reduce((a, b) => a + b, 0);
}
```

### 避免delete操作

```javascript
// ❌ delete 破坏隐藏类
const user = { name: 'Alice', age: 30 };
delete user.age;  // 隐藏类变化，后续访问变慢

// ✅ 设置为 undefined/null
const user = { name: 'Alice', age: 30 };
user.age = undefined;  // 保持隐藏类不变
```

### 避免在热函数中使用try-catch

```javascript
// ❌ try-catch 在函数内部
function processData(data) {
  try {
    for (let i = 0; i < data.length; i++) {
      // 热循环在 try 块内
      process(data[i]);
    }
  } catch (e) {
    console.error(e);
  }
}

// ✅ 把 try-catch 移到外层
function processItem(item) {
  // 热函数，容易优化
  return transform(item);
}

function processData(data) {
  try {
    for (let i = 0; i < data.length; i++) {
      processItem(data[i]);
    }
  } catch (e) {
    console.error(e);
  }
}
```

### 避免with和eval

```javascript
// ❌ 永远不要用
with (obj) { ... }  // 作用域不可预测
eval('code');       // 无法静态分析

// ✅ 明确的属性访问
const value = obj.property;

// 如果真的需要动态执行
const fn = new Function('a', 'b', 'return a + b');
```

## 优化循环

### 缓存数组长度

```javascript
// ❌ 每次迭代都访问 length
for (let i = 0; i < arr.length; i++) {
  process(arr[i]);
}

// ✅ 缓存长度
for (let i = 0, len = arr.length; i < len; i++) {
  process(arr[i]);
}

// 注意：现代 V8 对简单情况已经优化了
// 但在复杂场景下缓存仍有帮助
```

### 避免在循环中创建函数

```javascript
// ❌ 每次迭代都创建新函数
for (let i = 0; i < 1000; i++) {
  arr.map(x => x * i);  // 每次都创建闘包
}

// ✅ 复用函数
function createMultiplier(factor) {
  return x => x * factor;
}

for (let i = 0; i < 1000; i++) {
  const multiplier = createMultiplier(i);
  arr.map(multiplier);
}
```

### 减少循环中的分配

```javascript
// ❌ 循环中频繁分配
function processData(data) {
  const results = [];
  for (const item of data) {
    const temp = { value: item.x + item.y };  // 每次分配
    results.push(temp);
  }
  return results;
}

// ✅ 预分配或直接构建结果
function processData(data) {
  return data.map(item => ({
    value: item.x + item.y
  }));
}

// 或者复用对象
function processData(data) {
  const result = { value: 0 };
  for (const item of data) {
    result.value = item.x + item.y;
    output(result);
  }
}
```

## 字符串优化

### 使用模板字符串

```javascript
// ❌ 字符串拼接
const message = 'Hello, ' + name + '! You have ' + count + ' messages.';

// ✅ 模板字符串（更清晰，V8 优化良好）
const message = `Hello, ${name}! You have ${count} messages.`;
```

### 避免频繁的字符串拼接

```javascript
// ❌ 循环中拼接字符串
let html = '';
for (const item of items) {
  html += `<li>${item}</li>`;  // 每次都创建新字符串
}

// ✅ 使用数组 join
const htmlParts = items.map(item => `<li>${item}</li>`);
const html = htmlParts.join('');

// 或使用 Array.prototype.join
const html = items.map(item => `<li>${item}</li>`).join('');
```

### 预分配字符串（Buffer场景）

```javascript
// 构建大字符串时，考虑使用 Buffer
const chunks = [];
for (const item of items) {
  chunks.push(Buffer.from(`<li>${item}</li>`));
}
const html = Buffer.concat(chunks).toString();
```

## 函数优化

### 保持函数短小

```javascript
// ❌ 巨大的单体函数
function processEverything(data) {
  // 500 行代码...
  // V8 可能不会优化超大函数
}

// ✅ 拆分为小函数
function processData(data) {
  const validated = validate(data);
  const transformed = transform(validated);
  return format(transformed);
}
```

### 内联提示

```javascript
// 小函数通常会被内联，无需手动处理
function square(x) {
  return x * x;
}

// V8 会自动内联到调用点
const result = square(5);  // 变成 5 * 5
```

### 避免过度使用getter/setter

```javascript
// ❌ getter 有调用开销
class Circle {
  constructor(radius) {
    this._radius = radius;
  }
  
  get area() {
    return Math.PI * this._radius * this._radius;
  }
}

// 在热循环中频繁调用 getter 可能有开销
for (let i = 0; i < 1000000; i++) {
  sum += circle.area;  // 每次都是函数调用
}

// ✅ 缓存计算结果
class Circle {
  constructor(radius) {
    this.radius = radius;
    this.area = Math.PI * radius * radius;  // 预计算
  }
}
```

## 内存优化

### 对象池

```javascript
class ObjectPool {
  constructor(factory, reset, maxSize = 1000) {
    this.factory = factory;
    this.reset = reset;
    this.pool = [];
    this.maxSize = maxSize;
  }
  
  acquire() {
    return this.pool.length > 0 ? this.pool.pop() : this.factory();
  }
  
  release(obj) {
    if (this.pool.length < this.maxSize) {
      this.reset(obj);
      this.pool.push(obj);
    }
  }
}

// 使用示例
const vectorPool = new ObjectPool(
  () => ({ x: 0, y: 0, z: 0 }),
  (v) => { v.x = v.y = v.z = 0; }
);

function processVectors(data) {
  for (const item of data) {
    const vec = vectorPool.acquire();
    vec.x = item.x;
    vec.y = item.y;
    vec.z = item.z;
    
    // 使用 vec...
    
    vectorPool.release(vec);
  }
}
```

### 避免闭包陷阱

```javascript
// ❌ 闘包意外持有大对象
function createHandler(largeData) {
  return function handler() {
    // 即使不使用 largeData，闭包仍然持有它
    console.log('handling');
  };
}

// ✅ 只捕获需要的数据
function createHandler(largeData) {
  const id = largeData.id;  // 只提取需要的
  return function handler() {
    console.log('handling', id);
  };
}
```

### 及时解除引用

```javascript
// 处理完大数据后解除引用
async function processLargeFile(path) {
  let data = await readFile(path);
  const result = transform(data);
  
  data = null;  // 解除引用，允许 GC 回收
  
  return result;
}
```

## 异步优化

### 批量处理

```javascript
// ❌ 串行处理
async function processItems(items) {
  for (const item of items) {
    await processItem(item);  // 等待每一个
  }
}

// ✅ 并行处理
async function processItems(items) {
  await Promise.all(items.map(item => processItem(item)));
}

// ✅ 控制并发
async function processItems(items, concurrency = 10) {
  const results = [];
  const executing = [];
  
  for (const item of items) {
    const p = processItem(item).then(result => {
      executing.splice(executing.indexOf(p), 1);
      return result;
    });
    results.push(p);
    executing.push(p);
    
    if (executing.length >= concurrency) {
      await Promise.race(executing);
    }
  }
  
  return Promise.all(results);
}
```

### 避免不必要的await

```javascript
// ❌ 不必要的 await
async function getData() {
  return await fetchData();  // await 是多余的
}

// ✅ 直接返回 Promise
async function getData() {
  return fetchData();
}

// 注意：有时需要 await 来正确捕获错误
async function getData() {
  try {
    return await fetchData();  // 这里需要 await
  } catch (e) {
    throw new CustomError(e);
  }
}
```

## 总结检查清单

```
┌─────────────────────────────────────────────────────────────┐
│                   V8 优化检查清单                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  对象与类：                                                  │
│  □ 使用类而非动态对象                                        │
│  □ 保持属性添加顺序一致                                      │
│  □ 避免使用 delete                                          │
│                                                             │
│  类型：                                                      │
│  □ 函数参数类型保持一致                                      │
│  □ 数组元素类型统一                                          │
│  □ 数值计算使用 TypedArray                                  │
│                                                             │
│  函数：                                                      │
│  □ 避免 arguments，使用 rest 参数                           │
│  □ 热函数外移 try-catch                                     │
│  □ 不使用 with 和 eval                                      │
│                                                             │
│  循环：                                                      │
│  □ 减少循环内的内存分配                                      │
│  □ 复杂场景缓存数组长度                                      │
│  □ 避免循环内创建函数                                        │
│                                                             │
│  内存：                                                      │
│  □ 高频对象使用对象池                                        │
│  □ 闭包只捕获必要数据                                        │
│  □ 及时解除大对象引用                                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## 小结

V8优化的核心原则：

| 类别 | 要点 |
|-----|-----|
| 对象 | 保持结构一致，使用类 |
| 类型 | 类型稳定，避免混合 |
| 函数 | 小而专一，避免反优化陷阱 |
| 循环 | 减少分配，缓存变量 |
| 内存 | 对象池，控制闭包 |
| 异步 | 批量处理，控制并发 |

记住：
- **先测量**：用性能工具找到真正的瓶颈
- **后优化**：针对热点代码优化
- **再验证**：确认优化有效果

大多数代码不需要这些技巧。只在确认存在性能问题的热点路径上应用这些优化。
