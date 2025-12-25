# 实战：打家劫舍

打家劫舍系列是线性 DP 的经典入门题，完美诠释了"选或不选"的决策模式。

## 题目描述

你是一个专业的小偷，计划偷窃沿街的房屋。每间房内都藏有一定的现金，影响你偷窃的唯一制约因素就是相邻的房屋装有相互连通的防盗系统，**如果两间相邻的房屋在同一晚上被小偷闯入，系统会自动报警**。

给定一个代表每个房屋存放金额的非负整数数组，计算你不触动警报装置的情况下，一夜之内能够偷窃到的最高金额。

📎 [LeetCode 198. 打家劫舍](https://leetcode.cn/problems/house-robber/)

**示例**：

```
输入：nums = [2, 7, 9, 3, 1]
输出：12
解释：偷窃 1 号房屋 (金额 = 2), 3 号房屋 (金额 = 9) 和 5 号房屋 (金额 = 1)
     总金额 = 2 + 9 + 1 = 12
```

**约束**：
- `1 <= nums.length <= 100`
- `0 <= nums[i] <= 400`

## 思路分析

### 关键洞察

对于每一间房子，只有两种选择：
1. **偷**：获得当前房子的钱，但不能偷前一间
2. **不偷**：不获得当前房子的钱，但可以继承前一间的最优结果

### 状态定义

**方式一：以 i 结尾的最大金额**

`dp[i]` = 在前 i 间房子中能偷到的最大金额（不一定偷第 i 间）

**方式二：必须偷第 i 间**

`dp[i]` = 偷到第 i 间房子（必须偷）能获得的最大金额

我们选择方式一，因为更直观：

- **状态**：`dp[i]` = 前 i 间房子能偷到的最大金额
- **转移**：`dp[i] = max(dp[i-1], dp[i-2] + nums[i])`
  - 不偷第 i 间：`dp[i-1]`
  - 偷第 i 间：`dp[i-2] + nums[i]`
- **边界**：`dp[0] = nums[0]`, `dp[1] = max(nums[0], nums[1])`
- **答案**：`dp[n-1]`

### 状态转移图示

```
房子:    [2]   [7]   [9]   [3]   [1]
          ↓     ↓     ↓     ↓     ↓
dp:       2     7    11    11    12
          ↑     ↑     ↑     ↑     ↑
选择:    偷   不偷   偷   不偷   偷
```

## 解法一：递推

```typescript
/**
 * 递推
 * 时间复杂度：O(n)
 * 空间复杂度：O(n)
 */
function rob(nums: number[]): number {
  const n = nums.length;
  if (n === 1) return nums[0];
  
  const dp = new Array(n);
  dp[0] = nums[0];
  dp[1] = Math.max(nums[0], nums[1]);
  
  for (let i = 2; i < n; i++) {
    dp[i] = Math.max(
      dp[i - 1],           // 不偷第 i 间
      dp[i - 2] + nums[i]  // 偷第 i 间
    );
  }
  
  return dp[n - 1];
}
```

## 解法二：空间优化

`dp[i]` 只依赖 `dp[i-1]` 和 `dp[i-2]`，可以用两个变量：

```typescript
/**
 * 空间优化
 * 时间复杂度：O(n)
 * 空间复杂度：O(1)
 */
function rob(nums: number[]): number {
  const n = nums.length;
  if (n === 1) return nums[0];
  
  let prev2 = nums[0];                     // dp[i-2]
  let prev1 = Math.max(nums[0], nums[1]);  // dp[i-1]
  
  for (let i = 2; i < n; i++) {
    const curr = Math.max(prev1, prev2 + nums[i]);
    prev2 = prev1;
    prev1 = curr;
  }
  
  return prev1;
}
```

## 解法三：记忆化搜索

```typescript
/**
 * 记忆化搜索
 * 时间复杂度：O(n)
 * 空间复杂度：O(n)
 */
function rob(nums: number[]): number {
  const n = nums.length;
  const memo = new Array(n).fill(-1);
  
  function dp(i: number): number {
    if (i < 0) return 0;
    if (memo[i] !== -1) return memo[i];
    
    memo[i] = Math.max(
      dp(i - 1),           // 不偷第 i 间
      dp(i - 2) + nums[i]  // 偷第 i 间
    );
    return memo[i];
  }
  
  return dp(n - 1);
}
```

## 打家劫舍 II：环形数组

📎 [LeetCode 213. 打家劫舍 II](https://leetcode.cn/problems/house-robber-ii/)

**变化**：房子围成一圈，第一间和最后一间也是相邻的。

**关键洞察**：

环形数组意味着第一间和最后一间不能同时偷。我们可以把问题拆成两个子问题：
1. 偷 `nums[0..n-2]`（不偷最后一间）
2. 偷 `nums[1..n-1]`（不偷第一间）

取两者最大值即可。

```typescript
/**
 * 打家劫舍 II
 * 时间复杂度：O(n)
 * 空间复杂度：O(1)
 */
function rob(nums: number[]): number {
  const n = nums.length;
  if (n === 1) return nums[0];
  if (n === 2) return Math.max(nums[0], nums[1]);
  
  // 辅助函数：线性数组的打家劫舍
  function robRange(start: number, end: number): number {
    let prev2 = nums[start];
    let prev1 = Math.max(nums[start], nums[start + 1]);
    
    for (let i = start + 2; i <= end; i++) {
      const curr = Math.max(prev1, prev2 + nums[i]);
      prev2 = prev1;
      prev1 = curr;
    }
    
    return prev1;
  }
  
  // 不偷最后一间 vs 不偷第一间
  return Math.max(
    robRange(0, n - 2),
    robRange(1, n - 1)
  );
}
```

## 打家劫舍 III：树形结构

📎 [LeetCode 337. 打家劫舍 III](https://leetcode.cn/problems/house-robber-iii/)

**变化**：房子的分布类似于二叉树，小偷不能同时偷直接相连的房子。

**状态定义**：
- `rob(node)` = 偷以 node 为根的子树能获得的最大金额
- 返回两个值：`[偷 node 的最大值, 不偷 node 的最大值]`

```typescript
/**
 * 打家劫舍 III
 * 时间复杂度：O(n)
 * 空间复杂度：O(h)，h 是树高
 */
function rob(root: TreeNode | null): number {
  function dfs(node: TreeNode | null): [number, number] {
    if (!node) return [0, 0];
    
    const [leftRob, leftNotRob] = dfs(node.left);
    const [rightRob, rightNotRob] = dfs(node.right);
    
    // 偷当前节点：子节点都不能偷
    const robCurrent = node.val + leftNotRob + rightNotRob;
    
    // 不偷当前节点：子节点可偷可不偷，取最大值
    const notRobCurrent = Math.max(leftRob, leftNotRob) + Math.max(rightRob, rightNotRob);
    
    return [robCurrent, notRobCurrent];
  }
  
  const [rob, notRob] = dfs(root);
  return Math.max(rob, notRob);
}
```

## 打家劫舍 IV：最小能力

📎 [LeetCode 2560. 打家劫舍 IV](https://leetcode.cn/problems/house-robber-iv/)

**变化**：给定需要偷的房子数量 k，求所偷房子中最大金额的最小值。

这是一道**二分答案 + 贪心验证**的题目：

```typescript
/**
 * 打家劫舍 IV
 * 时间复杂度：O(n log m)，m 是数值范围
 * 空间复杂度：O(1)
 */
function minCapability(nums: number[], k: number): number {
  let left = Math.min(...nums);
  let right = Math.max(...nums);
  
  // 检查能力为 cap 时，能偷多少间
  function canRob(cap: number): number {
    let count = 0;
    let i = 0;
    while (i < nums.length) {
      if (nums[i] <= cap) {
        count++;
        i += 2;  // 跳过相邻的
      } else {
        i++;
      }
    }
    return count;
  }
  
  while (left < right) {
    const mid = Math.floor((left + right) / 2);
    if (canRob(mid) >= k) {
      right = mid;
    } else {
      left = mid + 1;
    }
  }
  
  return left;
}
```

## 复杂度分析

| 题目 | 时间复杂度 | 空间复杂度 |
|-----|-----------|-----------|
| 打家劫舍 | O(n) | O(1) |
| 打家劫舍 II | O(n) | O(1) |
| 打家劫舍 III | O(n) | O(h) |
| 打家劫舍 IV | O(n log m) | O(1) |

## 本章小结

1. **核心决策**："选或不选"
2. **状态转移**：`dp[i] = max(dp[i-1], dp[i-2] + nums[i])`
3. **环形处理**：拆成两个线性子问题
4. **树形处理**：后序遍历，返回两种状态

**解题技巧**：
- 识别"不能选相邻"的约束
- 空间优化：只需两个变量
- 变体问题：环形、树形、二分答案
