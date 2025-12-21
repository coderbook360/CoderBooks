# 实战：合并区间

> LeetCode 56. 合并区间 | 难度：中等

区间处理的基础问题。

---

## 题目描述

给出一个区间的集合，合并所有重叠的区间。

**示例**：
```
输入：intervals = [[1,3],[2,6],[8,10],[15,18]]
输出：[[1,6],[8,10],[15,18]]
解释：[1,3] 和 [2,6] 重叠，合并为 [1,6]
```

---

## 思路分析

**贪心策略**：
1. 按起始位置排序
2. 遍历区间，判断是否与上一个重叠
3. 重叠则合并，不重叠则新增

---

## 代码实现

```typescript
function merge(intervals: number[][]): number[][] {
  if (intervals.length <= 1) return intervals;
  
  // 按起始位置排序
  intervals.sort((a, b) => a[0] - b[0]);
  
  const result: number[][] = [intervals[0]];
  
  for (let i = 1; i < intervals.length; i++) {
    const last = result[result.length - 1];
    const curr = intervals[i];
    
    if (curr[0] <= last[1]) {
      // 重叠，扩展结束位置
      last[1] = Math.max(last[1], curr[1]);
    } else {
      // 不重叠，新增区间
      result.push(curr);
    }
  }
  
  return result;
}
```

---

## 图示

```
输入: [[1,3],[2,6],[8,10],[15,18]]

排序后同上

处理过程:
result = [[1,3]]

[2,6]: 2<=3 重叠
       result = [[1,6]]

[8,10]: 8>6 不重叠
        result = [[1,6],[8,10]]

[15,18]: 15>10 不重叠
         result = [[1,6],[8,10],[15,18]]
```

---

## 边界情况

### 包含关系

```
[1,8] 和 [2,5]
合并后仍是 [1,8]
```

关键：`last[1] = Math.max(last[1], curr[1])`

### 相邻区间

```
[1,3] 和 [3,5]
3<=3，视为重叠
合并为 [1,5]
```

---

## 复杂度分析

- **时间复杂度**：O(n log n)，排序
- **空间复杂度**：O(n)，存储结果

---

## 相关问题：插入区间

给定有序不重叠区间，插入一个新区间并合并。

```typescript
function insert(
  intervals: number[][], 
  newInterval: number[]
): number[][] {
  const result: number[][] = [];
  let [newStart, newEnd] = newInterval;
  let i = 0;
  
  // 添加所有在 newInterval 之前的区间
  while (i < intervals.length && intervals[i][1] < newStart) {
    result.push(intervals[i]);
    i++;
  }
  
  // 合并重叠区间
  while (i < intervals.length && intervals[i][0] <= newEnd) {
    newStart = Math.min(newStart, intervals[i][0]);
    newEnd = Math.max(newEnd, intervals[i][1]);
    i++;
  }
  result.push([newStart, newEnd]);
  
  // 添加剩余区间
  while (i < intervals.length) {
    result.push(intervals[i]);
    i++;
  }
  
  return result;
}
```
