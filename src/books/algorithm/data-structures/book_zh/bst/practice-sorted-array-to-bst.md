# 实战：将有序数组转换为二叉搜索树

将升序数组转换为高度平衡的 BST。

---

## 问题描述

**LeetCode 108. Convert Sorted Array to Binary Search Tree**

给你一个整数数组 nums，其中元素已经按升序排列，请你将其转换为一棵**高度平衡**的二叉搜索树。

**高度平衡**：每个节点的左右两个子树的高度差不超过 1。

**示例**：
```
输入：nums = [-10, -3, 0, 5, 9]

输出（答案不唯一，以下都是正确的）：

      0                    0
     / \                  / \
   -3   9       或      -10  5
   /   /                  \   \
 -10  5                   -3   9
```

---

## 核心思想

要构建**平衡** BST，关键是让左右子树的节点数尽量相等。

**策略**：选择中间元素作为根，这样左右两边的元素数量相等（或相差 1）。

```
nums = [-10, -3, 0, 5, 9]
              ↑
            中间元素作为根

左半部分 [-10, -3] 构建左子树
右半部分 [5, 9] 构建右子树

递归地对左右部分做同样的操作
```

---

## 解法

```javascript
function sortedArrayToBST(nums) {
  function build(left, right) {
    if (left > right) return null;
    
    // 选择中间位置作为根
    const mid = Math.floor((left + right) / 2);
    const node = new TreeNode(nums[mid]);
    
    // 递归构建左右子树
    node.left = build(left, mid - 1);
    node.right = build(mid + 1, right);
    
    return node;
  }
  
  return build(0, nums.length - 1);
}
```

---

## 执行过程可视化

```
nums = [-10, -3, 0, 5, 9]
        0    1  2  3  4

build(0, 4):
  mid = 2, root = nums[2] = 0
  left = build(0, 1)
  right = build(3, 4)

build(0, 1):  // 左子树
  mid = 0, root = nums[0] = -10
  left = build(0, -1) = null
  right = build(1, 1)
  
build(1, 1):  // -10 的右子树
  mid = 1, root = nums[1] = -3
  left = build(1, 0) = null
  right = build(2, 1) = null
  
build(3, 4):  // 右子树
  mid = 3, root = nums[3] = 5
  left = build(3, 2) = null
  right = build(4, 4)
  
build(4, 4):  // 5 的右子树
  mid = 4, root = nums[4] = 9

最终结果：
      0
     / \
   -10  5
     \   \
     -3   9
```

---

## 为什么选中间元素？

| 策略 | 效果 |
|------|------|
| 选第一个元素 | 退化成链表（完全不平衡） |
| 选最后一个元素 | 退化成链表（完全不平衡） |
| 选中间元素 | 左右子树节点数相等，最平衡 |

```
用第一个元素作为根：       用中间元素作为根：
     -10                      0
       \                     / \
       -3                  -10  5
         \                   \   \
          0                  -3   9
           \
            5
             \
              9
高度 = 5                  高度 = 3
```

---

## 中间位置的选择

当数组长度为偶数时，中间位置有两个选择：

```javascript
// 选择左中位数
const mid = Math.floor((left + right) / 2);

// 选择右中位数
const mid = Math.floor((left + right + 1) / 2);
```

两种都正确，会产生不同但都平衡的 BST。

---

## 边界情况

```javascript
// 测试用例
sortedArrayToBST([]);             // 空数组 → null
sortedArrayToBST([1]);            // 单元素 → 单节点
sortedArrayToBST([1, 2]);         // 两元素
sortedArrayToBST([1, 2, 3]);      // 三元素 → 完美平衡

// 较长数组
sortedArrayToBST([1, 2, 3, 4, 5, 6, 7]);  // 完美平衡
```

---

## 常见错误

### 1. 数组切片导致效率低

```javascript
// ❌ 低效：每次递归都创建新数组
function sortedArrayToBST(nums) {
  if (nums.length === 0) return null;
  const mid = Math.floor(nums.length / 2);
  const node = new TreeNode(nums[mid]);
  node.left = sortedArrayToBST(nums.slice(0, mid));
  node.right = sortedArrayToBST(nums.slice(mid + 1));
  return node;
}

// ✅ 高效：用索引
function build(left, right) {
  // 不创建新数组，只传递索引
}
```

### 2. 边界计算错误

```javascript
// ❌ 错误：包含了中间元素
node.left = build(left, mid);      // 应该是 mid - 1
node.right = build(mid, right);    // 应该是 mid + 1

// ✅ 正确
node.left = build(left, mid - 1);
node.right = build(mid + 1, right);
```

---

## 相关问题

### 有序链表转 BST

链表不支持随机访问，需要用快慢指针找中点：

```javascript
function sortedListToBST(head) {
  if (!head) return null;
  if (!head.next) return new TreeNode(head.val);
  
  // 快慢指针找中点
  let slow = head, fast = head, prev = null;
  while (fast && fast.next) {
    prev = slow;
    slow = slow.next;
    fast = fast.next.next;
  }
  
  // 断开链表
  prev.next = null;
  
  const node = new TreeNode(slow.val);
  node.left = sortedListToBST(head);
  node.right = sortedListToBST(slow.next);
  
  return node;
}
```

### BST 转有序数组

中序遍历即可：

```javascript
function bstToSortedArray(root) {
  const result = [];
  function inorder(node) {
    if (!node) return;
    inorder(node.left);
    result.push(node.val);
    inorder(node.right);
  }
  inorder(root);
  return result;
}
```

---

## 复杂度分析

- **时间复杂度**：O(n)，每个元素访问一次
- **空间复杂度**：O(log n)，递归栈深度（因为树是平衡的）

---

## 相关题目

| 题目 | 难度 | 说明 |
|------|------|------|
| [108. 有序数组转 BST](https://leetcode.cn/problems/convert-sorted-array-to-binary-search-tree/) | 简单 | 本题 |
| [109. 有序链表转 BST](https://leetcode.cn/problems/convert-sorted-list-to-binary-search-tree/) | 中等 | 链表变体 |
| [1382. 将 BST 变平衡](https://leetcode.cn/problems/balance-a-binary-search-tree/) | 中等 | 先中序，再构建 |

---

## 小结

有序数组转平衡 BST 的核心思想：**分治 + 选中点**。

```
1. 选择中间元素作为根（保证平衡）
2. 左半部分递归构建左子树
3. 右半部分递归构建右子树
```

这个模式也可以用于：
- 从有序链表构建平衡 BST
- 重新平衡一棵不平衡的 BST（先中序遍历得到有序数组，再构建）

- 时间：O(n)
- 空间：O(log n)
