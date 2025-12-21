# 实战：会议室 II

> LeetCode 253. 会议室 II | 难度：中等

最少资源分配问题，理解"峰值并发"的概念。

📎 [LeetCode 253. 会议室 II](https://leetcode.cn/problems/meeting-rooms-ii/)

---

## 题目描述

给定一个会议时间安排的数组 `intervals`，每个会议时间都包含开始和结束时间 `[start, end)`。

求需要的**最少会议室数量**。

**示例1**：
```
输入：intervals = [[0,30],[5,10],[15,20]]
输出：2
解释：
会议室1: [0,30]
会议室2: [5,10], [15,20]
```

**示例2**：
```
输入：intervals = [[7,10],[2,4]]
输出：1
解释：两个会议不重叠，一个房间就够
```

---

## 问题分析

### 问题本质

找到任意时刻**同时进行的会议最大数量**。

这个最大数量就是需要的最少会议室数。

### 两种思路

1. **模拟分配**：按开始时间处理，优先使用已空闲的房间
2. **扫描线**：统计每个时刻的并发会议数

---

## 方法一：排序 + 最小堆

### 思路

- 按开始时间排序会议
- 用最小堆记录每个房间的**结束时间**
- 如果新会议开始时，最早结束的房间已空闲，复用它
- 否则开新房间

### 代码实现

```typescript
function minMeetingRooms(intervals: number[][]): number {
  if (intervals.length === 0) return 0;
  
  // 按开始时间排序
  intervals.sort((a, b) => a[0] - b[0]);
  
  // 最小堆存储每个房间的结束时间
  const endTimes: number[] = [];
  
  for (const [start, end] of intervals) {
    // 如果最早结束的房间已空闲（结束时间 <= 当前开始时间）
    if (endTimes.length > 0 && endTimes[0] <= start) {
      // 移除最早结束时间（房间复用）
      heapPop(endTimes);
    }
    // 添加当前会议的结束时间（分配房间）
    heapPush(endTimes, end);
  }
  
  // 堆的大小就是需要的房间数
  return endTimes.length;
}

// 最小堆操作
function heapPush(heap: number[], val: number): void {
  heap.push(val);
  let i = heap.length - 1;
  while (i > 0) {
    const parent = Math.floor((i - 1) / 2);
    if (heap[parent] <= heap[i]) break;
    [heap[parent], heap[i]] = [heap[i], heap[parent]];
    i = parent;
  }
}

function heapPop(heap: number[]): number {
  const val = heap[0];
  const last = heap.pop()!;
  if (heap.length > 0) {
    heap[0] = last;
    let i = 0;
    while (true) {
      const left = 2 * i + 1;
      const right = 2 * i + 2;
      let smallest = i;
      if (left < heap.length && heap[left] < heap[smallest]) {
        smallest = left;
      }
      if (right < heap.length && heap[right] < heap[smallest]) {
        smallest = right;
      }
      if (smallest === i) break;
      [heap[i], heap[smallest]] = [heap[smallest], heap[i]];
      i = smallest;
    }
  }
  return val;
}
```

### 执行过程

```
输入: [[0,30],[5,10],[15,20]]
排序后: [[0,30],[5,10],[15,20]]

处理 [0,30]:
  heap 为空，直接添加
  heap = [30]

处理 [5,10]:
  heap[0]=30 > start=5，房间未空闲
  需要新房间，添加结束时间
  heap = [10, 30]（最小堆，10在顶）

处理 [15,20]:
  heap[0]=10 <= start=15，房间已空闲
  复用：弹出10，添加20
  heap = [20, 30]

最终：heap 大小 = 2
答案：需要 2 个房间
```

---

## 方法二：扫描线

### 思路

把每个会议拆分成两个事件：
- 开始事件：+1（需要一个房间）
- 结束事件：-1（释放一个房间）

扫描所有事件，记录同时进行的最大会议数。

### 代码实现

```typescript
function minMeetingRooms(intervals: number[][]): number {
  const events: [number, number][] = [];
  
  for (const [start, end] of intervals) {
    events.push([start, 1]);   // 会议开始 +1
    events.push([end, -1]);    // 会议结束 -1
  }
  
  // 按时间排序，同时刻先处理结束（释放房间）
  events.sort((a, b) => {
    if (a[0] !== b[0]) return a[0] - b[0];
    return a[1] - b[1];  // -1 在 +1 前面
  });
  
  let rooms = 0;
  let maxRooms = 0;
  
  for (const [_, delta] of events) {
    rooms += delta;
    maxRooms = Math.max(maxRooms, rooms);
  }
  
  return maxRooms;
}
```

### 执行过程

```
输入: [[0,30],[5,10],[15,20]]

事件列表:
[0, +1], [30, -1], [5, +1], [10, -1], [15, +1], [20, -1]

排序后:
[0, +1], [5, +1], [10, -1], [15, +1], [20, -1], [30, -1]

扫描:
时间0: rooms = 0+1 = 1, maxRooms = 1
时间5: rooms = 1+1 = 2, maxRooms = 2  ← 峰值
时间10: rooms = 2-1 = 1
时间15: rooms = 1+1 = 2, maxRooms = 2
时间20: rooms = 2-1 = 1
时间30: rooms = 1-1 = 0

答案: 2
```

### 关键细节

**为什么同时刻先处理结束？**

因为题目定义是 `[start, end)`，即左闭右开。

```
会议1: [0, 10)
会议2: [10, 20)

时刻10时，会议1已结束，会议2刚开始
它们可以共用一个房间

如果先处理 +1 再处理 -1:
  时间10: rooms = 1+1 = 2, 然后 2-1 = 1
  maxRooms 会误记为 2

正确顺序：先 -1 再 +1:
  时间10: rooms = 1-1 = 0, 然后 0+1 = 1
  maxRooms 保持正确
```

---

## 方法三：双指针（最简洁）

### 思路

分别对开始时间和结束时间排序，用双指针扫描。

```typescript
function minMeetingRooms(intervals: number[][]): number {
  const starts = intervals.map(i => i[0]).sort((a, b) => a - b);
  const ends = intervals.map(i => i[1]).sort((a, b) => a - b);
  
  let rooms = 0;
  let endPtr = 0;
  
  for (const start of starts) {
    if (start >= ends[endPtr]) {
      // 有房间空闲，复用
      endPtr++;
    } else {
      // 没有空闲房间，需要新开
      rooms++;
    }
  }
  
  return rooms;
}
```

### 执行过程

```
输入: [[0,30],[5,10],[15,20]]

starts: [0, 5, 15]
ends: [10, 20, 30]

start=0: 0 < ends[0]=10, 需要新房间, rooms=1
start=5: 5 < ends[0]=10, 需要新房间, rooms=2
start=15: 15 >= ends[0]=10, 复用, endPtr=1

答案: 2
```

---

## 复杂度分析

| 方法 | 时间复杂度 | 空间复杂度 |
|-----|-----------|-----------|
| 最小堆 | O(n log n) | O(n) |
| 扫描线 | O(n log n) | O(n) |
| 双指针 | O(n log n) | O(n) |

所有方法的瓶颈都在排序。

---

## 常见错误

### 错误1：扫描线排序条件错误

```typescript
// ❌ 错误：同时刻顺序不对
events.sort((a, b) => a[0] - b[0]);

// ✅ 正确：同时刻先处理结束（-1在+1前面）
events.sort((a, b) => a[0] !== b[0] ? a[0] - b[0] : a[1] - b[1]);
```

### 错误2：堆复用条件错误

```typescript
// ❌ 错误：应该用 <=，因为 end 时刻房间已空闲
if (endTimes[0] < start) { ... }

// ✅ 正确
if (endTimes[0] <= start) { ... }
```

### 错误3：双指针理解错误

```typescript
// ❌ 错误：每次都应该处理一个 start
for (let i = 0; i < n; i++) {
  if (starts[i] >= ends[i]) { ... }  // 应该用 endPtr，不是 i
}
```

---

## 相关问题

### 会议室 I（LeetCode 252）

判断是否存在冲突：

```typescript
function canAttendMeetings(intervals: number[][]): boolean {
  intervals.sort((a, b) => a[0] - b[0]);
  for (let i = 1; i < intervals.length; i++) {
    if (intervals[i][0] < intervals[i - 1][1]) {
      return false;  // 有重叠
    }
  }
  return true;
}
```

### 会议室 III（LeetCode 2402）

指定房间编号，优先使用编号小的空闲房间：

```typescript
// 需要用两个堆：
// 1. 空闲房间堆（按房间号排序）
// 2. 使用中房间堆（按结束时间排序）
```

---

## 相关题目

- LeetCode 252. 会议室
- LeetCode 2402. 会议室 III
- LeetCode 56. 合并区间
- LeetCode 435. 无重叠区间

---

## 总结

会议室 II 展示了资源调度问题的经典解法：

1. **最小堆**：模拟资源分配，堆顶是最早可用的资源
2. **扫描线**：转化为事件计数问题，找峰值并发
3. **双指针**：简化版扫描线

**核心洞察**：需要的资源数 = 同时进行任务的最大数量 = 并发峰值。
