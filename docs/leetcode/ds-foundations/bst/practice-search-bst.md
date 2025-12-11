# 实战：二叉搜索树中的搜索

在 BST 中查找指定值的节点，是 BST 最基础的操作。

---

## 问题描述

**LeetCode 700. Search in a Binary Search Tree**

给定二叉搜索树的根节点 root 和一个整数 val。在 BST 中找到节点值等于 val 的节点。返回以该节点为根的子树。如果节点不存在，则返回 null。

**示例**：
```
    4
   / \
  2   7
 / \
1   3

val = 2 → 返回以 2 为根的子树
val = 5 → 返回 null（不存在）
```

---

## 核心思想

利用 BST 的有序性：**左子树 < 根 < 右子树**。

```
查找 val：
- val < 当前节点 → 只需在左子树找
- val > 当前节点 → 只需在右子树找
- val = 当前节点 → 找到了！
```

每次比较可以排除一半的节点，类似二分查找。

---

## 解法一：递归

```javascript
function searchBST(root, val) {
  if (!root) return null;
  
  if (val === root.val) return root;
  if (val < root.val) return searchBST(root.left, val);
  return searchBST(root.right, val);
}
```

代码简洁，利用递归自然地实现了路径选择。

---

## 解法二：迭代

```javascript
function searchBST(root, val) {
  while (root) {
    if (val === root.val) return root;
    root = val < root.val ? root.left : root.right;
  }
  return null;
}
```

迭代版本更高效，没有递归栈开销。

---

## 执行过程可视化

```
    4
   / \
  2   7
 / \
1   3

搜索 val = 2:

root = 4: 2 < 4, 往左
root = 2: 2 = 2, 找到！返回节点 2

搜索 val = 5:

root = 4: 5 > 4, 往右
root = 7: 5 < 7, 往左
root = null: 没找到，返回 null
```

---

## BST 搜索 vs 普通二叉树搜索

| 特点 | BST | 普通二叉树 |
|------|-----|------------|
| 搜索方向 | **单向**（左或右） | 两边都要搜 |
| 时间复杂度 | O(h) | O(n) |
| 利用的性质 | 有序性 | 无 |

**普通二叉树搜索**（对比）：

```javascript
// 普通二叉树必须两边都搜
function searchTree(root, val) {
  if (!root) return null;
  if (root.val === val) return root;
  return searchTree(root.left, val) || searchTree(root.right, val);
}
```

---

## 边界情况

```javascript
// 测试用例
searchBST(null, 1);              // 空树 → null
searchBST(node(5), 5);           // 单节点找到 → node(5)
searchBST(node(5), 3);           // 单节点没找到 → null

// 找根节点
searchBST(buildTree([4, 2, 7, 1, 3]), 4);  // 返回根

// 找叶子节点
searchBST(buildTree([4, 2, 7, 1, 3]), 1);  // 返回叶子
searchBST(buildTree([4, 2, 7, 1, 3]), 3);  // 返回叶子
```

---

## 常见错误

### 1. 忘记判空

```javascript
// ❌ 错误：root 为 null 时会报错
function searchBST(root, val) {
  if (val === root.val) return root;  // root 可能是 null
  // ...
}

// ✅ 正确
function searchBST(root, val) {
  if (!root) return null;
  if (val === root.val) return root;
  // ...
}
```

### 2. 两边都搜索

```javascript
// ❌ 错误：没有利用 BST 性质
function searchBST(root, val) {
  if (!root) return null;
  if (root.val === val) return root;
  return searchBST(root.left, val) || searchBST(root.right, val);
}

// ✅ 正确：只搜索一边
function searchBST(root, val) {
  if (!root) return null;
  if (val === root.val) return root;
  if (val < root.val) return searchBST(root.left, val);
  return searchBST(root.right, val);
}
```

---

## 复杂度分析

- **时间复杂度**：O(h)，h 为树高度
  - 平衡 BST：O(log n)
  - 最坏情况（完全不平衡）：O(n)

- **空间复杂度**：
  - 递归：O(h)
  - 迭代：O(1)

---

## 相关题目

| 题目 | 难度 | 说明 |
|------|------|------|
| [700. BST 中的搜索](https://leetcode.cn/problems/search-in-a-binary-search-tree/) | 简单 | 本题 |
| [701. BST 中的插入](https://leetcode.cn/problems/insert-into-a-binary-search-tree/) | 中等 | 搜索位置后插入 |
| [450. 删除 BST 中的节点](https://leetcode.cn/problems/delete-node-in-a-bst/) | 中等 | 搜索位置后删除 |
| [270. 最接近的 BST 值](https://leetcode.cn/problems/closest-binary-search-tree-value/) | 简单 | 搜索变体 |

---

## 小结

BST 搜索是最基础的 BST 操作：

```javascript
// 迭代模板（推荐）
while (root) {
  if (val === root.val) return root;
  root = val < root.val ? root.left : root.right;
}
return null;
```

**关键点**：
- 利用有序性，每次只走一边
- 时间复杂度 O(h)，比普通二叉树的 O(n) 高效
- 迭代版本空间 O(1)，优于递归
