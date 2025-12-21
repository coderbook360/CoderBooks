# 实战：拼车

> LeetCode 1094. 拼车 | 难度：中等

差分数组判断区间最大值的应用。这道题展示了如何用差分数组解决"区间叠加后是否超限"的问题。

---

## 题目描述

车上最初有 `capacity` 个空座位。车只能向一个方向行驶（不允许掉头或改变方向）。

给定整数 `capacity` 和一个数组 `trips`，`trip[i] = [numPassengers, from, to]` 表示第 i 次旅行有 `numPassengers` 乘客，从 `from` 上车到 `to` 下车。

请你判断是否能够完成所有旅行（即车上人数不超过 capacity）。

**示例**：
```
输入：trips = [[2,1,5], [3,3,7]], capacity = 4
输出：false
解释：在站点 3 到站点 5 之间，车上有 2+3=5 人，超过容量 4

输入：trips = [[2,1,5], [3,5,7]], capacity = 3
输出：true
解释：
  站点 1-4: 2 人
  站点 5: 乘客1下车，乘客2上车，车上 3 人
  站点 6-7: 3 人
  始终不超过 3
```

---

## 思路分析

### 问题转化

把每个站点看作数组的一个索引：
- 乘客在 `from` 站**上车** = 区间起点增加人数
- 乘客在 `to` 站**下车** = 区间终点减少人数

**注意**：乘客在 `to` 站**下车**，意味着 `to` 位置**不算在**区间内。

用差分数组维护每个站点的人数变化，然后求前缀和检查是否有超过 capacity 的情况。

### 差分数组应用

```
trip = [3, 1, 5]  // 3 个乘客，从站点 1 上车，站点 5 下车

diff[1] += 3   // 上车
diff[5] -= 3   // 下车

这意味着站点 1, 2, 3, 4 各有 3 人
站点 5 时，这 3 人已经下车
```

---

## 代码实现

```typescript
function carPooling(trips: number[][], capacity: number): boolean {
  // 站点范围 [0, 1000]
  const diff = new Array(1001).fill(0);
  
  // 应用差分
  for (const [passengers, from, to] of trips) {
    diff[from] += passengers;  // 上车
    diff[to] -= passengers;    // 下车（to 位置已经下车）
  }
  
  // 计算前缀和，同时检查是否超容量
  let current = 0;
  for (let i = 0; i < diff.length; i++) {
    current += diff[i];
    if (current > capacity) {
      return false;
    }
  }
  
  return true;
}
```

---

## 执行过程可视化

```
trips = [[2,1,5], [3,3,7]], capacity = 4

应用差分：
  [2,1,5]: diff[1] += 2, diff[5] -= 2
  [3,3,7]: diff[3] += 3, diff[7] -= 3

diff 数组（部分）：
  索引: 0   1   2   3   4   5   6   7
  值:   0   2   0   3   0  -2   0  -3

前缀和检查：
  站点 0: current = 0
  站点 1: current = 0 + 2 = 2 <= 4 ✓
  站点 2: current = 2 + 0 = 2 <= 4 ✓
  站点 3: current = 2 + 3 = 5 > 4 ✗

返回 false ✓
```

---

## 优化：只处理涉及的站点

如果站点范围很大（比如 0 到 10^9），可以用 Map 只记录变化的站点：

```typescript
function carPooling(trips: number[][], capacity: number): boolean {
  const diff = new Map<number, number>();
  
  // 应用差分
  for (const [passengers, from, to] of trips) {
    diff.set(from, (diff.get(from) || 0) + passengers);
    diff.set(to, (diff.get(to) || 0) - passengers);
  }
  
  // 按站点顺序处理
  const stations = [...diff.keys()].sort((a, b) => a - b);
  let current = 0;
  
  for (const station of stations) {
    current += diff.get(station)!;
    if (current > capacity) {
      return false;
    }
  }
  
  return true;
}
```

---

## 为什么 `to` 位置要减而不是 `to + 1`

在区间加法问题中，我们用 `diff[end + 1] -= inc`，因为 end 位置**包含在区间内**。

但在拼车问题中：
- 乘客在 `to` 站**下车**
- 意味着 `to` 站时，这些乘客**已经不在车上**
- 所以直接 `diff[to] -= passengers`

```
trip = [3, 1, 5]

站点:     1   2   3   4   5   6
乘客数:   3   3   3   3   0   0
          ↑               ↑
        上车             下车

diff[1] = +3, diff[5] = -3
```

---

## 复杂度分析

**时间复杂度**：
- 数组版本：O(n + m)，n 是站点范围，m 是旅行次数
- Map 版本：O(m log m)，需要排序

**空间复杂度**：
- 数组版本：O(n)
- Map 版本：O(m)

---

## 常见错误

**错误1：把 `to` 当作区间内的位置**
```typescript
// 错误：to 位置乘客已下车
diff[to + 1] -= passengers;  // ❌

// 正确
diff[to] -= passengers;  // ✅
```

**错误2：忘记累加**
```typescript
// 错误：直接用 diff[i] 判断
if (diff[i] > capacity) return false;  // ❌

// 正确：用前缀和
current += diff[i];
if (current > capacity) return false;  // ✅
```

---

## 相关题目

| 题目 | 难度 | 说明 |
|-----|------|------|
| [370. 区间加法](https://leetcode.com/problems/range-addition/) | 中等 | 返回最终数组 |
| [1109. 航班预订统计](https://leetcode.com/problems/corporate-flight-bookings/) | 中等 | 区间增量求和 |
| [253. 会议室 II](https://leetcode.com/problems/meeting-rooms-ii/) | 中等 | 最多需要几间会议室 |

---

## 与"会议室 II"的关系

这两道题本质相同：
- 拼车：判断车上人数是否超过 capacity
- 会议室 II：求同时进行的会议最大数量

```typescript
// 会议室 II 可以用差分数组求最大值
function minMeetingRooms(intervals: number[][]): number {
  const diff = new Map<number, number>();
  
  for (const [start, end] of intervals) {
    diff.set(start, (diff.get(start) || 0) + 1);
    diff.set(end, (diff.get(end) || 0) - 1);
  }
  
  const times = [...diff.keys()].sort((a, b) => a - b);
  let current = 0;
  let maxRooms = 0;
  
  for (const time of times) {
    current += diff.get(time)!;
    maxRooms = Math.max(maxRooms, current);
  }
  
  return maxRooms;
}
```

---

## 总结

拼车问题的核心要点：

1. **差分思想**：上车加人，下车减人
2. **边界理解**：`to` 站时乘客已下车
3. **前缀和检查**：累加差分数组检查容量
4. **优化技巧**：用 Map 处理大范围站点
5. **关联问题**：与会议室问题本质相同
