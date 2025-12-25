# 具有所有最深节点的最小子树

## 题目描述

**LeetCode 865. Smallest Subtree with all the Deepest Nodes**

给定一棵根为 root 的二叉树，每个节点的深度是其到根节点的最短距离。

返回包含原始树中所有最深节点的最小子树。

如果一个节点在整个树的任意节点之间具有最大的深度，则称它是最深的。

一个节点的子树是该节点加上它的所有后代的集合。

**示例 1**：
```
输入：root = [3,5,1,6,2,0,8,null,null,7,4]
输出：[2,7,4]
解释：
        3
       / \
      5   1
     / \ / \
    6  2 0  8
      / \
     7   4

最深的节点是 7 和 4（深度为 3）
包含它们的最小子树的根是节点 2
```

**示例 2**：
```
输入：root = [1]
输出：[1]
```

**示例 3**：
```
输入：root = [0,1,3,null,2]
输出：[2]
```

**约束**：
- 树中节点的数量在 `[1, 500]` 范围内
- `0 <= Node.val <= 500`
- 每个节点的值都是独一无二的

## 思路分析

问题：找到包含所有最深节点的最小子树。

关键观察：
- 如果最深节点都在一个子树中，答案就是那个子树的根
- 如果最深节点分布在左右子树，答案就是当前节点
- 递归地，答案是"左右子树深度相等时返回当前节点"

## 解法一：两次遍历

先找最大深度，再找最小子树。

```typescript
function subtreeWithAllDeepest(root: TreeNode | null): TreeNode | null {
  if (!root) return null;
  
  // 计算每个节点的深度
  const depth = new Map<TreeNode, number>();
  depth.set(null as any, -1);
  
  function computeDepth(node: TreeNode | null, d: number): void {
    if (!node) return;
    depth.set(node, d);
    computeDepth(node.left, d + 1);
    computeDepth(node.right, d + 1);
  }
  
  computeDepth(root, 0);
  
  // 找最大深度
  let maxDepth = 0;
  depth.forEach((d) => { maxDepth = Math.max(maxDepth, d); });
  
  // 找包含所有最深节点的最小子树
  function findSubtree(node: TreeNode | null): TreeNode | null {
    if (!node) return null;
    if (depth.get(node) === maxDepth) return node;
    
    const left = findSubtree(node.left);
    const right = findSubtree(node.right);
    
    if (left && right) return node;  // 左右都有最深节点
    return left || right;
  }
  
  return findSubtree(root);
}
```

## 解法二：一次遍历（树形 DP）

同时计算深度和找答案。

```typescript
function subtreeWithAllDeepest(root: TreeNode | null): TreeNode | null {
  // 返回 [子树中最深叶子的深度, 包含所有最深叶子的最小子树根]
  function dfs(node: TreeNode | null): [number, TreeNode | null] {
    if (!node) return [0, null];
    
    const [leftDepth, leftNode] = dfs(node.left);
    const [rightDepth, rightNode] = dfs(node.right);
    
    if (leftDepth > rightDepth) {
      return [leftDepth + 1, leftNode];
    } else if (rightDepth > leftDepth) {
      return [rightDepth + 1, rightNode];
    } else {
      // 深度相等，当前节点是 LCA
      return [leftDepth + 1, node];
    }
  }
  
  return dfs(root)[1];
}
```

**代码解析**：

1. **返回值**：`[最深叶子深度, 最小子树根]`

2. **三种情况**：
   - 左边更深：答案在左子树
   - 右边更深：答案在右子树
   - 一样深：当前节点是答案

3. **递归逻辑**：
   - 叶子节点返回 `[0, null]`（这里用 0 表示空，实际深度在回溯时累加）
   - 实际上，空节点返回深度 0，叶子节点会得到 `max(0,0)+1 = 1`

**修正版本**：

```typescript
function subtreeWithAllDeepest(root: TreeNode | null): TreeNode | null {
  function dfs(node: TreeNode | null): [number, TreeNode | null] {
    if (!node) return [-1, null];  // 空节点深度 -1
    
    const [leftDepth, leftNode] = dfs(node.left);
    const [rightDepth, rightNode] = dfs(node.right);
    
    if (leftDepth > rightDepth) {
      return [leftDepth + 1, leftNode];
    } else if (rightDepth > leftDepth) {
      return [rightDepth + 1, rightNode];
    } else {
      return [leftDepth + 1, node];
    }
  }
  
  return dfs(root)[1];
}
```

**复杂度分析**：
- 时间：O(n)
- 空间：O(h)

## 图解

```
        3
       / \
      5   1
     / \ / \
    6  2 0  8
      / \
     7   4

dfs(7): [-1,-1] → [0, 7]
dfs(4): [0, 4]
dfs(2): left=[0,7], right=[0,4]
        深度相等，返回 [1, 2]
dfs(6): [0, 6]
dfs(5): left=[0,6], right=[1,2]
        右边更深，返回 [2, 2]
dfs(0): [0, 0]
dfs(8): [0, 8]
dfs(1): left=[0,0], right=[0,8]
        深度相等，返回 [1, 1]
dfs(3): left=[2,2], right=[1,1]
        左边更深，返回 [3, 2]

答案：节点 2
```

## 等价问题

这道题等价于：找所有最深叶子节点的 LCA（最近公共祖先）。

**LeetCode 1123. Lowest Common Ancestor of Deepest Leaves** 是完全相同的问题。

## 相关题目

| 题目 | 难度 | 说明 |
|------|------|------|
| [1123. 最深叶节点的最近公共祖先](https://leetcode.cn/problems/lowest-common-ancestor-of-deepest-leaves/) | 中等 | 相同问题 |
| [236. 二叉树的最近公共祖先](https://leetcode.cn/problems/lowest-common-ancestor-of-a-binary-tree/) | 中等 | LCA 基础 |
| [104. 二叉树的最大深度](https://leetcode.cn/problems/maximum-depth-of-binary-tree/) | 简单 | 深度计算 |

## 总结

这道题展示了：

1. **多返回值**：
   - 同时返回深度和答案节点
   - 避免多次遍历

2. **条件判断**：
   - 哪边深，答案在哪边
   - 一样深，答案是当前节点

3. **LCA 思想**：
   - 最深叶子的 LCA 就是最小子树的根

核心洞见：
- 深度相等时，当前节点是 LCA
- 深度不等时，答案在更深的一边
- 一次遍历同时计算深度和答案
