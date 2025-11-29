# 实战：翻转二叉树

翻转二叉树是一道非常经典的面试题。据说 Homebrew 的作者 Max Howell 因为没有在白板上写出这道题，被 Google 拒绝了。这个故事让这道题变得"臭名昭著"。

不过别担心，这道题其实非常简单。

## 问题描述

给你一棵二叉树的根节点 `root`，翻转这棵二叉树，并返回其根节点。

**示例：**
```
输入：
        4
       / \
      2   7
     / \ / \
    1  3 6  9

输出：
        4
       / \
      7   2
     / \ / \
    9  6 3  1
```

## 思路分析

翻转二叉树就是把每个节点的左右子节点互换。

递归思路非常直观：
1. 交换当前节点的左右子节点
2. 递归翻转左子树
3. 递归翻转右子树

## 解法一：递归

```javascript
function invertTree(root) {
    if (!root) return null;
    
    // 交换左右子节点
    [root.left, root.right] = [root.right, root.left];
    
    // 递归翻转左右子树
    invertTree(root.left);
    invertTree(root.right);
    
    return root;
}
```

还可以用更函数式的写法：

```javascript
function invertTree(root) {
    if (!root) return null;
    
    // 递归翻转，同时交换
    [root.left, root.right] = [invertTree(root.right), invertTree(root.left)];
    
    return root;
}
```

**复杂度分析：**
- 时间复杂度：O(n)，每个节点访问一次
- 空间复杂度：O(h)，递归深度

## 解法二：迭代（BFS）

用层序遍历也可以实现。遍历每个节点时，交换它的左右子节点。

```javascript
function invertTree(root) {
    if (!root) return null;
    
    const queue = [root];
    
    while (queue.length) {
        const node = queue.shift();
        
        // 交换左右子节点
        [node.left, node.right] = [node.right, node.left];
        
        if (node.left) queue.push(node.left);
        if (node.right) queue.push(node.right);
    }
    
    return root;
}
```

## 解法三：迭代（DFS）

用栈进行深度优先遍历：

```javascript
function invertTree(root) {
    if (!root) return null;
    
    const stack = [root];
    
    while (stack.length) {
        const node = stack.pop();
        
        [node.left, node.right] = [node.right, node.left];
        
        if (node.left) stack.push(node.left);
        if (node.right) stack.push(node.right);
    }
    
    return root;
}
```

## 小结

翻转二叉树虽然简单，但它展示了一个重要的思想：**对树的每个节点做相同的操作**。无论用递归还是迭代，核心都是"遍历 + 操作"。

这道题告诉我们，不要小看任何一道简单题。面试时紧张，越简单的题越容易出错。把基础打牢，才能在关键时刻稳定发挥。
