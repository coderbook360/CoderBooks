# 实战：奇怪的打印机

## 题目描述

有台奇怪的打印机有以下两个特殊要求：

1. 打印机每次只能打印由**同一个字符**组成的序列
2. 每次可以在从起始到结束的任意位置打印新字符，并且会覆盖掉原来已有的字符

给你一个字符串 `s`，返回将它打印出来需要的**最少打印次数**。

📎 [LeetCode 664. 奇怪的打印机](https://leetcode.cn/problems/strange-printer/)

**示例**：

```
输入：s = "aaabbb"
输出：2
解释：首先打印 "aaa" 然后打印 "bbb"

输入：s = "aba"
输出：2
解释：首先打印 "aaa" 然后打印 "b"（覆盖中间位置）
```

## 问题分析

关键观察：如果 `s[i] === s[j]`，打印 `[i, j]` 时可以一次性把两端打印好，剩下的问题变成打印 `[i+1, j-1]`（或等价地 `[i, j-1]`）。

## 状态定义

```
dp[i][j] = 打印 s[i..j] 需要的最少次数
```

## 状态转移

```
如果 s[i] === s[j]:
    dp[i][j] = dp[i][j-1]  // 打印 [i, j-1] 时顺便打印了 j

否则:
    dp[i][j] = min(dp[i][k] + dp[k+1][j])  对于所有 i <= k < j
```

**理解**：
- 两端相同：打印左边部分时，把右端点也覆盖，不需要额外操作
- 两端不同：必须分成两部分分别打印

## 代码实现

### 方法一：区间 DP

```typescript
/**
 * 区间 DP
 * 时间复杂度：O(n³)
 * 空间复杂度：O(n²)
 */
function strangePrinter(s: string): number {
  const n = s.length;
  if (n === 0) return 0;
  
  // dp[i][j] = 打印 s[i..j] 的最少次数
  const dp: number[][] = Array.from(
    { length: n },
    () => new Array(n).fill(0)
  );
  
  // base case：单个字符
  for (let i = 0; i < n; i++) {
    dp[i][i] = 1;
  }
  
  // 枚举区间长度
  for (let len = 2; len <= n; len++) {
    for (let i = 0; i + len - 1 < n; i++) {
      const j = i + len - 1;
      
      if (s[i] === s[j]) {
        // 两端相同，可以一起打印
        dp[i][j] = dp[i][j - 1];
      } else {
        // 两端不同，枚举分割点
        dp[i][j] = Infinity;
        for (let k = i; k < j; k++) {
          dp[i][j] = Math.min(dp[i][j], dp[i][k] + dp[k + 1][j]);
        }
      }
    }
  }
  
  return dp[0][n - 1];
}
```

### 方法二：记忆化搜索

```typescript
function strangePrinter(s: string): number {
  const n = s.length;
  if (n === 0) return 0;
  
  const memo: number[][] = Array.from(
    { length: n },
    () => new Array(n).fill(-1)
  );
  
  function dfs(i: number, j: number): number {
    if (i > j) return 0;
    if (i === j) return 1;
    
    if (memo[i][j] !== -1) return memo[i][j];
    
    // 如果两端相同
    if (s[i] === s[j]) {
      memo[i][j] = dfs(i, j - 1);
      return memo[i][j];
    }
    
    // 枚举分割点
    let result = Infinity;
    for (let k = i; k < j; k++) {
      result = Math.min(result, dfs(i, k) + dfs(k + 1, j));
    }
    
    memo[i][j] = result;
    return result;
  }
  
  return dfs(0, n - 1);
}
```

### 方法三：预处理优化

可以先去除连续重复字符，减少状态数。

```typescript
function strangePrinter(s: string): number {
  // 去除连续重复
  let t = '';
  for (let i = 0; i < s.length; i++) {
    if (i === 0 || s[i] !== s[i - 1]) {
      t += s[i];
    }
  }
  
  const n = t.length;
  if (n === 0) return 0;
  
  const dp: number[][] = Array.from(
    { length: n },
    () => new Array(n).fill(0)
  );
  
  for (let i = 0; i < n; i++) {
    dp[i][i] = 1;
  }
  
  for (let len = 2; len <= n; len++) {
    for (let i = 0; i + len - 1 < n; i++) {
      const j = i + len - 1;
      
      // 初始：分成 [i, j-1] 和 [j, j]
      dp[i][j] = dp[i][j - 1] + 1;
      
      // 在 [i, j-1] 中找与 t[j] 相同的字符
      for (let k = i; k < j; k++) {
        if (t[k] === t[j]) {
          dp[i][j] = Math.min(dp[i][j], dp[i][k] + dp[k + 1][j - 1]);
        }
      }
    }
  }
  
  return dp[0][n - 1];
}
```

## 示例演算

以 `s = "aba"` 为例：

```
n = 3

base case: dp[0][0] = dp[1][1] = dp[2][2] = 1

len = 2:
  dp[0][1]: s[0]='a', s[1]='b' 不同
    k=0: dp[0][0] + dp[1][1] = 2
    dp[0][1] = 2
    
  dp[1][2]: s[1]='b', s[2]='a' 不同
    k=1: dp[1][1] + dp[2][2] = 2
    dp[1][2] = 2

len = 3:
  dp[0][2]: s[0]='a', s[2]='a' 相同
    dp[0][2] = dp[0][1] = 2

答案：2
```

## 另一种理解方式

另一种等价的转移：

```typescript
// 初始化为最坏情况：每个字符单独打印
dp[i][j] = dp[i][j-1] + 1;

// 如果能找到与 s[j] 相同的字符 s[k]，可以优化
for (let k = i; k < j; k++) {
  if (s[k] === s[j]) {
    dp[i][j] = Math.min(dp[i][j], dp[i][k] + dp[k+1][j-1]);
  }
}
```

这种思路更直观：先打印 `[i, k]`（包含 `s[j]` 的颜色），然后打印中间部分 `[k+1, j-1]`。

## 本章小结

1. **核心洞察**：两端相同可以合并打印
2. **状态转移**：`s[i] === s[j]` 时不需要额外打印
3. **优化方向**：预处理去重，减少状态

## 复杂度分析

- **时间复杂度**：O(n³)
- **空间复杂度**：O(n²)

## 相关题目

- [546. 移除盒子](./practice-remove-boxes.md)
- [312. 戳气球](./practice-burst-balloons.md)
