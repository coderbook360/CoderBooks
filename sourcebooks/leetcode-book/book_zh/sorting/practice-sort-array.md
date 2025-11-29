# 实战：排序数组

LeetCode 912。这道题让我们实现数组排序，是测试排序算法的好题目。

## 问题描述

给你一个整数数组`nums`，请你将该数组升序排列。

必须在O(n log n)时间复杂度和最小空间复杂度下完成。

## 思路分析

这道题考查排序算法的掌握程度。

O(n log n)的排序算法有：
- 归并排序
- 快速排序
- 堆排序

我们分别实现它们。

## 解法1：快速排序

```javascript
function sortArray(nums) {
    quickSort(nums, 0, nums.length - 1);
    return nums;
}

function quickSort(nums, left, right) {
    if (left >= right) return;
    
    // 随机选择pivot，避免最坏情况
    const randomIndex = left + Math.floor(Math.random() * (right - left + 1));
    [nums[randomIndex], nums[right]] = [nums[right], nums[randomIndex]];
    
    const pivotIndex = partition(nums, left, right);
    
    quickSort(nums, left, pivotIndex - 1);
    quickSort(nums, pivotIndex + 1, right);
}

function partition(nums, left, right) {
    const pivot = nums[right];
    let i = left;
    
    for (let j = left; j < right; j++) {
        if (nums[j] < pivot) {
            [nums[i], nums[j]] = [nums[j], nums[i]];
            i++;
        }
    }
    
    [nums[i], nums[right]] = [nums[right], nums[i]];
    return i;
}
```

## 解法2：归并排序

```javascript
function sortArray(nums) {
    const temp = new Array(nums.length);
    mergeSort(nums, 0, nums.length - 1, temp);
    return nums;
}

function mergeSort(nums, left, right, temp) {
    if (left >= right) return;
    
    const mid = left + Math.floor((right - left) / 2);
    
    mergeSort(nums, left, mid, temp);
    mergeSort(nums, mid + 1, right, temp);
    
    merge(nums, left, mid, right, temp);
}

function merge(nums, left, mid, right, temp) {
    for (let i = left; i <= right; i++) {
        temp[i] = nums[i];
    }
    
    let i = left, j = mid + 1, k = left;
    
    while (i <= mid && j <= right) {
        if (temp[i] <= temp[j]) {
            nums[k++] = temp[i++];
        } else {
            nums[k++] = temp[j++];
        }
    }
    
    while (i <= mid) {
        nums[k++] = temp[i++];
    }
}
```

## 解法3：堆排序

```javascript
function sortArray(nums) {
    heapSort(nums);
    return nums;
}

function heapSort(nums) {
    const n = nums.length;
    
    // 建堆
    for (let i = Math.floor(n / 2) - 1; i >= 0; i--) {
        heapify(nums, n, i);
    }
    
    // 排序
    for (let i = n - 1; i > 0; i--) {
        [nums[0], nums[i]] = [nums[i], nums[0]];
        heapify(nums, i, 0);
    }
}

function heapify(nums, heapSize, i) {
    let largest = i;
    const left = 2 * i + 1;
    const right = 2 * i + 2;
    
    if (left < heapSize && nums[left] > nums[largest]) {
        largest = left;
    }
    if (right < heapSize && nums[right] > nums[largest]) {
        largest = right;
    }
    
    if (largest !== i) {
        [nums[i], nums[largest]] = [nums[largest], nums[i]];
        heapify(nums, heapSize, largest);
    }
}
```

## 解法4：三向切分快排（处理重复元素）

```javascript
function sortArray(nums) {
    quickSort3Way(nums, 0, nums.length - 1);
    return nums;
}

function quickSort3Way(nums, left, right) {
    if (left >= right) return;
    
    // 随机化
    const randomIndex = left + Math.floor(Math.random() * (right - left + 1));
    [nums[randomIndex], nums[left]] = [nums[left], nums[randomIndex]];
    
    const pivot = nums[left];
    let lt = left, gt = right;
    let i = left + 1;
    
    while (i <= gt) {
        if (nums[i] < pivot) {
            [nums[lt], nums[i]] = [nums[i], nums[lt]];
            lt++;
            i++;
        } else if (nums[i] > pivot) {
            [nums[i], nums[gt]] = [nums[gt], nums[i]];
            gt--;
        } else {
            i++;
        }
    }
    
    quickSort3Way(nums, left, lt - 1);
    quickSort3Way(nums, gt + 1, right);
}
```

## 各解法对比

| 解法 | 时间 | 空间 | 稳定 | 特点 |
|-----|------|------|------|------|
| 快排 | O(n log n) | O(log n) | 否 | 最常用 |
| 归并 | O(n log n) | O(n) | 是 | 稳定 |
| 堆排 | O(n log n) | O(1) | 否 | 空间最优 |
| 三向快排 | O(n log n) | O(log n) | 否 | 处理重复 |

## LeetCode提交技巧

### 快排的优化

1. **随机化pivot**：避免有序数组导致的O(n²)
2. **三向切分**：处理大量重复元素
3. **小规模用插入排序**：减少递归开销

### 归并排序的优化

1. **预分配临时数组**：避免每次合并都创建
2. **小规模用插入排序**
3. **已有序则跳过合并**

## 不推荐的解法

### 直接调用sort

```javascript
function sortArray(nums) {
    return nums.sort((a, b) => a - b);
}
```

虽然能过，但没有展示算法能力。

### O(n²)算法

冒泡、选择、插入排序会超时。

## 小结

排序数组是练习排序算法的经典题目：
- O(n log n)是基本要求
- 快排最常用，注意随机化
- 归并稳定但需要额外空间
- 堆排空间最优

面试时，能手写快排或归并是基本功。
