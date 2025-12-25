# 旋转数字

## 题目描述

**LeetCode 788. Rotated Digits**

我们称一个数 `X` 为好数，如果它的每位数字逐个地被旋转 180 度后，可以得到一个有效的不同的数。

每位数字旋转后的变化规则：
- 0, 1, 8 旋转后还是自己
- 2, 5 互相旋转
- 6, 9 互相旋转
- 3, 4, 7 旋转后无效

如果 `X` 的所有数字都有效，且旋转后与原数不同，则 `X` 是好数。

给定正整数 `n`，返回 `[1, n]` 中好数的个数。

**示例**：
```
输入：n = 10
输出：4
解释：
1 → 1（相同，不算）
2 → 5（不同，算）
3 → 无效
4 → 无效
5 → 2（不同，算）
6 → 9（不同，算）
7 → 无效
8 → 8（相同，不算）
9 → 6（不同，算）
10 → 01（不同，算）
好数：2, 5, 6, 9，共 4 个
```

**约束**：
- `1 <= n <= 10^4`

## 思路分析

好数的条件：
1. 每位数字都是 0, 1, 2, 5, 6, 8, 9 之一
2. 至少有一位是 2, 5, 6, 9（保证旋转后不同）

## 解法一：暴力枚举

n ≤ 10^4，直接枚举每个数判断。

```typescript
function rotatedDigits(n: number): number {
  let count = 0;
  
  for (let i = 1; i <= n; i++) {
    if (isGood(i)) count++;
  }
  
  return count;
}

function isGood(num: number): boolean {
  let valid = true;
  let different = false;
  
  while (num > 0) {
    const d = num % 10;
    num = Math.floor(num / 10);
    
    if (d === 3 || d === 4 || d === 7) {
      valid = false;
      break;
    }
    if (d === 2 || d === 5 || d === 6 || d === 9) {
      different = true;
    }
  }
  
  return valid && different;
}
```

**复杂度分析**：
- 时间：O(n log n)
- 空间：O(1)

## 解法二：数位 DP

用数位 DP 可以处理更大的 n。

状态设计：
- `pos`：当前位置
- `hasDiff`：是否包含 2, 5, 6, 9
- `tight`：是否受上界限制
- `started`：是否已开始填数字

```typescript
function rotatedDigits(n: number): number {
  const s = String(n);
  const len = s.length;
  const digits = s.split('').map(Number);
  
  // 有效数字
  const valid = new Set([0, 1, 2, 5, 6, 8, 9]);
  // 会变化的数字
  const changing = new Set([2, 5, 6, 9]);
  
  // memo[pos][hasDiff] = 方案数
  const memo: number[][] = Array.from(
    { length: len },
    () => Array(2).fill(-1)
  );
  
  function dfs(
    pos: number,
    hasDiff: boolean,
    tight: boolean,
    started: boolean
  ): number {
    if (pos === len) {
      return (started && hasDiff) ? 1 : 0;
    }
    
    const diffFlag = hasDiff ? 1 : 0;
    if (!tight && started && memo[pos][diffFlag] !== -1) {
      return memo[pos][diffFlag];
    }
    
    let result = 0;
    
    // 跳过当前位（前导零）
    if (!started) {
      result += dfs(pos + 1, false, false, false);
    }
    
    const limit = tight ? digits[pos] : 9;
    const start = started ? 0 : 1;
    
    for (let d = start; d <= limit; d++) {
      if (!valid.has(d)) continue;
      
      const newDiff = hasDiff || changing.has(d);
      const newTight = tight && (d === limit);
      
      result += dfs(pos + 1, newDiff, newTight, true);
    }
    
    if (!tight && started) {
      memo[pos][diffFlag] = result;
    }
    
    return result;
  }
  
  return dfs(0, false, true, false);
}
```

**复杂度分析**：
- 时间：O(log n × 2 × 7) = O(log n)
- 空间：O(log n)

## 解法三：递推 DP

自底向上的思路：

```typescript
function rotatedDigits(n: number): number {
  // dp[i] 表示数字 i 的状态：
  // 0 = 无效（含 3, 4, 7）
  // 1 = 有效但不变（只含 0, 1, 8）
  // 2 = 有效且会变（含 2, 5, 6, 9）
  const dp: number[] = Array(n + 1).fill(0);
  
  let count = 0;
  
  for (let i = 0; i <= n; i++) {
    if (i < 10) {
      // 个位数直接判断
      if (i === 0 || i === 1 || i === 8) {
        dp[i] = 1;
      } else if (i === 2 || i === 5 || i === 6 || i === 9) {
        dp[i] = 2;
        count++;
      }
    } else {
      // 多位数：分解为高位部分和最后一位
      const last = i % 10;
      const rest = Math.floor(i / 10);
      
      if (dp[rest] === 0) {
        dp[i] = 0;  // 高位无效
      } else if (last === 3 || last === 4 || last === 7) {
        dp[i] = 0;  // 最后一位无效
      } else if (dp[rest] === 2 || last === 2 || last === 5 || last === 6 || last === 9) {
        dp[i] = 2;  // 有变化的数字
        count++;
      } else {
        dp[i] = 1;  // 有效但不变
      }
    }
  }
  
  return count;
}
```

**复杂度分析**：
- 时间：O(n)
- 空间：O(n)

## 解法四：位运算优化

用位掩码表示数字状态。

```typescript
function rotatedDigits(n: number): number {
  // 状态编码：
  // 0 = 无效
  // 1 = 有效不变 (0, 1, 8)
  // 2 = 有效会变 (2, 5, 6, 9)
  const digitState: number[] = [1, 1, 2, 0, 0, 2, 2, 0, 1, 2];
  
  let count = 0;
  
  for (let i = 1; i <= n; i++) {
    let num = i;
    let state = 1;  // 初始：有效不变
    
    while (num > 0 && state > 0) {
      const d = num % 10;
      const ds = digitState[d];
      
      if (ds === 0) {
        state = 0;  // 无效
      } else if (ds === 2) {
        state = 2;  // 会变
      }
      
      num = Math.floor(num / 10);
    }
    
    if (state === 2) count++;
  }
  
  return count;
}
```

## 不同解法对比

| 解法 | 时间 | 空间 | 适用范围 |
|------|------|------|---------|
| 暴力 | O(n log n) | O(1) | n ≤ 10^6 |
| 数位 DP | O(log n) | O(log n) | 任意 n |
| 递推 DP | O(n) | O(n) | n ≤ 10^7 |
| 位运算 | O(n log n) | O(1) | n ≤ 10^6 |

## 相关题目

| 题目 | 难度 | 说明 |
|------|------|------|
| [233. 数字 1 的个数](https://leetcode.cn/problems/number-of-digit-one/) | 困难 | 数位计数 |
| [902. 最大为 N 的数字组合](https://leetcode.cn/problems/numbers-at-most-n-given-digit-set/) | 困难 | 限定数字 |
| [1067. 范围内的数字计数](https://leetcode.cn/problems/digit-count-in-range/) | 困难 | 范围统计 |

## 总结

这道题考查：

1. **数字分类**：
   - 无效：3, 4, 7
   - 有效不变：0, 1, 8
   - 有效会变：2, 5, 6, 9

2. **好数条件**：
   - 所有数字有效
   - 至少一个会变

3. **解法选择**：
   - n 较小：暴力或递推
   - n 很大：数位 DP

核心洞见：
- 状态只有 3 种（无效/不变/会变）
- 可以用简单的状态机处理
- 数位 DP 是通用解法，但不是最简解法
