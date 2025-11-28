# 堆的基础理论

当我们需要频繁地从一组数据中找出最大或最小的元素时，普通数组的效率会让我们感到沮丧——每次都要遍历整个数组。有没有一种数据结构，能让我们以接近 O(1) 的时间获取极值，同时插入和删除操作也足够高效？

堆（Heap）正是为解决这类问题而生的数据结构。它在算法面试中的地位举足轻重，是实现优先队列的核心基石。

## 什么是堆？

堆是一种特殊的**完全二叉树**，它满足一个简单而优雅的性质——**堆序性**：

- **最大堆（Max Heap）**：每个节点的值都**大于或等于**其子节点的值
- **最小堆（Min Heap）**：每个节点的值都**小于或等于**其子节点的值

让我用一个最小堆来直观展示：

```
        1           <- 根节点是最小值
       / \
      3   2
     / \ / \
    7  4 5  6
```

注意观察：根节点 1 小于它的子节点 3 和 2；节点 3 小于它的子节点 7 和 4；节点 2 小于它的子节点 5 和 6。这种层层递进的约束，确保了根节点永远是整个堆的最小值。

最大堆则恰好相反：

```
        9           <- 根节点是最大值
       / \
      7   8
     / \ / \
    5  6 3  4
```

## 为什么是完全二叉树？

堆必须是**完全二叉树**，这个要求看似苛刻，实则是一个精妙的设计：

**完全二叉树的定义**：除了最后一层外，每一层都被完全填满，且最后一层的节点都尽量靠左排列。

这个特性带来了一个巨大的优势——我们可以用**数组**来高效表示堆，而不需要任何指针！

```
完全二叉树：           数组表示：
        1             [1, 3, 2, 7, 4, 5, 6]
       / \             0  1  2  3  4  5  6
      3   2
     / \ / \
    7  4 5  6
```

数组索引与树节点的对应关系非常简洁：

```javascript
// 对于索引为 i 的节点
// 父节点索引：Math.floor((i - 1) / 2)
// 左子节点索引：2 * i + 1
// 右子节点索引：2 * i + 2
```

让我们验证一下：
- 节点 3（索引 1）的父节点：Math.floor((1-1)/2) = 0，对应节点 1 ✓
- 节点 1（索引 0）的左子节点：2*0+1 = 1，对应节点 3 ✓
- 节点 1（索引 0）的右子节点：2*0+2 = 2，对应节点 2 ✓

## 堆的核心操作

堆支持两个核心操作，它们的效率决定了堆的实用价值：

**获取堆顶元素**
堆顶（数组第一个元素）就是极值，直接返回即可。

```javascript
function peek(heap) {
    return heap[0];
}
// 时间复杂度：O(1)
```

**插入元素（上浮操作）**
新元素先放到数组末尾，然后不断与父节点比较，如果违反堆序性就交换，直到找到正确位置。

```javascript
function siftUp(heap, index) {
    while (index > 0) {
        const parentIndex = Math.floor((index - 1) / 2);
        // 最小堆：子节点应该 >= 父节点
        if (heap[index] >= heap[parentIndex]) {
            break;  // 已满足堆序性
        }
        // 交换
        [heap[index], heap[parentIndex]] = [heap[parentIndex], heap[index]];
        index = parentIndex;
    }
}
```

上浮过程最多经过树的高度层，时间复杂度为 **O(log n)**。

**删除堆顶（下沉操作）**
用数组最后一个元素替换堆顶，然后不断与较小（或较大）的子节点比较交换，直到恢复堆序性。

```javascript
function siftDown(heap, index) {
    const n = heap.length;
    
    while (true) {
        let smallest = index;
        const left = 2 * index + 1;
        const right = 2 * index + 2;
        
        // 找出当前节点、左子节点、右子节点中的最小值
        if (left < n && heap[left] < heap[smallest]) {
            smallest = left;
        }
        if (right < n && heap[right] < heap[smallest]) {
            smallest = right;
        }
        
        // 如果当前节点已经是最小的，停止
        if (smallest === index) {
            break;
        }
        
        // 交换并继续下沉
        [heap[index], heap[smallest]] = [heap[smallest], heap[index]];
        index = smallest;
    }
}
```

下沉过程同样最多经过树的高度层，时间复杂度为 **O(log n)**。

## 堆操作复杂度总结

| 操作 | 时间复杂度 | 说明 |
|------|-----------|------|
| 获取堆顶 | O(1) | 直接返回数组第一个元素 |
| 插入元素 | O(log n) | 上浮最多经过 log n 层 |
| 删除堆顶 | O(log n) | 下沉最多经过 log n 层 |
| 建堆 | O(n) | 从底向上建堆的优化算法 |

## 优先队列：堆的应用接口

在实际编程中，我们很少直接操作堆的内部结构，而是使用**优先队列（Priority Queue）**这个更高层的抽象。

优先队列与普通队列的区别在于：
- 普通队列：先进先出（FIFO）
- 优先队列：优先级最高的先出

堆是实现优先队列最常用的底层数据结构。JavaScript 没有内置优先队列，但我们可以自己实现：

```javascript
class MinPriorityQueue {
    constructor() {
        this.heap = [];
    }
    
    // 入队
    enqueue(val) {
        this.heap.push(val);
        this.siftUp(this.heap.length - 1);
    }
    
    // 出队（移除并返回最小元素）
    dequeue() {
        if (this.heap.length === 0) return null;
        const min = this.heap[0];
        const last = this.heap.pop();
        if (this.heap.length > 0) {
            this.heap[0] = last;
            this.siftDown(0);
        }
        return min;
    }
    
    // 查看队首元素
    front() {
        return this.heap[0];
    }
    
    // 队列大小
    size() {
        return this.heap.length;
    }
    
    isEmpty() {
        return this.heap.length === 0;
    }
    
    siftUp(index) {
        while (index > 0) {
            const parent = Math.floor((index - 1) / 2);
            if (this.heap[index] >= this.heap[parent]) break;
            [this.heap[index], this.heap[parent]] = [this.heap[parent], this.heap[index]];
            index = parent;
        }
    }
    
    siftDown(index) {
        const n = this.heap.length;
        while (true) {
            let smallest = index;
            const left = 2 * index + 1;
            const right = 2 * index + 2;
            
            if (left < n && this.heap[left] < this.heap[smallest]) smallest = left;
            if (right < n && this.heap[right] < this.heap[smallest]) smallest = right;
            
            if (smallest === index) break;
            [this.heap[index], this.heap[smallest]] = [this.heap[smallest], this.heap[index]];
            index = smallest;
        }
    }
}
```

## 堆的典型应用场景

理解堆的应用场景，能帮助我们在面试中快速识别"堆类问题"：

**Top K 问题**
找出数据中最大/最小的 K 个元素。维护一个大小为 K 的堆，时间复杂度 O(n log k)。

**流数据处理**
实时数据流中查找中位数、第 K 大元素等。堆能高效处理动态数据。

**多路归并**
合并多个有序序列，如合并 K 个有序链表。

**贪心算法**
许多贪心问题需要每次选择当前最优，优先队列是实现贪心的利器。

**定时任务调度**
操作系统用堆实现任务调度，总是执行优先级最高的任务。

## 小结

堆是一种基于完全二叉树的数据结构，通过维护堆序性，实现了 O(1) 时间获取极值、O(log n) 时间插入删除的优秀性能。

核心要点：
- 堆用数组存储完全二叉树，父子节点索引关系简洁
- 上浮（siftUp）用于插入后恢复堆序性
- 下沉（siftDown）用于删除堆顶后恢复堆序性
- 优先队列是堆的高层抽象，是算法中的常用工具

掌握了这些基础，下一章我们将深入堆的插入和删除操作的完整实现，并探索建堆的高效算法。
