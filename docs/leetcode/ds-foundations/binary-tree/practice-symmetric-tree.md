# 实战：对称二叉树

判断一棵二叉树是否是镜像对称的。这是二叉树结构比较的经典问题。

---

## 问题描述

**LeetCode 101. Symmetric Tree**

给你一个二叉树的根节点 root，检查它是否轴对称。

**示例 1**：
```
    1
   / \
  2   2
 / \ / \
3  4 4  3

输出：true
解释：左右子树互为镜像
```

**示例 2**：
```
    1
   / \
  2   2
   \   \
   3    3

输出：false
解释：右子树的结构不是左子树的镜像
```

**约束条件**：
- 树中节点数目在范围 `[1, 1000]` 内
- `-100 <= Node.val <= 100`

---

## 问题分析

对称（镜像）意味着什么？

```
     1                    比较方式：
    / \
   2   2      左子树的左子 ←→ 右子树的右子
  / \ / \     左子树的右子 ←→ 右子树的左子
 3  4 4  3

比较对：(2,2), (3,3), (4,4)
```

**核心条件**：
1. 两个对应节点的值相等
2. 左节点的左子树 与 右节点的右子树 对称
3. 左节点的右子树 与 右节点的左子树 对称

---

## 解法一：递归

定义辅助函数比较两个子树是否镜像：

```javascript
function isSymmetric(root) {
  if (!root) return true;
  return isMirror(root.left, root.right);
}

function isMirror(left, right) {
  // 都为空，对称
  if (!left && !right) return true;
  
  // 只有一个为空，不对称
  if (!left || !right) return false;
  
  // 值相等，且子树镜像对称
  return left.val === right.val
    && isMirror(left.left, right.right)   // 外侧
    && isMirror(left.right, right.left);  // 内侧
}
```

**递归树展示**：

```
isMirror(2, 2)
├── 2.val == 2.val ✓
├── isMirror(3, 3) → true (外侧)
└── isMirror(4, 4) → true (内侧)
```

---

## 解法二：迭代

用队列成对比较节点：

```javascript
function isSymmetric(root) {
  if (!root) return true;
  
  const queue = [root.left, root.right];
  
  while (queue.length > 0) {
    // 每次取出一对
    const left = queue.shift();
    const right = queue.shift();
    
    // 都为空，继续下一对
    if (!left && !right) continue;
    
    // 只有一个为空，或值不等
    if (!left || !right) return false;
    if (left.val !== right.val) return false;
    
    // 成对入队：外侧一对，内侧一对
    queue.push(left.left, right.right);   // 外侧
    queue.push(left.right, right.left);   // 内侧
  }
  
  return true;
}
```

---

## 执行过程详解

```
    1
   / \
  2   2
 / \ / \
3  4 4  3

初始：queue = [2, 2]

第1轮：取出 (2, 2)
  2 == 2 ✓
  入队外侧：(3, 3)
  入队内侧：(4, 4)
  queue = [3, 3, 4, 4]

第2轮：取出 (3, 3)
  3 == 3 ✓
  入队：(null, null), (null, null)
  queue = [4, 4, null, null, null, null]

第3轮：取出 (4, 4)
  4 == 4 ✓
  queue = [null, null, null, null, ...]

后续取出的都是 (null, null)，继续

结果：true
```

---

## 复杂度分析

**时间复杂度**：O(n)
- 每个节点最多被访问一次

**空间复杂度**：O(n)
- 递归：最坏情况递归深度为 n（链状树）
- 迭代：队列最多存储 n/2 个节点对

---

## 边界情况

```javascript
// 测试用例
isSymmetric(null);                    // 空树 → true
isSymmetric({val: 1});               // 单节点 → true
isSymmetric({val: 1, left: {val: 2}}); // 只有左子树 → false

// 值相同但结构不对称
//     1
//    / \
//   2   2
//  /     /
// 3     3
// → false
```

---

## 常见错误

### 1. 混淆对称和相同

```javascript
// ❌ 错误：比较左左和右右
isMirror(left.left, right.left)

// ✅ 正确：镜像比较
isMirror(left.left, right.right)  // 外侧
isMirror(left.right, right.left)  // 内侧
```

### 2. 忘记处理空节点

```javascript
// ❌ 错误：直接访问 val
if (left.val !== right.val) return false;
// left 或 right 可能为 null

// ✅ 正确：先检查空
if (!left && !right) return true;
if (!left || !right) return false;
```

### 3. 迭代时入队顺序错误

```javascript
// ❌ 错误：入队顺序不成对
queue.push(left.left);
queue.push(left.right);
queue.push(right.left);
queue.push(right.right);

// ✅ 正确：镜像配对入队
queue.push(left.left, right.right);
queue.push(left.right, right.left);
```

---

## 与"相同的树"的关系

| 问题 | 比较方式 | 递归调用 |
|------|---------|---------|
| 相同的树 | 同向比较 | `(p.left, q.left), (p.right, q.right)` |
| 对称的树 | 镜像比较 | `(left.left, right.right), (left.right, right.left)` |

对称树本质上是判断左子树和右子树是否"镜像相同"。

---

## 相关题目

| 题目 | 难度 | 关联点 |
|------|------|--------|
| [100. 相同的树](https://leetcode.cn/problems/same-tree/) | 简单 | 结构比较 |
| [572. 另一棵树的子树](https://leetcode.cn/problems/subtree-of-another-tree/) | 简单 | 子结构比较 |
| [226. 翻转二叉树](https://leetcode.cn/problems/invert-binary-tree/) | 简单 | 镜像操作 |

---

## 小结

本题的关键在于理解"镜像"的含义：

1. **镜像比较**：左子树的左边 vs 右子树的右边（外侧）
2. **镜像比较**：左子树的右边 vs 右子树的左边（内侧）
3. **递归终止**：两个都为空 → 对称；一个为空 → 不对称

**解法选择**：
- 递归更直观，代码简洁
- 迭代展示了用队列成对处理的技巧
