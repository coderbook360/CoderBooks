# 二分查找基础理论

二分查找是最重要的算法之一。它通过每次排除一半的可能性，将O(n)的线性搜索优化到O(log n)。

## 什么是二分查找？

在有序数组中查找目标值：
1. 比较中间元素与目标
2. 如果相等，找到了
3. 如果目标更小，在左半边继续
4. 如果目标更大，在右半边继续

每次比较都排除一半的元素，所以只需log₂n次比较。

## 基本实现

```javascript
function binarySearch(nums, target) {
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
    
    return -1;  // 没找到
}
```

## 关键细节

### 1. 为什么用 `left + (right - left) / 2`？

而不是`(left + right) / 2`？

为了防止整数溢出。虽然在JavaScript中不是问题，但在其他语言中`left + right`可能溢出。

### 2. 为什么是 `left <= right`？

因为搜索区间是`[left, right]`（闭区间），当`left === right`时还有一个元素需要检查。

### 3. 为什么是 `left = mid + 1` 和 `right = mid - 1`？

因为`mid`已经检查过了，不需要再包含在搜索区间内。

## 循环不变量

理解二分查找的关键是**循环不变量**：

```
搜索区间 [left, right] 中可能包含目标值
```

每次循环：
- 如果`nums[mid] < target`，目标在`[mid+1, right]`中
- 如果`nums[mid] > target`，目标在`[left, mid-1]`中
- 如果`nums[mid] === target`，找到了

循环结束时，`left > right`，搜索区间为空，目标不存在。

## 执行示例

```
nums = [1, 3, 5, 7, 9, 11], target = 7

初始：left=0, right=5
step 1: mid=2, nums[2]=5 < 7, left=3
step 2: mid=4, nums[4]=9 > 7, right=3
step 3: mid=3, nums[3]=7 = 7, 返回3
```

## 二分查找的前提条件

1. **有序**：数组必须是有序的（或至少是单调的）
2. **随机访问**：需要O(1)时间访问任意位置（数组可以，链表不行）

## 时间复杂度分析

每次迭代，搜索范围减半：
- 第1次：n个元素
- 第2次：n/2个元素
- 第k次：n/2^k个元素

当n/2^k = 1时，k = log₂n。

所以时间复杂度是**O(log n)**。

## 空间复杂度

**O(1)**：只用了几个变量。

（递归版本是O(log n)，因为调用栈深度为log n）

## 递归版本

```javascript
function binarySearch(nums, target, left = 0, right = nums.length - 1) {
    if (left > right) return -1;
    
    const mid = left + Math.floor((right - left) / 2);
    
    if (nums[mid] === target) {
        return mid;
    } else if (nums[mid] < target) {
        return binarySearch(nums, target, mid + 1, right);
    } else {
        return binarySearch(nums, target, left, mid - 1);
    }
}
```

迭代版本更常用，因为没有栈空间开销。

## 二分查找的威力

| 数组大小 | 线性搜索 | 二分查找 |
|---------|---------|---------|
| 100 | 100次 | 7次 |
| 10,000 | 10,000次 | 14次 |
| 1,000,000 | 1,000,000次 | 20次 |
| 10亿 | 10亿次 | 30次 |

二分查找只需要约30次比较就能在10亿个元素中找到目标！

## 小结

二分查找的核心：

1. **分治思想**：每次排除一半
2. **前提条件**：有序 + 随机访问
3. **关键细节**：边界处理、中点计算、循环条件
4. **复杂度**：时间O(log n)，空间O(1)

下一章我们学习二分查找的各种变体，它们在实际应用中更加常见。
