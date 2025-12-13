# 实战：翻转二叉树

把二叉树的左右子树交换，递归进行。这道题因一个著名的推特而广为人知。

---

## 问题描述

**LeetCode 226. Invert Binary Tree**

给你一棵二叉树的根节点 root，翻转这棵二叉树，并返回其根节点。

**示例 1**：
```
输入：    4           输出：    4
        / \                  / \
       2   7                7   2
      / \ / \              / \ / \
     1  3 6  9            9  6 3  1
```

**示例 2**：
```
输入：  2        输出：  2
       / \             / \
      1   3           3   1
```

**约束条件**：
- 树中节点数目范围在 `[0, 100]` 内
- `-100 <= Node.val <= 100`

---

## 问题分析

翻转二叉树就是**递归地交换每个节点的左右子节点**。

```
原始树：        翻转后：
    4              4
   / \            / \
  2   7    →     7   2
 / \ / \        / \ / \
1  3 6  9      9  6 3  1

观察：每个节点的左右子树都交换了位置
```

**递归思路**：
1. 交换当前节点的左右子节点
2. 递归翻转左子树
3. 递归翻转右子树

---

## 解法一：递归（前序）

先交换，再递归：

```javascript
function invertTree(root) {
  if (!root) return null;
  
  // 交换左右子树
  [root.left, root.right] = [root.right, root.left];
  
  // 递归翻转子树
  invertTree(root.left);
  invertTree(root.right);
  
  return root;
}
```

---

## 解法二：递归（后序）

先递归，再交换：

```javascript
function invertTree(root) {
  if (!root) return null;
  
  // 先递归翻转子树
  const left = invertTree(root.left);
  const right = invertTree(root.right);
  
  // 再交换
  root.left = right;
  root.right = left;
  
  return root;
}
```

**两种顺序都正确**，因为交换和递归是独立的操作。

---

## 解法三：BFS 迭代

层序遍历，每个节点都交换：

```javascript
function invertTree(root) {
  if (!root) return null;
  
  const queue = [root];
  
  while (queue.length > 0) {
    const node = queue.shift();
    
    // 交换左右子节点
    [node.left, node.right] = [node.right, node.left];
    
    // 子节点入队
    if (node.left) queue.push(node.left);
    if (node.right) queue.push(node.right);
  }
  
  return root;
}
```

---

## 执行过程可视化

```
前序递归翻转：

Step 1: 访问 4，交换子节点
      4               4
     / \     →       / \
    2   7           7   2
   / \ / \         / \ / \
  1  3 6  9       6  9 1  3

Step 2: 访问 7（原来的右子树，现在是左子树），交换子节点
      4               4
     / \     →       / \
    7   2           7   2
   / \ / \         / \ / \
  6  9 1  3       9  6 1  3

Step 3: 访问 2，交换子节点
      4               4
     / \     →       / \
    7   2           7   2
   / \ / \         / \ / \
  9  6 1  3       9  6 3  1

最终结果：
    4
   / \
  7   2
 / \ / \
9  6 3  1
```

---

## 复杂度分析

**时间复杂度**：O(n)
- 每个节点访问一次

**空间复杂度**：O(n)
- 递归：最坏情况（链状树）栈深度为 n
- 迭代：队列最多存储 n/2 个节点（最底层）

---

## 边界情况

```javascript
// 测试用例
invertTree(null);          // 空树 → null
invertTree({val: 1});     // 单节点 → 不变

// 只有左子树
//   1           1
//  /      →      \
// 2               2
invertTree({val: 1, left: {val: 2}});

// 只有右子树
//   1           1
//    \    →    /
//     2       2
invertTree({val: 1, right: {val: 2}});
```

---

## 常见错误

### 1. 递归时使用已交换的引用

```javascript
// ❌ 潜在错误：交换后 root.left 已经改变
[root.left, root.right] = [root.right, root.left];
invertTree(root.left);   // 这里的 root.left 是原来的 right

// ✅ 没问题，因为我们就是要翻转交换后的子树
// 但如果你想先递归再交换，要保存原始引用
```

### 2. 忘记返回根节点

```javascript
// ❌ 错误：忘记返回
function invertTree(root) {
  if (!root) return null;
  [root.left, root.right] = [root.right, root.left];
  invertTree(root.left);
  invertTree(root.right);
  // 没有 return
}

// ✅ 正确：返回根节点
return root;
```

---

## 关于这道题的趣闻

这道题因为 Homebrew 作者 Max Howell 的推特而出名：

> "Google: 90% of our engineers use the software you wrote (Homebrew), but you can't invert a binary tree on a whiteboard so f*** off."

这引发了关于面试方式和实际能力关系的广泛讨论。

**启示**：
- 算法面试题不能完全反映实际工程能力
- 但基础数据结构操作是程序员应该掌握的
- 这道题本身很简单，关键是清晰的思路和无 bug 的代码

---

## 相关题目

| 题目 | 难度 | 关联点 |
|------|------|--------|
| [101. 对称二叉树](https://leetcode.cn/problems/symmetric-tree/) | 简单 | 镜像判断 |
| [100. 相同的树](https://leetcode.cn/problems/same-tree/) | 简单 | 结构比较 |
| [951. 翻转等价二叉树](https://leetcode.cn/problems/flip-equivalent-binary-trees/) | 中等 | 翻转变体 |

---

## 小结

翻转二叉树是最简单的二叉树修改操作之一：

1. **核心操作**：交换每个节点的左右子节点
2. **遍历方式**：前序、后序、层序都可以
3. **递归思维**：把大问题分解为子问题

这道题虽然简单，但展示了二叉树操作的基本模式：
- 处理当前节点
- 递归处理子树
- 正确处理空节点边界
