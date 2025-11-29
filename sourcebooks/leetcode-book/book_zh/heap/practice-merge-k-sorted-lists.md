# 实战：合并K个升序链表

## 题目描述

**LeetCode 23**：给你一个链表数组，每个链表都已经按升序排列。请你将所有链表合并到一个升序链表中，返回合并后的链表。

**示例**：

```
输入: lists = [[1,4,5],[1,3,4],[2,6]]
输出: [1,1,2,3,4,4,5,6]

输入: lists = []
输出: []

输入: lists = [[]]
输出: []
```

## 思路分析

这是一道经典的多路归并问题，也是堆的典型应用场景。

### 暴力思路

把所有节点收集起来，排序，再构建链表。时间复杂度 O(N log N)，N 是总节点数。

### 两两合并

复用"合并两个有序链表"的代码，两两合并。但这种方法会重复遍历已经合并的部分，效率不高。

### 堆的思路（推荐）

核心洞察：**每次我们需要在 K 个链表的当前头节点中，找出最小的那个**。

这正是优先队列（最小堆）的拿手好戏：
1. 把 K 个链表的头节点全部加入最小堆
2. 每次从堆中取出最小节点，接到结果链表后面
3. 如果该节点还有 next，把 next 加入堆
4. 重复直到堆为空

```
lists = [[1,4,5], [1,3,4], [2,6]]

初始堆：[1, 1, 2]（三个链表的头节点值）

取出 1 -> 结果链表: 1
把 4 加入堆 -> 堆: [1, 2, 4]

取出 1 -> 结果链表: 1->1
把 3 加入堆 -> 堆: [2, 3, 4]

取出 2 -> 结果链表: 1->1->2
把 6 加入堆 -> 堆: [3, 4, 6]

...依此类推
```

## 代码实现

```javascript
function mergeKLists(lists) {
    if (!lists || lists.length === 0) return null;
    
    // 最小堆，按节点值排序
    const minHeap = new MinHeapByVal();
    
    // 把所有链表的头节点加入堆
    for (const head of lists) {
        if (head) {
            minHeap.push(head);
        }
    }
    
    // 虚拟头节点简化操作
    const dummy = new ListNode(0);
    let current = dummy;
    
    while (minHeap.size() > 0) {
        // 取出最小节点
        const node = minHeap.pop();
        current.next = node;
        current = current.next;
        
        // 如果该链表还有节点，加入堆
        if (node.next) {
            minHeap.push(node.next);
        }
    }
    
    return dummy.next;
}

// 按节点值排序的最小堆
class MinHeapByVal {
    constructor() {
        this.heap = [];
    }
    
    push(node) {
        this.heap.push(node);
        this.siftUp(this.heap.length - 1);
    }
    
    pop() {
        if (this.heap.length === 0) return null;
        const top = this.heap[0];
        const last = this.heap.pop();
        if (this.heap.length > 0) {
            this.heap[0] = last;
            this.siftDown(0);
        }
        return top;
    }
    
    size() {
        return this.heap.length;
    }
    
    siftUp(i) {
        while (i > 0) {
            const parent = Math.floor((i - 1) / 2);
            if (this.heap[i].val >= this.heap[parent].val) break;
            [this.heap[i], this.heap[parent]] = [this.heap[parent], this.heap[i]];
            i = parent;
        }
    }
    
    siftDown(i) {
        const n = this.heap.length;
        while (true) {
            let smallest = i;
            const left = 2 * i + 1;
            const right = 2 * i + 2;
            
            if (left < n && this.heap[left].val < this.heap[smallest].val) {
                smallest = left;
            }
            if (right < n && this.heap[right].val < this.heap[smallest].val) {
                smallest = right;
            }
            
            if (smallest === i) break;
            [this.heap[i], this.heap[smallest]] = [this.heap[smallest], this.heap[i]];
            i = smallest;
        }
    }
}

// 链表节点定义
class ListNode {
    constructor(val = 0, next = null) {
        this.val = val;
        this.next = next;
    }
}
```

## 使用通用堆的简洁写法

```javascript
function mergeKLists(lists) {
    if (!lists || lists.length === 0) return null;
    
    const minHeap = new HeapWithComparator((a, b) => a.val - b.val);
    
    for (const head of lists) {
        if (head) minHeap.push(head);
    }
    
    const dummy = new ListNode(0);
    let current = dummy;
    
    while (minHeap.size() > 0) {
        const node = minHeap.pop();
        current.next = node;
        current = current.next;
        
        if (node.next) {
            minHeap.push(node.next);
        }
    }
    
    return dummy.next;
}
```

## 执行过程详解

以 `lists = [[1,4,5], [1,3,4], [2,6]]` 为例：

```
初始状态：
链表0: 1 -> 4 -> 5
链表1: 1 -> 3 -> 4
链表2: 2 -> 6

Step 1: 初始化堆，加入各链表头节点
堆 = [节点1(链表0), 节点1(链表1), 节点2(链表2)]
按值排序后堆顶是 节点1

Step 2: 取出节点1(链表0)，结果: 1
把节点4加入堆
堆 = [节点1(链表1), 节点2, 节点4]

Step 3: 取出节点1(链表1)，结果: 1->1
把节点3加入堆
堆 = [节点2, 节点3, 节点4]

Step 4: 取出节点2，结果: 1->1->2
把节点6加入堆
堆 = [节点3, 节点4, 节点6]

Step 5: 取出节点3，结果: 1->1->2->3
把节点4(链表1)加入堆
堆 = [节点4, 节点4, 节点6]

Step 6: 取出节点4，结果: 1->1->2->3->4
把节点5加入堆
堆 = [节点4, 节点5, 节点6]

Step 7: 取出节点4，结果: 1->1->2->3->4->4
链表1遍历完毕，不加入新节点
堆 = [节点5, 节点6]

Step 8: 取出节点5，结果: 1->1->2->3->4->4->5
链表0遍历完毕
堆 = [节点6]

Step 9: 取出节点6，结果: 1->1->2->3->4->4->5->6
堆为空，结束

最终结果: 1->1->2->3->4->4->5->6
```

## 分治解法

另一种优雅的解法是分治：

```javascript
function mergeKLists(lists) {
    if (!lists || lists.length === 0) return null;
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

## 复杂度分析

设 K 是链表数量，N 是所有节点总数。

**堆解法**：
- 时间复杂度：O(N log K)
  - 每个节点入堆出堆各一次
  - 堆大小最多为 K，每次操作 O(log K)
- 空间复杂度：O(K)
  - 堆最多存储 K 个节点

**分治解法**：
- 时间复杂度：O(N log K)
  - 分治树高度 log K
  - 每层处理所有 N 个节点
- 空间复杂度：O(log K)
  - 递归栈深度

## 实际应用

多路归并是非常实用的技术：

**外部排序**：大文件排序时，分成多个小文件分别排序，然后多路归并。

**分布式系统**：MapReduce 的 Reduce 阶段就是多路归并。

**数据库**：多个有序索引的合并查询。

**日志聚合**：合并多个服务器的有序日志。

## 小结

这道题展示了堆在多路归并中的威力：

**核心模式**：
- 维护 K 个候选元素的最小堆
- 每次取出最小的
- 补充该来源的下一个候选

这个模式可以推广到：
- 合并 K 个有序数组
- 查找 K 个有序列表的第 M 小元素
- 任何需要从多个有序源中选取最优的场景
