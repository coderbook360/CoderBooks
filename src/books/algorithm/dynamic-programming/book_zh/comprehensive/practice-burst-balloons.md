# 戳气球

## 题目描述

**LeetCode 312. Burst Balloons**

有 n 个气球，编号为 0 到 n-1，每个气球上都标有一个数字，这些数字存在数组 nums 中。

现在要求你戳破所有的气球。戳破第 i 个气球，可以获得 nums[i-1] × nums[i] × nums[i+1] 枚硬币。这里的 i-1 和 i+1 代表和 i 相邻的两个气球的序号。如果 i-1 或 i+1 超出了数组的边界，那么就当它是一个数字为 1 的气球。

求所能获得硬币的最大数量。

**示例 1**：
```
输入：nums = [3,1,5,8]
输出：167
解释：
nums = [3,1,5,8] → [3,5,8] → [3,8] → [8] → []
coins = 3×1×5 + 3×5×8 + 1×3×8 + 1×8×1 = 167
```

**示例 2**：
```
输入：nums = [1,5]
输出：10
```

**约束**：
- `n == nums.length`
- `1 <= n <= 300`
- `0 <= nums[i] <= 100`

## 思路分析

### 难点：戳破顺序影响后续

直接考虑"先戳哪个"会导致问题复杂化，因为戳破一个气球后，相邻关系会改变。

### 逆向思维：考虑最后戳哪个

关键洞见：**不考虑先戳哪个，而是考虑最后戳哪个**。

如果气球 k 是区间 (i, j) 中**最后一个**被戳破的：
- 戳破 k 时，两边的气球已经没有了
- k 的邻居是边界 i 和 j
- 获得 nums[i] × nums[k] × nums[j] 硬币

### 状态定义

为了方便处理边界，在 nums 两端各加一个 1：
```
newNums = [1, ...nums, 1]
```

`dp[i][j]` = 戳破开区间 (i, j) 内所有气球能获得的最大硬币数

注意是**开区间**：不包括边界 i 和 j。

### 状态转移

枚举区间 (i, j) 内最后戳破的气球 k：

```
dp[i][j] = max(dp[i][k] + dp[k][j] + nums[i] × nums[k] × nums[j])
           k ∈ (i, j)
```

### 为什么用开区间？

因为最后戳破 k 时：
- 左边 (i, k) 的气球已经全部戳破
- 右边 (k, j) 的气球已经全部戳破
- k 的邻居就是 i 和 j

开区间让边界处理更自然。

## 解法一：区间 DP

```typescript
function maxCoins(nums: number[]): number {
  const n = nums.length;
  
  // 添加虚拟边界
  const arr = [1, ...nums, 1];
  const len = arr.length;
  
  // dp[i][j] = 戳破开区间 (i, j) 内气球的最大硬币
  const dp = Array.from(
    { length: len },
    () => Array(len).fill(0)
  );
  
  // 区间长度从小到大
  for (let size = 2; size < len; size++) {
    for (let i = 0; i + size < len; i++) {
      const j = i + size;
      
      // 枚举最后戳破的气球 k
      for (let k = i + 1; k < j; k++) {
        dp[i][j] = Math.max(
          dp[i][j],
          dp[i][k] + dp[k][j] + arr[i] * arr[k] * arr[j]
        );
      }
    }
  }
  
  // 答案：开区间 (0, len-1)
  return dp[0][len - 1];
}
```

**复杂度分析**：
- 时间：O(n³)
- 空间：O(n²)

## 解法二：记忆化搜索

更直观的递归写法：

```typescript
function maxCoins(nums: number[]): number {
  const arr = [1, ...nums, 1];
  const n = arr.length;
  const memo = new Map<string, number>();
  
  function dfs(i: number, j: number): number {
    // 空区间
    if (j - i < 2) return 0;
    
    const key = `${i},${j}`;
    if (memo.has(key)) return memo.get(key)!;
    
    let maxVal = 0;
    
    // 枚举最后戳破的气球
    for (let k = i + 1; k < j; k++) {
      const coins = dfs(i, k) + dfs(k, j) + arr[i] * arr[k] * arr[j];
      maxVal = Math.max(maxVal, coins);
    }
    
    memo.set(key, maxVal);
    return maxVal;
  }
  
  return dfs(0, n - 1);
}
```

**复杂度分析**：
- 时间：O(n³)
- 空间：O(n²)

## 图解

以 nums = [3, 1, 5, 8] 为例：

```
添加边界后：arr = [1, 3, 1, 5, 8, 1]
下标：           0  1  2  3  4  5

求 dp[0][5]：开区间 (0, 5) 即原数组

枚举最后戳破的气球：
k=1：dp[0][1] + dp[1][5] + arr[0]*arr[1]*arr[5] = 0 + ? + 1*3*1
k=2：dp[0][2] + dp[2][5] + arr[0]*arr[2]*arr[5] = ? + ? + 1*1*1
k=3：dp[0][3] + dp[3][5] + arr[0]*arr[3]*arr[5] = ? + ? + 1*5*1
k=4：dp[0][4] + dp[4][5] + arr[0]*arr[4]*arr[5] = ? + 0 + 1*8*1

递归计算...
最终 dp[0][5] = 167
```

## 思维模式：区间 DP

区间 DP 的一般套路：

```typescript
// 1. 定义 dp[i][j] 表示区间 [i, j] 或 (i, j) 的答案
// 2. 枚举区间长度（从小到大）
// 3. 枚举左端点
// 4. 枚举分割点或特殊位置
// 5. 合并子区间的结果
```

常见场景：
- 合并石子
- 矩阵链乘法
- 戳气球
- 回文串分割

## 变体：打印方案

```typescript
function maxCoinsWithPath(nums: number[]): [number, number[]] {
  const arr = [1, ...nums, 1];
  const n = arr.length;
  
  const dp = Array.from({ length: n }, () => Array(n).fill(0));
  const choice = Array.from({ length: n }, () => Array(n).fill(-1));
  
  for (let size = 2; size < n; size++) {
    for (let i = 0; i + size < n; i++) {
      const j = i + size;
      for (let k = i + 1; k < j; k++) {
        const coins = dp[i][k] + dp[k][j] + arr[i] * arr[k] * arr[j];
        if (coins > dp[i][j]) {
          dp[i][j] = coins;
          choice[i][j] = k;
        }
      }
    }
  }
  
  // 回溯戳破顺序（逆序）
  const order: number[] = [];
  
  function trace(i: number, j: number): void {
    if (j - i < 2) return;
    const k = choice[i][j];
    trace(i, k);
    trace(k, j);
    order.push(k - 1);  // 转回原数组下标
  }
  
  trace(0, n - 1);
  
  return [dp[0][n - 1], order.reverse()];
}
```

## 复杂度优化分析

O(n³) 的时间复杂度是否可以优化？

对于一般的区间 DP 问题，O(n³) 通常是最优的。某些特殊情况下可以利用四边形不等式优化到 O(n²)，但本题不满足条件。

n ≤ 300，O(n³) ≈ 2.7 × 10^7，可以接受。

## 相关题目

| 题目 | 难度 | 说明 |
|------|------|------|
| [1039. 多边形三角剖分的最低得分](https://leetcode.cn/problems/minimum-score-triangulation-of-polygon/) | 中等 | 类似区间DP |
| [1547. 切棍子的最小成本](https://leetcode.cn/problems/minimum-cost-to-cut-a-stick/) | 困难 | 区间DP |
| [87. 扰乱字符串](https://leetcode.cn/problems/scramble-string/) | 困难 | 区间DP变体 |
| [1000. 合并石头的最低成本](https://leetcode.cn/problems/minimum-cost-to-merge-stones/) | 困难 | 经典区间DP |

## 总结

戳气球是区间 DP 的经典题：

1. **逆向思维**：考虑最后戳破哪个，而非先戳哪个
2. **开区间**：dp[i][j] 表示开区间 (i, j) 的结果
3. **虚拟边界**：添加 1 处理边界情况
4. **区间合并**：枚举分割点，合并左右子区间

核心洞见：
- 最后戳破的气球，其邻居是固定的区间边界
- 这消除了戳破顺序带来的依赖关系
- 将问题转化为标准的区间 DP
