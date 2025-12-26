# 实战：统计特殊数字

## 题目描述

给你一个正整数 `n`，统计在 `[1, n]` 范围内，有多少个整数的各位数字都不重复（即"特殊数字"）。

📎 [LeetCode 2376. 统计特殊整数](https://leetcode.cn/problems/count-special-integers/)

**示例**：

```
输入：n = 20
输出：19
解释：[1, 20] 中除了 11 以外，所有整数都是特殊数字

输入：n = 5
输出：5
解释：[1, 5] 都是特殊数字

输入：n = 135
输出：110
```

**约束条件**：
- `1 <= n <= 2 × 10^9`

## 问题分析

首先要问：这道题的核心难点是什么？

我们要统计 [1, n] 范围内**各位数字都不重复**的数。

**暴力方法**：逐个检查每个数，时间复杂度 O(n × log n)，n 最大 2×10^9，会超时。

**数位 DP 思路**：按位构造数字，用状态记录已使用的数字，避免重复统计。

## 数位 DP 框架

### 核心思想

**从高位到低位逐位构造数字**，在构造过程中：
1. 记录**是否受上界限制**（limit）
2. 记录**是否已开始填数字**（started，用于处理前导零）
3. 记录**已使用的数字集合**（mask，用状态压缩）

### 状态定义

```typescript
// dfs(pos, mask, limit, started)
// pos: 当前填第几位
// mask: 已使用的数字（位掩码）
// limit: 当前是否受上界限制
// started: 是否已开始填非零数字
```

### 代码实现

```typescript
/**
 * 数位 DP + 状态压缩
 * 时间复杂度：O(log n × 2^10 × 10)
 * 空间复杂度：O(log n × 2^10)
 */
function countSpecialNumbers(n: number): number {
  const digits = String(n).split('').map(Number);
  const len = digits.length;
  
  // memo[pos][mask] = 从 pos 开始，已用数字为 mask 时的方案数
  // limit 和 started 为 true 时不缓存（状态数太少）
  const memo = new Map<string, number>();
  
  function dfs(
    pos: number,    // 当前位置
    mask: number,   // 已使用的数字（位掩码）
    limit: boolean, // 是否受上界限制
    started: boolean // 是否已开始填数字
  ): number {
    // 填完所有位
    if (pos === len) {
      // 只有已开始的才算有效数字
      return started ? 1 : 0;
    }
    
    // 记忆化：只缓存无限制且已开始的状态
    const key = `${pos},${mask}`;
    if (!limit && started && memo.has(key)) {
      return memo.get(key)!;
    }
    
    let result = 0;
    
    // 当前位可填的上界
    const up = limit ? digits[pos] : 9;
    
    // 枚举当前位填什么数字
    for (let d = 0; d <= up; d++) {
      // 处理前导零
      if (!started && d === 0) {
        // 继续不填（跳过前导零）
        result += dfs(pos + 1, mask, false, false);
      } else {
        // 检查数字是否已使用
        if (mask & (1 << d)) continue;
        
        // 填入数字 d
        result += dfs(
          pos + 1,
          mask | (1 << d),      // 标记 d 已使用
          limit && d === up,    // 更新限制
          true                  // 已开始
        );
      }
    }
    
    // 缓存结果
    if (!limit && started) {
      memo.set(key, result);
    }
    
    return result;
  }
  
  return dfs(0, 0, true, false);
}
```

## 逻辑详解

### 为什么需要 started？

考虑 n = 135，我们要统计：
- 1 位数：1-9（9个）
- 2 位数：10-99 中的特殊数（81个）
- 3 位数：100-135 中的特殊数

当我们构造"1位数"时，第一位和第二位是"0"（前导零），第三位才是有效数字。

`started` 用来区分"前导零"和"真正的0"。

### 为什么用位掩码？

数字只有 0-9 共 10 个，用 10 位二进制即可表示哪些数字已使用：
- `mask = 0b0000000010` 表示 1 已使用
- `mask = 0b0000000101` 表示 0 和 2 已使用

### limit 的作用

假设 n = 135：
- 第一位可填 0 或 1
- 如果第一位填 1，第二位只能填 0-3（受限）
- 如果第一位填 0，第二位可填 0-9（不受限）

`limit` 记录当前是否受上界约束。

## 优化：组合数学预计算

对于**不受限**且**已开始**的情况，可以用组合数直接计算：

```typescript
function countSpecialNumbers(n: number): number {
  const digits = String(n).split('').map(Number);
  const len = digits.length;
  
  // 阶乘表
  const factorial = [1];
  for (let i = 1; i <= 10; i++) {
    factorial[i] = factorial[i - 1] * i;
  }
  
  // A(n, k) = n! / (n-k)!
  const A = (n: number, k: number): number => {
    if (k > n || k < 0) return 0;
    return factorial[n] / factorial[n - k];
  };
  
  let result = 0;
  
  // 1. 统计位数小于 len 的特殊数
  for (let d = 1; d < len; d++) {
    // d 位数，首位 1-9，剩余 d-1 位从剩余 9 个数字中选
    result += 9 * A(9, d - 1);
  }
  
  // 2. 统计位数等于 len 且不超过 n 的特殊数
  let mask = 0;  // 已使用的数字
  
  for (let i = 0; i < len; i++) {
    const up = digits[i];
    
    // 枚举当前位填的数字 d (< up)
    for (let d = (i === 0 ? 1 : 0); d < up; d++) {
      if (mask & (1 << d)) continue;
      
      // 剩余位数可以任意填（从未使用的数字中选）
      const remaining = len - i - 1;
      const available = 10 - i - 1;  // 剩余可用数字
      
      result += A(available, remaining);
    }
    
    // 检查当前位能否填 up
    if (mask & (1 << up)) break;
    mask |= (1 << up);
    
    // 如果填完所有位且合法
    if (i === len - 1) {
      result++;
    }
  }
  
  return result;
}
```

## 通用数位 DP 模板

```typescript
function digitDP(n: number): number {
  const digits = String(n).split('').map(Number);
  const len = digits.length;
  const memo = new Map<string, number>();
  
  /**
   * @param pos 当前位置
   * @param state 自定义状态（如已用数字掩码）
   * @param limit 是否受上界限制
   * @param started 是否已开始填数字
   */
  function dfs(
    pos: number,
    state: number,
    limit: boolean,
    started: boolean
  ): number {
    if (pos === len) {
      return /* 终止条件判断 */;
    }
    
    const key = `${pos},${state},${limit},${started}`;
    if (memo.has(key)) return memo.get(key)!;
    
    const up = limit ? digits[pos] : 9;
    let result = 0;
    
    for (let d = 0; d <= up; d++) {
      if (!started && d === 0) {
        // 前导零处理
        result += dfs(pos + 1, state, false, false);
      } else {
        // 状态转移
        const newState = /* 更新状态 */;
        result += dfs(
          pos + 1,
          newState,
          limit && d === up,
          true
        );
      }
    }
    
    memo.set(key, result);
    return result;
  }
  
  return dfs(0, 0, true, false);
}
```

## 复杂度分析

| 方法 | 时间复杂度 | 空间复杂度 |
|------|-----------|-----------|
| 暴力枚举 | O(n × log n) | O(log n) |
| 数位 DP | O(10 × 2^10 × log n) | O(2^10 × log n) |
| 组合优化 | O(10 × log n) | O(1) |

**为什么数位 DP 高效？**
- 状态数：log n × 2^10 ≈ 10 × 1024 ≈ 10000
- 每个状态转移 O(10)
- 总计约 10^5 次操作，远小于 2×10^9

## 相关题目

| 题目 | 核心技巧 |
|------|----------|
| [233. 数字 1 的个数](https://leetcode.cn/problems/number-of-digit-one/) | 统计特定数字出现次数 |
| [600. 不含连续 1 的非负整数](https://leetcode.cn/problems/non-negative-integers-without-consecutive-ones/) | 相邻位约束 |
| [902. 最大为 N 的数字组合](https://leetcode.cn/problems/numbers-at-most-n-given-digit-set/) | 限定数字集 |
| [1012. 至少有 1 位重复的数字](https://leetcode.cn/problems/numbers-with-repeated-digits/) | 本题的补集 |

## 总结

本题是数位 DP + 状态压缩的经典结合：

**核心思路**：
1. 从高位到低位逐位构造
2. 用 mask 记录已使用的数字
3. 用 limit 处理上界约束
4. 用 started 处理前导零

**关键技巧**：
- **记忆化**：缓存无限制状态，避免重复计算
- **前导零**：单独处理，不记入已使用数字
- **状态压缩**：10 个数字用 10 位二进制表示

**适用场景**：
- 统计满足某种数位条件的数的个数
- 数位之间有约束关系
- n 很大（无法枚举），但位数有限
