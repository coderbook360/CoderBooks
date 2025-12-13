# 实战：旋转链表

链表向右旋转 k 位，本质上是把最后 k 个节点移到最前面。

## 题目描述

> **LeetCode 61. 旋转链表**
>
> 给你一个链表的头节点 head，旋转链表，将链表每个节点向右移动 k 个位置。

**示例**：

```
输入：head = [1,2,3,4,5], k = 2
输出：[4,5,1,2,3]

输入：head = [0,1,2], k = 4
输出：[2,0,1]
```

## 问题分析

向右旋转 k 位 = 将最后 k 个节点移到最前面。

等价于：在倒数第 k+1 个节点处断开，然后首尾相接。

**处理 k >= n 的情况**：
- k = k % n（n 为链表长度）
- 旋转 n 次等于不旋转

## 解法：成环再断开

算法步骤：
1. 计算链表长度 n，同时找到尾节点
2. 处理 k：k = k % n，如果 k = 0 直接返回
3. 成环：尾节点连接头节点
4. 找到新的尾节点（从头走 n - k - 1 步）
5. 断开：设置新尾节点的 next 为 null

```javascript
function rotateRight(head, k) {
    if (head === null || head.next === null || k === 0) {
        return head;
    }
    
    // 1. 计算长度，找到尾节点
    let n = 1;
    let tail = head;
    while (tail.next !== null) {
        tail = tail.next;
        n++;
    }
    
    // 2. 处理 k
    k = k % n;
    if (k === 0) return head;
    
    // 3. 成环
    tail.next = head;
    
    // 4. 找新的尾节点（走 n - k - 1 步）
    let newTail = head;
    for (let i = 0; i < n - k - 1; i++) {
        newTail = newTail.next;
    }
    
    // 5. 断开，设置新头
    const newHead = newTail.next;
    newTail.next = null;
    
    return newHead;
}
```

### 执行过程

```
原链表：1 → 2 → 3 → 4 → 5, k = 2

Step 1: 计算长度 n = 5，tail = 5

Step 2: k = 2 % 5 = 2

Step 3: 成环
1 → 2 → 3 → 4 → 5
↑               │
└───────────────┘

Step 4: 找新尾节点
从 head 走 n - k - 1 = 5 - 2 - 1 = 2 步
head(1) → 2 → 3
newTail = 3

Step 5: 断开
newHead = newTail.next = 4
newTail.next = null

结果：4 → 5 → 1 → 2 → 3
```

### 为什么走 n - k - 1 步？

- 新尾节点是正数第 n - k 个节点
- 从 head（第 1 个）走到第 n - k 个需要 n - k - 1 步

## 复杂度

- **时间**：O(n)
- **空间**：O(1)

## 本章小结

旋转链表展示了"成环再断开"的技巧：

1. **先成环**：尾接头
2. **找断点**：新尾节点
3. **再断开**：新头新尾

这种技巧在处理"循环移位"类问题时很有用。

至此，链表基础部分完成。链表的核心技巧包括：
- 虚拟头节点
- 快慢指针
- 链表反转
- 双链表合并
- 成环断开

掌握这些技巧，就能解决绝大多数链表问题。
