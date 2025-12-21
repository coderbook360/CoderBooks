# 实战:Pow(x, n) - 快速幂算法

计算 x 的 n 次幂看似简单,但如果直接循环相乘 n 次,效率会非常低。快速幂算法利用递归和分治思想,将时间复杂度从 O(n) 降到 O(log n),是递归优化的经典案例。

📎 [LeetCode 50. Pow(x, n)](https://leetcode.cn/problems/powx-n/)

---

## 题目描述

实现 `pow(x, n)`,计算 x 的 n 次幂。

**示例**:

```
输入: x = 2.0, n = 10
输出: 1024.0

输入: x = 2.0, n = -2
输出: 0.25
解释: 2^(-2) = 1/(2^2) = 1/4 = 0.25

输入: x = 2.0, n = 0
输出: 1.0
```

**约束**:
- -100.0 < x < 100.0
- -2^31 <= n <= 2^31 - 1
- n 是整数
- -10^4 <= x^n <= 10^4

---

## 思路分析

### 暴力法:循环相乘

**思路**:x 乘以自己 n 次。

```typescript
function powBruteForce(x: number, n: number): number {
  if (n < 0) {
    x = 1 / x;
    n = -n;
  }
  
  let result = 1;
  for (let i = 0; i < n; i++) {
    result *= x;
  }
  return result;
}
```

**问题**:
- 时间复杂度 O(n)
- n = 2^31 - 1 时需要计算 20 亿次,会超时

### 优化思路:快速幂(分治)

**核心洞察**:利用幂的性质分治计算。

```
x^n = x^(n/2) * x^(n/2)           (n 是偶数)
    = x^(n/2) * x^(n/2) * x       (n 是奇数)

示例:2^10
= 2^5 * 2^5
= (2^2 * 2^2 * 2) * (2^2 * 2^2 * 2)
= ((2 * 2) * (2 * 2) * 2) * ((2 * 2) * (2 * 2) * 2)

递归次数:log₂(10) ≈ 3.3
```

**关键优势**:每次递归,问题规模减半,O(n) → O(log n)。

---

## 解法一:递归快速幂

### 代码实现

```typescript
/**
 * 递归快速幂
 * 时间复杂度:O(log n) - 递归深度
 * 空间复杂度:O(log n) - 递归栈
 */
function myPow(x: number, n: number): number {
  // 处理负指数
  if (n < 0) {
    x = 1 / x;
    n = -n;
  }
  
  return fastPow(x, n);
}

/**
 * 快速幂核心递归函数
 */
function fastPow(x: number, n: number): number {
  // 1. 终止条件:x^0 = 1
  if (n === 0) {
    return 1;
  }
  
  // 2. 递归计算 x^(n/2)
  const half = fastPow(x, Math.floor(n / 2));
  
  // 3. 合并结果
  if (n % 2 === 0) {
    // n 是偶数:x^n = half * half
    return half * half;
  } else {
    // n 是奇数:x^n = half * half * x
    return half * half * x;
  }
}
```

### 递归过程详解

以 `x = 2, n = 10` 为例:

```
fastPow(2, 10)
├─ fastPow(2, 5)                    计算 2^5
│  ├─ fastPow(2, 2)                 计算 2^2
│  │  ├─ fastPow(2, 1)              计算 2^1
│  │  │  ├─ fastPow(2, 0)           返回 1
│  │  │  └─ 1 * 1 * 2 = 2           奇数分支
│  │  └─ 2 * 2 = 4                  偶数分支
│  └─ 4 * 4 * 2 = 32                奇数分支
└─ 32 * 32 = 1024                   偶数分支

递归深度:⌊log₂(10)⌋ + 1 = 4
乘法次数:4 次(而不是 10 次)
```

**关键理解**:
- 每次递归只计算一次 `fastPow(x, n/2)`
- 通过 `half * half` 复用结果,避免重复计算
- 奇数时额外乘一个 x

---

## 解法二:迭代快速幂(位运算优化)

### 思路

**核心思想**:将指数 n 表示为二进制,利用二进制位进行计算。

```
示例:2^13
13 的二进制:1101
2^13 = 2^8 * 2^4 * 2^1
     = 2^(2^3) * 2^(2^2) * 2^(2^0)

从右往左扫描二进制位:
bit 0 (1): result *= 2^1 = 2
bit 1 (0): 跳过
bit 2 (1): result *= 2^4 = 2 * 16 = 32
bit 3 (1): result *= 2^8 = 32 * 256 = 8192
```

### 代码实现

```typescript
/**
 * 迭代快速幂(位运算)
 * 时间复杂度:O(log n)
 * 空间复杂度:O(1) ⭐ 比递归省空间
 */
function myPowIterative(x: number, n: number): number {
  // 处理负指数
  if (n < 0) {
    x = 1 / x;
    n = -n;
  }
  
  let result = 1;
  let currentProduct = x;  // 当前的 x^(2^i)
  
  while (n > 0) {
    // 如果当前二进制位是 1,乘到结果中
    if (n % 2 === 1) {
      result *= currentProduct;
    }
    
    // 准备下一位:x^(2^i) → x^(2^(i+1))
    currentProduct *= currentProduct;
    
    // 右移一位(除以 2)
    n = Math.floor(n / 2);
  }
  
  return result;
}
```

### 迭代过程详解

以 `x = 2, n = 13` 为例:

```
n = 13 = 1101₂

初始:result = 1, currentProduct = 2

迭代 1:n = 13 (二进制末位 1)
  result *= 2           → result = 2
  currentProduct = 2*2  → currentProduct = 4
  n = 6

迭代 2:n = 6 (二进制末位 0)
  跳过
  currentProduct = 4*4  → currentProduct = 16
  n = 3

迭代 3:n = 3 (二进制末位 1)
  result *= 16          → result = 2 * 16 = 32
  currentProduct = 16*16 → currentProduct = 256
  n = 1

迭代 4:n = 1 (二进制末位 1)
  result *= 256         → result = 32 * 256 = 8192
  currentProduct = 256*256
  n = 0

返回 result = 8192
验证:2^13 = 8192 ✓
```

---

## 边界情况处理

### 1. 负指数

```typescript
// n < 0 时,x^n = 1 / x^(-n)
if (n < 0) {
  x = 1 / x;
  n = -n;
}
```

### 2. 指数为 0

```typescript
// x^0 = 1(包括 0^0 = 1)
if (n === 0) {
  return 1;
}
```

### 3. 底数为 0

```typescript
// 0^n = 0 (n > 0)
// 0^0 通常定义为 1
if (x === 0) {
  return n > 0 ? 0 : 1;
}
```

### 4. 最小负数溢出

```typescript
// JavaScript 的整数范围:-(2^53) 到 2^53
// n = -2^31 时,-n 会溢出
// 解决:先转换 x,再取绝对值
if (n === -2147483648) {
  // 2^31 = 2 * 2^30
  return myPow(x * x, 1073741824);  // n / 2
}
```

---

## 解法对比

| 解法 | 时间复杂度 | 空间复杂度 | 优势 | 劣势 |
|-----|-----------|-----------|------|------|
| 暴力循环 | O(n) | O(1) | 简单直观 | n 大时超时 |
| 递归快速幂 | O(log n) | O(log n) | 代码简洁,易理解 | 递归栈开销 |
| 迭代快速幂 | O(log n) | O(1) | 空间效率最高 | 位运算稍难理解 |

**实际应用**:
- **递归快速幂**:面试首选,代码清晰
- **迭代快速幂**:生产环境首选,无栈溢出风险

---

## 扩展:矩阵快速幂

### 问题

快速计算斐波那契数列的第 n 项(LeetCode 509)。

### 思路

利用矩阵乘法:

```
[F(n+1)]   [1 1]^n   [1]
[F(n)  ] = [1 0]   * [0]
```

### 代码实现

```typescript
/**
 * 矩阵快速幂求斐波那契数
 * 时间复杂度:O(log n)
 */
function fib(n: number): number {
  if (n <= 1) return n;
  
  // 矩阵 [[1, 1], [1, 0]]
  const base = [[1, 1], [1, 0]];
  const result = matrixPow(base, n - 1);
  
  return result[0][0];
}

function matrixPow(matrix: number[][], n: number): number[][] {
  if (n === 1) return matrix;
  
  const half = matrixPow(matrix, Math.floor(n / 2));
  const squared = matrixMultiply(half, half);
  
  return n % 2 === 0 ? squared : matrixMultiply(squared, matrix);
}

function matrixMultiply(a: number[][], b: number[][]): number[][] {
  const m = a.length, n = b[0].length, p = b.length;
  const result = Array.from({ length: m }, () => new Array(n).fill(0));
  
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      for (let k = 0; k < p; k++) {
        result[i][j] += a[i][k] * b[k][j];
      }
    }
  }
  
  return result;
}
```

---

## 易错点

### 1. 负指数处理不当

```typescript
// ❌ 错误:直接对负数递归
function myPowWrong(x: number, n: number): number {
  if (n === 0) return 1;
  const half = myPow(x, Math.floor(n / 2));
  return n % 2 === 0 ? half * half : half * half * x;
}

// n = -2 时会无限递归
```

### 2. 重复计算 x^(n/2)

```typescript
// ❌ 错误:计算了两次递归
function fastPowWrong(x: number, n: number): number {
  if (n === 0) return 1;
  
  if (n % 2 === 0) {
    // 错误:调用了两次 fastPow
    return fastPow(x, n / 2) * fastPow(x, n / 2);
  } else {
    return fastPow(x, (n - 1) / 2) * fastPow(x, (n - 1) / 2) * x;
  }
}

// 时间复杂度退化为 O(n)
```

### 3. 整数除法精度问题

```typescript
// ❌ 错误:JavaScript 中 n/2 是浮点数
const half = fastPow(x, n / 2);  // n=5 时,n/2=2.5

// ✓ 正确:使用 Math.floor
const half = fastPow(x, Math.floor(n / 2));
```

---

## 相关题目

| 题目 | 难度 | 说明 |
|-----|------|------|
| [50. Pow(x, n)](https://leetcode.cn/problems/powx-n/) | 中等 | 本题 |
| [372. 超级次方](https://leetcode.cn/problems/super-pow/) | 中等 | 大整数快速幂 |
| [69. x 的平方根](https://leetcode.cn/problems/sqrtx/) | 简单 | 二分查找变体 |
| [509. 斐波那契数](https://leetcode.cn/problems/fibonacci-number/) | 简单 | 矩阵快速幂应用 |

---

## 举一反三

快速幂算法教会我们:

1. **分治思想的威力**:
   - 问题规模每次减半
   - O(n) → O(log n) 的巨大提升
   - 递归深度 = ⌊log₂ n⌋ + 1

2. **位运算的妙用**:
   - 指数的二进制表示
   - `n % 2` → `n & 1`
   - `Math.floor(n/2)` → `n >> 1`

3. **避免重复计算**:
   - ❌ `fastPow(x, n/2) * fastPow(x, n/2)`
   - ✓ `const half = fastPow(x, n/2); return half * half;`

4. **递归与迭代的权衡**:
   - 递归:代码简洁,但有栈开销
   - 迭代:空间 O(1),更高效

5. **快速幂的扩展**:
   - 矩阵快速幂:求斐波那契、矩阵连乘
   - 大整数快速幂:模幂运算(RSA 加密)
   - 快速乘法:高精度乘法优化

---

## 本章小结

快速幂算法是递归优化的经典案例:
- **核心思想**:分治 + 二进制拆分
- **时间复杂度**:O(log n),远优于暴力 O(n)
- **递归解法**:简洁易懂,面试首选
- **迭代解法**:空间 O(1),生产首选
- **扩展应用**:矩阵快速幂、大整数幂、模幂运算

掌握这道题,你就理解了分治思想如何将线性复杂度降到对数级别。

---

## 练习

1. 实现迭代快速幂,使用位运算优化(`&` 和 `>>`)
2. 用矩阵快速幂求斐波那契数列第 100 项
3. 实现大整数快速幂取模:`(a^b) % m`(LeetCode 372)
4. 比较递归和迭代快速幂的性能(n = 10^9)
