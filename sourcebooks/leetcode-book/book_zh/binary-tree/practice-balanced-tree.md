# 实战：平衡二叉树

平衡二叉树问题要求判断一棵树是否"高度平衡"。这道题看起来简单，但有一个常见的"低效陷阱"——让我们来看看如何避免它。

## 问题描述

给定一个二叉树，判断它是否是高度平衡的二叉树。

一棵高度平衡二叉树定义为：**每个节点**的左右两个子树的高度差的绝对值不超过 1。

**示例 1：**
```
输入：root = [3,9,20,null,null,15,7]
        3
       / \
      9  20
        /  \
       15   7
输出：true
```

**示例 2：**
```
输入：root = [1,2,2,3,3,null,null,4,4]
          1
         / \
        2   2
       / \
      3   3
     / \
    4   4
输出：false
```

## 低效解法：自顶向下

直觉上，我们可能会这样写：对于每个节点，计算左右子树的高度，检查差值是否超过 1。

```javascript
// 低效解法，时间复杂度 O(n²)
function isBalanced(root) {
    if (!root) return true;
    
    const leftHeight = getHeight(root.left);
    const rightHeight = getHeight(root.right);
    
    // 检查当前节点，并递归检查子树
    return Math.abs(leftHeight - rightHeight) <= 1 &&
           isBalanced(root.left) &&
           isBalanced(root.right);
}

function getHeight(node) {
    if (!node) return 0;
    return 1 + Math.max(getHeight(node.left), getHeight(node.right));
}
```

**问题在哪？**

对于每个节点，我们都要重新计算它的子树高度。如果树有 n 个节点，高度为 h，那么 `getHeight` 会被调用 O(n) 次，每次 O(h)，总时间复杂度是 O(nh)，最坏 O(n²)。

## 高效解法：自底向上

更好的方法是"自底向上"：在计算高度的同时，顺便检查是否平衡。如果发现不平衡，立即返回一个特殊值（如 -1）表示"不平衡"。

```javascript
function isBalanced(root) {
    return getHeight(root) !== -1;
}

function getHeight(node) {
    if (!node) return 0;
    
    // 先检查左子树
    const leftHeight = getHeight(node.left);
    if (leftHeight === -1) return -1;  // 左子树不平衡
    
    // 再检查右子树
    const rightHeight = getHeight(node.right);
    if (rightHeight === -1) return -1;  // 右子树不平衡
    
    // 检查当前节点
    if (Math.abs(leftHeight - rightHeight) > 1) {
        return -1;  // 当前节点不平衡
    }
    
    // 返回高度
    return 1 + Math.max(leftHeight, rightHeight);
}
```

**复杂度分析：**
- 时间复杂度：O(n)，每个节点只访问一次
- 空间复杂度：O(h)，递归深度

**为什么高效？**

自底向上方法只遍历树一次。每个节点的高度只计算一次，同时完成平衡性检查。这是"后序遍历"思想的典型应用：先处理子问题，再处理当前问题。

## 代码变体

也可以用对象返回高度和是否平衡：

```javascript
function isBalanced(root) {
    return check(root).balanced;
}

function check(node) {
    if (!node) return { height: 0, balanced: true };
    
    const left = check(node.left);
    if (!left.balanced) return { height: 0, balanced: false };
    
    const right = check(node.right);
    if (!right.balanced) return { height: 0, balanced: false };
    
    const balanced = Math.abs(left.height - right.height) <= 1;
    const height = 1 + Math.max(left.height, right.height);
    
    return { height, balanced };
}
```

这种写法更清晰，但用 -1 作为标志值的版本更常见，因为代码更简洁。

## 小结

平衡二叉树问题教给我们一个重要的优化技巧：**自底向上，一次遍历**。

自顶向下的方法虽然直观，但会导致重复计算。自底向上的方法在计算高度的同时完成检查，避免了重复工作。

这个思想在很多树的问题中都有应用：如果你发现自己在递归中反复计算同一个子问题，就应该考虑自底向上的方法。
