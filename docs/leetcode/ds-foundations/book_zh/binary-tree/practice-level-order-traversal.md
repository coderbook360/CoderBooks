# 实战：层序遍历

按层输出二叉树节点，掌握 BFS 在树结构上的应用。

---

## 问题描述

**LeetCode 102. Binary Tree Level Order Traversal**

给你二叉树的根节点 root，返回其节点值的**层序遍历**（即逐层地，从左到右访问所有节点）。

**示例 1**：
```
      3
     / \
    9  20
      /  \
     15   7

输入：root = [3,9,20,null,null,15,7]
输出：[[3], [9,20], [15,7]]
```

**示例 2**：
```
输入：root = [1]
输出：[[1]]
```

---

## 解法：BFS（广度优先搜索）

层序遍历是 BFS 在树结构上的典型应用：

```javascript
function levelOrder(root) {
  if (!root) return [];
  
  const result = [];
  const queue = [root];
  
  while (queue.length > 0) {
    const levelSize = queue.length;  // 关键：记录当前层的节点数
    const level = [];
    
    for (let i = 0; i < levelSize; i++) {
      const node = queue.shift();
      level.push(node.val);
      
      // 将下一层节点加入队列
      if (node.left) queue.push(node.left);
      if (node.right) queue.push(node.right);
    }
    
    result.push(level);
  }
  
  return result;
}
```

---

## 执行过程可视化

```
      3
     / \
    9  20
      /  \
     15   7

初始：queue = [3]

═══════════════════════════════════════════════
第 1 层：levelSize = 1
═══════════════════════════════════════════════
  出队: 3
  level = [3]
  入队: 9, 20
  queue = [9, 20]
  
  result = [[3]]

═══════════════════════════════════════════════
第 2 层：levelSize = 2
═══════════════════════════════════════════════
  出队: 9
  level = [9]
  入队: 无（9 没有子节点）
  
  出队: 20
  level = [9, 20]
  入队: 15, 7
  queue = [15, 7]
  
  result = [[3], [9, 20]]

═══════════════════════════════════════════════
第 3 层：levelSize = 2
═══════════════════════════════════════════════
  出队: 15
  level = [15]
  
  出队: 7
  level = [15, 7]
  queue = []
  
  result = [[3], [9, 20], [15, 7]]
```

---

## 关键技巧：记录层大小

```javascript
const levelSize = queue.length;  // 在处理前记录

for (let i = 0; i < levelSize; i++) {
  // 这里会往 queue 里添加新节点
  // 但 levelSize 已经固定，不会影响循环次数
}
```

**为什么要这样做？**

```javascript
// ❌ 错误：queue.length 会变化
for (let i = 0; i < queue.length; i++) {
  const node = queue.shift();  // 出队
  queue.push(node.left);       // 入队，length 增加
  queue.push(node.right);      // 再入队，length 再增加
  // 无限循环或逻辑错误
}

// ✅ 正确：levelSize 固定不变
const levelSize = queue.length;
for (let i = 0; i < levelSize; i++) {
  // 只处理当前层的节点
}
```

---

## DFS 也能实现层序遍历

虽然不如 BFS 直观，但 DFS 也可以实现：

```javascript
function levelOrder(root) {
  const result = [];
  
  function dfs(node, depth) {
    if (!node) return;
    
    // 如果这一层还没有数组，创建一个
    if (depth >= result.length) {
      result.push([]);
    }
    
    // 将节点添加到对应层
    result[depth].push(node.val);
    
    // 递归处理左右子树
    dfs(node.left, depth + 1);
    dfs(node.right, depth + 1);
  }
  
  dfs(root, 0);
  return result;
}
```

**BFS vs DFS 层序遍历**：

| 对比 | BFS | DFS |
|------|-----|-----|
| 思路 | 按层处理 | 按深度递归 |
| 空间 | 队列存一层节点 | 递归栈 + 结果数组 |
| 应用 | 层序遍历的标准方法 | 需要同时获得深度信息时 |

---

## 边界情况

```javascript
// 测试用例
levelOrder(null);              // 空树 → []
levelOrder(node(1));           // 单节点 → [[1]]

// 不平衡树
levelOrder(buildTree([1, 2, null, 3]));  // [[1], [2], [3]]

// 完全二叉树
levelOrder(buildTree([1, 2, 3, 4, 5, 6, 7]));  
// [[1], [2, 3], [4, 5, 6, 7]]
```

---

## 常见错误

### 1. 没有记录 levelSize

```javascript
// ❌ 错误
while (queue.length > 0) {
  const level = [];
  while (queue.length > 0) {  // 会把所有节点都处理完
    // ...
  }
}

// ✅ 正确
while (queue.length > 0) {
  const levelSize = queue.length;
  const level = [];
  for (let i = 0; i < levelSize; i++) {
    // ...
  }
}
```

### 2. 使用 pop 而非 shift

```javascript
// ❌ 错误：pop 是从末尾取（栈行为）
const node = queue.pop();

// ✅ 正确：shift 是从头部取（队列行为）
const node = queue.shift();
```

---

## 层序遍历的变体

层序遍历是一类问题的基础：

| 变体 | 修改点 |
|------|--------|
| 自底向上层序 | 结果数组 reverse 或 unshift |
| 锯齿形层序 | 奇数层 reverse |
| 每层最大值 | 每层取 max |
| 右视图 | 每层取最后一个 |
| 左视图 | 每层取第一个 |
| 每层平均值 | 每层求和再除以 levelSize |

---

## 相关题目

| 题目 | 难度 | 变体说明 |
|------|------|----------|
| [102. 层序遍历](https://leetcode.cn/problems/binary-tree-level-order-traversal/) | 中等 | 本题 |
| [107. 层序遍历 II](https://leetcode.cn/problems/binary-tree-level-order-traversal-ii/) | 中等 | 自底向上 |
| [103. 锯齿形层序遍历](https://leetcode.cn/problems/binary-tree-zigzag-level-order-traversal/) | 中等 | 奇偶层方向不同 |
| [199. 二叉树的右视图](https://leetcode.cn/problems/binary-tree-right-side-view/) | 中等 | 每层最后一个 |
| [515. 每个树行中的最大值](https://leetcode.cn/problems/find-largest-value-in-each-tree-row/) | 中等 | 每层最大值 |
| [637. 二叉树的层平均值](https://leetcode.cn/problems/average-of-levels-in-binary-tree/) | 简单 | 每层平均值 |

---

## 小结

层序遍历的核心模板：

```javascript
function levelOrder(root) {
  if (!root) return [];
  
  const result = [];
  const queue = [root];
  
  while (queue.length > 0) {
    const levelSize = queue.length;  // ① 记录层大小
    const level = [];
    
    for (let i = 0; i < levelSize; i++) {  // ② 只处理当前层
      const node = queue.shift();
      level.push(node.val);  // ③ 处理节点（可替换为其他逻辑）
      
      if (node.left) queue.push(node.left);   // ④ 加入下一层
      if (node.right) queue.push(node.right);
    }
    
    result.push(level);  // ⑤ 收集结果（可替换为其他逻辑）
  }
  
  return result;
}
```

**三个关键点**：
1. **记录 levelSize**：区分当前层和下一层
2. **for 循环**：确保只处理当前层
3. **shift/push**：保持队列的 FIFO 特性

掌握这个模板，所有层序遍历的变体都能轻松应对。
