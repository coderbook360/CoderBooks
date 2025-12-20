# 实战：环形链表 II

上一章判断是否有环，这一章找**环的入口**。

## 题目描述

> **LeetCode 142. 环形链表 II**
>
> 给定一个链表的头节点 head，返回链表开始入环的第一个节点。如果链表无环，则返回 null。

**示例**：

```
输入：head = [3,2,0,-4], pos = 1
输出：返回索引为 1 的链表节点

3 → 2 → 0 → -4
    ↑         │
    └─────────┘
    
环的入口是节点 2
```

## 数学推导

设：
- a = 从 head 到环入口的距离
- b = 从环入口到相遇点的距离
- c = 环的长度

```
head ──a步──→ [环入口] ──b步──→ [相遇点]
                ↑                  │
                │←──── c-b 步 ────│
                │                  │
                └────── 环 ────────┘
```

当 slow 和 fast 相遇时：
- slow 走了：a + b
- fast 走了：a + b + k×c（k 是绕环的圈数，k ≥ 1）

因为 fast 速度是 slow 的 2 倍：

```
2(a + b) = a + b + k×c
a + b = k×c
a = k×c - b = (k-1)×c + (c - b)
```

**关键结论**：从 head 走 a 步到达环入口，从相遇点走 (k-1)×c + (c-b) 步也到达环入口。

由于 (k-1)×c 是绕环整数圈，实际上从相遇点走 c-b 步就能到环入口。

所以：**从 head 和相遇点同时出发，每次各走 1 步，相遇点就是环入口**。

## 算法实现

```javascript
function detectCycle(head) {
    if (head === null || head.next === null) {
        return null;
    }
    
    // 第一阶段：判断是否有环，找到相遇点
    let slow = head;
    let fast = head;
    
    while (fast !== null && fast.next !== null) {
        slow = slow.next;
        fast = fast.next.next;
        
        if (slow === fast) {
            // 第二阶段：找环入口
            let ptr = head;
            while (ptr !== slow) {
                ptr = ptr.next;
                slow = slow.next;
            }
            return ptr;  // 相遇点就是环入口
        }
    }
    
    return null;  // 无环
}
```

### 执行过程

```
head = [3,2,0,-4], 环入口位置 pos = 1

链表结构：
3(0) → 2(1) → 0(2) → -4(3)
        ↑              │
        └──────────────┘

第一阶段：找相遇点
slow: 3 → 2 → 0 → -4 → 2 → 0
fast: 3 → 0 → 2 → -4 → 0 → 2
                        ↑
                       相遇在 0

第二阶段：找环入口
ptr:  3 → 2
slow: 0 → -4 → 2
           ↑
          相遇在 2

环入口是节点 2
```

## 复杂度分析

- **时间**：O(n)
  - 第一阶段：最多 O(n) 步找到相遇点
  - 第二阶段：最多 O(n) 步找到环入口
- **空间**：O(1)

## 哈希表解法

如果不想推导数学公式，可以用哈希表：

```javascript
function detectCycle(head) {
    const visited = new Set();
    let curr = head;
    
    while (curr !== null) {
        if (visited.has(curr)) {
            return curr;  // 第一个重复访问的就是环入口
        }
        visited.add(curr);
        curr = curr.next;
    }
    
    return null;
}
```

时间 O(n)，空间 O(n)。

## 本章小结

环形链表 II 展示了 Floyd 算法的完整应用：

1. **第一阶段**：快慢指针找相遇点（证明有环）
2. **第二阶段**：从 head 和相遇点同时出发找环入口
3. **数学原理**：a = (k-1)×c + (c-b)

这道题的数学推导是面试常考点，建议理解原理而不是死记代码。
