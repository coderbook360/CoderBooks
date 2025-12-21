# 实战：无重叠区间

> LeetCode 435. 无重叠区间 | 难度：中等

经典区间调度问题的变体。

---

## 题目描述

给定一个区间的集合，求需要移除的最小区间数量，使剩余区间互不重叠。

**示例**：
```
输入：intervals = [[1,2],[2,3],[3,4],[1,3]]
输出：1
解释：移除 [1,3] 后，其余区间不重叠
```

---

## 思路分析

**转换思路**：
- 移除最少 = 保留最多
- 问题变成：选择最多不重叠区间

**贪心策略**：按结束时间排序，每次选结束最早的。

---

## 代码实现

```typescript
function eraseOverlapIntervals(intervals: number[][]): number {
  if (intervals.length === 0) return 0;
  
  // 按结束时间排序
  intervals.sort((a, b) => a[1] - b[1]);
  
  let kept = 1;
  let end = intervals[0][1];
  
  for (let i = 1; i < intervals.length; i++) {
    if (intervals[i][0] >= end) {
      kept++;
      end = intervals[i][1];
    }
  }
  
  return intervals.length - kept;
}
```

---

## 图示

```
输入: [[1,2],[2,3],[3,4],[1,3]]

按结束时间排序: [[1,2],[2,3],[1,3],[3,4]]

处理过程:
[1,2]: 选择, end=2, kept=1
[2,3]: 2>=2 ✓, 选择, end=3, kept=2
[1,3]: 1<3 ✗, 跳过
[3,4]: 3>=3 ✓, 选择, end=4, kept=3

保留 3 个，移除 4-3=1 个
```

---

## 为什么按结束时间排序？

**反证**：假设不选结束最早的区间 A，而选了结束较晚的 B。

```
       A: [----]
       B: [--------]
后续:           [---][---]...
```

选 A 后，后续空间更大，能容纳更多区间。所以选 A 一定不会比选 B 差。

---

## 复杂度分析

- **时间复杂度**：O(n log n)，排序
- **空间复杂度**：O(log n)，排序栈空间

---

## 变体：用最少箭戳气球

如果区间端点可以重叠算作一次？

```typescript
function findMinArrowShots(points: number[][]): number {
  if (points.length === 0) return 0;
  
  points.sort((a, b) => a[1] - b[1]);
  
  let arrows = 1;
  let end = points[0][1];
  
  for (let i = 1; i < points.length; i++) {
    if (points[i][0] > end) {  // 注意：严格大于
      arrows++;
      end = points[i][1];
    }
  }
  
  return arrows;
}
```
