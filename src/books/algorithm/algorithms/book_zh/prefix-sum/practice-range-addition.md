# 实战：区间加法

> LeetCode 370. 区间加法 | 难度：中等

差分数组的直接应用，展示了如何将 O(nk) 的区间更新优化到 O(n + k)。

---

## 题目描述

假设你有一个长度为 n 的数组，初始情况下所有元素都是 0。给你 k 个更新操作。

每个操作用三元组 `[startIndex, endIndex, inc]` 表示，你需要将子数组 `[startIndex, endIndex]`（包括 startIndex 和 endIndex）的所有元素都增加 inc。

在执行完所有 k 个操作后，返回这个修改后的数组。

**示例**：
```
输入：length = 5, updates = [[1,3,2], [2,4,3], [0,2,-2]]
输出：[-2, 0, 3, 5, 3]

解释：
初始: [0, 0, 0, 0, 0]
[1,3,2]: [0, 2, 2, 2, 0]
[2,4,3]: [0, 2, 5, 5, 3]
[0,2,-2]: [-2, 0, 3, 5, 3]
```

---

## 思路分析

### 暴力方法

直接执行每次更新：

```typescript
function getModifiedArrayBruteForce(length: number, updates: number[][]): number[] {
  const result = new Array(length).fill(0);
  
  for (const [start, end, inc] of updates) {
    for (let i = start; i <= end; i++) {
      result[i] += inc;
    }
  }
  
  return result;
}
```

时间复杂度 O(nk)，n 是数组长度，k 是更新次数。

### 差分数组优化

差分数组的核心思想：**区间更新变为端点操作**。

对于区间 `[start, end]` 加 inc：
- `diff[start] += inc`：从 start 开始，后面所有位置都会加 inc
- `diff[end + 1] -= inc`：从 end + 1 开始，抵消前面的 inc

最后对差分数组求前缀和，就得到结果。

---

## 代码实现

```typescript
function getModifiedArray(length: number, updates: number[][]): number[] {
  const diff = new Array(length).fill(0);
  
  // 应用所有更新到差分数组
  for (const [start, end, inc] of updates) {
    diff[start] += inc;
    if (end + 1 < length) {
      diff[end + 1] -= inc;
    }
  }
  
  // 从差分数组还原结果（前缀和）
  const result = new Array(length);
  result[0] = diff[0];
  for (let i = 1; i < length; i++) {
    result[i] = result[i - 1] + diff[i];
  }
  
  return result;
}
```

---

## 执行过程可视化

```
length = 5, updates = [[1,3,2], [2,4,3], [0,2,-2]]

初始 diff: [0, 0, 0, 0, 0]

操作1 [1,3,2]:
  diff[1] += 2, diff[4] -= 2
  diff: [0, 2, 0, 0, -2]

操作2 [2,4,3]:
  diff[2] += 3, diff[5] 越界，跳过
  diff: [0, 2, 3, 0, -2]

操作3 [0,2,-2]:
  diff[0] += -2, diff[3] -= -2 = diff[3] += 2
  diff: [-2, 2, 3, 2, -2]

还原（前缀和）:
  result[0] = -2
  result[1] = -2 + 2 = 0
  result[2] = 0 + 3 = 3
  result[3] = 3 + 2 = 5
  result[4] = 5 + (-2) = 3

返回 [-2, 0, 3, 5, 3] ✓
```

---

## 差分数组的直觉理解

把差分数组想象成"变化量"：

```
原数组:   [a, b, c, d, e]
差分数组: [a, b-a, c-b, d-c, e-d]

前缀和还原:
  result[0] = a
  result[1] = a + (b-a) = b
  result[2] = b + (c-b) = c
  ...
```

当我们在 `diff[start]` 加 inc，意味着从 start 开始所有元素都增加 inc。

当我们在 `diff[end+1]` 减 inc，意味着从 end+1 开始抵消之前的增量。

---

## 原地优化

如果不需要保留原数组，可以原地修改：

```typescript
function getModifiedArray(length: number, updates: number[][]): number[] {
  const result = new Array(length).fill(0);
  
  // 应用差分
  for (const [start, end, inc] of updates) {
    result[start] += inc;
    if (end + 1 < length) {
      result[end + 1] -= inc;
    }
  }
  
  // 原地前缀和
  for (let i = 1; i < length; i++) {
    result[i] += result[i - 1];
  }
  
  return result;
}
```

---

## 复杂度分析

**时间复杂度**：O(n + k)
- k 次更新，每次 O(1)
- 最后还原 O(n)

**空间复杂度**：O(n)
- 差分数组需要 O(n) 空间
- 如果原地操作，只需 O(1) 额外空间

---

## 与暴力法对比

| 方法 | 时间复杂度 | 适用场景 |
|-----|-----------|---------|
| 暴力更新 | O(nk) | k 很小 |
| 差分数组 | O(n + k) | k 很大、区间很长 |

当 k 和区间长度都很大时，差分数组优势明显。

---

## 常见错误

**错误1：越界检查**
```typescript
// 忘记边界检查
diff[end + 1] -= inc;  // ❌ 可能越界

// 正确
if (end + 1 < length) {
  diff[end + 1] -= inc;  // ✅
}
```

**错误2：还原时的起点**
```typescript
// 从索引 0 开始
result[0] = diff[0];  // ✅ 必须先设置第一个元素
```

---

## 相关题目

| 题目 | 难度 | 说明 |
|-----|------|------|
| [1094. 拼车](https://leetcode.com/problems/car-pooling/) | 中等 | 差分+容量判断 |
| [1109. 航班预订统计](https://leetcode.com/problems/corporate-flight-bookings/) | 中等 | 区间增量 |
| [2381. 字母移位 II](https://leetcode.com/problems/shifting-letters-ii/) | 中等 | 字符区间修改 |

---

## 总结

区间加法的核心要点：

1. **差分思想**：区间更新变端点操作
2. **操作公式**：`diff[start] += inc`, `diff[end+1] -= inc`
3. **还原方法**：对差分数组求前缀和
4. **边界处理**：注意 `end+1` 可能越界
5. **复杂度优化**：O(nk) → O(n + k)
