# 实战：2 的幂

判断一个数是否是 2 的幂。

---

## 问题描述

**LeetCode 231. Power of Two**

给你一个整数 n，请你判断该整数是否是 2 的幂次方。

**示例**：
```
输入：n = 16
输出：true (2^4 = 16)

输入：n = 3
输出：false
```

---

## 2 的幂的特点

2 的幂在二进制中只有一个 1：

```
1  = 0001
2  = 0010
4  = 0100
8  = 1000
16 = 10000
```

---

## 解法一：n & (n-1)

如果只有一个 1，`n & (n-1)` 会把它清除变成 0：

```javascript
function isPowerOfTwo(n) {
  return n > 0 && (n & (n - 1)) === 0;
}
```

---

## 解法二：n & (-n)

如果只有一个 1，`n & (-n)` 等于 n 本身：

```javascript
function isPowerOfTwo(n) {
  return n > 0 && (n & -n) === n;
}
```

---

## 原理解析

```
n   = 8 = 1000
n-1 = 7 = 0111
n & (n-1) = 0000 ✓

n   = 6 = 0110
n-1 = 5 = 0101
n & (n-1) = 0100 ≠ 0 ✗
```

---

## 为什么要 n > 0？

- n = 0 时，`n & (n-1) = 0`，但 0 不是 2 的幂
- n < 0 时，二进制表示不同

---

## 两种方法对比

| 方法 | 表达式 | 原理 |
|------|--------|------|
| n & (n-1) | `n > 0 && (n & (n-1)) === 0` | 消除唯一的 1 后变成 0 |
| n & (-n) | `n > 0 && (n & -n) === n` | 提取最低位的 1，如果等于 n 说明只有一个 1 |

```javascript
// 方法一：n & (n-1) 消除最低位的 1
function isPowerOfTwo(n) {
  return n > 0 && (n & (n - 1)) === 0;
}

// 方法二：n & (-n) 提取最低位的 1
function isPowerOfTwo(n) {
  return n > 0 && (n & -n) === n;
}
```

---

## 边界情况

```javascript
// n = 0
isPowerOfTwo(0);   // false（0 不是 2 的幂）

// n = 1 = 2^0
isPowerOfTwo(1);   // true

// 负数
isPowerOfTwo(-1);  // false
isPowerOfTwo(-16); // false

// 最大 2 的幂（32位有符号）
isPowerOfTwo(1073741824);  // true (2^30)

// 边界值
isPowerOfTwo(2147483647);  // false (2^31 - 1)
```

---

## 常见错误

### 错误一：忘记判断 n > 0

```javascript
// 错误：0 & -1 = 0，会误判为 true
function isPowerOfTwo(n) {
  return (n & (n - 1)) === 0;
}

// 正确：
function isPowerOfTwo(n) {
  return n > 0 && (n & (n - 1)) === 0;
}
```

### 错误二：用循环除 2

```javascript
// 可行但效率低
function isPowerOfTwo(n) {
  if (n <= 0) return false;
  while (n > 1) {
    if (n % 2 !== 0) return false;
    n /= 2;
  }
  return true;
}
```

时间复杂度 O(log n)，位运算是 O(1)。

---

## 扩展：判断 4 的幂

4 的幂是 2 的幂，且 1 只能在奇数位（0, 2, 4...）：

```javascript
function isPowerOfFour(n) {
  // 是 2 的幂 且 1 在奇数位
  return n > 0 
    && (n & (n - 1)) === 0 
    && (n & 0x55555555) !== 0;
}
// 0x55555555 = 01010101...，标记奇数位
```

---

## 相关题目

| 题目 | 难度 | 关键点 |
|------|------|--------|
| 231. 2的幂 | 简单 | 本题 |
| 342. 4的幂 | 简单 | 额外检查位置 |
| 191. 位1的个数 | 简单 | n & (n-1) 技巧 |
| 338. 比特位计数 | 简单 | 动态规划 + 位运算 |

---

## 总结

1. **核心技巧**：`n & (n-1)` 消除最低位的 1
2. **2 的幂特征**：二进制只有一个 1
3. **边界检查**：必须判断 n > 0
4. **时间复杂度**：位运算 O(1)，循环 O(log n)
