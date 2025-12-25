# 二叉树的层序遍历

LeetCode 102. Binary Tree Level Order Traversal

## 题目描述

给定一个二叉树的根节点 `root`，返回其节点值的层序遍历（即逐层地，从左到右访问所有节点）。

## 示例

```
输入：root = [3,9,20,null,null,15,7]

    3
   / \
  9  20
    /  \
   15   7

输出：[[3], [9, 20], [15, 7]]
```

## 思路分析

这是 BFS 层次遍历的经典应用。

关键点：
1. 使用队列存储待访问节点
2. 每一轮处理一整层
3. 处理前记录当前层的节点数

## 代码实现

```typescript
class TreeNode {
  val: number;
  left: TreeNode | null;
  right: TreeNode | null;
  constructor(val?: number, left?: TreeNode | null, right?: TreeNode | null) {
    this.val = val ?? 0;
    this.left = left ?? null;
    this.right = right ?? null;
  }
}

function levelOrder(root: TreeNode | null): number[][] {
  if (!root) return [];
  
  const result: number[][] = [];
  const queue: TreeNode[] = [root];
  
  while (queue.length > 0) {
    const levelSize = queue.length;
    const currentLevel: number[] = [];
    
    for (let i = 0; i < levelSize; i++) {
      const node = queue.shift()!;
      currentLevel.push(node.val);
      
      if (node.left) queue.push(node.left);
      if (node.right) queue.push(node.right);
    }
    
    result.push(currentLevel);
  }
  
  return result;
}
```

## 执行过程

```
初始：queue = [3]

第 1 轮：levelSize = 1
  处理 3，将 9, 20 入队
  queue = [9, 20]
  result = [[3]]

第 2 轮：levelSize = 2
  处理 9，无子节点
  处理 20，将 15, 7 入队
  queue = [15, 7]
  result = [[3], [9, 20]]

第 3 轮：levelSize = 2
  处理 15，无子节点
  处理 7，无子节点
  queue = []
  result = [[3], [9, 20], [15, 7]]
```

## 变体：层序遍历 II（自底向上）

LeetCode 107：返回自底向上的层序遍历。

```typescript
function levelOrderBottom(root: TreeNode | null): number[][] {
  const result = levelOrder(root);
  return result.reverse();
}
```

## 变体：锯齿形层序遍历

LeetCode 103：奇数层从左到右，偶数层从右到左。

```typescript
function zigzagLevelOrder(root: TreeNode | null): number[][] {
  if (!root) return [];
  
  const result: number[][] = [];
  const queue: TreeNode[] = [root];
  let leftToRight = true;
  
  while (queue.length > 0) {
    const levelSize = queue.length;
    const currentLevel: number[] = [];
    
    for (let i = 0; i < levelSize; i++) {
      const node = queue.shift()!;
      
      if (leftToRight) {
        currentLevel.push(node.val);
      } else {
        currentLevel.unshift(node.val);
      }
      
      if (node.left) queue.push(node.left);
      if (node.right) queue.push(node.right);
    }
    
    result.push(currentLevel);
    leftToRight = !leftToRight;
  }
  
  return result;
}
```

## 变体：每层最大值

LeetCode 515：找出每一层的最大值。

```typescript
function largestValues(root: TreeNode | null): number[] {
  if (!root) return [];
  
  const result: number[] = [];
  const queue: TreeNode[] = [root];
  
  while (queue.length > 0) {
    const levelSize = queue.length;
    let levelMax = -Infinity;
    
    for (let i = 0; i < levelSize; i++) {
      const node = queue.shift()!;
      levelMax = Math.max(levelMax, node.val);
      
      if (node.left) queue.push(node.left);
      if (node.right) queue.push(node.right);
    }
    
    result.push(levelMax);
  }
  
  return result;
}
```

## 变体：每层平均值

LeetCode 637：计算每一层的平均值。

```typescript
function averageOfLevels(root: TreeNode | null): number[] {
  if (!root) return [];
  
  const result: number[] = [];
  const queue: TreeNode[] = [root];
  
  while (queue.length > 0) {
    const levelSize = queue.length;
    let levelSum = 0;
    
    for (let i = 0; i < levelSize; i++) {
      const node = queue.shift()!;
      levelSum += node.val;
      
      if (node.left) queue.push(node.left);
      if (node.right) queue.push(node.right);
    }
    
    result.push(levelSum / levelSize);
  }
  
  return result;
}
```

## 变体：右侧视图

LeetCode 199：从右侧看二叉树，输出能看到的节点。

```typescript
function rightSideView(root: TreeNode | null): number[] {
  if (!root) return [];
  
  const result: number[] = [];
  const queue: TreeNode[] = [root];
  
  while (queue.length > 0) {
    const levelSize = queue.length;
    
    for (let i = 0; i < levelSize; i++) {
      const node = queue.shift()!;
      
      // 每层最后一个节点就是右侧能看到的
      if (i === levelSize - 1) {
        result.push(node.val);
      }
      
      if (node.left) queue.push(node.left);
      if (node.right) queue.push(node.right);
    }
  }
  
  return result;
}
```

## 复杂度分析

- **时间复杂度**：O(n)，每个节点访问一次
- **空间复杂度**：O(w)，w 是树的最大宽度（最坏情况 O(n)）

## 相关题目

| 题号 | 题目 | 难度 |
|------|------|------|
| 102 | 二叉树的层序遍历 | 中等 |
| 103 | 锯齿形层序遍历 | 中等 |
| 107 | 层序遍历 II | 中等 |
| 199 | 二叉树的右视图 | 中等 |
| 515 | 每层最大值 | 中等 |
| 637 | 每层平均值 | 简单 |
| 429 | N 叉树的层序遍历 | 中等 |
