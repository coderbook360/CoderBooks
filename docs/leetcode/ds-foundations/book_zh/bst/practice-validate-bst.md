# 实战：验证二叉搜索树

判断一棵二叉树是否是有效的二叉搜索树（BST）。

---

## 问题描述

**LeetCode 98. Validate Binary Search Tree**

给你一个二叉树的根节点 root，判断其是否是一个有效的二叉搜索树。

**有效 BST 的定义**：
- 节点的左子树只包含**小于**当前节点的数
- 节点的右子树只包含**大于**当前节点的数
- 左右子树也必须是二叉搜索树

**示例 1**：
```
    2
   / \
  1   3

输出：true
```

**示例 2**：
```
    5
   / \
  1   4
     / \
    3   6

输出：false
解释：节点 3 在节点 5 的右子树中，但 3 < 5，违反 BST 定义
```

---

## 常见错误：只比较父子关系

```javascript
// ❌ 错误写法！
function isValidBST(root) {
  if (!root) return true;
  if (root.left && root.left.val >= root.val) return false;
  if (root.right && root.right.val <= root.val) return false;
  return isValidBST(root.left) && isValidBST(root.right);
}
```

**为什么错？** 它只检查了父子关系，没有检查**祖先约束**。

```
    5
   / \
  1   4      ← 4 < 5，通过了父子检查
     / \
    3   6    ← 3 < 4，通过了父子检查
             ← 但 3 在 5 的右子树中！应该 > 5

这个代码会返回 true，但实际应该返回 false
```

---

## 解法一：递归 + 范围约束

**核心思想**：每个节点都有一个有效的取值范围 `(min, max)`。

- 根节点：`(-∞, +∞)`
- 左子节点：`(父节点的 min, 父节点的值)`
- 右子节点：`(父节点的值, 父节点的 max)`

```javascript
function isValidBST(root) {
  return validate(root, -Infinity, Infinity);
}

function validate(node, min, max) {
  if (!node) return true;
  
  // 当前节点必须在范围内
  if (node.val <= min || node.val >= max) return false;
  
  // 递归检查左右子树，缩小范围
  return validate(node.left, min, node.val)      // 左子树上界变为当前值
      && validate(node.right, node.val, max);    // 右子树下界变为当前值
}
```

---

## 执行过程可视化

```
    5
   / \
  1   4
     / \
    3   6

validate(5, -∞, +∞)
  5 在 (-∞, +∞) ✓
  
  validate(1, -∞, 5)
    1 在 (-∞, 5) ✓
    validate(null, -∞, 1) = true
    validate(null, 1, 5) = true
    return true
  
  validate(4, 5, +∞)
    4 在 (5, +∞)? 
    4 <= 5 ❌ 不满足！
    return false

最终返回 false
```

---

## 解法二：中序遍历（利用 BST 性质）

**BST 的中序遍历是严格递增的**。只需检查遍历过程中是否递增即可。

```javascript
function isValidBST(root) {
  let prev = -Infinity;
  
  function inorder(node) {
    if (!node) return true;
    
    // 先遍历左子树
    if (!inorder(node.left)) return false;
    
    // 检查当前节点是否大于前一个
    if (node.val <= prev) return false;
    prev = node.val;
    
    // 遍历右子树
    return inorder(node.right);
  }
  
  return inorder(root);
}
```

---

## 中序遍历过程

```
    5
   / \
  1   4
     / \
    3   6

中序遍历顺序：1 → 5 → 3 → 4 → 6

prev = -∞
访问 1：1 > -∞ ✓，prev = 1
访问 5：5 > 1 ✓，prev = 5
访问 3：3 > 5? ❌ 
返回 false
```

---

## 迭代中序遍历版本

```javascript
function isValidBST(root) {
  const stack = [];
  let current = root;
  let prev = -Infinity;
  
  while (current || stack.length > 0) {
    while (current) {
      stack.push(current);
      current = current.left;
    }
    
    current = stack.pop();
    
    // 检查是否递增
    if (current.val <= prev) return false;
    prev = current.val;
    
    current = current.right;
  }
  
  return true;
}
```

---

## 两种方法对比

| 方法 | 思路 | 优点 | 缺点 |
|------|------|------|------|
| 范围约束 | 传递有效范围 | 直观，可提前终止 | 需要传递边界值 |
| 中序遍历 | 利用有序性 | 代码简洁 | 需要额外变量记录前一个值 |

---

## 边界情况

```javascript
// 测试用例
isValidBST(null);              // 空树 → true
isValidBST(node(1));           // 单节点 → true

// 相等节点
isValidBST(buildTree([2, 2])); // 左子节点等于根 → false

// 最小/最大值
isValidBST(buildTree([2147483647]));  // 边界值 → true

// 注意：题目要求严格大于/小于，不允许等于
```

---

## 常见错误

### 1. 只检查直接父子关系

```javascript
// ❌ 错误：忽略了祖先约束
if (root.left && root.left.val >= root.val) return false;

// ✅ 正确：使用范围约束
return validate(node.left, min, node.val);
```

### 2. 用 `<` 而非 `<=`

```javascript
// ❌ 错误：允许相等
if (node.val < min || node.val > max) return false;

// ✅ 正确：不允许相等
if (node.val <= min || node.val >= max) return false;
```

### 3. 中序遍历没有提前终止

```javascript
// ❌ 错误：找到问题后仍继续遍历
function inorder(node) {
  if (!node) return;
  inorder(node.left);
  if (node.val <= prev) valid = false;  // 标记但不返回
  prev = node.val;
  inorder(node.right);
}

// ✅ 正确：立即返回
function inorder(node) {
  if (!node) return true;
  if (!inorder(node.left)) return false;  // 提前终止
  if (node.val <= prev) return false;
  prev = node.val;
  return inorder(node.right);
}
```

---

## 复杂度分析

| 方法 | 时间 | 空间 |
|------|------|------|
| 范围约束 | O(n) | O(h) |
| 中序遍历 | O(n) | O(h) |

h 为树高，最坏 O(n)，平衡树 O(log n)。

---

## 相关题目

| 题目 | 难度 | 关联 |
|------|------|------|
| [98. 验证 BST](https://leetcode.cn/problems/validate-binary-search-tree/) | 中等 | 本题 |
| [94. 中序遍历](https://leetcode.cn/problems/binary-tree-inorder-traversal/) | 简单 | 基础 |
| [501. BST 中的众数](https://leetcode.cn/problems/find-mode-in-binary-search-tree/) | 简单 | 中序应用 |
| [230. 第 K 小元素](https://leetcode.cn/problems/kth-smallest-element-in-a-bst/) | 中等 | 中序应用 |

---

## 小结

验证 BST 的关键洞察：

1. **BST 的约束是全局的**：不只是父子关系，而是整个子树
2. **两种视角**：
   - 范围约束：自顶向下传递有效范围
   - 中序遍历：利用 BST 的有序性

**记住陷阱**：只比较父子关系是最常见的错误。面试时可以先举反例说明为什么简单做法不行。
    3   6

范围法：
validate(5, -∞, +∞): 有效
validate(1, -∞, 5): 有效
validate(4, 5, +∞): 4 <= 5, 无效！

中序法：
1, 5, 3, ...  3 < 5, 不递增，无效！
```

---

## 复杂度

- 时间：O(n)
- 空间：O(n)
