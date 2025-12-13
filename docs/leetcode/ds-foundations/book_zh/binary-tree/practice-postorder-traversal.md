# 实战：后序遍历（递归与迭代）

后序遍历在需要"先处理子树"的场景中非常有用，如计算树高度、删除树、计算目录大小等。

---

## 问题描述

**LeetCode 145. Binary Tree Postorder Traversal**

给你一棵二叉树的根节点 root，返回其节点值的**后序遍历**。

**后序遍历**：左 → 右 → 根

**示例**：
```
    1
     \
      2
     /
    3

输入：root = [1,null,2,3]
输出：[3, 2, 1]
```

---

## 解法一：递归

```javascript
function postorderTraversal(root) {
  const result = [];
  
  function traverse(node) {
    if (!node) return;
    traverse(node.left);       // 左
    traverse(node.right);      // 右
    result.push(node.val);     // 根
  }
  
  traverse(root);
  return result;
}
```

---

## 解法二：迭代（反转法）

**巧妙思路**：后序是 `左 → 右 → 根`，反过来是 `根 → 右 → 左`。

先按 `根 → 右 → 左` 遍历（类似前序，但先左后右入栈），最后反转结果：

```javascript
function postorderTraversal(root) {
  if (!root) return [];
  
  const result = [];
  const stack = [root];
  
  while (stack.length > 0) {
    const node = stack.pop();
    result.push(node.val);  // 根
    
    // 先左后右入栈（出栈顺序：根 → 右 → 左）
    if (node.left) stack.push(node.left);
    if (node.right) stack.push(node.right);
  }
  
  return result.reverse();  // 反转得到：左 → 右 → 根
}
```

**对比前序遍历**：

| 对比项 | 前序（根左右） | 反转后序（根右左） |
|--------|----------------|---------------------|
| 入栈顺序 | 先右后左 | 先左后右 |
| 直接结果 | 根 → 左 → 右 | 根 → 右 → 左 |
| 是否反转 | 否 | 是 |

---

## 执行过程（反转法）

```
      1
     / \
    2   3

stack = [1]

pop 1, result = [1]
push 左2, push 右3
stack = [2, 3]

pop 3, result = [1, 3]
stack = [2]

pop 2, result = [1, 3, 2]
stack = []

反转：[2, 3, 1]
```

---

## 解法三：标准迭代（标记法）

不使用反转，真正按后序遍历。用 `lastVisited` 标记上一次访问的节点：

```javascript
function postorderTraversal(root) {
  const result = [];
  const stack = [];
  let current = root;
  let lastVisited = null;
  
  while (current || stack.length > 0) {
    // 步骤 1：走到最左边
    while (current) {
      stack.push(current);
      current = current.left;
    }
    
    // 查看栈顶（不弹出）
    const node = stack[stack.length - 1];
    
    // 步骤 2：判断是否可以访问
    // 条件：右子树不存在 或 右子树已访问过
    if (!node.right || node.right === lastVisited) {
      result.push(node.val);
      lastVisited = stack.pop();
    } else {
      // 步骤 3：转向右子树
      current = node.right;
    }
  }
  
  return result;
}
```

**关键理解**：后序遍历中，根节点必须在左右子树都访问完后才能访问。用 `lastVisited` 判断右子树是否已处理。

---

## 标准迭代执行过程

```
      1
     / \
    2   3
   /
  4

初始：current = 1, lastVisited = null

步骤 1：走到最左
  push 1, 2, 4
  stack = [1, 2, 4], current = null

步骤 2：查看 4
  4.right = null → 可以访问
  result = [4], lastVisited = 4
  stack = [1, 2]

步骤 3：查看 2
  2.right = null → 可以访问
  result = [4, 2], lastVisited = 2
  stack = [1]

步骤 4：查看 1
  1.right = 3 且 lastVisited ≠ 3 → 转向右子树
  current = 3

步骤 5：处理右子树 3
  push 3, stack = [1, 3]
  current = null
  
  查看 3：3.right = null → 可以访问
  result = [4, 2, 3], lastVisited = 3
  stack = [1]

步骤 6：查看 1
  1.right = 3 且 lastVisited = 3 → 可以访问
  result = [4, 2, 3, 1], lastVisited = 1
  stack = []

最终：[4, 2, 3, 1]
```

---

## 三种方法对比

| 方法 | 代码复杂度 | 空间 | 特点 |
|------|------------|------|------|
| 递归 | 最简单 | O(h) | 面试可用 |
| 反转法 | 简单 | O(n) | 结果需要反转 |
| 标记法 | 较复杂 | O(h) | 真正的后序迭代 |

面试时推荐：先说递归，再展示反转法，有时间可以提标记法。

---

## 边界情况

```javascript
// 测试用例
postorderTraversal(null);           // 空树 → []
postorderTraversal(node(1));        // 单节点 → [1]

// 只有左子树
postorderTraversal(buildTree([1, 2, null, 3]));  // [3, 2, 1]

// 只有右子树
postorderTraversal(buildTree([1, null, 2, null, 3]));  // [3, 2, 1]

// 完全二叉树
postorderTraversal(buildTree([1, 2, 3, 4, 5]));  // [4, 5, 2, 3, 1]
```

---

## 常见错误

### 1. 反转法入栈顺序错误

```javascript
// ❌ 错误：和前序一样先右后左，结果不对
if (node.right) stack.push(node.right);
if (node.left) stack.push(node.left);

// ✅ 正确：先左后右（反过来）
if (node.left) stack.push(node.left);
if (node.right) stack.push(node.right);
```

### 2. 标记法忘记判断 lastVisited

```javascript
// ❌ 错误：没有判断右子树是否已访问
if (!node.right) {
  result.push(node.val);
  stack.pop();
}

// ✅ 正确：两个条件都要检查
if (!node.right || node.right === lastVisited) {
  result.push(node.val);
  lastVisited = stack.pop();
}
```

---

## 后序遍历的应用

后序遍历的特点：**先处理子树，再处理根**。适用于：

| 应用场景 | 说明 |
|----------|------|
| 计算树高度 | 先知道子树高度 |
| 删除二叉树 | 先删子节点，再删父节点 |
| 计算目录大小 | 先计算子目录大小 |
| 表达式树求值 | 先求操作数，再求运算结果 |
| 释放资源 | 自底向上释放 |

---

## 复杂度分析

| 方法 | 时间 | 空间 |
|------|------|------|
| 递归 | O(n) | O(h) |
| 反转法 | O(n) | O(n)（结果数组反转） |
| 标记法 | O(n) | O(h) |

h 为树高，最坏 O(n)，平衡树 O(log n)。

---

## 相关题目

| 题目 | 难度 | 说明 |
|------|------|------|
| [145. 后序遍历](https://leetcode.cn/problems/binary-tree-postorder-traversal/) | 简单 | 本题 |
| [590. N 叉树的后序遍历](https://leetcode.cn/problems/n-ary-tree-postorder-traversal/) | 简单 | 多子节点 |
| [104. 最大深度](https://leetcode.cn/problems/maximum-depth-of-binary-tree/) | 简单 | 后序思想 |
| [110. 平衡二叉树](https://leetcode.cn/problems/balanced-binary-tree/) | 简单 | 后序计算高度 |

---

## 小结

后序遍历是三种遍历中**迭代实现最复杂**的：

| 方法 | 核心思路 |
|------|----------|
| 反转法 | 利用 `根右左` 的反转是 `左右根` |
| 标记法 | 用 `lastVisited` 判断右子树是否已处理 |

**三种遍历迭代复杂度排序**：前序 < 中序 < 后序

**面试建议**：
1. 先写递归版本
2. 展示反转法（简单实用）
3. 有时间再说标记法（展示深度理解）
