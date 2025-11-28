# 实战：区间加法

这道题来自 LeetCode 370，是差分数组的经典应用场景。

## 题目描述

假设你有一个长度为 n 的数组，初始情况下所有元素都是 0。你需要执行若干次区间加法操作。

给你一个二维数组 `updates`，其中 `updates[i] = [startIdx, endIdx, inc]`，表示将 `nums[startIdx]` 到 `nums[endIdx]`（包含两端）的所有元素都增加 `inc`。

请返回执行完所有操作后的数组。

**示例**：

```
输入：length = 5, updates = [[1,3,2],[2,4,3],[0,2,-2]]
输出：[-2,0,3,5,3]

解释：
初始状态：[0, 0, 0, 0, 0]

执行 [1,3,2]：[0, 2, 2, 2, 0]
执行 [2,4,3]：[0, 2, 5, 5, 3]
执行 [0,2,-2]：[-2, 0, 3, 5, 3]
```

## 暴力解法的问题

直接模拟每次操作：

```javascript
function getModifiedArray(length, updates) {
    const result = new Array(length).fill(0);
    
    for (const [start, end, inc] of updates) {
        for (let i = start; i <= end; i++) {
            result[i] += inc;
        }
    }
    
    return result;
}
```

假设有 m 次操作，数组长度为 n，暴力解法的时间复杂度是 O(m × n)。如果 m 和 n 都很大，这个方法就太慢了。

## 差分数组优化

回顾差分数组的核心技巧：

- 区间 `[start, end]` 加 `inc`：`diff[start] += inc; diff[end+1] -= inc;`
- 最后对差分数组求前缀和，得到最终结果

```javascript
function getModifiedArray(length, updates) {
    const diff = new Array(length).fill(0);
    
    // 处理所有区间加法操作
    for (const [start, end, inc] of updates) {
        diff[start] += inc;
        if (end + 1 < length) {
            diff[end + 1] -= inc;
        }
    }
    
    // 前缀和还原
    const result = new Array(length);
    result[0] = diff[0];
    
    for (let i = 1; i < length; i++) {
        result[i] = result[i - 1] + diff[i];
    }
    
    return result;
}
```

## 图解执行过程

以 `length = 5, updates = [[1,3,2],[2,4,3],[0,2,-2]]` 为例：

**初始差分数组**：

```
diff = [0, 0, 0, 0, 0]
```

**操作 1：[1, 3, 2]**

```
diff[1] += 2  →  diff = [0, 2, 0, 0, 0]
diff[4] -= 2  →  diff = [0, 2, 0, 0, -2]
```

**操作 2：[2, 4, 3]**

```
diff[2] += 3  →  diff = [0, 2, 3, 0, -2]
diff[5] -= 3  →  (越界，跳过)
```

**操作 3：[0, 2, -2]**

```
diff[0] += -2  →  diff = [-2, 2, 3, 0, -2]
diff[3] -= -2  →  diff = [-2, 2, 3, 2, -2]
```

**前缀和还原**：

```
result[0] = -2
result[1] = -2 + 2 = 0
result[2] = 0 + 3 = 3
result[3] = 3 + 2 = 5
result[4] = 5 + (-2) = 3
```

最终结果：`[-2, 0, 3, 5, 3]` ✓

## 为什么差分数组有效

让我们从原理上理解差分数组的工作机制。

原始数组和差分数组的关系：

```
原数组: a[0], a[1], a[2], ..., a[n-1]
差分:   d[0], d[1], d[2], ..., d[n-1]

其中:
d[0] = a[0]
d[i] = a[i] - a[i-1]  (i > 0)
```

当我们对区间 `[left, right]` 加上 `val` 时：

- `a[left]` 增加了 `val`，而 `a[left-1]` 不变，所以 `d[left]` 增加 `val`
- `a[right]` 增加了 `val`，`a[right+1]` 不变，所以 `d[right+1]` 减少 `val`
- 区间内部：`a[i]` 和 `a[i-1]` 都增加了 `val`，差值不变

这就是为什么只需要修改两个位置的差分值。

## 复杂度分析

**时间复杂度**：O(m + n)
- 处理 m 次操作：O(m)，每次操作 O(1)
- 前缀和还原：O(n)

**空间复杂度**：O(n)，存储差分数组

## 变体：返回中间状态

如果题目要求返回每次操作后的数组状态呢？

这种情况下差分数组就不太适用了，因为差分数组的优势在于"批量处理后统一还原"。如果需要频繁查询中间状态，可以考虑线段树等更高级的数据结构。

## 小结

区间加法是差分数组最典型的应用场景。核心思路：

1. 用差分数组记录"变化量"
2. 每次区间操作只修改两个端点
3. 最后用前缀和还原结果

适用条件：
- 有大量区间修改操作
- 不需要在修改过程中查询
- 只需要最终结果
