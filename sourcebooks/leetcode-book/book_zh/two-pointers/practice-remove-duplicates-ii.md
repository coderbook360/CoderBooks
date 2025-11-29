# 实战：删除有序数组中的重复项 II

这是"删除重复项"的进阶版，允许每个元素最多出现两次。同样用快慢指针，但需要多一个判断条件。

## 问题描述

给你一个有序数组`nums`，原地删除重复出现的元素，使得每个元素**最多出现两次**，返回删除后数组的新长度。

不要使用额外的数组空间，在原地修改输入数组。

**示例**：
```
输入：nums = [1,1,1,2,2,3]
输出：5, nums = [1,1,2,2,3,_]

输入：nums = [0,0,1,1,1,1,2,3,3]
输出：7, nums = [0,0,1,1,2,3,3,_,_]
```

## 思路分析

### 回顾：每个元素最多出现一次

基础版本的条件是：

```javascript
if (nums[slow] !== nums[fast])
```

### 进阶：每个元素最多出现两次

关键洞察：**不需要和slow比较，而是和slow-2比较**。

如果`nums[fast] !== nums[slow - 2]`，说明`nums[fast]`可以放到`slow`位置。

为什么？因为数组有序，如果`nums[fast] === nums[slow - 2]`，那么`[slow-2, slow-1, slow]`至少有三个相同的数，超出限制。

## 完整实现

```javascript
/**
 * @param {number[]} nums
 * @return {number}
 */
function removeDuplicates(nums) {
    if (nums.length <= 2) return nums.length;
    
    let slow = 2;  // 前两个元素肯定保留
    
    for (let fast = 2; fast < nums.length; fast++) {
        if (nums[fast] !== nums[slow - 2]) {
            nums[slow] = nums[fast];
            slow++;
        }
    }
    
    return slow;
}
```

## 执行过程

```
nums = [1, 1, 1, 2, 2, 3]
slow = 2

fast = 2: nums[2]=1, nums[slow-2]=nums[0]=1
  1 === 1, 跳过

fast = 3: nums[3]=2, nums[slow-2]=nums[0]=1
  2 !== 1, 复制
  nums[2] = 2, slow = 3
  nums = [1, 1, 2, 2, 2, 3]

fast = 4: nums[4]=2, nums[slow-2]=nums[1]=1
  2 !== 1, 复制
  nums[3] = 2, slow = 4
  nums = [1, 1, 2, 2, 2, 3]

fast = 5: nums[5]=3, nums[slow-2]=nums[2]=2
  3 !== 2, 复制
  nums[4] = 3, slow = 5
  nums = [1, 1, 2, 2, 3, 3]

返回 5
结果数组：[1, 1, 2, 2, 3]
```

## 通用化：最多出现K次

```javascript
function removeDuplicatesK(nums, k) {
    if (nums.length <= k) return nums.length;
    
    let slow = k;
    
    for (let fast = k; fast < nums.length; fast++) {
        if (nums[fast] !== nums[slow - k]) {
            nums[slow] = nums[fast];
            slow++;
        }
    }
    
    return slow;
}

// k=1: 每个元素最多出现1次
// k=2: 每个元素最多出现2次
// k=3: 每个元素最多出现3次
```

## 为什么和slow-2比较？

让我用例子说明：

```
假设 slow = 4, nums = [1, 1, 2, 2, ...]
                       ↑     ↑
                    slow-2  slow

要判断 nums[fast] 能否放到 slow 位置：
- 如果 nums[fast] === nums[slow-2]
  → 说明 nums[slow-2], nums[slow-1], nums[fast] 都相同
  → 放入后会有三个相同的数，不行

- 如果 nums[fast] !== nums[slow-2]
  → 最多两个相同，可以放入
```

## 复杂度分析

**时间复杂度**：O(n)
- 一次遍历

**空间复杂度**：O(1)
- 只用了两个指针

## 小结

删除重复项II的要点：

1. **快慢指针**：slow标记结果位置，fast遍历
2. **和slow-2比较**：而不是和slow或slow-1比较
3. **前k个直接保留**：从位置k开始处理
4. **通用公式**：最多出现k次 → 和slow-k比较

这个技巧可以推广到任意k次的情况。
