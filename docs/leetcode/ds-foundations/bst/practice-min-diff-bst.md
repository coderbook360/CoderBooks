# 实战：二叉搜索树的最小绝对差

找 BST 中任意两不同节点值之间的最小差值。

---

## 问题描述

**LeetCode 530. Minimum Absolute Difference in BST**

给你一个 BST 的根节点 root，返回树中任意两不同节点值之间的最小差值。差值是一个正数，其数值等于两值之差的绝对值。

**示例**：
```
    4
   / \
  2   6
 / \
1   3

输出：1
解释：最小差值可以是 |1-2|=1、|2-3|=1 或 |3-4|=1
```

---

## 核心思想

**BST 的中序遍历是有序的**。

在有序数组中，最小差值一定出现在**相邻元素**之间。

```
中序遍历：[1, 2, 3, 4, 6]
相邻差值： 1  1  1  2
最小差值：1
```

因此，只需在中序遍历过程中比较相邻元素的差值即可。

---

## 解法

```javascript
function getMinimumDifference(root) {
  let minDiff = Infinity;
  let prev = null;
  
  function inorder(node) {
    if (!node) return;
    
    inorder(node.left);
    
    // 与前一个节点比较
    if (prev !== null) {
      minDiff = Math.min(minDiff, node.val - prev);
    }
    prev = node.val;
    
    inorder(node.right);
  }
  
  inorder(root);
  return minDiff;
}
```

---

## 执行过程可视化

```
    4
   / \
  2   6
 / \
1   3

中序遍历顺序：1 → 2 → 3 → 4 → 6

节点 1: prev = null, 跳过比较
        prev = 1

节点 2: diff = 2 - 1 = 1, minDiff = 1
        prev = 2

节点 3: diff = 3 - 2 = 1, minDiff = 1
        prev = 3

节点 4: diff = 4 - 3 = 1, minDiff = 1
        prev = 4

节点 6: diff = 6 - 4 = 2, minDiff = 1
        prev = 6

最终结果：1
```

---

## 迭代版本

```javascript
function getMinimumDifference(root) {
  const stack = [];
  let current = root;
  let prev = null;
  let minDiff = Infinity;
  
  while (current || stack.length > 0) {
    // 走到最左边
    while (current) {
      stack.push(current);
      current = current.left;
    }
    
    // 访问节点
    current = stack.pop();
    if (prev !== null) {
      minDiff = Math.min(minDiff, current.val - prev);
    }
    prev = current.val;
    
    // 转向右子树
    current = current.right;
  }
  
  return minDiff;
}
```

---

## 为什么只比较相邻元素？

**证明**：在有序数组中，最小差值一定出现在相邻元素之间。

假设最小差值出现在非相邻的 a 和 c 之间（a < b < c）：
- |a - c| = c - a
- |a - b| = b - a
- |b - c| = c - b

因为 c - a = (b - a) + (c - b)，所以 |a - c| ≥ |a - b| 且 |a - c| ≥ |b - c|。

这说明 a 和 c 之间的差值不可能是最小的，最小差值一定在相邻元素之间。

---

## 边界情况

```javascript
// 测试用例
getMinimumDifference(buildTree([1, null, 3]));   // |3-1|=2
getMinimumDifference(buildTree([4, 2, 6, 1, 3])); // 1

// 只有两个节点
getMinimumDifference(buildTree([1, null, 2]));   // 1

// 完美平衡
getMinimumDifference(buildTree([4, 2, 6, 1, 3, 5, 7])); // 1
```

---

## 常见错误

### 1. 比较所有节点对

```javascript
// ❌ 低效：O(n²) 比较所有节点对
function getMinimumDifference(root) {
  const values = [];
  // 收集所有值
  // 两两比较
}

// ✅ 高效：O(n) 只比较相邻元素
function inorder(node) {
  // 利用有序性
}
```

### 2. 没有初始化 prev

```javascript
// ❌ 错误：prev 初始化为 0
let prev = 0;
// 如果第一个节点值是 0，会计算 0 - 0 = 0

// ✅ 正确：prev 初始化为 null
let prev = null;
if (prev !== null) {
  // 第一个节点不参与比较
}
```

### 3. 绝对值计算

```javascript
// 由于中序遍历是升序的，后一个总是 >= 前一个
// 所以 node.val - prev 总是 >= 0，不需要 Math.abs

// ✅ 直接减就行
minDiff = Math.min(minDiff, node.val - prev);
```

---

## 复杂度分析

- **时间复杂度**：O(n)，每个节点访问一次
- **空间复杂度**：O(h)，递归栈或迭代栈的深度

---

## 相关题目

| 题目 | 难度 | 说明 |
|------|------|------|
| [530. BST 最小绝对差](https://leetcode.cn/problems/minimum-absolute-difference-in-bst/) | 简单 | 本题 |
| [783. BST 节点最小距离](https://leetcode.cn/problems/minimum-distance-between-bst-nodes/) | 简单 | 与 530 相同 |
| [94. 中序遍历](https://leetcode.cn/problems/binary-tree-inorder-traversal/) | 简单 | 基础 |
| [98. 验证 BST](https://leetcode.cn/problems/validate-binary-search-tree/) | 中等 | 中序应用 |

---

## 小结

本题利用了 BST 的核心性质：**中序遍历有序**。

```
BST 中序遍历 → 升序数组
最小差值 → 相邻元素之差
```

**解题模式**：
1. 中序遍历 BST
2. 用 prev 记录前一个值
3. 计算 current.val - prev 的最小值

这个模式可以应用于很多需要"相邻比较"的 BST 问题。
