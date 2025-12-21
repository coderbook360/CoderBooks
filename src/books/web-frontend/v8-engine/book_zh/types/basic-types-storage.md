# 基本类型的存储：Number、String、Boolean

在上一章中，我们了解了 V8 如何使用 Tagged Pointer 和 Smi 来统一表示 JavaScript 值。现在让我们深入探讨三种最基本的 JavaScript 类型：**Number**、**String** 和 **Boolean**，看看 V8 如何在内存中存储它们。

这三种类型虽然看起来简单，但 V8 对它们做了大量的优化。让我们从一个有趣的现象开始：

```javascript
let a = 42;
let b = 42;
console.log(a === b);  // true

let x = "hello";
let y = "hello";
console.log(x === y);  // true

let m = { value: 42 };
let n = { value: 42 };
console.log(m === n);  // false！
```

为什么前两个比较返回 `true`，但最后一个返回 `false`？答案就在于 V8 如何存储这些不同类型的值。

## Number 类型的存储

JavaScript 只有一种数字类型：`Number`，但在 V8 内部，数字有多种表示方式。

### Smi：小整数的直接表示

我们在上一章已经介绍过 **Smi**（Small Integer）。对于范围内的整数（-2^30 ~ 2^30-1），V8 直接将其编码在 Tagged Value 中：

```javascript
let x = 42;      // Smi，直接存储在 Tagged Value
let y = -100;    // Smi
let z = 1000000; // Smi（仍在范围内）
```

**Smi 的优势**：
- **零内存分配**：不需要在堆上创建对象
- **快速运算**：算术运算直接在 Tagged Value 上进行
- **无 GC 压力**：不参与垃圾回收

### HeapNumber：浮点数和大整数

对于 Smi 无法表示的数字，V8 在堆上分配 **HeapNumber** 对象：

```javascript
let a = 3.14;           // 浮点数，HeapNumber
let b = 2000000000;     // 超出 Smi 范围，HeapNumber
let c = NaN;            // 特殊值，HeapNumber
let d = Infinity;       // 特殊值，HeapNumber
```

**HeapNumber 的内存布局**：

```
HeapNumber 对象：

┌─────────────────────┐  ← 对象起始地址（8 字节对齐）
│   Map Pointer       │  指向 HeapNumber 的 Map（8 字节）
├─────────────────────┤
│   Double Value      │  64 位 IEEE 754 浮点数（8 字节）
└─────────────────────┘

总大小：16 字节
```

示例：

```javascript
let x = 3.14159;

// V8 内部表示（简化）：
// Tagged Value：0x00007fff5fbff8a9（指针 + Tag 001）
// 指向堆上的 HeapNumber 对象：
// {
//   map: <HeapNumber Map>,
//   value: 3.14159  // 64 位 double
// }
```

### IEEE 754 浮点数标准

JavaScript 遵循 **IEEE 754 双精度浮点数**标准，这决定了 Number 类型的特性：

**精度限制**：

```javascript
console.log(0.1 + 0.2);  // 0.30000000000000004（不是 0.3！）
console.log(0.1 + 0.2 === 0.3);  // false
```

**原因**：十进制的 `0.1` 和 `0.2` 无法精确表示为二进制浮点数，导致精度损失。

**安全整数范围**：

JavaScript 能够精确表示的整数范围是 **-2^53 ~ 2^53**（`Number.MIN_SAFE_INTEGER` ~ `Number.MAX_SAFE_INTEGER`）：

```javascript
console.log(Number.MAX_SAFE_INTEGER);      // 9007199254740991
console.log(Number.MAX_SAFE_INTEGER + 1);  // 9007199254740992
console.log(Number.MAX_SAFE_INTEGER + 2);  // 9007199254740992（精度丢失！）
```

超出这个范围，整数运算可能不准确。这时应该使用 **BigInt**。

### Number 类型的性能特征

**性能对比**：

```javascript
// 测试 1：Smi 运算（快）
function smiAdd(n) {
  let sum = 0;
  for (let i = 0; i < n; i++) {
    sum += 1;  // 始终是 Smi
  }
  return sum;
}

// 测试 2：HeapNumber 运算（慢）
function heapNumberAdd(n) {
  let sum = 0.5;  // 浮点数，HeapNumber
  for (let i = 0; i < n; i++) {
    sum += 1;
  }
  return sum;
}

console.time("Smi");
smiAdd(1000000);
console.timeEnd("Smi");

console.time("HeapNumber");
heapNumberAdd(1000000);
console.timeEnd("HeapNumber");
```

在我的测试中，Smi 版本比 HeapNumber 版本快约 **2-3 倍**。

## String 类型的存储

字符串在 JavaScript 中无处不在，V8 对字符串的优化非常复杂。

### 字符串的不可变性

在 JavaScript 中，字符串是**不可变的**（Immutable）：

```javascript
let s = "hello";
s[0] = "H";  // 无效！字符串不可修改
console.log(s);  // 仍然是 "hello"

// 唯一方式是创建新字符串
let s2 = "H" + s.slice(1);
console.log(s2);  // "Hello"
```

不可变性带来了优化机会：V8 可以**共享相同的字符串对象**。

### 字符串的内部表示

V8 中的字符串对象结构：

```
String 对象（简化）：

┌─────────────────────┐
│   Map Pointer       │  指向 String Map
├─────────────────────┤
│   Hash Code         │  字符串的哈希值（4 字节）
├─────────────────────┤
│   Length            │  字符串长度（4 字节）
├─────────────────────┤
│   Char Data         │  字符数据（可变长度）
│   ...               │
└─────────────────────┘
```

V8 支持两种字符编码：

1. **One-byte String**（Latin-1 编码）：每个字符 1 字节，适用于 ASCII 和 Latin-1 字符
2. **Two-byte String**（UTF-16 编码）：每个字符 2 字节，适用于 Unicode 字符

```javascript
let ascii = "hello";      // One-byte String（5 字节）
let unicode = "你好世界";  // Two-byte String（8 字节）
let mixed = "hello世界";  // Two-byte String（整个字符串使用 2 字节编码）
```

### 字符串的内存优化

**1. 字符串常量池（String Interning）**

V8 维护一个**字符串常量池**，相同的字符串常量共享同一个对象：

```javascript
let s1 = "hello";
let s2 = "hello";
console.log(s1 === s2);  // true（指向同一个对象！）
```

但动态生成的字符串不会自动进入常量池：

```javascript
let s3 = "hel" + "lo";
console.log(s3 === s1);  // true（编译期优化）

let s4 = "hel";
let s5 = s4 + "lo";
console.log(s5 === s1);  // false（运行时生成，不同对象）
```

**2. Cons String（拼接字符串）**

当两个字符串拼接时，V8 不会立即分配新内存，而是创建一个 **Cons String**（Concatenated String），延迟实际的字符串复制：

```javascript
let s1 = "hello";
let s2 = "world";
let s3 = s1 + s2;  // 创建 Cons String，不立即复制数据
```

**Cons String 结构**：

```
Cons String：

┌─────────────────────┐
│   Map Pointer       │  指向 Cons String Map
├─────────────────────┤
│   Hash Code         │
├─────────────────────┤
│   Length            │  总长度（10）
├─────────────────────┤
│   Left Pointer      │  指向 "hello"
├─────────────────────┤
│   Right Pointer     │  指向 "world"
└─────────────────────┘
```

只有在真正访问字符串内容时（如读取某个字符），V8 才会 **扁平化**（Flatten）Cons String，将其转换为普通字符串。

**3. Sliced String（切片字符串）**

类似地，`substring` 操作也不会立即复制数据：

```javascript
let original = "hello world";
let part = original.substring(0, 5);  // 创建 Sliced String
```

**Sliced String 结构**：

```
Sliced String：

┌─────────────────────┐
│   Map Pointer       │  指向 Sliced String Map
├─────────────────────┤
│   Hash Code         │
├─────────────────────┤
│   Length            │  5
├─────────────────────┤
│   Parent Pointer    │  指向 "hello world"
├─────────────────────┤
│   Offset            │  起始偏移量（0）
└─────────────────────┘
```

这种延迟复制策略大大减少了内存分配和数据拷贝。

### 字符串的性能建议

**1. 避免频繁字符串拼接**

```javascript
// ❌ 坏：频繁拼接，创建大量 Cons String
let result = "";
for (let i = 0; i < 10000; i++) {
  result += "a";  // 每次迭代创建新 Cons String
}

// ✅ 好：使用数组 join
let arr = [];
for (let i = 0; i < 10000; i++) {
  arr.push("a");
}
let result = arr.join("");  // 一次性分配内存
```

**2. 使用模板字符串代替拼接**

```javascript
// ❌ 坏
let name = "Alice";
let greeting = "Hello, " + name + "!";

// ✅ 好：更清晰，性能相当
let greeting = `Hello, ${name}!`;
```

**3. 缓存字符串长度**

```javascript
// ❌ 坏：每次迭代都访问 length
for (let i = 0; i < str.length; i++) {
  // ...
}

// ✅ 好：缓存长度（虽然现代引擎优化了这一点）
let len = str.length;
for (let i = 0; i < len; i++) {
  // ...
}
```

## Boolean 类型的存储

Boolean 是最简单的类型，只有两个值：`true` 和 `false`。

### Boolean 的特殊表示

V8 对 Boolean 进行了特殊优化：**`true` 和 `false` 是全局唯一的对象**。

```javascript
let a = true;
let b = true;
console.log(a === b);  // true（指向同一个对象）
```

V8 内部维护了两个固定的 Boolean 对象：

- **Root Table** 中的 `true_value`
- **Root Table** 中的 `false_value`

所有 Boolean 值都指向这两个对象，不需要额外分配内存。

### Boolean 的内存布局

```
True/False 对象：

┌─────────────────────┐
│   Map Pointer       │  指向 Oddball Map
├─────────────────────┤
│   Value             │  1（true）或 0（false）
└─────────────────────┘
```

Boolean 属于 **Oddball** 类型（奇异值），这个类型还包括 `null`、`undefined` 等特殊值。

### Boolean 值的判断

在条件判断中，V8 会将值转换为 Boolean：

```javascript
if (value) {  // value 被转换为 Boolean
  // ...
}
```

**Truthy 值**（转换为 `true`）：
- 所有对象（包括空对象 `{}`）
- 非零数字（包括负数）
- 非空字符串（包括 `"0"` 和 `"false"`）
- 数组（包括空数组 `[]`）

**Falsy 值**（转换为 `false`）：
- `false`
- `0`、`-0`、`0n`（BigInt 零）
- `""`（空字符串）
- `null`
- `undefined`
- `NaN`

示例：

```javascript
console.log(Boolean(0));           // false
console.log(Boolean(""));          // false
console.log(Boolean(null));        // false
console.log(Boolean(undefined));   // false
console.log(Boolean(NaN));         // false

console.log(Boolean({}));          // true（空对象！）
console.log(Boolean([]));          // true（空数组！）
console.log(Boolean("0"));         // true（字符串"0"！）
console.log(Boolean("false"));     // true（字符串"false"！）
```

### Boolean 的性能特征

由于 Boolean 值是全局唯一的，比较操作非常快：

```javascript
// Boolean 比较是指针比较，极快
if (flag === true) {  // 指针比较
  // ...
}

// 隐式转换也很快（字节码层面优化）
if (flag) {  // 直接使用 Tagged Value 判断
  // ...
}
```

## 类型的比较与相等性

### === vs ==

`===`（严格相等）不进行类型转换：

```javascript
console.log(42 === "42");      // false（类型不同）
console.log(true === 1);       // false
console.log(null === undefined);  // false
```

`==`（宽松相等）会进行类型转换：

```javascript
console.log(42 == "42");       // true（字符串转为数字）
console.log(true == 1);        // true（布尔转为数字）
console.log(null == undefined);  // true（特殊规则）
```

**性能建议**：优先使用 `===`，因为它更快（无需类型转换）且更清晰。

### 对象的比较

对象比较是**引用比较**（比较内存地址），而不是值比较：

```javascript
let a = { x: 1 };
let b = { x: 1 };
console.log(a === b);  // false（不同对象）

let c = a;
console.log(a === c);  // true（同一个对象）
```

这就是为什么本章开头的示例中，数字和字符串相等但对象不相等。

## 本章小结

本章我们深入理解了 V8 如何存储 JavaScript 的三种基本类型。核心要点：

1. **Number 类型**：Smi 直接编码，HeapNumber 在堆上分配，遵循 IEEE 754 标准
2. **String 类型**：不可变，支持字符串常量池、Cons String、Sliced String 等优化
3. **Boolean 类型**：全局唯一的 `true` 和 `false` 对象，属于 Oddball 类型
4. **性能优化**：Smi 优于 HeapNumber，字符串避免频繁拼接，优先使用 `===` 比较
5. **内存布局**：所有堆对象都有 Map 指针，指向描述对象结构的 Map 对象

理解这些基本类型的存储方式，是优化 JavaScript 代码性能的基础。在接下来的章节中，我们将探讨更复杂的类型：对象、数组、函数等，它们都建立在这些基础之上。

---

**思考题**：

1. 为什么字符串的不可变性能够带来性能优化？
2. Cons String 和 Sliced String 的延迟复制策略有什么潜在风险？
3. 如果你要设计一个字符串系统，你会选择可变还是不可变？为什么？
