# 实战：二叉搜索树的最近公共祖先

利用 BST 的有序性，比普通二叉树的 LCA 更简单高效。

---

## 问题描述

**LeetCode 235. Lowest Common Ancestor of a Binary Search Tree**

给定一个二叉搜索树，找到该树中两个指定节点的最近公共祖先（LCA）。

**最近公共祖先**的定义：对于有根树 T 的两个结点 p、q，最近公共祖先表示为一个结点 x，满足 x 是 p、q 的祖先且 x 的深度尽可能大（一个节点也可以是它自己的祖先）。

**示例 1**：
```
        6
       / \
      2   8
     / \ / \
    0  4 7  9
      / \
     3   5

p = 2, q = 8 → 输出：6
解释：2 和 8 分居 6 的两侧，6 是最近公共祖先
```

**示例 2**：
```
p = 2, q = 4 → 输出：2
解释：2 是 4 的祖先，同时 2 也是自己的祖先
```

---

## BST 的特殊性

**普通二叉树的 LCA**：需要搜索两边，时间 O(n)。

**BST 的 LCA**：利用有序性，只需要沿一条路径走，时间 O(h)。

```
BST 性质：左子树 < 根 < 右子树

判断逻辑：
- p, q 都 < 当前节点 → LCA 在左子树
- p, q 都 > 当前节点 → LCA 在右子树
- p, q 分居两侧（或其中一个等于当前节点） → 当前节点就是 LCA
```

---

## 解法一：递归

```javascript
function lowestCommonAncestor(root, p, q) {
  if (p.val < root.val && q.val < root.val) {
    // 两个节点都在左子树
    return lowestCommonAncestor(root.left, p, q);
  }
  if (p.val > root.val && q.val > root.val) {
    // 两个节点都在右子树
    return lowestCommonAncestor(root.right, p, q);
  }
  // 分居两侧，或其中一个等于当前节点
  return root;
}
```

---

## 解法二：迭代

```javascript
function lowestCommonAncestor(root, p, q) {
  while (root) {
    if (p.val < root.val && q.val < root.val) {
      root = root.left;
    } else if (p.val > root.val && q.val > root.val) {
      root = root.right;
    } else {
      return root;
    }
  }
  return null;
}
```

迭代版本空间复杂度 O(1)，更优。

---

## 执行过程可视化

```
        6
       / \
      2   8
     / \ / \
    0  4 7  9

查找 p=2, q=8 的 LCA：

root = 6:
  2 < 6 且 8 > 6
  分居两侧！返回 6

查找 p=2, q=4 的 LCA：

root = 6:
  2 < 6 且 4 < 6
  都在左子树，往左

root = 2:
  2 = 2（p 就是当前节点）
  返回 2

查找 p=0, q=5 的 LCA：

root = 6:
  0 < 6 且 5 < 6
  都在左子树，往左

root = 2:
  0 < 2 且 5 > 2
  分居两侧！返回 2
```

---

## 三种情况图解

```
情况 1：分居两侧          情况 2：祖先关系          情况 3：都在一侧
        6                        2                       6
       / \                      / \                     / \
      2   8                    0   4                   2   8
     ↑     ↑                  ↑    ↑                  ↓ ↓
     p     q                  p    q                  p q
LCA = 6              LCA = 2（p 本身）         继续往左/右找
```

---

## 与普通二叉树 LCA 对比

| 特点 | BST LCA | 普通二叉树 LCA |
|------|---------|----------------|
| 遍历方式 | 单路径 | 两边都要搜 |
| 时间复杂度 | O(h) | O(n) |
| 需要搜全树 | 否 | 是 |
| 利用的性质 | 有序性 | 无 |

**普通二叉树 LCA**（对比）：

```javascript
function lowestCommonAncestor(root, p, q) {
  if (!root || root === p || root === q) return root;
  
  const left = lowestCommonAncestor(root.left, p, q);
  const right = lowestCommonAncestor(root.right, p, q);
  
  if (left && right) return root;  // 分居两侧
  return left || right;            // 在同一侧
}
```

---

## 边界情况

```javascript
// 测试用例
lowestCommonAncestor(root, p, p);     // 同一个节点 → p 本身
lowestCommonAncestor(root, root, q);  // 其中一个是根 → 根
lowestCommonAncestor(node(2), node(2), node(2)); // 单节点 → 2

// p 是 q 的祖先
// q 是 p 的祖先
// p、q 是兄弟节点
```

---

## 常见错误

### 1. 忘记处理相等情况

```javascript
// ❌ 错误：漏掉了 p 或 q 等于当前节点的情况
if (p.val < root.val && q.val < root.val) {
  return lowestCommonAncestor(root.left, p, q);
} else if (p.val > root.val && q.val > root.val) {
  return lowestCommonAncestor(root.right, p, q);
}
// 如果 p.val === root.val 怎么办？

// ✅ 正确：不满足上述条件时，当前节点就是答案
return root;
```

### 2. 用普通二叉树的方法

```javascript
// ❌ 低效：没有利用 BST 性质
function lowestCommonAncestor(root, p, q) {
  if (!root || root === p || root === q) return root;
  const left = lowestCommonAncestor(root.left, p, q);
  const right = lowestCommonAncestor(root.right, p, q);
  if (left && right) return root;
  return left || right;
}

// ✅ 高效：利用有序性，只搜一条路径
```

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
| [235. BST 的 LCA](https://leetcode.cn/problems/lowest-common-ancestor-of-a-binary-search-tree/) | 中等 | 本题 |
| [236. 二叉树的 LCA](https://leetcode.cn/problems/lowest-common-ancestor-of-a-binary-tree/) | 中等 | 普通二叉树版 |
| [1644. 二叉树的 LCA II](https://leetcode.cn/problems/lowest-common-ancestor-of-a-binary-tree-ii/) | 中等 | 节点可能不存在 |
| [1650. 二叉树的 LCA III](https://leetcode.cn/problems/lowest-common-ancestor-of-a-binary-tree-iii/) | 中等 | 有父指针 |

---

## 小结

BST 的 LCA 问题利用了**有序性**，核心判断：

```
p, q 都 < root → 往左找
p, q 都 > root → 往右找
否则 → 当前节点就是 LCA
```

**为什么 BST 更简单？**
- 不需要两边搜索
- 不需要后序回溯
- 只沿一条路径走

**记忆口诀**：
- 同侧同找（都小往左，都大往右）
- 分叉即答（分居两侧，当前就是答案）
