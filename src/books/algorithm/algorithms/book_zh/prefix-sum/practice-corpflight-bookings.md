# 实战：航班预订统计

> LeetCode 1109. 航班预订统计 | 难度：中等

差分数组的典型应用题，完美展示"区间加法"的高效处理。

---

## 题目描述

这里有 `n` 个航班，它们分别从 1 到 n 进行编号。

有一份航班预订表 `bookings`，表中第 i 条预订记录 `bookings[i] = [first, last, seats]` 意味着在从 `first` 到 `last` 的每个航班上预订了 `seats` 个座位。

请你返回一个长度为 n 的数组 `answer`，里面的元素是每个航班预定的座位总数。

**示例**：
```
输入：bookings = [[1,2,10], [2,3,20], [2,5,25]], n = 5
输出：[10, 55, 45, 25, 25]

解释：
航班 1: 10
航班 2: 10 + 20 + 25 = 55
航班 3: 20 + 25 = 45
航班 4: 25
航班 5: 25
```

---

## 思路分析

每次预订都是**区间加法**：将 `[first, last]` 区间内的每个航班座位数加上 `seats`。

### 方法对比

| 方法 | 每次预订 | 总复杂度 |
|-----|---------|---------|
| 暴力遍历 | O(n) | O(n × m) |
| 差分数组 | O(1) | O(n + m) |

当预订次数 m 很大时，差分数组的优势明显。

---

## 差分数组回顾

对于原数组 `a[]`，差分数组 `d[]` 满足：
- `d[0] = a[0]`
- `d[i] = a[i] - a[i-1]` (i > 0)

**核心性质**：对 `d[l]` 加 v，对 `d[r+1]` 减 v，等价于对 `a[l..r]` 区间都加 v。

---

## 代码实现

### 基础版本

```typescript
function corpFlightBookings(bookings: number[][], n: number): number[] {
  // 差分数组，多一位避免越界
  const diff = new Array(n + 1).fill(0);
  
  // 应用所有预订（差分操作）
  for (const [first, last, seats] of bookings) {
    diff[first - 1] += seats;  // 转换为 0-indexed
    diff[last] -= seats;       // 注意：last 不需要 -1
  }
  
  // 还原（前缀和）
  const answer = new Array(n);
  answer[0] = diff[0];
  for (let i = 1; i < n; i++) {
    answer[i] = answer[i - 1] + diff[i];
  }
  
  return answer;
}
```

### 原地还原版本

```typescript
function corpFlightBookings(bookings: number[][], n: number): number[] {
  const diff = new Array(n + 1).fill(0);
  
  for (const [first, last, seats] of bookings) {
    diff[first - 1] += seats;
    diff[last] -= seats;
  }
  
  // 原地前缀和
  for (let i = 1; i < n; i++) {
    diff[i] += diff[i - 1];
  }
  
  // 截取前 n 个元素
  return diff.slice(0, n);
}
```

---

## 执行过程可视化

```
n = 5, bookings = [[1,2,10], [2,3,20], [2,5,25]]

初始 diff: [0, 0, 0, 0, 0, 0]  (长度 n+1 = 6)

预订 [1,2,10]:
  diff[0] += 10, diff[2] -= 10
  diff: [10, 0, -10, 0, 0, 0]
  
  含义：从位置0开始+10，从位置2开始-10
        ↓               ↓
        [+10, +10, 0, 0, 0]

预订 [2,3,20]:
  diff[1] += 20, diff[3] -= 20
  diff: [10, 20, -10, -20, 0, 0]

预订 [2,5,25]:
  diff[1] += 25, diff[5] -= 25
  diff: [10, 45, -10, -20, 0, -25]

前缀和还原:
  answer[0] = diff[0] = 10
  answer[1] = 10 + 45 = 55
  answer[2] = 55 + (-10) = 45
  answer[3] = 45 + (-20) = 25
  answer[4] = 25 + 0 = 25

返回 [10, 55, 45, 25, 25] ✓
```

---

## 索引转换详解

题目使用 **1-indexed**，代码使用 **0-indexed**：

```
题目说 [first, last] = [1, 2]，表示航班1和航班2

转换到 0-indexed:
- 航班1 → 索引0
- 航班2 → 索引1

所以 diff 操作:
- diff[first - 1] += seats  →  diff[0] += seats
- diff[last] -= seats       →  diff[2] -= seats

注意 last 不需要 -1，因为 diff[last] 对应的是"航班last之后"
```

---

## 为什么差分数组长度是 n+1？

```typescript
// 假设 n = 5，预订 [5, 5, 100]
// 需要 diff[5] -= 100

// 如果 diff 长度只有 n = 5
// diff[5] 会越界！

// 所以需要 diff 长度 = n + 1 = 6
const diff = new Array(n + 1).fill(0);
```

---

## 复杂度分析

**时间复杂度**：O(n + m)
- 处理 m 次预订：O(m)
- 前缀和还原：O(n)

**空间复杂度**：O(n)
- 差分数组占用 O(n) 空间

---

## 常见错误

**错误1：索引转换错误**
```typescript
// 错误：两边都 -1
diff[first - 1] += seats;
diff[last - 1] -= seats;  // ❌

// 正确：只有 first 需要 -1
diff[first - 1] += seats;
diff[last] -= seats;  // ✅
```

**错误2：diff 数组长度不足**
```typescript
// 错误：长度只有 n
const diff = new Array(n).fill(0);  // ❌

// 正确：长度 n+1
const diff = new Array(n + 1).fill(0);  // ✅
```

**错误3：前缀和起始位置错误**
```typescript
// 错误：从 i=0 开始
for (let i = 0; i < n; i++) {
  diff[i] += diff[i - 1];  // ❌ diff[-1] 是 undefined
}

// 正确：从 i=1 开始
for (let i = 1; i < n; i++) {
  diff[i] += diff[i - 1];  // ✅
}
```

---

## 相关题目

| 题目 | 难度 | 说明 |
|-----|------|------|
| [370. 区间加法](https://leetcode.com/problems/range-addition/) | 中等 | 基础差分 |
| [1094. 拼车](https://leetcode.com/problems/car-pooling/) | 中等 | 带容量限制 |
| [253. 会议室 II](https://leetcode.com/problems/meeting-rooms-ii/) | 中等 | 求最大重叠 |

---

## 差分数组模板

```typescript
function rangeAddition(n: number, updates: number[][]): number[] {
  // 1. 创建差分数组
  const diff = new Array(n + 1).fill(0);
  
  // 2. 应用所有区间更新
  for (const [start, end, val] of updates) {
    diff[start] += val;
    diff[end + 1] -= val;  // 注意：+1 取决于区间是否闭区间
  }
  
  // 3. 前缀和还原
  const result = new Array(n);
  result[0] = diff[0];
  for (let i = 1; i < n; i++) {
    result[i] = result[i - 1] + diff[i];
  }
  
  return result;
}
```

---

## 总结

航班预订统计的核心要点：

1. **识别区间加法**：多次对区间 [l, r] 加值
2. **差分数组思想**：diff[l] += v, diff[r+1] -= v
3. **索引转换**：注意 1-indexed 到 0-indexed
4. **长度 n+1**：避免 diff[r+1] 越界
5. **前缀和还原**：累加 diff 得到原数组
