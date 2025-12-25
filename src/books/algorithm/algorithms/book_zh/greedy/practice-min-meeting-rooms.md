# 实战：会议室 II

> LeetCode 253. 会议室 II | 难度：中等

计算所需的最少会议室数量。

---

## 题目描述

给你一个会议时间安排的数组 `intervals`，每个会议时间都会包含开始和结束的时间 `intervals[i] = [starti, endi]`。

返回**所需会议室的最少数量**。

**示例**：
```
输入：intervals = [[0,30],[5,10],[15,20]]
输出：2
解释：
  [0,30] 需要一个会议室
  [5,10] 与 [0,30] 重叠，需要第二个会议室
  [15,20] 可以复用 [5,10] 结束后的会议室

输入：intervals = [[7,10],[2,4]]
输出：1
解释：两个会议不重叠，可以用同一个会议室
```

---

## 思路分析

**贪心策略**：追踪任意时刻正在进行的会议数量的最大值。

这可以转化为**扫描线问题**：
- 每个会议的开始时间，会议室需求 +1
- 每个会议的结束时间，会议室需求 -1
- 最大的需求就是答案

---

## 代码实现

### 方法一：扫描线

```typescript
function minMeetingRooms(intervals: number[][]): number {
  // 提取所有时间点
  const events: [number, number][] = [];
  
  for (const [start, end] of intervals) {
    events.push([start, 1]);   // 开始：+1
    events.push([end, -1]);    // 结束：-1
  }
  
  // 排序：时间升序，相同时间则结束优先（先释放再占用）
  events.sort((a, b) => {
    if (a[0] !== b[0]) return a[0] - b[0];
    return a[1] - b[1];  // -1 在 +1 前面
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

### 方法二：双指针（分别排序）

```typescript
function minMeetingRoomsV2(intervals: number[][]): number {
  const n = intervals.length;
  if (n === 0) return 0;
  
  // 分别提取并排序开始和结束时间
  const starts = intervals.map(i => i[0]).sort((a, b) => a - b);
  const ends = intervals.map(i => i[1]).sort((a, b) => a - b);
  
  let rooms = 0;
  let endPtr = 0;
  
  for (let i = 0; i < n; i++) {
    if (starts[i] < ends[endPtr]) {
      // 新会议开始，但没有会议室空闲
      rooms++;
    } else {
      // 有会议室空闲，复用
      endPtr++;
    }
  }
  
  return rooms;
}
```

### 方法三：最小堆

```typescript
function minMeetingRoomsHeap(intervals: number[][]): number {
  if (intervals.length === 0) return 0;
  
  // 按开始时间排序
  intervals.sort((a, b) => a[0] - b[0]);
  
  // 最小堆存储正在使用的会议室的结束时间
  const minHeap = new MinPriorityQueue<number>();
  
  // 第一个会议
  minHeap.enqueue(intervals[0][1]);
  
  for (let i = 1; i < intervals.length; i++) {
    const [start, end] = intervals[i];
    
    // 如果最早结束的会议已结束，可以复用
    if (start >= minHeap.front()) {
      minHeap.dequeue();
    }
    
    // 为当前会议分配会议室
    minHeap.enqueue(end);
  }
  
  // 堆的大小就是最少会议室数
  return minHeap.size();
}
```

---

## 图示

```
intervals = [[0,30], [5,10], [15,20]]

时间线：
0    5    10   15   20   25   30
|----[0,30]----------------------|
     |----[5,10]----|
               |----[15,20]----|

扫描线事件：
时间  事件  当前会议室数
0     +1    1
5     +1    2  ← 最大值
10    -1    1
15    +1    2
20    -1    1
30    -1    0

答案：2
```

---

## 执行过程详解

### 扫描线方法

```
intervals = [[0,30], [5,10], [15,20]]

生成事件：
  [0, +1], [30, -1]   ← [0,30]
  [5, +1], [10, -1]   ← [5,10]
  [15, +1], [20, -1]  ← [15,20]

排序后：
  [0, +1], [5, +1], [10, -1], [15, +1], [20, -1], [30, -1]

扫描：
  时间0:  rooms = 0+1 = 1, max = 1
  时间5:  rooms = 1+1 = 2, max = 2
  时间10: rooms = 2-1 = 1, max = 2
  时间15: rooms = 1+1 = 2, max = 2
  时间20: rooms = 2-1 = 1, max = 2
  时间30: rooms = 1-1 = 0, max = 2

结果：2
```

### 双指针方法

```
intervals = [[0,30], [5,10], [15,20]]

starts = [0, 5, 15]
ends   = [10, 20, 30]

rooms = 0, endPtr = 0

i=0: starts[0]=0 < ends[0]=10?  是
     rooms = 1

i=1: starts[1]=5 < ends[0]=10?  是
     rooms = 2

i=2: starts[2]=15 < ends[0]=10?  否
     endPtr = 1
     (复用一个会议室)

结果：2
```

---

## 边界情况处理

```typescript
// 时间点相同时，结束应该在开始之前
// 因为一个会议10点结束，另一个10点开始，可以用同一个会议室

events.sort((a, b) => {
  if (a[0] !== b[0]) return a[0] - b[0];
  return a[1] - b[1];  // -1 < +1，结束优先
});

// 例如：[[10,20], [5,10]]
// 事件：[5,+1], [10,-1], [10,+1], [20,-1]
// 正确答案：1（可以复用）
```

---

## 复杂度分析

**扫描线方法**：
- 时间复杂度：O(n log n)，排序主导
- 空间复杂度：O(n)，存储事件

**双指针方法**：
- 时间复杂度：O(n log n)，排序主导
- 空间复杂度：O(n)，存储排序数组

**最小堆方法**：
- 时间复杂度：O(n log n)，堆操作
- 空间复杂度：O(n)，堆大小

---

## 延伸：会议室 I

**LeetCode 252**：判断是否能用一个会议室

```typescript
function canAttendMeetings(intervals: number[][]): boolean {
  intervals.sort((a, b) => a[0] - b[0]);
  
  for (let i = 1; i < intervals.length; i++) {
    if (intervals[i][0] < intervals[i - 1][1]) {
      return false;  // 重叠
    }
  }
  
  return true;
}
```

---

## 小结

本题的贪心策略：

1. **扫描线**：追踪任意时刻的并发会议数
2. **双指针**：比较下一个开始和最早结束的时间
3. **最小堆**：维护正在进行的会议的结束时间

核心理解：**所需会议室数 = 任意时刻的最大并发会议数**
