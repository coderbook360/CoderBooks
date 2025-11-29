# 实战：前K个高频元素

## 题目描述

**LeetCode 347**：给你一个整数数组 `nums` 和一个整数 `k`，请你返回其中出现频率前 `k` 高的元素。你可以按**任意顺序**返回答案。

**示例**：

```
输入: nums = [1,1,1,2,2,3], k = 2
输出: [1,2]

输入: nums = [1], k = 1
输出: [1]
```

## 思路分析

这道题是 Top K 问题的变体——不是找最大的 K 个数，而是找频率最高的 K 个元素。

解题分两步：
1. 统计每个元素的出现频率
2. 找出频率最高的 K 个元素

第一步用哈希表轻松解决，第二步就是我们熟悉的 Top K 问题。

### 关键洞察

找**频率最高**的 K 个，等价于找频率的"第 K 大"问题。

根据上一题的经验，我们用**最小堆**：
- 堆中存储 [元素, 频率] 对
- 按**频率**排序
- 维护堆大小为 K
- 堆顶是 K 个高频元素中频率最低的
- 遍历完成后，堆中就是前 K 个高频元素

## 代码实现

```javascript
function topKFrequent(nums, k) {
    // 第一步：统计频率
    const freqMap = new Map();
    for (const num of nums) {
        freqMap.set(num, (freqMap.get(num) || 0) + 1);
    }
    
    // 第二步：用最小堆找前 K 个高频元素
    // 堆中元素格式: [数值, 频率]
    const minHeap = new MinHeapByFreq();
    
    for (const [num, freq] of freqMap) {
        minHeap.push([num, freq]);
        
        if (minHeap.size() > k) {
            minHeap.pop();  // 弹出频率最低的
        }
    }
    
    // 提取结果
    return minHeap.heap.map(item => item[0]);
}

// 按频率排序的最小堆
class MinHeapByFreq {
    constructor() {
        this.heap = [];
    }
    
    // 比较函数：按频率（索引1）排序
    compare(i, j) {
        return this.heap[i][1] - this.heap[j][1];
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
            if (this.compare(i, parent) >= 0) break;
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
            
            if (left < n && this.compare(left, smallest) < 0) {
                smallest = left;
            }
            if (right < n && this.compare(right, smallest) < 0) {
                smallest = right;
            }
            
            if (smallest === i) break;
            [this.heap[i], this.heap[smallest]] = [this.heap[smallest], this.heap[i]];
            i = smallest;
        }
    }
}
```

## 执行过程追踪

以 `nums = [1,1,1,2,2,3], k = 2` 为例：

```
第一步：统计频率
freqMap = { 1 -> 3, 2 -> 2, 3 -> 1 }

第二步：遍历频率表，维护大小为2的最小堆

处理 [1, 3]: 堆 = [[1,3]]
处理 [2, 2]: 堆 = [[2,2], [1,3]]
处理 [3, 1]: 堆 = [[3,1], [1,3], [2,2]]
             size > 2, 弹出频率最低的[3,1]
             堆 = [[2,2], [1,3]]

结果：[2, 1] 或 [1, 2]（顺序不重要）
```

## 通用的带比较器堆

为了代码复用，我们可以实现一个通用的带比较器堆：

```javascript
class HeapWithComparator {
    constructor(compareFn) {
        this.heap = [];
        this.compare = compareFn;
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
            if (this.compare(this.heap[i], this.heap[parent]) >= 0) break;
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
            
            if (left < n && this.compare(this.heap[left], this.heap[smallest]) < 0) {
                smallest = left;
            }
            if (right < n && this.compare(this.heap[right], this.heap[smallest]) < 0) {
                smallest = right;
            }
            
            if (smallest === i) break;
            [this.heap[i], this.heap[smallest]] = [this.heap[smallest], this.heap[i]];
            i = smallest;
        }
    }
}

// 使用通用堆的解法
function topKFrequent(nums, k) {
    const freqMap = new Map();
    for (const num of nums) {
        freqMap.set(num, (freqMap.get(num) || 0) + 1);
    }
    
    // 按频率排序的最小堆
    const minHeap = new HeapWithComparator((a, b) => a[1] - b[1]);
    
    for (const [num, freq] of freqMap) {
        minHeap.push([num, freq]);
        if (minHeap.size() > k) {
            minHeap.pop();
        }
    }
    
    return minHeap.heap.map(item => item[0]);
}
```

## 桶排序解法（O(n)）

这道题还有一个巧妙的 O(n) 解法——桶排序：

```javascript
function topKFrequent(nums, k) {
    // 统计频率
    const freqMap = new Map();
    for (const num of nums) {
        freqMap.set(num, (freqMap.get(num) || 0) + 1);
    }
    
    // 桶：bucket[i] 存储出现 i 次的元素
    const bucket = new Array(nums.length + 1).fill(null).map(() => []);
    
    for (const [num, freq] of freqMap) {
        bucket[freq].push(num);
    }
    
    // 从高频到低频收集结果
    const result = [];
    for (let i = bucket.length - 1; i >= 0 && result.length < k; i--) {
        result.push(...bucket[i]);
    }
    
    return result.slice(0, k);
}
```

这个解法利用了频率的范围是 [1, n]，可以用桶直接映射。

## 复杂度分析

**堆解法**：
- 时间复杂度：O(n log k)
  - 统计频率 O(n)
  - 遍历频率表并维护大小为 k 的堆 O(m log k)，m 是不同元素数量
- 空间复杂度：O(n)
  - 哈希表 O(n)
  - 堆 O(k)

**桶排序解法**：
- 时间复杂度：O(n)
- 空间复杂度：O(n)

## 小结

这道题展示了 Top K 问题的推广形式：

**不是直接比较元素值，而是比较某种属性（频率）**

核心模式不变：
1. 计算属性（频率、距离、得分等）
2. 用最小堆维护前 K 大/最大堆维护前 K 小
3. 堆中存储 [元素, 属性值] 对

这种模式在实际应用中非常常见，比如：
- 搜索引擎的相关性排序
- 推荐系统的 Top K 推荐
- 日志分析的高频错误统计
