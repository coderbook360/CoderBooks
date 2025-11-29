# 实战：盛最多水的容器

这是对撞指针的经典题目，需要理解为什么贪心策略是正确的。

## 问题描述

给定一个长度为`n`的整数数组`height`，有n条垂线，第i条线的两个端点是`(i, 0)`和`(i, height[i])`。

找出其中的两条线，使得它们与x轴共同构成的容器可以容纳最多的水。返回容器可以储存的最大水量。

**示例**：
```
height = [1,8,6,2,5,4,8,3,7]

      |         |
      |         |     |
      |   |     |     |
      |   |  |  |     |
      |   |  |  |  |  |
      |   |  |  |  |  |
      | | |  |  |  |  | |
   | | | |  |  |  |  | |
  ―――――――――――――――――――――――――
   0 1 2 3  4  5  6  7 8

最大面积 = min(8,7) × (8-1) = 7 × 7 = 49
```

## 思路分析

### 暴力思路

检查所有可能的线对，计算面积，取最大值。时间O(n²)。

### 双指针思路

从两端开始，逐步向中间移动：

```javascript
面积 = min(height[left], height[right]) × (right - left)
```

关键问题：**该移动哪个指针？**

**答案：移动较矮的那个。**

### 为什么移动较矮的那个？

假设`height[left] < height[right]`：

- 当前面积 = `height[left] × (right - left)`
- 如果移动right（较高的）：
  - 宽度减少
  - 高度最多等于`height[left]`（被短板限制）
  - 面积必定不增
- 如果移动left（较矮的）：
  - 宽度减少
  - 但可能找到更高的柱子，高度可能增加
  - 面积可能增大

所以，**移动较矮的指针是唯一可能找到更大面积的选择**。

## 完整实现

```javascript
/**
 * @param {number[]} height
 * @return {number}
 */
function maxArea(height) {
    let left = 0;
    let right = height.length - 1;
    let maxWater = 0;
    
    while (left < right) {
        // 计算当前面积
        const width = right - left;
        const h = Math.min(height[left], height[right]);
        const water = width * h;
        
        maxWater = Math.max(maxWater, water);
        
        // 移动较矮的指针
        if (height[left] < height[right]) {
            left++;
        } else {
            right--;
        }
    }
    
    return maxWater;
}
```

## 执行过程

```
height = [1,8,6,2,5,4,8,3,7]

left=0, right=8: min(1,7)×8 = 8, maxWater=8
  height[0]=1 < height[8]=7, left++
  
left=1, right=8: min(8,7)×7 = 49, maxWater=49
  height[1]=8 > height[8]=7, right--
  
left=1, right=7: min(8,3)×6 = 18
  height[1]=8 > height[7]=3, right--
  
left=1, right=6: min(8,8)×5 = 40
  height[1]=8 = height[6]=8, 移动任意一个
  ...

最终 maxWater = 49
```

## 正确性证明

每次移动较矮的指针时，我们"丢弃"了所有包含该指针的配对。

假设移动left，丢弃的配对是`(left, left+1), (left, left+2), ..., (left, right)`。

这些配对的面积最大是多少？由于高度被`height[left]`限制，宽度最大是`right - left`。所以最大就是当前计算的面积。

**我们没有丢弃任何可能更优的答案。**

## 复杂度分析

**时间复杂度**：O(n)
- 每个指针最多移动n次

**空间复杂度**：O(1)
- 只用了几个变量

## 相关问题：接雨水

接雨水是类似的问题，但更复杂。它需要计算每个位置能接多少水。

```
height = [0,1,0,2,1,0,1,3,2,1,2,1]

        |
    |   | |   |
  | | | | | | | | |
―――――――――――――――――――――
能接雨水 = 6
```

接雨水通常用双指针 + 前缀最大值来解决。

## 小结

这道题展示了对撞指针的一个重要变体：

1. **贪心选择**：每次移动较矮的指针
2. **正确性保证**：不会丢失最优解
3. **效率提升**：O(n²) → O(n)

理解"为什么移动较矮的"是这道题的关键。这种贪心 + 双指针的组合在很多题目中都会出现。
