# 实战：数组中的逆序对

这道题展示了分治在统计问题中的应用。

## 问题描述

在数组中的两个数字，如果前面一个数字大于后面的数字，则这两个数字组成一个逆序对。

输入一个数组，求出这个数组中的逆序对的总数。

## 思路分析

### 暴力法

枚举所有数对，O(n²)。

### 分治法

借助归并排序的思想：
- 分成左右两半
- 递归统计左半部分内部的逆序对
- 递归统计右半部分内部的逆序对
- 统计跨越左右的逆序对（在合并时统计）

## 关键洞察

在归并排序的合并阶段：
- 左半部分和右半部分都已排序
- 当左边元素`left[i]`大于右边元素`right[j]`时
- `left[i]`及其右边的所有元素都与`right[j]`构成逆序对
- 因为左边已排序，`left[i], left[i+1], ...`都大于`right[j]`

## 代码实现

```javascript
function reversePairs(nums) {
    if (nums.length < 2) return 0;
    
    const temp = new Array(nums.length);
    return mergeSort(nums, 0, nums.length - 1, temp);
}

function mergeSort(nums, left, right, temp) {
    if (left >= right) return 0;
    
    const mid = Math.floor((left + right) / 2);
    
    let count = 0;
    count += mergeSort(nums, left, mid, temp);      // 左半部分的逆序对
    count += mergeSort(nums, mid + 1, right, temp); // 右半部分的逆序对
    count += merge(nums, left, mid, right, temp);   // 跨越的逆序对
    
    return count;
}

function merge(nums, left, mid, right, temp) {
    // 复制到临时数组
    for (let i = left; i <= right; i++) {
        temp[i] = nums[i];
    }
    
    let i = left, j = mid + 1, k = left;
    let count = 0;
    
    while (i <= mid && j <= right) {
        if (temp[i] <= temp[j]) {
            nums[k++] = temp[i++];
        } else {
            // temp[i] > temp[j]，构成逆序对
            // temp[i], temp[i+1], ..., temp[mid] 都与 temp[j] 构成逆序对
            count += mid - i + 1;
            nums[k++] = temp[j++];
        }
    }
    
    while (i <= mid) {
        nums[k++] = temp[i++];
    }
    while (j <= right) {
        nums[k++] = temp[j++];
    }
    
    return count;
}
```

## 图解

```
nums = [7, 5, 6, 4]

分解:
[7, 5] | [6, 4]

左半部分:
[7] | [5]
合并: 7 > 5, count += 1, 结果 [5, 7]

右半部分:
[6] | [4]
合并: 6 > 4, count += 1, 结果 [4, 6]

跨越合并:
[5, 7] | [4, 6]
i=0, j=0: 5 > 4, count += (mid-i+1) = 2, j++
i=0, j=1: 5 < 6, i++
i=1, j=1: 7 > 6, count += 1, j++
i=1, j=2: j越界, i移动

结果: 1 + 1 + 3 = 5
```

## 为什么这样统计是对的？

### 左半部分已排序

当`temp[i] > temp[j]`时，由于左半部分已排序：
- `temp[i] < temp[i+1] < ... < temp[mid]`
- 所以`temp[i], temp[i+1], ..., temp[mid]`都大于`temp[j]`
- 它们都与`temp[j]`构成逆序对

### 不会重复统计

- 左半部分内部的逆序对在左递归中统计
- 右半部分内部的逆序对在右递归中统计
- 跨越的逆序对在合并时统计
- 三者互不重叠

### 不会遗漏

所有逆序对要么在左半部分，要么在右半部分，要么跨越。

## 另一种实现：从后向前合并

```javascript
function merge(nums, left, mid, right, temp) {
    for (let i = left; i <= right; i++) {
        temp[i] = nums[i];
    }
    
    let i = mid, j = right, k = right;
    let count = 0;
    
    while (i >= left && j >= mid + 1) {
        if (temp[i] > temp[j]) {
            // temp[i] 比 temp[mid+1], ..., temp[j] 都大
            count += j - mid;
            nums[k--] = temp[i--];
        } else {
            nums[k--] = temp[j--];
        }
    }
    
    while (i >= left) nums[k--] = temp[i--];
    while (j >= mid + 1) nums[k--] = temp[j--];
    
    return count;
}
```

两种方式等价，选择习惯的即可。

## 复杂度分析

**时间复杂度**：O(n log n)
- 与归并排序相同

**空间复杂度**：O(n)
- 临时数组

## 小结

逆序对问题展示了分治统计的技巧：
1. 借助归并排序的框架
2. 在合并时利用有序性高效统计
3. 把O(n²)的暴力优化到O(n log n)

这种"归并排序 + 统计"的模式在很多问题中都有用。
