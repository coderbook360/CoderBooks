# 最大为 N 的数字组合

## 题目描述

**LeetCode 902. Numbers At Most N Given Digit Set**

给定一个按非递减顺序排列的数字数组 `digits`，你可以用任意次数写出数字。

返回可以生成的小于或等于给定整数 `n` 的正整数的个数。

**示例 1**：
```
输入：digits = ["1","3","5","7"], n = 100
输出：20
解释：
可写出的 20 个数字是：
1, 3, 5, 7,
11, 13, 15, 17, 31, 33, 35, 37, 51, 53, 55, 57, 71, 73, 75, 77
```

**示例 2**：
```
输入：digits = ["1","4","9"], n = 1000000000
输出：29523
```

**示例 3**：
```
输入：digits = ["7"], n = 8
输出：1
```

**约束**：
- `1 <= digits.length <= 9`
- `digits[i].length == 1`
- `digits[i]` 是 `'1'` 到 `'9'` 之间的数字
- `digits` 中的值互不相同，按非递减顺序排列
- `1 <= n <= 10^9`

## 思路分析

这是一道典型的数位 DP 问题：
- 只能使用给定的数字
- 计算 [1, n] 范围内的合法数

特点：
- 没有前导零问题（digits 不含 0）
- 需要统计位数 < len(n) 的所有数

## 解法一：数学 + 数位 DP

分两部分统计：
1. 位数 < len(n) 的数：直接用组合数学
2. 位数 = len(n) 的数：用数位 DP

```typescript
function atMostNGivenDigitSet(digits: string[], n: number): number {
  const ds = digits.map(Number);
  const k = ds.length;  // 可选数字个数
  const s = String(n);
  const len = s.length;
  
  let count = 0;
  
  // Part 1: 位数 < len 的数
  // 1 位数：k 种
  // 2 位数：k^2 种
  // ...
  // (len-1) 位数：k^(len-1) 种
  for (let i = 1; i < len; i++) {
    count += Math.pow(k, i);
  }
  
  // Part 2: 位数 = len 的数（数位 DP）
  // 从高位到低位，考虑每一位的选择
  const nDigits = s.split('').map(Number);
  
  for (let i = 0; i < len; i++) {
    const d = nDigits[i];
    
    // 当前位可以填的比 d 小的数字个数
    let smaller = 0;
    for (const x of ds) {
      if (x < d) smaller++;
    }
    
    // 如果当前位填 < d 的数字
    // 后面 (len - i - 1) 位可以任意填
    count += smaller * Math.pow(k, len - i - 1);
    
    // 如果 d 不在 digits 中，不能继续
    if (!ds.includes(d)) break;
    
    // 如果到了最后一位，且 d 在 digits 中，计入 n 本身
    if (i === len - 1) count++;
  }
  
  return count;
}
```

**复杂度分析**：
- 时间：O(log n × k)
- 空间：O(log n)

## 解法二：标准数位 DP

使用记忆化搜索的标准模板。

```typescript
function atMostNGivenDigitSet(digits: string[], n: number): number {
  const ds = digits.map(Number);
  const s = String(n);
  const len = s.length;
  const nDigits = s.split('').map(Number);
  
  // memo[pos] = 从 pos 开始，非 tight 时的方案数
  const memo: number[] = Array(len).fill(-1);
  
  function dfs(pos: number, tight: boolean, started: boolean): number {
    // 终止条件
    if (pos === len) {
      return started ? 1 : 0;  // 必须已经开始（非空）
    }
    
    // 记忆化
    if (!tight && started && memo[pos] !== -1) {
      return memo[pos];
    }
    
    let result = 0;
    
    // 如果还没开始，可以选择继续不填（跳过当前位）
    if (!started) {
      result += dfs(pos + 1, false, false);
    }
    
    // 枚举当前位填什么
    const limit = tight ? nDigits[pos] : 9;
    for (const d of ds) {
      if (d > limit) break;  // digits 已排序
      
      const newTight = tight && (d === limit);
      result += dfs(pos + 1, newTight, true);
    }
    
    // 记忆化存储
    if (!tight && started) {
      memo[pos] = result;
    }
    
    return result;
  }
  
  return dfs(0, true, false);
}
```

**解释**：

- `started`：是否已经填过数字
  - `started = false`：还没填，可以选择跳过当前位
  - `started = true`：已经开始填数字

这里 `started` 的作用类似于 `leadingZero`，但更适合"不含 0"的情况。

## 解法三：动态规划

自底向上的 DP。

```typescript
function atMostNGivenDigitSet(digits: string[], n: number): number {
  const ds = digits.map(Number);
  const k = ds.length;
  const s = String(n);
  const len = s.length;
  const nDigits = s.split('').map(Number);
  
  // dp[i] = 考虑后 i 位，等于后 i 位数字的方案数
  // 初始：dp[0] = 1（空串）
  const dp: number[] = Array(len + 1).fill(0);
  dp[0] = 1;
  
  // 从低位到高位
  for (let i = 1; i <= len; i++) {
    const d = nDigits[len - i];  // 当前位数字
    
    // 情况 1：当前位填 < d 的数字，后面任意
    let smaller = 0;
    for (const x of ds) {
      if (x < d) smaller++;
    }
    
    // 情况 2：当前位填 = d 的数字，后面受限
    const equal = ds.includes(d) ? 1 : 0;
    
    dp[i] = smaller * Math.pow(k, i - 1) + equal * dp[i - 1];
  }
  
  // 加上位数 < len 的数
  let result = dp[len];
  for (let i = 1; i < len; i++) {
    result += Math.pow(k, i);
  }
  
  return result;
}
```

## 边界情况

1. **n 是个位数**：直接统计 digits 中 <= n 的数
2. **digits 只有一个元素**：只能构成 1, 11, 111, ...
3. **digits 包含所有数字 1-9**：几乎所有正整数都合法

## 相关题目

| 题目 | 难度 | 说明 |
|------|------|------|
| [233. 数字 1 的个数](https://leetcode.cn/problems/number-of-digit-one/) | 困难 | 计数特定数字 |
| [600. 不含连续1的非负整数](https://leetcode.cn/problems/non-negative-integers-without-consecutive-ones/) | 困难 | 约束条件不同 |
| [1012. 至少有 1 位重复的数字](https://leetcode.cn/problems/numbers-with-repeated-digits/) | 困难 | 排列计数 |

## 总结

这道题的关键点：

1. **分类讨论**：位数 < n 的直接计算，位数 = n 的用 DP
2. **tight 限制**：当前位是否受上界约束
3. **started 标记**：处理"跳过高位"的情况

三种解法对比：

| 方法 | 优点 | 缺点 |
|------|------|------|
| 数学 + DP | 直观，易理解 | 需要分类讨论 |
| 记忆化搜索 | 模板化，通用 | 状态稍复杂 |
| 自底向上 DP | 空间效率高 | 需要倒序思考 |

核心洞见：
- 数位 DP 的本质是"按位枚举 + 限制传递"
- 不同于常规 DP，这里"开始"状态也需要处理
