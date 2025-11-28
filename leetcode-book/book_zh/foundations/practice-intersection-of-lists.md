# 相交链表

> LeetCode 160. Intersection of Two Linked Lists

给你两个单链表的头节点，找出并返回两个链表相交的起始节点。如果不相交，返回 `null`。

这道题有一个优雅到令人拍案叫绝的解法：**双指针交替遍历**。

## 问题描述

```javascript
输入：listA = [4,1,8,4,5], listB = [5,6,1,8,4,5], intersectVal = 8
输出：节点 8
解释：两个链表在节点 8 处相交

    4 → 1 ↘
            8 → 4 → 5
5 → 6 → 1 ↗

输入：listA = [1,9,1,2,4], listB = [3,2,4], intersectVal = 2
输出：节点 2

输入：listA = [2,6,4], listB = [1,5], intersectVal = 0
输出：null
解释：两个链表不相交
```

**注意**：相交是指节点**引用相同**（同一个对象），不是值相同。

## 思路分析

### 哈希表解法

遍历链表 A，把所有节点存入 Set。然后遍历链表 B，找到第一个在 Set 中的节点。

```javascript
function getIntersectionNode(headA, headB) {
    const seen = new Set();
    
    let current = headA;
    while (current) {
        seen.add(current);
        current = current.next;
    }
    
    current = headB;
    while (current) {
        if (seen.has(current)) {
            return current;
        }
        current = current.next;
    }
    
    return null;
}
```

时间 O(m + n)，空间 O(m)。能不能 O(1) 空间？

### 双指针解法（推荐）

**核心思想**：让两个指针走相同的路程，它们就会在相交点相遇。

```javascript
function getIntersectionNode(headA, headB) {
    if (!headA || !headB) return null;
    
    let pA = headA;
    let pB = headB;
    
    // 当 pA 和 pB 相遇时停止
    while (pA !== pB) {
        // pA 走完 A 后，从 B 头开始
        pA = pA ? pA.next : headB;
        // pB 走完 B 后，从 A 头开始
        pB = pB ? pB.next : headA;
    }
    
    return pA;  // 相交点或 null
}
```

## 为什么双指针能找到相交点？

### 数学证明

假设两个链表的结构如下：

```
链表A: a1 → a2 → c1 → c2 → c3
链表B: b1 → b2 → b3 → c1 → c2 → c3

设：
- A 独有部分长度 = a
- B 独有部分长度 = b
- 公共部分长度 = c
```

**pA 的路径**：
1. 先走完 A：`a + c` 步
2. 再从 B 头走到相交点：`b` 步
3. 总共：`a + c + b` 步

**pB 的路径**：
1. 先走完 B：`b + c` 步
2. 再从 A 头走到相交点：`a` 步
3. 总共：`b + c + a` 步

两者走的总步数相同！所以一定会在相交点 c1 相遇。

### 图解

```
链表A: [a1] → [a2] → [c1] → [c2] → [c3]
链表B: [b1] → [b2] → [b3] → [c1] → [c2] → [c3]

pA 的路径:
a1 → a2 → c1 → c2 → c3 → b1 → b2 → b3 → c1
                                        ↑相遇

pB 的路径:
b1 → b2 → b3 → c1 → c2 → c3 → a1 → a2 → c1
                                        ↑相遇

pA 走了: 2 + 3 + 3 = 8 步
pB 走了: 3 + 3 + 2 = 8 步
```

### 不相交的情况

如果两个链表不相交：

```
链表A: [a1] → [a2] → [a3]        (长度 = m)
链表B: [b1] → [b2]               (长度 = n)

pA 的路径: a1 → a2 → a3 → b1 → b2 → null
pB 的路径: b1 → b2 → a1 → a2 → a3 → null
```

两者都会在走完 `m + n` 步后同时到达 `null`，循环结束，返回 `null`。

## 解法详解

```javascript
function getIntersectionNode(headA, headB) {
    // 边界情况
    if (!headA || !headB) return null;
    
    let pA = headA;
    let pB = headB;
    
    while (pA !== pB) {
        // 关键：到达 null 后切换到另一个链表头
        pA = pA ? pA.next : headB;
        pB = pB ? pB.next : headA;
    }
    
    // pA === pB 时退出循环
    // 要么是相交点，要么都是 null
    return pA;
}
```

**为什么用 `pA ? pA.next : headB`？**

当 `pA` 走到 `null` 时（链表末尾），切换到另一个链表的头部继续走。

### 执行过程

以 `A: [4,1,8,4,5]`，`B: [5,6,1,8,4,5]`，相交于节点 8 为例：

```
A: 4 → 1 → 8 → 4 → 5
          ↑
B: 5 → 6 → 1 → 8 → 4 → 5

步骤:
     pA    pB
1.   4     5
2.   1     6
3.   8     1
4.   4     8
5.   5     4
6.  null   5
7.   5    null
8.   6     4
9.   1     1
10.  8     8   ← 相遇！返回节点8
```

## 复杂度分析

**时间复杂度：O(m + n)**
- 最多遍历 m + n 个节点

**空间复杂度：O(1)**
- 只用了两个指针

## 边界情况

```javascript
// 一个链表为空
getIntersectionNode(null, [1, 2])  // null

// 完全不相交
// A: 1 → 2 → 3
// B: 4 → 5
getIntersectionNode(A, B)  // null

// 相交于第一个节点
// A: 1 → 2 → 3
// B: 1 → 2 → 3（同一个链表）
getIntersectionNode(A, B)  // 节点 1

// 一个是另一个的子链表
// A: 1 → 2 → 3
// B: 2 → 3（B 的头就是 A 的第二个节点）
getIntersectionNode(A, B)  // 节点 2
```

## 常见误区

**误区一：比较值而不是引用**

```javascript
// ❌ 错误
if (pA.val === pB.val) return pA;

// ✅ 正确（比较引用）
if (pA === pB) return pA;
```

两个不同的节点可能有相同的值，但不是同一个节点。

**误区二：忘记处理不相交的情况**

```javascript
// ✅ 代码已经处理了
// 不相交时，两者同时到达 null，返回 null
while (pA !== pB) { ... }
return pA;  // 可能是 null
```

## 小结

这道题的精妙之处在于：

**核心思想**：消除长度差
- 两个指针各走一遍 A + B
- 路程相同，在相交点相遇

**数学本质**：
- pA 走：a + c + b
- pB 走：b + c + a
- 路程相等，必在 c（相交点）相遇

**代码精髓**：
```javascript
pA = pA ? pA.next : headB;
```
一行代码实现"走完就切换"的逻辑。

这道题是面试中的高频题，解法优雅，值得反复品味。
