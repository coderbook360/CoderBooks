# 实战：二叉树的最小深度

找到根节点到最近叶子节点的路径长度。注意和最大深度的区别。

---

## 问题描述

**LeetCode 111. Minimum Depth of Binary Tree**

给定一个二叉树，找出其最小深度。最小深度是从根节点到最近叶子节点的最短路径上的节点数量。

**示例 1**：
```
    3
   / \
  9  20
    /  \
   15   7

输入：root = [3,9,20,null,null,15,7]
输出：2（路径 3 → 9）
```

**示例 2**：
```
    1
     \
      2
       \
        3

输入：root = [1,null,2,null,3]
输出：3（路径 1 → 2 → 3）
```

---

## 陷阱：不能直接用最大深度的思路

```javascript
// ❌ 错误写法！
function minDepth(root) {
  if (!root) return 0;
  return Math.min(minDepth(root.left), minDepth(root.right)) + 1;
}
```

**问题在哪？** 如果一个子树为空，会返回 `0 + 1 = 1`，但这不是叶子节点！

```
    1          minDepth(left) = 0
     \         minDepth(right) = 2
      2        
       \       min(0, 2) + 1 = 1 ❌
        3      
               正确答案应该是 3
```

**叶子节点的定义**：没有左子节点也没有右子节点的节点。根节点 1 有右子节点，所以不是叶子。

---

## 正确解法一：递归（分情况讨论）

```javascript
function minDepth(root) {
  if (!root) return 0;
  
  // 情况 1：叶子节点
  if (!root.left && !root.right) return 1;
  
  // 情况 2：只有右子树（左子树为空）
  if (!root.left) return minDepth(root.right) + 1;
  
  // 情况 3：只有左子树（右子树为空）
  if (!root.right) return minDepth(root.left) + 1;
  
  // 情况 4：两边都有
  return Math.min(minDepth(root.left), minDepth(root.right)) + 1;
}
```

**四种情况图解**：

```
情况1：叶子      情况2：只有右    情况3：只有左    情况4：两边都有
   5               1               1               1
                    \             /               / \
                     2           2               2   3
```

---

## 解法二：BFS（更优）

**核心思想**：BFS 按层搜索，遇到的第一个叶子一定是最浅的。

```javascript
function minDepth(root) {
  if (!root) return 0;
  
  const queue = [root];
  let depth = 0;
  
  while (queue.length > 0) {
    depth++;
    const levelSize = queue.length;
    
    for (let i = 0; i < levelSize; i++) {
      const node = queue.shift();
      
      // 找到叶子，直接返回
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

---

## 执行过程对比

```
        1
       / \
      2   3
     /
    4

DFS 过程：
- 递归到 4，返回 1
- 递归到 2，返回 min(1, 0无效) + 1 = 2
- 递归到 3，返回 1
- 根节点返回 min(2, 1) + 1 = 2
- 需要遍历完所有节点才能确定

BFS 过程：
- 第 1 层：[1]，深度 1，不是叶子
- 第 2 层：[2, 3]，深度 2
  - 检查 2：有左子节点，不是叶子
  - 检查 3：没有子节点，是叶子！返回 2
- 提前终止，不需要遍历第 3 层
```

---

## 为什么 BFS 更优？

| 场景 | DFS | BFS |
|------|-----|-----|
| 平衡树 | O(n) | O(n) |
| 极端不平衡树 | O(n) 必须遍历全部 | O(2^d) 可能提前返回 |

**极端例子**：

```
    1           最小深度 = 1（叶子 2 在第 2 层）
   / \
  2   3
      |
      4
      |
     ...（100 层）
      |
     100

BFS：第 2 层就发现叶子 2，立即返回
DFS：必须遍历完右子树的 100 层
```

---

## 边界情况

```javascript
// 测试用例
minDepth(null);               // 空树 → 0
minDepth(node(1));            // 单节点 → 1

// 只有左子树
minDepth(buildTree([1, 2, null]));  // 2

// 只有右子树
minDepth(buildTree([1, null, 2]));  // 2

// 完全不平衡
minDepth(buildTree([1, null, 2, null, 3]));  // 3
```

---

## 常见错误

### 1. 忽略空子树情况

```javascript
// ❌ 错误：空子树返回 0，会干扰 min 计算
function minDepth(root) {
  if (!root) return 0;
  return Math.min(minDepth(root.left), minDepth(root.right)) + 1;
}

// ✅ 正确：分情况处理
if (!root.left) return minDepth(root.right) + 1;
if (!root.right) return minDepth(root.left) + 1;
```

### 2. 混淆最大深度和最小深度

```javascript
// 最大深度：取 max，空子树返回 0 不影响结果
// 最小深度：取 min，空子树返回 0 会错误地选中

// 两者的递归终止条件不同
maxDepth(null) → 0  // 没问题
minDepth(null) → 0  // 会被 min 选中，导致错误
```

---

## 最大深度 vs 最小深度

| 对比项 | 最大深度 | 最小深度 |
|--------|----------|----------|
| 目标 | 最长路径 | 最短路径 |
| 空子树处理 | 直接返回 0 | 需要特判 |
| BFS 优化 | 无法优化 | 可以提前返回 |
| 代码复杂度 | 更简单 | 需要分情况 |

---

## 相关题目

| 题目 | 难度 | 说明 |
|------|------|------|
| [104. 二叉树的最大深度](https://leetcode.cn/problems/maximum-depth-of-binary-tree/) | 简单 | 最大深度 |
| [111. 二叉树的最小深度](https://leetcode.cn/problems/minimum-depth-of-binary-tree/) | 简单 | 本题 |
| [110. 平衡二叉树](https://leetcode.cn/problems/balanced-binary-tree/) | 简单 | 用到深度计算 |
| [559. N 叉树的最大深度](https://leetcode.cn/problems/maximum-depth-of-n-ary-tree/) | 简单 | N 叉树变体 |

---

## 小结

本题的关键陷阱：**空子树不是叶子节点**。

| 方法 | 优势 | 适用场景 |
|------|------|----------|
| DFS（递归） | 代码简洁 | 通用场景 |
| BFS | 可能提前终止 | 不平衡树 |

**处理技巧**：
- 分情况讨论：叶子、只有左、只有右、两边都有
- 或者用 BFS，遇到第一个叶子直接返回

**复杂度**：
- 时间：O(n)
- 空间：O(n)（BFS 的队列或 DFS 的递归栈）
