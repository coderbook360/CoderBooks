# 实战：航班预订统计

这道题来自 LeetCode 1109，是差分数组的经典应用场景。

## 题目描述

这里有 `n` 个航班，它们分别从 `1` 到 `n` 进行编号。

有一份航班预订表 `bookings`，表中第 `i` 条预订记录 `bookings[i] = [first, last, seats]` 表示在从 `first` 到 `last`（**包含 first 和 last**）的**每个航班**上预订了 `seats` 个座位。

请你返回一个长度为 `n` 的数组 `answer`，里面的元素是每个航班预定的座位总数。

**示例**：

```
输入：bookings = [[1,2,10],[2,3,20],[2,5,25]], n = 5
输出：[10,55,45,25,25]

解释：
航班编号:      1   2   3   4   5
预订 1:       10  10
预订 2:           20  20
预订 3:           25  25  25  25
总座位数:     10  55  45  25  25
```

## 问题分析

如果用暴力方法，每次预订都遍历对应区间：

```javascript
function corpFlightBookings(bookings, n) {
    const answer = new Array(n).fill(0);
    
    for (const [first, last, seats] of bookings) {
        for (let i = first; i <= last; i++) {
            answer[i - 1] += seats; // 注意航班编号从 1 开始
        }
    }
    
    return answer;
}
```

时间复杂度 O(m × n)，当预订数量和航班数量都很大时会超时。

这正是差分数组的典型场景：**大量区间修改，最后统一查询**。

## 差分数组解法

```javascript
function corpFlightBookings(bookings, n) {
    // 构建差分数组
    const diff = new Array(n).fill(0);
    
    for (const [first, last, seats] of bookings) {
        // 注意：航班编号从 1 开始，转换为数组索引要 -1
        diff[first - 1] += seats;
        if (last < n) {
            diff[last] -= seats;
        }
    }
    
    // 前缀和还原
    const answer = new Array(n);
    answer[0] = diff[0];
    
    for (let i = 1; i < n; i++) {
        answer[i] = answer[i - 1] + diff[i];
    }
    
    return answer;
}
```

## 图解执行过程

以示例为例：`bookings = [[1,2,10],[2,3,20],[2,5,25]], n = 5`

**初始差分数组**：

```
diff = [0, 0, 0, 0, 0]
索引:   0  1  2  3  4
航班:   1  2  3  4  5
```

**预订 1：[1, 2, 10]**

first = 1，last = 2，seats = 10

```
diff[0] += 10  →  diff = [10, 0, 0, 0, 0]
diff[2] -= 10  →  diff = [10, 0, -10, 0, 0]
```

**预订 2：[2, 3, 20]**

first = 2，last = 3，seats = 20

```
diff[1] += 20  →  diff = [10, 20, -10, 0, 0]
diff[3] -= 20  →  diff = [10, 20, -10, -20, 0]
```

**预订 3：[2, 5, 25]**

first = 2，last = 5，seats = 25

```
diff[1] += 25  →  diff = [10, 45, -10, -20, 0]
diff[5] -= 25  →  (越界，跳过)
```

**前缀和还原**：

```
answer[0] = 10
answer[1] = 10 + 45 = 55
answer[2] = 55 + (-10) = 45
answer[3] = 45 + (-20) = 25
answer[4] = 25 + 0 = 25
```

结果：`[10, 55, 45, 25, 25]` ✓

## 为什么 diff[last] 要用 last 而不是 last - 1

这里有个容易混淆的地方。

在标准的差分数组公式中：

```
对区间 [left, right] 加 val:
diff[left] += val
diff[right + 1] -= val
```

本题中：
- `first` 和 `last` 是航班编号（从 1 开始）
- 数组索引从 0 开始

所以区间 `[first, last]` 对应数组索引 `[first-1, last-1]`。

应用差分公式：
- `diff[first - 1] += seats`
- `diff[(last - 1) + 1] -= seats` = `diff[last] -= seats`

这就是为什么代码中用 `diff[last]` 而不是 `diff[last - 1]`。

## 复杂度分析

**时间复杂度**：O(m + n)
- 处理 m 条预订记录：O(m)
- 前缀和还原：O(n)

**空间复杂度**：O(n)，差分数组

## 实际意义

这道题模拟了航班预订系统的核心操作。在实际系统中，可能需要：

1. 实时更新预订（用差分数组记录变化）
2. 定期生成报表（求前缀和得到每个航班的实际预订量）

差分数组让"批量更新"变得高效，是处理区间修改问题的利器。

## 小结

航班预订问题是差分数组的标准应用：

1. 把"区间加"操作转化为"端点修改"
2. 每次区间操作 O(1) 时间
3. 最后一次性前缀和还原

注意索引转换：航班编号从 1 开始，数组从 0 开始。
