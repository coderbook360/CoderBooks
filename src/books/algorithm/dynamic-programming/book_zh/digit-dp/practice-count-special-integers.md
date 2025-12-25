# 统计特殊整数

## 题目描述

**LeetCode 2376. Count Special Integers**

如果一个正整数每一位都是不同的数字，则称之为特殊整数。

给你一个正整数 `n`，返回区间 `[1, n]` 之间的特殊整数的数目。

**示例 1**：
```
输入：n = 20
输出：19
解释：1~20 中，除了 11 以外都是特殊整数。
```

**示例 2**：
```
输入：n = 5
输出：5
解释：1~5 都是特殊整数。
```

**示例 3**：
```
输入：n = 135
输出：110
```

**约束**：
- `1 <= n <= 2 × 10^9`

## 思路分析

"数位各不相同"意味着：
- 每个数字 0-9 最多出现一次
- 用一个集合（或位掩码）记录已使用的数字

这是数位 DP 的经典应用：
- 状态：已使用的数字集合
- 限制：不能重复使用

## 解法一：数位 DP（记忆化搜索）

```typescript
function countSpecialNumbers(n: number): number {
  const s = String(n);
  const len = s.length;
  const digits = s.split('').map(Number);
  
  // memo[pos][mask] = 从 pos 开始，已用数字集合为 mask 的方案数
  // mask 是 10 位二进制，第 i 位为 1 表示数字 i 已使用
  const memo: Map<string, number> = new Map();
  
  function dfs(
    pos: number,
    mask: number,     // 已使用的数字集合
    tight: boolean,
    started: boolean  // 是否已开始填数字
  ): number {
    // 终止条件
    if (pos === len) {
      return started ? 1 : 0;
    }
    
    // 记忆化
    const key = `${pos},${mask},${started}`;
    if (!tight && memo.has(key)) {
      return memo.get(key)!;
    }
    
    let result = 0;
    
    // 如果还没开始，可以跳过当前位（填前导零）
    if (!started) {
      result += dfs(pos + 1, mask, false, false);
    }
    
    // 枚举当前位
    const limit = tight ? digits[pos] : 9;
    const start = started ? 0 : 1;  // 如果未开始，从 1 开始（跳过前导零）
    
    for (let d = start; d <= limit; d++) {
      // 检查数字是否已使用
      if ((mask >> d) & 1) continue;
      
      const newMask = mask | (1 << d);
      const newTight = tight && (d === limit);
      
      result += dfs(pos + 1, newMask, newTight, true);
    }
    
    // 记忆化存储
    if (!tight) {
      memo.set(key, result);
    }
    
    return result;
  }
  
  return dfs(0, 0, true, false);
}
```

**复杂度分析**：
- 时间：O(log n × 2^10 × 10) = O(log n × 10240)
- 空间：O(log n × 2^10)

## 解法二：排列计数 + 数位 DP

利用排列数学加速计算。

```typescript
function countSpecialNumbers(n: number): number {
  const s = String(n);
  const len = s.length;
  const digits = s.split('').map(Number);
  
  // A(n, k) = n! / (n-k)! 排列数
  function A(n: number, k: number): number {
    let result = 1;
    for (let i = 0; i < k; i++) {
      result *= (n - i);
    }
    return result;
  }
  
  let count = 0;
  
  // Part 1: 位数 < len 的特殊整数
  for (let i = 1; i < len; i++) {
    // 第一位：9 种选择（1-9）
    // 后续 i-1 位：从剩余 9 个数字中选 i-1 个排列
    count += 9 * A(9, i - 1);
  }
  
  // Part 2: 位数 = len 的特殊整数
  const used: boolean[] = Array(10).fill(false);
  
  for (let i = 0; i < len; i++) {
    const d = digits[i];
    
    // 当前位填 < d 的数字
    for (let x = (i === 0 ? 1 : 0); x < d; x++) {
      if (used[x]) continue;
      
      // 后续 len - i - 1 位：从剩余 9 - i 个数字中选
      count += A(9 - i, len - i - 1);
    }
    
    // 如果 d 已使用，不能继续
    if (used[d]) break;
    
    // 标记 d 已使用
    used[d] = true;
    
    // 如果到最后一位，n 本身也是特殊整数
    if (i === len - 1) count++;
  }
  
  return count;
}
```

**图解**：以 `n = 135` 为例

```
Part 1: 位数 < 3
- 1 位数：9 种（1~9）
- 2 位数：9 × 9 = 81 种（首位 1-9，第二位 0-9 中不同于首位）

Part 2: 位数 = 3
- 第 0 位（百位）：
  - 填 0：不行（不能有前导零）
  - 填 1：继续
  
- 第 1 位（十位），百位已填 1：
  - 填 0：后面 1 位从 {2~9} 选 = 8 种
  - 填 1：已用，跳过
  - 填 2：后面 1 位从 {0,3~9} 选 = 8 种
  - 填 3：继续
  
- 第 2 位（个位），已用 1,3：
  - 填 0,2,4：3 种
  - 填 5：等于 d，计入 n 本身
  
总计：9 + 81 + 0 + 8 + 8 + 3 + 1 = 110
```

**复杂度分析**：
- 时间：O(log n × 10)
- 空间：O(1)

## 解法三：位运算优化

使用位运算简化集合操作。

```typescript
function countSpecialNumbers(n: number): number {
  const s = String(n);
  const len = s.length;
  const digits = s.split('').map(Number);
  
  // 预计算排列数 A[i] = A(9, i) 和 B[i] = A(10, i)
  const A: number[] = [1];
  const B: number[] = [1];
  for (let i = 1; i <= 10; i++) {
    A.push(A[i - 1] * (10 - i));  // A[i] = 9 × 8 × ... × (10-i)
    B.push(B[i - 1] * (11 - i));  // B[i] = 10 × 9 × ... × (11-i)
  }
  
  let count = 0;
  
  // Part 1: 位数 < len
  for (let i = 1; i < len; i++) {
    count += 9 * A[i - 1];
  }
  
  // Part 2: 位数 = len
  let mask = 0;  // 已使用数字的位掩码
  
  for (let i = 0; i < len; i++) {
    const d = digits[i];
    const usedCount = popcount(mask);  // 已使用的数字个数
    const remaining = len - i - 1;     // 剩余位数
    
    // 统计 [0, d) 中未使用的数字
    for (let x = (i === 0 ? 1 : 0); x < d; x++) {
      if (!((mask >> x) & 1)) {
        // 后续位从 9 - usedCount 个数字中选 remaining 个排列
        count += permutation(9 - usedCount, remaining);
      }
    }
    
    // 如果 d 已使用，终止
    if ((mask >> d) & 1) break;
    
    // 标记 d 已使用
    mask |= (1 << d);
    
    // 到达最后一位
    if (i === len - 1) count++;
  }
  
  return count;
}

function popcount(x: number): number {
  let count = 0;
  while (x) {
    count += x & 1;
    x >>= 1;
  }
  return count;
}

function permutation(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  let result = 1;
  for (let i = 0; i < k; i++) {
    result *= (n - i);
  }
  return result;
}
```

## 边界情况

1. **n 是个位数**：直接返回 n
2. **n 有重复数字**：如 `n = 112`，处理时会提前终止
3. **n = 10^9**：最大 10 位，不会超过 10 个不同数字

## 相关题目

| 题目 | 难度 | 说明 |
|------|------|------|
| [357. 统计各位数字都不同的数字个数](https://leetcode.cn/problems/count-numbers-with-unique-digits/) | 中等 | 本题简化版 |
| [1012. 至少有 1 位重复的数字](https://leetcode.cn/problems/numbers-with-repeated-digits/) | 困难 | 本题取反 |
| [902. 最大为 N 的数字组合](https://leetcode.cn/problems/numbers-at-most-n-given-digit-set/) | 困难 | 限定数字集合 |

## 总结

这道题的核心：

1. **状态设计**：用位掩码表示已使用数字集合
2. **分类统计**：位数 < n 和位数 = n 分别处理
3. **排列计数**：利用排列数加速计算

两种方法对比：

| 方法 | 时间 | 空间 | 特点 |
|------|------|------|------|
| 记忆化搜索 | O(log n × 2^10) | O(log n × 2^10) | 通用模板 |
| 排列计数 | O(log n × 10) | O(1) | 更高效 |

关键洞见：
- 数字最多 10 位，最多使用 10 个不同数字
- 利用排列数学，避免枚举所有状态
- 位掩码是表示集合的利器
