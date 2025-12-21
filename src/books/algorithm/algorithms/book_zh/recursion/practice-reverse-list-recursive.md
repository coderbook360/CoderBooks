# 实战：翻转链表（递归解法）

翻转链表是链表操作的经典问题，既可以用迭代，也可以用递归。递归解法虽然不是最优解，但它展示了递归思维在链表问题上的应用，也是理解递归的绝佳训练。

📎 [LeetCode 206. 反转链表](https://leetcode.cn/problems/reverse-linked-list/)

---

## 题目描述

给定单链表的头节点 `head`，反转链表并返回反转后的头节点。

**示例**：

```
输入: head = [1,2,3,4,5]
输出: [5,4,3,2,1]

图示：
1 → 2 → 3 → 4 → 5 → null
           ↓
5 → 4 → 3 → 2 → 1 → null
```

**约束**：
- 链表节点数范围 [0, 5000]
- -5000 <= Node.val <= 5000

---

## 思路分析

### 这道题在考什么？

1. 递归在链表问题上的应用
2. "假设子问题已解决"的递归思维
3. 对比递归与迭代的优劣

### 递归思路

**核心问题**：如何用递归反转链表？

**递归三要素**：

#### 1. 函数定义

```typescript
/**
 * 反转以 head 为起点的链表
 * @param head - 链表头节点
 * @returns 反转后的链表头节点
 */
function reverseList(head: ListNode | null): ListNode | null
```

#### 2. 终止条件

最简单的情况：
- 空链表：返回 null
- 单节点链表：返回自己

```typescript
if (head === null || head.next === null) {
  return head;
}
```

#### 3. 递归关系

**关键洞察**：假设 `reverseList(head.next)` 已经正确反转了后面的链表，我们只需要处理 `head` 节点。

```
原链表: 1 → 2 → 3 → 4 → 5 → null
              ↑
            head

假设 reverseList(head.next) 已完成:
1 → 2 ← 3 ← 4 ← 5
    ↑           ↑
  head       newHead

现在要做什么？
1. 让 head.next 指向 head: head.next.next = head
2. 断开 head 原本的 next: head.next = null

结果: 5 → 4 → 3 → 2 → 1 → null
```

---

## 解法一：递归

### 代码实现

```typescript
/**
 * Definition for singly-linked list.
 */
class ListNode {
  val: number;
  next: ListNode | null;
  constructor(val?: number, next?: ListNode | null) {
    this.val = val === undefined ? 0 : val;
    this.next = next === undefined ? null : next;
  }
}

/**
 * 递归反转链表
 * 时间复杂度：O(n) - 访问每个节点一次
 * 空间复杂度：O(n) - 递归栈深度
 */
function reverseList(head: ListNode | null): ListNode | null {
  // 1. 终止条件：空链表或单节点链表
  if (head === null || head.next === null) {
    return head;
  }
  
  // 2. 递归反转后面的链表
  const newHead = reverseList(head.next);
  
  // 3. 处理当前节点
  // head.next 是反转后链表的尾节点
  // 让它指向 head
  head.next.next = head;
  
  // 4. 断开 head 的 next（变成新的尾节点）
  head.next = null;
  
  return newHead;
}
```

### 递归过程详解

以 `1 → 2 → 3 → null` 为例：

```
调用栈（压栈阶段）：
┌──────────────────┐
│ reverseList(1)   │ 等待 reverseList(2) 的结果
├──────────────────┤
│ reverseList(2)   │ 等待 reverseList(3) 的结果
├──────────────────┤
│ reverseList(3)   │ 到达终止条件，返回 3
└──────────────────┘

回溯阶段（弹栈）：

步骤 1：处理 reverseList(2)
原状态: 1 → 2 → 3 → null
newHead = 3
head = 2
head.next.next = head  →  3.next = 2
head.next = null        →  2.next = null
结果: 1 → 2 ← 3

步骤 2：处理 reverseList(1)
原状态: 1 → 2 ← 3
newHead = 3
head = 1
head.next.next = head  →  2.next = 1
head.next = null        →  1.next = null
结果: 1 ← 2 ← 3

最终返回 newHead = 3
```

### 关键理解

**为什么 `head.next.next = head` 是正确的？**

在递归返回时，`head.next` 始终是反转后链表的尾节点（因为它原本是 `head` 的下一个节点）。让尾节点指向 `head`，就完成了反转。

---

## 解法二：迭代（对比）

### 代码实现

```typescript
/**
 * 迭代反转链表
 * 时间复杂度：O(n)
 * 空间复杂度：O(1) ⭐ 比递归省空间
 */
function reverseListIterative(head: ListNode | null): ListNode | null {
  let prev: ListNode | null = null;
  let curr = head;
  
  while (curr !== null) {
    const next = curr.next;  // 保存下一个节点
    curr.next = prev;         // 反转指针
    prev = curr;              // prev 前进
    curr = next;              // curr 前进
  }
  
  return prev;  // prev 是新的头节点
}
```

### 迭代过程

```
初始: prev = null, curr = 1
链表: 1 → 2 → 3 → null

迭代 1:
next = 2
1.next = null
prev = 1, curr = 2
结果: null ← 1   2 → 3 → null

迭代 2:
next = 3
2.next = 1
prev = 2, curr = 3
结果: null ← 1 ← 2   3 → null

迭代 3:
next = null
3.next = 2
prev = 3, curr = null
结果: null ← 1 ← 2 ← 3

返回 prev = 3
```

---

## 复杂度对比

| 解法 | 时间复杂度 | 空间复杂度 | 优势 | 劣势 |
|-----|-----------|-----------|------|------|
| 递归 | O(n) | O(n) | 代码简洁，思路清晰 | 空间开销大，链表长时可能栈溢出 |
| 迭代 | O(n) | O(1) | 空间效率高，无栈溢出风险 | 需要维护多个指针，稍复杂 |

**实际应用**：
- 链表长度 < 1000：两种方法都可以
- 链表长度很大：优先迭代
- 面试中：两种方法都要会

---

## 递归变体：反转前 N 个节点

### 问题

反转链表的前 N 个节点。

```
输入: head = [1,2,3,4,5], n = 3
输出: [3,2,1,4,5]
```

### 代码实现

```typescript
function reverseN(head: ListNode | null, n: number): ListNode | null {
  let successor: ListNode | null = null;  // 第 n+1 个节点
  
  function reverse(head: ListNode | null, n: number): ListNode | null {
    // 终止条件：n=1 时，记录后继节点
    if (n === 1) {
      successor = head!.next;
      return head;
    }
    
    // 反转前 n-1 个节点
    const newHead = reverse(head!.next, n - 1);
    
    // 处理当前节点
    head!.next.next = head;
    head!.next = successor;  // 连接后继节点
    
    return newHead;
  }
  
  return reverse(head, n);
}
```

---

## 递归变体：反转区间 [left, right]

### 问题

反转链表的第 left 到 right 个节点（LeetCode 92）。

```
输入: head = [1,2,3,4,5], left = 2, right = 4
输出: [1,4,3,2,5]
```

### 思路

1. 递归到第 left 个节点
2. 反转从 left 到 right 的节点
3. 连接前后部分

### 代码实现

```typescript
function reverseBetween(
  head: ListNode | null,
  left: number,
  right: number
): ListNode | null {
  // left = 1 时，等价于反转前 right 个节点
  if (left === 1) {
    return reverseN(head, right);
  }
  
  // 递归到第 left 个节点
  head!.next = reverseBetween(head!.next, left - 1, right - 1);
  return head;
}
```

---

## 易错点

### 1. 忘记断开 head.next

```typescript
// ❌ 错误：没有断开 head.next，导致循环引用
function reverseList(head: ListNode | null): ListNode | null {
  if (head === null || head.next === null) return head;
  const newHead = reverseList(head.next);
  head.next.next = head;
  // 忘记 head.next = null
  return newHead;
}

// 结果：1 ⇄ 2 ⇄ 3（循环）
```

### 2. 返回值错误

```typescript
// ❌ 错误：返回了 head 而不是 newHead
function reverseList(head: ListNode | null): ListNode | null {
  if (head === null || head.next === null) return head;
  const newHead = reverseList(head.next);
  head.next.next = head;
  head.next = null;
  return head;  // 错误：应该返回 newHead
}
```

### 3. 终止条件不完整

```typescript
// ❌ 错误：只处理了空链表，没有处理单节点
function reverseList(head: ListNode | null): ListNode | null {
  if (head === null) return head;
  // head.next === null 时会出错
  const newHead = reverseList(head.next);
  // ...
}
```

---

## 相关题目

| 题目 | 难度 | 说明 |
|-----|------|------|
| [206. 反转链表](https://leetcode.cn/problems/reverse-linked-list/) | 简单 | 本题 |
| [92. 反转链表 II](https://leetcode.cn/problems/reverse-linked-list-ii/) | 中等 | 反转区间 |
| [25. K 个一组翻转链表](https://leetcode.cn/problems/reverse-nodes-in-k-group/) | 困难 | 分组反转 |
| [24. 两两交换链表中的节点](https://leetcode.cn/problems/swap-nodes-in-pairs/) | 中等 | 特殊的反转 |

---

## 举一反三

反转链表教会我们：

1. **递归在链表上的应用**：
   - 链表的递归定义：head + 剩余链表
   - 处理 head，递归处理剩余部分

2. **递归与迭代的权衡**：
   - 递归：代码简洁，但有空间开销
   - 迭代：效率更高，但稍复杂

3. **指针操作的细节**：
   - 保存 next 避免丢失
   - 断开原有连接避免循环
   - 正确返回新的头节点

4. **递归的扩展**：
   - 反转前 N 个节点
   - 反转区间 [left, right]
   - K 个一组反转

---

## 本章小结

反转链表是链表操作的经典问题：
- **递归解法**：简洁优雅，展示递归思维
- **迭代解法**：空间高效，实际应用更广
- **变体丰富**：可扩展到区间反转、分组反转等

掌握这道题的递归解法，你就能更好地理解递归在链表问题上的应用模式。

---

## 练习

1. 用递归实现"两两交换链表中的节点"（LeetCode 24）
2. 比较递归和迭代反转链表的性能（实测 100 万节点）
3. 实现"K 个一组翻转链表"的递归解法（LeetCode 25）
