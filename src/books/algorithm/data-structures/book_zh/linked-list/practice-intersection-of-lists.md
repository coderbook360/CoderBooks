# 实战：相交链表

如何找到两个链表的相交点？这题有一个非常优雅的解法。

## 题目描述

> **LeetCode 160. 相交链表**
>
> 给你两个单链表的头节点 headA 和 headB，请你找出并返回两个单链表相交的起始节点。如果两个链表不存在相交节点，返回 null。

**注意**：相交是指节点相同（内存地址），而不是节点值相同。

```
A: a1 → a2 ┐
           → c1 → c2 → c3
B: b1 → b2 → b3 ┘

相交点是 c1
```

## 解法一：哈希表

遍历 A，记录所有节点。遍历 B，找第一个在 Set 中的节点。

```javascript
function getIntersectionNode(headA, headB) {
    const visited = new Set();
    
    // 遍历 A，记录所有节点
    let curr = headA;
    while (curr !== null) {
        visited.add(curr);
        curr = curr.next;
    }
    
    // 遍历 B，找第一个在 Set 中的节点
    curr = headB;
    while (curr !== null) {
        if (visited.has(curr)) {
            return curr;
        }
        curr = curr.next;
    }
    
    return null;
}
```

- **时间**：O(m + n)
- **空间**：O(m)

## 解法二：双指针（浪漫解法）

这个解法非常优雅：

```javascript
function getIntersectionNode(headA, headB) {
    if (headA === null || headB === null) return null;
    
    let pA = headA;
    let pB = headB;
    
    // 当 pA === pB 时退出
    while (pA !== pB) {
        pA = pA === null ? headB : pA.next;
        pB = pB === null ? headA : pB.next;
    }
    
    return pA;
}
```

### 为什么这样能找到相交点？

设 A 独有部分长度为 a，B 独有部分长度为 b，公共部分长度为 c。

```
A: [a 部分] → [c 部分]
B: [b 部分] → [c 部分]
```

- pA 走的路径：A 全程 → B 全程 = a + c + b + c
- pB 走的路径：B 全程 → A 全程 = b + c + a + c

当 pA 和 pB 都走了 a + b + c 步时，它们正好在公共部分的起点相遇！

如果不相交（c = 0），两个指针会同时走到 null（各走 a + b 步后都是 null）。

### 执行过程示例

```
A: 4 → 1 → 8 → 4 → 5
B: 5 → 6 → 1 → 8 → 4 → 5

pA: 4 → 1 → 8 → 4 → 5 → null → 5 → 6 → 1 → 8
pB: 5 → 6 → 1 → 8 → 4 → 5 → null → 4 → 1 → 8
                                           ↑
                                        相遇在 8
```

### 复杂度

- **时间**：O(m + n)
- **空间**：O(1)

## 这个解法为什么叫"浪漫"？

有人这样描述这个算法：

> 走到尽头见不到你，于是走过你来时的路，等到相遇时才发现，你也走过我来时的路。

如果两条链表不相交，两个指针会在 null 处"相遇"，一起归于虚无。

## 本章小结

相交链表展示了双指针的巧妙应用：

1. **哈希表法**：空间 O(m)
2. **双指针法**：空间 O(1)，数学原理 a + c + b = b + c + a
3. **核心思想**：让两个指针走相同的总路程

这个解法的数学原理很简单，但需要一点灵感才能想到。
