# 实战：中序遍历（递归与迭代）

中序遍历对二叉搜索树特别重要——它能按升序输出所有节点。

---

## 问题描述

**LeetCode 94. Binary Tree Inorder Traversal**

给定一个二叉树的根节点 root，返回它的**中序遍历**。

**中序遍历**：左 → 根 → 右

**示例**：
```
    1
     \
      2
     /
    3

输入：root = [1,null,2,3]
输出：[1, 3, 2]
```

---

## 解法一：递归

```javascript
function inorderTraversal(root) {
  const result = [];
  
  function traverse(node) {
    if (!node) return;
    traverse(node.left);       // 左
    result.push(node.val);     // 根
    traverse(node.right);      // 右
  }
  
  traverse(root);
  return result;
}
```

---

## 解法二：迭代

中序遍历的迭代比前序复杂，因为要**先走到最左边**再开始处理：

```javascript
function inorderTraversal(root) {
  const result = [];
  const stack = [];
  let current = root;
  
  while (current || stack.length > 0) {
    // 步骤 1：一直走到最左边
    while (current) {
      stack.push(current);
      current = current.left;
    }
    
    // 步骤 2：访问节点
    current = stack.pop();
    result.push(current.val);
    
    // 步骤 3：转向右子树
    current = current.right;
  }
  
  return result;
}
```

---

## 执行过程可视化

```
      1
     / \
    2   3
   / \
  4   5

初始：current = 1, stack = []

═══════════════════════════════════════════════
步骤 1：走到最左
═══════════════════════════════════════════════
  current = 1, push 1, stack = [1]
  current = 2, push 2, stack = [1, 2]
  current = 4, push 4, stack = [1, 2, 4]
  current = null, 停止

═══════════════════════════════════════════════
步骤 2：访问 4
═══════════════════════════════════════════════
  pop 4, result = [4]
  current = 4.right = null

═══════════════════════════════════════════════
步骤 3：current 为 null，继续 pop
═══════════════════════════════════════════════
  pop 2, result = [4, 2]
  current = 2.right = 5

═══════════════════════════════════════════════
步骤 4：处理右子树 5
═══════════════════════════════════════════════
  current = 5, push 5, stack = [1, 5]
  current = 5.left = null, 停止
  
  pop 5, result = [4, 2, 5]
  current = 5.right = null

═══════════════════════════════════════════════
步骤 5：继续 pop
═══════════════════════════════════════════════
  pop 1, result = [4, 2, 5, 1]
  current = 1.right = 3

═══════════════════════════════════════════════
步骤 6：处理右子树 3
═══════════════════════════════════════════════
  current = 3, push 3, stack = [3]
  current = 3.left = null, 停止
  
  pop 3, result = [4, 2, 5, 1, 3]
  current = 3.right = null

stack 为空，current 为 null，结束

最终：[4, 2, 5, 1, 3]
```

---

## 迭代模板解析

```javascript
while (current || stack.length > 0) {
  // current 不为空：还有左子树要探索
  // stack 不为空：还有祖先节点要回溯
  
  while (current) {
    stack.push(current);      // 入栈
    current = current.left;   // 一路向左
  }
  // 此时 current 为 null，说明左子树探索完毕
  
  current = stack.pop();      // 回溯到祖先
  result.push(current.val);   // 访问
  current = current.right;    // 转向右子树
}
```

---

## 中序遍历的意义：BST 有序输出

对于**二叉搜索树**（BST），中序遍历的结果是**升序排列**的：

```
      4
     / \
    2   6
   / \ / \
  1  3 5  7

中序遍历：[1, 2, 3, 4, 5, 6, 7]  ← 升序！
```

这是因为 BST 的定义：左子树 < 根 < 右子树。

**应用场景**：
- 验证 BST：中序遍历是否严格递增
- 找第 K 小元素：中序遍历到第 K 个
- BST 转有序数组：直接中序遍历

---

## 边界情况

```javascript
// 测试用例
inorderTraversal(null);           // 空树 → []
inorderTraversal(node(1));        // 单节点 → [1]

// 只有左子树
inorderTraversal(buildTree([3, 2, null, 1]));  // [1, 2, 3]

// 只有右子树
inorderTraversal(buildTree([1, null, 2, null, 3]));  // [1, 2, 3]

// 完全二叉树
inorderTraversal(buildTree([4, 2, 6, 1, 3, 5, 7]));  // [1,2,3,4,5,6,7]
```

---

## 常见错误

### 1. 循环条件写错

```javascript
// ❌ 错误：只检查 stack
while (stack.length > 0) {
  // current 可能不为空，但 stack 为空时就退出了
}

// ✅ 正确：两个条件都要检查
while (current || stack.length > 0) {
  // ...
}
```

### 2. 忘记更新 current

```javascript
// ❌ 错误：pop 后没有转向右子树
current = stack.pop();
result.push(current.val);
// 缺少 current = current.right;

// ✅ 正确
current = stack.pop();
result.push(current.val);
current = current.right;  // 转向右子树
```

---

## Morris 遍历（O(1) 空间）

进阶方法，利用叶子节点的空指针实现 O(1) 空间遍历：

```javascript
function inorderTraversal(root) {
  const result = [];
  let current = root;
  
  while (current) {
    if (!current.left) {
      // 没有左子树，直接访问
      result.push(current.val);
      current = current.right;
    } else {
      // 找到左子树的最右节点（前驱）
      let predecessor = current.left;
      while (predecessor.right && predecessor.right !== current) {
        predecessor = predecessor.right;
      }
      
      if (!predecessor.right) {
        // 建立线索
        predecessor.right = current;
        current = current.left;
      } else {
        // 线索已存在，说明左子树已遍历完
        predecessor.right = null;  // 恢复树结构
        result.push(current.val);
        current = current.right;
      }
    }
  }
  
  return result;
}
```

Morris 遍历面试时了解即可，实际使用栈方法更清晰。

---

## 复杂度分析

| 方法 | 时间 | 空间 |
|------|------|------|
| 递归 | O(n) | O(h) |
| 迭代（栈） | O(n) | O(h) |
| Morris | O(n) | O(1) |

h 为树高，最坏 O(n)，平衡树 O(log n)。

---

## 相关题目

| 题目 | 难度 | 说明 |
|------|------|------|
| [94. 中序遍历](https://leetcode.cn/problems/binary-tree-inorder-traversal/) | 简单 | 本题 |
| [98. 验证二叉搜索树](https://leetcode.cn/problems/validate-binary-search-tree/) | 中等 | 中序递增 |
| [230. BST 第 K 小元素](https://leetcode.cn/problems/kth-smallest-element-in-a-bst/) | 中等 | 中序第 K 个 |
| [173. BST 迭代器](https://leetcode.cn/problems/binary-search-tree-iterator/) | 中等 | 迭代版应用 |

---

## 小结

中序遍历迭代版本的核心思路：

```
1. 先走到最左边（把路径上的节点都入栈）
2. 弹出栈顶并访问
3. 转向右子树，重复步骤 1
```

**与前序遍历的区别**：

| 对比 | 前序 | 中序 |
|------|------|------|
| 访问时机 | 入栈时访问 | 出栈时访问 |
| 代码复杂度 | 简单 | 稍复杂 |
| 核心逻辑 | pop 后直接访问 | 先走到最左再访问 |

中序遍历是 BST 操作的基础，迭代版本是面试的常见考点。
