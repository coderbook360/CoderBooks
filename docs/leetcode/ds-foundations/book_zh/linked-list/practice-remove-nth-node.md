# 实战：删除链表的倒数第 N 个节点

如何一次遍历就找到倒数第 N 个节点？用快慢指针。

## 题目描述

> **LeetCode 19. 删除链表的倒数第 N 个结点**
>
> 给你一个链表，删除链表的倒数第 n 个结点，并且返回链表的头结点。

**示例**：

```
输入：head = [1,2,3,4,5], n = 2
输出：[1,2,3,5]
解释：删除倒数第 2 个节点（值为 4）
```

**进阶**：你能尝试使用一趟扫描实现吗？

## 解法一：两次遍历

先计算链表长度，再删除正数第 (length - n) 个节点。

```javascript
function removeNthFromEnd(head, n) {
    // 第一次遍历：计算链表长度
    let length = 0;
    let curr = head;
    while (curr !== null) {
        length++;
        curr = curr.next;
    }
    
    // 计算正向位置
    const pos = length - n;
    
    // 删除第 pos 个节点
    const dummy = new ListNode(0, head);
    curr = dummy;
    for (let i = 0; i < pos; i++) {
        curr = curr.next;
    }
    curr.next = curr.next.next;
    
    return dummy.next;
}
```

时间 O(n)，但需要两次遍历。

## 解法二：快慢指针（一次遍历）

核心思想：
1. 快指针先走 n+1 步
2. 然后快慢指针同时走
3. 快指针到达 null 时，慢指针正好在待删除节点的**前一个**位置

```javascript
function removeNthFromEnd(head, n) {
    const dummy = new ListNode(0, head);
    let fast = dummy;
    let slow = dummy;
    
    // 快指针先走 n+1 步
    for (let i = 0; i <= n; i++) {
        fast = fast.next;
    }
    
    // 同时移动，直到 fast 到达 null
    while (fast !== null) {
        fast = fast.next;
        slow = slow.next;
    }
    
    // slow 指向待删除节点的前一个
    slow.next = slow.next.next;
    
    return dummy.next;
}
```

### 为什么先走 n+1 步？

我们要找的是待删除节点的**前一个**节点，这样才能执行 `slow.next = slow.next.next`。

- 快指针先走 n+1 步
- 快慢指针同时走
- 当 fast = null 时，fast 走了 length 步
- slow 走了 length - (n+1) = length - n - 1 步
- slow 正好在倒数第 n+1 个位置（待删除节点的前一个）

### 执行过程

```
head = [1,2,3,4,5], n = 2

初始：
dummy → 1 → 2 → 3 → 4 → 5 → null
 fast
 slow

快指针先走 3 步（n+1）：
dummy → 1 → 2 → 3 → 4 → 5 → null
 slow           fast

同时移动：
dummy → 1 → 2 → 3 → 4 → 5 → null
        slow           fast

dummy → 1 → 2 → 3 → 4 → 5 → null
            slow           fast

fast = null，停止

删除 slow.next（节点 4）：
slow.next = slow.next.next
结果：[1,2,3,5]
```

### 为什么用虚拟头节点？

如果要删除的是头节点（n 等于链表长度），没有虚拟头节点会导致空指针问题。

### 复杂度

- **时间**：O(n)，一次遍历
- **空间**：O(1)

## 本章小结

删除倒数第 N 个节点展示了快慢指针的经典用法：

1. **两次遍历**：先求长度，再定位
2. **一次遍历**：快指针先走 n+1 步，然后同步移动
3. **虚拟头节点**：处理删除头节点的边界情况

快慢指针的核心思想：利用两个指针的间距来定位目标节点。
