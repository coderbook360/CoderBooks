# 实战：滑动窗口最大值

这是单调队列的经典应用题。给定一个数组和窗口大小 k，求每个窗口的最大值。

---

## 问题描述

**LeetCode 239. Sliding Window Maximum**

给你一个整数数组 nums 和一个整数 k，有一个大小为 k 的滑动窗口从数组最左侧移动到最右侧。你只能看到在滑动窗口内的 k 个数字。返回每个窗口的最大值。

**示例**：
```
输入：nums = [1,3,-1,-3,5,3,6,7], k = 3
输出：[3,3,5,5,6,7]
```

---

## 思路：单调递减队列

维护一个单调递减的双端队列：
1. 队头是当前窗口的最大值
2. 入队时，移除所有比当前元素小的元素（它们不可能成为最大值）
3. 出队时，检查队头是否超出窗口范围

---

## 解法

```javascript
function maxSlidingWindow(nums, k) {
  const n = nums.length;
  const result = [];
  const deque = [];  // 存索引，对应值单调递减
  
  for (let i = 0; i < n; i++) {
    // 1. 移除超出窗口的元素
    while (deque.length > 0 && deque[0] < i - k + 1) {
      deque.shift();
    }
    
    // 2. 维护单调性
    while (deque.length > 0 && nums[deque[deque.length - 1]] < nums[i]) {
      deque.pop();
    }
    
    // 3. 入队
    deque.push(i);
    
    // 4. 记录结果
    if (i >= k - 1) {
      result.push(nums[deque[0]]);
    }
  }
  
  return result;
}
```

---

## 执行过程

```
nums = [1,3,-1,-3,5,3,6,7], k = 3

i=0: deque=[0]
i=1: 3>1, pop, deque=[1]
i=2: -1<3, deque=[1,2], result=[3]
i=3: -3<-1, deque=[1,2,3], 检查1>=1, result=[3,3]
i=4: 5>-3>-1>3, 全pop, deque=[4], result=[3,3,5]
i=5: 3<5, deque=[4,5], result=[3,3,5,5]
i=6: 6>3>5, deque=[6], result=[3,3,5,5,6]
i=7: 7>6, deque=[7], result=[3,3,5,5,6,7]
```

---

## 滑动窗口最小值

只需改变比较方向（维护单调递增队列）：

```javascript
// 把 < 改成 >
while (deque.length > 0 && nums[deque[deque.length - 1]] > nums[i]) {
  deque.pop();
}
```

---

## 复杂度

- 时间：O(n)，每个元素最多入队出队各一次
- 空间：O(k)

---

## 技巧总结

单调队列模板的关键点：
1. **存索引**：方便判断是否过期
2. **两端操作**：队头移除过期，队尾维护单调性
3. **队头就是答案**：因为保持单调
