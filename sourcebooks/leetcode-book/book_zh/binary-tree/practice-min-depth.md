# 实战：二叉树的最小深度

最小深度看起来和最大深度很像，但有一个重要的陷阱：空子树的处理方式不同。

## 问题描述

给定一个二叉树，找出其最小深度。

最小深度是从根节点到**最近叶子节点**的最短路径上的节点数量。

**注意**：叶子节点是指没有子节点的节点。

**示例 1：**
```
输入：root = [3,9,20,null,null,15,7]
        3
       / \
      9  20
        /  \
       15   7
输出：2（路径 3 -> 9）
```

**示例 2：**
```
输入：root = [2,null,3,null,4,null,5,null,6]
输出：5
```

## 思路分析

你可能会想：最小深度不就是 `1 + min(左深度, 右深度)` 吗？

**这是错的！**

考虑这棵树：
```
    1
     \
      2
```
按照上面的公式，左子树深度是 0，右子树深度是 1，最小深度是 `1 + min(0, 1) = 1`。

但这是错的！根节点 1 不是叶子节点（它有右子节点），所以最小深度应该是 2（路径 1 -> 2）。

**关键**：只有当节点是叶子节点时，才能返回深度。如果一个节点只有一个子节点，必须走到那个子节点的叶子才行。

## 解法一：递归

```javascript
function minDepth(root) {
    if (!root) return 0;
    
    // 叶子节点
    if (!root.left && !root.right) return 1;
    
    // 只有右子树
    if (!root.left) return 1 + minDepth(root.right);
    
    // 只有左子树
    if (!root.right) return 1 + minDepth(root.left);
    
    // 左右子树都有
    return 1 + Math.min(minDepth(root.left), minDepth(root.right));
}
```

**复杂度分析：**
- 时间复杂度：O(n)
- 空间复杂度：O(h)

## 解法二：BFS（推荐）

对于最小深度问题，BFS 其实更高效。因为 BFS 是一层一层遍历的，**第一个遇到的叶子节点就是最近的叶子节点**，此时可以立即返回，不需要遍历整棵树。

```javascript
function minDepth(root) {
    if (!root) return 0;
    
    const queue = [root];
    let depth = 0;
    
    while (queue.length) {
        depth++;
        const levelSize = queue.length;
        
        for (let i = 0; i < levelSize; i++) {
            const node = queue.shift();
            
            // 找到叶子节点，立即返回
            if (!node.left && !node.right) {
                return depth;
            }
            
            if (node.left) queue.push(node.left);
            if (node.right) queue.push(node.right);
        }
    }
    
    return depth;
}
```

BFS 的优势在于：如果树很不平衡（比如一边很深，一边很浅），BFS 能更快找到答案。

## 最大深度 vs 最小深度

对比一下两者的区别：

**最大深度**：
```javascript
return 1 + Math.max(maxDepth(left), maxDepth(right));
```
空子树深度为 0，不影响取最大值。

**最小深度**：
```javascript
// 必须处理只有一个子树的情况
if (!left) return 1 + minDepth(right);
if (!right) return 1 + minDepth(left);
return 1 + Math.min(minDepth(left), minDepth(right));
```
空子树不能参与取最小值，因为题目要求的是到叶子节点的路径。

## 小结

最小深度问题教给我们一个重要的教训：**不要想当然地套用模式**。看起来很像的两道题，细节可能完全不同。

做题时，一定要仔细理解题意，特别注意边界情况。"叶子节点"这个限制条件，决定了我们不能简单地把最大深度的代码改成 min。
