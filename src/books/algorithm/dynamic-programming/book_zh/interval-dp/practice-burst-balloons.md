# 实战：戳气球

## 题目描述

有 `n` 个气球，编号为 `0` 到 `n - 1`，每个气球上都标有一个数字，这些数字存在数组 `nums` 中。

现在要求你戳破所有的气球。戳破第 `i` 个气球，可以获得 `nums[i - 1] * nums[i] * nums[i + 1]` 枚硬币。如果 `i - 1` 或 `i + 1` 超出了数组的边界，那么就当它是一个数字为 `1` 的气球。

求所能获得硬币的最大数量。

📎 [LeetCode 312. 戳气球](https://leetcode.cn/problems/burst-balloons/)

**示例**：

```
输入：nums = [3, 1, 5, 8]
输出：167
解释：
  nums = [3, 1, 5, 8] --> [3, 5, 8] --> [3, 8] --> [8] --> []
  coins = 3*1*5 + 3*5*8 + 1*3*8 + 1*8*1 = 167
```

## 问题分析

这道题的难点在于：戳破一个气球后，相邻关系会改变。

**关键思路转换**：不要思考"先戳哪个"，而是思考"最后戳哪个"。

为什么？因为如果我们知道某个气球是区间 `[i, j]` 中**最后被戳破的**，那么：
- 它左边和右边的气球已经被戳破了
- 此时它的邻居是边界 `i-1` 和 `j+1`

## 状态定义

```
dp[i][j] = 戳破开区间 (i, j) 内所有气球能获得的最大硬币数
```

**注意**：这里用开区间，`i` 和 `j` 是边界，不被戳破。

## 状态转移

枚举最后戳破的气球 `k`（`i < k < j`）：

```
dp[i][j] = max(dp[i][k] + dp[k][j] + nums[i] * nums[k] * nums[j])
         对于所有 i < k < j
```

**理解**：
- `dp[i][k]`：先处理左边
- `dp[k][j]`：再处理右边
- `nums[i] * nums[k] * nums[j]`：最后戳破 `k`，此时邻居是 `i` 和 `j`

## 代码实现

### 方法一：区间 DP

```typescript
/**
 * 区间 DP
 * 时间复杂度：O(n³)
 * 空间复杂度：O(n²)
 */
function maxCoins(nums: number[]): number {
  const n = nums.length;
  
  // 添加虚拟边界
  const points = [1, ...nums, 1];
  const m = points.length;  // m = n + 2
  
  // dp[i][j] = 开区间 (i, j) 内的最大硬币数
  const dp: number[][] = Array.from(
    { length: m },
    () => new Array(m).fill(0)
  );
  
  // 枚举区间长度（从 2 开始，因为长度 < 2 时开区间内没有气球）
  for (let len = 2; len < m; len++) {
    for (let i = 0; i + len < m; i++) {
      const j = i + len;
      
      // 枚举最后戳破的气球
      for (let k = i + 1; k < j; k++) {
        const coins = dp[i][k] + dp[k][j] + points[i] * points[k] * points[j];
        dp[i][j] = Math.max(dp[i][j], coins);
      }
    }
  }
  
  return dp[0][m - 1];
}
```

### 方法二：记忆化搜索

```typescript
function maxCoins(nums: number[]): number {
  const points = [1, ...nums, 1];
  const m = points.length;
  
  const memo: number[][] = Array.from(
    { length: m },
    () => new Array(m).fill(-1)
  );
  
  function dfs(i: number, j: number): number {
    // 开区间内没有气球
    if (j - i < 2) return 0;
    
    if (memo[i][j] !== -1) return memo[i][j];
    
    let maxVal = 0;
    for (let k = i + 1; k < j; k++) {
      const coins = dfs(i, k) + dfs(k, j) + points[i] * points[k] * points[j];
      maxVal = Math.max(maxVal, coins);
    }
    
    memo[i][j] = maxVal;
    return maxVal;
  }
  
  return dfs(0, m - 1);
}
```

## 示例演算

以 `nums = [3, 1, 5, 8]` 为例：

```
points = [1, 3, 1, 5, 8, 1]（添加边界）
索引：     0  1  2  3  4  5

目标：求 dp[0][5]

长度 2（区间内无气球）：dp[i][i+2] = 0 需要计算的是长度>=3

长度 3：
  dp[0][2]：k=1，= 0 + 0 + 1*3*1 = 3
  dp[1][3]：k=2，= 0 + 0 + 3*1*5 = 15
  dp[2][4]：k=3，= 0 + 0 + 1*5*8 = 40
  dp[3][5]：k=4，= 0 + 0 + 5*8*1 = 40

长度 4：
  dp[0][3]：
    k=1: 0 + 15 + 1*3*5 = 30
    k=2: 3 + 0 + 1*1*5 = 8
    → dp[0][3] = 30
  dp[1][4]：
    k=2: 0 + 40 + 3*1*8 = 64
    k=3: 15 + 0 + 3*5*8 = 135
    → dp[1][4] = 135
  dp[2][5]：
    k=3: 0 + 40 + 1*5*1 = 45
    k=4: 40 + 0 + 1*8*1 = 48
    → dp[2][5] = 48

长度 5：
  dp[0][4]：
    k=1: 0 + 135 + 1*3*8 = 159
    k=2: 3 + 40 + 1*1*8 = 51
    k=3: 30 + 0 + 1*5*8 = 70
    → dp[0][4] = 159
  dp[1][5]：
    k=2: 0 + 48 + 3*1*1 = 51
    k=3: 15 + 40 + 3*5*1 = 70
    k=4: 135 + 0 + 3*8*1 = 159
    → dp[1][5] = 159

长度 6：
  dp[0][5]：
    k=1: 0 + 159 + 1*3*1 = 162
    k=2: 3 + 48 + 1*1*1 = 52
    k=3: 30 + 40 + 1*5*1 = 75
    k=4: 159 + 0 + 1*8*1 = 167
    → dp[0][5] = 167

答案：167
```

## 思路总结

1. **逆向思维**：思考"最后戳破"而非"先戳破"
2. **开区间设计**：边界不参与戳破，简化计算
3. **添加虚拟边界**：处理边界条件

## 本章小结

这道题是区间 DP 的经典应用：

1. **状态设计技巧**：开区间 vs 闭区间
2. **逆向思考**：从最后一步倒推
3. **时间复杂度**：O(n³)，三重循环

## 相关题目

- [1000. 合并石头的最低成本](./practice-merge-stones.md)
- [546. 移除盒子](./practice-remove-boxes.md)
