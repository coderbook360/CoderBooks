# 实战：摆动序列

这道题展示了贪心在子序列问题中的应用。

## 问题描述

如果连续数字之间的差严格地在正数和负数之间交替，则数字序列称为**摆动序列**。第一个差（如果存在的话）可能是正数或负数。

给你一个整数数组`nums`，返回`nums`中作为**摆动序列**的最长子序列的长度。

子序列可以通过从原始序列中删除一些元素（也可以不删除）来获得。

## 思路分析

### 什么是摆动序列？

差值的符号交替：正、负、正、负... 或 负、正、负、正...

例如：[1, 7, 4, 9, 2, 5] 是摆动序列，差值为 [6, -3, 5, -7, 3]。

### 贪心洞察

在每一段单调区间中，只取两个端点（峰或谷）就够了。

中间的点删掉不会影响摆动性质，反而可能增加后续的灵活性。

### 视觉直觉

把数组画成折线图，摆动序列就是所有的"拐点"（峰和谷）。

## 代码实现

```javascript
function wiggleMaxLength(nums) {
    const n = nums.length;
    if (n < 2) return n;
    
    let count = 1;
    let prevDiff = 0;
    
    for (let i = 1; i < n; i++) {
        const diff = nums[i] - nums[i - 1];
        
        // 发生了"拐点"
        if ((diff > 0 && prevDiff <= 0) || (diff < 0 && prevDiff >= 0)) {
            count++;
            prevDiff = diff;
        }
    }
    
    return count;
}
```

## 图解

```
nums = [1, 7, 4, 9, 2, 5]

差值: [6, -3, 5, -7, 3]

遍历过程:
i=1: diff=6 > 0, prevDiff=0, 拐点! count=2, prevDiff=6
i=2: diff=-3 < 0, prevDiff=6 > 0, 拐点! count=3, prevDiff=-3
i=3: diff=5 > 0, prevDiff=-3 < 0, 拐点! count=4, prevDiff=5
i=4: diff=-7 < 0, prevDiff=5 > 0, 拐点! count=5, prevDiff=-7
i=5: diff=3 > 0, prevDiff=-7 < 0, 拐点! count=6, prevDiff=3

结果: 6
```

```
nums = [1, 2, 3, 4, 5]

差值: [1, 1, 1, 1]

遍历过程:
i=1: diff=1 > 0, prevDiff=0, 拐点! count=2, prevDiff=1
i=2: diff=1 > 0, prevDiff=1 > 0, 不是拐点
i=3: diff=1 > 0, prevDiff=1 > 0, 不是拐点
i=4: diff=1 > 0, prevDiff=1 > 0, 不是拐点

结果: 2  (只有首尾两个点)
```

## 为什么贪心是对的？

### 直觉

每个"峰"和"谷"都应该保留，中间单调的部分可以删掉。

删掉中间点不会影响拐点的数量，还可能让拐点更"尖锐"（差值更大）。

### 证明

假设最优解没有选择某个峰A，而选择了A附近的点B。

由于A是峰，B要么在A的"上坡"，要么在A的"下坡"。

把B换成A，不会影响摆动性质，因为A比B更"极端"。

所以选择所有峰和谷是最优的。

## 边界情况

### 全相等

```
nums = [1, 1, 1, 1]
结果: 1  (只能选一个点)
```

### 两个元素

```
nums = [1, 2]
结果: 2  (两个点本身就是摆动序列)

nums = [1, 1]
结果: 1  (相等不算摆动)
```

## 动态规划解法（对比）

```javascript
function wiggleMaxLength(nums) {
    const n = nums.length;
    if (n < 2) return n;
    
    let up = 1;    // 以上升结尾的最长摆动序列
    let down = 1;  // 以下降结尾的最长摆动序列
    
    for (let i = 1; i < n; i++) {
        if (nums[i] > nums[i - 1]) {
            up = down + 1;
        } else if (nums[i] < nums[i - 1]) {
            down = up + 1;
        }
    }
    
    return Math.max(up, down);
}
```

DP解法和贪心解法等价，但贪心更直观。

## 复杂度分析

**时间复杂度**：O(n)

**空间复杂度**：O(1)

## 小结

摆动序列展示了贪心在子序列问题中的应用：
1. 抓住"峰"和"谷"的直觉
2. 只统计拐点的数量
3. O(n)时间O(1)空间的简洁解法
