# 实战：爬楼梯

爬楼梯是斐波那契数列的变形，也是动态规划的入门题。通过这道题，你将发现看似不同的问题，本质上可能是相同的数学模型。

📎 [LeetCode 70. 爬楼梯](https://leetcode.cn/problems/climbing-stairs/)

---

## 题目描述

假设你正在爬楼梯。需要 `n` 阶你才能到达楼顶。

每次你可以爬 `1` 或 `2` 个台阶。有多少种不同的方法可以爬到楼顶？

**示例**：

```
输入: n = 3
输出: 3
解释: 有三种方法可以爬到楼顶：
1. 1 阶 + 1 阶 + 1 阶
2. 1 阶 + 2 阶
3. 2 阶 + 1 阶
```

**约束**：
- 1 <= n <= 45

---

## 思路分析

### 这道题在考什么？

1. 问题建模：将实际问题转化为递归/动态规划问题
2. 找到状态转移方程
3. 优化空间复杂度

### 如何建模？

**关键问题**：到达第 `n` 阶的方法数是多少？

**思考过程**：
- 到达第 `n` 阶，最后一步可能是：
  - 从第 `n-1` 阶爬 1 步
  - 从第 `n-2` 阶爬 2 步

因此：`ways(n) = ways(n-1) + ways(n-2)`

这就是**斐波那契数列**！

### 为什么是斐波那契？

```
n=1: 1种方法 (1)
n=2: 2种方法 (1+1, 2)
n=3: ways(2) + ways(1) = 2 + 1 = 3
n=4: ways(3) + ways(2) = 3 + 2 = 5
n=5: ways(4) + ways(3) = 5 + 3 = 8
...

这就是斐波那契数列：1, 2, 3, 5, 8, 13, ...
（注意：这里 F(1)=1, F(2)=2，而不是标准的 F(0)=0, F(1)=1）
```

---

## 解法一：递归（会超时）

### 代码实现

```typescript
/**
 * 朴素递归
 * 时间复杂度：O(2^n)
 * 空间复杂度：O(n) - 递归栈
 */
function climbStairs(n: number): number {
  // 基础情况
  if (n === 1) return 1;
  if (n === 2) return 2;
  
  // 递归关系：ways(n) = ways(n-1) + ways(n-2)
  return climbStairs(n - 1) + climbStairs(n - 2);
}
```

### 问题

与斐波那契相同，存在大量重复计算，时间复杂度 O(2^n)。

---

## 解法二：记忆化递归

### 代码实现

```typescript
/**
 * 记忆化递归
 * 时间复杂度：O(n)
 * 空间复杂度：O(n)
 */
function climbStairs(n: number, memo: Map<number, number> = new Map()): number {
  if (n === 1) return 1;
  if (n === 2) return 2;
  
  if (memo.has(n)) {
    return memo.get(n)!;
  }
  
  const result = climbStairs(n - 1, memo) + climbStairs(n - 2, memo);
  memo.set(n, result);
  return result;
}
```

---

## 解法三：动态规划（推荐）

### 思路

从 `n=1` 和 `n=2` 开始，逐步计算到 `n`。

### 代码实现

```typescript
/**
 * 动态规划（数组版本）
 * 时间复杂度：O(n)
 * 空间复杂度：O(n)
 */
function climbStairs(n: number): number {
  if (n === 1) return 1;
  if (n === 2) return 2;
  
  // dp[i] 表示爬到第 i 阶的方法数
  const dp: number[] = new Array(n + 1);
  dp[1] = 1;
  dp[2] = 2;
  
  for (let i = 3; i <= n; i++) {
    dp[i] = dp[i - 1] + dp[i - 2];
  }
  
  return dp[n];
}
```

### 计算过程

```
n = 5 的计算过程：

dp[1] = 1
dp[2] = 2
dp[3] = dp[2] + dp[1] = 2 + 1 = 3
dp[4] = dp[3] + dp[2] = 3 + 2 = 5
dp[5] = dp[4] + dp[3] = 5 + 3 = 8
```

---

## 解法四：空间优化（最优解）

### 思路

只需要记录前两个状态，不需要保存整个数组。

### 代码实现

```typescript
/**
 * 空间优化的动态规划
 * 时间复杂度：O(n)
 * 空间复杂度：O(1) ⭐ 最优
 */
function climbStairs(n: number): number {
  if (n === 1) return 1;
  if (n === 2) return 2;
  
  let prev = 1;   // dp[i-2]
  let curr = 2;   // dp[i-1]
  
  for (let i = 3; i <= n; i++) {
    const next = prev + curr;  // dp[i]
    prev = curr;
    curr = next;
  }
  
  return curr;
}
```

### 状态转移

```
变量状态变化（n=5）：

初始: prev=1 (dp[1]), curr=2 (dp[2])

i=3: next=1+2=3,  prev=2, curr=3
i=4: next=2+3=5,  prev=3, curr=5
i=5: next=3+5=8,  prev=5, curr=8

返回 curr = 8
```

---

## 扩展：每次可以爬 1、2 或 3 步

### 问题

如果每次可以爬 1、2 或 3 个台阶，有多少种方法？

### 分析

**状态转移方程变为**：

```
ways(n) = ways(n-1) + ways(n-2) + ways(n-3)
```

这叫做**泰波那契数列**（Tribonacci）。

### 代码实现

```typescript
function climbStairsTribonacci(n: number): number {
  if (n === 1) return 1;
  if (n === 2) return 2;
  if (n === 3) return 4;  // 1+1+1, 1+2, 2+1, 3
  
  let a = 1;  // dp[i-3]
  let b = 2;  // dp[i-2]
  let c = 4;  // dp[i-1]
  
  for (let i = 4; i <= n; i++) {
    const next = a + b + c;
    a = b;
    b = c;
    c = next;
  }
  
  return c;
}
```

---

## 扩展：不能连续爬两次 2 步

### 问题

每次可以爬 1 或 2 步，但**不能连续两次爬 2 步**，有多少种方法？

### 分析

这需要**状态定义更复杂**：

```
dp[i][0] 表示到达第 i 阶，最后一步是 1 的方法数
dp[i][1] 表示到达第 i 阶，最后一步是 2 的方法数

状态转移：
dp[i][0] = dp[i-1][0] + dp[i-1][1]  // 上一步可以是 1 或 2
dp[i][1] = dp[i-2][0]                // 上一步必须是 1
```

### 代码实现

```typescript
function climbStairsNoConsecutiveTwo(n: number): number {
  if (n === 1) return 1;
  if (n === 2) return 2;
  
  // dp[i][0] = 最后一步是 1
  // dp[i][1] = 最后一步是 2
  const dp: number[][] = Array(n + 1).fill(0).map(() => [0, 0]);
  
  dp[1][0] = 1;  // 第 1 阶，走 1 步
  dp[1][1] = 0;  // 第 1 阶，不能走 2 步
  dp[2][0] = 1;  // 第 2 阶，走 1+1
  dp[2][1] = 1;  // 第 2 阶，走 2
  
  for (let i = 3; i <= n; i++) {
    dp[i][0] = dp[i - 1][0] + dp[i - 1][1];
    dp[i][1] = dp[i - 2][0];
  }
  
  return dp[n][0] + dp[n][1];
}
```

---

## 复杂度对比

| 解法 | 时间复杂度 | 空间复杂度 | 备注 |
|-----|-----------|-----------|------|
| 朴素递归 | O(2^n) | O(n) | ❌ 超时 |
| 记忆化递归 | O(n) | O(n) | ✅ 可行 |
| DP 数组 | O(n) | O(n) | ✅ 清晰 |
| DP 优化 | O(n) | O(1) | ✅ 最优 |

---

## 易错点

### 1. 初始条件错误

```typescript
// ❌ 错误：n=1 和 n=2 的初始值不正确
function climbStairs(n: number): number {
  if (n === 1) return 0;  // 错误：应该是 1
  if (n === 2) return 1;  // 错误：应该是 2
  // ...
}
```

### 2. 滚动变量赋值顺序错误

```typescript
// ❌ 错误：先更新 prev 导致丢失原值
for (let i = 3; i <= n; i++) {
  prev = curr;           // curr 还未更新，prev 被覆盖
  curr = prev + curr;    // 使用了错误的 prev
}

// ✅ 正确：先保存 next
for (let i = 3; i <= n; i++) {
  const next = prev + curr;
  prev = curr;
  curr = next;
}
```

---

## 相关题目

| 题目 | 难度 | 说明 |
|-----|------|------|
| [509. 斐波那契数](https://leetcode.cn/problems/fibonacci-number/) | 简单 | 本质相同 |
| [746. 使用最小花费爬楼梯](https://leetcode.cn/problems/min-cost-climbing-stairs/) | 简单 | 加入成本考虑 |
| [1137. 第 N 个泰波那契数](https://leetcode.cn/problems/n-th-tribonacci-number/) | 简单 | 每次可以爬 3 步 |
| [剑指 Offer 10-II. 青蛙跳台阶问题](https://leetcode.cn/problems/qing-wa-tiao-tai-jie-wen-ti-lcof/) | 简单 | 完全相同 |

---

## 举一反三

爬楼梯问题教会我们：

1. **问题建模的重要性**：
   - 看似不同的问题，可能有相同的数学模型
   - 关键是找到状态转移方程

2. **递归到 DP 的思维转换**：
   - 递归：自顶向下，从 n 推到 1
   - DP：自底向上，从 1 推到 n

3. **空间优化的技巧**：
   - 观察状态依赖关系
   - 用滚动变量替代数组

4. **问题扩展的思路**：
   - 改变步数选择 → 改变状态转移方程
   - 增加约束条件 → 增加状态维度

---

## 本章小结

爬楼梯问题是动态规划的经典入门题：
- 容易理解：问题贴近生活
- 易于建模：状态转移方程清晰
- 可扩展性强：可以引入各种变化

掌握这道题后，你就理解了动态规划的核心思想：**找到状态转移方程，自底向上求解**。
