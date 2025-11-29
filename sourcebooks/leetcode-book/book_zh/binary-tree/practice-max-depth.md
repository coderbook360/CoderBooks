# 实战：二叉树的最大深度

计算二叉树的最大深度是最经典的入门递归题。它简单到只需要几行代码，却完美展示了递归解决二叉树问题的精髓。

## 问题描述

给定一个二叉树，找出其最大深度。

二叉树的深度为根节点到最远叶子节点的最长路径上的节点数。

**示例：**
```
输入：
    3
   / \
  9  20
    /  \
   15   7
输出：3
```

## 解法一：递归（DFS）

这道题的递归思路非常直观：**一棵树的最大深度 = 1 + 左右子树最大深度的较大值**。

```javascript
function maxDepth(root) {
    if (!root) return 0;
    
    const leftDepth = maxDepth(root.left);
    const rightDepth = maxDepth(root.right);
    
    return 1 + Math.max(leftDepth, rightDepth);
}
```

简化为一行：

```javascript
function maxDepth(root) {
    return root ? 1 + Math.max(maxDepth(root.left), maxDepth(root.right)) : 0;
}
```

**复杂度分析：**
- 时间复杂度：O(n)，每个节点访问一次
- 空间复杂度：O(h)，h 为树的高度，最坏 O(n)

## 解法二：迭代（BFS）

用层序遍历也可以求最大深度。每遍历一层，深度加 1，最后的层数就是最大深度。

```javascript
function maxDepth(root) {
    if (!root) return 0;
    
    let depth = 0;
    const queue = [root];
    
    while (queue.length) {
        const levelSize = queue.length;
        depth++;
        
        for (let i = 0; i < levelSize; i++) {
            const node = queue.shift();
            if (node.left) queue.push(node.left);
            if (node.right) queue.push(node.right);
        }
    }
    
    return depth;
}
```

**复杂度分析：**
- 时间复杂度：O(n)
- 空间复杂度：O(w)，w 为树的最大宽度

## 递归思维的核心

这道题虽然简单，但它展示了解决二叉树问题的核心思维：

1. **定义子问题**：左子树的最大深度、右子树的最大深度
2. **递归边界**：空节点的深度是 0
3. **合并结果**：当前树的深度 = 1 + max(左深度, 右深度)

这个思维模式适用于几乎所有二叉树的递归问题。当你遇到一个新问题时，先问自己：如果我知道了左右子树的答案，能否推出整棵树的答案？

## 小结

最大深度问题是二叉树递归的入门题，但它蕴含的思想是通用的。掌握了"子问题 + 边界 + 合并"的递归模式，你就能轻松应对大多数二叉树问题。
