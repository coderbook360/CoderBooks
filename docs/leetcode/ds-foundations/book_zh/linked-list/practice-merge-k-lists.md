# 实战：合并 K 个升序链表

这道题是"合并两个有序链表"的进阶版，是 LeetCode 的经典困难题。

## 题目描述

> **LeetCode 23. 合并 K 个升序链表**
>
> 给你一个链表数组，每个链表都已经按升序排列。请你将所有链表合并到一个升序链表中，返回合并后的链表。

**示例**：

```
输入：lists = [[1,4,5],[1,3,4],[2,6]]
输出：[1,1,2,3,4,4,5,6]
```

## 解法一：顺序合并

最直接的想法：依次把每个链表合并到结果中。

```javascript
function mergeKLists(lists) {
    if (lists.length === 0) return null;
    
    let result = lists[0];
    for (let i = 1; i < lists.length; i++) {
        result = mergeTwoLists(result, lists[i]);
    }
    return result;
}

function mergeTwoLists(l1, l2) {
    const dummy = new ListNode(0);
    let curr = dummy;
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
    return dummy.next;
}
```

### 复杂度分析

- **时间**：O(k²n)
  - 第 1 次合并：n + n = 2n
  - 第 2 次合并：2n + n = 3n
  - ...
  - 第 k-1 次合并：(k-1)n + n = kn
  - 总共：2n + 3n + ... + kn ≈ O(k²n)
- **空间**：O(1)

当 k 很大时，效率较低。

## 解法二：分治合并

核心思想：类似归并排序，两两合并。

```javascript
function mergeKLists(lists) {
    if (lists.length === 0) return null;
    return mergeRange(lists, 0, lists.length - 1);
}

function mergeRange(lists, left, right) {
    if (left === right) return lists[left];
    
    const mid = Math.floor((left + right) / 2);
    const l1 = mergeRange(lists, left, mid);
    const l2 = mergeRange(lists, mid + 1, right);
    return mergeTwoLists(l1, l2);
}
```

### 执行过程

```
lists = [l1, l2, l3, l4]

第 1 层：
  mergeRange(0, 3)
  mid = 1
  
第 2 层：
  mergeRange(0, 1)    mergeRange(2, 3)
  mid = 0             mid = 2
  
第 3 层：
  merge(l1, l2)       merge(l3, l4)
  
回溯：
  result1 = merge(l1, l2)
  result2 = merge(l3, l4)
  final = merge(result1, result2)
```

### 复杂度分析

- **时间**：O(kn × log k)
  - 每层合并总共处理 kn 个节点
  - 共 log k 层
- **空间**：O(log k)，递归调用栈

比顺序合并快很多！

## 解法三：优先队列（最小堆）

核心思想：用最小堆维护 k 个链表的当前头节点，每次取最小的。

```javascript
function mergeKLists(lists) {
    // 这里用简化的实现，实际应使用真正的堆
    const heap = [];
    
    // 初始化：将每个链表的头节点入堆
    for (let i = 0; i < lists.length; i++) {
        if (lists[i]) {
            heap.push(lists[i]);
        }
    }
    
    const dummy = new ListNode(0);
    let curr = dummy;
    
    while (heap.length > 0) {
        // 找最小节点（实际应用堆的 pop 操作）
        heap.sort((a, b) => a.val - b.val);
        const min = heap.shift();
        
        curr.next = min;
        curr = curr.next;
        
        if (min.next) {
            heap.push(min.next);
        }
    }
    
    return dummy.next;
}
```

**注意**：上面代码用 `sort` 模拟堆，实际应该用真正的堆结构。

### 使用真正的堆（概念代码）

```javascript
function mergeKLists(lists) {
    const heap = new MinHeap();
    
    for (const list of lists) {
        if (list) heap.push(list);
    }
    
    const dummy = new ListNode(0);
    let curr = dummy;
    
    while (!heap.isEmpty()) {
        const min = heap.pop();
        curr.next = min;
        curr = curr.next;
        
        if (min.next) {
            heap.push(min.next);
        }
    }
    
    return dummy.next;
}
```

### 复杂度分析

- **时间**：O(kn × log k)
  - 每个节点入堆出堆各一次
  - 堆操作 O(log k)
- **空间**：O(k)，堆中最多 k 个元素

## 三种解法对比

| 解法 | 时间 | 空间 | 特点 |
|-----|------|------|------|
| 顺序合并 | O(k²n) | O(1) | 简单但慢 |
| 分治合并 | O(kn log k) | O(log k) | 推荐 |
| 优先队列 | O(kn log k) | O(k) | 需要堆支持 |

## 本章小结

合并 K 个升序链表展示了三种不同的优化思路：

1. **顺序合并**：简单直接，但效率低
2. **分治合并**：类似归并排序，效率高
3. **优先队列**：用堆维护最小值，效率高

分治思想在很多问题中都有应用，是算法设计的重要技巧。
