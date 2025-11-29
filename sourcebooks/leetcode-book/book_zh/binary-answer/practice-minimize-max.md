# 实战：最小化最大值

"最小化最大值"是二分答案最经典的应用场景。

## 问题描述

给你一个下标从0开始的数组`nums`，它含有`n`个非负整数。

每一步操作中，你可以：
- 选择一个下标`i`，其中`i < n - 1`
- 将`nums[i]`变成`nums[i] + 1`
- 将`nums[i + 1]`变成`nums[i + 1] - 1`

你的目标是**最小化**数组中**最大值**与**最小值**的差值。

返回若干次操作后可能的最小差值。

## 思路分析

### 问题转化

原问题是最小化`max - min`。但直接优化很难，因为操作会同时影响两个相邻元素。

换个角度：如果我们固定最大值的上限`x`和最小值的下限`y`，能否通过操作实现？

进一步简化：假设我们只关注能否让所有元素都不超过某个值`x`，这个问题更容易判断。

### 二分策略

二分"最大值的上界"，对于每个候选值，判断能否让所有元素都不超过它。

## 判断函数

如何判断能否让所有元素都`≤ target`？

关键观察：操作只能把值从左向右"推"。如果某个位置超过target，只能把多余的部分推给右边的元素。

```javascript
function canAchieve(nums, target) {
    const n = nums.length;
    const arr = [...nums];
    
    for (let i = 0; i < n - 1; i++) {
        if (arr[i] > target) {
            const excess = arr[i] - target;
            arr[i] = target;
            arr[i + 1] += excess;
        }
    }
    
    // 最后一个元素没有地方推了
    return arr[n - 1] <= target;
}
```

## 完整实现

```javascript
function minimizeArrayValue(nums) {
    let left = Math.min(...nums);
    let right = Math.max(...nums);
    
    while (left < right) {
        const mid = left + Math.floor((right - left) / 2);
        
        if (canAchieve(nums, mid)) {
            right = mid;
        } else {
            left = mid + 1;
        }
    }
    
    return left;
}

function canAchieve(nums, target) {
    let excess = 0;
    
    for (const num of nums) {
        // 当前值加上前面推过来的
        const current = num + excess;
        
        if (current > target) {
            // 超出的部分要推给后面
            excess = current - target;
        } else {
            // 可以吸收一些，但不能吸收超过自己的差值
            // 注意：不能变成负数
            excess = 0;
        }
    }
    
    // 最后是否还有剩余
    return excess === 0;
}
```

等等，上面的判断函数有问题。让我重新思考。

实际上，操作可以把`nums[i]`的一部分转移给`nums[i+1]`。所以：
- 如果某个位置的值超过target，可以把多余部分推给右边
- 如果某个位置的值小于target，可以从左边"借"一些

更准确的判断：

```javascript
function canAchieve(nums, target) {
    let sum = 0;
    
    for (let i = 0; i < nums.length; i++) {
        sum += nums[i];
        // 前i+1个元素的和，不能超过(i+1)*target
        if (sum > (i + 1) * target) {
            return false;
        }
    }
    
    return true;
}
```

为什么这样判断？因为前缀和不能超过容量限制。

## 修正后的完整代码

```javascript
function minimizeArrayValue(nums) {
    let left = 0;
    let right = Math.max(...nums);
    
    while (left < right) {
        const mid = left + Math.floor((right - left) / 2);
        
        if (canAchieve(nums, mid)) {
            right = mid;
        } else {
            left = mid + 1;
        }
    }
    
    return left;
}

function canAchieve(nums, target) {
    let sum = 0;
    
    for (let i = 0; i < nums.length; i++) {
        sum += nums[i];
        if (sum > (BigInt(i) + 1n) * BigInt(target)) {
            return false;
        }
    }
    
    return true;
}
```

## 核心洞察

判断函数的关键在于理解"前缀和约束"：
- 前1个元素，最多承载`1 * target`
- 前2个元素，最多承载`2 * target`
- 前i个元素，最多承载`i * target`

如果某个前缀和超过了容量，说明target太小。

## 复杂度分析

**时间复杂度**：O(n * log(max))

**空间复杂度**：O(1)

## 小结

"最小化最大值"类问题的解题模式：
1. 二分最大值的上界
2. 设计判断函数：能否让所有值不超过target
3. 判断函数通常需要一些巧妙的观察（如本题的前缀和约束）
