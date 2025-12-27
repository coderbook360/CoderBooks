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
  
  // 按结束时间排序 —— 这是关键！
  // 为什么按结束时间？见下方证明
  intervals.sort((a, b) => a[1] - b[1]);
  
  let count = 1;                    // 已选择的区间数，至少选第一个
  let end = intervals[0][1];        // 当前已选区间的结束时间
  
  for (let i = 1; i < intervals.length; i++) {
    // 如果当前区间的起点 >= 已选区间的结束点，说明不重叠
    if (intervals[i][0] >= end) {
      count++;                      // 选择这个区间
      end = intervals[i][1];        // 更新结束时间
    }
    // 否则跳过（与已选区间重叠）
  }
  
  return count;
}
```

**为什么按结束时间排序是正确的？**

用交换论证法证明：

```
假设存在最优解 OPT，其第一个选择的区间不是结束最早的区间 A，
而是某个区间 B（B 结束时间晚于 A）。

将 OPT 中的 B 替换为 A：
- A 结束更早，所以 A 不会与 OPT 中其他区间产生新的冲突
- 替换后的解仍然是有效解
- 区间数量不变

重复此过程，最终 OPT 变成贪心解。
所以贪心解是最优解 ✓
```

**直观理解**：选结束早的区间，给后面的区间留更多"空间"。

---

## 策略2：区间合并

**问题**：合并所有重叠区间

**贪心策略**：按起点排序，逐个合并

```typescript
function mergeIntervals(intervals: number[][]): number[][] {
  if (intervals.length === 0) return [];
  
  // 按起始时间排序 —— 保证重叠的区间相邻
  intervals.sort((a, b) => a[0] - b[0]);
  
  // result 存储合并后的区间，初始放入第一个区间
  const result: number[][] = [intervals[0]];
  
  for (let i = 1; i < intervals.length; i++) {
    const last = result[result.length - 1];  // 结果中最后一个区间
    const curr = intervals[i];                // 当前待处理区间
    
    // 判断是否重叠：当前区间起点 <= 上一个区间终点
    if (curr[0] <= last[1]) {
      // 重叠：扩展结果区间的终点（取较大值）
      // 为什么取 max？因为可能存在包含关系，如 [1,10] 和 [2,5]
      last[1] = Math.max(last[1], curr[1]);
    } else {
      // 不重叠：当前区间作为新的独立区间加入结果
      result.push(curr);
    }
  }
  
  return result;
}
```

**为什么按起点排序？**

```
排序后，如果区间 A 在区间 B 之前，则 A.start <= B.start

判断重叠只需比较 B.start 和 A.end：
- 如果 B.start <= A.end，则 A 和 B 重叠
- 如果 B.start > A.end，则 A 和 B 不重叠

排序保证了：与当前区间重叠的所有区间一定是连续的
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
  // 按起始时间排序
  intervals.sort((a, b) => a[0] - b[0]);
  
  let count = 0;          // 已选择的区间数
  let i = 0;              // 当前处理的区间索引
  let covered = start;    // 已覆盖到的位置
  
  // 当还没完全覆盖目标区间时
  while (covered < end) {
    let maxEnd = covered;  // 本轮能延伸到的最远位置
    
    // 找所有起点 <= covered 的区间中，结束点最远的
    // 为什么起点要 <= covered？保证区间能接上已覆盖的部分
    while (i < intervals.length && intervals[i][0] <= covered) {
      maxEnd = Math.max(maxEnd, intervals[i][1]);
      i++;
    }
    
    // 如果无法延伸（没有区间能接上），说明无法覆盖
    if (maxEnd === covered) {
      return -1;
    }
    
    // 选择了一个区间（能延伸最远的那个）
    covered = maxEnd;
    count++;
  }
  
  return count;
}
```

**贪心正确性证明**：

```
设当前已覆盖到位置 p，下一步有多个区间可选。
假设最优解选了区间 A（结束于 a），而贪心选了区间 B（结束于 b，b > a）。

将最优解中的 A 替换为 B：
- B 覆盖更远，后续需要的区间数只会减少或不变
- 所以替换后的解不会更差

因此贪心解是最优解 ✓
```

**直观理解**：既然能接上，就选能跳最远的，减少跳跃次数。

---

## 策略4：区间分组（会议室）

**问题**：最少需要多少会议室（等价于：将区间分成最少的不重叠组）

**贪心策略**：用最小堆维护每个房间的结束时间

```typescript
function minMeetingRooms(intervals: number[][]): number {
  if (intervals.length === 0) return 0;
  
  // 按起始时间排序 —— 按时间顺序处理会议
  intervals.sort((a, b) => a[0] - b[0]);
  
  // 最小堆：存储每个房间当前会议的结束时间
  // 堆顶是最早结束的房间
  const heap = new MinHeap<number>();
  heap.push(intervals[0][1]);  // 第一个会议占用第一个房间
  
  for (let i = 1; i < intervals.length; i++) {
    const [start, end] = intervals[i];
    
    // 检查最早结束的房间是否已空闲
    if (heap.peek() <= start) {
      // 房间已空闲，可以复用
      // 移除旧的结束时间（该房间将被新会议占用）
      heap.pop();
    }
    // 如果 heap.peek() > start，说明所有房间都在使用中，需要新房间
    
    // 将当前会议的结束时间加入堆
    // 无论复用还是新开，都需要更新该房间的结束时间
    heap.push(end);
  }
  
  // 堆的大小就是需要的房间数
  return heap.size();
}
```

**为什么用最小堆？**

```
堆维护的是"每个房间的结束时间"。

当新会议到来时，我们只关心"最早结束的房间"：
- 如果最早结束的房间都不空闲，其他房间更不可能空闲
- 如果最早结束的房间空闲了，就复用它

最小堆让我们 O(log n) 获取最早结束的房间。
```

**另一种理解：重叠数量**

```
最少房间数 = 任意时刻最多有多少个会议同时进行

可以用扫描线算法：
- 将所有起点标记为 +1
- 将所有终点标记为 -1
- 扫描过程中的最大值就是答案
```

---

## 排序方式选择指南

| 问题类型 | 排序方式 | 原因 |
|---------|---------|-----|
| 最多不重叠 | 结束时间 | 留更多空间 |
| 合并区间 | 起始时间 | 便于判断重叠 |
| 最少覆盖 | 起始时间 | 保证不遗漏 |
| 最少分组 | 起始时间 | 按时间处理 |
