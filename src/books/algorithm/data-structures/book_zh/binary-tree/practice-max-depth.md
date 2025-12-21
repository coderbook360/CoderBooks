# 实战：二叉树的最大深度

这是二叉树最基础的题目之一，几乎是学习树递归的入门题。

## 题目描述

**LeetCode 104. 二叉树的最大深度**

给定一个二叉树 `root`，返回其最大深度。

二叉树的**最大深度**是指从根节点到最远叶子节点的最长路径上的节点数。

**示例 1**：
```
输入：root = [3,9,20,null,null,15,7]

      3
     / \
    9  20
      /  \
     15   7

输出：3
解释：从根节点 3 到叶子节点 7（或 15）的路径包含 3 个节点。
```

**示例 2**：
```
输入：root = [1,null,2]
输出：2
```

**示例 3**：
```
输入：root = []
输出：0
```

## 题目分析

「最大深度」定义为从根到最远叶子的路径上的**节点数**。

关键观察：树的深度可以**递归定义**：
- 空树的深度是 0
- 非空树的深度 = max(左子树深度, 右子树深度) + 1

这个递归定义直接给出了解法。

## 解法一：递归（DFS）

```javascript
function maxDepth(root) {
    // 空节点深度为 0
    if (!root) return 0;
    
    // 递归计算左右子树深度
    const leftDepth = maxDepth(root.left);
    const rightDepth = maxDepth(root.right);
    
    // 当前树的深度 = max(左, 右) + 1
    return Math.max(leftDepth, rightDepth) + 1;
}
```

### 执行过程

```
      3
     / \
    9  20
      /  \
     15   7

maxDepth(3):
├── maxDepth(9):
│   ├── maxDepth(null) = 0
│   └── maxDepth(null) = 0
│   └── return max(0, 0) + 1 = 1
│
├── maxDepth(20):
│   ├── maxDepth(15):
│   │   ├── maxDepth(null) = 0
│   │   └── maxDepth(null) = 0
│   │   └── return max(0, 0) + 1 = 1
│   │
│   └── maxDepth(7):
│       ├── maxDepth(null) = 0
│       └── maxDepth(null) = 0
│       └── return max(0, 0) + 1 = 1
│   │
│   └── return max(1, 1) + 1 = 2
│
└── return max(1, 2) + 1 = 3
```

这就是**后序遍历**的思想：先递归处理子树，再处理当前节点。

**复杂度**：
- 时间：O(n)，每个节点访问一次
- 空间：O(h)，h 是树的高度（递归栈深度）

## 解法二：BFS（层序遍历）

另一种思路：逐层遍历，数一共有多少层。

```javascript
function maxDepth(root) {
    if (!root) return 0;
    
    const queue = [root];
    let depth = 0;
    
    while (queue.length > 0) {
        // 当前层的节点数
        const levelSize = queue.length;
        depth++;  // 深度 +1
        
        // 处理当前层的所有节点
        for (let i = 0; i < levelSize; i++) {
            const node = queue.shift();
            
            // 把下一层的节点加入队列
            if (node.left) queue.push(node.left);
            if (node.right) queue.push(node.right);
        }
    }
    
    return depth;
}
```

### 执行过程

```
      3
     / \
    9  20
      /  \
     15   7

第 1 层：queue = [3], depth = 1
处理后：queue = [9, 20]

第 2 层：queue = [9, 20], depth = 2
处理后：queue = [15, 7]

第 3 层：queue = [15, 7], depth = 3
处理后：queue = []

队列为空，返回 depth = 3
```

**复杂度**：
- 时间：O(n)，每个节点访问一次
- 空间：O(w)，w 是树的最大宽度（队列最大长度）

## 两种方法对比

| 方法 | 时间 | 空间 | 思路 | 适用场景 |
|------|------|------|------|---------|
| DFS（递归） | O(n) | O(h) | 后序遍历思想 | 代码简洁，大多数情况首选 |
| BFS | O(n) | O(w) | 层序遍历，数层数 | 需要逐层处理时使用 |

对于平衡树：h ≈ log n，w ≈ n/2，DFS 空间更优。
对于链状树：h = n，w = 1，BFS 空间更优。

实际面试中，递归解法更常见，因为代码简洁且容易理解。

## 边界情况

```javascript
// 空树
maxDepth(null);  // 0

// 只有根节点
maxDepth(new TreeNode(1));  // 1

// 只有左子树（链状）
// 1 -> 2 -> 3
maxDepth(buildTree([1, 2, null, 3]));  // 3

// 只有右子树（链状）
maxDepth(buildTree([1, null, 2, null, 3]));  // 3
```

## 常见变形

### 深度 vs 高度

注意「深度」和「高度」的区别：
- **深度**：从根到该节点的边数/节点数（不同定义）
- **高度**：从该节点到最远叶子的边数

本题的「最大深度」实际上就是「根节点的高度 + 1」。

### 最小深度

LeetCode 111：最小深度是从根到**最近叶子节点**的路径长度。注意：如果某个子树为空，不能算作"到叶子的路径"。

```javascript
function minDepth(root) {
    if (!root) return 0;
    
    // 只有右子树
    if (!root.left) return minDepth(root.right) + 1;
    
    // 只有左子树
    if (!root.right) return minDepth(root.left) + 1;
    
    // 两边都有
    return Math.min(minDepth(root.left), minDepth(root.right)) + 1;
}
```

## 相关题目

- **111. 二叉树的最小深度**：找最近叶子
- **110. 平衡二叉树**：判断所有节点的左右子树高度差 ≤ 1
- **543. 二叉树的直径**：任意两点之间的最长路径

## 本章小结

1. **递归思想**：树的深度 = max(左子树深度, 右子树深度) + 1
2. **后序遍历**：先处理子树，再处理当前节点
3. **DFS vs BFS**：递归代码简洁，BFS 逐层直观
4. **空间复杂度**：DFS 是 O(h)，BFS 是 O(w)

这道题的递归解法只有 3 行核心代码，但它体现了树问题的核心思想：**把大问题分解成子问题**。几乎所有树的递归题目都遵循这个模式。
