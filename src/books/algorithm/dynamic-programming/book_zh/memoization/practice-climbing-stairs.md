# 实战：爬楼梯

爬楼梯是另一道经典的动态规划入门题，与斐波那契数列有异曲同工之妙。

## 题目描述

假设你正在爬楼梯，需要 `n` 级台阶才能到达楼顶。每次你可以爬 `1` 或 `2` 个台阶。有多少种不同的方法可以爬到楼顶？

📎 [LeetCode 70. 爬楼梯](https://leetcode.cn/problems/climbing-stairs/)

**示例**：

```
输入：n = 3
输出：3
解释：有三种方法：
1. 1 级 + 1 级 + 1 级
2. 1 级 + 2 级
3. 2 级 + 1 级
```

**约束**：`1 <= n <= 45`

## 思路分析

### 这道题在考什么？

关键洞察：要到达第 n 级台阶，最后一步要么是从第 n-1 级爬 1 步，要么是从第 n-2 级爬 2 步。

所以：`f(n) = f(n-1) + f(n-2)`

这不就是斐波那契数列吗！只是初始条件略有不同：
- 斐波那契：`f(0) = 0, f(1) = 1`
- 爬楼梯：`f(1) = 1, f(2) = 2`

### 状态定义

- **状态**：`dp[i]` = 爬到第 i 级台阶的方法数
- **转移**：`dp[i] = dp[i-1] + dp[i-2]`
- **边界**：`dp[1] = 1, dp[2] = 2`
- **答案**：`dp[n]`

## 解法一：记忆化搜索

```typescript
/**
 * 记忆化搜索
 * 时间复杂度：O(n)
 * 空间复杂度：O(n)
 */
function climbStairs(n: number): number {
  const memo: number[] = new Array(n + 1).fill(-1);
  
  function dp(i: number): number {
    // 检查备忘录
    if (memo[i] !== -1) return memo[i];
    
    // 基本情况
    if (i <= 2) return i;
    
    // 递归计算
    memo[i] = dp(i - 1) + dp(i - 2);
    return memo[i];
  }
  
  return dp(n);
}
```

## 解法二：递推

```typescript
/**
 * 递推
 * 时间复杂度：O(n)
 * 空间复杂度：O(n)
 */
function climbStairs(n: number): number {
  if (n <= 2) return n;
  
  const dp: number[] = new Array(n + 1);
  dp[1] = 1;
  dp[2] = 2;
  
  for (let i = 3; i <= n; i++) {
    dp[i] = dp[i - 1] + dp[i - 2];
  }
  
  return dp[n];
}
```

## 解法三：递推 + 空间优化

```typescript
/**
 * 递推 + 空间优化
 * 时间复杂度：O(n)
 * 空间复杂度：O(1)
 */
function climbStairs(n: number): number {
  if (n <= 2) return n;
  
  let prev2 = 1;  // dp[i-2]
  let prev1 = 2;  // dp[i-1]
  
  for (let i = 3; i <= n; i++) {
    const curr = prev1 + prev2;
    prev2 = prev1;
    prev1 = curr;
  }
  
  return prev1;
}
```

## 复杂度分析

| 解法 | 时间复杂度 | 空间复杂度 |
|-----|-----------|-----------|
| 记忆化搜索 | O(n) | O(n) |
| 递推 | O(n) | O(n) |
| 递推 + 优化 | O(n) | O(1) |

## 变体问题

### 变体一：每次可以爬 1、2 或 3 级

```typescript
function climbStairs(n: number): number {
  if (n <= 2) return n;
  if (n === 3) return 4;
  
  const dp = new Array(n + 1);
  dp[1] = 1;
  dp[2] = 2;
  dp[3] = 4;
  
  for (let i = 4; i <= n; i++) {
    dp[i] = dp[i - 1] + dp[i - 2] + dp[i - 3];
  }
  
  return dp[n];
}
```

### 变体二：每次可以爬 1 到 k 级

```typescript
function climbStairs(n: number, k: number): number {
  const dp = new Array(n + 1).fill(0);
  dp[0] = 1;
  
  for (let i = 1; i <= n; i++) {
    for (let step = 1; step <= Math.min(i, k); step++) {
      dp[i] += dp[i - step];
    }
  }
  
  return dp[n];
}
```

### 变体三：某些台阶不能踩

```typescript
function climbStairsWithObstacles(n: number, obstacles: Set<number>): number {
  const dp = new Array(n + 1).fill(0);
  dp[0] = 1;
  
  for (let i = 1; i <= n; i++) {
    if (obstacles.has(i)) {
      dp[i] = 0;  // 这个台阶不能踩
    } else {
      dp[i] = (i >= 1 ? dp[i - 1] : 0) + (i >= 2 ? dp[i - 2] : 0);
    }
  }
  
  return dp[n];
}
```

### 变体四：最小代价爬楼梯

📎 [LeetCode 746. 使用最小花费爬楼梯](https://leetcode.cn/problems/min-cost-climbing-stairs/)

```typescript
function minCostClimbingStairs(cost: number[]): number {
  const n = cost.length;
  const dp = new Array(n + 1);
  
  dp[0] = 0;  // 站在地面不花钱
  dp[1] = 0;  // 直接跳到第一级也不花钱
  
  for (let i = 2; i <= n; i++) {
    dp[i] = Math.min(
      dp[i - 1] + cost[i - 1],
      dp[i - 2] + cost[i - 2]
    );
  }
  
  return dp[n];
}
```

## 本章小结

1. **爬楼梯本质是斐波那契**：`f(n) = f(n-1) + f(n-2)`
2. **状态定义**：`dp[i]` = 到达第 i 级的方法数
3. **空间优化**：只依赖前两个状态，可以用两个变量
4. **变体丰富**：改变步长、加障碍、加代价等

**关键技巧**：
- "最后一步"分析法：到达当前位置的最后一步是什么？
- 从简单情况开始推导递推公式
