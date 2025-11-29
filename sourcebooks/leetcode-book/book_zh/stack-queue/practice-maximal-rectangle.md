# 实战：最大矩形

上一题我们在柱状图中找最大矩形，这道题更进一步：在一个由0和1组成的矩阵中，找只包含1的最大矩形。本质上，它是柱状图问题的扩展应用。

## 问题描述

给定一个仅包含0和1的二维二进制矩阵，找出只包含1的最大矩形，并返回其面积。

**示例**：
```
输入: matrix = [
  ["1","0","1","0","0"],
  ["1","0","1","1","1"],
  ["1","1","1","1","1"],
  ["1","0","0","1","0"]
]
输出: 6

矩阵中最大的全1矩形：
  ["1","0",[1],[0],[0]],
  ["1","0",[1],[1],[1]],
  ["1","1",[1],[1],[1]],
  ["1","0","0","1","0"]

面积 = 3 × 2 = 6
```

## 关键洞察：转化为柱状图

如果把每一行看作"地面"，向上数连续1的个数，就形成了一个柱状图：

```
原矩阵:              每行形成的柱状图高度:
["1","0","1","0","0"]  →  [1,0,1,0,0]
["1","0","1","1","1"]  →  [2,0,2,1,1]
["1","1","1","1","1"]  →  [3,1,3,2,2]
["1","0","0","1","0"]  →  [4,0,0,3,0]
```

对每一行形成的柱状图，求最大矩形面积，取最大值即可！

## 完整实现

```javascript
/**
 * @param {character[][]} matrix
 * @return {number}
 */
function maximalRectangle(matrix) {
    if (!matrix.length || !matrix[0].length) return 0;
    
    const rows = matrix.length;
    const cols = matrix[0].length;
    const heights = new Array(cols).fill(0);  // 柱状图高度
    let maxArea = 0;
    
    for (let i = 0; i < rows; i++) {
        // 更新每列的柱状图高度
        for (let j = 0; j < cols; j++) {
            heights[j] = matrix[i][j] === '1' ? heights[j] + 1 : 0;
        }
        // 计算当前柱状图的最大矩形面积
        maxArea = Math.max(maxArea, largestRectangleArea(heights));
    }
    
    return maxArea;
}

// 复用上一题的单调栈解法
function largestRectangleArea(heights) {
    const stack = [];
    let maxArea = 0;
    
    // 添加哨兵
    heights = [0, ...heights, 0];
    
    for (let i = 0; i < heights.length; i++) {
        while (stack.length && heights[i] < heights[stack[stack.length - 1]]) {
            const h = heights[stack.pop()];
            const w = i - stack[stack.length - 1] - 1;
            maxArea = Math.max(maxArea, h * w);
        }
        stack.push(i);
    }
    
    return maxArea;
}
```

## 执行过程图解

以示例矩阵为例：

```
第1行: ["1","0","1","0","0"]
heights = [1,0,1,0,0]
最大面积 = 1

     柱状图:
     ┌┐  ┌┐
     ││  ││
     └┴──┴┴──┘

第2行: ["1","0","1","1","1"]  
heights = [2,0,2,1,1]
最大面积 = 3 (宽3×高1)

     ┌┐  ┌┐
     ││  ││
     ││  ││┌┐┌┐
     └┴──┴┴┴┴┴┘

第3行: ["1","1","1","1","1"]
heights = [3,1,3,2,2]
最大面积 = 6 (宽3×高2 或 宽6×高1)

     ┌┐  ┌┐
     ││  ││
     ││  ││┌┐┌┐
     ││┌┐││││││
     └┴┴┴┴┴┴┴┴┘

第4行: ["1","0","0","1","0"]
heights = [4,0,0,3,0]
最大面积 = 4 (宽1×高4 或 宽1×高3)

最终结果 = max(1, 3, 6, 4) = 6
```

## 代码优化：避免重复创建数组

上面的实现每次都用`[0, ...heights, 0]`创建新数组，可以优化：

```javascript
function maximalRectangle(matrix) {
    if (!matrix.length || !matrix[0].length) return 0;
    
    const rows = matrix.length;
    const cols = matrix[0].length;
    // 预留哨兵位置
    const heights = new Array(cols + 2).fill(0);
    let maxArea = 0;
    
    for (let i = 0; i < rows; i++) {
        // 更新柱状图高度（跳过首尾哨兵）
        for (let j = 0; j < cols; j++) {
            heights[j + 1] = matrix[i][j] === '1' ? heights[j + 1] + 1 : 0;
        }
        
        // 计算最大矩形面积
        const stack = [];
        for (let j = 0; j < heights.length; j++) {
            while (stack.length && heights[j] < heights[stack[stack.length - 1]]) {
                const h = heights[stack.pop()];
                const w = j - stack[stack.length - 1] - 1;
                maxArea = Math.max(maxArea, h * w);
            }
            stack.push(j);
        }
    }
    
    return maxArea;
}
```

## 动态规划解法

还有一种纯DP的解法，对每个位置维护三个值：
- `height[j]`：该位置向上连续1的个数
- `left[j]`：以该高度能延伸到的最左位置
- `right[j]`：以该高度能延伸到的最右位置

```javascript
function maximalRectangle(matrix) {
    if (!matrix.length || !matrix[0].length) return 0;
    
    const rows = matrix.length;
    const cols = matrix[0].length;
    
    const height = new Array(cols).fill(0);
    const left = new Array(cols).fill(0);
    const right = new Array(cols).fill(cols);
    
    let maxArea = 0;
    
    for (let i = 0; i < rows; i++) {
        let curLeft = 0, curRight = cols;
        
        // 更新height和left
        for (let j = 0; j < cols; j++) {
            if (matrix[i][j] === '1') {
                height[j]++;
                left[j] = Math.max(left[j], curLeft);
            } else {
                height[j] = 0;
                left[j] = 0;
                curLeft = j + 1;
            }
        }
        
        // 更新right
        for (let j = cols - 1; j >= 0; j--) {
            if (matrix[i][j] === '1') {
                right[j] = Math.min(right[j], curRight);
            } else {
                right[j] = cols;
                curRight = j;
            }
        }
        
        // 计算面积
        for (let j = 0; j < cols; j++) {
            maxArea = Math.max(maxArea, height[j] * (right[j] - left[j]));
        }
    }
    
    return maxArea;
}
```

这种方法的关键在于理解`left`和`right`数组的含义——它们记录的是以当前高度能延伸到的边界，而不是简单的当前行的边界。

## 复杂度分析

**单调栈解法**：
- 时间复杂度：O(m×n)，遍历每行，每行单调栈操作O(n)
- 空间复杂度：O(n)，heights数组和栈

**DP解法**：
- 时间复杂度：O(m×n)
- 空间复杂度：O(n)，三个辅助数组

## 两种方法对比

| 方法 | 思路 | 优点 | 缺点 |
|------|------|------|------|
| 单调栈 | 转化为柱状图问题 | 代码复用性强 | 需要理解单调栈 |
| DP | 维护左右边界 | 无需额外数据结构 | 逻辑相对复杂 |

实际面试中，单调栈解法更容易讲清楚——只要说明"每行形成一个柱状图"这一转化思路即可。

## 小结

最大矩形问题的核心：

1. **问题转化**：二维矩阵 → 每行形成柱状图 → 复用"柱状图中最大矩形"
2. **高度更新**：遇到1累加，遇到0归零
3. **复杂度**：O(m×n)时间，O(n)空间

这道题展示了算法复用的威力——把复杂问题分解，然后用已有的解法来解决。
