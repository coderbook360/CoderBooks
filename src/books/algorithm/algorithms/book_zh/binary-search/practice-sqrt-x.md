# 实战：x 的平方根

> LeetCode 69. x 的平方根 | 难度：简单

二分查找求数值解的入门题，展示了二分在连续值域上的应用。

---

## 题目描述

给你一个非负整数 `x`，计算并返回 `x` 的**算术平方根**。

由于返回类型是整数，结果只保留**整数部分**，小数部分将被舍去。

**注意**：不允许使用任何内置指数函数和算符，例如 `pow(x, 0.5)` 或 `x ** 0.5`。

**示例**：
```
输入：x = 4
输出：2

输入：x = 8
输出：2
解释：8 的算术平方根是 2.82842...，返回整数部分 2
```

---

## 思路分析

**问题转化**：找最大的整数 n，使得 `n² <= x`。

这是一个典型的"找右边界"问题：在 `[0, x]` 中找最后一个满足 `n² <= x` 的 n。

```
x = 8
n:    0  1  2  3  4  5  ...
n²:   0  1  4  9  16 25 ...
<=8:  ✓  ✓  ✓  ✗  ✗  ✗
               ↑
          最后一个满足条件
```

---

## 代码实现

### 方法一：标准二分（left <= right）

```typescript
function mySqrt(x: number): number {
  if (x < 2) return x;  // 0 和 1 直接返回
  
  let left = 1;
  let right = Math.floor(x / 2);  // 优化：sqrt(x) <= x/2（当 x >= 4）
  
  while (left <= right) {
    const mid = left + Math.floor((right - left) / 2);
    const square = mid * mid;
    
    if (square === x) {
      return mid;  // 完美平方数
    } else if (square < x) {
      left = mid + 1;  // mid 可能是答案，但尝试更大的
    } else {
      right = mid - 1;  // mid 太大，排除
    }
  }
  
  return right;  // 最后一个满足 mid² <= x 的值
}
```

### 方法二：避免溢出的写法

```typescript
function mySqrt(x: number): number {
  if (x < 2) return x;
  
  let left = 1;
  let right = Math.floor(x / 2);
  
  while (left <= right) {
    const mid = left + Math.floor((right - left) / 2);
    
    // 使用除法避免乘法溢出
    if (mid === Math.floor(x / mid)) {
      // 需要再检查是否正好相等
      if (mid * mid === x) return mid;
      // mid² < x，但 (mid+1)² > x
      if (mid < x / mid) left = mid + 1;
      else right = mid - 1;
    } else if (mid < x / mid) {
      left = mid + 1;
    } else {
      right = mid - 1;
    }
  }
  
  return right;
}

// 更简洁的写法
function mySqrt(x: number): number {
  if (x < 2) return x;
  
  let left = 1;
  let right = x;
  
  while (left <= right) {
    const mid = left + Math.floor((right - left) / 2);
    
    if (mid <= x / mid) {
      left = mid + 1;
    } else {
      right = mid - 1;
    }
  }
  
  return right;
}
```

---

## 执行过程可视化

```
x = 8

初始：left=1, right=4（因为 x/2=4）

第1轮：mid=2
       2² = 4 < 8
       left = 3

第2轮：mid=3
       3² = 9 > 8
       right = 2

left=3 > right=2，循环结束
返回 right = 2 ✓
```

```
x = 16（完美平方数）

初始：left=1, right=8

第1轮：mid=4
       4² = 16 === x
       直接返回 4 ✓
```

---

## 为什么返回 right？

循环结束时，`left = right + 1`：

- `right` 是最后一个满足 `mid² <= x` 的值
- `left` 是第一个满足 `mid² > x` 的值

```
搜索过程：
              left          right
               ↓              ↓
... [满足] [满足] [满足] | [不满足] [不满足] ...
                         ↑
                       临界点

循环结束时 left 在临界点右边，right 在左边
所以 right 是最后一个满足条件的值
```

---

## 边界情况分析

| x | 分析 | 结果 |
|---|------|------|
| 0 | sqrt(0) = 0 | 0 |
| 1 | sqrt(1) = 1 | 1 |
| 2 | 1² = 1 < 2 < 4 = 2² | 1 |
| 4 | 2² = 4 | 2 |

**为什么 right 初始化为 x/2？**

对于 x >= 4，sqrt(x) <= x/2：
- sqrt(4) = 2 = 4/2 ✓
- sqrt(16) = 4 < 16/2 = 8 ✓
- sqrt(100) = 10 < 100/2 = 50 ✓

所以可以缩小搜索范围。

---

## 牛顿迭代法（扩展）

除了二分，还可以用牛顿迭代法：

```typescript
function mySqrt(x: number): number {
  if (x < 2) return x;
  
  let guess = x;
  
  while (guess > x / guess) {
    guess = Math.floor((guess + x / guess) / 2);
  }
  
  return guess;
}
```

**原理**：
- 求 f(n) = n² - x = 0 的根
- 迭代公式：n_new = (n + x/n) / 2
- 收敛速度：O(log log x)，比二分更快

---

## 复杂度分析

**二分法**：
- 时间：O(log x)
- 空间：O(1)

**牛顿迭代**：
- 时间：O(log log x)
- 空间：O(1)

---

## 常见错误

**错误1：溢出问题**
```typescript
// 在某些语言中可能溢出
const square = mid * mid;  // ⚠️ 当 mid 很大时

// 安全写法
if (mid <= x / mid)  // ✅ 使用除法
```

**错误2：边界处理不当**
```typescript
// 错误：忘记处理 0 和 1
// 当 x=1 时，right = 1/2 = 0，搜索区间为空

// 正确
if (x < 2) return x;  // ✅
```

**错误3：返回错误的指针**
```typescript
// 错误：返回 left
return left;  // ❌ left 是第一个 mid² > x 的值

// 正确
return right;  // ✅ right 是最后一个 mid² <= x 的值
```

---

## 相关题目

| 题目 | 难度 | 说明 |
|-----|------|------|
| [367. 有效的完全平方数](https://leetcode.com/problems/valid-perfect-square/) | 简单 | 判断是否完全平方 |
| [50. Pow(x, n)](https://leetcode.com/problems/powx-n/) | 中等 | 快速幂 |
| [372. 超级次方](https://leetcode.com/problems/super-pow/) | 中等 | 大数幂运算 |

---

## 二分求值的通用模式

本题展示了二分在"求值"问题上的应用：

```typescript
// 找最大的 x 使得 check(x) 为 true
function findMax(range: number): number {
  let left = MIN;
  let right = MAX;
  
  while (left <= right) {
    const mid = left + Math.floor((right - left) / 2);
    
    if (check(mid)) {
      left = mid + 1;  // mid 满足，尝试更大的
    } else {
      right = mid - 1;  // mid 不满足，排除
    }
  }
  
  return right;  // 最后一个满足条件的值
}
```

---

## 总结

x 的平方根核心要点：

1. **问题转化**：找最大的 n 使得 n² <= x
2. **右边界问题**：返回最后一个满足条件的值
3. **溢出预防**：用除法替代乘法
4. **边界处理**：x < 2 直接返回
5. **返回 right**：循环结束时 right 是答案

- **时间复杂度**：O(log x)
- **空间复杂度**：O(1)
