# 实战：区域和检索（不可变）

这是前缀和技术最经典的应用场景。题目来自 LeetCode 303。

## 题目描述

给定一个整数数组 `nums`，处理以下类型的多个查询：

- 计算索引 `left` 到 `right` 之间的元素和，其中 `left <= right`

实现 `NumArray` 类：
- `NumArray(nums)` 使用数组 `nums` 初始化对象
- `sumRange(left, right)` 返回数组中索引 `left` 到 `right` 之间的元素总和

**示例**：

```
输入：
["NumArray", "sumRange", "sumRange", "sumRange"]
[[[-2, 0, 3, -5, 2, -1]], [0, 2], [2, 5], [0, 5]]

输出：[null, 1, -1, -3]

解释：
NumArray numArray = new NumArray([-2, 0, 3, -5, 2, -1]);
numArray.sumRange(0, 2); // (-2) + 0 + 3 = 1
numArray.sumRange(2, 5); // 3 + (-5) + 2 + (-1) = -1
numArray.sumRange(0, 5); // (-2) + 0 + 3 + (-5) + 2 + (-1) = -3
```

## 分析：为什么需要前缀和

最直接的想法是，每次查询都遍历 `[left, right]` 区间求和：

```javascript
class NumArray {
    constructor(nums) {
        this.nums = nums;
    }
    
    sumRange(left, right) {
        let sum = 0;
        for (let i = left; i <= right; i++) {
            sum += this.nums[i];
        }
        return sum;
    }
}
```

这个方法的问题是：每次查询都要 O(n) 时间。如果有很多次查询，效率就很低了。

题目说了"处理多个查询"，这暗示我们需要**预处理**来加速查询。前缀和正是为这种场景设计的。

## 前缀和解法

回顾前缀和的核心公式：

```
sum(left, right) = prefix[right + 1] - prefix[left]
```

其中 `prefix[i]` 表示原数组前 i 个元素的和。

```javascript
class NumArray {
    constructor(nums) {
        // 构建前缀和数组
        // prefix[i] 表示 nums[0..i-1] 的和
        this.prefix = new Array(nums.length + 1).fill(0);
        
        for (let i = 0; i < nums.length; i++) {
            this.prefix[i + 1] = this.prefix[i] + nums[i];
        }
    }
    
    sumRange(left, right) {
        // [left, right] 区间和 = prefix[right+1] - prefix[left]
        return this.prefix[right + 1] - this.prefix[left];
    }
}
```

## 图解执行过程

以 `nums = [-2, 0, 3, -5, 2, -1]` 为例：

**构建前缀和数组**：

```
原数组 nums:    [-2,  0,  3, -5,  2, -1]
索引:            0   1   2   3   4   5

前缀和 prefix:  [ 0, -2, -2,  1, -4, -2, -3]
索引:            0   1   2   3   4   5   6
```

计算过程：
- `prefix[0] = 0`（空数组的和）
- `prefix[1] = 0 + (-2) = -2`
- `prefix[2] = -2 + 0 = -2`
- `prefix[3] = -2 + 3 = 1`
- `prefix[4] = 1 + (-5) = -4`
- `prefix[5] = -4 + 2 = -2`
- `prefix[6] = -2 + (-1) = -3`

**查询 sumRange(0, 2)**：

```
sum = prefix[3] - prefix[0] = 1 - 0 = 1
```

验证：`nums[0] + nums[1] + nums[2] = -2 + 0 + 3 = 1` ✓

**查询 sumRange(2, 5)**：

```
sum = prefix[6] - prefix[2] = -3 - (-2) = -1
```

验证：`nums[2] + nums[3] + nums[4] + nums[5] = 3 + (-5) + 2 + (-1) = -1` ✓

## 为什么 prefix 长度是 n+1

你可能注意到，前缀和数组比原数组多一个元素。这是一个常用的技巧：**让 prefix[0] = 0，表示空数组的和**。

这样做的好处是：查询 `[0, right]` 时不需要特殊处理。

```
sumRange(0, right) = prefix[right + 1] - prefix[0]
                   = prefix[right + 1] - 0
                   = prefix[right + 1]
```

如果 prefix 长度只有 n，我们就需要额外判断 left 是否为 0：

```javascript
// 不推荐的写法
sumRange(left, right) {
    if (left === 0) {
        return this.prefix[right];
    }
    return this.prefix[right] - this.prefix[left - 1];
}
```

多一个元素，代码更简洁，也更不容易出错。

## 复杂度分析

**时间复杂度**：
- 预处理：O(n)，遍历数组构建前缀和
- 单次查询：O(1)，只需要一次减法

**空间复杂度**：O(n)，存储前缀和数组

## 小结

这道题是前缀和的入门题。核心思路：

1. 预处理构建前缀和数组
2. 利用 `sum(left, right) = prefix[right+1] - prefix[left]` 快速查询

当你看到"多次区间查询"时，就应该想到前缀和。
