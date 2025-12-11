# 实战：平衡二叉树

判断一棵二叉树是否是高度平衡的。本题展示了"自顶向下"和"自底向上"两种不同的递归思路。

---

## 问题描述

**LeetCode 110. Balanced Binary Tree**

给定一个二叉树，判断它是否是高度平衡的二叉树。

高度平衡二叉树的定义：一个二叉树**每个节点**的左右两个子树的高度差的绝对值不超过 1。

**示例 1**：
```
      3
     / \
    9  20
      /  \
     15   7

输出：true
解释：每个节点的左右子树高度差都 ≤ 1
```

**示例 2**：
```
        1
       / \
      2   2
     / \
    3   3
   / \
  4   4

输出：false
解释：根节点的左子树高度为 3，右子树高度为 1，差值为 2
```

**约束条件**：
- 树中的节点数在范围 `[0, 5000]` 内
- `-10^4 <= Node.val <= 10^4`

---

## 问题分析

**平衡的条件**：
1. 当前节点的左右子树高度差 ≤ 1
2. 左子树是平衡的
3. 右子树是平衡的

注意：所有节点都必须满足平衡条件，不仅仅是根节点。

```
反例：根节点平衡，但子节点不平衡

      1          根节点：左高2，右高2，平衡
     / \
    2   3        节点2：左高1，右高0，平衡
   /     \       节点3：左高0，右高1，平衡
  4       5      但整体是平衡的（这个例子是平衡的）
```

---

## 解法一：自顶向下（暴力）

对每个节点，分别计算左右子树高度，判断是否平衡：

```javascript
function isBalanced(root) {
  if (!root) return true;
  
  // 计算左右子树高度
  const leftHeight = getHeight(root.left);
  const rightHeight = getHeight(root.right);
  
  // 当前节点是否平衡
  if (Math.abs(leftHeight - rightHeight) > 1) {
    return false;
  }
  
  // 递归检查左右子树
  return isBalanced(root.left) && isBalanced(root.right);
}

function getHeight(node) {
  if (!node) return 0;
  return Math.max(getHeight(node.left), getHeight(node.right)) + 1;
}
```

**问题**：时间复杂度 O(n²)

每个节点都会调用 getHeight，而 getHeight 本身是 O(n) 的。导致大量重复计算。

```
对于节点 1，计算整棵树的高度
对于节点 2，重新计算以 2 为根的子树高度
对于节点 3，重新计算以 3 为根的子树高度
...
```

---

## 解法二：自底向上（优化）

**核心思想**：在计算高度的同时判断是否平衡，一旦发现不平衡立即返回。

用特殊值 `-1` 表示"不平衡"：

```javascript
function isBalanced(root) {
  return checkHeight(root) !== -1;
}

function checkHeight(node) {
  // 空节点高度为 0
  if (!node) return 0;
  
  // 检查左子树
  const leftHeight = checkHeight(node.left);
  if (leftHeight === -1) return -1;  // 左子树不平衡，提前返回
  
  // 检查右子树
  const rightHeight = checkHeight(node.right);
  if (rightHeight === -1) return -1;  // 右子树不平衡，提前返回
  
  // 当前节点是否平衡
  if (Math.abs(leftHeight - rightHeight) > 1) {
    return -1;  // 不平衡
  }
  
  // 返回当前节点高度
  return Math.max(leftHeight, rightHeight) + 1;
}
```

**时间复杂度**：O(n)，每个节点只访问一次。

---

## 执行过程对比

```
      1
     / \
    2   3
   /
  4

【自顶向下】
isBalanced(1):
  getHeight(2) = 2   // 遍历 2, 4
  getHeight(3) = 1   // 遍历 3
  |2 - 1| = 1 ≤ 1 ✓
  
  isBalanced(2):
    getHeight(4) = 1  // 重复遍历 4
    getHeight(null) = 0
    |1 - 0| = 1 ≤ 1 ✓
    
    isBalanced(4): true
    isBalanced(null): true
  
  isBalanced(3): true

总遍历次数：节点 4 被遍历了 2 次

【自底向上】
checkHeight(1):
  checkHeight(2):
    checkHeight(4):
      checkHeight(null) = 0
      checkHeight(null) = 0
      return 1
    checkHeight(null) = 0
    |1 - 0| = 1 ≤ 1 ✓
    return 2
  checkHeight(3):
    checkHeight(null) = 0
    checkHeight(null) = 0
    return 1
  |2 - 1| = 1 ≤ 1 ✓
  return 3

总遍历次数：每个节点只访问 1 次
```

---

## 两种方法对比

| 方法 | 时间 | 空间 | 思路 |
|------|------|------|------|
| 自顶向下 | O(n²) | O(n) | 先判断当前，再递归子树；每次重新计算高度 |
| 自底向上 | O(n) | O(n) | 在计算高度时顺便判断；用 -1 表示不平衡 |

**自底向上更优**，是这道题的标准解法。

---

## 复杂度分析（自底向上）

**时间复杂度**：O(n)
- 每个节点访问一次

**空间复杂度**：O(n)
- 递归栈深度，最坏情况（链状树）为 n

---

## 边界情况

```javascript
// 测试用例
isBalanced(null);           // 空树 → true
isBalanced({val: 1});      // 单节点 → true

// 链状树
//   1
//    \
//     2
//      \
//       3
// → false（高度差超过 1）

// 完美平衡
//       1
//      / \
//     2   3
//    / \ / \
//   4  5 6  7
// → true
```

---

## 常见错误

### 1. 只检查根节点

```javascript
// ❌ 错误：只检查根节点的平衡性
function isBalanced(root) {
  const leftHeight = getHeight(root.left);
  const rightHeight = getHeight(root.right);
  return Math.abs(leftHeight - rightHeight) <= 1;
}
// 没有递归检查子节点

// ✅ 正确：需要检查所有节点
return Math.abs(leftHeight - rightHeight) <= 1
  && isBalanced(root.left) 
  && isBalanced(root.right);
```

### 2. 提前返回逻辑错误

```javascript
// ❌ 错误：忘记提前返回
const leftHeight = checkHeight(node.left);
const rightHeight = checkHeight(node.right);
// 即使左子树不平衡，仍然计算右子树

// ✅ 正确：发现不平衡立即返回
const leftHeight = checkHeight(node.left);
if (leftHeight === -1) return -1;  // 提前返回
```

### 3. 返回值含义混乱

```javascript
// ❌ 错误：用 0 表示不平衡
if (Math.abs(leftHeight - rightHeight) > 1) return 0;
// 但空节点高度也是 0，会混淆

// ✅ 正确：用 -1 表示不平衡（高度不可能是负数）
if (Math.abs(leftHeight - rightHeight) > 1) return -1;
```

---

## 相关题目

| 题目 | 难度 | 关联点 |
|------|------|--------|
| [104. 二叉树的最大深度](https://leetcode.cn/problems/maximum-depth-of-binary-tree/) | 简单 | 计算高度 |
| [111. 二叉树的最小深度](https://leetcode.cn/problems/minimum-depth-of-binary-tree/) | 简单 | 深度变体 |
| [1382. 将二叉搜索树变平衡](https://leetcode.cn/problems/balance-a-binary-search-tree/) | 中等 | 构造平衡树 |

---

## 小结

本题展示了两种重要的递归思路：

1. **自顶向下**：先处理当前节点，再递归处理子节点
   - 直观但可能有重复计算
   - 适合不需要子节点结果的场景

2. **自底向上**：先递归处理子节点，利用子节点结果处理当前节点
   - 避免重复计算
   - 适合需要子节点信息的场景

**关键技巧**：用特殊返回值（如 -1）在递归过程中传递"异常"状态，实现提前终止。

这种"在计算过程中顺便判断"的思想，是优化递归算法的常用技巧。
