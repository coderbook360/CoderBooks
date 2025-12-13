# 实战：排序链表

> LeetCode 148. 排序链表 | 难度：中等

链表排序的最佳实践：归并排序。本题完美结合了分治思想与链表操作技巧。

---

## 题目描述

给你链表的头结点 `head`，请将其按**升序**排列并返回排序后的链表。

要求：时间复杂度 O(n log n)，空间复杂度 O(1)。

**示例**：
```
输入：head = [4, 2, 1, 3]
输出：[1, 2, 3, 4]

输入：head = [-1, 5, 3, 4, 0]
输出：[-1, 0, 3, 4, 5]
```

---

## 思路分析

### 为什么选择归并排序？

| 排序算法 | 链表适用性 | 原因 |
|---------|-----------|------|
| 快速排序 | ⚠️ 较差 | 需要随机访问，链表分区困难 |
| 堆排序 | ❌ 不适用 | 需要随机访问建堆 |
| 归并排序 | ✅ 最佳 | 只需顺序访问+合并操作 |

### 归并排序三步走

1. **分割**：快慢指针找中点，断开链表
2. **递归**：分别排序左右两半
3. **合并**：合并两个有序链表

---

## 代码实现

### 递归版本（自顶向下）

```typescript
function sortList(head: ListNode | null): ListNode | null {
  // 基础情况：空链表或只有一个节点
  if (!head || !head.next) return head;
  
  // 1. 快慢指针找中点
  let slow = head;
  let fast = head;
  let prev: ListNode | null = null;
  
  while (fast && fast.next) {
    prev = slow;
    slow = slow!.next!;
    fast = fast.next.next;
  }
  
  // 2. 断开链表
  prev!.next = null;
  
  // 3. 递归排序左右两半
  const left = sortList(head);
  const right = sortList(slow);
  
  // 4. 合并两个有序链表
  return merge(left, right);
}

function merge(l1: ListNode | null, l2: ListNode | null): ListNode | null {
  const dummy = new ListNode(0);
  let curr = dummy;
  
  while (l1 && l2) {
    if (l1.val < l2.val) {
      curr.next = l1;
      l1 = l1.next;
    } else {
      curr.next = l2;
      l2 = l2.next;
    }
    curr = curr.next;
  }
  
  // 拼接剩余部分
  curr.next = l1 || l2;
  
  return dummy.next;
}
```

### 迭代版本（自底向上）- O(1) 空间

```typescript
function sortList(head: ListNode | null): ListNode | null {
  if (!head || !head.next) return head;
  
  // 计算链表长度
  let length = 0;
  let node = head;
  while (node) {
    length++;
    node = node.next;
  }
  
  const dummy = new ListNode(0, head);
  
  // 从长度1开始，每次翻倍
  for (let size = 1; size < length; size *= 2) {
    let prev = dummy;
    let curr = dummy.next;
    
    while (curr) {
      // 分割出第一段
      const left = curr;
      const right = split(left, size);
      curr = split(right, size);
      
      // 合并并连接
      prev.next = merge(left, right);
      
      // 移动 prev 到合并后链表的末尾
      while (prev.next) {
        prev = prev.next;
      }
    }
  }
  
  return dummy.next;
}

// 分割链表，返回第二部分的头节点
function split(head: ListNode | null, size: number): ListNode | null {
  if (!head) return null;
  
  for (let i = 1; i < size && head.next; i++) {
    head = head.next;
  }
  
  const next = head.next;
  head.next = null;
  return next;
}
```

---

## 执行过程可视化

```
链表：4 → 2 → 1 → 3

=== 递归版本 ===

第1层：找中点，分割
       左：4 → 2
       右：1 → 3

第2层（左）：找中点，分割
       左：4
       右：2
       合并：2 → 4

第2层（右）：找中点，分割
       左：1
       右：3
       合并：1 → 3

第1层：合并 [2→4] 和 [1→3]
       比较 2 和 1，取 1
       比较 2 和 3，取 2
       比较 4 和 3，取 3
       剩余 4
       结果：1 → 2 → 3 → 4 ✓
```

```
=== 迭代版本 ===

链表：4 → 2 → 1 → 3，长度=4

size=1：
  合并 [4] 和 [2] → 2 → 4
  合并 [1] 和 [3] → 1 → 3
  结果：2 → 4 → 1 → 3

size=2：
  合并 [2→4] 和 [1→3] → 1 → 2 → 3 → 4
  
size=4 >= length，结束
结果：1 → 2 → 3 → 4 ✓
```

---

## 快慢指针找中点详解

```
偶数长度：1 → 2 → 3 → 4
                s       f
           prev  slow   fast=null
           
断点在 2 和 3 之间，左半部分 [1,2]，右半部分 [3,4]

奇数长度：1 → 2 → 3 → 4 → 5
                    s           f
               prev  slow   fast=null
               
断点在 3 和 4 之间，左半部分 [1,2,3]，右半部分 [4,5]
```

**为什么需要 prev？**

因为我们需要断开链表，所以要记住中点的前一个节点。

---

## 复杂度分析

**递归版本**：
- 时间：O(n log n)
- 空间：O(log n)（递归栈）

**迭代版本**：
- 时间：O(n log n)
- 空间：O(1)

---

## 常见错误

**错误1：断开链表时忘记设置 null**
```typescript
// 错误：没有真正断开
const right = slow;  // ❌ 左半部分还连着右半部分

// 正确
prev!.next = null;   // ✅ 断开连接
const right = slow;
```

**错误2：合并时忘记处理剩余节点**
```typescript
// 错误：只处理了相等长度的情况
while (l1 && l2) { ... }
return dummy.next;  // ❌ 剩余节点丢失

// 正确
while (l1 && l2) { ... }
curr.next = l1 || l2;  // ✅ 拼接剩余
return dummy.next;
```

**错误3：奇数长度链表处理不当**
```typescript
// 需要确保左半部分 >= 右半部分
// 这样当链表只有2个节点时，左=1个，右=1个
// 而不是左=0个，右=2个
```

---

## 相关题目

| 题目 | 难度 | 说明 |
|-----|------|------|
| [21. 合并两个有序链表](https://leetcode.com/problems/merge-two-sorted-lists/) | 简单 | 合并操作 |
| [876. 链表的中间结点](https://leetcode.com/problems/middle-of-the-linked-list/) | 简单 | 快慢指针 |
| [23. 合并K个升序链表](https://leetcode.com/problems/merge-k-sorted-lists/) | 困难 | 分治或堆 |
| [147. 对链表进行插入排序](https://leetcode.com/problems/insertion-sort-list/) | 中等 | O(n²) 排序 |

---

## 链表归并 vs 数组归并

| 维度 | 数组归并 | 链表归并 |
|-----|---------|---------|
| 找中点 | O(1) 计算 | O(n) 快慢指针 |
| 分割 | 直接用索引 | 需要断开指针 |
| 合并 | 需要额外空间 | 原地修改指针 |
| 总空间 | O(n) | O(1)（迭代）或 O(log n)（递归） |

---

## 总结

排序链表的核心要点：

1. **归并排序**：链表排序的最佳选择
2. **快慢指针**：找中点并断开
3. **分治思想**：递归排序+合并
4. **迭代优化**：自底向上可以实现 O(1) 空间
5. **合并技巧**：使用 dummy 节点简化代码
