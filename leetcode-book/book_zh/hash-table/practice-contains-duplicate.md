# 实战：存在重复元素

这是哈希表最简单的应用之一——用Set检测重复。一行代码搞定！

## 问题描述

给你一个整数数组`nums`。如果任一值在数组中出现**至少两次**，返回`true`；如果数组中每个元素互不相同，返回`false`。

**示例**：
```
输入: nums = [1,2,3,1]
输出: true
解释: 1出现了两次

输入: nums = [1,2,3,4]
输出: false

输入: nums = [1,1,1,3,3,4,3,2,4,2]
输出: true
```

## 思路分析

检测重复的本质：**是否有元素出现多于一次**。

方法有很多：
1. 暴力：双重循环O(n²)
2. 排序：相邻元素比较O(n log n)
3. **哈希表**：O(n)

## 方法一：Set一行代码

```javascript
/**
 * @param {number[]} nums
 * @return {boolean}
 */
function containsDuplicate(nums) {
    return new Set(nums).size !== nums.length;
}
```

**原理**：Set自动去重。如果去重后的元素数量少于原数组长度，说明有重复。

## 方法二：边遍历边检查

```javascript
function containsDuplicate(nums) {
    const seen = new Set();
    
    for (const num of nums) {
        if (seen.has(num)) {
            return true;  // 发现重复，立即返回
        }
        seen.add(num);
    }
    
    return false;
}
```

这种方法在发现第一个重复时就返回，平均情况下更快。

## 执行过程图解

以`nums = [1,2,3,1]`为例（方法二）：

```
num = 1:
  seen = {}
  1 不在 seen 中
  seen = {1}

num = 2:
  seen = {1}
  2 不在 seen 中
  seen = {1, 2}

num = 3:
  seen = {1, 2}
  3 不在 seen 中
  seen = {1, 2, 3}

num = 1:
  seen = {1, 2, 3}
  1 在 seen 中！
  返回 true
```

## 方法三：排序

```javascript
function containsDuplicate(nums) {
    nums.sort((a, b) => a - b);
    
    for (let i = 1; i < nums.length; i++) {
        if (nums[i] === nums[i - 1]) {
            return true;
        }
    }
    
    return false;
}
```

排序后重复元素相邻，只需检查相邻元素。

## 三种方法对比

| 方法 | 时间复杂度 | 空间复杂度 | 特点 |
|------|------------|------------|------|
| Set一行 | O(n) | O(n) | 最简洁 |
| 边遍历边检查 | O(n)平均 | O(n) | 可能提前返回 |
| 排序 | O(n log n) | O(1)或O(n) | 空间优（原地排序） |

## 变体：存在重复元素II

LeetCode 219：判断是否存在`nums[i] == nums[j]`且`|i - j| <= k`。

```javascript
function containsNearbyDuplicate(nums, k) {
    const map = new Map();  // 值 → 最近索引
    
    for (let i = 0; i < nums.length; i++) {
        if (map.has(nums[i]) && i - map.get(nums[i]) <= k) {
            return true;
        }
        map.set(nums[i], i);
    }
    
    return false;
}
```

**或者使用滑动窗口Set**：

```javascript
function containsNearbyDuplicate(nums, k) {
    const window = new Set();
    
    for (let i = 0; i < nums.length; i++) {
        if (window.has(nums[i])) {
            return true;
        }
        window.add(nums[i]);
        
        // 维护窗口大小为k
        if (window.size > k) {
            window.delete(nums[i - k]);
        }
    }
    
    return false;
}
```

## 变体：存在重复元素III

LeetCode 220：判断是否存在`nums[i]`和`nums[j]`满足：
- `|i - j| <= k`
- `|nums[i] - nums[j]| <= t`

这需要用到**桶排序**或**有序集合**的思想，更复杂。

```javascript
function containsNearbyAlmostDuplicate(nums, k, t) {
    const getBucket = (num, size) => Math.floor(num / size);
    
    const buckets = new Map();
    const size = t + 1;  // 桶大小
    
    for (let i = 0; i < nums.length; i++) {
        const bucket = getBucket(nums[i], size);
        
        // 同一个桶内的元素差值一定 <= t
        if (buckets.has(bucket)) return true;
        
        // 相邻桶可能满足条件
        if (buckets.has(bucket - 1) && 
            Math.abs(nums[i] - buckets.get(bucket - 1)) < size) {
            return true;
        }
        if (buckets.has(bucket + 1) && 
            Math.abs(nums[i] - buckets.get(bucket + 1)) < size) {
            return true;
        }
        
        buckets.set(bucket, nums[i]);
        
        // 维护窗口大小为k
        if (i >= k) {
            buckets.delete(getBucket(nums[i - k], size));
        }
    }
    
    return false;
}
```

## 复杂度分析

**存在重复元素（基础版）**：
- 时间复杂度：O(n)
- 空间复杂度：O(n)

## 小结

存在重复元素的核心：

1. **Set去重**：利用Set的去重特性
2. **一行代码**：`new Set(nums).size !== nums.length`
3. **变体扩展**：距离约束用滑动窗口，值约束用桶

这道题虽然简单，但它的变体（II和III）逐步增加约束条件，体现了算法设计的层层递进。
