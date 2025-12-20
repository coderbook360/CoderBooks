# 实战：二叉搜索树中的众数

找出 BST 中出现频率最高的元素（可能有多个）。

---

## 问题描述

**LeetCode 501. Find Mode in Binary Search Tree**

给你一个含重复值的 BST 的根节点 root，找出并返回 BST 中的所有众数（即出现频率最高的元素）。

**示例**：
```
    1
     \
      2
     /
    2

输出：[2]
```

---

## 思路

BST 的中序遍历是有序的，相同元素会相邻出现，便于统计频率。

---

## 解法

```javascript
function findMode(root) {
  let prev = null;
  let currentCount = 0;
  let maxCount = 0;
  const modes = [];
  
  function inorder(node) {
    if (!node) return;
    
    inorder(node.left);
    
    // 统计当前值的频率
    if (node.val === prev) {
      currentCount++;
    } else {
      currentCount = 1;
    }
    prev = node.val;
    
    // 更新众数
    if (currentCount > maxCount) {
      maxCount = currentCount;
      modes.length = 0;
      modes.push(node.val);
    } else if (currentCount === maxCount) {
      modes.push(node.val);
    }
    
    inorder(node.right);
  }
  
  inorder(root);
  return modes;
}
```

---

## 执行过程

```
    1
     \
      2
     /
    2

中序：1 → 2 → 2

node=1: count=1, max=1, modes=[1]
node=2: count=1, max=1, modes=[1,2]
node=2: count=2, max=2, modes=[2]

结果：[2]
```

---

## 为什么能 O(1) 空间？

因为 BST 中序有序，相同元素连续，我们只需要跟踪：
- 前一个值 `prev`
- 当前计数 `currentCount`
- 最大计数 `maxCount`

不需要额外的哈希表。

---

## 多众数情况

```
      5
     / \
    3   5
   / \
  3   3

中序：3 → 3 → 3 → 5 → 5

node=3: count=1, max=1, modes=[3]
node=3: count=2, max=2, modes=[3]
node=3: count=3, max=3, modes=[3]
node=5: count=1, max=3, modes=[3]
node=5: count=2, max=3, modes=[3]

结果：[3]
```

**当有多个众数时**：

```
    1
   / \
  1   2
     / \
    2   2

中序：1 → 1 → 2 → 2

node=1: count=1, max=1, modes=[1]
node=1: count=2, max=2, modes=[1]
node=2: count=1, max=2, modes=[1]
node=2: count=2, max=2, modes=[1,2]

结果：[1, 2]
```

---

## 边界情况

```javascript
// 单节点
findMode({val: 5, left: null, right: null});
// 返回 [5]

// 全部相同
//     2
//    / \
//   2   2
findMode(root);
// 返回 [2]

// 所有值都不同
//     1
//    / \
//   0   2
findMode(root);
// 返回 [0, 1, 2]（每个值出现1次，都是众数）
```

---

## 常见错误

### 错误一：忘记处理相等频率

```javascript
// 错误：只在频率更大时更新
if (currentCount > maxCount) {
  maxCount = currentCount;
  modes.length = 0;
  modes.push(node.val);
}
// 缺少 else if 分支！

// 正确：
if (currentCount > maxCount) {
  maxCount = currentCount;
  modes.length = 0;
  modes.push(node.val);
} else if (currentCount === maxCount) {
  modes.push(node.val);  // 频率相等也要加入
}
```

### 错误二：用哈希表统计（空间 O(n)）

```javascript
// 虽然正确，但没有利用 BST 的有序性
function findMode(root) {
  const map = new Map();
  // 遍历统计频率...
}
```

BST 的中序有序性允许我们用 O(1) 空间解决。

### 错误三：在递归中返回值而不是修改外部变量

```javascript
// 错误：递归中返回局部结果
function inorder(node) {
  if (!node) return [];
  // 无法正确合并多个众数
}

// 正确：使用闭包变量
let modes = [];
function inorder(node) {
  // 直接修改 modes
}
```

---

## 迭代解法

```javascript
function findMode(root) {
  if (!root) return [];
  
  const stack = [];
  let curr = root;
  let prev = null;
  let currentCount = 0;
  let maxCount = 0;
  const modes = [];
  
  while (curr || stack.length) {
    while (curr) {
      stack.push(curr);
      curr = curr.left;
    }
    
    curr = stack.pop();
    
    // 统计频率
    if (curr.val === prev) {
      currentCount++;
    } else {
      currentCount = 1;
    }
    prev = curr.val;
    
    // 更新众数
    if (currentCount > maxCount) {
      maxCount = currentCount;
      modes.length = 0;
      modes.push(curr.val);
    } else if (currentCount === maxCount) {
      modes.push(curr.val);
    }
    
    curr = curr.right;
  }
  
  return modes;
}
```

---

## Morris 遍历（真正 O(1) 空间）

递归和迭代的空间复杂度实际上是 O(h)（递归栈或显式栈）。如果要真正实现 O(1) 空间，需要用 Morris 遍历：

```javascript
function findMode(root) {
  let curr = root;
  let prev = null;
  let currentCount = 0;
  let maxCount = 0;
  const modes = [];
  
  while (curr) {
    if (!curr.left) {
      // 访问当前节点
      process(curr);
      curr = curr.right;
    } else {
      // 找前驱
      let pred = curr.left;
      while (pred.right && pred.right !== curr) {
        pred = pred.right;
      }
      
      if (!pred.right) {
        pred.right = curr;
        curr = curr.left;
      } else {
        pred.right = null;
        process(curr);
        curr = curr.right;
      }
    }
  }
  
  function process(node) {
    if (node.val === prev) {
      currentCount++;
    } else {
      currentCount = 1;
    }
    prev = node.val;
    
    if (currentCount > maxCount) {
      maxCount = currentCount;
      modes.length = 0;
      modes.push(node.val);
    } else if (currentCount === maxCount) {
      modes.push(node.val);
    }
  }
  
  return modes;
}
```

---

## 与普通树的对比

| 问题 | BST 解法 | 普通树解法 |
|------|---------|-----------|
| 空间 | O(1)* | O(n) 哈希表 |
| 原理 | 中序有序，相同元素相邻 | 必须统计所有元素 |
| 遍历 | 一次中序遍历 | 两次遍历（统计+筛选）|

*不算递归栈，Morris 遍历可真正 O(1)

---

## 相关题目

| 题目 | 难度 | 关键点 |
|------|------|--------|
| 501. 二叉搜索树中的众数 | 简单 | 本题 |
| 98. 验证二叉搜索树 | 中等 | 中序遍历有序性 |
| 530. 二叉搜索树的最小绝对差 | 简单 | 相邻节点比较 |
| 538. 把二叉搜索树转换为累加树 | 中等 | 反向中序遍历 |

---

## 总结

1. **核心技巧**：BST 中序遍历有序，相同元素连续出现
2. **状态维护**：只需追踪 prev、currentCount、maxCount
3. **多众数处理**：频率相等时追加，更大时重置
4. **空间优化**：Morris 遍历可实现真正 O(1) 空间

---

## 复杂度

- 时间：O(n)
- 空间：O(1)（不算输出数组和递归栈），Morris 遍历可真正 O(1)
