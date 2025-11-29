# 实战：在D天内送达包裹（二分答案）

这道题我们在二分查找章节已经介绍过，这里从二分答案的角度重新审视。

## 问题描述

传送带上的包裹必须在`days`天内从一个港口运送到另一个港口。

传送带上的第`i`个包裹的重量为`weights[i]`。每一天，我们都会按给出重量的顺序往传送带上装载包裹。我们装载的重量不会超过船的最大运载能力。

返回能在`days`天内将所有包裹送达的船的**最低运载能力**。

## 二分答案的视角

### 为什么是二分答案？

这道题要找的是"最低运载能力"——一个**答案值**，而不是数组中的元素。

### 答案空间

- **下界**：max(weights)，至少能装下最重的包裹
- **上界**：sum(weights)，一天装完所有

### 单调性

运载能力越大，需要的天数越少，越容易满足days的要求。

## 完整实现

```javascript
function shipWithinDays(weights, days) {
    let left = Math.max(...weights);
    let right = weights.reduce((a, b) => a + b, 0);
    
    while (left < right) {
        const mid = left + Math.floor((right - left) / 2);
        
        if (canShip(weights, days, mid)) {
            right = mid;
        } else {
            left = mid + 1;
        }
    }
    
    return left;
}

function canShip(weights, days, capacity) {
    let daysNeeded = 1;
    let currentLoad = 0;
    
    for (const w of weights) {
        if (currentLoad + w > capacity) {
            daysNeeded++;
            currentLoad = w;
        } else {
            currentLoad += w;
        }
    }
    
    return daysNeeded <= days;
}
```

## 与吃香蕉的对比

| 问题 | 答案含义 | 下界 | 上界 | 单调性 |
|-----|---------|------|------|-------|
| 吃香蕉 | 速度 | 1 | max(piles) | 速度↑ → 时间↓ |
| 送包裹 | 运载能力 | max(weights) | sum(weights) | 能力↑ → 天数↓ |

两者结构完全相同，只是问题背景不同。

## 判断函数的贪心性质

判断函数用的是贪心策略：每天尽可能多装，装不下就开新的一天。

为什么贪心是正确的？
- 包裹必须按顺序装，不能跳过
- 每天装得越多，需要的天数越少
- 所以应该每天尽可能装满

## 复杂度分析

**时间复杂度**：O(n * log(sum - max))

**空间复杂度**：O(1)

## 小结

送包裹问题是二分答案的典型应用：
1. 确定答案范围
2. 设计判断函数
3. 二分找最小可行解

掌握这个模式，可以解决一大类相似问题。
