# 实战：链表排序

数组排序我们已经非常熟悉了，快速排序、归并排序、堆排序...但链表排序却是另一番天地。链表无法随机访问，很多数组排序算法在链表上效率很低。那么，如何高效地对链表排序呢？

## 问题描述

给你链表的头节点`head`，请将其按**升序**排列并返回排序后的链表。

**进阶要求**：
- 时间复杂度：O(n log n)
- 空间复杂度：O(1)（常数级别）

**示例**：
```
输入: 4 → 2 → 1 → 3
输出: 1 → 2 → 3 → 4
```

O(n log n)的排序算法有三个候选：快速排序、归并排序、堆排序。哪个最适合链表呢？

## 排序算法分析

### 快速排序？不太合适

快速排序依赖随机访问来进行partition操作。虽然可以用于链表，但实现复杂，且最坏情况下性能退化。

### 堆排序？需要额外空间

堆排序需要建堆，链表建堆的空间复杂度是O(n)，不满足O(1)空间的要求。

### 归并排序？完美契合

归并排序天然适合链表：
- 不需要随机访问
- 只需要顺序遍历和指针操作
- 可以实现O(1)空间（自底向上版本）

## 思路：自顶向下的归并排序

先从较容易理解的递归版本开始：

1. **找中点**：用快慢指针找到链表中点
2. **断开**：把链表分成两半
3. **递归排序**：分别对两半排序
4. **合并**：合并两个有序链表

```
原链表: 4 → 2 → 1 → 3

分解:
    4 → 2 → 1 → 3
      /         \
   4 → 2       1 → 3
   /    \       /    \
  4      2     1      3

合并:
  4      2     1      3
   \    /       \    /
   2 → 4       1 → 3
      \         /
   1 → 2 → 3 → 4
```

## 自顶向下实现（递归）

```javascript
/**
 * @param {ListNode} head
 * @return {ListNode}
 */
function sortList(head) {
    // 基准情况：空链表或单节点
    if (!head || !head.next) {
        return head;
    }
    
    // 1. 找中点并断开
    const mid = getMid(head);
    const right = mid.next;
    mid.next = null;  // 断开链表
    
    // 2. 递归排序两半
    const leftSorted = sortList(head);
    const rightSorted = sortList(right);
    
    // 3. 合并两个有序链表
    return merge(leftSorted, rightSorted);
}

// 找中点（让slow停在中间偏左的位置）
function getMid(head) {
    let slow = head;
    let fast = head.next;  // 注意：fast从head.next开始
    
    while (fast && fast.next) {
        slow = slow.next;
        fast = fast.next.next;
    }
    
    return slow;
}

// 合并两个有序链表
function merge(l1, l2) {
    const dummy = new ListNode(0);
    let current = dummy;
    
    while (l1 && l2) {
        if (l1.val <= l2.val) {
            current.next = l1;
            l1 = l1.next;
        } else {
            current.next = l2;
            l2 = l2.next;
        }
        current = current.next;
    }
    
    current.next = l1 || l2;
    return dummy.next;
}
```

**为什么fast从head.next开始？**

这样设计是为了让slow停在中间偏左的位置，便于断开链表。

以4个节点为例：
- fast从head.next: `1 → 2 | 3 → 4`，mid=2，分成2+2
- fast从head: `1 → 2 → 3 | 4`，mid=3，分成3+1

前者更平衡。

## 执行过程图解

以`4 → 2 → 1 → 3`为例：

**第一层递归**：
```
输入: 4 → 2 → 1 → 3
找中点: slow停在2
断开: 4 → 2 | 1 → 3

递归调用:
  sortList(4 → 2)
  sortList(1 → 3)
```

**第二层递归（左半）**：
```
输入: 4 → 2
找中点: slow停在4
断开: 4 | 2

递归调用:
  sortList(4) → 返回4
  sortList(2) → 返回2

合并: merge(4, 2) → 2 → 4
```

**第二层递归（右半）**：
```
输入: 1 → 3
找中点: slow停在1
断开: 1 | 3

递归调用:
  sortList(1) → 返回1
  sortList(3) → 返回3

合并: merge(1, 3) → 1 → 3
```

**回到第一层**：
```
合并: merge(2 → 4, 1 → 3)

步骤:
  比较2和1，选1
  比较2和3，选2
  比较4和3，选3
  剩余4

结果: 1 → 2 → 3 → 4
```

## 自底向上实现（迭代，O(1)空间）

递归版本使用O(log n)的栈空间。要达到O(1)空间，需要用迭代方式：

```javascript
function sortList(head) {
    if (!head || !head.next) return head;
    
    // 计算链表长度
    let length = 0;
    let node = head;
    while (node) {
        length++;
        node = node.next;
    }
    
    const dummy = new ListNode(0);
    dummy.next = head;
    
    // 从步长1开始，逐步翻倍
    for (let step = 1; step < length; step *= 2) {
        let prev = dummy;
        let curr = dummy.next;
        
        while (curr) {
            // 取出第一段（长度为step）
            const left = curr;
            const right = split(left, step);
            // 取出第二段（长度为step）
            curr = split(right, step);
            
            // 合并两段，并连接到prev后面
            prev = merge(prev, left, right);
        }
    }
    
    return dummy.next;
}

// 分割出前n个节点，返回剩余部分的头
function split(head, n) {
    for (let i = 1; head && i < n; i++) {
        head = head.next;
    }
    if (!head) return null;
    
    const next = head.next;
    head.next = null;
    return next;
}

// 合并两个有序链表，连接到prev后面，返回新的prev
function merge(prev, l1, l2) {
    let curr = prev;
    
    while (l1 && l2) {
        if (l1.val <= l2.val) {
            curr.next = l1;
            l1 = l1.next;
        } else {
            curr.next = l2;
            l2 = l2.next;
        }
        curr = curr.next;
    }
    
    curr.next = l1 || l2;
    
    // 移动到链表末尾
    while (curr.next) {
        curr = curr.next;
    }
    
    return curr;
}
```

**自底向上的思路**：
```
步长1: 每个节点单独成组，两两合并
  [4] [2] [1] [3]
    ↘↙     ↘↙
  [2,4]   [1,3]

步长2: 每两个节点成组，两两合并
  [2,4] [1,3]
      ↘↙
  [1,2,3,4]

步长4: 已经大于等于长度，结束
```

## 复杂度对比

| 版本 | 时间复杂度 | 空间复杂度 |
|------|-----------|-----------|
| 自顶向下（递归） | O(n log n) | O(log n) |
| 自底向上（迭代） | O(n log n) | O(1) |

两种方法时间复杂度相同，但迭代版本空间更优。面试时，先写递归版本展示思路清晰，再讨论迭代版本体现进阶能力。

## 边界情况

| 输入 | 说明 | 结果 |
|------|------|------|
| `[]` | 空链表 | `[]` |
| `[1]` | 单节点 | `[1]` |
| `[2,1]` | 两节点逆序 | `[1,2]` |
| `[1,2,3]` | 已排序 | `[1,2,3]` |
| `[3,2,1]` | 完全逆序 | `[1,2,3]` |

## 为什么不用快速排序？

虽然快排可以用于链表，但有几个问题：

1. **分区困难**：数组快排通过索引交换元素，链表需要重新组织指针
2. **pivot选择**：无法随机选择pivot，可能导致最坏情况
3. **实现复杂**：链表快排代码比归并复杂得多

归并排序的优势：
- 天然适合链表
- 稳定排序
- 最坏情况仍是O(n log n)

## 小结

链表排序是归并排序的完美应用场景：

1. **分治思想**：找中点、断开、递归、合并
2. **快慢指针**：精准定位中点
3. **链表合并**：基础操作的熟练运用

关键技巧：
- fast从head.next开始，确保中点偏左
- 断开链表时设置`mid.next = null`
- 合并操作使用虚拟头节点

掌握链表排序，你就掌握了链表操作的综合应用。下一章是链表部分的收官之战——重排链表，我们将综合运用找中点、反转、合并三大技巧。
