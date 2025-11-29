# 实战：长度最小的子数组

这道题虽然常被归类为滑动窗口，但本质上也是双指针的应用。它展示了如何用双指针维护一个动态区间。

## 问题描述

给定一个含有`n`个正整数的数组和一个正整数`target`，找出该数组中满足其和`≥ target`的长度最小的**连续子数组**，并返回其长度。如果不存在，返回0。

**示例**：
```
输入：target = 7, nums = [2,3,1,2,4,3]
输出：2
解释：子数组 [4,3] 是最短的

输入：target = 4, nums = [1,4,4]
输出：1

输入：target = 11, nums = [1,1,1,1,1,1,1,1]
输出：0
```

## 思路分析

### 暴力思路

枚举所有子数组，检查和是否`≥ target`：

```javascript
function minSubArrayLen(target, nums) {
    let minLen = Infinity;
    for (let i = 0; i < nums.length; i++) {
        let sum = 0;
        for (let j = i; j < nums.length; j++) {
            sum += nums[j];
            if (sum >= target) {
                minLen = Math.min(minLen, j - i + 1);
                break;  // 找到了，不用继续
            }
        }
    }
    return minLen === Infinity ? 0 : minLen;
}
```

时间O(n²)，可以优化。

### 双指针（滑动窗口）思路

维护一个区间`[left, right]`，使区间和尽量接近target：

1. 扩展`right`，增加元素，直到和`≥ target`
2. 收缩`left`，减少元素，直到和`< target`
3. 在满足条件时更新最小长度

关键：数组元素都是**正整数**，所以：
- 区间扩大，和增大
- 区间缩小，和减小

这保证了双指针的单调性。

## 完整实现

```javascript
/**
 * @param {number} target
 * @param {number[]} nums
 * @return {number}
 */
function minSubArrayLen(target, nums) {
    let left = 0;
    let sum = 0;
    let minLen = Infinity;
    
    for (let right = 0; right < nums.length; right++) {
        // 扩展窗口
        sum += nums[right];
        
        // 收缩窗口，尽量缩小长度
        while (sum >= target) {
            minLen = Math.min(minLen, right - left + 1);
            sum -= nums[left];
            left++;
        }
    }
    
    return minLen === Infinity ? 0 : minLen;
}
```

## 执行过程

```
target = 7, nums = [2, 3, 1, 2, 4, 3]

right = 0: sum = 2, sum < 7
right = 1: sum = 5, sum < 7
right = 2: sum = 6, sum < 7
right = 3: sum = 8, sum >= 7
  minLen = 4 (区间[0,3])
  sum -= 2, left = 1, sum = 6 < 7

right = 4: sum = 10, sum >= 7
  minLen = min(4, 4) = 4 (区间[1,4])
  sum -= 3, left = 2, sum = 7 >= 7
  minLen = min(4, 3) = 3 (区间[2,4])
  sum -= 1, left = 3, sum = 6 < 7

right = 5: sum = 9, sum >= 7
  minLen = min(3, 3) = 3 (区间[3,5])
  sum -= 2, left = 4, sum = 7 >= 7
  minLen = min(3, 2) = 2 (区间[4,5])
  sum -= 4, left = 5, sum = 3 < 7

结果：2
```

## 为什么双指针有效？

因为数组元素都是**正整数**：

1. **right右移**：sum只会增大
2. **left右移**：sum只会减小
3. **单调性保证**：不会错过最优解

如果有负数，这个方法就不适用了（需要用其他方法）。

## 变体：二分查找

用前缀和 + 二分查找：

```javascript
function minSubArrayLen(target, nums) {
    const n = nums.length;
    // 前缀和
    const prefix = new Array(n + 1).fill(0);
    for (let i = 0; i < n; i++) {
        prefix[i + 1] = prefix[i] + nums[i];
    }
    
    let minLen = Infinity;
    
    for (let i = 0; i < n; i++) {
        // 找最小的j使得 prefix[j] - prefix[i] >= target
        // 即 prefix[j] >= prefix[i] + target
        const targetSum = prefix[i] + target;
        const j = lowerBound(prefix, targetSum);
        
        if (j <= n) {
            minLen = Math.min(minLen, j - i);
        }
    }
    
    return minLen === Infinity ? 0 : minLen;
}

function lowerBound(arr, target) {
    let left = 0, right = arr.length;
    while (left < right) {
        const mid = (left + right) >> 1;
        if (arr[mid] < target) {
            left = mid + 1;
        } else {
            right = mid;
        }
    }
    return left;
}
```

时间O(n log n)，不如双指针O(n)好，但适用于有负数的情况（需要单调队列优化）。

## 复杂度分析

**双指针解法**：
- 时间复杂度：O(n)
- 空间复杂度：O(1)

**二分查找解法**：
- 时间复杂度：O(n log n)
- 空间复杂度：O(n)

## 小结

长度最小子数组的要点：

1. **双指针维护区间**：right扩展，left收缩
2. **正整数保证单调性**：区间和随区间大小单调变化
3. **在满足条件时收缩**：尽量找到最短的区间
4. **循环不变量**：`[left, right]`区间的和就是sum

这是滑动窗口的典型应用，核心思想是利用问题的单调性来避免重复计算。
