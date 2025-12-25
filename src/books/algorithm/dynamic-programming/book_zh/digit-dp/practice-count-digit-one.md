# 数字 1 的个数

## 题目描述

**LeetCode 233. Number of Digit One**

给定一个整数 `n`，计算所有小于等于 `n` 的非负整数中数字 1 出现的次数。

**示例 1**：
```
输入：n = 13
输出：6
解释：数字 1 出现在 1, 10, 11, 12, 13 中，共 6 次
```

**示例 2**：
```
输入：n = 0
输出：0
```

**约束**：
- `0 <= n <= 10^9`

## 思路分析

### 暴力思路

```typescript
function bruteForce(n: number): number {
  let count = 0;
  for (let i = 1; i <= n; i++) {
    let num = i;
    while (num > 0) {
      if (num % 10 === 1) count++;
      num = Math.floor(num / 10);
    }
  }
  return count;
}
```

时间复杂度 O(n log n)，对于 n = 10^9 太慢。

### 数位 DP 思路

按位统计每个位置上 1 出现的次数。

状态设计：
- `pos`：当前处理到第几位
- `count`：已经累计的 1 的个数
- `tight`：是否受上界限制
- `lead`：是否有前导零

## 解法一：记忆化搜索

```typescript
function countDigitOne(n: number): number {
  if (n <= 0) return 0;
  
  const digits = String(n).split('').map(Number);
  const len = digits.length;
  
  // memo[pos][count] = 从 pos 开始，已有 count 个 1 的总计数
  // 由于 count 最多 10（10位数），状态空间很小
  const memo: number[][] = Array.from(
    { length: len },
    () => Array(len + 1).fill(-1)
  );
  
  function dfs(
    pos: number,
    count: number,
    tight: boolean,
    lead: boolean
  ): number {
    // 终止：返回累计的 1 的个数
    if (pos === len) return count;
    
    // 记忆化查询
    if (!tight && !lead && memo[pos][count] !== -1) {
      return memo[pos][count];
    }
    
    const limit = tight ? digits[pos] : 9;
    let result = 0;
    
    for (let d = 0; d <= limit; d++) {
      const newTight = tight && (d === limit);
      const newLead = lead && (d === 0);
      // 非前导零的 1 才计入
      const newCount = count + ((!newLead && d === 1) ? 1 : 0);
      
      result += dfs(pos + 1, newCount, newTight, newLead);
    }
    
    if (!tight && !lead) {
      memo[pos][count] = result;
    }
    
    return result;
  }
  
  return dfs(0, 0, true, true);
}
```

**复杂度分析**：
- 时间：O(log n × log n × 10) = O(log² n)
- 空间：O(log n × log n)

## 解法二：数学方法

逐位分析每个位置上 1 出现的次数。

考虑数字 `n`，对于第 `i` 位（从右往左，0 开始）：
- 设该位左边的数为 `left`
- 该位为 `cur`
- 该位右边的数为 `right`
- 该位的权值为 `base = 10^i`

三种情况：
1. `cur == 0`：第 i 位为 1 的次数 = `left × base`
2. `cur == 1`：第 i 位为 1 的次数 = `left × base + right + 1`
3. `cur > 1`：第 i 位为 1 的次数 = `(left + 1) × base`

```typescript
function countDigitOne(n: number): number {
  if (n <= 0) return 0;
  
  let count = 0;
  let base = 1;  // 当前位的权值
  
  while (base <= n) {
    // 分解当前位
    const left = Math.floor(n / (base * 10));
    const cur = Math.floor(n / base) % 10;
    const right = n % base;
    
    if (cur === 0) {
      count += left * base;
    } else if (cur === 1) {
      count += left * base + right + 1;
    } else {
      count += (left + 1) * base;
    }
    
    base *= 10;
  }
  
  return count;
}
```

**图解**：以 `n = 1234` 为例，分析百位（`i = 2`）

```
n = 1234
百位 cur = 2

left = 12  (百位左边)
cur = 2    (百位)
right = 34 (百位右边)
base = 100

因为 cur > 1：
百位为 1 的数有：0100~0199, 0200 × 不对，0100~0199, 1100~1199
共 (left + 1) × base = 13 × 100 = 1300 个
```

**复杂度分析**：
- 时间：O(log n)
- 空间：O(1)

## 解法三：优化的数位 DP

另一种 DP 视角：统计每个位置贡献的 1 的个数。

```typescript
function countDigitOne(n: number): number {
  if (n <= 0) return 0;
  
  const s = String(n);
  const len = s.length;
  
  // dp[i][j] = i 位数中，包含 j 个 1 的数有多少个
  // 预处理组合数
  const comb: number[][] = Array.from(
    { length: len + 1 },
    () => Array(len + 1).fill(0)
  );
  for (let i = 0; i <= len; i++) {
    comb[i][0] = 1;
    for (let j = 1; j <= i; j++) {
      comb[i][j] = comb[i - 1][j - 1] + comb[i - 1][j];
    }
  }
  
  let result = 0;
  let onesAbove = 0;  // 高位中 1 的个数
  
  for (let i = 0; i < len; i++) {
    const d = parseInt(s[i]);
    const remaining = len - i - 1;
    
    // 情况 1：当前位填 0 ~ (d-1)
    for (let x = 0; x < d; x++) {
      // 高位贡献
      result += onesAbove * Math.pow(10, remaining);
      
      // 当前位贡献
      if (x === 1) {
        result += Math.pow(10, remaining);
      }
      
      // 低位贡献
      for (let j = 0; j <= remaining; j++) {
        result += j * comb[remaining][j] * Math.pow(9, remaining - j);
      }
    }
    
    if (d === 1) onesAbove++;
  }
  
  // 别忘了 n 本身
  result += onesAbove;
  
  return result;
}
```

这个解法较复杂，实践中推荐使用解法二的数学方法。

## 相关题目

| 题目 | 难度 | 说明 |
|------|------|------|
| [172. 阶乘后的零](https://leetcode.cn/problems/factorial-trailing-zeroes/) | 中等 | 数学分析 |
| [400. 第 N 位数字](https://leetcode.cn/problems/nth-digit/) | 中等 | 数位分析 |
| [1067. 范围内的数字计数](https://leetcode.cn/problems/digit-count-in-range/) | 困难 | 本题扩展 |

## 总结

三种解法对比：

| 方法 | 时间复杂度 | 空间复杂度 | 适用性 |
|------|-----------|-----------|--------|
| 暴力 | O(n log n) | O(1) | 小规模 |
| 数学 | O(log n) | O(1) | 最优 |
| 数位 DP | O(log² n) | O(log² n) | 通用模板 |

对于这道特定题目，数学方法最优。但数位 DP 模板更通用，适用于各类数位计数问题。

核心洞见：
- 按位拆分，分析每一位的贡献
- 利用高位/当前位/低位的关系
- 数位 DP 提供通用框架
