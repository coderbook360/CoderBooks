# 实战：删除二叉搜索树中的节点

BST 删除操作需要分情况处理，是 BST 三大操作（查找、插入、删除）中最复杂的。

---

## 问题描述

**LeetCode 450. Delete Node in a BST**

给定一个 BST 的根节点 root 和一个值 key，删除 BST 中 key 对应的节点，并保证 BST 的性质不变。返回 BST 的根节点（可能被更新）。

**示例**：
```
    5                      5
   / \                    / \
  3   6    删除 3 →      4   6
 / \   \                /     \
2   4   7              2       7
```

---

## 删除操作的三种情况

**情况 1：叶子节点**
直接删除。

```
    5              5
   / \     →      / \
  3   6          X   6
```

**情况 2：只有一个子节点**
用子节点替代被删节点。

```
    5              5
   / \     →      / \
  3   6          2   6
 /
2
```

**情况 3：有两个子节点**
找到**后继**（右子树最小值）或**前驱**（左子树最大值）替代。

```
    5                5                5
   / \     找后继    / \     删后继    / \
  3   6    →       4   6    →       4   6
 / \   \          / \   \          /     \
2   4   7        2   4   7        2       7
                    ↑
                  后继(4)
```

---

## 解法

```javascript
function deleteNode(root, key) {
  if (!root) return null;
  
  // 步骤 1：找到要删除的节点
  if (key < root.val) {
    root.left = deleteNode(root.left, key);
  } else if (key > root.val) {
    root.right = deleteNode(root.right, key);
  } else {
    // 找到了，开始删除
    
    // 情况 1 和 2：没有子节点或只有一个子节点
    if (!root.left) return root.right;
    if (!root.right) return root.left;
    
    // 情况 3：有两个子节点
    // 找右子树的最小值（后继）
    let successor = root.right;
    while (successor.left) {
      successor = successor.left;
    }
    
    // 用后继的值替换当前节点
    root.val = successor.val;
    
    // 删除后继（后继最多只有右子节点）
    root.right = deleteNode(root.right, successor.val);
  }
  
  return root;
}
```

---

## 执行过程详解

```
删除节点 3：

    5                      
   / \                     
  3   6    节点 3 有两个子节点
 / \   \                   
2   4   7                  

步骤 1：找右子树最小值（后继）
  3 的右子树是 4，4 没有左子节点
  后继 = 4

步骤 2：用后继替换
    5
   / \
  4   6    值 3 → 4
 / \   \
2   4   7

步骤 3：删除原来的后继（4）
    5
   / \
  4   6    右子树中删除 4
 /     \
2       7

最终结果：
    5
   / \
  4   6
 /     \
2       7
```

---

## 为什么用后继替换？

**后继**（右子树最小值）满足两个条件：

1. **比左子树所有节点大**：因为它在原节点的右子树中
2. **比右子树所有节点小**：因为它是右子树的最小值

所以用它替换被删节点，**BST 性质保持不变**。

```
    5
   / \
  3   6        后继 4：
 / \   \       - 比 2 大 ✓（在原来 3 的右边）
2   4   7      - 比 6, 7 小 ✓（是右子树最小）
    ↑
   后继
```

同理，也可以用**前驱**（左子树最大值）。

---

## 用前驱的写法

```javascript
// 找左子树的最大值（前驱）
let predecessor = root.left;
while (predecessor.right) {
  predecessor = predecessor.right;
}

root.val = predecessor.val;
root.left = deleteNode(root.left, predecessor.val);
```

---

## 边界情况

```javascript
// 测试用例
deleteNode(null, 1);              // 空树 → null
deleteNode(node(1), 1);           // 删除唯一节点 → null
deleteNode(node(1), 2);           // 不存在的 key → 原树

// 删除根节点
deleteNode(buildTree([5, 3, 6, 2, 4]), 5);  // 新根可能是 6 或 4

// 删除叶子
deleteNode(buildTree([5, 3, 6, 2, 4]), 2);  // 直接移除
```

---

## 常见错误

### 1. 忘记返回修改后的子树

```javascript
// ❌ 错误：没有连接结果
if (key < root.val) {
  deleteNode(root.left, key);  // 结果丢失了
}

// ✅ 正确
if (key < root.val) {
  root.left = deleteNode(root.left, key);
}
```

### 2. 混淆后继和前驱

```javascript
// 后继：右子树的最小值（一路向左）
let successor = root.right;
while (successor.left) successor = successor.left;

// 前驱：左子树的最大值（一路向右）
let predecessor = root.left;
while (predecessor.right) predecessor = predecessor.right;
```

### 3. 删除后继时在错误的子树中查找

```javascript
// ❌ 错误：在整棵树中删除后继
root = deleteNode(root, successor.val);

// ✅ 正确：只在右子树中删除后继
root.right = deleteNode(root.right, successor.val);
```

---

## 复杂度分析

- **时间复杂度**：O(h)，h 为树高
  - 最坏 O(n)（完全不平衡）
  - 平均 O(log n)（平衡树）

- **空间复杂度**：O(h)，递归栈深度

---

## 非递归写法

```javascript
function deleteNode(root, key) {
  // 找到要删除的节点及其父节点
  let parent = null;
  let current = root;
  
  while (current && current.val !== key) {
    parent = current;
    current = key < current.val ? current.left : current.right;
  }
  
  if (!current) return root;  // 没找到
  
  // 情况 3 转化为情况 1 或 2
  if (current.left && current.right) {
    // 找后继及其父节点
    let succParent = current;
    let successor = current.right;
    while (successor.left) {
      succParent = successor;
      successor = successor.left;
    }
    
    current.val = successor.val;
    current = successor;
    parent = succParent;
  }
  
  // 现在 current 最多只有一个子节点
  const child = current.left || current.right;
  
  if (!parent) {
    return child;  // 删除根节点
  }
  
  if (parent.left === current) {
    parent.left = child;
  } else {
    parent.right = child;
  }
  
  return root;
}
```

---

## 相关题目

| 题目 | 难度 | 关联 |
|------|------|------|
| [450. 删除 BST 节点](https://leetcode.cn/problems/delete-node-in-a-bst/) | 中等 | 本题 |
| [700. BST 中的搜索](https://leetcode.cn/problems/search-in-a-binary-search-tree/) | 简单 | 基础 |
| [701. BST 中的插入](https://leetcode.cn/problems/insert-into-a-binary-search-tree/) | 中等 | 基础 |
| [669. 修剪 BST](https://leetcode.cn/problems/trim-a-binary-search-tree/) | 中等 | 删除变体 |

---

## 小结

BST 删除是三大操作中最复杂的，关键是分三种情况处理：

| 情况 | 处理方法 |
|------|----------|
| 叶子节点 | 直接删除 |
| 一个子节点 | 用子节点替代 |
| 两个子节点 | 用后继/前驱替代，再删除后继/前驱 |

**核心理解**：
- 后继 = 右子树最小值
- 前驱 = 左子树最大值
- 替换后 BST 性质不变
