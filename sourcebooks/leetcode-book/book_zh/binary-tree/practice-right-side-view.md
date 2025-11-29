# 实战：二叉树的右视图

右视图问题要求返回站在树的右侧能看到的节点。这是一道典型的层序遍历变体题。

## 问题描述

给定一个二叉树的**根节点** `root`，想象自己站在它的右侧，按照从顶部到底部的顺序，返回从右侧所能看到的节点值。

**示例：**
```
输入：root = [1,2,3,null,5,null,4]
        1            <---
       / \
      2   3          <---
       \   \
        5   4        <---
输出：[1,3,4]
```

## 思路分析

站在右边看，每一层只能看到最右边的节点。所以问题变成：**找出每一层的最后一个节点**。

层序遍历是解决这类问题的最佳方法。

## 解法一：BFS（层序遍历）

层序遍历时，记录每一层的最后一个节点：

```javascript
function rightSideView(root) {
    if (!root) return [];
    
    const result = [];
    const queue = [root];
    
    while (queue.length) {
        const levelSize = queue.length;
        
        for (let i = 0; i < levelSize; i++) {
            const node = queue.shift();
            
            // 每层的最后一个节点
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

**复杂度分析：**
- 时间复杂度：O(n)
- 空间复杂度：O(w)，w 为树的最大宽度

## 解法二：DFS

也可以用 DFS 解决。关键是：**按照"根-右-左"的顺序遍历**，并记录当前深度。每次到达一个新的深度时，就是该深度的最右节点。

```javascript
function rightSideView(root) {
    const result = [];
    
    function dfs(node, depth) {
        if (!node) return;
        
        // 第一次到达这个深度，就是最右边的节点
        if (depth === result.length) {
            result.push(node.val);
        }
        
        // 先右后左，保证右边的节点先被访问
        dfs(node.right, depth + 1);
        dfs(node.left, depth + 1);
    }
    
    dfs(root, 0);
    return result;
}
```

**为什么先右后左？**

因为我们要找每层最右边的节点。先访问右子树，确保右边的节点先被加入结果。当 `depth === result.length` 时，说明这是第一次到达这个深度，此时访问的一定是最右边的节点。

## 变体：左视图

如果要求左视图呢？只需要改变遍历顺序：

BFS 方法：记录每层的第一个节点（`i === 0`）。

DFS 方法：先左后右遍历。

```javascript
function leftSideView(root) {
    const result = [];
    
    function dfs(node, depth) {
        if (!node) return;
        
        if (depth === result.length) {
            result.push(node.val);
        }
        
        dfs(node.left, depth + 1);   // 先左
        dfs(node.right, depth + 1);  // 后右
    }
    
    dfs(root, 0);
    return result;
}
```

## 小结

右视图问题本质上是"找每层的最后一个节点"。BFS 方法直观，DFS 方法巧妙。

这道题展示了一个技巧：**通过改变遍历顺序来解决问题**。想找最右边的？先遍历右子树。想找最左边的？先遍历左子树。

理解这个技巧，你就能轻松应对各种"视图"类问题。
