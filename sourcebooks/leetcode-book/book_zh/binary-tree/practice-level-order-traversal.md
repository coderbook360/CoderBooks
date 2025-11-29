# 实战：层序遍历

层序遍历是二叉树遍历中唯一的"广度优先"方式。它按照从上到下、从左到右的顺序，一层一层地访问节点。层序遍历是很多二叉树问题的基础，比如找最大宽度、最左节点、判断完全二叉树等。

## 问题描述

给定一个二叉树的根节点 `root`，返回其节点值的**层序遍历**。（即逐层地，从左到右访问所有节点）

**示例：**
```
输入：root = [3,9,20,null,null,15,7]
        3
       / \
      9  20
        /  \
       15   7
输出：[[3],[9,20],[15,7]]
```

## 解法：BFS + 队列

层序遍历的标准实现使用队列。关键技巧是：**在遍历每一层之前，先记录当前队列的长度**，这个长度就是当前层的节点数。

```javascript
function levelOrder(root) {
    if (!root) return [];
    
    const result = [];
    const queue = [root];
    
    while (queue.length) {
        const levelSize = queue.length;  // 当前层的节点数
        const level = [];
        
        for (let i = 0; i < levelSize; i++) {
            const node = queue.shift();
            level.push(node.val);
            
            // 把下一层的节点加入队列
            if (node.left) queue.push(node.left);
            if (node.right) queue.push(node.right);
        }
        
        result.push(level);
    }
    
    return result;
}
```

**代码解读：**
1. 初始时队列中只有根节点
2. `levelSize` 记录当前层有多少个节点
3. 内层 for 循环精确地处理完当前层的所有节点
4. 处理每个节点时，把它的子节点加入队列（下一层的节点）
5. 当前层处理完后，队列中剩下的就是下一层的所有节点

**复杂度分析：**
- 时间复杂度：O(n)，每个节点访问一次
- 空间复杂度：O(w)，w 是树的最大宽度（完全二叉树的最后一层约有 n/2 个节点）

## 变体：自底向上的层序遍历

有时候我们需要从底层到顶层的顺序输出。只需要把每层的结果插入到结果数组的开头即可：

```javascript
function levelOrderBottom(root) {
    if (!root) return [];
    
    const result = [];
    const queue = [root];
    
    while (queue.length) {
        const levelSize = queue.length;
        const level = [];
        
        for (let i = 0; i < levelSize; i++) {
            const node = queue.shift();
            level.push(node.val);
            if (node.left) queue.push(node.left);
            if (node.right) queue.push(node.right);
        }
        
        result.unshift(level);  // 插入到开头
    }
    
    return result;
}
```

## 变体：锯齿形层序遍历

锯齿形遍历要求奇数层从左到右，偶数层从右到左（或反过来）：

```javascript
function zigzagLevelOrder(root) {
    if (!root) return [];
    
    const result = [];
    const queue = [root];
    let leftToRight = true;
    
    while (queue.length) {
        const levelSize = queue.length;
        const level = [];
        
        for (let i = 0; i < levelSize; i++) {
            const node = queue.shift();
            
            if (leftToRight) {
                level.push(node.val);
            } else {
                level.unshift(node.val);  // 插入到开头，实现反向
            }
            
            if (node.left) queue.push(node.left);
            if (node.right) queue.push(node.right);
        }
        
        result.push(level);
        leftToRight = !leftToRight;  // 方向交替
    }
    
    return result;
}
```

## 层序遍历的应用

层序遍历是很多问题的基础：

**找每层的最大/最小值**：遍历每层时记录极值。

**找最左/最右的节点**：每层的第一个或最后一个节点。

**计算树的宽度**：每层的节点数，取最大值。

**判断完全二叉树**：层序遍历过程中，如果遇到空节点后又遇到非空节点，则不是完全二叉树。

## 小结

层序遍历是二叉树 BFS 的核心。掌握"用队列 + 记录层大小"这个模板，你就能轻松应对各种层序遍历的变体问题。

相比 DFS 的前/中/后序遍历，层序遍历更适合处理与"层"相关的问题。当你看到题目要求按层处理、或者需要知道节点的深度信息时，首先考虑层序遍历。
