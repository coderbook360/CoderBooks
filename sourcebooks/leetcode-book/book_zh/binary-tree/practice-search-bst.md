# 实战：二叉搜索树中的搜索

这是BST最基础的操作——查找。虽然简单，但它是理解BST效率的起点。

## 问题描述

给定BST的根节点`root`和一个整数值`val`，在BST中查找节点值等于`val`的节点，返回该节点的子树。如果不存在，返回`null`。

**示例**：
```
        4
       / \
      2   7
     / \
    1   3

val = 2  →  返回以2为根的子树
    2
   / \
  1   3

val = 5  →  返回 null
```

## 思路分析

BST的查找利用了其**有序性质**：
- 如果目标值 < 当前节点值 → 往左找
- 如果目标值 > 当前节点值 → 往右找
- 如果目标值 = 当前节点值 → 找到了

每次比较都能排除一半的节点，这就是二分查找的本质。

## 解法一：递归

```javascript
/**
 * @param {TreeNode} root
 * @param {number} val
 * @return {TreeNode}
 */
function searchBST(root, val) {
    // 基础情况：空树或找到目标
    if (!root || root.val === val) {
        return root;
    }
    
    // 根据大小决定搜索方向
    if (val < root.val) {
        return searchBST(root.left, val);
    } else {
        return searchBST(root.right, val);
    }
}
```

更简洁的写法：

```javascript
function searchBST(root, val) {
    if (!root || root.val === val) return root;
    return val < root.val 
        ? searchBST(root.left, val) 
        : searchBST(root.right, val);
}
```

## 解法二：迭代

```javascript
function searchBST(root, val) {
    let curr = root;
    
    while (curr) {
        if (curr.val === val) {
            return curr;
        }
        curr = val < curr.val ? curr.left : curr.right;
    }
    
    return null;
}
```

迭代版本更简洁，且不需要栈空间。

## 执行过程

```
        4
       / \
      2   7
     / \
    1   3

搜索 val = 3：

curr = 4
  3 < 4，往左
curr = 2
  3 > 2，往右
curr = 3
  3 = 3，找到！返回节点3
```

## 与普通二叉树搜索对比

普通二叉树没有有序性，必须遍历所有节点：

```javascript
// 普通二叉树搜索 - O(n)
function searchTree(root, val) {
    if (!root) return null;
    if (root.val === val) return root;
    return searchTree(root.left, val) || searchTree(root.right, val);
}
```

| 方面 | BST搜索 | 普通二叉树搜索 |
|------|---------|---------------|
| 时间复杂度 | O(h) | O(n) |
| 搜索方向 | 确定（左或右） | 不确定（都要搜） |

## 复杂度分析

**时间复杂度**：O(h)
- h是树的高度
- 平衡BST：O(log n)
- 最坏情况（链状）：O(n)

**空间复杂度**：
- 递归：O(h)
- 迭代：O(1)

## 小结

BST搜索是最基础的操作，它体现了BST的核心价值：

1. **有序性带来效率**：每次比较都能缩小一半的搜索范围
2. **时间复杂度取决于高度**：这就是为什么平衡很重要
3. **迭代优于递归**：代码更简洁，空间更省

掌握了搜索，接下来学习插入和删除就更容易理解了。
