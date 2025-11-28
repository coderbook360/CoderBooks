# 实战：数组中的第K个最大元素

## 题目描述

**LeetCode 215**：给定整数数组 `nums` 和整数 `k`，请返回数组中第 `k` 个最大的元素。

注意，你需要找的是数组排序后的第 `k` 个最大的元素，而不是第 `k` 个不同的元素。

**示例**：

```
输入: nums = [3,2,1,5,6,4], k = 2
输出: 5

输入: nums = [3,2,3,1,2,4,5,5,6], k = 4
输出: 4
```

## 思路分析

这道题是 Top K 问题的经典入门题，有多种解法。让我们从最直观的方法开始，逐步优化到堆解法。

### 方法一：排序

最直接的思路——排序后取第 k 大：

```javascript
function findKthLargest(nums, k) {
    nums.sort((a, b) => b - a);  // 降序排序
    return nums[k - 1];
}
```

时间复杂度 O(n log n)，空间复杂度 O(log n)（排序的栈空间）。

这个方法简单，但做了"过多的工作"——我们只需要第 k 大，却把整个数组都排序了。

### 方法二：最小堆（推荐）

核心思想：**维护一个大小为 k 的最小堆**。

为什么用最小堆而不是最大堆？这是一个关键的洞察：
- 我们要找第 k 大，意味着有 k-1 个元素比它大
- 最小堆的堆顶是堆中最小的元素
- 当堆大小保持为 k 时，堆顶就是"k 个最大元素中最小的那个"，即第 k 大

具体流程：
1. 遍历数组，将元素加入堆
2. 如果堆大小超过 k，弹出堆顶（最小元素）
3. 遍历完成后，堆顶就是第 k 大元素

```javascript
function findKthLargest(nums, k) {
    const minHeap = new MinHeap();
    
    for (const num of nums) {
        minHeap.push(num);
        
        // 保持堆大小为 k
        if (minHeap.size() > k) {
            minHeap.pop();  // 弹出最小的
        }
    }
    
    return minHeap.peek();  // 堆顶就是第 k 大
}
```

让我们追踪一个例子：`nums = [3,2,1,5,6,4], k = 2`

```
遍历 3: 堆 = [3]
遍历 2: 堆 = [2,3]
遍历 1: 堆 = [1,2,3], size > 2, 弹出1 -> 堆 = [2,3]
遍历 5: 堆 = [2,3,5], size > 2, 弹出2 -> 堆 = [3,5]
遍历 6: 堆 = [3,5,6], size > 2, 弹出3 -> 堆 = [5,6]
遍历 4: 堆 = [4,5,6], size > 2, 弹出4 -> 堆 = [5,6]

结果：堆顶 5 就是第 2 大元素
```

## 完整代码

```javascript
// 最小堆实现
class MinHeap {
    constructor() {
        this.heap = [];
    }
    
    push(val) {
        this.heap.push(val);
        this.siftUp(this.heap.length - 1);
    }
    
    pop() {
        if (this.heap.length === 0) return undefined;
        const top = this.heap[0];
        const last = this.heap.pop();
        if (this.heap.length > 0) {
            this.heap[0] = last;
            this.siftDown(0);
        }
        return top;
    }
    
    peek() {
        return this.heap[0];
    }
    
    size() {
        return this.heap.length;
    }
    
    siftUp(i) {
        while (i > 0) {
            const parent = Math.floor((i - 1) / 2);
            if (this.heap[i] >= this.heap[parent]) break;
            [this.heap[i], this.heap[parent]] = [this.heap[parent], this.heap[i]];
            i = parent;
        }
    }
    
    siftDown(i) {
        const n = this.heap.length;
        while (true) {
            let smallest = i;
            const left = 2 * i + 1;
            const right = 2 * i + 2;
            
            if (left < n && this.heap[left] < this.heap[smallest]) {
                smallest = left;
            }
            if (right < n && this.heap[right] < this.heap[smallest]) {
                smallest = right;
            }
            
            if (smallest === i) break;
            [this.heap[i], this.heap[smallest]] = [this.heap[smallest], this.heap[i]];
            i = smallest;
        }
    }
}

function findKthLargest(nums, k) {
    const minHeap = new MinHeap();
    
    for (const num of nums) {
        minHeap.push(num);
        if (minHeap.size() > k) {
            minHeap.pop();
        }
    }
    
    return minHeap.peek();
}
```

## 方法三：快速选择（最优）

快速选择算法基于快速排序的 partition 思想，平均时间复杂度 O(n)：

```javascript
function findKthLargest(nums, k) {
    // 第 k 大 = 第 n-k+1 小 = 索引 n-k
    const targetIndex = nums.length - k;
    return quickSelect(nums, 0, nums.length - 1, targetIndex);
}

function quickSelect(nums, left, right, k) {
    if (left === right) return nums[left];
    
    // 随机选择 pivot 避免最坏情况
    const pivotIndex = left + Math.floor(Math.random() * (right - left + 1));
    const pivot = partition(nums, left, right, pivotIndex);
    
    if (pivot === k) {
        return nums[k];
    } else if (pivot < k) {
        return quickSelect(nums, pivot + 1, right, k);
    } else {
        return quickSelect(nums, left, pivot - 1, k);
    }
}

function partition(nums, left, right, pivotIndex) {
    const pivotValue = nums[pivotIndex];
    // 把 pivot 移到最右边
    [nums[pivotIndex], nums[right]] = [nums[right], nums[pivotIndex]];
    
    let storeIndex = left;
    for (let i = left; i < right; i++) {
        if (nums[i] < pivotValue) {
            [nums[i], nums[storeIndex]] = [nums[storeIndex], nums[i]];
            storeIndex++;
        }
    }
    
    // 把 pivot 放到正确位置
    [nums[storeIndex], nums[right]] = [nums[right], nums[storeIndex]];
    return storeIndex;
}
```

## 三种方法对比

| 方法 | 时间复杂度 | 空间复杂度 | 特点 |
|------|-----------|-----------|------|
| 排序 | O(n log n) | O(log n) | 简单直观，做了额外工作 |
| 堆 | O(n log k) | O(k) | 适合数据流场景 |
| 快速选择 | O(n) 平均 | O(1) | 最优，但会修改原数组 |

## 如何选择？

**选堆的场景**：
- k 远小于 n 时，O(n log k) ≈ O(n)
- 数据流场景，元素逐个到来
- 需要多次查询 Top K
- 不能修改原数组

**选快速选择的场景**：
- 一次性查询
- 追求最优时间复杂度
- 可以修改原数组

面试中，建议先说堆解法（更稳定，代码更容易写对），然后提及快速选择作为优化。

## 小结

这道题展示了堆解决 Top K 问题的标准模式：

**找第 K 大：用大小为 K 的最小堆**
- 堆顶是 K 个最大元素中最小的
- 遍历时保持堆大小为 K
- 最终堆顶就是答案

**找第 K 小：用大小为 K 的最大堆**
- 思路完全对称

这个模式是堆应用的基础，接下来的几道题都会用到类似的思想。
