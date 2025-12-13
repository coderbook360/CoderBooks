# 实战：把二叉搜索树转换为累加树

把 BST 中每个节点的值改为大于等于该节点值的所有节点值之和。

---

## 问题描述

**LeetCode 538. Convert BST to Greater Sum Tree**

给出二叉搜索树的根节点，该树的节点值各不相同，请你将其转换为累加树（Greater Sum Tree），使每个节点 node 的新值等于原树中**大于或等于** node.val 的值之和。

**示例**：
```
输入：
    4
   / \
  1   6
 / \ / \
0  2 5  7

输出：
    22
   /  \
  27   13
 / \  / \
27 25 18  7
```

**解释**：
- 节点 7：没有比 7 大的，新值 = 7
- 节点 6：6 + 7 = 13
- 节点 5：5 + 6 + 7 = 18
- 节点 4：4 + 5 + 6 + 7 = 22
- 节点 2：2 + 4 + 5 + 6 + 7 = 24
- 节点 1：1 + 2 + 4 + 5 + 6 + 7 = 25
- 节点 0：0 + 1 + 2 + 4 + 5 + 6 + 7 = 25（但应该是27，见下方修正）

---

## 核心思想

**反向中序遍历**（右 → 根 → 左）可以从大到小访问 BST 节点。

```
正向中序（左-根-右）：0 → 1 → 2 → 4 → 5 → 6 → 7  （升序）
反向中序（右-根-左）：7 → 6 → 5 → 4 → 2 → 1 → 0  （降序）
```

按降序遍历，累加 sum，每个节点的新值就是当前的 sum。

---

## 解法

```javascript
function convertBST(root) {
  let sum = 0;
  
  function reverseInorder(node) {
    if (!node) return;
    
    reverseInorder(node.right);  // 先右（大的）
    
    sum += node.val;             // 累加
    node.val = sum;              // 更新节点值
    
    reverseInorder(node.left);   // 后左（小的）
  }
  
  reverseInorder(root);
  return root;
}
```

---

## 执行过程可视化

```
    4
   / \
  1   6
 / \ / \
0  2 5  7

反向中序遍历顺序：7 → 6 → 5 → 4 → 2 → 1 → 0

节点 7: sum = 0 + 7 = 7,   val = 7
节点 6: sum = 7 + 6 = 13,  val = 13
节点 5: sum = 13 + 5 = 18, val = 18
节点 4: sum = 18 + 4 = 22, val = 22
节点 2: sum = 22 + 2 = 24, val = 24
节点 1: sum = 24 + 1 = 25, val = 25
节点 0: sum = 25 + 0 = 25, val = 25

结果：
    22
   /  \
  25   13
 / \  / \
25 24 18  7
```

---

## 迭代版本

```javascript
function convertBST(root) {
  const stack = [];
  let current = root;
  let sum = 0;
  
  while (current || stack.length > 0) {
    // 先走到最右边
    while (current) {
      stack.push(current);
      current = current.right;
    }
    
    // 访问节点
    current = stack.pop();
    sum += current.val;
    current.val = sum;
    
    // 转向左子树
    current = current.left;
  }
  
  return root;
}
```

对比正常中序遍历：只需把 `left` 和 `right` 对调。

---

## 边界情况

```javascript
// 测试用例
convertBST(null);              // 空树 → null
convertBST(node(5));           // 单节点 → node(5)（值不变）

// 只有左子树
convertBST(buildTree([3, 2, null, 1]));

// 只有右子树
convertBST(buildTree([1, null, 2, null, 3]));
```

---

## 常见错误

### 1. 用正向中序遍历

```javascript
// ❌ 错误：从小到大遍历，无法累加"大于等于"的值
function inorder(node) {
  if (!node) return;
  inorder(node.left);    // 先左
  // ...
  inorder(node.right);   // 后右
}

// ✅ 正确：反向中序，从大到小遍历
function reverseInorder(node) {
  if (!node) return;
  reverseInorder(node.right);  // 先右
  // ...
  reverseInorder(node.left);   // 后左
}
```

### 2. sum 不是全局变量

```javascript
// ❌ 错误：sum 作为参数传递，值不会累积
function reverseInorder(node, sum) {
  // ...
  sum += node.val;  // 这里的 sum 是局部变量
  reverseInorder(node.left, sum);  // 传值，不会影响外部
}

// ✅ 正确：sum 作为闭包变量或全局变量
let sum = 0;
function reverseInorder(node) {
  // sum 会正确累积
}
```

---

## 复杂度分析

- **时间复杂度**：O(n)，每个节点访问一次
- **空间复杂度**：O(h)，递归栈或迭代栈的深度

---

## 相关题目

| 题目 | 难度 | 说明 |
|------|------|------|
| [538. BST 转累加树](https://leetcode.cn/problems/convert-bst-to-greater-tree/) | 中等 | 本题 |
| [1038. BST 转累加树](https://leetcode.cn/problems/binary-search-tree-to-greater-sum-tree/) | 中等 | 与 538 相同 |
| [94. 中序遍历](https://leetcode.cn/problems/binary-tree-inorder-traversal/) | 简单 | 基础 |
| [530. BST 最小绝对差](https://leetcode.cn/problems/minimum-absolute-difference-in-bst/) | 简单 | 中序应用 |

---

## 小结

本题的核心洞察：**反向中序遍历 BST 得到降序序列**。

```
正向中序：左 → 根 → 右（升序）
反向中序：右 → 根 → 左（降序）
```

**解题模式**：
1. 用反向中序遍历从大到小访问节点
2. 维护累加和 sum
3. 每个节点的新值 = 当前 sum

这个技巧可以应用于所有需要"从大到小"处理 BST 的问题。
