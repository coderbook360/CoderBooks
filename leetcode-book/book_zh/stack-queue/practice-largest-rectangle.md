# 实战：柱状图中最大的矩形

这是单调栈最经典也最有挑战性的应用之一。它将"找下一个更小元素"的问题与几何计算结合，展示了单调栈的强大威力。

## 问题描述

给定n个非负整数，表示柱状图中各个柱子的高度。每个柱子彼此相邻，且宽度为1。求在该柱状图中，能够勾勒出来的矩形的最大面积。

**示例**：
```
输入: heights = [2,1,5,6,2,3]
输出: 10

柱状图:
     ┌───┐
   ┌─┤   │
   │ │   │   ┌───┐
┌──┤ │   ├───┤   │
│  │ │   │   │   │
└──┴─┴───┴───┴───┘
 2  1  5  6  2  3

最大矩形面积 = 5 × 2 = 10
（高度为5，宽度为2，包含第3和第4根柱子）
```

## 思路分析

### 暴力思路：O(n²)

对于每根柱子，向左右扩展，找到能延伸的最大宽度：

```javascript
function largestRectangleArea(heights) {
    let maxArea = 0;
    
    for (let i = 0; i < heights.length; i++) {
        const h = heights[i];
        let left = i, right = i;
        
        // 向左扩展
        while (left > 0 && heights[left - 1] >= h) left--;
        // 向右扩展
        while (right < heights.length - 1 && heights[right + 1] >= h) right++;
        
        maxArea = Math.max(maxArea, h * (right - left + 1));
    }
    
    return maxArea;
}
```

### 关键洞察

对于每根柱子`i`，以它的高度为矩形高度时：
- 向左能延伸到**第一个比它矮的柱子**
- 向右能延伸到**第一个比它矮的柱子**

这不就是"找下一个更小元素"吗？用单调栈可以O(n)解决！

### 单调递增栈

维护一个单调递增的栈：
- 遇到更小的元素时，弹出栈顶并计算面积
- 被弹出的柱子的"右边界"是当前元素，"左边界"是新栈顶

## 完整实现

```javascript
/**
 * @param {number[]} heights
 * @return {number}
 */
function largestRectangleArea(heights) {
    const stack = [];  // 存储索引，对应高度单调递增
    let maxArea = 0;
    
    // 添加哨兵：在两端各添加高度为0的柱子
    heights = [0, ...heights, 0];
    
    for (let i = 0; i < heights.length; i++) {
        // 当前高度比栈顶小，弹出并计算面积
        while (stack.length && heights[i] < heights[stack[stack.length - 1]]) {
            const h = heights[stack.pop()];  // 矩形高度
            const w = i - stack[stack.length - 1] - 1;  // 矩形宽度
            maxArea = Math.max(maxArea, h * w);
        }
        stack.push(i);
    }
    
    return maxArea;
}
```

## 执行过程图解

以`[2,1,5,6,2,3]`为例，添加哨兵后变成`[0,2,1,5,6,2,3,0]`：

```
索引: 0  1  2  3  4  5  6  7
值:   0  2  1  5  6  2  3  0

i=0 (值0):
  栈空，入栈
  stack: [0]

i=1 (值2):
  2 > 0，入栈
  stack: [0, 1]

i=2 (值1):
  1 < 2，弹出1，h=2, w=2-0-1=1, area=2
  stack: [0]
  1 > 0，入栈
  stack: [0, 2]
  maxArea = 2

i=3 (值5):
  5 > 1，入栈
  stack: [0, 2, 3]

i=4 (值6):
  6 > 5，入栈
  stack: [0, 2, 3, 4]

i=5 (值2):
  2 < 6，弹出4，h=6, w=5-3-1=1, area=6
  stack: [0, 2, 3]
  2 < 5，弹出3，h=5, w=5-2-1=2, area=10
  stack: [0, 2]
  2 > 1，入栈
  stack: [0, 2, 5]
  maxArea = 10

i=6 (值3):
  3 > 2，入栈
  stack: [0, 2, 5, 6]

i=7 (值0):
  0 < 3，弹出6，h=3, w=7-5-1=1, area=3
  stack: [0, 2, 5]
  0 < 2，弹出5，h=2, w=7-2-1=4, area=8
  stack: [0, 2]
  0 < 1，弹出2，h=1, w=7-0-1=6, area=6
  stack: [0]
  0 = 0，不弹出

最终maxArea = 10
```

## 为什么需要哨兵？

**左哨兵（开头的0）**：保证栈底始终有元素，计算宽度时不会出错。

**右哨兵（末尾的0）**：保证所有柱子最终都会被弹出并计算面积。

如果不加右哨兵，递增序列`[1,2,3,4,5]`会全部留在栈里，无法计算面积。

## 宽度计算的精髓

当弹出索引`j`时：
- **右边界**：当前索引`i`（第一个比heights[j]小的）
- **左边界**：新栈顶`stack[stack.length-1]`（上一个比heights[j]小的）
- **宽度**：`i - stack[stack.length-1] - 1`

```
左边界    j    右边界
  ↓       ↓      ↓
[..., left, j, ..., i]
宽度 = i - left - 1
```

## 不使用哨兵的版本

```javascript
function largestRectangleArea(heights) {
    const n = heights.length;
    const stack = [];
    let maxArea = 0;
    
    for (let i = 0; i <= n; i++) {
        const h = i === n ? 0 : heights[i];  // 末尾虚拟一个0
        
        while (stack.length && h < heights[stack[stack.length - 1]]) {
            const height = heights[stack.pop()];
            const width = stack.length === 0 ? i : i - stack[stack.length - 1] - 1;
            maxArea = Math.max(maxArea, height * width);
        }
        stack.push(i);
    }
    
    return maxArea;
}
```

逻辑相同，但需要特殊处理边界情况，代码不如哨兵版本简洁。

## 复杂度分析

**时间复杂度：O(n)**
- 每个柱子最多入栈一次、出栈一次

**空间复杂度：O(n)**
- 栈最多存储n个元素

## 另一种思路：预处理左右边界

先用单调栈预处理每个柱子的左边界和右边界，再计算面积：

```javascript
function largestRectangleArea(heights) {
    const n = heights.length;
    const leftSmaller = new Array(n);  // 左边第一个更小的索引
    const rightSmaller = new Array(n); // 右边第一个更小的索引
    const stack = [];
    
    // 找左边第一个更小
    for (let i = 0; i < n; i++) {
        while (stack.length && heights[stack[stack.length - 1]] >= heights[i]) {
            stack.pop();
        }
        leftSmaller[i] = stack.length === 0 ? -1 : stack[stack.length - 1];
        stack.push(i);
    }
    
    // 清空栈，找右边第一个更小
    stack.length = 0;
    for (let i = n - 1; i >= 0; i--) {
        while (stack.length && heights[stack[stack.length - 1]] >= heights[i]) {
            stack.pop();
        }
        rightSmaller[i] = stack.length === 0 ? n : stack[stack.length - 1];
        stack.push(i);
    }
    
    // 计算最大面积
    let maxArea = 0;
    for (let i = 0; i < n; i++) {
        const width = rightSmaller[i] - leftSmaller[i] - 1;
        maxArea = Math.max(maxArea, heights[i] * width);
    }
    
    return maxArea;
}
```

这种方法逻辑更清晰，但需要两次遍历。

## 边界情况

| 输入 | 分析 | 结果 |
|------|------|------|
| `[1]` | 单柱子 | 1 |
| `[1,1]` | 相同高度 | 2 |
| `[1,2,3,4,5]` | 递增 | 9 (高度3，宽度3) |
| `[5,4,3,2,1]` | 递减 | 9 (高度3，宽度3) |

## 小结

柱状图中最大矩形问题的核心：

1. **转化问题**：找每根柱子能延伸的最大宽度 → 找左右第一个更小元素
2. **单调递增栈**：弹出时计算面积
3. **哨兵技巧**：简化边界处理

**公式**：`面积 = 高度 × (右边界 - 左边界 - 1)`

这道题的思想在下一题"最大矩形"中会再次用到。掌握它，你就掌握了单调栈解决几何问题的核心技巧。
