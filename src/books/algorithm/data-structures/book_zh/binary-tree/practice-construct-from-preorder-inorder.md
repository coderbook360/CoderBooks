# 实战：从前序与中序遍历构造二叉树

根据前序和中序遍历结果，重建原始二叉树。这是理解二叉树遍历本质的重要练习。

---

## 问题描述

**LeetCode 105. Construct Binary Tree from Preorder and Inorder Traversal**

给定两个整数数组 preorder 和 inorder，其中 preorder 是二叉树的**前序遍历**，inorder 是同一棵树的**中序遍历**，请构造二叉树并返回其根节点。

**示例 1**：
```
preorder = [3, 9, 20, 15, 7]
inorder  = [9, 3, 15, 20, 7]

输出：
    3
   / \
  9  20
    /  \
   15   7
```

**示例 2**：
```
preorder = [1, 2]
inorder  = [2, 1]

输出：
  1
 /
2
```

**约束条件**：
- `1 <= preorder.length <= 3000`
- `inorder.length == preorder.length`
- `-3000 <= preorder[i], inorder[i] <= 3000`
- preorder 和 inorder 均**无重复**元素
- inorder 均出现在 preorder
- preorder 保证为前序遍历序列
- inorder 保证为中序遍历序列

---

## 问题分析

**回顾遍历顺序**：
- 前序遍历：根 → 左 → 右
- 中序遍历：左 → 根 → 右

**关键发现**：
1. 前序遍历的**第一个元素**一定是**根节点**
2. 在中序遍历中找到根，**根左边是左子树**，**根右边是右子树**

```
preorder: [3,  9,  20, 15, 7]
           ↑   ├─┘  ├────┘
          根   左子树  右子树

inorder:  [9,  3,  15, 20, 7]
          ├┘  ↑   ├────────┘
         左子树 根    右子树
```

利用这个规律，可以递归地构建整棵树。

---

## 解法一：递归（基础版）

```javascript
function buildTree(preorder, inorder) {
  if (preorder.length === 0) return null;
  
  // 前序第一个是根
  const rootVal = preorder[0];
  const root = new TreeNode(rootVal);
  
  // 在中序中找到根的位置
  const rootIndex = inorder.indexOf(rootVal);
  
  // 切分左右子树
  const leftInorder = inorder.slice(0, rootIndex);
  const rightInorder = inorder.slice(rootIndex + 1);
  
  const leftPreorder = preorder.slice(1, 1 + leftInorder.length);
  const rightPreorder = preorder.slice(1 + leftInorder.length);
  
  // 递归构建
  root.left = buildTree(leftPreorder, leftInorder);
  root.right = buildTree(rightPreorder, rightInorder);
  
  return root;
}
```

**问题**：每次调用 `indexOf` 是 O(n)，总时间 O(n²)。

---

## 解法二：递归（优化版）

用 Map 预存中序索引，用指针代替数组切片：

```javascript
function buildTree(preorder, inorder) {
  // 预处理：值 → 中序索引
  const inorderMap = new Map();
  inorder.forEach((val, i) => inorderMap.set(val, i));
  
  let preIndex = 0;  // 前序遍历的指针
  
  function build(inLeft, inRight) {
    // 没有元素了
    if (inLeft > inRight) return null;
    
    // 前序第一个是根
    const rootVal = preorder[preIndex++];
    const root = new TreeNode(rootVal);
    
    // 在中序中找到根的位置（O(1)）
    const inRoot = inorderMap.get(rootVal);
    
    // 递归构建左右子树
    // 注意：必须先构建左子树，因为 preIndex 是递增的
    root.left = build(inLeft, inRoot - 1);
    root.right = build(inRoot + 1, inRight);
    
    return root;
  }
  
  return build(0, inorder.length - 1);
}
```

---

## 执行过程详解

```
preorder = [3, 9, 20, 15, 7]
inorder  = [9, 3, 15, 20, 7]
inorderMap = {9:0, 3:1, 15:2, 20:3, 7:4}

build(0, 4):  // 整个范围
  preIndex = 0 → rootVal = 3
  inRoot = 1 (在中序中的位置)
  
  build(0, 0):  // 左子树 [9]
    preIndex = 1 → rootVal = 9
    inRoot = 0
    build(0, -1) = null  // 无左子树
    build(1, 0) = null   // 无右子树
    return node(9)
  
  build(2, 4):  // 右子树 [15, 20, 7]
    preIndex = 2 → rootVal = 20
    inRoot = 3
    
    build(2, 2):  // [15]
      preIndex = 3 → rootVal = 15
      return node(15)
    
    build(4, 4):  // [7]
      preIndex = 4 → rootVal = 7
      return node(7)
    
    return node(20, left=15, right=7)
  
  return node(3, left=9, right=20)
```

---

## 为什么必须先构建左子树？

前序遍历的顺序是 `根 → 左 → 右`。

```
preorder = [3, 9, 20, 15, 7]
            ↑  ↑  ↑   ↑   ↑
            根 左 右根 右左 右右
```

`preIndex` 按照前序顺序递增。如果先构建右子树，会错误地把左子树的值用于右子树。

```javascript
// ❌ 错误顺序
root.right = build(inRoot + 1, inRight);  // 先构建右子树
root.left = build(inLeft, inRoot - 1);    // preIndex 已经移动了

// ✅ 正确顺序
root.left = build(inLeft, inRoot - 1);    // 先左
root.right = build(inRoot + 1, inRight);  // 后右
```

---

## 复杂度分析

| 版本 | 时间 | 空间 | 说明 |
|------|------|------|------|
| 基础版 | O(n²) | O(n²) | indexOf O(n)，数组切片 O(n) |
| 优化版 | O(n) | O(n) | Map 查找 O(1)，指针代替切片 |

---

## 边界情况

```javascript
// 测试用例
buildTree([], []);                    // 空树 → null
buildTree([1], [1]);                  // 单节点
buildTree([1, 2], [2, 1]);           // 只有左子树
buildTree([1, 2], [1, 2]);           // 只有右子树

// 完全二叉树
buildTree([1,2,3,4,5,6,7], [4,2,5,1,6,3,7]);
```

---

## 常见错误

### 1. Map 查找写成 indexOf

```javascript
// ❌ 错误：仍然是 O(n) 查找
const inRoot = inorder.indexOf(rootVal);

// ✅ 正确：O(1) 查找
const inRoot = inorderMap.get(rootVal);
```

### 2. 递归顺序错误

```javascript
// ❌ 错误：先构建右子树
root.right = build(inRoot + 1, inRight);
root.left = build(inLeft, inRoot - 1);

// ✅ 正确：先构建左子树
root.left = build(inLeft, inRoot - 1);
root.right = build(inRoot + 1, inRight);
```

### 3. 边界计算错误

```javascript
// ❌ 错误：包含了根节点
root.left = build(inLeft, inRoot);      // 应该是 inRoot - 1
root.right = build(inRoot, inRight);    // 应该是 inRoot + 1

// ✅ 正确：排除根节点
root.left = build(inLeft, inRoot - 1);
root.right = build(inRoot + 1, inRight);
```

---

## 变体问题

### 中序 + 后序 → 构造二叉树

后序遍历：左 → 右 → 根（最后一个是根）

```javascript
function buildTree(inorder, postorder) {
  const inorderMap = new Map();
  inorder.forEach((val, i) => inorderMap.set(val, i));
  
  let postIndex = postorder.length - 1;  // 从后往前
  
  function build(inLeft, inRight) {
    if (inLeft > inRight) return null;
    
    const rootVal = postorder[postIndex--];
    const root = new TreeNode(rootVal);
    const inRoot = inorderMap.get(rootVal);
    
    // 注意：必须先构建右子树（后序是 左右根，从后往前是 根右左）
    root.right = build(inRoot + 1, inRight);
    root.left = build(inLeft, inRoot - 1);
    
    return root;
  }
  
  return build(0, inorder.length - 1);
}
```

### 前序 + 后序 → 构造二叉树

需要额外条件：当某个节点只有一个子节点时，无法确定是左还是右。

---

## 相关题目

| 题目 | 难度 | 关联点 |
|------|------|--------|
| [106. 从中序与后序遍历序列构造二叉树](https://leetcode.cn/problems/construct-binary-tree-from-inorder-and-postorder-traversal/) | 中等 | 后序变体 |
| [889. 根据前序和后序遍历构造二叉树](https://leetcode.cn/problems/construct-binary-tree-from-preorder-and-postorder-traversal/) | 中等 | 不唯一 |
| [297. 二叉树的序列化与反序列化](https://leetcode.cn/problems/serialize-and-deserialize-binary-tree/) | 困难 | 完整编码 |

---

## 小结

本题的关键洞察：

1. **前序的第一个元素是根**
2. **中序中根的位置划分左右子树**
3. **递归构建时必须按正确顺序**（前序 → 先左后右；后序 → 先右后左）

**优化技巧**：
- 用 Map 预存索引，将查找从 O(n) 降到 O(1)
- 用指针代替数组切片，避免额外空间分配

这道题深刻体现了前序、中序、后序遍历的本质区别，是理解二叉树遍历的必做题。
