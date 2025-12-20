# 实战：二叉树的右视图

从右边看一棵二叉树，输出能看到的节点。

---

## 问题描述

**LeetCode 199. Binary Tree Right Side View**

给定一个二叉树的根节点 root，想象自己站在它的右侧，按照从顶部到底部的顺序，返回从右侧所能看到的节点值。

**示例 1**：
```
      1            ← 看到 1
     / \
    2   3          ← 看到 3
     \   \
      5   4        ← 看到 4

输出：[1, 3, 4]
```

**示例 2**：
```
      1            ← 看到 1
     /
    2              ← 看到 2
   /
  3                ← 看到 3

输出：[1, 2, 3]
```

**关键理解**：右视图看到的是**每一层最右边的节点**，不一定都是右子节点。

---

## 解法一：BFS（层序遍历）

每层的最后一个节点就是右视图看到的：

```javascript
function rightSideView(root) {
  if (!root) return [];
  
  const result = [];
  const queue = [root];
  
  while (queue.length > 0) {
    const levelSize = queue.length;
    
    for (let i = 0; i < levelSize; i++) {
      const node = queue.shift();
      
      // 每层最后一个节点
      if (i === levelSize - 1) {
        result.push(node.val);
      }
      
      if (node.left) queue.push(node.left);
      if (node.right) queue.push(node.right);
    }
  }
  
  return result;
}
```

---

## 解法二：DFS（先右后左）

**核心思想**：优先访问右子树，每层第一个访问到的就是右视图看到的。

```javascript
function rightSideView(root) {
  const result = [];
  
  function dfs(node, depth) {
    if (!node) return;
    
    // 这一层第一次到达，就是右视图看到的
    if (depth === result.length) {
      result.push(node.val);
    }
    
    dfs(node.right, depth + 1);  // 先右
    dfs(node.left, depth + 1);   // 后左
  }
  
  dfs(root, 0);
  return result;
}
```

**关键技巧**：`depth === result.length` 判断是否是该层第一次访问。

- depth = 0, result.length = 0 → 第 0 层第一次
- depth = 1, result.length = 1 → 第 1 层第一次
- depth = 2, result.length = 2 → 第 2 层第一次

---

## 执行过程可视化

```
      1
     / \
    2   3
     \   \
      5   4

DFS（先右后左）顺序：1 → 3 → 4 → 2 → 5

节点 1：depth=0, result.length=0, 匹配！result=[1]
节点 3：depth=1, result.length=1, 匹配！result=[1,3]
节点 4：depth=2, result.length=2, 匹配！result=[1,3,4]
节点 2：depth=1, result.length=3, 不匹配（已有第1层）
节点 5：depth=2, result.length=3, 不匹配（已有第2层）

最终：[1, 3, 4]
```

---

## 左视图怎么做？

只需调整访问顺序：

**BFS**：取每层第一个（`i === 0`）

```javascript
if (i === 0) {
  result.push(node.val);
}
```

**DFS**：先左后右

```javascript
dfs(node.left, depth + 1);   // 先左
dfs(node.right, depth + 1);  // 后右
```

---

## 边界情况

```javascript
// 测试用例
rightSideView(null);           // 空树 → []
rightSideView(node(1));        // 单节点 → [1]

// 只有左子树
rightSideView(buildTree([1, 2, null, 3]));  // [1, 2, 3]

// 只有右子树
rightSideView(buildTree([1, null, 2, null, 3]));  // [1, 2, 3]

// 完全二叉树
rightSideView(buildTree([1, 2, 3, 4, 5, 6, 7]));  // [1, 3, 7]
```

---

## 常见错误

### 1. 认为右视图只有右子节点

```
      1            
     /             右视图应该是 [1, 2, 3]
    2              而不是空（因为没有右子节点）
   /               
  3                

右视图是每层最右边的节点，不是"只有右子节点"
```

### 2. BFS 时 levelSize 计算错误

```javascript
// ❌ 错误：在循环内计算 length
for (let i = 0; i < queue.length; i++) {  // 会变化！
  // ...
}

// ✅ 正确：循环前保存 levelSize
const levelSize = queue.length;
for (let i = 0; i < levelSize; i++) {
  // ...
}
```

### 3. DFS 顺序写反

```javascript
// ❌ 错误：先左后右（这是左视图）
dfs(node.left, depth + 1);
dfs(node.right, depth + 1);

// ✅ 正确：先右后左（右视图）
dfs(node.right, depth + 1);
dfs(node.left, depth + 1);
```

---

## 复杂度分析

| 方法 | 时间 | 空间 |
|------|------|------|
| BFS | O(n) | O(w)，w 为最大宽度 |
| DFS | O(n) | O(h)，h 为树高 |

对于平衡树：
- BFS 空间 O(n/2) ≈ O(n)（最后一层节点最多）
- DFS 空间 O(log n)

对于不平衡树：
- BFS 空间 O(1)～O(n)
- DFS 空间 O(n)

---

## 相关题目

| 题目 | 难度 | 说明 |
|------|------|------|
| [199. 二叉树的右视图](https://leetcode.cn/problems/binary-tree-right-side-view/) | 中等 | 本题 |
| [102. 二叉树的层序遍历](https://leetcode.cn/problems/binary-tree-level-order-traversal/) | 中等 | 基础层序 |
| [513. 找树左下角的值](https://leetcode.cn/problems/find-bottom-left-tree-value/) | 中等 | 最后一层最左 |
| [515. 在每个树行中找最大值](https://leetcode.cn/problems/find-largest-value-in-each-tree-row/) | 中等 | 每层最大值 |

---

## 小结

本题有两种解法，核心思想不同：

| 方法 | 思路 | 关键点 |
|------|------|--------|
| BFS | 层序遍历，取每层最后一个 | `i === levelSize - 1` |
| DFS | 先右后左，每层第一个访问的 | `depth === result.length` |

**延伸思考**：
- 左视图：BFS 取每层第一个 / DFS 先左后右
- 每层最大值：BFS 遍历时记录最大
- 最后一层最左：BFS 记录每层第一个，最后返回

这类"每层某个节点"的问题，BFS 层序遍历是最直观的方法。
