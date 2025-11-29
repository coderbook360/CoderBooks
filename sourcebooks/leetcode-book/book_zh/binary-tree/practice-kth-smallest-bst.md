# 实战：二叉搜索树中第K小的元素

这道题是BST中序遍历应用的典型代表。理解"BST的中序遍历是有序的"这个性质，这道题就迎刃而解了。

## 问题描述

给定一个二叉搜索树的根节点`root`，和一个整数`k`，返回树中第`k`个最小的元素（1-indexed）。

**示例**：
```
        3
       / \
      1   4
       \
        2

k = 1  →  输出：1
k = 3  →  输出：3
```

## 思路分析

### 核心洞察

BST的中序遍历是**升序序列**：
```
        5
       / \
      3   6
     / \
    2   4
   /
  1

中序遍历：1 → 2 → 3 → 4 → 5 → 6
第k小 = 中序遍历的第k个元素
```

所以问题转化为：**中序遍历到第k个节点时停止**。

## 解法一：完整中序遍历

最直观的做法是先得到完整的中序序列，然后取第k个：

```javascript
function kthSmallest(root, k) {
    const result = [];
    
    function inorder(node) {
        if (!node) return;
        inorder(node.left);
        result.push(node.val);
        inorder(node.right);
    }
    
    inorder(root);
    return result[k - 1];
}
```

缺点：即使k=1，也要遍历整棵树。

## 解法二：提前终止的递归

我们可以在找到第k个元素后立即停止：

```javascript
function kthSmallest(root, k) {
    let count = 0;
    let result = null;
    
    function inorder(node) {
        if (!node || result !== null) return;
        
        // 先访问左子树
        inorder(node.left);
        
        // 访问当前节点
        count++;
        if (count === k) {
            result = node.val;
            return;
        }
        
        // 访问右子树
        inorder(node.right);
    }
    
    inorder(root);
    return result;
}
```

## 解法三：迭代（推荐）

用栈实现中序遍历，更容易控制流程：

```javascript
/**
 * @param {TreeNode} root
 * @param {number} k
 * @return {number}
 */
function kthSmallest(root, k) {
    const stack = [];
    let curr = root;
    
    while (curr || stack.length) {
        // 走到最左边
        while (curr) {
            stack.push(curr);
            curr = curr.left;
        }
        
        // 弹出最小的未访问节点
        curr = stack.pop();
        
        // 计数，找到第k个就返回
        if (--k === 0) {
            return curr.val;
        }
        
        // 转向右子树
        curr = curr.right;
    }
    
    return -1;  // k超出范围
}
```

### 执行过程

```
        5
       / \
      3   6
     / \
    2   4
   /
  1

找第3小的元素：

初始：curr = 5, stack = [], k = 3

走到最左：
  stack = [5, 3, 2, 1], curr = null

弹出1：k = 2, curr = 1.right = null
弹出2：k = 1, curr = 2.right = null
弹出3：k = 0, 返回 3 ✓
```

## 进阶：频繁查询优化

如果需要频繁查询第k小的元素，可以给每个节点记录子树大小：

```javascript
class TreeNodeWithSize {
    constructor(val) {
        this.val = val;
        this.left = null;
        this.right = null;
        this.size = 1;  // 子树大小（包括自己）
    }
}

function kthSmallest(root, k) {
    while (root) {
        const leftSize = root.left ? root.left.size : 0;
        
        if (k === leftSize + 1) {
            // 当前节点就是第k小
            return root.val;
        } else if (k <= leftSize) {
            // 第k小在左子树
            root = root.left;
        } else {
            // 第k小在右子树
            k -= leftSize + 1;
            root = root.right;
        }
    }
    
    return -1;
}
```

这样每次查询只需O(h)时间，但需要O(n)额外空间存储size。

## 复杂度分析

**基础解法**：
- 时间：O(H + k)，H是树高，最坏O(n)
- 空间：O(H)栈空间

**优化解法（记录子树大小）**：
- 时间：O(H)
- 空间：O(n)存储size信息

## 相关技巧

### 找第K大的元素

第K大 = 第 (n-k+1) 小

或者用"反向中序遍历"（右→根→左）：

```javascript
function kthLargest(root, k) {
    const stack = [];
    let curr = root;
    
    while (curr || stack.length) {
        // 走到最右边
        while (curr) {
            stack.push(curr);
            curr = curr.right;
        }
        
        curr = stack.pop();
        if (--k === 0) return curr.val;
        curr = curr.left;
    }
}
```

## 小结

这道题的核心是：

1. **BST中序遍历有序**：这是解题的基础
2. **提前终止**：找到第k个就停止，不必遍历整棵树
3. **迭代优于递归**：更容易控制流程，代码更清晰

面试中，建议先说明"中序遍历有序"的性质，再写出迭代解法，最后可以提一下记录子树大小的优化思路，展示你的知识深度。
