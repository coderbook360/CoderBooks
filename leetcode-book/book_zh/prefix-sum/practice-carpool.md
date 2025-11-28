# 实战：拼车

这道题来自 LeetCode 1094，同样是差分数组的应用，但多了一个容量限制的判断。

## 题目描述

车上最初有 `capacity` 个空座位。车只能向一个方向行驶（不允许掉头或改变方向）。

给定整数 `capacity` 和一个数组 `trips`，其中 `trips[i] = [numPassengers, from, to]` 表示第 `i` 次旅行有 `numPassengers` 个乘客，接他们和放他们下车的位置分别是 `from` 和 `to`。这些位置是从汽车的初始位置向东的公里数。

当且仅当你可以在所有给定的行程中接送所有乘客时，返回 `true`，否则返回 `false`。

**示例 1**：

```
输入：trips = [[2,1,5],[3,3,7]], capacity = 4
输出：false
解释：在位置 3，车上有 2 + 3 = 5 位乘客，超过了容量 4。
```

**示例 2**：

```
输入：trips = [[2,1,5],[3,3,7]], capacity = 5
输出：true
```

## 问题分析

这道题的关键点：

1. 乘客在 `from` 位置**上车**
2. 乘客在 `to` 位置**下车**（到达 `to` 时已经不在车上了）
3. 需要判断在任意时刻车上乘客数是否超过容量

把"每个位置的乘客数"类比成"每个航班的座位数"，这就是差分数组的场景。

唯一的区别是：乘客在 `to` 位置下车，所以在 `to` 位置时乘客已经不在车上了。

## 差分数组解法

```javascript
function carPooling(trips, capacity) {
    // 题目约束：位置范围是 [0, 1000]
    const diff = new Array(1001).fill(0);
    
    for (const [numPassengers, from, to] of trips) {
        // from 位置上车
        diff[from] += numPassengers;
        // to 位置下车（注意不是 to + 1）
        diff[to] -= numPassengers;
    }
    
    // 前缀和，同时检查是否超载
    let passengers = 0;
    
    for (let i = 0; i < 1001; i++) {
        passengers += diff[i];
        if (passengers > capacity) {
            return false;
        }
    }
    
    return true;
}
```

## 为什么是 diff[to] 而不是 diff[to + 1]

这是这道题最容易出错的地方。

在航班预订问题中，乘客在区间 `[first, last]` **包含两端**都占用座位，所以：

```
diff[first] += seats
diff[last + 1] -= seats
```

但在拼车问题中，乘客在 `to` 位置**下车**，也就是说在 `to` 位置时乘客已经不在车上了。

所以区间是 `[from, to)`，左闭右开：

```
diff[from] += numPassengers
diff[to] -= numPassengers  // 不是 to + 1
```

## 图解执行过程

以 `trips = [[2,1,5],[3,3,7]], capacity = 4` 为例：

**处理 trip 1：[2, 1, 5]**

2 名乘客，从位置 1 上车，位置 5 下车

```
diff[1] += 2
diff[5] -= 2
```

**处理 trip 2：[3, 3, 7]**

3 名乘客，从位置 3 上车，位置 7 下车

```
diff[3] += 3
diff[7] -= 3
```

**差分数组状态**：

```
位置: 0  1  2  3  4  5  6  7
diff: 0  2  0  3  0 -2  0 -3
```

**前缀和检查**：

```
位置 0: passengers = 0 <= 4 ✓
位置 1: passengers = 2 <= 4 ✓
位置 2: passengers = 2 <= 4 ✓
位置 3: passengers = 5 > 4 ✗ 超载！
```

返回 `false`。

## 优化：动态确定范围

上面的代码固定了数组大小为 1001。如果题目的位置范围更大，可以：

1. 先遍历一次找最大位置
2. 或者使用 Map 代替数组

```javascript
function carPooling(trips, capacity) {
    const diff = new Map();
    let maxPosition = 0;
    
    for (const [numPassengers, from, to] of trips) {
        diff.set(from, (diff.get(from) || 0) + numPassengers);
        diff.set(to, (diff.get(to) || 0) - numPassengers);
        maxPosition = Math.max(maxPosition, to);
    }
    
    // 需要按位置顺序遍历
    const positions = [...diff.keys()].sort((a, b) => a - b);
    
    let passengers = 0;
    for (const pos of positions) {
        passengers += diff.get(pos);
        if (passengers > capacity) {
            return false;
        }
    }
    
    return true;
}
```

## 复杂度分析

**数组版本**：
- 时间复杂度：O(n + m)，n 是位置范围，m 是行程数
- 空间复杂度：O(n)

**Map 版本**：
- 时间复杂度：O(m log m)，主要是排序开销
- 空间复杂度：O(m)

## 与航班预订的对比

| 题目 | 区间类型 | 差分操作 | 目标 |
|-----|---------|---------|-----|
| 航班预订 | [first, last] 闭区间 | diff[first]++, diff[last+1]-- | 求每个航班的座位数 |
| 拼车 | [from, to) 左闭右开 | diff[from]++, diff[to]-- | 判断是否超载 |

关键区别在于**区间的右端点是否包含**。

## 小结

拼车问题是差分数组的变体应用：

1. 区间是左闭右开 `[from, to)`
2. 需要在还原过程中检查约束条件
3. 发现超载可以提前返回

理解"上车"和"下车"的位置关系，是正确解题的关键。
