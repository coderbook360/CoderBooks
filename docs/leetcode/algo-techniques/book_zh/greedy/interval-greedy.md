# 区间问题的贪心策略

区间问题是贪心算法最经典的应用场景。

---

## 区间问题分类

1. **区间调度**：选择最多不重叠区间
2. **区间覆盖**：用最少区间覆盖目标
3. **区间合并**：合并重叠区间
4. **区间分组**：将区间分成最少组

---

## 核心策略：排序

处理区间问题的第一步几乎总是排序。

### 按结束点排序

适用于：区间调度、最多不重叠区间

```typescript
intervals.sort((a, b) => a[1] - b[1]);
```

### 按起始点排序

适用于：区间合并、区间覆盖

```typescript
intervals.sort((a, b) => a[0] - b[0]);
```

---

## 策略1：区间调度

**问题**：选择最多不重叠区间

**贪心策略**：每次选择结束最早的区间

```typescript
function maxNonOverlapping(intervals: number[][]): number {
  if (intervals.length === 0) return 0;
  
  // 按结束时间排序
  intervals.sort((a, b) => a[1] - b[1]);
  
  let count = 1;
  let end = intervals[0][1];
  
  for (let i = 1; i < intervals.length; i++) {
    if (intervals[i][0] >= end) {
      count++;
      end = intervals[i][1];
    }
  }
  
  return count;
}
```

**为什么正确**：
- 结束早 = 留更多空间给后续区间
- 任何其他选择都不会比选最早结束的更好

---

## 策略2：区间合并

**问题**：合并所有重叠区间

**贪心策略**：按起点排序，逐个合并

```typescript
function mergeIntervals(intervals: number[][]): number[][] {
  if (intervals.length === 0) return [];
  
  intervals.sort((a, b) => a[0] - b[0]);
  
  const result: number[][] = [intervals[0]];
  
  for (let i = 1; i < intervals.length; i++) {
    const last = result[result.length - 1];
    const curr = intervals[i];
    
    if (curr[0] <= last[1]) {
      // 重叠，合并
      last[1] = Math.max(last[1], curr[1]);
    } else {
      // 不重叠，新增
      result.push(curr);
    }
  }
  
  return result;
}
```

---

## 策略3：最少区间覆盖

**问题**：用最少区间覆盖 [start, end]

**贪心策略**：每次选择能延伸最远的区间

```typescript
function minIntervalsToCover(
  intervals: number[][], 
  start: number, 
  end: number
): number {
  intervals.sort((a, b) => a[0] - b[0]);
  
  let count = 0;
  let i = 0;
  let covered = start;
  
  while (covered < end) {
    let maxEnd = covered;
    
    // 找所有起点 <= covered 的区间中，结束点最远的
    while (i < intervals.length && intervals[i][0] <= covered) {
      maxEnd = Math.max(maxEnd, intervals[i][1]);
      i++;
    }
    
    if (maxEnd === covered) {
      return -1; // 无法覆盖
    }
    
    covered = maxEnd;
    count++;
  }
  
  return count;
}
```

---

## 策略4：区间分组（会议室）

**问题**：最少需要多少会议室

**贪心策略**：用最小堆维护每个房间的结束时间

```typescript
function minMeetingRooms(intervals: number[][]): number {
  if (intervals.length === 0) return 0;
  
  intervals.sort((a, b) => a[0] - b[0]);
  
  // 最小堆存储每个房间的结束时间
  const heap = new MinHeap<number>();
  heap.push(intervals[0][1]);
  
  for (let i = 1; i < intervals.length; i++) {
    const [start, end] = intervals[i];
    
    // 如果最早结束的房间已空闲
    if (heap.peek() <= start) {
      heap.pop();
    }
    
    heap.push(end);
  }
  
  return heap.size();
}
```

---

## 排序方式选择指南

| 问题类型 | 排序方式 | 原因 |
|---------|---------|-----|
| 最多不重叠 | 结束时间 | 留更多空间 |
| 合并区间 | 起始时间 | 便于判断重叠 |
| 最少覆盖 | 起始时间 | 保证不遗漏 |
| 最少分组 | 起始时间 | 按时间处理 |
