# 实战：制作m束花所需的最少天数

这道题展示了二分答案在时间维度上的应用。

## 问题描述

给你一个整数数组`bloomDay`，以及两个整数`m`和`k`。

现需要制作`m`束花。制作花束时，需要使用花园中**相邻的k朵花**。

花园中有`n`朵花，第`i`朵花会在`bloomDay[i]`天盛开，且只能在盛开时采摘。

返回从花园中摘`m`束花需要等待的**最少天数**。如果不能摘到`m`束花返回`-1`。

## 思路分析

### 为什么是二分答案？

要找的是"最少天数"——一个时间值，而不是数组下标。

### 答案空间

- **下界**：min(bloomDay)，最早开花的那天
- **上界**：max(bloomDay)，最晚开花的那天

### 单调性

等待天数越长，开花的越多，能做的花束越多。

### 判断函数

给定天数`day`，能否制作`m`束花？

关键：需要**相邻的k朵**已开花的花。

```javascript
function canMake(bloomDay, m, k, day) {
    let bouquets = 0;
    let consecutive = 0;
    
    for (const bloom of bloomDay) {
        if (bloom <= day) {
            consecutive++;
            if (consecutive === k) {
                bouquets++;
                consecutive = 0;
            }
        } else {
            consecutive = 0;
        }
    }
    
    return bouquets >= m;
}
```

## 完整实现

```javascript
function minDays(bloomDay, m, k) {
    // 提前判断：花的总数不够
    if (m * k > bloomDay.length) {
        return -1;
    }
    
    let left = Math.min(...bloomDay);
    let right = Math.max(...bloomDay);
    
    while (left < right) {
        const mid = left + Math.floor((right - left) / 2);
        
        if (canMake(bloomDay, m, k, mid)) {
            right = mid;
        } else {
            left = mid + 1;
        }
    }
    
    return left;
}

function canMake(bloomDay, m, k, day) {
    let bouquets = 0;
    let consecutive = 0;
    
    for (const bloom of bloomDay) {
        if (bloom <= day) {
            consecutive++;
            if (consecutive === k) {
                bouquets++;
                consecutive = 0;
            }
        } else {
            consecutive = 0;
        }
    }
    
    return bouquets >= m;
}
```

## 关键点

### 相邻性约束

这道题的特殊之处在于"相邻"约束。不是统计总共多少花开了，而是要找连续的k朵。

所以判断函数需要维护一个连续计数器，遇到没开的花就重置。

### 边界条件

别忘了先判断`m * k > n`的情况，这时无解。

## 复杂度分析

**时间复杂度**：O(n * log(max - min))

**空间复杂度**：O(1)

## 小结

这道题展示了二分答案在时间维度的应用：
- 答案是"天数"，具有明确的上下界
- 天数越长越容易成功，满足单调性
- 判断函数需要处理"相邻"这个额外约束
