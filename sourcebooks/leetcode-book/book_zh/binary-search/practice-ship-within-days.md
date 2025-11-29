# 实战：在 D 天内送达包裹的能力

这是"二分答案"的经典题目。答案在一个范围内，用二分查找来找最优答案。

## 问题描述

传送带上的包裹必须在`days`天内从一个港口运送到另一个港口。

传送带上的第`i`个包裹的重量为`weights[i]`。每一天，我们都会按给出重量的顺序往传送带上装载包裹。我们装载的重量不会超过船的最大运载能力。

返回能在`days`天内将所有包裹送达的船的**最低运载能力**。

**示例**：
```
输入：weights = [1,2,3,4,5,6,7,8,9,10], days = 5
输出：15
解释：
船的最低运载能力为15，以下是一种可行方案：
第1天：1,2,3,4,5
第2天：6,7
第3天：8
第4天：9
第5天：10
```

## 思路分析

### 二分答案

不是在数组中二分，而是在**答案的可能范围**中二分。

**答案范围**：
- 最小：max(weights)，至少要能装下最重的包裹
- 最大：sum(weights)，一天装完所有包裹

**判断函数**：给定运载能力cap，能否在days天内送完？

如果能在days天内送完，尝试更小的cap。
如果不能，需要更大的cap。

## 完整实现

```javascript
/**
 * @param {number[]} weights
 * @param {number} days
 * @return {number}
 */
function shipWithinDays(weights, days) {
    // 答案范围
    let left = Math.max(...weights);
    let right = weights.reduce((a, b) => a + b, 0);
    
    while (left < right) {
        const mid = left + Math.floor((right - left) / 2);
        
        if (canShip(weights, days, mid)) {
            // 可以送完，尝试更小的运载能力
            right = mid;
        } else {
            // 送不完，需要更大的运载能力
            left = mid + 1;
        }
    }
    
    return left;
}

// 判断运载能力为cap时，能否在days天内送完
function canShip(weights, days, cap) {
    let daysNeeded = 1;
    let currentLoad = 0;
    
    for (const w of weights) {
        if (currentLoad + w > cap) {
            // 当前船装不下，新开一天
            daysNeeded++;
            currentLoad = w;
        } else {
            currentLoad += w;
        }
    }
    
    return daysNeeded <= days;
}
```

## 执行过程

```
weights = [1,2,3,4,5,6,7,8,9,10], days = 5

left = 10 (最重的包裹)
right = 55 (总重量)

step 1: mid=32, canShip(32) = true (1天)
  right = 32

step 2: mid=21, canShip(21) = true (3天)
  right = 21

step 3: mid=15, canShip(15) = true (5天)
  right = 15

step 4: mid=12, canShip(12) = false (7天 > 5)
  left = 13

step 5: mid=14, canShip(14) = false (6天 > 5)
  left = 15

left = right = 15, 返回15
```

## 二分答案的模板

```javascript
function binarySearchAnswer(check) {
    let left = MIN_POSSIBLE_ANSWER;
    let right = MAX_POSSIBLE_ANSWER;
    
    while (left < right) {
        const mid = left + Math.floor((right - left) / 2);
        
        if (check(mid)) {
            // 找最小可行解：right = mid
            // 找最大可行解：left = mid + 1
            right = mid;
        } else {
            left = mid + 1;
        }
    }
    
    return left;
}
```

## 关键点

### 1. 确定答案范围

- 最小值：问题的下界（必须能装下最大的单个包裹）
- 最大值：问题的上界（最极端情况）

### 2. 设计判断函数

判断函数必须满足**单调性**：
- 如果cap能完成，cap+1也能完成
- 如果cap不能完成，cap-1也不能完成

### 3. 选择正确的二分方向

- 找**最小**可行解：满足条件时`right = mid`
- 找**最大**可行解：满足条件时`left = mid`（需要特殊处理避免死循环）

## 复杂度分析

**时间复杂度**：O(n * log(sum - max))
- 二分次数：O(log(sum - max))
- 每次判断：O(n)

**空间复杂度**：O(1)

## 小结

二分答案的要点：

1. **答案在范围内**：确定答案的最小和最大可能值
2. **判断函数单调**：给定答案，能判断是否可行
3. **二分搜索**：在答案范围内找最优解
4. **模板化**：找最小/最大可行解有固定模板

这是二分查找从"搜索元素"到"搜索答案"的升级。
