# 实战：斐波那契数列

斐波那契数列是递归思维的经典训练题。它简单、优雅，但也暴露了递归的性能问题。通过这道题，我们将学习如何优化递归，以及递归与动态规划的联系。

📎 [LeetCode 509. 斐波那契数](https://leetcode.cn/problems/fibonacci-number/)

---

## 题目描述

斐波那契数列的定义如下：

```
F(0) = 0
F(1) = 1
F(n) = F(n-1) + F(n-2)  (n >= 2)
```

给定 `n`，计算 `F(n)`。

**示例**：

```
输入: n = 4
输出: 3
解释: F(4) = F(3) + F(2) = 2 + 1 = 3
```

**约束**：
- 0 <= n <= 30

---

## 思路分析

### 这道题在考什么？

1. 递归的基本应用
2. 递归的性能问题
3. 从递归到动态规划的优化

### 解法演进

我们将展示 5 种解法，从朴素递归到最优解，理解优化的每一步。

---

## 解法一：朴素递归

### 思路

直接按照数学定义实现。

### 代码实现

```typescript
/**
 * 朴素递归
 * 时间复杂度：O(2^n) - 指数级！
 * 空间复杂度：O(n) - 递归栈深度
 */
function fib(n: number): number {
  // 基础情况
  if (n === 0) return 0;
  if (n === 1) return 1;
  
  // 递归关系
  return fib(n - 1) + fib(n - 2);
}
```

### 问题分析

**为什么时间复杂度是 O(2^n)？**

```
fib(5) 的递归树：

                 fib(5)
              /          \
         fib(4)          fib(3)
        /      \        /      \
    fib(3)  fib(2)  fib(2)  fib(1)
   /    \   /   \   /   \
fib(2) f(1) f(1) f(0) f(1) f(0)
/   \
f(1) f(0)

fib(3) 被计算了 2 次
fib(2) 被计算了 3 次
fib(1) 被计算了 5 次
fib(0) 被计算了 3 次
```

**重复计算是性能杀手**。计算 fib(40) 需要约 20 亿次函数调用！

---

## 解法二：记忆化递归（自顶向下）

### 思路

用哈希表缓存计算结果，避免重复计算。

### 代码实现

```typescript
/**
 * 记忆化递归
 * 时间复杂度：O(n) - 每个子问题只计算一次
 * 空间复杂度：O(n) - 递归栈 + 缓存空间
 */
function fib(n: number, memo: Map<number, number> = new Map()): number {
  // 基础情况
  if (n === 0) return 0;
  if (n === 1) return 1;
  
  // 查找缓存
  if (memo.has(n)) {
    return memo.get(n)!;
  }
  
  // 计算并缓存
  const result = fib(n - 1, memo) + fib(n - 2, memo);
  memo.set(n, result);
  return result;
}
```

### 优化效果

```
记忆化后的调用过程（n=5）：

fib(5)
├─ fib(4) [计算]
│  ├─ fib(3) [计算]
│  │  ├─ fib(2) [计算]
│  │  │  ├─ fib(1) = 1
│  │  │  └─ fib(0) = 0
│  │  └─ fib(1) = 1
│  └─ fib(2) [命中缓存] = 1
└─ fib(3) [命中缓存] = 2

每个 fib(i) 只计算一次！
时间从 O(2^n) 降到 O(n)
```

---

## 解法三：动态规划（自底向上）

### 思路

从 F(0) 和 F(1) 开始，逐步计算到 F(n)，避免递归。

### 代码实现

```typescript
/**
 * 动态规划（数组版本）
 * 时间复杂度：O(n)
 * 空间复杂度：O(n) - dp 数组
 */
function fib(n: number): number {
  if (n === 0) return 0;
  if (n === 1) return 1;
  
  // dp[i] 表示 F(i)
  const dp: number[] = new Array(n + 1);
  dp[0] = 0;
  dp[1] = 1;
  
  // 从小到大计算
  for (let i = 2; i <= n; i++) {
    dp[i] = dp[i - 1] + dp[i - 2];
  }
  
  return dp[n];
}
```

### 计算过程

```
n = 5 的计算过程：

dp[0] = 0
dp[1] = 1
dp[2] = dp[1] + dp[0] = 1 + 0 = 1
dp[3] = dp[2] + dp[1] = 1 + 1 = 2
dp[4] = dp[3] + dp[2] = 2 + 1 = 3
dp[5] = dp[4] + dp[3] = 3 + 2 = 5
```

---

## 解法四：空间优化的动态规划

### 思路

注意到 `dp[i]` 只依赖 `dp[i-1]` 和 `dp[i-2]`，不需要保存整个数组。

### 代码实现

```typescript
/**
 * 空间优化的动态规划
 * 时间复杂度：O(n)
 * 空间复杂度：O(1) - 只用两个变量
 */
function fib(n: number): number {
  if (n === 0) return 0;
  if (n === 1) return 1;
  
  let prev = 0;   // F(i-2)
  let curr = 1;   // F(i-1)
  
  for (let i = 2; i <= n; i++) {
    const next = prev + curr;  // F(i)
    prev = curr;
    curr = next;
  }
  
  return curr;
}
```

### 优化思路

```
变量状态变化（n=5）：

初始: prev=0, curr=1

i=2: next=0+1=1,  prev=1, curr=1
i=3: next=1+1=2,  prev=1, curr=2
i=4: next=1+2=3,  prev=2, curr=3
i=5: next=2+3=5,  prev=3, curr=5

返回 curr = 5
```

**这是最优解**：时间 O(n)，空间 O(1)。

---

## 解法五：矩阵快速幂（进阶）

### 思路

斐波那契数列可以用矩阵表示：

```
[F(n)  ]   [1 1]^(n-1)   [1]
[F(n-1)]  =[1 0]       × [0]
```

用快速幂计算矩阵幂，时间复杂度 O(log n)。

### 代码实现

```typescript
/**
 * 矩阵快速幂
 * 时间复杂度：O(log n)
 * 空间复杂度：O(1)
 */
function fib(n: number): number {
  if (n === 0) return 0;
  if (n === 1) return 1;
  
  // 矩阵 [[1,1],[1,0]] 的 (n-1) 次幂
  const base = [[1, 1], [1, 0]];
  const result = matrixPower(base, n - 1);
  
  return result[0][0];
}

function matrixPower(matrix: number[][], n: number): number[][] {
  let result = [[1, 0], [0, 1]];  // 单位矩阵
  let base = matrix;
  
  while (n > 0) {
    if (n % 2 === 1) {
      result = matrixMultiply(result, base);
    }
    base = matrixMultiply(base, base);
    n = Math.floor(n / 2);
  }
  
  return result;
}

function matrixMultiply(a: number[][], b: number[][]): number[][] {
  return [
    [a[0][0] * b[0][0] + a[0][1] * b[1][0], a[0][0] * b[0][1] + a[0][1] * b[1][1]],
    [a[1][0] * b[0][0] + a[1][1] * b[1][0], a[1][0] * b[0][1] + a[1][1] * b[1][1]]
  ];
}
```

---

## 复杂度对比

| 解法 | 时间复杂度 | 空间复杂度 | 适用场景 |
|-----|-----------|-----------|---------|
| 朴素递归 | O(2^n) | O(n) | ❌ 仅用于理解 |
| 记忆化递归 | O(n) | O(n) | ✅ 简洁，适合小规模 |
| DP 数组 | O(n) | O(n) | ✅ 清晰，易于理解 |
| DP 优化 | O(n) | O(1) | ✅ 最优解（n <= 10^6） |
| 矩阵快速幂 | O(log n) | O(1) | ✅ n 很大时（10^9） |

---

## 易错点

### 1. 忘记缓存

```typescript
// ❌ 错误：计算后忘记缓存
function fib(n: number, memo: Map<number, number>): number {
  if (n <= 1) return n;
  if (memo.has(n)) return memo.get(n)!;
  
  const result = fib(n - 1, memo) + fib(n - 2, memo);
  // 忘记 memo.set(n, result)
  return result;
}
```

### 2. 边界条件处理不当

```typescript
// ❌ 错误：没有处理 n=0
function fib(n: number): number {
  if (n === 1) return 1;  // 缺少 n=0 的处理
  return fib(n - 1) + fib(n - 2);
}

fib(0);  // 错误结果
```

### 3. 滚动变量更新顺序错误

```typescript
// ❌ 错误：更新顺序错误
for (let i = 2; i <= n; i++) {
  prev = curr;           // 错误：curr 已被覆盖
  curr = prev + curr;
}

// ✅ 正确：先保存 next
for (let i = 2; i <= n; i++) {
  const next = prev + curr;
  prev = curr;
  curr = next;
}
```

---

## 相关题目

| 题目 | 难度 | 说明 |
|-----|------|------|
| [70. 爬楼梯](https://leetcode.cn/problems/climbing-stairs/) | 简单 | 完全相同的递推关系 |
| [1137. 第 N 个泰波那契数](https://leetcode.cn/problems/n-th-tribonacci-number/) | 简单 | F(n) = F(n-1) + F(n-2) + F(n-3) |
| [剑指 Offer 10-I. 斐波那契数列](https://leetcode.cn/problems/fei-bo-na-qi-shu-lie-lcof/) | 简单 | 需要取模 1e9+7 |

---

## 举一反三

斐波那契数列教会我们：

1. **从递归到 DP 的优化路径**：
   - 朴素递归 → 记忆化（消除重复计算）
   - 记忆化 → 自底向上 DP（消除递归开销）
   - DP 数组 → 滚动变量（优化空间）

2. **递归优化的通用方法**：
   - 发现重复子问题 → 记忆化
   - 找到递推关系 → 动态规划
   - 降维优化 → 滚动数组/变量

3. **复杂度权衡**：
   - 时间换空间：记忆化
   - 空间换简洁：数组 DP
   - 最优平衡：滚动变量

---

## 本章小结

斐波那契数列是递归思维的绝佳训练：
- 递归定义简洁
- 暴露了递归的性能问题
- 展示了从递归到 DP 的优化路径

掌握这道题的多种解法，你就理解了递归优化的核心思想，为后续的动态规划打下了基础。
