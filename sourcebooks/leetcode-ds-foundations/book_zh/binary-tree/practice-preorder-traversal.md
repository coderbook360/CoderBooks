# 实战：前序遍历（递归与迭代）

实现二叉树的前序遍历，掌握递归和迭代两种方式的转换。

---

## 问题描述

**LeetCode 144. Binary Tree Preorder Traversal**

给你二叉树的根节点 root，返回它节点值的**前序遍历**。

**前序遍历**：根 → 左 → 右

**示例**：
```
    1
     \
      2
     /
    3

输入：root = [1,null,2,3]
输出：[1, 2, 3]
```

---

## 解法一：递归

```javascript
function preorderTraversal(root) {
  const result = [];
  
  function traverse(node) {
    if (!node) return;
    result.push(node.val);     // 根
    traverse(node.left);       // 左
    traverse(node.right);      // 右
  }
  
  traverse(root);
  return result;
}
```

递归代码简洁直观，但有递归栈开销。面试中通常要求掌握迭代写法。

---

## 解法二：迭代（用栈模拟）

**核心思想**：用栈模拟递归的调用栈。

```javascript
function preorderTraversal(root) {
  if (!root) return [];
  
  const result = [];
  const stack = [root];
  
  while (stack.length > 0) {
    const node = stack.pop();
    result.push(node.val);  // 访问当前节点
    
    // 注意：先右后左入栈，这样左子树先出栈
    if (node.right) stack.push(node.right);
    if (node.left) stack.push(node.left);
  }
  
  return result;
}
```

---

## 为什么先右后左入栈？

栈是**后进先出**（LIFO），我们希望：
- 先处理左子树
- 后处理右子树

所以入栈顺序要反过来：**先右后左**。

```
入栈顺序：右 → 左
出栈顺序：左 → 右 ✓

      1
     / \
    2   3

stack = [1]
pop 1 → result = [1], push 3, 2
stack = [3, 2]  // 2 在栈顶

pop 2 → result = [1, 2]
stack = [3]

pop 3 → result = [1, 2, 3]
```

---

## 执行过程可视化

```
      1
     / \
    2   3
   / \
  4   5

初始：stack = [1]

步骤 1：pop(1)
  result = [1]
  push 右子节点 3
  push 左子节点 2
  stack = [3, 2]

步骤 2：pop(2)
  result = [1, 2]
  push 右子节点 5
  push 左子节点 4
  stack = [3, 5, 4]

步骤 3：pop(4)
  result = [1, 2, 4]
  无子节点
  stack = [3, 5]

步骤 4：pop(5)
  result = [1, 2, 4, 5]
  无子节点
  stack = [3]

步骤 5：pop(3)
  result = [1, 2, 4, 5, 3]
  无子节点
  stack = []

最终：[1, 2, 4, 5, 3]
```

---

## 解法三：统一迭代模板

前序、中序、后序可以用统一的模板，区别在于处理顺序：

```javascript
function preorderTraversal(root) {
  if (!root) return [];
  
  const result = [];
  const stack = [root];
  
  while (stack.length > 0) {
    const node = stack.pop();
    
    if (node === null) {
      // 遇到 null 标记，下一个节点要被访问
      result.push(stack.pop().val);
      continue;
    }
    
    // 前序：根左右，入栈顺序要反过来：右左根
    if (node.right) stack.push(node.right);
    if (node.left) stack.push(node.left);
    stack.push(node);
    stack.push(null);  // null 作为标记
  }
  
  return result;
}
```

这个模板通用但稍复杂，前序遍历用简单的方法即可。

---

## 边界情况

```javascript
// 测试用例
preorderTraversal(null);           // 空树 → []
preorderTraversal(node(1));        // 单节点 → [1]

// 只有左子树
preorderTraversal(buildTree([1, 2, null, 3]));  // [1, 2, 3]

// 只有右子树
preorderTraversal(buildTree([1, null, 2, null, 3]));  // [1, 2, 3]

// 完全二叉树
preorderTraversal(buildTree([1, 2, 3, 4, 5]));  // [1, 2, 4, 5, 3]
```

---

## 常见错误

### 1. 入栈顺序错误

```javascript
// ❌ 错误：先左后右，导致右子树先被访问
if (node.left) stack.push(node.left);
if (node.right) stack.push(node.right);

// ✅ 正确：先右后左
if (node.right) stack.push(node.right);
if (node.left) stack.push(node.left);
```

### 2. 忘记判空

```javascript
// ❌ 错误：没有判断 root 是否为 null
function preorderTraversal(root) {
  const stack = [root];  // 如果 root 是 null，会出错
  // ...
}

// ✅ 正确
function preorderTraversal(root) {
  if (!root) return [];
  const stack = [root];
  // ...
}
```

---

## 复杂度分析

| 方法 | 时间 | 空间 |
|------|------|------|
| 递归 | O(n) | O(h)，h 为树高 |
| 迭代 | O(n) | O(h) |

最坏情况（完全不平衡树）：h = n，空间 O(n)
最好情况（完全平衡树）：h = log n，空间 O(log n)

---

## 三种遍历方式对比

| 遍历 | 顺序 | 递归位置 | 迭代技巧 |
|------|------|----------|----------|
| 前序 | 根左右 | 先处理根 | 先右后左入栈 |
| 中序 | 左根右 | 中间处理根 | 先走到最左 |
| 后序 | 左右根 | 最后处理根 | 反转法或标记法 |

---

## 相关题目

| 题目 | 难度 | 说明 |
|------|------|------|
| [144. 前序遍历](https://leetcode.cn/problems/binary-tree-preorder-traversal/) | 简单 | 本题 |
| [94. 中序遍历](https://leetcode.cn/problems/binary-tree-inorder-traversal/) | 简单 | 迭代稍复杂 |
| [145. 后序遍历](https://leetcode.cn/problems/binary-tree-postorder-traversal/) | 简单 | 迭代最复杂 |
| [589. N 叉树的前序遍历](https://leetcode.cn/problems/n-ary-tree-preorder-traversal/) | 简单 | 多子节点 |

---

## 小结

前序遍历的两种实现：

| 方法 | 代码复杂度 | 空间效率 | 适用场景 |
|------|------------|----------|----------|
| 递归 | 简单 | 递归栈 | 代码简洁优先 |
| 迭代 | 稍复杂 | 显式栈 | 面试考察 |

**迭代版本关键点**：
- 用栈模拟递归
- **先右后左**入栈，保证左子树先出栈
- 每次 pop 后立即访问节点
