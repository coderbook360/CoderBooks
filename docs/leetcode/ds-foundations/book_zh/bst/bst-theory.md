# 二叉搜索树的性质与操作

上一部分我们学习了二叉树的基本概念和遍历方法。现在来看一种特殊的二叉树——**二叉搜索树（Binary Search Tree, BST）**。

BST 的核心思想是：利用节点之间的大小关系，让查找像二分查找一样高效。

## 什么是二叉搜索树？

二叉搜索树满足以下性质（**BST 性质**）：

> 对于任意节点 N：
> - N 的**左子树**中所有节点的值 **< N 的值**
> - N 的**右子树**中所有节点的值 **> N 的值**
> - N 的左右子树也是 BST

```
       8
      / \
     3   10
    / \    \
   1   6    14
      / \   /
     4   7 13

验证：
- 8 的左子树（3,1,6,4,7）都 < 8 ✓
- 8 的右子树（10,14,13）都 > 8 ✓
- 节点 3 满足：1 < 3 < 6 ✓
- 以此类推...
```

**注意**：标准 BST 不允许重复值。如果需要处理重复值，可以：
1. 规定相等的放左边或右边
2. 每个节点存储计数

## BST 的核心性质

### 性质 1：中序遍历有序

这是 BST 最重要的性质。对 BST 进行中序遍历（左→根→右），得到的序列是**升序**的。

```
       8
      / \
     3   10
    / \    \
   1   6    14

中序遍历：1, 3, 6, 8, 10, 14  ← 升序！
```

**为什么？**

中序遍历先访问左子树，再访问根，最后访问右子树。由 BST 性质：
- 左子树的所有值 < 根
- 根 < 右子树的所有值

所以中序遍历的结果一定是有序的。

**应用**：很多 BST 问题都可以转化为「对中序遍历结果的操作」。

### 性质 2：高效查找

在 BST 中查找一个值，每次比较可以排除一半的节点：

```
查找 6：

       8      6 < 8，往左
      /
     3        6 > 3，往右
      \
       6      找到！

只比较了 3 次，而不是遍历所有节点。
```

平均情况下，查找的时间复杂度是 **O(log n)**。

但要注意：这依赖于树的**平衡性**。

### 性质 3：最值在边界

- **最小值**：一直往左走，直到没有左子节点
- **最大值**：一直往右走，直到没有右子节点

```
       8
      / \
     3   10
    /      \
   1        14

最小值：从 8 → 3 → 1，停止（1 没有左子节点）
最大值：从 8 → 10 → 14，停止（14 没有右子节点）
```

## 基本操作实现

### 查找

```javascript
function search(root, val) {
    // 递归版本
    if (!root) return null;
    
    if (val === root.val) {
        return root;  // 找到了
    } else if (val < root.val) {
        return search(root.left, val);  // 在左子树找
    } else {
        return search(root.right, val);  // 在右子树找
    }
}

function searchIterative(root, val) {
    // 迭代版本
    while (root && root.val !== val) {
        root = val < root.val ? root.left : root.right;
    }
    return root;
}
```

**执行过程**（查找 6）：

```
       8      val=6 < 8，走左
      / \
     3   10   val=6 > 3，走右
    / \
   1   6      val=6 === 6，返回

时间复杂度：O(h)，h 是树的高度
```

### 查找最小值

```javascript
function findMin(root) {
    if (!root) return null;
    
    while (root.left) {
        root = root.left;
    }
    return root;
}
```

### 查找最大值

```javascript
function findMax(root) {
    if (!root) return null;
    
    while (root.right) {
        root = root.right;
    }
    return root;
}
```

### 查找前驱和后继

**前驱（predecessor）**：比当前值小的最大值
**后继（successor）**：比当前值大的最小值

```javascript
// 查找中序后继（比 val 大的最小值）
function findSuccessor(root, val) {
    let successor = null;
    
    while (root) {
        if (root.val > val) {
            successor = root;  // 记录候选后继
            root = root.left;  // 继续找更小的
        } else {
            root = root.right;
        }
    }
    
    return successor;
}

// 查找中序前驱（比 val 小的最大值）
function findPredecessor(root, val) {
    let predecessor = null;
    
    while (root) {
        if (root.val < val) {
            predecessor = root;  // 记录候选前驱
            root = root.right;   // 继续找更大的
        } else {
            root = root.left;
        }
    }
    
    return predecessor;
}
```

## BST vs 其他数据结构

| 操作 | BST（平均） | BST（最坏） | 有序数组 | 哈希表 |
|------|------------|------------|----------|--------|
| 查找 | O(log n) | O(n) | O(log n) | O(1) |
| 插入 | O(log n) | O(n) | O(n) | O(1) |
| 删除 | O(log n) | O(n) | O(n) | O(1) |
| 最小/最大 | O(log n) | O(n) | O(1) | O(n) |
| 范围查询 | O(k + log n) | O(k + n) | O(k + log n) | O(n) |
| 有序遍历 | O(n) | O(n) | O(n) | O(n log n) |

**BST 的优势**：
- 支持动态插入删除，同时保持有序
- 支持高效的范围查询（找某个区间内的所有值）
- 支持高效的前驱/后继查询

**BST 的劣势**：
- 最坏情况性能差（退化成链表）
- 单点查找不如哈希表

## 平衡的重要性

BST 的性能取决于树的**高度**。理想情况下，高度是 O(log n)。

但如果按顺序插入：

```
插入 1, 2, 3, 4, 5...

1
 \
  2
   \
    3
     \
      4
       \
        5

退化成链表，高度 = n
所有操作变成 O(n)！
```

这就是为什么实际应用中常用**平衡 BST**：

| 类型 | 特点 | 应用场景 |
|------|------|---------|
| AVL 树 | 严格平衡（高度差 ≤ 1） | 查找多、修改少 |
| 红黑树 | 近似平衡（最长路径 ≤ 2×最短路径） | 通用场景，如 Java TreeMap |
| Splay 树 | 自调整，常访问的在根附近 | 缓存友好 |
| B/B+ 树 | 多路搜索树 | 数据库索引 |

在算法面试中，一般假设 BST 是平衡的（或不考虑最坏情况），除非题目特别提及。

## BST 的常见问题类型

1. **验证 BST**：判断一棵树是否满足 BST 性质
2. **BST 的 CRUD**：搜索、插入、删除
3. **BST 与中序遍历**：第 K 小、众数、最小差值
4. **BST 的构造**：从有序数组构建平衡 BST

下一章我们将实现 BST 的插入和删除操作。

## 本章小结

1. **BST 定义**：左 < 根 < 右，递归成立
2. **核心性质**：中序遍历有序、高效查找、最值在边界
3. **基本操作**：查找 O(log n)、找最值 O(log n)、找前驱/后继 O(log n)
4. **平衡问题**：不平衡 BST 退化为链表，操作变 O(n)
5. **实际应用**：有序数据的动态维护、范围查询
