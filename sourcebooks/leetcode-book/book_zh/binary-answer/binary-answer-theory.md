# 二分答案理论

二分答案是二分查找的高级应用。不再是在数组中搜索元素，而是在**答案的可能范围**中搜索最优解。

## 什么是二分答案？

当问题的答案满足**单调性**时，可以用二分查找来找最优答案：
- 如果答案A可行，那么所有≥A（或≤A）的答案也可行
- 如果答案A不可行，那么所有≤A（或≥A）的答案也不可行

## 典型场景

1. **最小化最大值**：将某个最大值控制在最小
2. **最大化最小值**：将某个最小值提升到最大
3. **找满足条件的临界值**：第一个能完成任务的值

## 核心框架

```javascript
function binaryAnswer(check) {
    let left = MIN_POSSIBLE;   // 答案下界
    let right = MAX_POSSIBLE;  // 答案上界
    
    while (left < right) {
        const mid = left + Math.floor((right - left) / 2);
        
        if (check(mid)) {
            // mid可行，尝试更优的答案
            right = mid;  // 找最小可行解
            // 或 left = mid;  // 找最大可行解（需特殊处理）
        } else {
            left = mid + 1;
        }
    }
    
    return left;
}
```

## 关键步骤

### 1. 确定答案范围

找出答案的最小和最大可能值：
- 最小值：问题的极端下界
- 最大值：问题的极端上界

### 2. 设计判断函数

给定一个答案值，判断是否可行。

**判断函数必须满足单调性**：
- 如果x可行，那么x+1也可行（找最小）
- 或者：如果x可行，那么x-1也可行（找最大）

### 3. 选择二分方向

- **找最小可行解**：可行时`right = mid`
- **找最大可行解**：可行时`left = mid`（需要特殊处理防止死循环）

## 示例：吃香蕉的速度

珂珂每小时吃K根香蕉，有n堆香蕉，第i堆有piles[i]根。警卫H小时后回来。求K的最小值使得能吃完。

```javascript
function minEatingSpeed(piles, h) {
    // 答案范围：[1, max(piles)]
    let left = 1;
    let right = Math.max(...piles);
    
    while (left < right) {
        const mid = left + Math.floor((right - left) / 2);
        
        if (canFinish(piles, h, mid)) {
            right = mid;  // 可以吃完，尝试更慢的速度
        } else {
            left = mid + 1;  // 吃不完，需要更快
        }
    }
    
    return left;
}

function canFinish(piles, h, k) {
    let hours = 0;
    for (const pile of piles) {
        hours += Math.ceil(pile / k);
    }
    return hours <= h;
}
```

## 与普通二分的区别

| 普通二分 | 二分答案 |
|---------|---------|
| 搜索数组中的元素 | 搜索答案空间 |
| 比较元素值 | 调用判断函数 |
| 找到就返回 | 找最优解 |

## 适用条件

1. **答案有范围**：能确定最小和最大可能值
2. **可验证**：给定答案能判断是否可行
3. **单调性**：答案的可行性满足单调关系

## 常见题型

- 送包裹、分割数组、吃香蕉（最小化最大值）
- 磁力、分配问题（最大化最小值）
- 找第K小的距离对

## 小结

二分答案的核心：

1. **从元素搜索到答案搜索**：在答案范围内二分
2. **判断函数是关键**：需要O(n)或O(n log n)的验证
3. **单调性保证正确性**：可行性随答案单调变化
4. **时间复杂度**：O(check * log(range))

下一章我们详细讨论答案空间和单调性的概念。
