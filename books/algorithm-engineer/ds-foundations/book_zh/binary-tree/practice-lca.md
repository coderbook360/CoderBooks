# 实战：二叉树的最近公共祖先

找出两个节点的最近公共祖先（LCA, Lowest Common Ancestor）。这是一道经典的树形结构问题。

---

## 问题描述

**LeetCode 236. Lowest Common Ancestor of a Binary Tree**

给定一个二叉树，找到该树中两个指定节点的最近公共祖先。

最近公共祖先的定义：对于有根树 T 的两个节点 p 和 q，最近公共祖先表示为一个节点 x，满足 x 是 p 和 q 的祖先且 x 的深度尽可能大（**一个节点也可以是它自己的祖先**）。

**示例 1**：
```
        3
       / \
      5   1
     / \ / \
    6  2 0  8
      / \
     7   4

输入：root = [3,5,1,6,2,0,8,null,null,7,4], p = 5, q = 1
输出：3
解释：节点 5 和节点 1 的最近公共祖先是节点 3
```

**示例 2**：
```
输入：root = [3,5,1,6,2,0,8,null,null,7,4], p = 5, q = 4
输出：5
解释：节点 5 和节点 4 的最近公共祖先是节点 5
      （因为 5 是 4 的祖先，且是自己的祖先）
```

**约束条件**：
- 树中节点数目在范围 `[2, 10^5]` 内
- `-10^9 <= Node.val <= 10^9`
- 所有 Node.val 互不相同
- p != q
- p 和 q 均存在于给定的二叉树中

---

## 问题分析

LCA 的几种情况：

```
情况1：p 和 q 分别在左右子树
        LCA
       /   \
      p     q
      
情况2：p 是 q 的祖先
      p (LCA)
       \
        ...
         \
          q

情况3：q 是 p 的祖先
      q (LCA)
       \
        ...
         \
          p
```

**核心思路**：递归地在左右子树中寻找 p 和 q

- 如果当前节点就是 p 或 q，返回当前节点
- 如果 p 和 q 分别在左右子树，当前节点就是 LCA
- 如果 p 和 q 都在一侧，返回那一侧的结果

---

## 解法：递归

```javascript
function lowestCommonAncestor(root, p, q) {
  // 终止条件：空节点，或找到 p/q
  if (!root || root === p || root === q) {
    return root;
  }
  
  // 在左右子树中查找
  const left = lowestCommonAncestor(root.left, p, q);
  const right = lowestCommonAncestor(root.right, p, q);
  
  // p 和 q 分别在左右子树，当前节点是 LCA
  if (left && right) {
    return root;
  }
  
  // 都在一侧，返回那一侧的结果
  return left || right;
}
```

---

## 执行过程详解

```
        3
       / \
      5   1
     / \ / \
    6  2 0  8
      / \
     7   4

查找 p = 5, q = 1 的 LCA

lca(3, p=5, q=1):
  lca(5, p=5, q=1):
    root === p (5 === 5)
    return 5
  
  lca(1, p=5, q=1):
    root === q (1 === 1)
    return 1
  
  left = 5, right = 1
  两边都找到了 → return 3

结果：3
```

```
查找 p = 5, q = 4 的 LCA

lca(3, p=5, q=4):
  lca(5, p=5, q=4):
    root === p (5 === 5)
    return 5     ← 直接返回，不再向下搜索
  
  lca(1, p=5, q=4):
    lca(0): return null
    lca(8): return null
    return null
  
  left = 5, right = null
  return 5

结果：5
```

---

## 为什么这样有效？

**递归返回值的含义**：

- 返回 `null`：该子树中不包含 p 或 q
- 返回非空：该子树中找到了 p 或 q（或它们的 LCA）

**三种情况的处理**：

1. `left` 和 `right` 都非空：p 和 q 分别在两边，当前节点是 LCA
2. `left` 非空，`right` 为空：p 和 q 都在左子树，左子树的返回值就是 LCA
3. `left` 为空，`right` 非空：p 和 q 都在右子树

**关键点**：当 `root === p` 或 `root === q` 时直接返回，不再继续搜索。因为：
- 如果另一个节点在下面，当前节点就是 LCA
- 如果另一个节点在别处，需要继续向上传递

---

## 复杂度分析

**时间复杂度**：O(n)
- 最坏情况访问所有节点

**空间复杂度**：O(n)
- 递归栈深度，最坏情况是链状树

---

## 边界情况

```javascript
// 测试用例

// p 是 q 的祖先
//   1
//  /
// 2
lowestCommonAncestor(root, 1, 2);  // → 1

// p 和 q 是同一层的兄弟
//     1
//    / \
//   2   3
lowestCommonAncestor(root, 2, 3);  // → 1

// 大树中的深层节点
// p 和 q 可能在任意位置
```

---

## 常见错误

### 1. 忘记终止条件

```javascript
// ❌ 错误：没有处理空节点
function lca(root, p, q) {
  // 直接开始递归，root 为 null 时会报错
  const left = lca(root.left, p, q);
  ...
}

// ✅ 正确：先检查终止条件
if (!root || root === p || root === q) {
  return root;
}
```

### 2. 混淆返回值含义

```javascript
// ❌ 错误：以为返回值是"是否找到"
if (left === true && right === true) {
  return root;
}

// ✅ 正确：返回值是节点引用，不是布尔值
if (left && right) {
  return root;
}
```

### 3. 继续搜索已找到的节点

```javascript
// ❌ 错误：找到 p 后继续搜索
if (root === p) {
  // 继续递归...
}

// ✅ 正确：找到就返回
if (root === p || root === q) {
  return root;
}
```

---

## 变体问题

### 1. 二叉搜索树的 LCA

如果是 BST，可以利用有序性优化：

```javascript
function lcaOfBST(root, p, q) {
  if (p.val < root.val && q.val < root.val) {
    return lcaOfBST(root.left, p, q);
  }
  if (p.val > root.val && q.val > root.val) {
    return lcaOfBST(root.right, p, q);
  }
  return root;
}
```

### 2. 带父指针的树

如果每个节点有指向父节点的指针，可以转化为"两个链表的相交点"问题。

### 3. 多个节点的 LCA

找多个节点的 LCA：递归地两两求 LCA。

---

## 相关题目

| 题目 | 难度 | 关联点 |
|------|------|--------|
| [235. 二叉搜索树的最近公共祖先](https://leetcode.cn/problems/lowest-common-ancestor-of-a-binary-search-tree/) | 中等 | BST 优化 |
| [1644. 二叉树的最近公共祖先 II](https://leetcode.cn/problems/lowest-common-ancestor-of-a-binary-tree-ii/) | 中等 | p/q 可能不存在 |
| [1650. 二叉树的最近公共祖先 III](https://leetcode.cn/problems/lowest-common-ancestor-of-a-binary-tree-iii/) | 中等 | 有父指针 |
| [1676. 二叉树的最近公共祖先 IV](https://leetcode.cn/problems/lowest-common-ancestor-of-a-binary-tree-iv/) | 中等 | 多个节点 |

---

## 小结

LCA 问题的解法体现了递归的精髓：

1. **定义清晰的返回值**：找到的节点引用，或 null
2. **正确的终止条件**：空节点、找到目标节点
3. **合理的分治**：分别在左右子树查找，根据结果决定返回什么

**核心逻辑**（三行代码）：
```javascript
if (left && right) return root;  // 分别在两边
return left || right;            // 都在一边
```

这道题是树形 DP 和递归分治的经典案例，理解它有助于解决更复杂的树形问题。
