# 实战：柱状图中最大的矩形（单调栈）

这道题在第四部分已经详细讨论过，这里我们从单调栈的角度重新审视它，加深对单调栈"找边界"能力的理解。

## 问题回顾

给定n个非负整数表示柱状图中各个柱子的高度，每个柱子宽度为1。求能勾勒出的矩形的最大面积。

**示例**：
```
输入: heights = [2,1,5,6,2,3]
输出: 10
（高度5，宽度2，包含第3和第4根柱子）
```

## 单调栈的视角

对于每根柱子，以它的高度作为矩形的高度，能得到多大面积？

关键是找到**宽度**：
- **左边界**：左边第一个比它矮的柱子
- **右边界**：右边第一个比它矮的柱子
- **宽度** = 右边界 - 左边界 - 1

这不就是"找下一个更小元素"的双向版本吗！

## 两次遍历法

先分别找左右边界，再计算面积：

```javascript
function largestRectangleArea(heights) {
    const n = heights.length;
    const leftSmaller = new Array(n);   // 左边第一个更小的索引
    const rightSmaller = new Array(n);  // 右边第一个更小的索引
    let stack = [];
    
    // 找左边第一个更小
    for (let i = 0; i < n; i++) {
        while (stack.length && heights[stack[stack.length - 1]] >= heights[i]) {
            stack.pop();
        }
        leftSmaller[i] = stack.length === 0 ? -1 : stack[stack.length - 1];
        stack.push(i);
    }
    
    // 清空栈，找右边第一个更小
    stack = [];
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

## 一次遍历法（哨兵优化）

更精妙的做法：在弹出时同时确定左右边界。

```javascript
function largestRectangleArea(heights) {
    const stack = [];
    let maxArea = 0;
    
    // 添加哨兵
    heights = [0, ...heights, 0];
    
    for (let i = 0; i < heights.length; i++) {
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

## 边界计算的精髓

当弹出索引`j`时：
- **右边界**：当前索引`i`（这是第一个比`heights[j]`小的）
- **左边界**：新栈顶`stack[top]`（这是上一个比`heights[j]`小的）

```
         j被弹出
           ↓
[..., left, j, ..., i]
        ↑           ↑
      新栈顶      当前索引
      (左边界)    (右边界)

宽度 = i - left - 1
```

## 为什么要哨兵？

**左哨兵（开头的0）**：
- 保证栈永不为空
- 计算宽度时`stack[top]`始终有效

**右哨兵（末尾的0）**：
- 保证所有柱子最终都会被弹出
- 递增序列如`[1,2,3,4,5]`不会遗漏

## 执行过程详解

以`heights = [2,1,5,6,2,3]`为例，添加哨兵后`[0,2,1,5,6,2,3,0]`：

```
索引: 0  1  2  3  4  5  6  7
值:   0  2  1  5  6  2  3  0

i=0: 入栈 → stack=[0]

i=1: 2>0, 入栈 → stack=[0,1]

i=2: 1<2, 弹出1
     h=2, w=2-0-1=1, area=2
     stack=[0]
     1>0, 入栈 → stack=[0,2]

i=3: 5>1, 入栈 → stack=[0,2,3]

i=4: 6>5, 入栈 → stack=[0,2,3,4]

i=5: 2<6, 弹出4
     h=6, w=5-3-1=1, area=6
     stack=[0,2,3]
     2<5, 弹出3
     h=5, w=5-2-1=2, area=10 ← 最大！
     stack=[0,2]
     2>1, 入栈 → stack=[0,2,5]

i=6: 3>2, 入栈 → stack=[0,2,5,6]

i=7: 0<3, 弹出6
     h=3, w=7-5-1=1, area=3
     stack=[0,2,5]
     0<2, 弹出5
     h=2, w=7-2-1=4, area=8
     stack=[0,2]
     0<1, 弹出2
     h=1, w=7-0-1=6, area=6
     stack=[0]
     0=0, 停止

maxArea = 10
```

## 不用哨兵的版本

```javascript
function largestRectangleArea(heights) {
    const n = heights.length;
    const stack = [];
    let maxArea = 0;
    
    for (let i = 0; i <= n; i++) {
        const h = i === n ? 0 : heights[i];  // 末尾虚拟一个0
        
        while (stack.length && h < heights[stack[stack.length - 1]]) {
            const height = heights[stack.pop()];
            const width = stack.length === 0 
                ? i                           // 左边界是-1
                : i - stack[stack.length - 1] - 1;
            maxArea = Math.max(maxArea, height * width);
        }
        stack.push(i);
    }
    
    return maxArea;
}
```

需要特殊处理`stack.length === 0`的情况，代码不如哨兵版本简洁。

## 复杂度分析

**时间复杂度：O(n)**
- 每个柱子最多入栈出栈各一次

**空间复杂度：O(n)**
- 栈最多存储n个元素

## 单调栈选择

这道题用**单调递增栈**（从栈底到栈顶递增）：
- 遇到更小的元素时，弹出并计算面积
- 被弹出的柱子找到了它的右边界

## 小结

柱状图最大矩形的单调栈本质：

1. **找左右边界**：每根柱子的左右第一个更小位置
2. **单调递增栈**：弹出时同时确定两个边界
3. **哨兵技巧**：避免边界特判，简化代码

这道题是单调栈的经典应用，它展示了如何用"弹出时确定答案"的技巧一次遍历解决"双向查找"问题。
