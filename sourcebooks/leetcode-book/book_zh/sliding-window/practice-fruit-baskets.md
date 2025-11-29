# 实战：水果成篮

这是一个典型的"最多包含K种元素"的滑动窗口问题。理解这道题，可以解决一类相似的问题。

## 问题描述

你正在参观一个农场，农场从左到右种植了一排果树。这些树用整数数组`fruits`表示，其中`fruits[i]`是第`i`棵树产出的水果种类。

你有两个篮子，每个篮子只能装**一种**水果。你从任意一棵树开始，向右采摘，直到不能继续为止。

返回你可以采摘的水果的**最大数目**。

**示例**：
```
输入：fruits = [1,2,1]
输出：3
解释：可以采摘全部 3 棵树

输入：fruits = [0,1,2,2]
输出：3
解释：采摘 [1,2,2]，共 3 个

输入：fruits = [1,2,3,2,2]
输出：4
解释：采摘 [2,3,2,2]，共 4 个
```

## 问题转化

两个篮子，每个装一种水果 → **最多包含2种不同元素的最长子数组**

这是标准的滑动窗口问题。

## 思路分析

1. **窗口定义**：包含最多2种水果的连续子数组
2. **窗口状态**：当前窗口中各种水果的数量
3. **收缩条件**：水果种类超过2种时收缩
4. **更新时机**：每次扩展后更新最大长度

## 完整实现

```javascript
/**
 * @param {number[]} fruits
 * @return {number}
 */
function totalFruit(fruits) {
    const count = new Map();  // 水果种类 -> 数量
    let left = 0;
    let maxLen = 0;
    
    for (let right = 0; right < fruits.length; right++) {
        // 扩展窗口
        const fruit = fruits[right];
        count.set(fruit, (count.get(fruit) || 0) + 1);
        
        // 种类超过2，收缩窗口
        while (count.size > 2) {
            const leftFruit = fruits[left];
            count.set(leftFruit, count.get(leftFruit) - 1);
            if (count.get(leftFruit) === 0) {
                count.delete(leftFruit);
            }
            left++;
        }
        
        // 更新最大长度
        maxLen = Math.max(maxLen, right - left + 1);
    }
    
    return maxLen;
}
```

## 执行过程

```
fruits = [1, 2, 3, 2, 2]

right=0: fruit=1, count={1:1}, size=1, maxLen=1
right=1: fruit=2, count={1:1,2:1}, size=2, maxLen=2
right=2: fruit=3, count={1:1,2:1,3:1}, size=3 > 2
  收缩：移除1, count={2:1,3:1}, left=1
  size=2, maxLen=2
right=3: fruit=2, count={2:2,3:1}, size=2, maxLen=3
right=4: fruit=2, count={2:3,3:1}, size=2, maxLen=4

结果：4
```

## 通用化：最多K种元素

```javascript
function maxSubarrayWithKDistinct(nums, k) {
    const count = new Map();
    let left = 0;
    let maxLen = 0;
    
    for (let right = 0; right < nums.length; right++) {
        count.set(nums[right], (count.get(nums[right]) || 0) + 1);
        
        while (count.size > k) {
            const leftNum = nums[left];
            count.set(leftNum, count.get(leftNum) - 1);
            if (count.get(leftNum) === 0) {
                count.delete(leftNum);
            }
            left++;
        }
        
        maxLen = Math.max(maxLen, right - left + 1);
    }
    
    return maxLen;
}

// 水果成篮就是 k=2 的情况
function totalFruit(fruits) {
    return maxSubarrayWithKDistinct(fruits, 2);
}
```

## 复杂度分析

**时间复杂度**：O(n)
- 每个元素最多进出窗口各一次

**空间复杂度**：O(k)
- Map最多存储k+1种元素（触发收缩前）

## 小结

水果成篮的要点：

1. **问题转化**：两个篮子 → 最多2种元素
2. **窗口状态**：用Map记录每种元素的数量
3. **收缩条件**：元素种类超过限制时收缩
4. **通用模板**：可以扩展到最多K种元素

这类"最多K种不同元素"的问题是滑动窗口的经典应用。
