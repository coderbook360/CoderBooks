# 实战：最小的K个数

## 题目描述

**剑指 Offer 40 / LeetCode 面试题 40**：输入整数数组 `arr`，找出其中最小的 `k` 个数。例如，输入 4、5、1、6、2、7、3、8 这 8 个数字，则最小的 4 个数字是 1、2、3、4。

**示例**：

```
输入: arr = [3,2,1], k = 2
输出: [1,2] 或 [2,1]

输入: arr = [0,1,2,1], k = 1
输出: [0]
```

## 思路分析

这是 Top K 问题的变体——找**最小**的 K 个数。

回顾之前的规律：
- 找第 K **大**：用大小为 K 的**最小堆**
- 找第 K **小**：用大小为 K 的**最大堆**

为什么找最小的 K 个要用最大堆？

想象堆是一个"守门人"：
- 堆顶是堆中最大的元素
- 如果新元素比堆顶小，说明它应该进入"最小 K 个"的行列
- 弹出堆顶（当前最大），让新元素进来
- 如果新元素比堆顶大，它不配进入最小 K 个

## 代码实现

```javascript
function getLeastNumbers(arr, k) {
    if (k === 0 || arr.length === 0) return [];
    if (k >= arr.length) return arr;
    
    const maxHeap = new MaxHeap();
    
    for (const num of arr) {
        if (maxHeap.size() < k) {
            // 堆未满，直接加入
            maxHeap.push(num);
        } else if (num < maxHeap.peek()) {
            // 比堆顶小，应该进入最小 K 个
            maxHeap.pop();
            maxHeap.push(num);
        }
        // 否则，num >= 堆顶，不够资格进入最小 K 个
    }
    
    return maxHeap.heap;
}
```

## 执行过程详解

以 `arr = [3,2,1,5,6,4], k = 3` 为例：

```
遍历 3: 堆未满，加入
       堆 = [3]
       
遍历 2: 堆未满，加入
       堆 = [3,2]（最大堆，3在堆顶）
       
遍历 1: 堆未满，加入
       堆 = [3,2,1]（堆顶是3）
       
遍历 5: 5 > 堆顶3，不进入
       堆 = [3,2,1]
       
遍历 6: 6 > 堆顶3，不进入
       堆 = [3,2,1]
       
遍历 4: 4 > 堆顶3，不进入
       堆 = [3,2,1]

结果：[3,2,1] 或任意顺序 [1,2,3]
```

## 完整代码

```javascript
class MaxHeap {
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
            if (this.heap[i] <= this.heap[parent]) break;
            [this.heap[i], this.heap[parent]] = [this.heap[parent], this.heap[i]];
            i = parent;
        }
    }
    
    siftDown(i) {
        const n = this.heap.length;
        while (true) {
            let largest = i;
            const left = 2 * i + 1;
            const right = 2 * i + 2;
            if (left < n && this.heap[left] > this.heap[largest]) largest = left;
            if (right < n && this.heap[right] > this.heap[largest]) largest = right;
            if (largest === i) break;
            [this.heap[i], this.heap[largest]] = [this.heap[largest], this.heap[i]];
            i = largest;
        }
    }
}

function getLeastNumbers(arr, k) {
    if (k === 0 || arr.length === 0) return [];
    if (k >= arr.length) return arr;
    
    const maxHeap = new MaxHeap();
    
    for (const num of arr) {
        if (maxHeap.size() < k) {
            maxHeap.push(num);
        } else if (num < maxHeap.peek()) {
            maxHeap.pop();
            maxHeap.push(num);
        }
    }
    
    return maxHeap.heap;
}
```

## 快速选择解法

与"第 K 大元素"类似，这道题也可以用快速选择：

```javascript
function getLeastNumbers(arr, k) {
    if (k === 0 || arr.length === 0) return [];
    if (k >= arr.length) return arr;
    
    quickSelect(arr, 0, arr.length - 1, k);
    return arr.slice(0, k);
}

function quickSelect(arr, left, right, k) {
    if (left >= right) return;
    
    const pivotIndex = partition(arr, left, right);
    
    if (pivotIndex === k) {
        return;
    } else if (pivotIndex < k) {
        quickSelect(arr, pivotIndex + 1, right, k);
    } else {
        quickSelect(arr, left, pivotIndex - 1, k);
    }
}

function partition(arr, left, right) {
    // 随机选择 pivot
    const randomIndex = left + Math.floor(Math.random() * (right - left + 1));
    [arr[randomIndex], arr[right]] = [arr[right], arr[randomIndex]];
    
    const pivot = arr[right];
    let i = left;
    
    for (let j = left; j < right; j++) {
        if (arr[j] < pivot) {
            [arr[i], arr[j]] = [arr[j], arr[i]];
            i++;
        }
    }
    
    [arr[i], arr[right]] = [arr[right], arr[i]];
    return i;
}
```

## 三种方法对比

| 方法 | 时间复杂度 | 空间复杂度 | 特点 |
|------|-----------|-----------|------|
| 排序 | O(n log n) | O(log n) | 简单但做了额外工作 |
| 最大堆 | O(n log k) | O(k) | 适合数据流，k 小时高效 |
| 快速选择 | O(n) 平均 | O(1) | 最优，但会修改数组 |

## 堆解法的优势

虽然快速选择的平均时间复杂度更优，但堆解法有独特的优势：

**适合海量数据**：
- 只需 O(k) 空间
- 可以处理无法全部加载到内存的数据流

**适合动态数据**：
- 新数据到来时，O(log k) 更新
- 快速选择每次都要 O(n)

**不修改原数据**：
- 堆解法是非破坏性的
- 快速选择会打乱数组顺序

## 小结

这道题与"第 K 大元素"形成对比：

**找最大的 K 个 / 第 K 大**：用最小堆
- 堆顶是 K 个大元素中最小的
- 新元素比堆顶大才有资格进入

**找最小的 K 个 / 第 K 小**：用最大堆
- 堆顶是 K 个小元素中最大的
- 新元素比堆顶小才有资格进入

记住这个"反直觉"的规律，Top K 问题就能信手拈来。
