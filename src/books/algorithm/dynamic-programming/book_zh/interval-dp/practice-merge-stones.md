# 实战：合并石头的最低成本

## 题目描述

有 `N` 堆石头排成一排，第 `i` 堆中有 `stones[i]` 块石头。

每次移动需要将**连续的** `K` 堆石头合并为一堆，而这次移动的成本为这 `K` 堆石头的总数。

返回把所有石头合并成一堆的最低成本。如果无法合并成一堆，返回 `-1`。

📎 [LeetCode 1000. 合并石头的最低成本](https://leetcode.cn/problems/minimum-cost-to-merge-stones/)

**示例**：

```
输入：stones = [3, 2, 4, 1], K = 2
输出：20
解释：
  从 [3, 2, 4, 1] 开始
  合并 [3, 2]，成本为 5，剩下 [5, 4, 1]
  合并 [4, 1]，成本为 5，剩下 [5, 5]
  合并 [5, 5]，成本为 10，剩下 [10]
  总成本 = 20
```

## 问题分析

### 可行性判断

每次合并将 K 堆变成 1 堆，减少 K-1 堆。

设初始有 n 堆，最终要变成 1 堆：
- 需要减少 n-1 堆
- 每次减少 K-1 堆
- 所以 (n-1) 必须是 (K-1) 的倍数

```
(n - 1) % (K - 1) === 0
```

### 状态设计

有两种思路：

**思路一：三维 DP**
```
dp[i][j][m] = 将 stones[i..j] 合并成 m 堆的最低成本
```

**思路二：二维 DP**（优化版）
```
dp[i][j] = 将 stones[i..j] 合并成尽可能少的堆的最低成本
```

## 方法一：三维 DP

### 状态转移

```
dp[i][j][1] = dp[i][j][K] + sum(stones[i..j])
              （先合并成 K 堆，再合并成 1 堆）

dp[i][j][m] = min(dp[i][p][1] + dp[p+1][j][m-1])
              对于所有 i <= p < j
              （分成左边 1 堆 + 右边 m-1 堆）
```

### 代码实现

```typescript
/**
 * 三维区间 DP
 * 时间复杂度：O(n³ * K)
 * 空间复杂度：O(n² * K)
 */
function mergeStones(stones: number[], K: number): number {
  const n = stones.length;
  
  // 可行性检查
  if ((n - 1) % (K - 1) !== 0) return -1;
  
  // 前缀和
  const prefix = new Array(n + 1).fill(0);
  for (let i = 0; i < n; i++) {
    prefix[i + 1] = prefix[i] + stones[i];
  }
  const sum = (i: number, j: number) => prefix[j + 1] - prefix[i];
  
  // dp[i][j][m] = 将 [i, j] 合并成 m 堆的最低成本
  const INF = Infinity;
  const dp: number[][][] = Array.from({ length: n }, () =>
    Array.from({ length: n }, () => new Array(K + 1).fill(INF))
  );
  
  // base case：单个石堆
  for (let i = 0; i < n; i++) {
    dp[i][i][1] = 0;
  }
  
  // 枚举区间长度
  for (let len = 2; len <= n; len++) {
    for (let i = 0; i + len - 1 < n; i++) {
      const j = i + len - 1;
      
      // 合并成 m 堆（m >= 2）
      for (let m = 2; m <= K; m++) {
        // 分割点：左边 1 堆，右边 m-1 堆
        for (let p = i; p < j; p += K - 1) {
          if (dp[i][p][1] < INF && dp[p + 1][j][m - 1] < INF) {
            dp[i][j][m] = Math.min(
              dp[i][j][m],
              dp[i][p][1] + dp[p + 1][j][m - 1]
            );
          }
        }
      }
      
      // 合并成 1 堆：先合并成 K 堆，再合并
      if (dp[i][j][K] < INF) {
        dp[i][j][1] = dp[i][j][K] + sum(i, j);
      }
    }
  }
  
  return dp[0][n - 1][1];
}
```

## 方法二：二维 DP（优化）

### 关键观察

区间 `[i, j]` 能合并成的最少堆数是确定的：
```
minPiles = (j - i) % (K - 1) + 1
```

所以只需要记录最低成本，不需要第三维。

### 状态定义

```
dp[i][j] = 将 [i, j] 合并成尽可能少的堆的最低成本
```

### 代码实现

```typescript
/**
 * 二维区间 DP（优化版）
 * 时间复杂度：O(n³ / K)
 * 空间复杂度：O(n²)
 */
function mergeStones(stones: number[], K: number): number {
  const n = stones.length;
  
  if ((n - 1) % (K - 1) !== 0) return -1;
  
  // 前缀和
  const prefix = new Array(n + 1).fill(0);
  for (let i = 0; i < n; i++) {
    prefix[i + 1] = prefix[i] + stones[i];
  }
  const sum = (i: number, j: number) => prefix[j + 1] - prefix[i];
  
  // dp[i][j] = 将 [i, j] 合并成尽可能少的堆的最低成本
  const dp: number[][] = Array.from(
    { length: n },
    () => new Array(n).fill(0)
  );
  
  for (let len = K; len <= n; len++) {
    for (let i = 0; i + len - 1 < n; i++) {
      const j = i + len - 1;
      
      dp[i][j] = Infinity;
      
      // 分割
      for (let p = i; p < j; p += K - 1) {
        dp[i][j] = Math.min(dp[i][j], dp[i][p] + dp[p + 1][j]);
      }
      
      // 如果能合并成 1 堆，加上合并成本
      if ((j - i) % (K - 1) === 0) {
        dp[i][j] += sum(i, j);
      }
    }
  }
  
  return dp[0][n - 1];
}
```

## 方法三：记忆化搜索

```typescript
function mergeStones(stones: number[], K: number): number {
  const n = stones.length;
  
  if ((n - 1) % (K - 1) !== 0) return -1;
  
  const prefix = new Array(n + 1).fill(0);
  for (let i = 0; i < n; i++) {
    prefix[i + 1] = prefix[i] + stones[i];
  }
  const sum = (i: number, j: number) => prefix[j + 1] - prefix[i];
  
  const memo: Map<string, number> = new Map();
  
  function dfs(i: number, j: number, m: number): number {
    if (i === j) return m === 1 ? 0 : Infinity;
    if (m === 1) return dfs(i, j, K) + sum(i, j);
    
    const key = `${i},${j},${m}`;
    if (memo.has(key)) return memo.get(key)!;
    
    let result = Infinity;
    for (let p = i; p < j; p += K - 1) {
      result = Math.min(result, dfs(i, p, 1) + dfs(p + 1, j, m - 1));
    }
    
    memo.set(key, result);
    return result;
  }
  
  return dfs(0, n - 1, 1);
}
```

## 示例演算

以 `stones = [3, 2, 4, 1], K = 2` 为例：

```
检查：(4 - 1) % (2 - 1) = 3 % 1 = 0 ✓

前缀和：[0, 3, 5, 9, 10]

二维 DP：
len = 2：
  dp[0][1] = 0 + 0 + sum(0,1) = 5
  dp[1][2] = 0 + 0 + sum(1,2) = 6
  dp[2][3] = 0 + 0 + sum(2,3) = 5

len = 3：
  dp[0][2] = min(dp[0][0] + dp[1][2], dp[0][1] + dp[2][2])
           = min(0 + 6, 5 + 0) = 5
  （不能合并成 1 堆，因为 (2-0) % 1 = 0，需要加 sum）
  dp[0][2] = 5 + sum(0,2) = 5 + 9 = 14? 
  等等，让我重新计算...

  len = 3 时，(j-i) = 2，(2) % 1 = 0，可以合并成 1 堆
  dp[0][2] = min(dp[0][0]+dp[1][2], dp[0][1]+dp[2][2]) + sum
           = min(0+6, 5+0) + 9 = 14
  dp[1][3] = min(dp[1][1]+dp[2][3], dp[1][2]+dp[3][3]) + sum(1,3)
           = min(0+5, 6+0) + 7 = 12

len = 4：
  dp[0][3] = min(dp[0][0]+dp[1][3], dp[0][1]+dp[2][3], dp[0][2]+dp[3][3])
           = min(0+12, 5+5, 14+0) + sum(0,3)
           = min(12, 10, 14) + 10 = 20

答案：20
```

## 本章小结

1. **可行性判断**：`(n-1) % (K-1) === 0`
2. **状态设计**：三维 vs 二维优化
3. **分割步长**：`p += K-1` 保证分割有效
4. **与戳气球的关系**：都是区间 DP，但思路不同

## 相关题目

- [312. 戳气球](./practice-burst-balloons.md)
- [546. 移除盒子](./practice-remove-boxes.md)
