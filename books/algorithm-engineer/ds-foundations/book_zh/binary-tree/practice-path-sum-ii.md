# 实战：路径总和 II

找出所有从根到叶子且路径和等于目标值的路径。

---

## 问题描述

**LeetCode 113. Path Sum II**

给你二叉树的根节点 root 和一个整数目标和 targetSum，找出所有从根节点到叶子节点路径总和等于给定目标和的路径。

**示例 1**：
```
      5
     / \
    4   8
   /   / \
  11  13  4
 /  \    / \
7    2  5   1

targetSum = 22
输出：[[5,4,11,2], [5,8,4,5]]
```

**示例 2**：
```
    1
   / \
  2   3

targetSum = 5
输出：[]（没有满足条件的路径）
```

---

## 问题分析

与 Path Sum I 的区别：

| 问题 | 目标 | 返回值 |
|------|------|--------|
| Path Sum I | 判断是否存在满足条件的路径 | boolean |
| Path Sum II | 收集所有满足条件的路径 | 二维数组 |

收集路径需要**回溯**：在递归过程中维护当前路径，找到后记录，然后撤销选择继续探索。

---

## 解法：回溯

```javascript
function pathSum(root, targetSum) {
  const result = [];
  const path = [];
  
  function backtrack(node, remaining) {
    if (!node) return;
    
    // 1. 做选择：将当前节点加入路径
    path.push(node.val);
    
    // 2. 判断目标：叶子节点且和满足条件
    if (!node.left && !node.right && node.val === remaining) {
      result.push([...path]);  // 复制路径
    }
    
    // 3. 递归子问题
    backtrack(node.left, remaining - node.val);
    backtrack(node.right, remaining - node.val);
    
    // 4. 撤销选择（回溯）
    path.pop();
  }
  
  backtrack(root, targetSum);
  return result;
}
```

---

## 执行过程可视化

```
目标和：22

        5          path=[5], remaining=17
       / \
      4   8        
     /   / \
    11  13  4      
   /  \    / \
  7    2  5   1

路径探索（DFS + 回溯）：

[5]                    remaining=17
├─ [5,4]               remaining=13
│  └─ [5,4,11]         remaining=2
│     ├─ [5,4,11,7]    remaining=-5  ❌ 叶子，但不等于0
│     │  ← pop: [5,4,11]
│     └─ [5,4,11,2]    remaining=0   ✅ 叶子且等于0，记录！
│        ← pop: [5,4,11]
│     ← pop: [5,4]
│  ← pop: [5]
└─ [5,8]               remaining=9
   ├─ [5,8,13]         remaining=-4  ❌ 叶子，但不等于0
   │  ← pop: [5,8]
   └─ [5,8,4]          remaining=5
      ├─ [5,8,4,5]     remaining=0   ✅ 叶子且等于0，记录！
      │  ← pop: [5,8,4]
      └─ [5,8,4,1]     remaining=4   ❌ 叶子，但不等于0
         ← pop: [5,8,4]
      ← pop: [5,8]
   ← pop: [5]

结果：[[5,4,11,2], [5,8,4,5]]
```

---

## 为什么需要复制路径？

```javascript
// ❌ 错误：直接保存引用
result.push(path);

// 问题演示
const result = [];
const path = [1, 2, 3];
result.push(path);      // result = [[1,2,3]]
path.pop();             // path = [1,2]
console.log(result);    // [[1,2]]  结果被意外修改！

// ✅ 正确：创建副本
result.push([...path]);       // 扩展运算符
result.push(path.slice());    // slice 方法
result.push(Array.from(path)); // Array.from
```

**本质原因**：数组是引用类型，`result.push(path)` 保存的是引用而非值。后续的 `path.pop()` 会影响已保存的结果。

---

## 回溯模板

```javascript
function backtrack(node, state, path) {
  if (!node) return;
  
  // 1. 做选择
  path.push(node.val);
  
  // 2. 判断是否达到目标
  if (isTarget(node, state)) {
    result.push([...path]);
  }
  
  // 3. 递归子问题
  backtrack(node.left, newState, path);
  backtrack(node.right, newState, path);
  
  // 4. 撤销选择
  path.pop();
}
```

---

## 边界情况

```javascript
// 测试用例
pathSum(null, 0);               // 空树 → []
pathSum(node(5), 5);            // 单节点匹配 → [[5]]
pathSum(node(5), 1);            // 单节点不匹配 → []

// 负数处理
pathSum(buildTree([-2, null, -3]), -5);  // [[-2, -3]]

// 多条路径
// 树中多个叶子节点满足条件时，全部收集
```

---

## 常见错误

### 1. 忘记复制路径

```javascript
// ❌ 错误
result.push(path);

// ✅ 正确
result.push([...path]);
```

### 2. 忘记回溯

```javascript
// ❌ 错误：没有 path.pop()
function backtrack(node, remaining) {
  if (!node) return;
  path.push(node.val);
  // ... 处理逻辑
  // 缺少 path.pop()
}

// ✅ 正确
function backtrack(node, remaining) {
  if (!node) return;
  path.push(node.val);
  // ... 处理逻辑
  path.pop();  // 回溯
}
```

### 3. 非叶子节点时记录路径

```javascript
// ❌ 错误：没有检查叶子节点
if (remaining === node.val) {
  result.push([...path]);
}

// ✅ 正确：必须是叶子节点
if (!node.left && !node.right && remaining === node.val) {
  result.push([...path]);
}
```

---

## 迭代解法

```javascript
function pathSum(root, targetSum) {
  if (!root) return [];
  
  const result = [];
  // 栈存储：[节点, 剩余和, 当前路径]
  const stack = [[root, targetSum, []]];
  
  while (stack.length) {
    const [node, remain, path] = stack.pop();
    const newPath = [...path, node.val];
    
    // 叶子节点且满足条件
    if (!node.left && !node.right && remain === node.val) {
      result.push(newPath);
      continue;
    }
    
    if (node.right) {
      stack.push([node.right, remain - node.val, newPath]);
    }
    if (node.left) {
      stack.push([node.left, remain - node.val, newPath]);
    }
  }
  
  return result;
}
```

**注意**：迭代版本每次都要复制路径，空间效率不如递归版本（共享同一个 path 数组）。

---

## 复杂度分析

- **时间复杂度**：O(n²)
  - 遍历所有节点：O(n)
  - 复制路径：最坏 O(n)（完全不平衡树每条路径长度为 n）
  - 总计：O(n²)

- **空间复杂度**：O(n)
  - 递归栈深度：O(n)
  - path 数组：O(n)
  - 结果数组：取决于满足条件的路径数量

---

## 相关题目系列

| 题目 | 难度 | 说明 |
|------|------|------|
| [112. 路径总和](https://leetcode.cn/problems/path-sum/) | 简单 | 判断是否存在 |
| [113. 路径总和 II](https://leetcode.cn/problems/path-sum-ii/) | 中等 | 收集所有路径（本题） |
| [437. 路径总和 III](https://leetcode.cn/problems/path-sum-iii/) | 中等 | 任意起点终点 |
| [124. 二叉树中的最大路径和](https://leetcode.cn/problems/binary-tree-maximum-path-sum/) | 困难 | 最大路径和 |
| [129. 求根节点到叶节点数字之和](https://leetcode.cn/problems/sum-root-to-leaf-numbers/) | 中等 | 路径组成数字 |

---

## 小结

本题是经典的**回溯**模板应用：

| 步骤 | 操作 | 代码 |
|------|------|------|
| 做选择 | 将节点加入路径 | `path.push(node.val)` |
| 判断目标 | 叶子节点 + 和满足条件 | `if (!left && !right && val === remain)` |
| 递归 | 探索左右子树 | `backtrack(left/right, ...)` |
| 撤销选择 | 回溯 | `path.pop()` |

**关键要点**：
- 记录路径时必须**复制**（`[...path]`），否则回溯会修改已保存的结果
- 只在**叶子节点**检查条件
- 回溯模板可复用于所有"收集路径"类问题
