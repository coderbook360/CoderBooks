# 实战：二叉搜索树的最小绝对差

这道题考察BST的中序遍历特性。两个节点的最小绝对差一定出现在**中序遍历的相邻节点**之间。

## 问题描述

给你一个BST的根节点`root`，返回树中任意两不同节点值之间的最小差值。差值是一个正数，其数值等于两值之差的绝对值。

**示例**：
```
        4
       / \
      2   6
     / \
    1   3

输出：1
解释：最小差值可以是 2-1=1 或 3-2=1 或 4-3=1
```

## 思路分析

### 暴力思路

比较所有节点对，时间O(n²)。但这没有利用BST的性质。

### BST的中序遍历

BST的中序遍历是**有序序列**：
```
        4
       / \
      2   6
     / \
    1   3

中序：1 → 2 → 3 → 4 → 6
```

在有序序列中，最小差值一定出现在**相邻元素**之间，而不是跨越多个元素。

证明：如果 a < b < c，那么：
- |c - a| = |c - b| + |b - a| > |b - a|
- 所以 |c - a| 不可能是最小差值

因此，我们只需要比较中序遍历中相邻的节点。

## 解法一：中序遍历 + 数组

先得到完整的中序序列，再计算相邻差值：

```javascript
function getMinimumDifference(root) {
    const values = [];
    
    function inorder(node) {
        if (!node) return;
        inorder(node.left);
        values.push(node.val);
        inorder(node.right);
    }
    
    inorder(root);
    
    let minDiff = Infinity;
    for (let i = 1; i < values.length; i++) {
        minDiff = Math.min(minDiff, values[i] - values[i - 1]);
    }
    
    return minDiff;
}
```

## 解法二：一次遍历（推荐）

边遍历边计算，不需要存储完整序列：

```javascript
/**
 * @param {TreeNode} root
 * @return {number}
 */
function getMinimumDifference(root) {
    let minDiff = Infinity;
    let prev = null;
    
    function inorder(node) {
        if (!node) return;
        
        // 先访问左子树
        inorder(node.left);
        
        // 处理当前节点
        if (prev !== null) {
            minDiff = Math.min(minDiff, node.val - prev);
        }
        prev = node.val;
        
        // 访问右子树
        inorder(node.right);
    }
    
    inorder(root);
    return minDiff;
}
```

## 解法三：迭代

```javascript
function getMinimumDifference(root) {
    let minDiff = Infinity;
    let prev = null;
    const stack = [];
    let curr = root;
    
    while (curr || stack.length) {
        while (curr) {
            stack.push(curr);
            curr = curr.left;
        }
        
        curr = stack.pop();
        
        if (prev !== null) {
            minDiff = Math.min(minDiff, curr.val - prev);
        }
        prev = curr.val;
        
        curr = curr.right;
    }
    
    return minDiff;
}
```

## 执行过程

```
        4
       / \
      2   6
     / \
    1   3

中序遍历：

访问1：prev = null，跳过比较，prev = 1
访问2：diff = 2-1 = 1，minDiff = 1，prev = 2
访问3：diff = 3-2 = 1，minDiff = 1，prev = 3
访问4：diff = 4-3 = 1，minDiff = 1，prev = 4
访问6：diff = 6-4 = 2，minDiff = 1，prev = 6

返回 1
```

## 复杂度分析

**时间复杂度**：O(n)
- 每个节点访问一次

**空间复杂度**：
- 解法一：O(n) 存储数组
- 解法二/三：O(h) 递归/栈空间

## 变体：二叉树（非BST）的最小差值

如果不是BST，就无法利用有序性，需要比较所有节点对，或者先排序再比较：

```javascript
// 非BST版本
function getMinimumDifference(root) {
    const values = [];
    
    function dfs(node) {
        if (!node) return;
        values.push(node.val);
        dfs(node.left);
        dfs(node.right);
    }
    
    dfs(root);
    values.sort((a, b) => a - b);
    
    let minDiff = Infinity;
    for (let i = 1; i < values.length; i++) {
        minDiff = Math.min(minDiff, values[i] - values[i - 1]);
    }
    
    return minDiff;
}
```

时间复杂度变成O(n log n)，因为需要排序。

## 小结

这道题的关键：

1. **有序序列的最小差值在相邻元素间**
2. **BST中序遍历是有序的**
3. **边遍历边计算**，只需记录前一个节点

面试时，说清楚"中序遍历有序"和"相邻元素差值最小"这两个关键点，展示你对BST性质的深刻理解。
