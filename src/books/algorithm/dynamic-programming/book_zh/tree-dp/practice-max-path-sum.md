# 二叉树中的最大路径和

## 题目描述

**LeetCode 124. Binary Tree Maximum Path Sum**

二叉树中的路径被定义为一条节点序列，序列中每对相邻节点之间都存在一条边。同一个节点在一条路径序列中最多出现一次。该路径至少包含一个节点，且不一定经过根节点。

路径和是路径中各节点值的总和。

给你一个二叉树的根节点 root，返回其最大路径和。

**示例 1**：
```
输入：root = [1,2,3]
输出：6
解释：最优路径是 2 → 1 → 3，路径和为 2 + 1 + 3 = 6
```

**示例 2**：
```
输入：root = [-10,9,20,null,null,15,7]
输出：42
解释：最优路径是 15 → 20 → 7，路径和为 15 + 20 + 7 = 42
```

**约束**：
- 树中节点数目范围是 `[1, 3 × 10^4]`
- `-1000 <= Node.val <= 1000`

## 思路分析

与"二叉树的直径"类似，但加入了节点权值，且权值可能为负。

关键观察：
1. 最大路径必定以某个节点为"拐点"
2. 路径可以只包含一个节点
3. 负权值的子树可以不选

对于每个节点：
- **贡献值**：以该节点为端点，向上延伸的最大路径和
- **经过它的路径和**：左贡献 + 节点值 + 右贡献

## 解法：树形 DP

```typescript
function maxPathSum(root: TreeNode | null): number {
  let maxSum = -Infinity;
  
  // 返回以 node 为端点向上延伸的最大贡献值
  function maxContribution(node: TreeNode | null): number {
    if (!node) return 0;
    
    // 左右子树的最大贡献（负数则不选，取 0）
    const leftGain = Math.max(0, maxContribution(node.left));
    const rightGain = Math.max(0, maxContribution(node.right));
    
    // 经过当前节点的路径和
    const pathSum = node.val + leftGain + rightGain;
    
    // 更新全局最大值
    maxSum = Math.max(maxSum, pathSum);
    
    // 返回贡献值：只能选一边向上延伸
    return node.val + Math.max(leftGain, rightGain);
  }
  
  maxContribution(root);
  return maxSum;
}
```

**代码解析**：

1. **贡献值定义**：
   - `maxContribution(node)` 返回"以 node 为起点，向下走的最大路径和"
   - 这个值会被父节点使用，所以只能选一边

2. **负数处理**：
   - `Math.max(0, leftGain)`：如果子树贡献为负，不如不选
   - 这保证了路径和不会因为负数子树而减少

3. **路径和计算**：
   - `pathSum = node.val + leftGain + rightGain`
   - 这是经过 node 的路径和（可能向左右两边延伸）

4. **返回值**：
   - 返回给父节点的只能是"单边最大"
   - 因为路径不能分叉后又合并

**图解**：
```
     -10
     /  \
    9   20
       /  \
      15   7

maxContribution(9) = 9（叶子，左右为0）
  更新 maxSum = max(-∞, 9) = 9

maxContribution(15) = 15
  更新 maxSum = max(9, 15) = 15

maxContribution(7) = 7
  更新 maxSum = max(15, 7) = 15

maxContribution(20):
  leftGain = 15, rightGain = 7
  pathSum = 20 + 15 + 7 = 42
  更新 maxSum = max(15, 42) = 42
  返回 20 + max(15, 7) = 35

maxContribution(-10):
  leftGain = max(0, 9) = 9
  rightGain = max(0, 35) = 35
  pathSum = -10 + 9 + 35 = 34
  不更新（34 < 42）
  返回 -10 + max(9, 35) = 25

最终答案：42
```

**复杂度分析**：
- 时间：O(n)
- 空间：O(h)

## 关键点解析

### 为什么返回值只能选一边？

路径是一条线，不能分叉。如果一个节点的左右子树都被选中，那它就是"拐点"，路径在这里拐弯。

作为贡献给父节点的值，只能是"从 node 向下的一条线"，不能是 Y 形。

### 为什么要和 0 取 max？

```typescript
const leftGain = Math.max(0, maxContribution(node.left));
```

如果子树的最大贡献是负数，选它只会让路径和变小。不如不选（贡献为 0）。

这也意味着路径可以只包含单个节点。

### 初始值为什么是负无穷？

```typescript
let maxSum = -Infinity;
```

因为节点值可能全是负数。如果初始化为 0，可能得到错误答案。

## 边界情况

1. **单节点**：返回该节点的值
2. **全负数**：返回最大的那个负数
3. **负数根节点**：可能最优路径不经过根

## 相关题目

| 题目 | 难度 | 说明 |
|------|------|------|
| [543. 二叉树的直径](https://leetcode.cn/problems/diameter-of-binary-tree/) | 简单 | 不考虑权值 |
| [687. 最长同值路径](https://leetcode.cn/problems/longest-univalue-path/) | 中等 | 相同值约束 |
| [1376. 通知所有员工所需的时间](https://leetcode.cn/problems/time-needed-to-inform-all-employees/) | 中等 | 树形 DP |

## 总结

这道题是树形 DP 的经典难题：

1. **双重含义**：
   - 返回值：单边最大贡献
   - 全局更新：双边路径和

2. **负数处理**：
   - 贡献值和 0 取 max
   - 保证不选择负贡献的子树

3. **贪心思想**：
   - 对于每个拐点，贪心地选择最优的左右路径

核心洞见：
- 返回给父节点的值 ≠ 经过该节点的最优路径
- 递归的返回值服务于父节点，全局更新捕获最优解
