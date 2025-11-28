# 实战：丑数II

## 题目描述

**LeetCode 264**：给你一个整数 `n`，请你找出并返回第 `n` 个**丑数**。

**丑数**是只包含质因数 `2`、`3` 和 `5` 的正整数。

**示例**：

```
输入: n = 10
输出: 12
解释: 1, 2, 3, 4, 5, 6, 8, 9, 10, 12 是前10个丑数

输入: n = 1
输出: 1
解释: 1 通常被视为丑数
```

## 思路分析

丑数序列是：1, 2, 3, 4, 5, 6, 8, 9, 10, 12, 15, 16, 18, 20, 24...

观察规律：每个丑数（除了 1）都可以由**更小的丑数**乘以 2、3 或 5 得到。

这意味着：
- 丑数 2 = 1 × 2
- 丑数 3 = 1 × 3
- 丑数 4 = 2 × 2
- 丑数 5 = 1 × 5
- 丑数 6 = 2 × 3 = 3 × 2
- ...

### 最小堆方法

我们可以用最小堆来生成丑数序列：

1. 初始堆中只有 1
2. 每次取出堆顶（当前最小丑数）
3. 将这个丑数乘以 2、3、5，得到的新丑数加入堆
4. 重复直到取出第 n 个

但有个问题：**重复**。比如 6 = 2 × 3 = 3 × 2 会被加入两次。

解决方案：用 Set 去重。

## 代码实现

```javascript
function nthUglyNumber(n) {
    const minHeap = new MinHeap();
    const seen = new Set();
    
    minHeap.push(1);
    seen.add(1);
    
    const primes = [2, 3, 5];
    let ugly = 1;
    
    for (let i = 0; i < n; i++) {
        // 取出当前最小的丑数
        ugly = minHeap.pop();
        
        // 生成新的丑数
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

以 n = 10 为例：

```
初始：堆 = [1], seen = {1}

i=0: 取出 1，生成 2,3,5
     堆 = [2,3,5], seen = {1,2,3,5}
     
i=1: 取出 2，生成 4,6,10
     堆 = [3,4,5,6,10], seen = {1,2,3,4,5,6,10}
     
i=2: 取出 3，生成 6(已存在),9,15
     堆 = [4,5,6,9,10,15]
     
i=3: 取出 4，生成 8,12,20
     堆 = [5,6,8,9,10,12,15,20]
     
i=4: 取出 5，生成 10(已存在),15(已存在),25
     堆 = [6,8,9,10,12,15,20,25]
     
i=5: 取出 6，生成 12(已存在),18,30
     堆 = [8,9,10,12,15,18,20,25,30]
     
i=6: 取出 8，生成 16,24,40
     堆 = [9,10,12,15,16,18,20,24,25,30,40]
     
i=7: 取出 9，生成 18(已存在),27,45
     堆 = [10,12,15,16,18,20,24,25,27,30,40,45]
     
i=8: 取出 10，生成 20(已存在),30(已存在),50
     堆 = [12,15,16,18,20,24,25,27,30,40,45,50]
     
i=9: 取出 12
     返回 12
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

function nthUglyNumber(n) {
    const minHeap = new MinHeap();
    const seen = new Set();
    
    minHeap.push(1);
    seen.add(1);
    
    const primes = [2, 3, 5];
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

## 三指针解法（更优）

堆解法的空间复杂度较高，有一个更优雅的 O(n) 空间解法：

```javascript
function nthUglyNumber(n) {
    const dp = new Array(n);
    dp[0] = 1;
    
    let p2 = 0, p3 = 0, p5 = 0;  // 三个指针
    
    for (let i = 1; i < n; i++) {
        const next2 = dp[p2] * 2;
        const next3 = dp[p3] * 3;
        const next5 = dp[p5] * 5;
        
        // 取三者最小
        dp[i] = Math.min(next2, next3, next5);
        
        // 移动对应的指针
        if (dp[i] === next2) p2++;
        if (dp[i] === next3) p3++;
        if (dp[i] === next5) p5++;
    }
    
    return dp[n - 1];
}
```

这个解法的思想：
- 维护三个指针，分别指向"下一个要乘以 2/3/5 的丑数"
- 每次取三个候选中最小的
- 如果相等（如 6 = 2×3 = 3×2），多个指针同时前进，自动去重

## 复杂度分析

**堆解法**：
- 时间复杂度：O(n log n)
- 空间复杂度：O(n)（堆和 Set）

**三指针解法**：
- 时间复杂度：O(n)
- 空间复杂度：O(n)（dp 数组）

## 小结

这道题展示了堆在**生成有序序列**中的应用：

**核心模式**：
- 从已知元素生成新元素
- 用最小堆维护"待处理"的候选
- 每次取最小的处理
- 用 Set 避免重复

这个模式适用于：
- 丑数系列问题
- 多个有序序列的归并
- 任何"从小到大生成"的场景

三指针解法则展示了针对特定问题的优化思路，值得学习。
