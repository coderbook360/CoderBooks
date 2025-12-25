# 二叉树的直径

## 题目描述

**LeetCode 543. Diameter of Binary Tree**

给你一棵二叉树的根节点，返回该树的直径。

二叉树的直径是指树中任意两个节点之间最长路径的长度。这条路径可能经过也可能不经过根节点 root。

两节点之间路径的长度由它们之间边的数目表示。

**示例 1**：
```
输入：root = [1,2,3,4,5]
输出：3
解释：最长路径是 [4,2,1,3] 或 [5,2,1,3]
```

**示例 2**：
```
输入：root = [1,2]
输出：1
```

**约束**：
- 树中节点数目在范围 `[1, 10^4]` 内
- `-100 <= Node.val <= 100`

## 思路分析

直径 = 最长路径的边数。

关键观察：最长路径必定以某个节点为"拐点"，向左右两边延伸。

对于每个节点 `node`：
- 经过它的最长路径 = 左子树深度 + 右子树深度
- 树的直径 = 所有节点中"经过它的最长路径"的最大值

## 解法：树形 DP

```typescript
function diameterOfBinaryTree(root: TreeNode | null): number {
  let maxDiameter = 0;
  
  // 返回以 node 为根的子树的深度（边数）
  function depth(node: TreeNode | null): number {
    if (!node) return 0;
    
    const leftDepth = depth(node.left);
    const rightDepth = depth(node.right);
    
    // 更新直径：经过当前节点的最长路径
    maxDiameter = Math.max(maxDiameter, leftDepth + rightDepth);
    
    // 返回深度（往下走的最长边数）
    return 1 + Math.max(leftDepth, rightDepth);
  }
  
  depth(root);
  return maxDiameter;
}
```

**代码解析**：

1. **递归定义**：`depth(node)` 返回以 `node` 为根的子树深度
2. **状态转移**：深度 = 1 + max(左子树深度, 右子树深度)
3. **全局更新**：在计算过程中更新 `maxDiameter`

**图解**：
```
       1
      / \
     2   3
    / \
   4   5

depth(4) = 0
depth(5) = 0
depth(2) = 1 + max(0, 0) = 1，更新直径 = 0 + 0 = 0
depth(3) = 0
depth(1) = 1 + max(1, 0) = 2，更新直径 = 1 + 0 = 1

等等，这里计算有误。让我重新分析：

depth(4) = 0（叶子节点到自己没有边）
实际上应该返回 1（从父节点到该节点的边）

让我重新定义：
- depth(node) 返回从 node 往下能走的最大边数
- 叶子节点返回 0
- 非叶子节点返回 1 + max(左, 右)

depth(4) = 0
depth(5) = 0  
depth(2)：
  - leftDepth = 0, rightDepth = 0
  - 直径候选 = 0 + 0 = 0
  - 返回 1 + max(0, 0) = 1

depth(3) = 0
depth(1)：
  - leftDepth = 1, rightDepth = 0
  - 直径候选 = 1 + 0 = 1
  - 返回 1 + max(1, 0) = 2

问题：depth(2) 时没有正确计算经过它的直径。

修正理解：
- 经过节点 2 的路径：4 → 2 → 5，边数 = 2
- depth(4) = 0, depth(5) = 0
- 但经过 2 的路径长度 = (4到2的边) + (5到2的边) = 1 + 1 = 2

原来如此！
- 当我们在节点 2 时
- leftDepth = depth(4) = 0（4 往下的深度）
- 但从 4 到 2 有一条边，从 5 到 2 也有一条边
- 经过 2 的路径 = (1 + leftDepth) + (1 + rightDepth) - 2 + 2 = ?

让我换个角度：
- depth(node) 返回"从 node 出发能达到的最远距离（边数）"
- 叶子：depth = 0
- 非叶子：depth = 1 + max(左子树depth, 右子树depth)

经过 node 的最长路径：
- 往左走最远 + 往右走最远
- = (1 + leftDepth) + (1 + rightDepth) 当有两个子节点时
- 不对，应该是 leftDepth + rightDepth

实际上代码是对的：
- leftDepth 是左子树的 depth，已经包含了从 node.left 往下的边
- 从 node 往左走 = 1（node 到 left 的边）+ leftDepth
- 但我们在 node.left 处返回时，返回的是 1 + max(...)
- 所以在 node 处看到的 leftDepth 已经是 1 + ...

让我用正确的递推：
depth(null) = 0
depth(4) = 1 + max(0, 0) = 1  // 但 4 是叶子，按代码 depth(null)=0
                              // depth(4) = 1 + max(depth(null), depth(null)) = 1
depth(5) = 1
depth(2) = 1 + max(depth(4), depth(5)) = 1 + max(1, 1) = 2
  更新直径 = depth(4) + depth(5) = 1 + 1 = 2
depth(3) = 1 + max(0, 0) = 1
depth(1) = 1 + max(depth(2), depth(3)) = 1 + max(2, 1) = 3
  更新直径 = depth(2) + depth(3) = 2 + 1 = 3

最终直径 = 3 ✓
```

让我重新写一个更清晰的版本：

```typescript
function diameterOfBinaryTree(root: TreeNode | null): number {
  let diameter = 0;
  
  // 返回从 node 向下能走的最远边数
  function longestPath(node: TreeNode | null): number {
    if (!node) return 0;
    
    // 左右子树各自的最远路径
    const left = longestPath(node.left);
    const right = longestPath(node.right);
    
    // 经过 node 的路径长度 = 左路径 + 右路径
    diameter = Math.max(diameter, left + right);
    
    // 返回从 node 向下的最远距离
    // = 1（到子节点的边）+ 子节点的最远距离
    // 但如果子节点为空，left 或 right = 0，整个表达式自然处理了
    return 1 + Math.max(left, right);
  }
  
  longestPath(root);
  return diameter;
}
```

实际上原始代码完全正确，关键理解：
- `depth(node)` 返回的是"从 node 向下能达到的最远深度"
- 对于空节点返回 0
- 对于叶子节点返回 0（因为没有子节点可以继续往下走）
- 等等，叶子节点：`1 + max(0, 0) = 1`

让我再仔细看一遍：

```
depth(null) = 0

depth(叶子) = 1 + max(depth(null), depth(null)) = 1 + 0 = 1
```

所以对于示例 [1,2,3,4,5]：
- depth(4) = 1, depth(5) = 1
- depth(2): left=1, right=1, diameter 候选=2, 返回 1+max(1,1)=2
- depth(3): 返回 1
- depth(1): left=2, right=1, diameter 候选=3, 返回 1+max(2,1)=3

答案 diameter = 3 ✓

但这个"深度"定义是"节点数"而非"边数"？

仔细看代码，实际返回的是"从 node 向下能走到的最远节点数"。

而直径的定义是边数，路径 4-2-1-3 有 3 条边。

在这个定义下：
- depth(4) = 1（包含节点 4 本身）
- depth(2) = 2（节点 2, 4 或 2, 5）
- 经过节点 2 的路径长度（边数）= (depth(4)-1) + (depth(5)-1) + 2 = 0+0+2=2
  或者直接 = depth(4) + depth(5) = 2（因为 4 到 2 再到 5 共 2 条边）

哦我懂了：
- 经过 node 的路径边数 = leftDepth + rightDepth
- 这是因为 leftDepth 是"从 node 向左能走的最远节点数"
- 从节点 4 到节点 5 的路径：4 → 2 → 5
- 边数 = leftDepth + rightDepth = 1 + 1 = 2（这正是经过 2 的路径）

最终：diameter = 3，对应路径 4-2-1-3 或 5-2-1-3。
```

**复杂度分析**：
- 时间：O(n)，每个节点访问一次
- 空间：O(h)，h 为树高（递归栈）

## 变体：返回节点数

如果题目要求返回路径上的节点数而非边数：

```typescript
function diameterNodes(root: TreeNode | null): number {
  let maxNodes = 0;
  
  function depth(node: TreeNode | null): number {
    if (!node) return 0;
    
    const left = depth(node.left);
    const right = depth(node.right);
    
    // 经过当前节点的路径节点数 = 左 + 右 + 1（当前节点）
    maxNodes = Math.max(maxNodes, left + right + 1);
    
    return 1 + Math.max(left, right);
  }
  
  depth(root);
  return maxNodes;
}
```

## 相关题目

| 题目 | 难度 | 说明 |
|------|------|------|
| [124. 二叉树中的最大路径和](https://leetcode.cn/problems/binary-tree-maximum-path-sum/) | 困难 | 带权值 |
| [687. 最长同值路径](https://leetcode.cn/problems/longest-univalue-path/) | 中等 | 相同值约束 |
| [1245. 树的直径](https://leetcode.cn/problems/tree-diameter/) | 中等 | 一般树 |

## 总结

这道题展示了树形 DP 的经典模式：

1. **递归计算**：每个节点返回一个值给父节点
2. **全局更新**：在递归过程中更新全局答案
3. **返回值 ≠ 答案**：返回给父节点的值和最终答案是不同的

核心洞见：
- 直径路径必定经过某个"拐点"节点
- 对每个节点计算"经过它的最长路径"
- 取所有节点中的最大值
