# 实战：移除盒子

## 题目描述

给出一些不同颜色的盒子 `boxes`，盒子的颜色由正整数表示。

你将经过若干轮操作去掉盒子，直到所有的盒子都去掉为止。每一轮你可以移除具有**相同颜色的连续** `k` 个盒子（k >= 1），这样一轮之后你将得到 `k * k` 个积分。

返回你能获得的最大积分。

📎 [LeetCode 546. 移除盒子](https://leetcode.cn/problems/remove-boxes/)

**示例**：

```
输入：boxes = [1, 3, 2, 2, 2, 3, 4, 3, 1]
输出：23
解释：
  [1, 3, 2, 2, 2, 3, 4, 3, 1]
  --> [1, 3, 3, 4, 3, 1] (移除 3 个 2，得 3*3=9 分)
  --> [1, 3, 3, 3, 1] (移除 1 个 4，得 1*1=1 分)
  --> [1, 1] (移除 3 个 3，得 3*3=9 分)
  --> [] (移除 2 个 1，得 2*2=4 分)
  总分 = 9 + 1 + 9 + 4 = 23
```

## 问题分析

这道题的难度在于：移除中间的盒子后，左右两边可能会合并成新的连续序列。

### 状态设计的挑战

如果只用 `dp[i][j]` 表示区间 `[i, j]` 的最大得分，会丢失信息——我们不知道区间左边还有多少个与 `boxes[i]` 相同颜色的盒子可以一起移除。

### 解决方案：增加一维

```
dp[i][j][k] = 移除区间 [i, j] 的盒子，且区间左边有 k 个与 boxes[i] 相同颜色的盒子（已经"待命"准备一起移除）时的最大得分
```

## 状态转移

对于 `dp[i][j][k]`，有两种选择：

1. **直接移除**：把 `boxes[i]` 和左边的 k 个盒子一起移除
   ```
   dp[i][j][k] = (k + 1)² + dp[i + 1][j][0]
   ```

2. **延迟移除**：在 `[i+1, j]` 中找到颜色相同的 `boxes[m]`，先移除 `[i+1, m-1]`，让 `boxes[i]` 和 `boxes[m]` 合并
   ```
   dp[i][j][k] = dp[i + 1][m - 1][0] + dp[m][j][k + 1]
   （其中 boxes[m] === boxes[i]，i < m <= j）
   ```

## 代码实现

### 方法一：记忆化搜索

```typescript
/**
 * 三维区间 DP（记忆化搜索）
 * 时间复杂度：O(n⁴)
 * 空间复杂度：O(n³)
 */
function removeBoxes(boxes: number[]): number {
  const n = boxes.length;
  
  // memo[i][j][k] = dp[i][j][k]
  const memo: number[][][] = Array.from({ length: n }, () =>
    Array.from({ length: n }, () => new Array(n).fill(-1))
  );
  
  function dfs(i: number, j: number, k: number): number {
    if (i > j) return 0;
    
    if (memo[i][j][k] !== -1) return memo[i][j][k];
    
    // 优化：合并连续相同颜色
    let ii = i, kk = k;
    while (ii < j && boxes[ii + 1] === boxes[i]) {
      ii++;
      kk++;
    }
    
    // 选择 1：直接移除 boxes[i..ii] 和左边的 k 个
    let result = (kk + 1) * (kk + 1) + dfs(ii + 1, j, 0);
    
    // 选择 2：在后面找相同颜色的盒子合并
    for (let m = ii + 2; m <= j; m++) {
      if (boxes[m] === boxes[i]) {
        result = Math.max(
          result,
          dfs(ii + 1, m - 1, 0) + dfs(m, j, kk + 1)
        );
      }
    }
    
    memo[i][j][k] = result;
    return result;
  }
  
  return dfs(0, n - 1, 0);
}
```

### 方法二：迭代 DP

```typescript
function removeBoxes(boxes: number[]): number {
  const n = boxes.length;
  
  const dp: number[][][] = Array.from({ length: n }, () =>
    Array.from({ length: n }, () => new Array(n).fill(0))
  );
  
  // base case：单个盒子
  for (let i = 0; i < n; i++) {
    for (let k = 0; k < n; k++) {
      dp[i][i][k] = (k + 1) * (k + 1);
    }
  }
  
  // 枚举区间长度
  for (let len = 2; len <= n; len++) {
    for (let i = 0; i + len - 1 < n; i++) {
      const j = i + len - 1;
      
      for (let k = 0; k < n; k++) {
        // 选择 1：直接移除
        dp[i][j][k] = (k + 1) * (k + 1) + (i + 1 <= j ? dp[i + 1][j][0] : 0);
        
        // 选择 2：延迟移除
        for (let m = i + 1; m <= j; m++) {
          if (boxes[m] === boxes[i]) {
            const left = i + 1 <= m - 1 ? dp[i + 1][m - 1][0] : 0;
            const right = dp[m][j][k + 1];
            dp[i][j][k] = Math.max(dp[i][j][k], left + right);
          }
        }
      }
    }
  }
  
  return dp[0][n - 1][0];
}
```

## 示例演算

以 `boxes = [1, 3, 2, 2, 2, 3, 4, 3, 1]` 为例：

```
dfs(0, 8, 0)：
  boxes[0] = 1，boxes[8] = 1（相同）
  
  选择 1：直接移除 1
    = 1 + dfs(1, 8, 0)
  
  选择 2：和 boxes[8] 合并
    = dfs(1, 7, 0) + dfs(8, 8, 1)
    = dfs(1, 7, 0) + 4

需要计算 dfs(1, 7, 0)：
  boxes[1] = 3
  在后面找 3：boxes[5] = 3, boxes[7] = 3
  
  最优策略是把三个 3 一起移除...

最终答案：23
```

## 思路总结

1. **核心难点**：移除后左右可能合并
2. **解决方案**：增加一维表示"待合并"的数量
3. **状态设计**：`dp[i][j][k]` 带上历史信息
4. **优化技巧**：预处理连续相同颜色

## 复杂度分析

- **时间复杂度**：O(n⁴)
  - 三维状态 O(n³)
  - 每个状态转移 O(n)
  
- **空间复杂度**：O(n³)

## 本章小结

这是区间 DP 中最难的题目之一：

1. **状态增维**：当二维不够用时，增加维度携带更多信息
2. **延迟决策**：不急于移除，等待更优的合并机会
3. **连续优化**：预处理连续相同元素，减少状态数

## 相关题目

- [312. 戳气球](./practice-burst-balloons.md)
- [664. 奇怪的打印机](./practice-strange-printer.md)
