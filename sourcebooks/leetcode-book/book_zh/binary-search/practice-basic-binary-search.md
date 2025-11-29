# 实战：基础二分查找

这是最基本的二分查找题目，用于验证你对核心算法的理解。

## 问题描述

给定一个`n`个元素有序的（升序）整型数组`nums`和一个目标值`target`，写一个函数搜索`nums`中的`target`，如果目标值存在返回下标，否则返回`-1`。

**示例**：
```
输入：nums = [-1,0,3,5,9,12], target = 9
输出：4
解释：9 出现在 nums 中，下标为 4

输入：nums = [-1,0,3,5,9,12], target = 2
输出：-1
解释：2 不存在 nums 中
```

## 完整实现

```javascript
/**
 * @param {number[]} nums
 * @param {number} target
 * @return {number}
 */
function search(nums, target) {
    let left = 0;
    let right = nums.length - 1;
    
    while (left <= right) {
        const mid = left + Math.floor((right - left) / 2);
        
        if (nums[mid] === target) {
            return mid;
        } else if (nums[mid] < target) {
            left = mid + 1;
        } else {
            right = mid - 1;
        }
    }
    
    return -1;
}
```

## 执行过程

```
nums = [-1, 0, 3, 5, 9, 12], target = 9

初始：left=0, right=5

step 1:
  mid = 0 + (5-0)/2 = 2
  nums[2] = 3 < 9
  left = 3

step 2:
  mid = 3 + (5-3)/2 = 4
  nums[4] = 9 = target
  返回 4
```

```
nums = [-1, 0, 3, 5, 9, 12], target = 2

初始：left=0, right=5

step 1:
  mid = 2, nums[2] = 3 > 2
  right = 1

step 2:
  mid = 0, nums[0] = -1 < 2
  left = 1

step 3:
  mid = 1, nums[1] = 0 < 2
  left = 2

left = 2 > right = 1, 循环结束
返回 -1
```

## 为什么正确？

### 循环不变量

在每次循环开始时：**如果target存在于nums中，它一定在区间[left, right]内**。

### 终止条件

当`left > right`时，区间为空，target不存在。

### 正确性

- 如果`nums[mid] === target`：直接返回
- 如果`nums[mid] < target`：target在右半边，`left = mid + 1`保持不变量
- 如果`nums[mid] > target`：target在左半边，`right = mid - 1`保持不变量

## 常见错误

### 错误1：溢出

```javascript
// 错误
const mid = (left + right) / 2;

// 正确
const mid = left + Math.floor((right - left) / 2);
```

### 错误2：循环条件

```javascript
// 错误：会漏掉 left === right 的情况
while (left < right)

// 正确
while (left <= right)
```

### 错误3：边界更新

```javascript
// 错误：可能导致死循环或跳过元素
left = mid;
right = mid;

// 正确
left = mid + 1;
right = mid - 1;
```

## 复杂度分析

**时间复杂度**：O(log n)
- 每次迭代排除一半的元素

**空间复杂度**：O(1)
- 只用了几个变量

## 小结

基础二分查找的要点：

1. **区间定义**：`[left, right]`闭区间
2. **循环条件**：`left <= right`
3. **边界更新**：`left = mid + 1`，`right = mid - 1`
4. **中点计算**：`left + (right - left) / 2`防止溢出

这是所有二分查找的基础，必须牢固掌握。
