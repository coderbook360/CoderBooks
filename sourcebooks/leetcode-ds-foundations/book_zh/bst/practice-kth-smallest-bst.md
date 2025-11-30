# 实战：二叉搜索树中第 K 小的元素

利用 BST 中序遍历的有序性，找到第 K 小的元素。

---

## 问题描述

**LeetCode 230. Kth Smallest Element in a BST**

给定一个二叉搜索树的根节点 root，和一个整数 k，请你设计一个算法查找其中第 k 小的元素（1 ≤ k ≤ n）。

**示例 1**：
```
    3
   / \
  1   4
   \
    2

k = 1 → 输出：1（最小）
k = 3 → 输出：3
```

**示例 2**：
```
        5
       / \
      3   6
     / \
    2   4
   /
  1

k = 3 → 输出：3
```

---

## 核心思想

**BST 的中序遍历是升序的**。

```
    3
   / \
  1   4
   \
    2

中序遍历：[1, 2, 3, 4]
           ↑  ↑  ↑  ↑
           k=1 k=2 k=3 k=4
```

所以，中序遍历到第 K 个节点就是答案。

---

## 解法一：完整中序遍历

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

**问题**：即使找到答案也会遍历完整棵树，时间 O(n)，空间 O(n)。

---

## 解法二：提前终止的递归

找到第 K 个就停止：

```javascript
function kthSmallest(root, k) {
  let count = 0;
  let result = null;
  
  function inorder(node) {
    if (!node || result !== null) return;  // 已找到就提前返回
    
    inorder(node.left);
    
    count++;
    if (count === k) {
      result = node.val;
      return;
    }
    
    inorder(node.right);
  }
  
  inorder(root);
  return result;
}
```

**优化效果**：平均只需遍历 k 个节点。

---

## 解法三：迭代（更清晰的提前终止）

```javascript
function kthSmallest(root, k) {
  const stack = [];
  let current = root;
  
  while (current || stack.length > 0) {
    // 走到最左边
    while (current) {
      stack.push(current);
      current = current.left;
    }
    
    current = stack.pop();
    k--;
    
    // 找到第 K 个
    if (k === 0) {
      return current.val;
    }
    
    current = current.right;
  }
  
  return -1;  // 不会执行到这里
}
```

---

## 执行过程可视化

```
        5
       / \
      3   6
     / \
    2   4
   /
  1

找第 k=3 小的元素：

初始：stack=[], current=5

一路向左：
  push 5, current=3
  push 3, current=2
  push 2, current=1
  push 1, current=null
  stack=[5,3,2,1]

pop 1, k=3-1=2, current=1.right=null

pop 2, k=2-1=1, current=2.right=null

pop 3, k=1-1=0 ✓ 返回 3
```

---

## 进阶：频繁查询优化

如果需要**频繁查询**第 K 小元素，可以：

**方法 1：存储子树大小**

```javascript
class TreeNodeWithSize {
  constructor(val) {
    this.val = val;
    this.left = null;
    this.right = null;
    this.size = 1;  // 以该节点为根的子树大小
  }
}

function kthSmallest(root, k) {
  const leftSize = root.left ? root.left.size : 0;
  
  if (k === leftSize + 1) {
    return root.val;
  } else if (k <= leftSize) {
    return kthSmallest(root.left, k);
  } else {
    return kthSmallest(root.right, k - leftSize - 1);
  }
}
```

时间复杂度 O(h)，但需要维护 size 字段。

**方法 2：缓存中序结果**

```javascript
class BSTIterator {
  constructor(root) {
    this.sortedList = [];
    this.inorder(root);
  }
  
  inorder(node) {
    if (!node) return;
    this.inorder(node.left);
    this.sortedList.push(node.val);
    this.inorder(node.right);
  }
  
  kthSmallest(k) {
    return this.sortedList[k - 1];
  }
}
```

查询 O(1)，但修改树需要重新构建。

---

## 边界情况

```javascript
// 测试用例
kthSmallest(node(1), 1);          // 单节点，k=1 → 1

// k = 节点数（找最大值）
kthSmallest(buildTree([3, 1, 4, null, 2]), 4);  // 4

// 只有左子树
kthSmallest(buildTree([3, 2, null, 1]), 2);     // 2

// 只有右子树
kthSmallest(buildTree([1, null, 2, null, 3]), 3); // 3
```

---

## 常见错误

### 1. 没有提前终止

```javascript
// ❌ 低效：找到后仍继续遍历
function inorder(node) {
  if (!node) return;
  inorder(node.left);
  count++;
  if (count === k) result = node.val;  // 但继续遍历
  inorder(node.right);
}

// ✅ 正确：提前终止
function inorder(node) {
  if (!node || result !== null) return;
  // ...
}
```

### 2. 下标计算错误

```javascript
// ❌ 错误：数组下标从 0 开始，k 从 1 开始
return result[k];

// ✅ 正确
return result[k - 1];
```

---

## 复杂度分析

| 方法 | 时间 | 空间 |
|------|------|------|
| 完整遍历 | O(n) | O(n) |
| 提前终止 | O(h + k) | O(h) |
| 存储 size | O(h) | O(n) 额外空间 |

h 为树高，平衡树 h = O(log n)。

---

## 相关题目

| 题目 | 难度 | 关联 |
|------|------|------|
| [230. 第 K 小元素](https://leetcode.cn/problems/kth-smallest-element-in-a-bst/) | 中等 | 本题 |
| [94. 中序遍历](https://leetcode.cn/problems/binary-tree-inorder-traversal/) | 简单 | 基础 |
| [173. BST 迭代器](https://leetcode.cn/problems/binary-search-tree-iterator/) | 中等 | 迭代中序 |
| [剑指 54. 第 K 大节点](https://leetcode.cn/problems/er-cha-sou-suo-shu-de-di-kda-jie-dian-lcof/) | 简单 | 反向中序 |

---

## 小结

本题的关键洞察：**BST 中序遍历 = 升序数组**。

| 方法 | 适用场景 |
|------|----------|
| 完整遍历 | 实现简单，一次性查询 |
| 提前终止 | 优化单次查询 |
| 存储 size | 频繁查询，树不频繁修改 |

**延伸思考**：
- 第 K 大元素：反向中序遍历（右-根-左）
- BST 迭代器：用栈维护中序遍历状态
    
    if (k === 0) return current.val;
    
    current = current.right;
  }
  
  return -1;
}
```

---

## 执行过程

```
    3
   / \
  1   4
   \
    2

k = 3

中序：1 → 2 → 3 → ...

第1个：1, k=2
第2个：2, k=1
第3个：3, k=0，返回 3
```

---

## 复杂度

- 时间：O(h + k)
- 空间：O(h)
