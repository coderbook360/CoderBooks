# 实战：柱状图中最大的矩形

这是单调栈的经典应用题。给你一组柱子的高度，如何找出能够勾勒出的最大矩形面积？

核心问题是：对于每个柱子，它能向左右延伸多远？延伸的边界就是第一个比它矮的柱子。

---

## 问题描述

**LeetCode 84. Largest Rectangle in Histogram**

给定非负整数数组 `heights`，表示柱状图中各个柱子的高度，每个柱子宽度为 1。求能够勾勒出的矩形的最大面积。

**示例**：
```
输入：heights = [2,1,5,6,2,3]
输出：10
解释：以高度5的柱子为高，向左延伸到索引2，向右延伸到索引3，宽度为2，面积=5×2=10
```

---

## 思路分析

对于每个柱子 i，我们需要找到：
- **左边界**：左边第一个比它矮的柱子的位置 + 1
- **右边界**：右边第一个比它矮的柱子的位置 - 1

然后以柱子 i 的高度为矩形高度，计算面积。

找"第一个更小元素"——这正是**单调递增栈**的应用！

---

## 解法：单调递增栈

```javascript
function largestRectangleArea(heights) {
  const n = heights.length;
  const stack = [];  // 单调递增栈，存索引
  let maxArea = 0;
  
  // 在末尾添加一个0，确保所有柱子都被处理
  heights.push(0);
  
  for (let i = 0; i <= n; i++) {
    while (stack.length > 0 && heights[i] < heights[stack[stack.length - 1]]) {
      const h = heights[stack.pop()];  // 当前柱子的高度
      // 左边界：栈顶元素（如果栈空则为-1）
      const left = stack.length > 0 ? stack[stack.length - 1] : -1;
      // 右边界：当前索引 i
      const width = i - left - 1;
      maxArea = Math.max(maxArea, h * width);
    }
    stack.push(i);
  }
  
  heights.pop();  // 恢复原数组
  return maxArea;
}
```

---

## 执行过程可视化

```
heights = [2, 1, 5, 6, 2, 3, 0]（添加了尾部的0）

i=0, h=2: stack=[0]

i=1, h=1:
  1 < 2，弹出0
  left=-1, right=1, width=1-(-1)-1=1
  area = 2×1 = 2
  stack=[1]

i=2, h=5: stack=[1,2]
i=3, h=6: stack=[1,2,3]

i=4, h=2:
  2 < 6，弹出3
  left=2, right=4, width=1, area=6×1=6
  2 < 5，弹出2
  left=1, right=4, width=2, area=5×2=10
  2 > 1，停止
  stack=[1,4]

i=5, h=3: stack=[1,4,5]

i=6, h=0:
  0 < 3，弹出5
  left=4, right=6, width=1, area=3×1=3
  0 < 2，弹出4
  left=1, right=6, width=4, area=2×4=8
  0 < 1，弹出1
  left=-1, right=6, width=6, area=1×6=6
  stack=[]

最大面积 = 10
```

---

## 关键技巧

### 1. 末尾添加 0

为什么要在末尾添加一个高度为 0 的柱子？

因为如果数组是递增的（如 `[1,2,3,4]`），栈中的柱子永远不会被弹出。添加 0 可以确保所有柱子最终都被处理。

### 2. 宽度计算

```javascript
const width = i - left - 1;
```

- `i` 是右边界（不包含）
- `left` 是左边界（不包含）
- 所以宽度是 `i - left - 1`

### 3. 栈空时的处理

```javascript
const left = stack.length > 0 ? stack[stack.length - 1] : -1;
```

如果栈空，说明左边没有比当前柱子更矮的，左边界设为 -1。

---

## 复杂度

- 时间：O(n)，每个元素最多入栈出栈各一次
- 空间：O(n)

---

## 与"接雨水"的关系

这道题和"接雨水"是姊妹题：
- **柱状图最大矩形**：找每个柱子能延伸的最大范围
- **接雨水**：找每个位置左右的最大高度

两道题都可以用单调栈解决，但思路略有不同。
