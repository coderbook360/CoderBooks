# 数组的度

> LeetCode 697. Degree of an Array

给定一个非空且只包含非负整数的数组，找到与该数组具有相同度的最短连续子数组，返回其长度。

这道题的关键是理解"数组的度"这个概念，以及如何用哈希表高效记录所需信息。

## 问题描述

```javascript
输入：nums = [1, 2, 2, 3, 1]
输出：2

解释：
- 数组的度是 2（元素 1 和 2 都出现了 2 次）
- 包含元素 2 的最短子数组是 [2, 2]，长度为 2
- 包含元素 1 的最短子数组是 [1, 2, 2, 3, 1]，长度为 5
- 答案是 2
```

```javascript
输入：nums = [1, 2, 2, 3, 1, 4, 2]
输出：6

解释：
- 数组的度是 3（元素 2 出现了 3 次）
- 包含所有 2 的最短子数组是 [2, 2, 3, 1, 4, 2]，长度为 6
```

## 思路分析

### 什么是数组的度

**数组的度** = 数组中出现次数最多的元素的出现次数。

### 问题转化

我们要找的是：包含某个"最高频元素"的所有出现位置的最短子数组。

换句话说：对于每个出现次数等于数组的度的元素，计算从它第一次出现到最后一次出现的长度，取最小值。

### 需要记录的信息

对于每个元素，我们需要知道：
1. **出现频率**：判断是否达到"度"
2. **首次出现位置**：计算子数组起点
3. **最后出现位置**：计算子数组终点

一次遍历就能收集所有信息。

## 解法详解

```javascript
function findShortestSubArray(nums) {
    // map: num → [频率, 首次位置, 最后位置]
    const map = new Map();
    
    // 一次遍历，收集所有信息
    for (let i = 0; i < nums.length; i++) {
        const num = nums[i];
        
        if (map.has(num)) {
            const info = map.get(num);
            info[0]++;      // 频率 +1
            info[2] = i;    // 更新最后位置
        } else {
            // [频率, 首次位置, 最后位置]
            map.set(num, [1, i, i]);
        }
    }
    
    // 找最大频率对应的最短长度
    let maxFreq = 0;
    let minLen = nums.length;
    
    for (const [num, [freq, first, last]] of map) {
        const len = last - first + 1;
        
        if (freq > maxFreq) {
            // 发现更高的频率
            maxFreq = freq;
            minLen = len;
        } else if (freq === maxFreq) {
            // 频率相同，取更短的长度
            minLen = Math.min(minLen, len);
        }
    }
    
    return minLen;
}
```

### 执行过程

以 `[1, 2, 2, 3, 1]` 为例：

```
遍历过程:

i=0, num=1: map 新增 1 → [1, 0, 0]
i=1, num=2: map 新增 2 → [1, 1, 1]
i=2, num=2: 更新 2 → [2, 1, 2]
i=3, num=3: map 新增 3 → [1, 3, 3]
i=4, num=1: 更新 1 → [2, 0, 4]

最终 map:
  1 → [2, 0, 4]  频率2，跨度5
  2 → [2, 1, 2]  频率2，跨度2
  3 → [1, 3, 3]  频率1，跨度1

查找最短:
  maxFreq=0, minLen=5

  检查 1: freq=2 > 0, maxFreq=2, minLen=5
  检查 2: freq=2 = maxFreq, minLen=min(5,2)=2
  检查 3: freq=1 < maxFreq, 跳过

返回 2
```

## 复杂度分析

**时间复杂度：O(n)**
- 遍历数组一次收集信息
- 遍历 map 一次查找结果
- map 最多有 n 个元素

**空间复杂度：O(n)**
- 哈希表存储最多 n 个不同元素的信息

## 边界情况

```javascript
// 单元素
findShortestSubArray([1])       // 1

// 所有元素都不同
findShortestSubArray([1, 2, 3]) // 1（度为1，任何元素自己就是答案）

// 所有元素都相同
findShortestSubArray([1, 1, 1]) // 3（必须包含所有1）

// 多个元素都达到最大频率
findShortestSubArray([1, 2, 2, 1])  
// 度=2，元素1跨度4，元素2跨度2，返回2
```

## 常见误区

**误区一：只记录频率**

```javascript
// ❌ 只知道频率，无法计算长度
const countMap = new Map();
for (const num of nums) {
    countMap.set(num, (countMap.get(num) || 0) + 1);
}
// 还需要再次遍历找位置...
```

**误区二：多次遍历**

有些人会先遍历一次找频率，再遍历一次找位置。其实一次遍历就够了。

## 另一种写法

如果你喜欢用对象而不是 Map：

```javascript
function findShortestSubArray(nums) {
    const info = {};  // num → {count, first, last}
    
    for (let i = 0; i < nums.length; i++) {
        const num = nums[i];
        if (num in info) {
            info[num].count++;
            info[num].last = i;
        } else {
            info[num] = { count: 1, first: i, last: i };
        }
    }
    
    let maxFreq = 0;
    let minLen = nums.length;
    
    for (const num in info) {
        const { count, first, last } = info[num];
        const len = last - first + 1;
        
        if (count > maxFreq || (count === maxFreq && len < minLen)) {
            maxFreq = count;
            minLen = len;
        }
    }
    
    return minLen;
}
```

## 小结

这道题的关键点：

1. **理解问题**：度 = 最高频率，目标 = 包含该元素的最短子数组
2. **信息收集**：一次遍历记录频率、首位置、末位置
3. **求解**：遍历统计结果，找最高频率对应的最短跨度

这种"用哈希表记录多维信息"的技巧很常用。当你需要同时追踪元素的多个属性时，可以用数组或对象作为哈希表的值。
