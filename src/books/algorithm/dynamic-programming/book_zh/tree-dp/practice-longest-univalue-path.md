# 最长同值路径

## 题目描述

**LeetCode 687. Longest Univalue Path**

给定一个二叉树的 root，返回最长的路径的长度，这个路径中的每个节点具有相同值。

这条路径可以经过也可以不经过根节点。

两个节点之间的路径长度由它们之间的边数表示。

**示例 1**：
```
输入：root = [5,4,5,1,1,null,5]
输出：2
解释：
     5
    / \
   4   5
  / \   \
 1   1   5

最长同值路径是 [5,5,5]，边数为 2
```

**示例 2**：
```
输入：root = [1,4,5,4,4,null,5]
输出：2
解释：
     1
    / \
   4   5
  / \   \
 4   4   5

最长同值路径是 [4,4,4]，边数为 2
```

**约束**：
- 树的节点数的范围是 `[0, 10^4]`
- `-1000 <= Node.val <= 1000`
- 树的深度将不超过 `1000`

## 思路分析

与"二叉树直径"类似，但增加了约束：路径上所有节点值相同。

对于每个节点：
- 向左延伸的同值路径长度
- 向右延伸的同值路径长度
- 经过它的同值路径 = 左延伸 + 右延伸

## 解法：树形 DP

```typescript
function longestUnivaluePath(root: TreeNode | null): number {
  let maxLength = 0;
  
  // 返回以 node 为端点、向下延伸的最长同值路径的边数
  function dfs(node: TreeNode | null, parentVal: number): number {
    if (!node) return 0;
    
    // 递归计算左右子树
    const leftLen = dfs(node.left, node.val);
    const rightLen = dfs(node.right, node.val);
    
    // 更新全局最长：经过当前节点的同值路径
    maxLength = Math.max(maxLength, leftLen + rightLen);
    
    // 如果当前节点值与父节点不同，返回 0
    if (node.val !== parentVal) {
      return 0;
    }
    
    // 返回单边最长（给父节点用）
    return 1 + Math.max(leftLen, rightLen);
  }
  
  dfs(root, -1001);  // 用一个不可能的值作为虚拟父节点
  return maxLength;
}
```

**另一种写法**（不需要传父节点值）：

```typescript
function longestUnivaluePath(root: TreeNode | null): number {
  let maxLength = 0;
  
  // 返回以 node 为端点、与 node.val 相同的向下最长路径边数
  function dfs(node: TreeNode | null): number {
    if (!node) return 0;
    
    // 先递归计算
    const leftLen = dfs(node.left);
    const rightLen = dfs(node.right);
    
    // 计算左边同值延伸
    let left = 0;
    if (node.left && node.left.val === node.val) {
      left = leftLen + 1;
    }
    
    // 计算右边同值延伸
    let right = 0;
    if (node.right && node.right.val === node.val) {
      right = rightLen + 1;
    }
    
    // 更新全局最长
    maxLength = Math.max(maxLength, left + right);
    
    // 返回单边最长
    return Math.max(left, right);
  }
  
  dfs(root);
  return maxLength;
}
```

**代码解析**：

1. **递归含义**：`dfs(node)` 返回从 node 向下、与 node 同值的最长路径边数

2. **同值判断**：
   - 如果子节点值与当前节点相同，可以延伸
   - 否则延伸长度为 0

3. **全局更新**：
   - `left + right` 是经过当前节点的完整同值路径

4. **返回值**：
   - 返回单边最长，供父节点判断是否继续延伸

**复杂度分析**：
- 时间：O(n)
- 空间：O(h)

## 图解

```
     5
    / \
   4   5
  / \   \
 1   1   5

dfs(1左) = 0（叶子）
dfs(1右) = 0
dfs(4):
  left = 0（4 ≠ 1）
  right = 0（4 ≠ 1）
  maxLength = max(0, 0+0) = 0
  return 0

dfs(5右下) = 0
dfs(5右):
  right = 0 + 1 = 1（5 = 5）
  maxLength = max(0, 0+1) = 1
  return 1

dfs(5根):
  left = 0（5 ≠ 4）
  right = 1 + 1 = 2（5 = 5）
  maxLength = max(1, 0+2) = 2
  return 2

答案：2
```

## 边界情况

1. **空树**：返回 0
2. **单节点**：返回 0（没有边）
3. **所有节点值相同**：返回 n-1（整棵树是一条路径）
4. **所有节点值不同**：返回 0

## 相关题目

| 题目 | 难度 | 说明 |
|------|------|------|
| [543. 二叉树的直径](https://leetcode.cn/problems/diameter-of-binary-tree/) | 简单 | 无同值约束 |
| [124. 二叉树中的最大路径和](https://leetcode.cn/problems/binary-tree-maximum-path-sum/) | 困难 | 带权值 |
| [298. 二叉树最长连续序列](https://leetcode.cn/problems/binary-tree-longest-consecutive-sequence/) | 中等 | 连续递增 |

## 总结

这道题是"二叉树直径"的变体：

1. **增加约束**：路径上所有值相同
2. **条件延伸**：只有同值才能延伸
3. **模式相同**：返回单边，更新双边

核心洞见：
- 值不同时，延伸断开（返回 0）
- 值相同时，延伸继续（返回 1 + 子延伸）
- 全局答案在递归过程中更新
