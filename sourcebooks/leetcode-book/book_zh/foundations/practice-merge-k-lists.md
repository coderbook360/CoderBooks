# 实战：合并K个升序链表（链表版）

合并两个有序链表我们已经很熟悉了。现在把难度升级：如果有K个有序链表呢？这是大厂面试的高频题目，也是检验你对数据结构和算法综合运用能力的绝佳题目。

## 问题描述

给你一个链表数组，每个链表都已经按升序排列。请你将所有链表合并到一个升序链表中，返回合并后的链表。

**示例**：
```
输入: lists = [[1,4,5],[1,3,4],[2,6]]
输出: [1,1,2,3,4,4,5,6]

图示:
链表1: 1 → 4 → 5
链表2: 1 → 3 → 4
链表3: 2 → 6

合并后: 1 → 1 → 2 → 3 → 4 → 4 → 5 → 6
```

**约束**：
- `k == lists.length`
- `0 <= k <= 10^4`
- `0 <= lists[i].length <= 500`
- `-10^4 <= lists[i][j] <= 10^4`

## 思路分析

### 方法一：逐一合并（朴素解法）

最直观的想法：把K个链表逐一合并。先合并前两个，再用结果和第三个合并，依此类推。

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

**复杂度分析**：
- 假设每个链表平均长度为n，共k个链表
- 第1次合并：n + n = 2n
- 第2次合并：2n + n = 3n
- ...
- 第k-1次合并：(k-1)n + n = kn
- 总计：2n + 3n + ... + kn = O(k²n)

时间复杂度O(k²n)，当k很大时效率较低。

### 方法二：分治合并

借鉴归并排序的思想：将K个链表两两配对合并，不断重复直到只剩一个链表。

```
第一轮: 
  list1 + list2 → merged1
  list3 + list4 → merged2
  list5 + list6 → merged3
  ...

第二轮:
  merged1 + merged2 → result1
  merged3 + merged4 → result2
  ...

重复直到只剩一个
```

这样每个节点只参与log(k)次合并，总复杂度O(kn·log k)。

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

function mergeTwoLists(l1, l2) {
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

### 方法三：最小堆（优先队列）

更优雅的方法：维护一个大小为K的最小堆，存储每个链表的当前头节点。每次取出最小值，加入结果链表，然后把该节点的下一个节点入堆。

```
初始堆: [1, 1, 2] (三个链表的头节点)

取出1(链表1), 加入4:
堆: [1, 2, 4]
结果: 1

取出1(链表2), 加入3:
堆: [2, 3, 4]
结果: 1 → 1

取出2(链表3), 加入6:
堆: [3, 4, 6]
结果: 1 → 1 → 2

...以此类推
```

## 最小堆解法实现

JavaScript没有内置的优先队列，我们可以用数组模拟（或使用第三方库）：

```javascript
/**
 * @param {ListNode[]} lists
 * @return {ListNode}
 */
function mergeKLists(lists) {
    // 过滤空链表
    const heap = lists.filter(list => list !== null);
    
    if (heap.length === 0) return null;
    
    // 建立最小堆
    buildMinHeap(heap);
    
    const dummy = new ListNode(0);
    let current = dummy;
    
    while (heap.length > 0) {
        // 取出最小节点
        const minNode = extractMin(heap);
        current.next = minNode;
        current = current.next;
        
        // 如果该链表还有下一个节点，加入堆
        if (minNode.next) {
            insert(heap, minNode.next);
        }
    }
    
    return dummy.next;
}

// 堆操作函数
function buildMinHeap(heap) {
    for (let i = Math.floor(heap.length / 2) - 1; i >= 0; i--) {
        heapifyDown(heap, i);
    }
}

function insert(heap, node) {
    heap.push(node);
    heapifyUp(heap, heap.length - 1);
}

function extractMin(heap) {
    const min = heap[0];
    const last = heap.pop();
    if (heap.length > 0) {
        heap[0] = last;
        heapifyDown(heap, 0);
    }
    return min;
}

function heapifyUp(heap, index) {
    while (index > 0) {
        const parent = Math.floor((index - 1) / 2);
        if (heap[parent].val <= heap[index].val) break;
        [heap[parent], heap[index]] = [heap[index], heap[parent]];
        index = parent;
    }
}

function heapifyDown(heap, index) {
    const length = heap.length;
    while (true) {
        let smallest = index;
        const left = 2 * index + 1;
        const right = 2 * index + 2;
        
        if (left < length && heap[left].val < heap[smallest].val) {
            smallest = left;
        }
        if (right < length && heap[right].val < heap[smallest].val) {
            smallest = right;
        }
        if (smallest === index) break;
        
        [heap[index], heap[smallest]] = [heap[smallest], heap[index]];
        index = smallest;
    }
}
```

## 分治解法详解

分治法更容易理解，这里详细图解：

**输入**：3个链表
```
list[0]: 1 → 4 → 5
list[1]: 1 → 3 → 4
list[2]: 2 → 6
```

**分治过程**：
```
mergeRange(lists, 0, 2)
├── mergeRange(lists, 0, 1)  // 处理list[0]和list[1]
│   ├── mergeRange(lists, 0, 0) → list[0]: 1→4→5
│   ├── mergeRange(lists, 1, 1) → list[1]: 1→3→4
│   └── merge(1→4→5, 1→3→4) → 1→1→3→4→4→5
│
├── mergeRange(lists, 2, 2) → list[2]: 2→6
│
└── merge(1→1→3→4→4→5, 2→6) → 1→1→2→3→4→4→5→6
```

## 完整的分治解法

```javascript
/**
 * @param {ListNode[]} lists
 * @return {ListNode}
 */
function mergeKLists(lists) {
    if (lists.length === 0) return null;
    return mergeRange(lists, 0, lists.length - 1);
}

function mergeRange(lists, left, right) {
    // 只有一个链表，直接返回
    if (left === right) {
        return lists[left];
    }
    
    // 分成两半
    const mid = Math.floor((left + right) / 2);
    
    // 递归合并左半部分
    const l1 = mergeRange(lists, left, mid);
    // 递归合并右半部分
    const l2 = mergeRange(lists, mid + 1, right);
    
    // 合并两个结果
    return mergeTwoLists(l1, l2);
}

function mergeTwoLists(l1, l2) {
    // 使用虚拟头节点简化操作
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
    
    // 连接剩余部分
    current.next = l1 || l2;
    
    return dummy.next;
}
```

## 三种方法对比

| 方法 | 时间复杂度 | 空间复杂度 | 适用场景 |
|------|-----------|-----------|---------|
| 逐一合并 | O(k²n) | O(1) | k较小时简单直接 |
| 分治合并 | O(kn·log k) | O(log k)递归栈 | 推荐，好写好理解 |
| 最小堆 | O(kn·log k) | O(k) | 适合流式处理 |

其中n是所有链表的总节点数除以k（平均长度）。

## 边界情况

| 输入 | 说明 | 处理 |
|------|------|------|
| `[]` | 空数组 | 返回null |
| `[[]]` | 包含一个空链表 | 返回null |
| `[[1]]` | 只有一个链表 | 直接返回 |
| `[[],[1]]` | 包含空链表 | 过滤后正常处理 |

## 复杂度分析（分治法）

**时间复杂度：O(kn·log k)**
- 分治树的高度是log k
- 每层需要处理所有kn个节点
- 总计：kn × log k

**空间复杂度：O(log k)**
- 递归栈的深度是log k
- 每次递归只用常数空间

## 面试技巧

1. **从简单开始**：先说逐一合并的思路，再优化
2. **分析复杂度**：解释为什么逐一合并是O(k²n)
3. **提出优化**：分治或最小堆，解释复杂度降低的原因
4. **代码选择**：面试时推荐分治法，代码更简洁

## 小结

合并K个升序链表是一道综合性很强的题目，涉及：

1. **分治思想**：将大问题分解为小问题
2. **递归技巧**：优雅地实现分治
3. **堆的应用**：用优先队列维护候选最小值
4. **复杂度分析**：理解不同方法的时间效率

掌握这道题，你不仅学会了合并链表的高级技巧，更理解了如何通过分治和数据结构优化算法效率。

下一章，我们来解决另一道经典的链表数值问题——用链表表示两个数并求和。
