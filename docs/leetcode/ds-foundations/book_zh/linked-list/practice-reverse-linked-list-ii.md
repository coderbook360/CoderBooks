# 实战：反转链表 II

上一章是反转整个链表，这一章是反转**指定区间**。

## 题目描述

> **LeetCode 92. 反转链表 II**
>
> 给你单链表的头指针 head 和两个整数 left 和 right，其中 left <= right。请你反转从位置 left 到位置 right 的链表节点，返回反转后的链表。

**示例**：

```
输入：head = [1,2,3,4,5], left = 2, right = 4
输出：[1,4,3,2,5]

输入：head = [5], left = 1, right = 1
输出：[5]
```

## 问题分析

需要解决三个问题：
1. 如何找到要反转的区间
2. 如何反转这个区间
3. 如何把反转后的区间接回原链表

## 解法：头插法

核心思想：把需要反转的节点**依次抽出**，插入到 prev 后面。

```javascript
function reverseBetween(head, left, right) {
    // 虚拟头节点处理 left=1 的情况
    const dummy = new ListNode(0, head);
    
    // 1. 找到 left 前一个节点
    let prev = dummy;
    for (let i = 1; i < left; i++) {
        prev = prev.next;
    }
    
    // 2. 用头插法反转 [left, right] 区间
    let curr = prev.next;
    for (let i = 0; i < right - left; i++) {
        // 将 curr.next 移动到 prev 后面
        const next = curr.next;
        curr.next = next.next;
        next.next = prev.next;
        prev.next = next;
    }
    
    return dummy.next;
}
```

### 执行过程

```
head = [1,2,3,4,5], left=2, right=4

初始：dummy → 1 → 2 → 3 → 4 → 5
              prev curr

第 1 轮：把 3（curr.next）移到 prev 后面
  next = curr.next = 3
  curr.next = next.next → 2 → 4
  next.next = prev.next → 3 → 2
  prev.next = next → 1 → 3

  结果：dummy → 1 → 3 → 2 → 4 → 5
              prev     curr

第 2 轮：把 4（curr.next）移到 prev 后面
  next = curr.next = 4
  curr.next = next.next → 2 → 5
  next.next = prev.next → 4 → 3
  prev.next = next → 1 → 4

  结果：dummy → 1 → 4 → 3 → 2 → 5
              prev         curr

循环结束，返回 dummy.next = [1,4,3,2,5]
```

### 为什么用虚拟头节点？

如果 left = 1，我们需要在头节点之前做操作。虚拟头节点保证了 prev 始终有效。

### 复杂度

- **时间**：O(n)，最多遍历整个链表
- **空间**：O(1)

## 头插法详解

头插法的核心操作：把一个节点"抽出来"，插到另一个位置。

```
假设要把 b 移到 prev 后面：

prev → a → b → c → d

Step 1: 抽出 b
  next = b
  a.next = c        // a 跳过 b，直接连 c

Step 2: 插入 b 到 prev 后面
  b.next = prev.next  // b 指向 a
  prev.next = b       // prev 指向 b

结果：prev → b → a → c → d
```

每次操作后，prev 后面的顺序是反过来的。执行 k-1 次（k 是要反转的节点数），就完成了区间反转。

## 边界情况

1. **left = 1**：需要反转从头开始的部分，用虚拟头节点处理
2. **left = right**：区间长度为 1，不需要操作
3. **整个链表**：left=1, right=链表长度，等价于反转整个链表

## 本章小结

反转链表 II 展示了**头插法**技巧：

1. **虚拟头节点**：统一处理 left=1 的边界情况
2. **头插法**：把节点抽出，插入到指定位置
3. **一次遍历**：O(n) 时间，O(1) 空间

这种"局部操作"的思路在很多链表题目中都有应用。
