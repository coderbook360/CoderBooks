# 实战：二叉搜索树的最近公共祖先

这道题是"二叉树的最近公共祖先"的简化版。利用BST的有序性质，我们可以得到一个更高效的解法。

## 问题描述

给定一个二叉搜索树，找到该树中两个指定节点的最近公共祖先（LCA）。

**最近公共祖先的定义**：对于节点p和q，最近公共祖先是指在树中最低的节点，同时是p和q的祖先（一个节点可以是它自己的祖先）。

**示例**：
```
        6
       / \
      2   8
     / \ / \
    0  4 7  9
      / \
     3   5

p = 2, q = 8  →  输出：6
p = 2, q = 4  →  输出：2
```

## 思路分析

### 普通二叉树的做法

对于普通二叉树，我们需要遍历整棵树来找到p和q：

```javascript
// 普通二叉树LCA - O(n)
function lowestCommonAncestor(root, p, q) {
    if (!root || root === p || root === q) return root;
    
    const left = lowestCommonAncestor(root.left, p, q);
    const right = lowestCommonAncestor(root.right, p, q);
    
    if (left && right) return root;
    return left || right;
}
```

但对于BST，我们可以做得更好。

### BST的特殊性质

在BST中，我们可以**快速判断节点在左子树还是右子树**：
- 如果节点值 < 当前节点值 → 在左子树
- 如果节点值 > 当前节点值 → 在右子树

利用这个性质：
- 如果p和q都小于当前节点 → LCA在左子树
- 如果p和q都大于当前节点 → LCA在右子树
- 否则 → 当前节点就是LCA

### 为什么"分叉点"就是LCA？

当p和q位于当前节点的两侧（或其中一个就是当前节点），意味着：
1. 往左走会丢失q（或p）
2. 往右走会丢失p（或q）
3. 当前节点是唯一能同时到达p和q的节点

## 解法一：递归

```javascript
/**
 * @param {TreeNode} root
 * @param {TreeNode} p
 * @param {TreeNode} q
 * @return {TreeNode}
 */
function lowestCommonAncestor(root, p, q) {
    // 如果p和q都在左子树
    if (p.val < root.val && q.val < root.val) {
        return lowestCommonAncestor(root.left, p, q);
    }
    
    // 如果p和q都在右子树
    if (p.val > root.val && q.val > root.val) {
        return lowestCommonAncestor(root.right, p, q);
    }
    
    // p和q在两侧，或其中一个就是root
    return root;
}
```

## 解法二：迭代

由于这是尾递归，可以轻松转换为迭代：

```javascript
function lowestCommonAncestor(root, p, q) {
    let curr = root;
    
    while (curr) {
        if (p.val < curr.val && q.val < curr.val) {
            // 都在左子树
            curr = curr.left;
        } else if (p.val > curr.val && q.val > curr.val) {
            // 都在右子树
            curr = curr.right;
        } else {
            // 找到分叉点
            return curr;
        }
    }
    
    return null;
}
```

## 执行过程示例

```
        6
       / \
      2   8
     / \ / \
    0  4 7  9

查找 p=2, q=8 的 LCA：

curr = 6
  p(2) < 6，q(8) > 6
  分叉！返回 6

查找 p=2, q=4 的 LCA：

curr = 6
  p(2) < 6，q(4) < 6
  都在左子树，curr = 2

curr = 2
  p(2) = 2，q(4) > 2
  分叉！返回 2
```

## 边界情况

| 情况 | 处理 |
|------|------|
| p或q是根节点 | 根节点就是LCA |
| p是q的祖先 | p就是LCA |
| p和q相同 | 该节点就是LCA |

## 复杂度分析

**时间复杂度**：O(h)
- h是树的高度
- 平衡BST：O(log n)
- 最坏情况（链状）：O(n)

**空间复杂度**：
- 递归：O(h)
- 迭代：O(1)

## 与普通二叉树LCA的对比

| 方面 | 普通二叉树 | BST |
|------|-----------|-----|
| 时间复杂度 | O(n) | O(h) |
| 空间复杂度 | O(n) | O(h) 或 O(1) |
| 思路 | 需要遍历找节点 | 利用有序性直接定位 |

BST版本更高效，因为我们无需遍历整棵树，可以直接"导航"到目标位置。

## 小结

这道题的关键是利用BST的有序性质：

1. **大小决定方向**：通过比较值的大小判断节点在左还是右
2. **分叉即答案**：当p和q位于不同子树（或其中一个是当前节点），当前节点就是LCA
3. **迭代更优**：O(1)空间复杂度

面试中记得先问清楚是BST还是普通二叉树，这会影响你的解法选择。
