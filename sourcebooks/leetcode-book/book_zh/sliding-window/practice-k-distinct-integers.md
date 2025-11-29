# 实战：K个不同整数的子数组

这道题是"最多K种元素"的进阶版——要求**恰好K种**。需要一个巧妙的转化技巧。

## 问题描述

给定一个正整数数组`nums`和一个整数`k`，返回`nums`中**恰好**包含`k`个不同整数的子数组的个数。

**示例**：
```
输入：nums = [1,2,1,2,3], k = 2
输出：7
解释：恰好有 2 个不同整数的子数组：
[1,2], [2,1], [1,2], [2,3], [1,2,1], [2,1,2], [1,2,1,2]

输入：nums = [1,2,1,3,4], k = 3
输出：3
```

## 思路分析

### 直接计数的困难

"恰好K种"不像"最多K种"那样有单调性。窗口扩大，种类可能增加也可能不变；窗口缩小同理。

### 转化技巧

**恰好K种 = 最多K种 - 最多(K-1)种**

用滑动窗口可以很容易计算"最多K种"的子数组数量，然后做减法。

## 完整实现

```javascript
/**
 * @param {number[]} nums
 * @param {number} k
 * @return {number}
 */
function subarraysWithKDistinct(nums, k) {
    return atMostK(nums, k) - atMostK(nums, k - 1);
}

// 计算最多有k种不同整数的子数组个数
function atMostK(nums, k) {
    const count = new Map();
    let left = 0;
    let result = 0;
    
    for (let right = 0; right < nums.length; right++) {
        // 扩展窗口
        count.set(nums[right], (count.get(nums[right]) || 0) + 1);
        
        // 超过k种时收缩
        while (count.size > k) {
            const leftNum = nums[left];
            count.set(leftNum, count.get(leftNum) - 1);
            if (count.get(leftNum) === 0) {
                count.delete(leftNum);
            }
            left++;
        }
        
        // 以right结尾、最多k种不同整数的子数组个数
        result += right - left + 1;
    }
    
    return result;
}
```

## 为什么 result += right - left + 1？

当窗口是`[left, right]`时，所有以`right`结尾的子数组都满足"最多K种"：
- `[left, right]`
- `[left+1, right]`
- ...
- `[right, right]`

共`right - left + 1`个。

## 执行过程

```
nums = [1, 2, 1, 2, 3], k = 2

计算 atMostK(nums, 2)：
right=0: count={1:1}, result+=1, result=1
right=1: count={1:1,2:1}, result+=2, result=3
right=2: count={1:2,2:1}, result+=3, result=6
right=3: count={1:2,2:2}, result+=4, result=10
right=4: count={1:2,2:2,3:1}, size>2
  收缩：count={1:1,2:2,3:1}, left=1, size>2
  收缩：count={2:2,3:1}, left=2, size=2
  result+=3, result=13

atMostK(nums, 2) = 13

计算 atMostK(nums, 1)：
right=0: count={1:1}, result+=1, result=1
right=1: count={1:1,2:1}, size>1
  收缩：count={2:1}, left=1
  result+=1, result=2
right=2: count={2:1,1:1}, size>1
  收缩：count={1:1}, left=2
  result+=1, result=3
right=3: count={1:1,2:1}, size>1
  收缩：count={2:1}, left=3
  result+=1, result=4
right=4: count={2:1,3:1}, size>1
  收缩：count={3:1}, left=4
  result+=1, result=5

atMostK(nums, 1) = 6

结果：13 - 6 = 7
```

## 另一种思路：双指针记录范围

也可以用两个左指针，分别表示"最多K种"和"最多K-1种"的边界：

```javascript
function subarraysWithKDistinct(nums, k) {
    const count1 = new Map();  // 用于最多k种
    const count2 = new Map();  // 用于最多k-1种
    let left1 = 0, left2 = 0;
    let result = 0;
    
    for (let right = 0; right < nums.length; right++) {
        // 扩展两个窗口
        count1.set(nums[right], (count1.get(nums[right]) || 0) + 1);
        count2.set(nums[right], (count2.get(nums[right]) || 0) + 1);
        
        // 收缩窗口1到最多k种
        while (count1.size > k) {
            count1.set(nums[left1], count1.get(nums[left1]) - 1);
            if (count1.get(nums[left1]) === 0) count1.delete(nums[left1]);
            left1++;
        }
        
        // 收缩窗口2到最多k-1种
        while (count2.size > k - 1) {
            count2.set(nums[left2], count2.get(nums[left2]) - 1);
            if (count2.get(nums[left2]) === 0) count2.delete(nums[left2]);
            left2++;
        }
        
        // [left1, right]满足最多k种
        // [left2, right]满足最多k-1种
        // 恰好k种的数量 = left2 - left1
        result += left2 - left1;
    }
    
    return result;
}
```

## 复杂度分析

**时间复杂度**：O(n)
- 调用两次atMostK，每次O(n)

**空间复杂度**：O(n)
- Map最坏情况存储n个不同的数

## 小结

K个不同整数子数组的要点：

1. **转化技巧**：恰好K = 最多K - 最多(K-1)
2. **计数方法**：以right结尾的子数组个数 = right - left + 1
3. **两种实现**：分别计算再相减，或同时维护两个窗口

这个"恰好"到"最多"的转化技巧非常有用，可以解决很多类似问题。
