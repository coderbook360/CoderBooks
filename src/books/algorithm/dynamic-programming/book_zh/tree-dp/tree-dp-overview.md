# 树形 DP 概述

树形 DP 是在树结构上进行动态规划的技术，利用树的递归性质自底向上或自顶向下地计算。

## 什么是树形 DP

树是一种特殊的图：
- 无环
- 任意两点间有且仅有一条路径
- n 个节点有 n-1 条边

树形 DP 利用树的递归结构：
- 每个子树是独立的子问题
- 父节点的答案可以由子节点的答案推导

## 为什么树形 DP 重要

树形 DP 是解决树上问题的核心技术：

1. **路径问题**：最长路径、最大路径和
2. **子树问题**：子树大小、子树权值
3. **覆盖问题**：最小覆盖、最大独立集
4. **染色问题**：树的染色方案数

## 基本框架

### 自底向上（后序遍历）

```typescript
function dfs(node: TreeNode | null): number {
  if (!node) return baseCase;
  
  // 1. 递归处理子树
  const leftResult = dfs(node.left);
  const rightResult = dfs(node.right);
  
  // 2. 利用子树结果计算当前节点
  const result = combine(leftResult, rightResult, node.val);
  
  // 3. 可能更新全局答案
  updateGlobalAnswer(result);
  
  return result;
}
```

### 自顶向下（前序遍历）

```typescript
function dfs(node: TreeNode | null, parentInfo: any): void {
  if (!node) return;
  
  // 1. 利用父节点信息计算当前节点
  const currentInfo = compute(parentInfo, node);
  
  // 2. 可能更新答案
  updateAnswer(currentInfo);
  
  // 3. 递归处理子树
  dfs(node.left, currentInfo);
  dfs(node.right, currentInfo);
}
```

## 常见模式

### 模式 1：单状态

每个节点只需要一个值。

```typescript
// 示例：二叉树的最大深度
function maxDepth(root: TreeNode | null): number {
  if (!root) return 0;
  
  return 1 + Math.max(
    maxDepth(root.left),
    maxDepth(root.right)
  );
}
```

### 模式 2：双状态

每个节点需要两种情况的值。

```typescript
// 示例：打家劫舍 III（选或不选当前节点）
function rob(root: TreeNode | null): number {
  function dfs(node: TreeNode | null): [number, number] {
    if (!node) return [0, 0];  // [选, 不选]
    
    const [leftRob, leftNot] = dfs(node.left);
    const [rightRob, rightNot] = dfs(node.right);
    
    // 选当前节点：子节点都不能选
    const robThis = node.val + leftNot + rightNot;
    
    // 不选当前节点：子节点可选可不选
    const notRobThis = Math.max(leftRob, leftNot) 
                     + Math.max(rightRob, rightNot);
    
    return [robThis, notRobThis];
  }
  
  const [rob, notRob] = dfs(root);
  return Math.max(rob, notRob);
}
```

### 模式 3：路径问题

需要在递归过程中更新全局答案。

```typescript
// 示例：二叉树的直径
function diameterOfBinaryTree(root: TreeNode | null): number {
  let maxDiameter = 0;
  
  function depth(node: TreeNode | null): number {
    if (!node) return 0;
    
    const leftDepth = depth(node.left);
    const rightDepth = depth(node.right);
    
    // 更新直径：经过当前节点的最长路径
    maxDiameter = Math.max(maxDiameter, leftDepth + rightDepth);
    
    // 返回以当前节点为端点的最长路径
    return 1 + Math.max(leftDepth, rightDepth);
  }
  
  depth(root);
  return maxDiameter;
}
```

### 模式 4：换根 DP

需要计算以每个节点为根的答案。

```typescript
// 两次 DFS：
// 第一次：计算以某个节点为根的信息
// 第二次：利用父节点信息推导其他节点

function solve(root: TreeNode): number[] {
  const n = getNodeCount(root);
  const result: number[] = Array(n).fill(0);
  
  // 第一次 DFS：计算子树信息
  function dfs1(node: TreeNode): number {
    // ...
  }
  
  // 第二次 DFS：换根计算
  function dfs2(node: TreeNode, parentContribution: number): void {
    result[node.id] = computeResult(node, parentContribution);
    
    for (const child of node.children) {
      const contribution = computeContribution(node, child);
      dfs2(child, contribution);
    }
  }
  
  dfs1(root);
  dfs2(root, 0);
  
  return result;
}
```

## 状态设计要点

### 1. 确定子问题

思考：对于每个节点，需要知道什么信息？

- 子树的最大值？最小值？
- 子树的大小？高度？
- 选或不选当前节点的最优解？

### 2. 确定状态转移

思考：如何从子节点的答案得到父节点的答案？

- 直接取最大/最小？
- 需要加上当前节点的贡献？
- 需要考虑多种情况？

### 3. 确定返回值

思考：父节点需要子节点提供什么信息？

- 单个值还是多个值？
- 是否需要返回整个路径信息？

## 复杂度分析

树形 DP 的典型复杂度：

- **时间**：O(n)，每个节点访问一次
- **空间**：O(h)，h 为树高（递归栈）

## 本章内容

本章将介绍：

1. **基础问题**：二叉树直径、最大路径和
2. **选择问题**：打家劫舍、最大独立集
3. **覆盖问题**：监控二叉树
4. **换根 DP**：树中距离之和

## 总结

树形 DP 的核心：

1. **递归思维**：把大树拆成小树
2. **状态设计**：确定每个节点需要记录什么
3. **转移关系**：如何从子节点推导父节点
4. **全局更新**：何时更新全局答案

掌握这些模式，树形 DP 问题就变得有章可循。
