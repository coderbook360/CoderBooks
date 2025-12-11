# 实战：路径总和

判断树中是否存在一条从根到叶子的路径，路径上节点值之和等于目标值。

---

## 问题描述

**LeetCode 112. Path Sum**

给你二叉树的根节点 root 和一个表示目标和的整数 targetSum。判断该树中是否存在**根节点到叶子节点**的路径，这条路径上所有节点值相加等于目标和 targetSum。

**叶子节点**是指没有子节点的节点。

**示例 1**：
```
        5
       / \
      4   8
     /   / \
    11  13  4
   /  \      \
  7    2      1

targetSum = 22
输出：true
解释：路径 5 → 4 → 11 → 2，和为 22
```

**示例 2**：
```
    1
   / \
  2   3

targetSum = 5
输出：false
解释：没有路径和为 5
```

**示例 3**：
```
输入：root = [], targetSum = 0
输出：false
解释：空树没有根到叶子的路径
```

**约束条件**：
- 树中节点的数目在范围 `[0, 5000]` 内
- `-1000 <= Node.val <= 1000`
- `-1000 <= targetSum <= 1000`

---

## 问题分析

**关键点**：
1. 必须是从**根到叶子**的完整路径
2. 叶子节点的定义：没有左子节点也没有右子节点
3. 路径上所有节点值的和等于 targetSum

**递归思路**：
- 从根节点开始，每经过一个节点，从 targetSum 中减去该节点的值
- 到达叶子节点时，检查剩余的 targetSum 是否等于叶子节点的值

---

## 解法一：递归

```javascript
function hasPathSum(root, targetSum) {
  // 空树没有路径
  if (!root) return false;
  
  // 到达叶子节点，检查是否达到目标
  if (!root.left && !root.right) {
    return root.val === targetSum;
  }
  
  // 递归检查左右子树，目标减去当前节点值
  const remaining = targetSum - root.val;
  return hasPathSum(root.left, remaining) || hasPathSum(root.right, remaining);
}
```

---

## 解法二：迭代（栈/DFS）

用栈模拟递归，存储 `[节点, 剩余目标]` 对：

```javascript
function hasPathSum(root, targetSum) {
  if (!root) return false;
  
  const stack = [[root, targetSum]];
  
  while (stack.length > 0) {
    const [node, sum] = stack.pop();
    
    // 叶子节点，检查目标
    if (!node.left && !node.right) {
      if (node.val === sum) return true;
      continue;
    }
    
    // 计算剩余目标
    const remaining = sum - node.val;
    
    // 子节点入栈
    if (node.right) stack.push([node.right, remaining]);
    if (node.left) stack.push([node.left, remaining]);
  }
  
  return false;
}
```

---

## 解法三：迭代（队列/BFS）

```javascript
function hasPathSum(root, targetSum) {
  if (!root) return false;
  
  const queue = [[root, root.val]];  // [节点, 累计和]
  
  while (queue.length > 0) {
    const [node, sum] = queue.shift();
    
    // 叶子节点
    if (!node.left && !node.right) {
      if (sum === targetSum) return true;
      continue;
    }
    
    if (node.left) queue.push([node.left, sum + node.left.val]);
    if (node.right) queue.push([node.right, sum + node.right.val]);
  }
  
  return false;
}
```

---

## 执行过程详解

```
        5
       / \
      4   8
     /   
    11  
   /  \
  7    2

targetSum = 22

递归调用（从目标减去值）：
hasPathSum(5, 22)
  hasPathSum(4, 17)      // 22 - 5 = 17
    hasPathSum(11, 13)   // 17 - 4 = 13
      hasPathSum(7, 2)   // 13 - 11 = 2
        叶子，7 !== 2 → false
      hasPathSum(2, 2)   // 13 - 11 = 2
        叶子，2 === 2 → true ✓
```

---

## 复杂度分析

**时间复杂度**：O(n)
- 最坏情况访问所有节点

**空间复杂度**：O(n)
- 递归：栈深度最坏为 n（链状树）
- 迭代：栈/队列大小最坏为 n

---

## 边界情况

```javascript
// 测试用例
hasPathSum(null, 0);           // 空树 → false
hasPathSum({val: 1}, 1);      // 单节点，目标等于节点值 → true
hasPathSum({val: 1}, 0);      // 单节点，目标不等于节点值 → false

// 只有左子树或右子树的情况
//   1         targetSum = 1
//    \        只有一个叶子节点 2
//     2       路径是 1→2，和为 3，不是 1
// → false

// 负数节点值
//    -2
//     \
//      -3
// targetSum = -5 → true
```

---

## 常见错误

### 1. 混淆叶子节点和空节点

```javascript
// ❌ 错误：把空节点当作叶子
function hasPathSum(root, targetSum) {
  if (!root) return targetSum === 0;  // 空节点，但可能不是叶子
  ...
}

// ✅ 正确：只有左右子节点都为空才是叶子
if (!root.left && !root.right) {
  return root.val === targetSum;
}
```

**反例说明**：

```
    1
   /
  2

targetSum = 1
节点 1 的右子节点是 null，但节点 1 不是叶子！
唯一的叶子是节点 2
```

### 2. 忘记处理空树

```javascript
// ❌ 错误：直接访问 root.val
function hasPathSum(root, targetSum) {
  if (root.val === targetSum) ...  // root 可能为 null
}

// ✅ 正确：先检查空树
if (!root) return false;
```

### 3. 非叶子节点提前返回

```javascript
// ❌ 错误：在非叶子节点就判断
if (node.val === remaining) return true;  // 可能不是叶子

// ✅ 正确：只在叶子节点判断
if (!node.left && !node.right && node.val === remaining) {
  return true;
}
```

---

## 相关题目

| 题目 | 难度 | 关联点 |
|------|------|--------|
| [113. 路径总和 II](https://leetcode.cn/problems/path-sum-ii/) | 中等 | 找出所有路径 |
| [437. 路径总和 III](https://leetcode.cn/problems/path-sum-iii/) | 中等 | 不必从根开始 |
| [124. 二叉树中的最大路径和](https://leetcode.cn/problems/binary-tree-maximum-path-sum/) | 困难 | 任意路径 |
| [129. 求根节点到叶节点数字之和](https://leetcode.cn/problems/sum-root-to-leaf-numbers/) | 中等 | 路径数字 |

---

## 小结

路径总和问题的关键点：

1. **明确路径定义**：本题要求从根到叶子的完整路径
2. **正确判断叶子**：`!node.left && !node.right`
3. **递归参数传递**：每层减去当前节点值

**解法选择**：
- 递归最简洁，推荐
- DFS 迭代适合需要控制遍历过程的场景
- BFS 适合按层处理的场景

这道题是路径问题的基础，理解后可以扩展到更复杂的路径问题（如找所有路径、任意起点路径等）。
