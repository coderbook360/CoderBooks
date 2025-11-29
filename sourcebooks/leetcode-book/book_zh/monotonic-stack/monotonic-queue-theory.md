# 单调队列基础理论

单调队列是单调栈的"升级版"——它不仅能访问一端，还能访问两端。这让它成为解决**滑动窗口最值**问题的利器。

## 什么是单调队列？

**单调队列**是一个双端队列（Deque），队列中的元素保持单调递增或单调递减。

与普通队列的区别：
- 普通队列：只能队尾入，队头出
- 双端队列：两端都可以入和出
- 单调队列：在双端队列基础上维护单调性

## 为什么需要单调队列？

考虑问题：在大小为k的滑动窗口中，如何O(1)获取最大值？

**暴力方法**：每次遍历窗口内k个元素，O(n×k)。

**单调队列**：维护一个递减队列，队头始终是最大值，O(n)。

## 单调递减队列

```javascript
class MonotonicQueue {
    constructor() {
        this.deque = [];  // 存储索引，对应值递减
    }
    
    // 添加元素（从队尾）
    push(index, value, values) {
        // 弹出所有比当前值小的元素
        while (this.deque.length && values[this.deque[this.deque.length - 1]] < value) {
            this.deque.pop();
        }
        this.deque.push(index);
    }
    
    // 获取最大值（队头）
    max(values) {
        return values[this.deque[0]];
    }
    
    // 移除过期元素（窗口滑动时）
    shift(leftBound) {
        if (this.deque.length && this.deque[0] < leftBound) {
            this.deque.shift();
        }
    }
}
```

## 滑动窗口最大值

这是单调队列最经典的应用：

```javascript
function maxSlidingWindow(nums, k) {
    const deque = [];      // 存储索引，对应值单调递减
    const result = [];
    
    for (let i = 0; i < nums.length; i++) {
        // 1. 移除窗口外的元素
        if (deque.length && deque[0] <= i - k) {
            deque.shift();
        }
        
        // 2. 维护单调递减：弹出所有比当前小的
        while (deque.length && nums[deque[deque.length - 1]] < nums[i]) {
            deque.pop();
        }
        
        // 3. 当前元素入队
        deque.push(i);
        
        // 4. 记录结果（窗口形成后）
        if (i >= k - 1) {
            result.push(nums[deque[0]]);  // 队头是最大值
        }
    }
    
    return result;
}
```

## 执行过程图解

以`nums = [1,3,-1,-3,5,3,6,7]`，`k = 3`为例：

```
i=0, nums[0]=1:
  deque为空，入队
  deque: [0] -> [1]

i=1, nums[1]=3:
  3 > 1，弹出0
  入队1
  deque: [1] -> [3]

i=2, nums[2]=-1:
  -1 < 3，直接入队
  deque: [1, 2] -> [3, -1]
  窗口[1,3,-1]形成，最大值=3

i=3, nums[3]=-3:
  -3 < -1，直接入队
  deque: [1, 2, 3] -> [3, -1, -3]
  窗口[3,-1,-3]，最大值=3

i=4, nums[4]=5:
  索引1超出窗口(4-3=1)，移除队头
  5 > -3，弹出3
  5 > -1，弹出2
  入队4
  deque: [4] -> [5]
  窗口[-1,-3,5]，最大值=5

i=5, nums[5]=3:
  3 < 5，直接入队
  deque: [4, 5] -> [5, 3]
  窗口[-3,5,3]，最大值=5

i=6, nums[6]=6:
  6 > 3，弹出5
  6 > 5，弹出4
  入队6
  deque: [6] -> [6]
  窗口[5,3,6]，最大值=6

i=7, nums[7]=7:
  7 > 6，弹出6
  入队7
  deque: [7] -> [7]
  窗口[3,6,7]，最大值=7

结果: [3, 3, 5, 5, 6, 7]
```

## 为什么队头是最大值？

因为我们维护的是**单调递减**队列：
- 新元素入队前，弹出所有比它小的
- 所以队头一定是当前窗口中最大的那个

**关键洞察**：被弹出的元素"注定不会成为答案"。如果一个元素比后来的元素小，而且进入窗口更早，那它永远不可能是窗口最大值。

## 滑动窗口最小值

只需将递减改为递增：

```javascript
function minSlidingWindow(nums, k) {
    const deque = [];      // 存储索引，对应值单调递增
    const result = [];
    
    for (let i = 0; i < nums.length; i++) {
        // 移除窗口外的元素
        if (deque.length && deque[0] <= i - k) {
            deque.shift();
        }
        
        // 维护单调递增：弹出所有比当前大的
        while (deque.length && nums[deque[deque.length - 1]] > nums[i]) {
            deque.pop();
        }
        
        deque.push(i);
        
        if (i >= k - 1) {
            result.push(nums[deque[0]]);  // 队头是最小值
        }
    }
    
    return result;
}
```

## 单调队列 vs 单调栈

| 特性 | 单调栈 | 单调队列 |
|------|--------|----------|
| 数据结构 | 栈 | 双端队列 |
| 操作端 | 只能栈顶 | 两端都可以 |
| 典型问题 | 下一个更大/更小元素 | 滑动窗口最值 |
| 窗口支持 | 不支持 | 天然支持 |

## 复杂度分析

**时间复杂度：O(n)**
- 每个元素最多入队一次、出队一次
- `shift()`和`pop()`总次数不超过n

**空间复杂度：O(k)**
- 队列最多存储k个元素

## 应用场景

1. **滑动窗口最值**：最大值、最小值
2. **滑动窗口中位数**（配合其他结构）
3. **满足条件的最长子数组**
4. **单调队列优化DP**

## 代码模板

```javascript
// 滑动窗口最大值模板
function slidingWindowMax(nums, k) {
    const deque = [];  // 单调递减队列，存索引
    const result = [];
    
    for (let i = 0; i < nums.length; i++) {
        // 1. 移除过期元素
        while (deque.length && deque[0] <= i - k) {
            deque.shift();
        }
        
        // 2. 维护单调性
        while (deque.length && nums[deque[deque.length - 1]] < nums[i]) {
            deque.pop();
        }
        
        // 3. 入队
        deque.push(i);
        
        // 4. 收集结果
        if (i >= k - 1) {
            result.push(nums[deque[0]]);
        }
    }
    
    return result;
}
```

## 小结

单调队列的核心思想：

1. **双端队列**：可以从两端操作
2. **维护单调性**：新元素入队前，从队尾弹出破坏单调性的元素
3. **过期处理**：窗口滑动时，从队头移除超出范围的元素
4. **队头是答案**：单调递减队列的队头是最大值

单调队列是滑动窗口问题的神器，掌握它能让O(n×k)的问题降到O(n)。
