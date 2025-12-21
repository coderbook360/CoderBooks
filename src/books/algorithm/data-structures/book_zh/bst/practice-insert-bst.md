# 实战：二叉搜索树中的插入操作

向 BST 中插入一个新值，保持 BST 性质不变。

---

## 问题描述

**LeetCode 701. Insert into a Binary Search Tree**

给定 BST 的根节点 root 和要插入树中的值 val，将值插入 BST。返回插入后 BST 的根节点。输入数据保证新值在原始 BST 中不存在。

**示例**：
```
    4              4
   / \            / \
  2   7    →     2   7
 / \            / \ /
1   3          1  3 5

插入 5
```

---

## 核心思想

插入操作分两步：
1. **找到合适的位置**：利用 BST 性质，比当前节点小走左，大走右
2. **创建新节点**：走到空位置时，创建并连接新节点

```
插入 5：
4: 5 > 4, 往右
7: 5 < 7, 往左
null: 找到位置，插入！
```

---

## 解法一：递归

```javascript
function insertIntoBST(root, val) {
  if (!root) return new TreeNode(val);
  
  if (val < root.val) {
    root.left = insertIntoBST(root.left, val);
  } else {
    root.right = insertIntoBST(root.right, val);
  }
  
  return root;
}
```

**理解递归**：
- 递归找到空位置时，创建新节点并返回
- 返回的节点被父节点的 `root.left` 或 `root.right` 接收
- 整个过程自然地完成了连接

---

## 解法二：迭代

```javascript
function insertIntoBST(root, val) {
  const node = new TreeNode(val);
  if (!root) return node;
  
  let current = root;
  
  while (true) {
    if (val < current.val) {
      // 应该插入左子树
      if (!current.left) {
        current.left = node;
        break;
      }
      current = current.left;
    } else {
      // 应该插入右子树
      if (!current.right) {
        current.right = node;
        break;
      }
      current = current.right;
    }
  }
  
  return root;
}
```

---

## 执行过程可视化

```
    4
   / \
  2   7

插入 val = 5:

current = 4: 5 > 4, 往右
current = 7: 5 < 7, 往左
current.left = null: 找到空位！
7.left = TreeNode(5)

结果：
    4
   / \
  2   7
     /
    5
```

---

## 插入位置的唯一性

**问题**：同一个值可以插入不同位置吗？

**答案**：从根开始搜索，插入位置是**唯一确定**的。

```
    4           插入 5 只能在这里
   / \          （按搜索路径走到的空位置）
  2   7
 / \ /
1  3 5 ← 唯一位置
```

但如果我们重新排列树的结构，5 可以在其他位置（仍然是有效的 BST）：

```
      5          这也是有效的 BST
     / \         但不是通过简单插入得到的
    4   7
   /
  2
 / \
1   3
```

**结论**：简单插入总是添加到叶子位置。

---

## 边界情况

```javascript
// 测试用例
insertIntoBST(null, 1);              // 空树 → 新节点成为根
insertIntoBST(node(5), 3);           // 插入左子树
insertIntoBST(node(5), 7);           // 插入右子树

// 多次插入
let root = null;
[5, 3, 7, 2, 4, 6, 8].forEach(val => {
  root = insertIntoBST(root, val);
});
// 结果：完美平衡的 BST
//       5
//      / \
//     3   7
//    / \ / \
//   2  4 6  8
```

---

## 常见错误

### 1. 忘记返回 root

```javascript
// ❌ 错误：没有返回根节点
function insertIntoBST(root, val) {
  if (!root) return new TreeNode(val);
  if (val < root.val) {
    root.left = insertIntoBST(root.left, val);
  } else {
    root.right = insertIntoBST(root.right, val);
  }
  // 缺少 return root;
}

// ✅ 正确
function insertIntoBST(root, val) {
  // ...
  return root;
}
```

### 2. 迭代版本忘记处理空树

```javascript
// ❌ 错误：空树时会出错
function insertIntoBST(root, val) {
  let current = root;  // root 是 null 时会出问题
  while (true) {
    // ...
  }
}

// ✅ 正确
function insertIntoBST(root, val) {
  const node = new TreeNode(val);
  if (!root) return node;  // 处理空树
  // ...
}
```

---

## 注意：插入不会自动平衡

简单插入可能导致 BST 退化：

```
按顺序插入 1, 2, 3, 4, 5：

1
 \
  2
   \
    3
     \
      4
       \
        5

退化成链表，操作复杂度变成 O(n)
```

要保持平衡，需要使用 **AVL 树**或**红黑树**等自平衡结构。

---

## 复杂度分析

- **时间复杂度**：O(h)，h 为树高度
  - 平衡 BST：O(log n)
  - 最坏情况：O(n)

- **空间复杂度**：
  - 递归：O(h)
  - 迭代：O(1)

---

## 相关题目

| 题目 | 难度 | 说明 |
|------|------|------|
| [701. BST 中的插入](https://leetcode.cn/problems/insert-into-a-binary-search-tree/) | 中等 | 本题 |
| [700. BST 中的搜索](https://leetcode.cn/problems/search-in-a-binary-search-tree/) | 简单 | 基础 |
| [450. 删除 BST 中的节点](https://leetcode.cn/problems/delete-node-in-a-bst/) | 中等 | 比插入复杂 |
| [108. 有序数组转 BST](https://leetcode.cn/problems/convert-sorted-array-to-binary-search-tree/) | 简单 | 构建平衡 BST |

---

## 小结

BST 插入是基础操作，思路简单：

```
1. 找位置：比当前节点小走左，大走右
2. 插入：走到空位置时创建新节点
```

**关键点**：
- 新节点总是作为叶子节点插入
- 插入位置由搜索路径唯一确定
- 简单插入不保证平衡

**递归 vs 迭代**：
- 递归代码更简洁
- 迭代空间复杂度 O(1)

- BST 的插入不会改变已有节点的位置
- 新节点总是插在叶子位置
- 可能有多种有效插入方式（题目只要求返回任一有效 BST）

---

## 复杂度

- 时间：O(h)
- 空间：O(1)（迭代）或 O(h)（递归）
