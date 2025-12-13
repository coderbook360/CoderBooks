# 实战：相同的树

判断两棵二叉树是否完全相同。这是二叉树比较问题的基础。

---

## 问题描述

**LeetCode 100. Same Tree**

给你两棵二叉树的根节点 p 和 q，判断这两棵树是否相同。

如果两棵树在结构上相同，并且节点具有相同的值，则认为它们是相同的。

**示例 1**：
```
输入：p = [1,2,3], q = [1,2,3]
    1         1
   / \       / \
  2   3     2   3
输出：true
```

**示例 2**：
```
输入：p = [1,2], q = [1,null,2]
    1         1
   /           \
  2             2
输出：false
解释：结构不同
```

**示例 3**：
```
输入：p = [1,2,1], q = [1,1,2]
    1         1
   / \       / \
  2   1     1   2
输出：false
解释：值不同
```

**约束条件**：
- 两棵树的节点数目范围是 `[0, 100]`
- `-10^4 <= Node.val <= 10^4`

---

## 问题分析

"相同"的定义：
1. **结构相同**：两棵树的形状完全一致
2. **值相同**：对应位置的节点值相等

**递归判断条件**：
- 两个都为空 → 相同
- 一个为空一个不为空 → 不同
- 两个都不为空 → 比较值，且左子树相同，且右子树相同

---

## 解法一：递归

```javascript
function isSameTree(p, q) {
  // 都为空
  if (!p && !q) return true;
  
  // 只有一个为空
  if (!p || !q) return false;
  
  // 值不同
  if (p.val !== q.val) return false;
  
  // 递归比较子树
  return isSameTree(p.left, q.left) && isSameTree(p.right, q.right);
}
```

**递归树展示**：

```
isSameTree(p, q) where p = [1,2,3], q = [1,2,3]

isSameTree(1, 1)
├── 1.val == 1.val ✓
├── isSameTree(2, 2)
│   ├── 2.val == 2.val ✓
│   ├── isSameTree(null, null) → true
│   └── isSameTree(null, null) → true
│   └── return true
├── isSameTree(3, 3)
│   ├── 3.val == 3.val ✓
│   ├── isSameTree(null, null) → true
│   └── isSameTree(null, null) → true
│   └── return true
└── return true
```

---

## 解法二：迭代（BFS）

用队列同步遍历两棵树：

```javascript
function isSameTree(p, q) {
  const queue = [[p, q]];
  
  while (queue.length > 0) {
    const [node1, node2] = queue.shift();
    
    // 都为空，继续下一对
    if (!node1 && !node2) continue;
    
    // 只有一个为空
    if (!node1 || !node2) return false;
    
    // 值不同
    if (node1.val !== node2.val) return false;
    
    // 子节点成对入队
    queue.push([node1.left, node2.left]);
    queue.push([node1.right, node2.right]);
  }
  
  return true;
}
```

---

## 解法三：迭代（DFS）

用栈代替队列：

```javascript
function isSameTree(p, q) {
  const stack = [[p, q]];
  
  while (stack.length > 0) {
    const [node1, node2] = stack.pop();
    
    if (!node1 && !node2) continue;
    if (!node1 || !node2) return false;
    if (node1.val !== node2.val) return false;
    
    stack.push([node1.left, node2.left]);
    stack.push([node1.right, node2.right]);
  }
  
  return true;
}
```

---

## 执行过程示例

```
p = [1,2,3], q = [1,2,3]

queue = [[1, 1]]

取出 (1, 1)：
  1 == 1 ✓
  入队：(2, 2), (3, 3)
  queue = [(2, 2), (3, 3)]

取出 (2, 2)：
  2 == 2 ✓
  入队：(null, null), (null, null)

取出 (3, 3)：
  3 == 3 ✓
  入队：(null, null), (null, null)

取出 (null, null)：继续
...

队列空，返回 true
```

---

## 复杂度分析

**时间复杂度**：O(min(m, n))
- m 和 n 是两棵树的节点数
- 最多比较到较小树的所有节点

**空间复杂度**：O(min(m, n))
- 递归栈或队列/栈的深度
- 最坏情况是较小树的高度

---

## 边界情况

```javascript
// 测试用例
isSameTree(null, null);                  // 两个空树 → true
isSameTree(null, {val: 1});             // 一空一不空 → false
isSameTree({val: 1}, {val: 2});         // 值不同 → false
isSameTree({val: 1, left: {val: 2}},    // 结构不同 → false
           {val: 1, right: {val: 2}});
```

---

## 常见错误

### 1. 判断顺序错误

```javascript
// ❌ 错误：先比较值，后检查空
if (p.val !== q.val) return false;  // p 或 q 为 null 时报错
if (!p && !q) return true;

// ✅ 正确：先检查空，再比较值
if (!p && !q) return true;
if (!p || !q) return false;
if (p.val !== q.val) return false;
```

### 2. 混淆"或"和"且"

```javascript
// ❌ 错误：用"或"连接子树比较
return isSameTree(p.left, q.left) || isSameTree(p.right, q.right);
// 只要一边相同就返回 true

// ✅ 正确：两边都要相同
return isSameTree(p.left, q.left) && isSameTree(p.right, q.right);
```

---

## 扩展应用

这道题的思路可以用于多种场景：

| 应用 | 描述 | 修改点 |
|------|------|--------|
| **子树判断** | 判断 B 是否是 A 的子树 | 对 A 的每个节点调用 isSameTree |
| **对称树** | 判断左右子树是否镜像 | 比较 left.left 与 right.right |
| **树的复制** | 创建一棵完全相同的树 | 递归创建节点而非比较 |
| **序列化** | 比较两棵树的序列化结果 | 转为字符串后比较 |

---

## 相关题目

| 题目 | 难度 | 关联点 |
|------|------|--------|
| [101. 对称二叉树](https://leetcode.cn/problems/symmetric-tree/) | 简单 | 镜像比较 |
| [572. 另一棵树的子树](https://leetcode.cn/problems/subtree-of-another-tree/) | 简单 | 子结构 |
| [226. 翻转二叉树](https://leetcode.cn/problems/invert-binary-tree/) | 简单 | 结构变换 |
| [951. 翻转等价二叉树](https://leetcode.cn/problems/flip-equivalent-binary-trees/) | 中等 | 翻转后相同 |

---

## 小结

"相同的树"是二叉树比较的基础模板：

1. **递归三要素**：
   - 终止条件：都为空 / 一个为空
   - 当前处理：比较值
   - 递归调用：比较左右子树

2. **比较模式**：
   - 同向比较：left-left, right-right（相同树）
   - 镜像比较：left-right, right-left（对称树）

3. **迭代转换**：成对入队/入栈，保持同步遍历

掌握这个模板后，可以轻松解决各种二叉树结构比较问题。
