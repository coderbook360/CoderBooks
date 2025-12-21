# 实战:二叉树最大深度

二叉树最大深度是递归的完美应用场景。这道题简洁到只需要三行代码,却完美展示了递归思维:把复杂问题分解成子问题,然后合并子问题的结果。

📎 [LeetCode 104. 二叉树的最大深度](https://leetcode.cn/problems/maximum-depth-of-binary-tree/)

---

## 题目描述

给定二叉树的根节点 `root`,返回其最大深度。

**最大深度定义**:从根节点到最远叶子节点的最长路径上的节点数。

**示例**:

```
输入: root = [3,9,20,null,null,15,7]
       3
      / \
     9  20
       /  \
      15   7
输出: 3
解释:最长路径是 3 → 20 → 15 或 3 → 20 → 7
```

```
输入: root = [1,null,2]
     1
      \
       2
输出: 2
```

**约束**:
- 树中节点数范围 [0, 10^4]
- -100 <= Node.val <= 100

---

## 思路分析

### 这道题在考什么?

1. 对递归定义的理解
2. "分解问题"的递归思维
3. 子问题结果的合并

### 递归思路

**核心洞察**:树的最大深度 = 左右子树最大深度的较大值 + 1

```
       3           深度 = max(左子树深度, 右子树深度) + 1
      / \
     9  20         左子树深度 = 1
       /  \        右子树深度 = 2
      15   7       
                   最大深度 = max(1, 2) + 1 = 3
```

**递归三要素**:

#### 1. 函数定义

```typescript
/**
 * 计算二叉树的最大深度
 * @param root - 树的根节点
 * @returns 树的最大深度
 */
function maxDepth(root: TreeNode | null): number
```

#### 2. 终止条件

最简单的情况:空树的深度是 0

```typescript
if (root === null) {
  return 0;
}
```

#### 3. 递归关系

```typescript
const leftDepth = maxDepth(root.left);   // 左子树深度
const rightDepth = maxDepth(root.right); // 右子树深度
return Math.max(leftDepth, rightDepth) + 1;
```

---

## 解法一:递归(DFS)

### 代码实现

```typescript
/**
 * Definition for a binary tree node.
 */
class TreeNode {
  val: number;
  left: TreeNode | null;
  right: TreeNode | null;
  constructor(val?: number, left?: TreeNode | null, right?: TreeNode | null) {
    this.val = val === undefined ? 0 : val;
    this.left = left === undefined ? null : left;
    this.right = right === undefined ? null : right;
  }
}

/**
 * 递归求二叉树最大深度
 * 时间复杂度:O(n) - 每个节点访问一次
 * 空间复杂度:O(h) - h 是树的高度,递归栈空间
 */
function maxDepth(root: TreeNode | null): number {
  // 1. 终止条件:空树深度为 0
  if (root === null) {
    return 0;
  }
  
  // 2. 递归求左右子树深度
  const leftDepth = maxDepth(root.left);
  const rightDepth = maxDepth(root.right);
  
  // 3. 合并结果:取较大值 + 1
  return Math.max(leftDepth, rightDepth) + 1;
}

// 简化版(一行)
function maxDepthOneLine(root: TreeNode | null): number {
  return root === null 
    ? 0 
    : Math.max(maxDepth(root.left), maxDepth(root.right)) + 1;
}
```

### 递归过程详解

以示例树为例:

```
       3
      / \
     9  20
       /  \
      15   7

递归调用树:
maxDepth(3)
├─ maxDepth(9)
│  ├─ maxDepth(null) → 0
│  └─ maxDepth(null) → 0
│  → max(0, 0) + 1 = 1
└─ maxDepth(20)
   ├─ maxDepth(15)
   │  ├─ maxDepth(null) → 0
   │  └─ maxDepth(null) → 0
   │  → max(0, 0) + 1 = 1
   └─ maxDepth(7)
      ├─ maxDepth(null) → 0
      └─ maxDepth(null) → 0
      → max(0, 0) + 1 = 1
   → max(1, 1) + 1 = 2
→ max(1, 2) + 1 = 3
```

**关键理解**:
- 每个节点只关心左右子树的深度
- 不需要知道子树的具体结构
- 通过 `Math.max` 合并子问题结果

---

## 解法二:迭代(BFS 层序遍历)

### 代码实现

```typescript
/**
 * 层序遍历求最大深度
 * 时间复杂度:O(n)
 * 空间复杂度:O(w) - w 是树的最大宽度
 */
function maxDepthBFS(root: TreeNode | null): number {
  if (root === null) return 0;
  
  const queue: TreeNode[] = [root];
  let depth = 0;
  
  while (queue.length > 0) {
    const levelSize = queue.length;  // 当前层节点数
    
    // 处理当前层的所有节点
    for (let i = 0; i < levelSize; i++) {
      const node = queue.shift()!;
      if (node.left) queue.push(node.left);
      if (node.right) queue.push(node.right);
    }
    
    depth++;  // 处理完一层,深度 +1
  }
  
  return depth;
}
```

### BFS 过程

```
       3
      / \
     9  20
       /  \
      15   7

初始:queue = [3], depth = 0

第 1 轮:
levelSize = 1
处理节点 3,加入 9, 20
queue = [9, 20]
depth = 1

第 2 轮:
levelSize = 2
处理节点 9(无子节点)
处理节点 20,加入 15, 7
queue = [15, 7]
depth = 2

第 3 轮:
levelSize = 2
处理节点 15(无子节点)
处理节点 7(无子节点)
queue = []
depth = 3

返回 depth = 3
```

---

## 解法三:迭代(DFS 栈模拟)

### 代码实现

```typescript
/**
 * 用栈模拟递归 DFS
 * 时间复杂度:O(n)
 * 空间复杂度:O(h)
 */
function maxDepthDFSStack(root: TreeNode | null): number {
  if (root === null) return 0;
  
  const stack: [TreeNode, number][] = [[root, 1]];  // [节点, 深度]
  let maxDepth = 0;
  
  while (stack.length > 0) {
    const [node, depth] = stack.pop()!;
    maxDepth = Math.max(maxDepth, depth);
    
    // 右子树先入栈(后处理)
    if (node.right) stack.push([node.right, depth + 1]);
    // 左子树后入栈(先处理)
    if (node.left) stack.push([node.left, depth + 1]);
  }
  
  return maxDepth;
}
```

---

## 复杂度对比

| 解法 | 时间复杂度 | 空间复杂度 | 特点 |
|-----|-----------|-----------|------|
| 递归 DFS | O(n) | O(h) | 最简洁,符合直觉 |
| 迭代 BFS | O(n) | O(w) | 层序遍历,适合求层数 |
| 迭代 DFS | O(n) | O(h) | 显式栈,模拟递归 |

**说明**:
- n:节点总数
- h:树的高度(平衡树 O(log n),链式树 O(n))
- w:树的最大宽度(完全二叉树最底层约 n/2)

**如何选择**:
- **递归 DFS**:首选,代码最简洁
- **BFS**:需要层序信息时使用
- **迭代 DFS**:递归深度受限时的替代方案

---

## 扩展:最小深度

### 问题

求二叉树的最小深度(根节点到最近叶子节点的最短路径)。

📎 [LeetCode 111. 二叉树的最小深度](https://leetcode.cn/problems/minimum-depth-of-binary-tree/)

### 思路差异

**关键区别**:最小深度必须到达**叶子节点**(左右子树都为空)。

```
       1
      /
     2
最大深度 = 2
最小深度 = 2(不是 1,因为 1 不是叶子节点)
```

### 代码实现

```typescript
/**
 * 递归求最小深度
 */
function minDepth(root: TreeNode | null): number {
  if (root === null) return 0;
  
  // 左右子树都为空:叶子节点,深度为 1
  if (root.left === null && root.right === null) {
    return 1;
  }
  
  // 只有右子树:不能取 min(0, rightDepth)
  if (root.left === null) {
    return minDepth(root.right) + 1;
  }
  
  // 只有左子树
  if (root.right === null) {
    return minDepth(root.left) + 1;
  }
  
  // 左右子树都有:取较小值
  return Math.min(minDepth(root.left), minDepth(root.right)) + 1;
}
```

**易错点**:

```typescript
// ❌ 错误:没有处理单子树情况
function minDepthWrong(root: TreeNode | null): number {
  if (root === null) return 0;
  return Math.min(minDepth(root.left), minDepth(root.right)) + 1;
  // 如果只有右子树,左子树返回 0,min 会错误地返回 1
}
```

---

## 扩展:N 叉树的最大深度

### 问题

求 N 叉树的最大深度。

📎 [LeetCode 559. N 叉树的最大深度](https://leetcode.cn/problems/maximum-depth-of-n-ary-tree/)

### 代码实现

```typescript
class Node {
  val: number;
  children: Node[];
  constructor(val?: number, children?: Node[]) {
    this.val = val === undefined ? 0 : val;
    this.children = children === undefined ? [] : children;
  }
}

function maxDepthNary(root: Node | null): number {
  if (root === null) return 0;
  
  // 求所有子树深度的最大值
  let maxChildDepth = 0;
  for (const child of root.children) {
    maxChildDepth = Math.max(maxChildDepth, maxDepthNary(child));
  }
  
  return maxChildDepth + 1;
}

// 简化版
function maxDepthNaryOneLine(root: Node | null): number {
  return root === null 
    ? 0 
    : Math.max(0, ...root.children.map(maxDepthNary)) + 1;
}
```

---

## 易错点

### 1. 混淆"深度"和"高度"

```
       3        深度从上往下计数
      / \       3 的深度 = 1
     9  20      9 的深度 = 2
       /  \     
      15   7    高度从下往上计数
                7 的高度 = 1
                20 的高度 = 2
                3 的高度 = 3

本题求的是"最大深度" = 树的高度
```

### 2. 最小深度时忘记检查叶子节点

```typescript
// ❌ 错误:没有检查是否是叶子节点
function minDepthWrong(root: TreeNode | null): number {
  if (root === null) return 0;
  return Math.min(minDepth(root.left), minDepth(root.right)) + 1;
}

// 对于树:
//     1
//    /
//   2
// 会错误地返回 1(实际应该是 2)
```

### 3. 递归时修改了全局变量

```typescript
// ❌ 错误:使用全局变量容易出错
let maxDepthGlobal = 0;

function maxDepthWrong(root: TreeNode | null): number {
  if (root === null) return 0;
  maxDepthGlobal++;  // 错误:多次调用会累加
  maxDepth(root.left);
  maxDepth(root.right);
  return maxDepthGlobal;
}
```

---

## 相关题目

| 题目 | 难度 | 说明 |
|-----|------|------|
| [104. 二叉树的最大深度](https://leetcode.cn/problems/maximum-depth-of-binary-tree/) | 简单 | 本题 |
| [111. 二叉树的最小深度](https://leetcode.cn/problems/minimum-depth-of-binary-tree/) | 简单 | 注意叶子节点条件 |
| [559. N 叉树的最大深度](https://leetcode.cn/problems/maximum-depth-of-n-ary-tree/) | 简单 | N 叉树版本 |
| [110. 平衡二叉树](https://leetcode.cn/problems/balanced-binary-tree/) | 简单 | 需要同时求左右深度 |
| [543. 二叉树的直径](https://leetcode.cn/problems/diameter-of-binary-tree/) | 简单 | 最大深度的变体 |

---

## 举一反三

二叉树最大深度教会我们:

1. **递归的自然表达**:
   - 树的问题天然适合递归
   - 递归定义:f(树) = f(左子树) ⊕ f(右子树)
   - 合并操作:max、min、+、*等

2. **递归三要素的应用**:
   - 明确函数定义
   - 找到终止条件
   - 建立递归关系

3. **DFS vs BFS**:
   - DFS(递归/栈):适合求深度、路径
   - BFS(队列):适合求层数、最短路径

4. **问题变体**:
   - 最大深度 → 最小深度(注意叶子节点)
   - 二叉树 → N 叉树(遍历所有子树)
   - 深度 → 直径(左深度 + 右深度)

---

## 本章小结

二叉树最大深度是递归的经典应用:
- **核心思想**:树的深度 = max(左深度, 右深度) + 1
- **递归解法**:简洁优雅,三行代码
- **迭代解法**:BFS 层序遍历或 DFS 栈模拟
- **常见变体**:最小深度、N 叉树、平衡树判断

掌握这道题,你就理解了递归在树问题上的基本模式。

---

## 练习

1. 用递归求二叉树的最小深度,注意叶子节点的判断
2. 实现 N 叉树的最大深度(LeetCode 559)
3. 判断二叉树是否平衡(LeetCode 110,需要同时求左右深度)
4. 求二叉树的直径(LeetCode 543,最大深度的变体)
