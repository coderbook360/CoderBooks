# 实战：中序遍历

中序遍历是二叉树遍历中最有"意义"的一种。它的访问顺序是：左子树 → 根节点 → 右子树。对于二叉搜索树，中序遍历的结果恰好是有序的。

## 问题描述

给定一个二叉树的根节点 `root`，返回它节点值的**中序遍历**。

**示例：**
```
输入：root = [1,null,2,3]
    1
     \
      2
     /
    3
输出：[1,3,2]
```

## 解法一：递归

递归实现非常简洁。先递归遍历左子树，再访问根节点，最后递归遍历右子树。

```javascript
function inorderTraversal(root) {
    const result = [];
    
    function traverse(node) {
        if (!node) return;
        
        traverse(node.left);      // 遍历左子树
        result.push(node.val);    // 访问根
        traverse(node.right);     // 遍历右子树
    }
    
    traverse(root);
    return result;
}
```

**复杂度分析：**
- 时间复杂度：O(n)
- 空间复杂度：O(h)，h 为树的高度

## 解法二：迭代

中序遍历的迭代实现比前序稍微复杂。核心思想是：**先把所有左子节点压入栈，然后弹出、访问、转向右子树**。

```javascript
function inorderTraversal(root) {
    const result = [];
    const stack = [];
    let curr = root;
    
    while (curr || stack.length) {
        // 一路向左，把所有左子节点压入栈
        while (curr) {
            stack.push(curr);
            curr = curr.left;
        }
        
        // 弹出栈顶节点，访问它
        curr = stack.pop();
        result.push(curr.val);
        
        // 转向右子树
        curr = curr.right;
    }
    
    return result;
}
```

**理解迭代的关键**：我们模拟的是递归调用栈的行为。每次"一路向左"相当于递归调用左子树；弹出栈顶相当于递归返回；访问后转向右子树相当于进入右子树的递归。

## 解法三：Morris 遍历

Morris 中序遍历同样利用叶子节点的空指针，实现 O(1) 空间复杂度：

```javascript
function inorderTraversal(root) {
    const result = [];
    let curr = root;
    
    while (curr) {
        if (!curr.left) {
            // 没有左子树，直接访问并转向右子树
            result.push(curr.val);
            curr = curr.right;
        } else {
            // 找到左子树的最右节点（前驱节点）
            let predecessor = curr.left;
            while (predecessor.right && predecessor.right !== curr) {
                predecessor = predecessor.right;
            }
            
            if (!predecessor.right) {
                // 第一次到达，建立线索
                predecessor.right = curr;
                curr = curr.left;
            } else {
                // 第二次到达，访问当前节点，删除线索
                predecessor.right = null;
                result.push(curr.val);
                curr = curr.right;
            }
        }
    }
    
    return result;
}
```

注意中序 Morris 遍历与前序的区别：访问节点的时机不同。中序是在第二次到达时访问（从左子树返回），前序是在第一次到达时访问。

## 中序遍历的重要性

中序遍历对于**二叉搜索树（BST）**有特殊意义：BST 的中序遍历结果是**升序排列**的。

这个性质非常有用。很多 BST 的问题都可以转化为中序遍历：
- 验证 BST
- 找 BST 中第 k 小的元素
- 找 BST 中两个节点的最小差值

## 小结

中序遍历是二叉树遍历中最重要的一种，尤其在处理 BST 问题时。掌握递归和迭代两种实现方式，是解决二叉树问题的基本功。
