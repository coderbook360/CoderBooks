# 实战：最大矩形

这道题是"柱状图中最大的矩形"的进阶版。给你一个由 0 和 1 组成的二维矩阵，求只包含 1 的最大矩形面积。

关键洞察：如果我们把矩阵的每一行看作柱状图的"底"，那每个位置向上连续的 1 就是柱子的高度。

---

## 问题描述

**LeetCode 85. Maximal Rectangle**

给定一个仅包含 0 和 1 的二维二进制矩阵，找出只包含 1 的最大矩形，返回其面积。

**示例**：
```
输入：matrix = [
  ["1","0","1","0","0"],
  ["1","0","1","1","1"],
  ["1","1","1","1","1"],
  ["1","0","0","1","0"]
]
输出：6
```

---

## 思路：转化为柱状图问题

逐行遍历矩阵，构建每一行的"柱状图"：

```
第1行：[1,0,1,0,0]
第2行：[2,0,2,1,1]  (在第1行基础上累加)
第3行：[3,1,3,2,2]
第4行：[4,0,0,3,0]  (遇到0则高度重置)
```

然后对每一行应用"柱状图最大矩形"算法。

---

## 解法

```javascript
function maximalRectangle(matrix) {
  if (matrix.length === 0 || matrix[0].length === 0) return 0;
  
  const rows = matrix.length;
  const cols = matrix[0].length;
  const heights = new Array(cols).fill(0);
  let maxArea = 0;
  
  for (let i = 0; i < rows; i++) {
    // 更新柱状图高度
    for (let j = 0; j < cols; j++) {
      heights[j] = matrix[i][j] === '1' ? heights[j] + 1 : 0;
    }
    // 计算当前行的最大矩形
    maxArea = Math.max(maxArea, largestRectangleArea(heights));
  }
  
  return maxArea;
}

function largestRectangleArea(heights) {
  const n = heights.length;
  const stack = [];
  let maxArea = 0;
  
  const h = [...heights, 0];  // 复制并添加尾部0
  
  for (let i = 0; i <= n; i++) {
    while (stack.length > 0 && h[i] < h[stack[stack.length - 1]]) {
      const height = h[stack.pop()];
      const left = stack.length > 0 ? stack[stack.length - 1] : -1;
      const width = i - left - 1;
      maxArea = Math.max(maxArea, height * width);
    }
    stack.push(i);
  }
  
  return maxArea;
}
```

---

## 执行过程

```
第1行 heights=[1,0,1,0,0]，最大矩形=1
第2行 heights=[2,0,2,1,1]，最大矩形=3（高度1，宽度3）
第3行 heights=[3,1,3,2,2]，最大矩形=6（高度2，宽度3或高度3，宽度2）
第4行 heights=[4,0,0,3,0]，最大矩形=4

最终答案=6
```

---

## 复杂度

- 时间：O(m × n)，m 行，每行 O(n) 处理
- 空间：O(n)

---

## 技巧总结

这道题展示了一个重要的技巧：**将二维问题降维到一维问题**。

通过逐行构建柱状图，把"二维矩阵中的最大矩形"转化为多个"一维柱状图中的最大矩形"问题。
