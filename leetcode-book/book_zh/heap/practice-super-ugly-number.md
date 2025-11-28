# 实战：超级丑数

## 题目描述

**LeetCode 313**：**超级丑数**是一个正整数，其所有质因数都在给定的质数数组 `primes` 中。

给你一个整数 `n` 和一个整数数组 `primes`，返回第 `n` 个**超级丑数**。

题目保证第 `n` 个超级丑数在 32 位有符号整数范围内。

**示例**：

```
输入: n = 12, primes = [2,7,13,19]
输出: 32
解释: [1,2,4,7,8,13,14,16,19,26,28,32] 是给定质数的超级丑数序列

输入: n = 1, primes = [2,3,5]
输出: 1
```

## 思路分析

这道题是"丑数 II"的推广版本。在丑数 II 中，质因数固定为 [2, 3, 5]；这里质因数变成了任意给定的数组。

解法思路完全一致，只是需要处理**任意长度**的质数数组。

### 方法一：最小堆

```javascript
function nthSuperUglyNumber(n, primes) {
    const minHeap = new MinHeap();
    const seen = new Set();
    
    minHeap.push(1);
    seen.add(1);
    
    let ugly = 1;
    
    for (let i = 0; i < n; i++) {
        ugly = minHeap.pop();
        
        for (const prime of primes) {
            const next = ugly * prime;
            if (!seen.has(next)) {
                seen.add(next);
                minHeap.push(next);
            }
        }
    }
    
    return ugly;
}
```

### 方法二：多指针动态规划

将三指针解法推广到 k 个指针：

```javascript
function nthSuperUglyNumber(n, primes) {
    const k = primes.length;
    const pointers = new Array(k).fill(0);  // k 个指针
    const dp = new Array(n);
    dp[0] = 1;
    
    for (let i = 1; i < n; i++) {
        // 计算每个指针对应的候选值
        let minVal = Infinity;
        for (let j = 0; j < k; j++) {
            const candidate = dp[pointers[j]] * primes[j];
            minVal = Math.min(minVal, candidate);
        }
        
        dp[i] = minVal;
        
        // 移动所有产生最小值的指针
        for (let j = 0; j < k; j++) {
            if (dp[pointers[j]] * primes[j] === minVal) {
                pointers[j]++;
            }
        }
    }
    
    return dp[n - 1];
}
```

### 方法三：堆优化的多指针

用堆来优化"找 k 个候选中最小值"的过程：

```javascript
function nthSuperUglyNumber(n, primes) {
    const k = primes.length;
    const dp = new Array(n);
    dp[0] = 1;
    
    // 堆中存储 [当前候选值, 质数索引, dp数组指针]
    const minHeap = new HeapWithComparator((a, b) => a[0] - b[0]);
    
    // 初始化：每个质数对应的初始候选值
    for (let i = 0; i < k; i++) {
        minHeap.push([primes[i], i, 0]);
    }
    
    for (let i = 1; i < n; i++) {
        // 取出最小候选
        const [val, primeIdx, dpIdx] = minHeap.peek();
        dp[i] = val;
        
        // 弹出所有等于最小值的（去重）
        while (minHeap.size() > 0 && minHeap.peek()[0] === val) {
            const [, pIdx, dIdx] = minHeap.pop();
            // 推入下一个候选
            minHeap.push([dp[dIdx + 1] * primes[pIdx], pIdx, dIdx + 1]);
        }
    }
    
    return dp[n - 1];
}
```

## 完整代码

```javascript
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
            if (left < n && this.heap[left] < this.heap[smallest]) smallest = left;
            if (right < n && this.heap[right] < this.heap[smallest]) smallest = right;
            if (smallest === i) break;
            [this.heap[i], this.heap[smallest]] = [this.heap[smallest], this.heap[i]];
            i = smallest;
        }
    }
}

// 方法一：简单堆 + Set 去重
function nthSuperUglyNumber(n, primes) {
    const minHeap = new MinHeap();
    const seen = new Set();
    
    minHeap.push(1);
    seen.add(1);
    
    let ugly = 1;
    
    for (let i = 0; i < n; i++) {
        ugly = minHeap.pop();
        
        for (const prime of primes) {
            const next = ugly * prime;
            if (!seen.has(next)) {
                seen.add(next);
                minHeap.push(next);
            }
        }
    }
    
    return ugly;
}
```

## 执行过程详解

以 `n = 5, primes = [2, 7]` 为例：

```
初始：堆 = [1], seen = {1}

i=0: 取出 1，生成 2, 7
     堆 = [2, 7], seen = {1, 2, 7}
     ugly = 1
     
i=1: 取出 2，生成 4, 14
     堆 = [4, 7, 14], seen = {1, 2, 4, 7, 14}
     ugly = 2
     
i=2: 取出 4，生成 8, 28
     堆 = [7, 8, 14, 28]
     ugly = 4
     
i=3: 取出 7，生成 14(已存在), 49
     堆 = [8, 14, 28, 49]
     ugly = 7
     
i=4: 取出 8，生成 16, 56
     堆 = [14, 16, 28, 49, 56]
     ugly = 8

返回 8
```

超级丑数序列：1, 2, 4, 7, 8, 14, 16, 28, 32, 49...

## 复杂度分析

设 n 为要求的位置，k 为质数数组长度。

**堆 + Set 方法**：
- 时间复杂度：O(nk log(nk))
  - 每个丑数生成 k 个新候选
  - 堆操作 O(log(nk))
- 空间复杂度：O(nk)
  - 堆和 Set 存储

**多指针方法**：
- 时间复杂度：O(nk)
  - n 次迭代，每次 O(k) 找最小值
- 空间复杂度：O(n + k)
  - dp 数组 + 指针数组

**堆优化多指针**：
- 时间复杂度：O(n log k)
  - n 次迭代，堆操作 O(log k)
- 空间复杂度：O(n + k)

## 方法对比

| 方法 | 时间复杂度 | 空间复杂度 | 实现难度 |
|------|-----------|-----------|---------|
| 堆 + Set | O(nk log(nk)) | O(nk) | 简单 |
| 多指针 | O(nk) | O(n + k) | 中等 |
| 堆优化 | O(n log k) | O(n + k) | 较难 |

面试中推荐使用**堆 + Set** 方法，代码简洁，不易出错。

## 小结

这道题是丑数 II 的推广，展示了如何将固定参数的解法推广到通用情况：

**核心思想**：
- 超级丑数 = 更小的超级丑数 × 某个质数
- 用堆维护候选，每次取最小
- 用 Set 去重

**推广技巧**：
- 固定的质因数 [2,3,5] → 任意质数数组
- 三指针 → k 指针
- 可以用堆优化 k 个候选中找最小值
