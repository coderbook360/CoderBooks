# 实战：每日温度

从这道题开始，我们进入栈的高级应用——**单调栈**。单调栈是一种特殊的栈，其中的元素保持单调递增或单调递减的顺序。它能在O(n)时间内解决一类"找下一个更大/更小元素"的问题。

## 问题描述

给定一个整数数组`temperatures`，表示每天的温度。返回一个数组`answer`，其中`answer[i]`是指对于第`i`天，下一个更高温度出现在几天后。如果气温在这之后都不会升高，请在该位置用`0`来代替。

**示例**：
```
输入: [73,74,75,71,69,72,76,73]
输出: [1,1,4,2,1,1,0,0]

解释:
73的下一个更高温度是74，距离1天
74的下一个更高温度是75，距离1天
75的下一个更高温度是76，距离4天
71的下一个更高温度是72，距离2天
...
76之后没有更高温度，所以是0
```

## 思路分析

### 暴力解法：O(n²)

最直观的方法是对每一天，向后遍历找第一个更高的温度：

```javascript
function dailyTemperatures(temperatures) {
    const n = temperatures.length;
    const result = new Array(n).fill(0);
    
    for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
            if (temperatures[j] > temperatures[i]) {
                result[i] = j - i;
                break;
            }
        }
    }
    
    return result;
}
```

当数组很大且是递减序列时，这个方法会很慢。

### 单调栈：O(n)

**关键洞察**：我们从后往前看——当遍历到某一天时，比它矮的之前遍历过的日子都可以找到答案了。

**单调递减栈**：栈中元素从栈底到栈顶**递减**。当遇到更大的元素时，弹出所有更小的元素并计算它们的答案。

## 完整实现

```javascript
/**
 * @param {number[]} temperatures
 * @return {number[]}
 */
function dailyTemperatures(temperatures) {
    const n = temperatures.length;
    const result = new Array(n).fill(0);
    const stack = [];  // 存储索引，对应温度单调递减
    
    for (let i = 0; i < n; i++) {
        // 当前温度比栈顶温度高，栈顶元素找到了答案
        while (stack.length && temperatures[i] > temperatures[stack[stack.length - 1]]) {
            const prevIndex = stack.pop();
            result[prevIndex] = i - prevIndex;
        }
        // 当前索引入栈
        stack.push(i);
    }
    
    return result;
}
```

## 执行过程图解

以`[73,74,75,71,69,72,76,73]`为例：

```
索引:  0   1   2   3   4   5   6   7
温度: 73  74  75  71  69  72  76  73

遍历过程:

i=0 (73):
  栈空，直接入栈
  stack: [0]

i=1 (74):
  74 > 73，弹出0，result[0]=1-0=1
  stack: [], 然后入栈[1]
  stack: [1]

i=2 (75):
  75 > 74，弹出1，result[1]=2-1=1
  stack: [], 然后入栈[2]
  stack: [2]

i=3 (71):
  71 < 75，直接入栈
  stack: [2, 3]

i=4 (69):
  69 < 71，直接入栈
  stack: [2, 3, 4]

i=5 (72):
  72 > 69，弹出4，result[4]=5-4=1
  72 > 71，弹出3，result[3]=5-3=2
  72 < 75，停止，入栈
  stack: [2, 5]

i=6 (76):
  76 > 72，弹出5，result[5]=6-5=1
  76 > 75，弹出2，result[2]=6-2=4
  stack: [], 然后入栈[6]
  stack: [6]

i=7 (73):
  73 < 76，直接入栈
  stack: [6, 7]

遍历结束:
栈中剩余[6,7]，它们没有更高温度，result保持0

最终result: [1,1,4,2,1,1,0,0]
```

## 为什么叫"单调递减栈"？

栈中存储的是索引，但这些索引对应的温度是**从栈底到栈顶递减**的。

```
stack: [2, 3, 4]
对应温度: 75, 71, 69 (递减)
```

当遇到一个更大的温度时，会破坏单调性，所以要先弹出更小的元素。

## 为什么是正确的？

**证明**：对于被弹出的元素`prevIndex`，当前元素`i`是它右边第一个更大的元素。

- `prevIndex`入栈时，栈中比它小的元素都已被弹出
- 在`prevIndex`和`i`之间的元素要么小于等于`prevIndex`（在栈中），要么已被弹出
- 所以`i`一定是`prevIndex`右边第一个更大的元素

## 复杂度分析

**时间复杂度：O(n)**
- 每个元素最多入栈一次、出栈一次
- 总操作数不超过2n

**空间复杂度：O(n)**
- 最坏情况（递减序列），栈存储所有元素

## 单调栈的两种形式

### 单调递减栈（找下一个更大元素）

```javascript
// 栈底到栈顶递减
while (stack.length && nums[i] > nums[stack[stack.length - 1]]) {
    // 当前元素是被弹出元素的"下一个更大元素"
    const idx = stack.pop();
    result[idx] = i;  // 或 nums[i]
}
stack.push(i);
```

### 单调递增栈（找下一个更小元素）

```javascript
// 栈底到栈顶递增
while (stack.length && nums[i] < nums[stack[stack.length - 1]]) {
    // 当前元素是被弹出元素的"下一个更小元素"
    const idx = stack.pop();
    result[idx] = i;
}
stack.push(i);
```

## 变体：找上一个更大/更小元素

如果要找**上一个**更大元素，从左到右遍历，栈中元素就是候选：

```javascript
function previousGreater(nums) {
    const n = nums.length;
    const result = new Array(n).fill(-1);
    const stack = [];  // 单调递减
    
    for (let i = 0; i < n; i++) {
        while (stack.length && nums[stack[stack.length - 1]] <= nums[i]) {
            stack.pop();
        }
        if (stack.length) {
            result[i] = stack[stack.length - 1];
        }
        stack.push(i);
    }
    
    return result;
}
```

## 小结

单调栈是解决"下一个更大/更小元素"问题的利器：

**核心思想**：
1. 维护一个单调栈
2. 新元素入栈时，弹出违反单调性的元素
3. 被弹出的元素找到了它的"下一个更大/更小元素"

**记忆口诀**：
- 找更大 → 单调递减栈
- 找更小 → 单调递增栈
- 找下一个 → 正向遍历，弹出时记录
- 找上一个 → 栈顶元素就是答案

单调栈将O(n²)的暴力解法优化到O(n)，是非常实用的技巧。下一题我们继续用单调栈解决"下一个更大元素"的变体问题。
