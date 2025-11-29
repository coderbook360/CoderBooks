# 实战：数组中的第K个最大元素（排序）

这道题可以用排序解决，但有更优的方法。

## 问题描述

给定整数数组`nums`和整数`k`，请返回数组中第`k`个最大的元素。

请注意，你需要找的是数组排序后的第`k`个最大的元素，而不是第`k`个不同的元素。

## 解法1：直接排序

最直观的方法，排序后取第k大。

```javascript
function findKthLargest(nums, k) {
    nums.sort((a, b) => b - a);  // 降序
    return nums[k - 1];
}
```

时间O(n log n)，空间O(log n)。

## 解法2：堆

只需要找第k大，不需要完全排序。

### 最小堆（推荐）

维护一个大小为k的最小堆，堆顶就是第k大。

```javascript
function findKthLargest(nums, k) {
    // 简化版最小堆
    const heap = [];
    
    for (const num of nums) {
        if (heap.length < k) {
            heapPush(heap, num);
        } else if (num > heap[0]) {
            heapPop(heap);
            heapPush(heap, num);
        }
    }
    
    return heap[0];
}

function heapPush(heap, val) {
    heap.push(val);
    let i = heap.length - 1;
    while (i > 0) {
        const parent = Math.floor((i - 1) / 2);
        if (heap[parent] <= heap[i]) break;
        [heap[parent], heap[i]] = [heap[i], heap[parent]];
        i = parent;
    }
}

function heapPop(heap) {
    const result = heap[0];
    const last = heap.pop();
    if (heap.length > 0) {
        heap[0] = last;
        heapifyDown(heap, 0);
    }
    return result;
}

function heapifyDown(heap, i) {
    const n = heap.length;
    while (true) {
        let smallest = i;
        const left = 2 * i + 1;
        const right = 2 * i + 2;
        if (left < n && heap[left] < heap[smallest]) smallest = left;
        if (right < n && heap[right] < heap[smallest]) smallest = right;
        if (smallest === i) break;
        [heap[i], heap[smallest]] = [heap[smallest], heap[i]];
        i = smallest;
    }
}
```

时间O(n log k)，空间O(k)。

## 解法3：快速选择（最优）

基于快排的分区思想，只递归需要的一边。

```javascript
function findKthLargest(nums, k) {
    return quickSelect(nums, 0, nums.length - 1, nums.length - k);
}

function quickSelect(nums, left, right, k) {
    if (left === right) return nums[left];
    
    // 随机化pivot
    const randomIndex = left + Math.floor(Math.random() * (right - left + 1));
    [nums[randomIndex], nums[right]] = [nums[right], nums[randomIndex]];
    
    const pivotIndex = partition(nums, left, right);
    
    if (pivotIndex === k) {
        return nums[k];
    } else if (pivotIndex < k) {
        return quickSelect(nums, pivotIndex + 1, right, k);
    } else {
        return quickSelect(nums, left, pivotIndex - 1, k);
    }
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

平均时间O(n)，最坏O(n²)。

## 三种解法对比

| 解法 | 时间复杂度 | 空间复杂度 | 特点 |
|-----|-----------|-----------|------|
| 排序 | O(n log n) | O(log n) | 简单，但做了多余工作 |
| 堆 | O(n log k) | O(k) | k小时高效 |
| 快速选择 | O(n) | O(1) | 最优，但有最坏情况 |

## 快速选择的原理

快排每次分区后，pivot在它的最终位置。

如果pivot的位置刚好是k，就找到了第k大。

如果不是，只需要递归包含k的那一边。

平均每次递归规模减半：n + n/2 + n/4 + ... = 2n = O(n)

## BFPRT算法（了解）

快速选择最坏是O(n²)，BFPRT算法保证最坏O(n)：

1. 将n个元素分成n/5组，每组5个
2. 找出每组的中位数
3. 递归找这些中位数的中位数
4. 用这个中位数作为pivot

BFPRT保证每次至少排除30%的元素，但常数因子大，实际中很少使用。

## 实际建议

- **面试**：写快速选择，提到随机化
- **工程**：根据k的大小选择堆或快速选择
- **竞赛**：快速选择 + 随机化

## 复杂度分析

**快速选择**：
- 平均：O(n)
- 最坏：O(n²)，但随机化后极少发生

**堆**：
- 时间：O(n log k)
- 空间：O(k)

## 小结

第K大问题展示了不同排序思想的应用：
- 完全排序太浪费
- 堆适合k较小的情况
- 快速选择平均最优

理解这三种方法的权衡，是排序算法的综合应用。
