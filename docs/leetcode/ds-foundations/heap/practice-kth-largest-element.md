# 实战：数组中的第 K 个最大元素

这是堆的经典应用题，也是面试高频题。看似简单的问题，有多种解法，每种解法都有其适用场景。

## 题目描述

**LeetCode 215. 数组中的第 K 个最大元素**

给定整数数组 `nums` 和整数 `k`，请返回数组中第 `k` 个最大的元素。

请注意，你需要找的是数组排序后的第 `k` 个最大的元素，而不是第 `k` 个不同的元素。

**示例 1**：
```
输入：nums = [3,2,1,5,6,4], k = 2
输出：5
```

**示例 2**：
```
输入：nums = [3,2,3,1,2,4,5,5,6], k = 4
输出：4
```

**提示**：
- 1 ≤ k ≤ nums.length ≤ 10⁵
- -10⁴ ≤ nums[i] ≤ 10⁴

## 题目分析

「第 k 大」的意思是：如果把数组从大到小排序，取第 k 个位置的元素。

```
nums = [3,2,1,5,6,4], k = 2

降序排列：6, 5, 4, 3, 2, 1
           ↑  ↑
          第1大 第2大

答案：5
```

**关键问题**：如何高效找到第 k 大，而不需要完全排序？

## 解法一：排序

最直接的思路：排序后直接取。

```javascript
function findKthLargest(nums, k) {
    nums.sort((a, b) => b - a);  // 降序排序
    return nums[k - 1];
}
```

**复杂度**：
- 时间：O(n log n)
- 空间：O(log n)（排序的递归栈）

**评价**：简单直接，但排序做了多余的工作——我们只需要第 k 大，不需要完全有序。

## 解法二：最小堆

**核心思想**：维护一个大小为 k 的最小堆，堆中始终保持「最大的 k 个数」。遍历结束后，堆顶就是第 k 大。

为什么用**最小堆**而不是最大堆？

用最小堆，堆顶是堆中最小的元素。当新元素比堆顶大时，说明新元素应该进入「前 k 大」，淘汰当前堆顶。

```javascript
function findKthLargest(nums, k) {
    const heap = new MinHeap();
    
    for (const num of nums) {
        heap.insert(num);
        
        // 保持堆大小为 k
        if (heap.size() > k) {
            heap.extract();  // 淘汰最小的
        }
    }
    
    // 堆顶是前 k 大中最小的 = 第 k 大
    return heap.peek();
}
```

### 执行过程

```
nums = [3,2,1,5,6,4], k = 2

遍历过程：
num=3: heap=[3], size=1 ≤ k
num=2: heap=[2,3], size=2 = k
num=1: heap=[1,2,3], size=3 > k, extract → heap=[2,3]
num=5: heap=[2,3,5], size=3 > k, extract → heap=[3,5]
num=6: heap=[3,5,6], size=3 > k, extract → heap=[5,6]
num=4: heap=[4,5,6], size=3 > k, extract → heap=[5,6]

结果：heap.peek() = 5 ✓
```

**关键理解**：堆中始终保持「当前遇到的最大的 k 个数」，小于堆顶的数会被自动淘汰。

**复杂度**：
- 时间：O(n log k) —— n 次插入/删除，每次 O(log k)
- 空间：O(k) —— 堆的大小

**优势**：当 k 远小于 n 时（如 k=10, n=100000），比排序快很多。

### 最小堆实现

```javascript
class MinHeap {
    constructor() {
        this.heap = [];
    }
    
    size() { return this.heap.length; }
    peek() { return this.heap[0]; }
    
    insert(val) {
        this.heap.push(val);
        this._siftUp(this.heap.length - 1);
    }
    
    extract() {
        if (this.size() === 0) return undefined;
        if (this.size() === 1) return this.heap.pop();
        
        const min = this.heap[0];
        this.heap[0] = this.heap.pop();
        this._siftDown(0);
        return min;
    }
    
    _siftUp(i) {
        while (i > 0) {
            const parent = Math.floor((i - 1) / 2);
            if (this.heap[parent] <= this.heap[i]) break;
            [this.heap[parent], this.heap[i]] = [this.heap[i], this.heap[parent]];
            i = parent;
        }
    }
    
    _siftDown(i) {
        const n = this.size();
        while (2 * i + 1 < n) {
            let smallest = i;
            const left = 2 * i + 1, right = 2 * i + 2;
            if (this.heap[left] < this.heap[smallest]) smallest = left;
            if (right < n && this.heap[right] < this.heap[smallest]) smallest = right;
            if (smallest === i) break;
            [this.heap[i], this.heap[smallest]] = [this.heap[smallest], this.heap[i]];
            i = smallest;
        }
    }
}
```

## 解法三：快速选择

快速选择（QuickSelect）是基于快速排序分区思想的算法，**平均 O(n)** 时间复杂度。

**核心思想**：
- 快排的分区操作将数组分成三部分：小于 pivot、等于 pivot、大于 pivot
- 我们只关心第 k 大在哪个部分，只需递归处理那一部分

```javascript
function findKthLargest(nums, k) {
    // 第 k 大 = 从小到大的第 (n-k) 个
    const target = nums.length - k;
    return quickSelect(nums, 0, nums.length - 1, target);
}

function quickSelect(nums, left, right, target) {
    if (left === right) return nums[left];
    
    const pivotIndex = partition(nums, left, right);
    
    if (pivotIndex === target) {
        return nums[pivotIndex];
    } else if (pivotIndex < target) {
        return quickSelect(nums, pivotIndex + 1, right, target);
    } else {
        return quickSelect(nums, left, pivotIndex - 1, target);
    }
}

function partition(nums, left, right) {
    // 随机选择 pivot 避免最坏情况
    const randomIndex = left + Math.floor(Math.random() * (right - left + 1));
    [nums[randomIndex], nums[right]] = [nums[right], nums[randomIndex]];
    
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

### 执行过程

```
nums = [3,2,1,5,6,4], k = 2
target = 6 - 2 = 4（第 4 小 = 第 2 大）

假设 partition 选择 4 作为 pivot：
[3,2,1] [4] [5,6]
        ↑
     pivotIndex = 3

3 < 4，继续在右边找：quickSelect([5,6], 4, 5, 4)

partition 选择 5：
[5] [6]
 ↑
pivotIndex = 4

4 === 4，返回 nums[4] = 5 ✓
```

**复杂度**：
- 时间：平均 O(n)，最坏 O(n²)
- 空间：O(log n)（递归栈）

**注意**：随机化 pivot 选择可以避免最坏情况，但仍无法保证最坏 O(n)。

## 三种方法对比

| 方法 | 时间复杂度 | 空间复杂度 | 特点 |
|------|-----------|-----------|------|
| 排序 | O(n log n) | O(log n) | 最简单，适合一次性使用 |
| 最小堆 | O(n log k) | O(k) | k 小时高效，适合数据流 |
| 快速选择 | O(n) 平均 | O(log n) | 最快，但最坏 O(n²) |

**选择建议**：
- **k 很小**（如 k ≤ 100）：用最小堆
- **k 接近 n/2**：用快速选择
- **需要稳定性能**：用堆或排序
- **面试时间紧**：先写排序，再优化

## 边界情况

```javascript
// k = 1（最大元素）
findKthLargest([3,2,1], 1);  // 3

// k = n（最小元素）
findKthLargest([3,2,1], 3);  // 1

// 有重复元素
findKthLargest([3,3,3,3], 2);  // 3

// 只有一个元素
findKthLargest([1], 1);  // 1

// 有负数
findKthLargest([-1,-2,3,4], 2);  // 3
```

## 相关题目

- **703. 数据流中的第 K 大元素**：动态添加元素，持续返回第 k 大
- **347. 前 K 个高频元素**：按频率找 Top K
- **973. 最接近原点的 K 个点**：自定义比较的 Top K

## 本章小结

1. **三种解法**：排序 O(n log n)、最小堆 O(n log k)、快速选择 O(n)
2. **为什么用最小堆**：堆中保持 k 个最大的，堆顶是其中最小的 = 第 k 大
3. **快速选择**：分区后只递归一边，期望 O(n)
4. **场景选择**：根据 k 大小和稳定性需求选择算法

这道题的核心思想——**用数据结构维护部分有序，避免完全排序**——在很多问题中都有应用。
