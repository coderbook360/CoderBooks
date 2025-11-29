# 实战：对称二叉树

对称二叉树问题要求我们判断一棵树是否是镜像对称的。这道题是练习递归思维的绝佳题目，因为它需要你思考"对称"意味着什么。

## 问题描述

给你一个二叉树的根节点 `root`，检查它是否轴对称。

**示例 1：**
```
输入：root = [1,2,2,3,4,4,3]
        1
       / \
      2   2
     / \ / \
    3  4 4  3
输出：true
```

**示例 2：**
```
输入：root = [1,2,2,null,3,null,3]
        1
       / \
      2   2
       \   \
        3   3
输出：false
```

## 思路分析

什么是对称？如果把一棵树沿着根节点垂直切开，左半边和右半边应该是**镜像**的。

更具体地说，对于根节点的左子树和右子树：
- 左子树的左子节点 = 右子树的右子节点
- 左子树的右子节点 = 右子树的左子节点

这自然引出了一个递归判断：**两棵树互为镜像，当且仅当**：
1. 两棵树的根节点值相同
2. 左子树的左子树与右子树的右子树互为镜像
3. 左子树的右子树与右子树的左子树互为镜像

## 解法一：递归

```javascript
function isSymmetric(root) {
    if (!root) return true;
    return isMirror(root.left, root.right);
}

function isMirror(left, right) {
    // 两个都为空，对称
    if (!left && !right) return true;
    // 只有一个为空，不对称
    if (!left || !right) return false;
    // 值不相等，不对称
    if (left.val !== right.val) return false;
    
    // 递归检查：左左 vs 右右，左右 vs 右左
    return isMirror(left.left, right.right) && 
           isMirror(left.right, right.left);
}
```

**复杂度分析：**
- 时间复杂度：O(n)，每个节点访问一次
- 空间复杂度：O(h)，递归深度

## 解法二：迭代

用队列来模拟递归。每次取出两个节点进行比较，然后把它们的子节点按镜像顺序放入队列。

```javascript
function isSymmetric(root) {
    if (!root) return true;
    
    const queue = [root.left, root.right];
    
    while (queue.length) {
        const left = queue.shift();
        const right = queue.shift();
        
        // 两个都为空，继续
        if (!left && !right) continue;
        // 只有一个为空，或值不相等
        if (!left || !right || left.val !== right.val) {
            return false;
        }
        
        // 按镜像顺序入队
        queue.push(left.left, right.right);
        queue.push(left.right, right.left);
    }
    
    return true;
}
```

**注意入队顺序**：`left.left` 和 `right.right` 配对，`left.right` 和 `right.left` 配对。

## 小结

对称二叉树问题的关键是理解"镜像"的递归定义。一旦理解了这一点，代码就水到渠成。

这道题展示了一个重要技巧：**把问题转化为两棵树的比较**。原问题是"一棵树是否对称"，我们转化为"两棵子树是否互为镜像"。这种转化思维在很多树的问题中都很有用。
