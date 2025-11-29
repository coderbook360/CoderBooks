# 实战：最少需要的会议室数量

这道题展示了扫描线算法与贪心的结合。

## 问题描述

给你一个会议时间安排的数组`intervals`，每个会议时间`[start, end]`表示会议从`start`开始到`end`结束。

返回所需会议室的**最少数量**。

## 思路分析

### 问题本质

同时进行的会议数量的最大值，就是需要的会议室数量。

### 方法1：扫描线

把时间点分成"开始"和"结束"两类事件：
- 会议开始：需要+1个会议室
- 会议结束：释放1个会议室

按时间排序所有事件，遍历时追踪当前需要的会议室数量。

### 方法2：贪心+优先队列

按开始时间排序会议，用最小堆维护当前所有会议的结束时间。

每来一个新会议，检查堆顶（最早结束的会议）是否已结束，如果结束就复用那个会议室。

## 方法1：扫描线实现

```javascript
function minMeetingRooms(intervals) {
    const events = [];
    
    for (const [start, end] of intervals) {
        events.push([start, 1]);   // 开始：+1
        events.push([end, -1]);    // 结束：-1
    }
    
    // 按时间排序，同一时间结束优先（先释放再占用）
    events.sort((a, b) => {
        if (a[0] !== b[0]) return a[0] - b[0];
        return a[1] - b[1];
    });
    
    let rooms = 0;
    let maxRooms = 0;
    
    for (const [time, delta] of events) {
        rooms += delta;
        maxRooms = Math.max(maxRooms, rooms);
    }
    
    return maxRooms;
}
```

## 方法2：优先队列实现

```javascript
function minMeetingRooms(intervals) {
    if (intervals.length === 0) return 0;
    
    // 按开始时间排序
    intervals.sort((a, b) => a[0] - b[0]);
    
    // 最小堆：存储会议的结束时间
    const heap = new MinHeap();
    heap.push(intervals[0][1]);
    
    for (let i = 1; i < intervals.length; i++) {
        const [start, end] = intervals[i];
        
        // 最早结束的会议已经结束，可以复用会议室
        if (heap.peek() <= start) {
            heap.pop();
        }
        
        // 新会议占用一个会议室
        heap.push(end);
    }
    
    return heap.size();
}

// 简单的最小堆实现
class MinHeap {
    constructor() {
        this.data = [];
    }
    
    push(val) {
        this.data.push(val);
        this._bubbleUp(this.data.length - 1);
    }
    
    pop() {
        const min = this.data[0];
        const last = this.data.pop();
        if (this.data.length > 0) {
            this.data[0] = last;
            this._bubbleDown(0);
        }
        return min;
    }
    
    peek() {
        return this.data[0];
    }
    
    size() {
        return this.data.length;
    }
    
    _bubbleUp(i) {
        while (i > 0) {
            const parent = Math.floor((i - 1) / 2);
            if (this.data[parent] <= this.data[i]) break;
            [this.data[parent], this.data[i]] = [this.data[i], this.data[parent]];
            i = parent;
        }
    }
    
    _bubbleDown(i) {
        const n = this.data.length;
        while (true) {
            let smallest = i;
            const left = 2 * i + 1;
            const right = 2 * i + 2;
            if (left < n && this.data[left] < this.data[smallest]) smallest = left;
            if (right < n && this.data[right] < this.data[smallest]) smallest = right;
            if (smallest === i) break;
            [this.data[smallest], this.data[i]] = [this.data[i], this.data[smallest]];
            i = smallest;
        }
    }
}
```

## 图解

```
intervals = [[0, 30], [5, 10], [15, 20]]

扫描线方法:
事件: [[0,+1], [5,+1], [10,-1], [15,+1], [20,-1], [30,-1]]
排序后: [[0,+1], [5,+1], [10,-1], [15,+1], [20,-1], [30,-1]]

遍历:
时间0: rooms=1, maxRooms=1
时间5: rooms=2, maxRooms=2
时间10: rooms=1
时间15: rooms=2, maxRooms=2
时间20: rooms=1
时间30: rooms=0

结果: 2

优先队列方法:
排序后: [[0,30], [5,10], [15,20]]

[0,30]: heap=[30], size=1
[5,10]: 30 > 5, 不能复用, heap=[10,30], size=2
[15,20]: 10 <= 15, 复用! pop 10, push 20, heap=[20,30], size=2

结果: 2
```

## 两种方法的对比

| 方法 | 时间复杂度 | 空间复杂度 | 特点 |
|-----|-----------|-----------|------|
| 扫描线 | O(n log n) | O(n) | 直观，事件驱动 |
| 优先队列 | O(n log n) | O(n) | 模拟实际分配 |

两者效率相当，扫描线更直观，优先队列更接近实际场景。

## 复杂度分析

**时间复杂度**：O(n log n)
- 排序O(n log n)
- 遍历O(n)（扫描线）或O(n log n)（堆操作）

**空间复杂度**：O(n)

## 小结

会议室问题展示了两种经典方法：
1. **扫描线**：把问题转化为"事件"，统计峰值
2. **优先队列贪心**：模拟会议室分配，贪心复用

两种方法各有适用场景，扫描线更通用，优先队列更直观。
