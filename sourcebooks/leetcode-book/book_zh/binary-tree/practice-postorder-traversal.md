# 实战：后序遍历

后序遍历是二叉树遍历中最"谨慎"的一种。它的访问顺序是：左子树 → 右子树 → 根节点。先处理完所有子问题，最后处理当前问题——这正是很多递归问题的本质。

## 问题描述

给定一个二叉树的根节点 `root`，返回它节点值的**后序遍历**。

**示例：**
```
输入：root = [1,null,2,3]
    1
     \
      2
     /
    3
输出：[3,2,1]
```

## 解法一：递归

递归实现依然简洁明了。先递归遍历左子树和右子树，最后访问根节点。

```javascript
function postorderTraversal(root) {
    const result = [];
    
    function traverse(node) {
        if (!node) return;
        
        traverse(node.left);      // 遍历左子树
        traverse(node.right);     // 遍历右子树
        result.push(node.val);    // 访问根
    }
    
    traverse(root);
    return result;
}
```

**复杂度分析：**
- 时间复杂度：O(n)
- 空间复杂度：O(h)

## 解法二：迭代（反转技巧）

后序遍历的迭代实现有一个巧妙的技巧：

后序遍历是"左-右-根"，如果我们按"根-右-左"的顺序遍历（类似前序，但先压左再压右），然后**反转结果**，就得到后序遍历了。

```javascript
function postorderTraversal(root) {
    if (!root) return [];
    
    const result = [];
    const stack = [root];
    
    while (stack.length) {
        const node = stack.pop();
        result.push(node.val);
        
        // 先左后右入栈，这样出栈时是先右后左
        // 结果是：根-右-左
        if (node.left) stack.push(node.left);
        if (node.right) stack.push(node.right);
    }
    
    // 反转得到：左-右-根
    return result.reverse();
}
```

这个方法代码简洁，但需要额外的反转操作。

## 解法三：迭代（标准做法）

如果面试官不允许反转，我们需要用更标准的做法。核心问题是：如何知道右子树是否已经遍历完？

我们用一个 `prev` 变量记录上一个访问的节点。如果 `prev` 是当前节点的右子节点，说明右子树已经遍历完，可以访问当前节点了。

```javascript
function postorderTraversal(root) {
    const result = [];
    const stack = [];
    let curr = root;
    let prev = null;
    
    while (curr || stack.length) {
        // 一路向左
        while (curr) {
            stack.push(curr);
            curr = curr.left;
        }
        
        curr = stack.pop();
        
        // 如果没有右子树，或者右子树已经访问过
        if (!curr.right || curr.right === prev) {
            result.push(curr.val);
            prev = curr;
            curr = null;  // 置空，下次循环从栈中取节点
        } else {
            // 右子树还没访问，把当前节点重新压回栈
            stack.push(curr);
            curr = curr.right;
        }
    }
    
    return result;
}
```

这个实现更接近递归的真实行为，但代码相对复杂。

## 后序遍历的应用场景

后序遍历的特点是"先子后根"，这使它特别适合以下场景：

**计算子树信息**：比如计算每个子树的节点数、高度、和等。因为在访问根节点时，子树的信息已经计算好了。

**删除节点**：删除二叉树时，必须先删除子节点，再删除父节点。

**表达式求值**：后缀表达式的求值就是后序遍历表达式树。

## 小结

后序遍历的递归实现简单，但迭代实现是三种遍历中最复杂的。掌握"反转技巧"可以快速写出代码，但标准做法更能体现你对遍历本质的理解。

后序遍历的"先子后根"特性，使它在很多需要"自底向上"处理的场景中大放异彩。
