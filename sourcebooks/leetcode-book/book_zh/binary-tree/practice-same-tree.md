# 实战：相同的树

判断两棵树是否相同是一道经典的递归题。它看起来简单，但蕴含的思想适用于很多树的比较问题。

## 问题描述

给你两棵二叉树的根节点 `p` 和 `q`，编写一个函数来检验这两棵树是否相同。

如果两个树在结构上相同，并且节点具有相同的值，则认为它们是相同的。

**示例 1：**
```
输入：p = [1,2,3], q = [1,2,3]
        1          1
       / \        / \
      2   3      2   3
输出：true
```

**示例 2：**
```
输入：p = [1,2], q = [1,null,2]
        1          1
       /            \
      2              2
输出：false
```

## 解法一：递归

两棵树相同，当且仅当：
1. 根节点的值相同
2. 左子树相同
3. 右子树相同

```javascript
function isSameTree(p, q) {
    // 两个都为空
    if (!p && !q) return true;
    
    // 只有一个为空
    if (!p || !q) return false;
    
    // 值不相等
    if (p.val !== q.val) return false;
    
    // 递归比较左右子树
    return isSameTree(p.left, q.left) && isSameTree(p.right, q.right);
}
```

**复杂度分析：**
- 时间复杂度：O(min(m, n))，m 和 n 分别是两棵树的节点数
- 空间复杂度：O(min(h1, h2))，递归深度

## 解法二：迭代

用队列同时遍历两棵树，每次比较对应位置的节点：

```javascript
function isSameTree(p, q) {
    const queue = [[p, q]];
    
    while (queue.length) {
        const [node1, node2] = queue.shift();
        
        // 两个都为空，继续
        if (!node1 && !node2) continue;
        
        // 只有一个为空，或值不相等
        if (!node1 || !node2 || node1.val !== node2.val) {
            return false;
        }
        
        // 把对应的子节点配对入队
        queue.push([node1.left, node2.left]);
        queue.push([node1.right, node2.right]);
    }
    
    return true;
}
```

## 小结

"相同的树"问题的核心是**同步遍历两棵树**。这个思想可以扩展到很多变体：
- 判断一棵树是否是另一棵树的子树
- 判断两棵树是否互为镜像（对称二叉树的子问题）
- 合并两棵二叉树

掌握了这道题，你就掌握了比较两棵树的基本范式。
