# BigInt：任意精度整数的实现

你是否遇到过JavaScript中Number类型的精度限制问题？当处理超过`2^53-1`的整数时，运算结果出现误差：

```javascript
console.log(9007199254740992 + 1);  // 9007199254740992（错误！）
console.log(9007199254740993 === 9007199254740992);  // true（丢失精度）
```

这是因为Number类型使用IEEE 754双精度浮点数表示，整数精度限制在53位。为解决这一问题，ES2020引入了`BigInt`类型，提供任意精度整数运算能力。

本章将深入V8引擎，揭示`BigInt`的内存表示、多精度算术实现、以及与Number类型的本质区别，帮助你理解何时使用`BigInt`以及如何优化其性能。

## Number 类型的精度限制

### IEEE 754 双精度浮点数

JavaScript的Number类型遵循IEEE 754双精度浮点数标准，64位内存布局如下：

```
IEEE 754 双精度浮点数（64位）：
+--------+-------------+--------------------+
| 符号位  |   指数（11位）|  尾数（52位）      |
| 1 bit  |   11 bits   |   52 bits         |
+--------+-------------+--------------------+

整数表示范围：
- 安全整数：-(2^53-1) 到 (2^53-1)，即 ±9007199254740991
- 超出此范围，无法精确表示所有整数
```

**精度问题示例**：

```javascript
// 安全整数范围内
console.log(Number.MAX_SAFE_INTEGER);  // 9007199254740991 (2^53 - 1)
console.log(Number.isSafeInteger(9007199254740991));  // true

// 超出安全范围
const largeNum = 9007199254740992;  // 2^53
console.log(largeNum + 1);          // 9007199254740992（应为 9007199254740993）
console.log(largeNum + 2);          // 9007199254740994（正确，但 +1 丢失了）

// 无法区分相邻整数
console.log(9007199254740993 === 9007199254740992);  // true（错误！）
```

**根本原因**：尾数只有52位（加上隐含的1位，共53位），超过53位的整数无法精确表示，导致舍入误差。

### 实际场景中的问题

**1. ID或时间戳处理**：

```javascript
// 服务器返回的 ID（如 Twitter Snowflake ID）
const userId = 1234567890123456789;  // 超过安全整数范围
console.log(userId);  // 1234567890123456800（精度丢失）

// 时间戳（纳秒级）
const timestamp = 1609459200000000000;  // 2021-01-01 00:00:00 (纳秒)
console.log(timestamp);  // 1609459200000000000（可能丢失精度）
```

**2. 密码学计算**：

```javascript
// RSA加密中的大整数运算
const p = 9007199254740993;  // 质数
const q = 9007199254740997;  // 质数
const n = p * q;  // 模数
console.log(n);  // 81129638414606663221418204161（错误结果）
```

**3. 金融计算**：

```javascript
// 分（cents）转换为元（dollars）
const totalCents = 90071992547409920;  // 大额金额
console.log(totalCents / 100);  // 900719925474099.2（应为 900719925474099.20）
```

这些场景都需要精确的大整数运算，`BigInt`应运而生。

## BigInt 类型：任意精度整数

### 基本语法与使用

`BigInt`通过后缀`n`或构造函数`BigInt()`创建：

```javascript
// 字面量语法（推荐）
const big1 = 1234567890123456789012345678901234567890n;
console.log(big1);  // 1234567890123456789012345678901234567890n

// 构造函数
const big2 = BigInt('9007199254740993');
console.log(big2);  // 9007199254740993n

// 从Number转换（仅限安全整数）
const big3 = BigInt(123);
console.log(big3);  // 123n

// 错误：非整数
// BigInt(1.5);  // RangeError

// 错误：超出安全整数范围的Number
// BigInt(9007199254740993);  // 可能丢失精度，需用字符串
```

**关键特性**：
- 任意长度：无位数限制（受内存限制）。
- 精确运算：加减乘除求余等运算完全精确。
- 独立类型：与Number完全分离，不能混合运算。

### BigInt 与 Number 的严格分离

`BigInt`和`Number`是不同类型，不能直接混合运算：

```javascript
const big = 10n;
const num = 20;

// 错误：不能混合运算
// console.log(big + num);  // TypeError: Cannot mix BigInt and other types

// 正确：显式转换
console.log(big + BigInt(num));  // 30n
console.log(Number(big) + num);  // 30（转为Number，可能丢失精度）

// 比较运算允许（使用抽象相等）
console.log(10n == 10);   // true（抽象相等）
console.log(10n === 10);  // false（严格相等，类型不同）
console.log(10n < 20);    // true（数值比较）
```

**设计原因**：防止隐式类型转换导致精度丢失或性能陷阱。开发者必须明确选择转换方向。

### 类型检测

```javascript
console.log(typeof 123n);           // "bigint"
console.log(typeof BigInt(456));    // "bigint"

console.log(123n instanceof BigInt);  // false（BigInt不是对象）
console.log(Object(123n) instanceof BigInt);  // true（装箱后）
```

## V8 中的 BigInt 实现

### JSBigInt 对象结构

V8将`BigInt`实现为堆对象`JSBigInt`，结构如下：

```
JSBigInt 对象布局：
+------------------------+
| Map (Hidden Class)     |  ← 指向 JSBigInt 的 Map
+------------------------+
| length (位数)          |  ← digit 数组长度
+------------------------+
| sign (符号)            |  ← 0: 正数, 1: 负数
+------------------------+
| digits (数字数组)      |  ← 存储实际数值的 digit 数组
|   digit[0]             |
|   digit[1]             |
|   ...                  |
|   digit[length-1]      |
+------------------------+
```

**关键字段**：
- **length**：`digit`数组的长度，表示`BigInt`的"位数"（以digit为单位）。
- **sign**：符号位，0表示正数或零，1表示负数。
- **digits**：存储实际数值的数组，每个`digit`是32位或64位无符号整数（取决于平台）。

### Digit 数组：多精度表示

V8使用**多精度算术（Multi-Precision Arithmetic）**表示`BigInt`，将大整数拆分为多个固定位宽的`digit`存储。

**32位平台示例**（每个digit为32位）：

```
BigInt值：0x123456789ABCDEF0（十六进制）

分解为32位digit（小端序）：
digits[0] = 0x9ABCDEF0  （低32位）
digits[1] = 0x12345678  （高32位）

内存表示：
JSBigInt:
  length: 2
  sign: 0 (正数)
  digits: [0x9ABCDEF0, 0x12345678]
```

**64位平台**（每个digit为64位）：

```
相同BigInt在64位平台：
digits[0] = 0x123456789ABCDEF0  （一个64位digit）

JSBigInt:
  length: 1
  sign: 0
  digits: [0x123456789ABCDEF0]
```

**小端序存储**：低位`digit`在前，高位`digit`在后，便于算术运算从低位向高位进位。

### 加法运算的实现

`BigInt`加法通过逐digit相加并处理进位实现，类似手工竖式加法：

```
示例：12345678901234567890n + 98765432109876543210n

逐digit相加（假设64位平台，每digit存64位）：
  12345678901234567890
+ 98765432109876543210
-----------------------
 111111111011111111100

伪代码：
function bigintAdd(a, b) {
  const maxLength = Math.max(a.length, b.length);
  const result = new BigInt(maxLength + 1);  // 最多多一位（进位）
  let carry = 0;
  
  for (let i = 0; i < maxLength; i++) {
    const digitA = i < a.length ? a.digits[i] : 0;
    const digitB = i < b.length ? b.digits[i] : 0;
    const sum = digitA + digitB + carry;
    
    result.digits[i] = sum & 0xFFFFFFFF;  // 32位平台取低32位
    carry = sum >> 32;                     // 进位
  }
  
  if (carry > 0) {
    result.digits[maxLength] = carry;
    result.length = maxLength + 1;
  } else {
    result.length = maxLength;
  }
  
  return result;
}
```

**实际示例**：

```javascript
const a = 12345678901234567890n;
const b = 98765432109876543210n;
const sum = a + b;

console.log(sum);  // 111111111011111111100n（精确结果）

// 对比 Number（丢失精度）
console.log(Number(a) + Number(b));  // 111111111011111110000（最后几位错误）
```

### 乘法运算的实现

`BigInt`乘法使用**长乘法（Long Multiplication）**或更高效的**Karatsuba算法**：

**长乘法伪代码**（简化版）：

```
function bigintMultiply(a, b) {
  const result = new BigInt(a.length + b.length);  // 结果最多 m+n 位
  
  for (let i = 0; i < a.length; i++) {
    let carry = 0;
    for (let j = 0; j < b.length; j++) {
      const product = a.digits[i] * b.digits[j] + result.digits[i + j] + carry;
      result.digits[i + j] = product & 0xFFFFFFFF;  // 低32位
      carry = product >> 32;                         // 高32位进位
    }
    result.digits[i + b.length] += carry;
  }
  
  return result;
}
```

**复杂度**：
- 长乘法：O(n²)，n为digit数量。
- Karatsuba算法：O(n^1.585)，适用于大数乘法。

V8会根据`BigInt`大小选择算法：小数用长乘法，大数用Karatsuba或FFT算法。

### 除法与求余

除法是`BigInt`运算中最复杂的操作，V8使用**长除法（Long Division）**或**Barrett约减**等算法：

```javascript
const dividend = 123456789012345678901234567890n;
const divisor = 123456789n;

const quotient = dividend / divisor;
const remainder = dividend % divisor;

console.log(quotient);   // 1000000001000000001n
console.log(remainder);  // 111111111n

// 验证：dividend = quotient * divisor + remainder
console.log(quotient * divisor + remainder === dividend);  // true
```

**性能特点**：除法比加减乘慢得多（复杂度O(n²)或更高），大规模计算时需注意。

## BigInt 的性能特性

### 性能对比：BigInt vs Number

```javascript
// 小整数运算
console.time('Number addition');
for (let i = 0; i < 1000000; i++) {
  const result = 123 + 456;
}
console.timeEnd('Number addition');  // ~2ms

console.time('BigInt addition');
for (let i = 0; i < 1000000; i++) {
  const result = 123n + 456n;
}
console.timeEnd('BigInt addition');  // ~15ms（慢7倍）

// 大整数运算
const bigA = 12345678901234567890123456789012345678901234567890n;
const bigB = 98765432109876543210987654321098765432109876543210n;

console.time('BigInt large addition');
for (let i = 0; i < 10000; i++) {
  const result = bigA + bigB;
}
console.timeEnd('BigInt large addition');  // ~5ms

// 乘法
console.time('BigInt multiplication');
const product = bigA * bigB;
console.timeEnd('BigInt multiplication');  // ~0.01ms
console.log(product.toString().length);  // 98位数字
```

**性能特点**：
- **小整数**：`BigInt`比Number慢5-10倍（堆分配、多精度算术开销）。
- **大整数**：`BigInt`是唯一选择，Number无法精确表示。
- **运算类型**：加减最快，乘法次之，除法最慢。

### 内存开销

`BigInt`是堆对象，内存开销远大于Number（立即值或Smi）：

```javascript
// Number（Smi，无堆分配）
const num = 123;  // 仅占用指针大小（8字节）

// BigInt（堆对象）
const big = 123n;
// JSBigInt对象：
//   Map: 8字节
//   length: 4字节
//   sign: 4字节
//   digits[0]: 8字节（64位平台）
// 总计：~24字节 + 对象头开销
```

**优化建议**：
- 仅在必要时使用`BigInt`（超出安全整数范围）。
- 避免在热点路径中频繁创建临时`BigInt`对象。
- 批量计算时复用变量，减少GC压力。

### TurboFan 优化

V8的TurboFan编译器对`BigInt`运算有限支持：

**优化场景**：
- 常量`BigInt`：编译时计算结果。
- 简单运算：加减法可内联。
- 类型稳定：函数始终操作`BigInt`时优化更好。

**不优化场景**：
- 混合`BigInt`和Number运算（需类型检查）。
- 复杂运算（除法、大数乘法）。
- 频繁装箱/拆箱。

```javascript
// 优化良好
function addBigInts(a, b) {
  return a + b;  // TurboFan可内联
}

// 优化困难
function mixedOperation(a, b) {
  if (typeof a === 'bigint') {
    return a + BigInt(b);  // 类型检查和转换开销
  }
  return a + b;
}
```

## 实际应用场景

### 金融计算

金融系统中常用分（cents）作为最小单位避免浮点误差，`BigInt`确保精确计算：

```javascript
class Money {
  constructor(cents) {
    this.cents = BigInt(cents);  // 存储为分
  }
  
  add(other) {
    return new Money(this.cents + other.cents);
  }
  
  multiply(factor) {
    return new Money(this.cents * BigInt(factor));
  }
  
  toDollars() {
    return Number(this.cents) / 100;  // 转为元显示
  }
}

const price = new Money(12345);  // $123.45
const tax = price.multiply(1.08);  // 乘以税率 1.08

console.log(tax.toDollars());  // 133.326（需进一步处理舍入）
```

### 密码学计算

RSA等算法需要大整数模幂运算：

```javascript
// 模幂运算：(base^exponent) % modulus
function modPow(base, exponent, modulus) {
  base = BigInt(base);
  exponent = BigInt(exponent);
  modulus = BigInt(modulus);
  
  let result = 1n;
  base = base % modulus;
  
  while (exponent > 0n) {
    if (exponent % 2n === 1n) {
      result = (result * base) % modulus;
    }
    exponent = exponent / 2n;
    base = (base * base) % modulus;
  }
  
  return result;
}

// RSA加密示例（简化）
const message = 42n;
const e = 65537n;  // 公钥指数
const n = 3233n;   // 模数
const ciphertext = modPow(message, e, n);
console.log(ciphertext);  // 加密结果
```

### 高精度时间戳

纳秒级时间戳超出Number安全范围：

```javascript
// Node.js process.hrtime.bigint() 返回纳秒时间戳
const start = process.hrtime.bigint();

// 执行耗时操作
for (let i = 0; i < 1000000; i++) {
  Math.sqrt(i);
}

const end = process.hrtime.bigint();
const elapsed = end - start;

console.log(`Elapsed: ${elapsed}ns`);  // 精确到纳秒
console.log(`Elapsed: ${Number(elapsed) / 1000000}ms`);  // 转为毫秒
```

### 大数计算

科学计算、组合数学等领域：

```javascript
// 计算阶乘（BigInt避免溢出）
function factorial(n) {
  let result = 1n;
  for (let i = 2n; i <= BigInt(n); i++) {
    result *= i;
  }
  return result;
}

console.log(factorial(20));   // 2432902008176640000n
console.log(factorial(50));   // 30414093201713378043612608166064768844377641568960512000000000000n

// Number无法表示
console.log(Number(factorial(50)));  // 3.0414093201713376e+64（科学计数法，丢失精度）
```

## BigInt 的限制与陷阱

### JSON序列化问题

`BigInt`不支持JSON标准序列化：

```javascript
const big = 123456789012345678901234567890n;

// 错误：BigInt无法序列化
// JSON.stringify({ value: big });  // TypeError

// 解决方案1：转为字符串
JSON.stringify({ value: big.toString() });  // '{"value":"123456789012345678901234567890"}'

// 解决方案2：自定义 toJSON
BigInt.prototype.toJSON = function() {
  return this.toString();
};
JSON.stringify({ value: big });  // '{"value":"123456789012345678901234567890"}'
```

### 数学函数不支持

`Math`对象的方法不支持`BigInt`：

```javascript
// 错误：Math函数不接受BigInt
// Math.sqrt(16n);  // TypeError
// Math.max(10n, 20n);  // TypeError

// 解决方案：转为Number（可能丢失精度）
Math.sqrt(Number(16n));  // 4

// 或使用第三方库（如 big-integer）
```

### 位运算的不同行为

`BigInt`的位运算在负数上行为不同（使用二进制补码，位数无限）：

```javascript
// Number：32位有符号整数位运算
console.log(-1 >> 1);   // -1（符号位扩展）

// BigInt：任意位数补码
console.log(-1n >> 1n);  // -1n（符号位无限扩展）
console.log(-5n >> 1n);  // -3n
```

## 本章小结

`BigInt`通过多精度算术实现了JavaScript中任意精度整数运算能力，解决了Number类型在大整数场景下的精度限制问题：

1. **多精度表示**：`JSBigInt`对象使用`digit`数组存储大整数，每个digit为32位或64位，通过小端序排列支持任意长度整数。

2. **算术实现**：加减法通过逐digit运算和进位处理实现O(n)复杂度；乘法使用长乘法或Karatsuba算法，复杂度O(n²)到O(n^1.585)；除法最复杂，采用长除法或Barrett约减。

3. **性能权衡**：`BigInt`运算比Number慢5-10倍（小整数），内存开销大（堆对象），但在超出安全整数范围时是唯一精确选择。TurboFan对简单`BigInt`运算有优化支持。

4. **应用场景**：金融计算（分为单位的精确运算）、密码学（大整数模幂）、高精度时间戳（纳秒级）、科学计算（阶乘等大数运算）。

5. **限制与陷阱**：不支持JSON序列化（需转字符串）、不兼容Math函数、位运算行为不同、与Number严格分离需显式转换。

理解`BigInt`的底层实现后,你可以在需要大整数精确运算的场景中自信地使用它，同时注意性能开销和类型转换陷阱。下一章我们将探讨ES6类与继承的底层转换机制。

### 思考题

1. 为什么V8不为`BigInt`提供类似Smi的优化（小BigInt直接存储在指针中）？这样做有什么技术难点？

2. 实现一个`BigIntFraction`类表示分数（分子/分母都是`BigInt`），支持加减乘除四则运算，并自动约分到最简形式。

3. `BigInt`的除法运算为什么比加法慢得多？能否设计一个场景，通过算法优化减少除法次数来提升性能？
