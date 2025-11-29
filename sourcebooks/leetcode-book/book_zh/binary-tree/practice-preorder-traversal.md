# 实战：前序遍历

前序遍历是二叉树遍历的第一种形式，也是最容易理解的一种。它的访问顺序是：根节点 → 左子树 → 右子树。

## 问题描述

给定一个二叉树的根节点 `root`，返回它节点值的**前序遍历**。

**示例：**
```
输入：root = [1,null,2,3]
    1
     \
      2
     /
    3
输出：[1,2,3]
```

## 解法一：递归

递归是最直观的实现方式。前序遍历的定义本身就是递归的：先访问根，再递归遍历左子树，最后递归遍历右子树。

```javascript
function preorderTraversal(root) {
    const result = [];
    
    function traverse(node) {
        if (!node) return;
        
        result.push(node.val);   // 访问根
        traverse(node.left);      // 遍历左子树
        traverse(node.right);     // 遍历右子树
    }
    
    traverse(root);
    return result;
}
```

**复杂度分析：**
- 时间复杂度：O(n)，每个节点访问一次
- 空间复杂度：O(h)，h 为树的高度，递归调用栈的深度

## 解法二：迭代

迭代实现使用栈来模拟递归调用。关键点是：**先压入右子节点，再压入左子节点**，这样弹出时的顺序就是先左后右。

```javascript
function preorderTraversal(root) {
    if (!root) return [];
    
    const result = [];
    const stack = [root];
    
    while (stack.length) {
        const node = stack.pop();
        result.push(node.val);
        
        // 先右后左入栈，这样出栈时就是先左后右
        if (node.right) stack.push(node.right);
        if (node.left) stack.push(node.left);
    }
    
    return result;
}
```

**复杂度分析：**
- 时间复杂度：O(n)
- 空间复杂度：O(h)，栈的最大深度

## 解法三：Morris 遍历

Morris 遍历是一种空间复杂度 O(1) 的遍历方法，它利用叶子节点的空指针来存储信息，从而避免使用栈。

```javascript
function preorderTraversal(root) {
    const result = [];
    let curr = root;
    
    while (curr) {
        if (!curr.left) {
            // 没有左子树，直接访问并转向右子树
            result.push(curr.val);
            curr = curr.right;
        } else {
            // 找到左子树的最右节点
            let predecessor = curr.left;
            while (predecessor.right && predecessor.right !== curr) {
                predecessor = predecessor.right;
            }
            
            if (!predecessor.right) {
                // 第一次到达，访问当前节点，建立线索
                result.push(curr.val);
                predecessor.right = curr;
                curr = curr.left;
            } else {
                // 第二次到达，删除线索，转向右子树
                predecessor.right = null;
                curr = curr.right;
            }
        }
    }
    
    return result;
}
```

Morris 遍历的思想比较巧妙，面试中很少要求，了解即可。

## 小结

前序遍历的三种实现方式各有特点：
- **递归**：代码简洁，易于理解
- **迭代**：避免栈溢出，面试常考
- **Morris**：O(1) 空间，适合特殊场景

面试中推荐先写递归，再优化为迭代。递归思路清晰，迭代展示你对栈的理解。
