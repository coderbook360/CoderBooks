# 实战：环形链表

如何判断链表中是否有环？这是快慢指针的经典应用。

## 题目描述

> **LeetCode 141. 环形链表**
>
> 给你一个链表的头节点 head，判断链表中是否有环。

**示例**：

```
输入：head = [3,2,0,-4], pos = 1
输出：true
解释：链表中有一个环，其尾部连接到第二个节点。

3 → 2 → 0 → -4
    ↑         │
    └─────────┘
```

## 解法一：哈希表

遍历链表，用 Set 记录访问过的节点。如果某个节点被访问两次，说明有环。

```javascript
function hasCycle(head) {
    const visited = new Set();
    let curr = head;
    
    while (curr !== null) {
        if (visited.has(curr)) {
            return true;  // 节点已访问过，有环
        }
        visited.add(curr);
        curr = curr.next;
    }
    
    return false;
}
```

### 复杂度

- **时间**：O(n)
- **空间**：O(n)，存储所有节点

## 解法二：快慢指针（Floyd 判圈法）

核心思想：
- 快指针每次走 2 步，慢指针每次走 1 步
- 如果有环，快慢指针一定会相遇
- 如果无环，快指针会先到达 null

```javascript
function hasCycle(head) {
    if (head === null || head.next === null) {
        return false;
    }
    
    let slow = head;
    let fast = head;
    
    while (fast !== null && fast.next !== null) {
        slow = slow.next;        // 慢指针走 1 步
        fast = fast.next.next;   // 快指针走 2 步
        
        if (slow === fast) {
            return true;  // 相遇，有环
        }
    }
    
    return false;  // fast 到达 null，无环
}
```

### 为什么快慢指针能检测环？

想象两个人在操场上跑步：
- 慢的人每分钟跑 1 圈
- 快的人每分钟跑 2 圈

如果操场是环形的，快的人一定会从后面追上慢的人（套圈）。

如果操场是直线的，快的人跑到终点就结束了，永远不会相遇。

### 数学证明

假设环的长度是 c，当 slow 进入环时：
- slow 在环入口
- fast 已经在环内某个位置

设 fast 在 slow 前面 k 步（0 < k < c）。

每走一步：
- slow 前进 1
- fast 前进 2
- 两者距离减少 1

k 步后，距离变为 0，两者相遇。

所以快慢指针一定会在 O(n) 时间内相遇（如果有环）。

### 复杂度

- **时间**：O(n)
- **空间**：O(1)，只用两个指针

## 两种方法对比

| 方法 | 时间 | 空间 | 特点 |
|-----|------|------|------|
| 哈希表 | O(n) | O(n) | 直观易懂 |
| 快慢指针 | O(n) | O(1) | 空间最优 |

## 本章小结

环形链表检测是快慢指针的经典应用：

1. **哈希表法**：记录访问过的节点，空间 O(n)
2. **快慢指针**：快的追慢的，有环必相遇，空间 O(1)
3. **Floyd 判圈法**：快指针走 2 步，慢指针走 1 步

快慢指针是一个强大的技巧，下一章我们学习如何找到环的入口。
