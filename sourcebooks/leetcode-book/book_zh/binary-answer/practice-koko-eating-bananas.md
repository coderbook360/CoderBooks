# 实战：爱吃香蕉的珂珂

这是二分答案最经典的入门题，完美展示了"在答案空间二分"的思想。

## 问题描述

珂珂喜欢吃香蕉。这里有`n`堆香蕉，第`i`堆中有`piles[i]`根香蕉。警卫已经离开了，将在`h`小时后回来。

珂珂可以决定她吃香蕉的速度`k`（单位：根/小时）。每个小时，她将会选择一堆香蕉，从中吃掉`k`根。如果这堆香蕉少于`k`根，她将吃掉这堆的所有香蕉，然后这一小时内不会再吃更多的香蕉。

珂珂喜欢慢慢吃，但仍然想在警卫回来前吃掉所有的香蕉。

返回她可以在`h`小时内吃掉所有香蕉的**最小速度**`k`。

**示例**：
```
输入：piles = [3,6,7,11], h = 8
输出：4

输入：piles = [30,11,23,4,20], h = 5
输出：30

输入：piles = [30,11,23,4,20], h = 6
输出：23
```

## 思路分析

### 确定答案空间

- **下界**：1（最慢每小时吃1根）
- **上界**：max(piles)（最快每小时吃完最大的一堆）

### 单调性

速度越快，吃完所有香蕉的时间越短，越容易在h小时内完成。

### 判断函数

给定速度k，计算吃完所有香蕉需要多少小时。

## 完整实现

```javascript
/**
 * @param {number[]} piles
 * @param {number} h
 * @return {number}
 */
function minEatingSpeed(piles, h) {
    let left = 1;
    let right = Math.max(...piles);
    
    while (left < right) {
        const mid = left + Math.floor((right - left) / 2);
        
        if (canFinish(piles, h, mid)) {
            // 速度mid可以吃完，尝试更慢的速度
            right = mid;
        } else {
            // 速度mid吃不完，需要更快
            left = mid + 1;
        }
    }
    
    return left;
}

function canFinish(piles, h, speed) {
    let hours = 0;
    
    for (const pile of piles) {
        // 吃完这堆需要的时间（向上取整）
        hours += Math.ceil(pile / speed);
    }
    
    return hours <= h;
}
```

## 执行过程

```
piles = [3, 6, 7, 11], h = 8

left=1, right=11

step 1: mid=6
  canFinish(6): 1+1+2+2=6 ≤ 8 ✓
  right = 6

step 2: mid=3
  canFinish(3): 1+2+3+4=10 > 8 ✗
  left = 4

step 3: mid=5
  canFinish(5): 1+2+2+3=8 ≤ 8 ✓
  right = 5

step 4: mid=4
  canFinish(4): 1+2+2+3=8 ≤ 8 ✓
  right = 4

left = right = 4, 返回4
```

## 为什么用 Math.ceil？

每堆香蕉不足一小时也要占用一小时：
- 11根香蕉，速度4：需要 ⌈11/4⌉ = 3 小时
- 3根香蕉，速度4：需要 ⌈3/4⌉ = 1 小时

## 优化：更紧的下界

下界可以设为 `⌈sum(piles) / h⌉`：
- 如果所有香蕉排成一排不分堆，速度至少要这么快才能吃完

```javascript
let left = Math.ceil(piles.reduce((a, b) => a + b, 0) / h);
```

## 复杂度分析

**时间复杂度**：O(n * log(max))
- 二分次数：O(log(max))
- 每次判断：O(n)

**空间复杂度**：O(1)

## 小结

吃香蕉问题的要点：

1. **答案空间**：[1, max(piles)]
2. **单调性**：速度越快越容易吃完
3. **判断函数**：计算总时间是否≤h
4. **向上取整**：不满一小时也要占用一小时

这是学习二分答案的第一道题，务必深入理解。
