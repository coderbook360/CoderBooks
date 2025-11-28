# 实战：数据流的中位数

## 题目描述

**LeetCode 295**：中位数是有序整数列表中的中间值。如果列表的大小是偶数，则没有中间值，中位数是两个中间值的平均值。

设计一个支持以下两种操作的数据结构：
- `addNum(int num)` - 从数据流中添加一个整数到数据结构中
- `findMedian()` - 返回目前所有元素的中位数

**示例**：

```
addNum(1)
addNum(2)
findMedian() -> 1.5
addNum(3) 
findMedian() -> 2
```

## 思路分析

这道题的难点在于**数据是流式的**，不断有新元素加入，每次都要能快速求中位数。

### 暴力思路

每次 addNum 后排序，findMedian 时取中间值。
- addNum：O(n log n) 排序
- findMedian：O(1)

太慢了，不可接受。

### 插入排序思路

维护有序数组，用二分查找找到插入位置。
- addNum：O(n) 插入
- findMedian：O(1)

还是不够快。

### 双堆思路（推荐）

这是一个非常精妙的设计：**用两个堆把数据分成两半**。

核心思想：
- **最大堆**存储**较小的一半**元素
- **最小堆**存储**较大的一半**元素
- 中位数就在两个堆顶之间

```
数据: [1, 2, 3, 4, 5]

最大堆（较小的一半）: [2, 1]  堆顶 = 2
最小堆（较大的一半）: [3, 4, 5]  堆顶 = 3

中位数 = 3（奇数个时取较大堆堆顶）
```

为什么这样设计？
- 最大堆让我们 O(1) 得到较小一半的最大值
- 最小堆让我们 O(1) 得到较大一半的最小值
- 这两个值就是"中间"的两个数

### 维护两个堆的平衡

关键是保持两个堆的大小平衡：
- 允许最大堆比最小堆多一个元素（奇数个时中位数在最大堆）
- 或者两个堆大小相等

添加元素的策略：
1. 先加入最大堆
2. 把最大堆堆顶移到最小堆（保证分界正确）
3. 如果最小堆更大，把最小堆堆顶移回最大堆（保持平衡）

## 代码实现

```javascript
class MedianFinder {
    constructor() {
        // 最大堆：存储较小的一半
        this.maxHeap = new MaxHeap();
        // 最小堆：存储较大的一半
        this.minHeap = new MinHeap();
    }
    
    addNum(num) {
        // 1. 先加入最大堆
        this.maxHeap.push(num);
        
        // 2. 把最大堆堆顶移到最小堆
        // 这确保了最大堆的所有元素 <= 最小堆的所有元素
        this.minHeap.push(this.maxHeap.pop());
        
        // 3. 平衡：保持最大堆大小 >= 最小堆大小
        if (this.minHeap.size() > this.maxHeap.size()) {
            this.maxHeap.push(this.minHeap.pop());
        }
    }
    
    findMedian() {
        if (this.maxHeap.size() > this.minHeap.size()) {
            // 奇数个元素，中位数在最大堆堆顶
            return this.maxHeap.peek();
        }
        // 偶数个元素，中位数是两个堆顶的平均值
        return (this.maxHeap.peek() + this.minHeap.peek()) / 2;
    }
}
```

## 完整代码（含堆实现）

```javascript
class MinHeap {
    constructor() {
        this.heap = [];
    }
    
    push(val) {
        this.heap.push(val);
        this.siftUp(this.heap.length - 1);
    }
    
    pop() {
        if (this.heap.length === 0) return undefined;
        const top = this.heap[0];
        const last = this.heap.pop();
        if (this.heap.length > 0) {
            this.heap[0] = last;
            this.siftDown(0);
        }
        return top;
    }
    
    peek() {
        return this.heap[0];
    }
    
    size() {
        return this.heap.length;
    }
    
    siftUp(i) {
        while (i > 0) {
            const parent = Math.floor((i - 1) / 2);
            if (this.heap[i] >= this.heap[parent]) break;
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
            if (left < n && this.heap[left] < this.heap[smallest]) smallest = left;
            if (right < n && this.heap[right] < this.heap[smallest]) smallest = right;
            if (smallest === i) break;
            [this.heap[i], this.heap[smallest]] = [this.heap[smallest], this.heap[i]];
            i = smallest;
        }
    }
}

class MaxHeap {
    constructor() {
        this.heap = [];
    }
    
    push(val) {
        this.heap.push(val);
        this.siftUp(this.heap.length - 1);
    }
    
    pop() {
        if (this.heap.length === 0) return undefined;
        const top = this.heap[0];
        const last = this.heap.pop();
        if (this.heap.length > 0) {
            this.heap[0] = last;
            this.siftDown(0);
        }
        return top;
    }
    
    peek() {
        return this.heap[0];
    }
    
    size() {
        return this.heap.length;
    }
    
    siftUp(i) {
        while (i > 0) {
            const parent = Math.floor((i - 1) / 2);
            if (this.heap[i] <= this.heap[parent]) break;  // 最大堆：子 <= 父
            [this.heap[i], this.heap[parent]] = [this.heap[parent], this.heap[i]];
            i = parent;
        }
    }
    
    siftDown(i) {
        const n = this.heap.length;
        while (true) {
            let largest = i;
            const left = 2 * i + 1;
            const right = 2 * i + 2;
            if (left < n && this.heap[left] > this.heap[largest]) largest = left;
            if (right < n && this.heap[right] > this.heap[largest]) largest = right;
            if (largest === i) break;
            [this.heap[i], this.heap[largest]] = [this.heap[largest], this.heap[i]];
            i = largest;
        }
    }
}

class MedianFinder {
    constructor() {
        this.maxHeap = new MaxHeap();  // 较小的一半
        this.minHeap = new MinHeap();  // 较大的一半
    }
    
    addNum(num) {
        this.maxHeap.push(num);
        this.minHeap.push(this.maxHeap.pop());
        
        if (this.minHeap.size() > this.maxHeap.size()) {
            this.maxHeap.push(this.minHeap.pop());
        }
    }
    
    findMedian() {
        if (this.maxHeap.size() > this.minHeap.size()) {
            return this.maxHeap.peek();
        }
        return (this.maxHeap.peek() + this.minHeap.peek()) / 2;
    }
}
```

## 执行过程详解

```
操作: addNum(1)
  maxHeap.push(1) -> maxHeap = [1]
  minHeap.push(maxHeap.pop()) -> maxHeap = [], minHeap = [1]
  minHeap.size() > maxHeap.size()，平衡
  maxHeap.push(minHeap.pop()) -> maxHeap = [1], minHeap = []
  
状态：maxHeap = [1], minHeap = []

操作: addNum(2)
  maxHeap.push(2) -> maxHeap = [2,1]
  minHeap.push(maxHeap.pop()) -> maxHeap = [1], minHeap = [2]
  两堆大小相等，不需要平衡
  
状态：maxHeap = [1], minHeap = [2]

操作: findMedian()
  两堆大小相等，返回 (1 + 2) / 2 = 1.5

操作: addNum(3)
  maxHeap.push(3) -> maxHeap = [3,1]
  minHeap.push(maxHeap.pop()) -> maxHeap = [1], minHeap = [2,3]
  minHeap.size() > maxHeap.size()，平衡
  maxHeap.push(minHeap.pop()) -> maxHeap = [2,1], minHeap = [3]
  
状态：maxHeap = [2,1], minHeap = [3]

操作: findMedian()
  maxHeap.size() > minHeap.size()，返回 2
```

## 复杂度分析

- **addNum**：O(log n)
  - 三次堆操作，每次 O(log n)
  
- **findMedian**：O(1)
  - 只需要访问堆顶

- **空间复杂度**：O(n)
  - 存储所有元素

## 为什么这个设计如此巧妙？

传统方法要么查询快（有序数组），要么插入快（无序数组），但不能兼得。

双堆设计的精妙之处：
1. **分而治之**：不维护完全有序，只维护"分成两半"
2. **堆的特性**：快速获取极值，这正是求中位数所需
3. **动态平衡**：保持两半大小接近，中位数始终在堆顶

## 变体问题

**滑动窗口中位数**（LeetCode 480）：
需要支持删除操作，可以用两个堆 + 延迟删除技巧。

**数据流中的第 K 大元素**（LeetCode 703）：
只需要一个大小为 K 的最小堆。

## 小结

这道题展示了双堆技巧：

**核心模式**：
- 用两个堆将数据分成两部分
- 最大堆存较小的一半，最小堆存较大的一半
- 中位数在两个堆顶之间

**适用场景**：
- 数据流中位数
- 动态维护"中间值"相关的统计量
- 需要高效访问数据集中间部分的问题
