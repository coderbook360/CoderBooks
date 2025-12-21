# 实战：接雨水

这是一道经典的面试题：给你一组柱子的高度，计算下雨后能接多少水。

思考一下：某个位置能存多少水？取决于它左边最高的柱子和右边最高的柱子中较矮的那个，减去当前柱子的高度。

---

## 问题描述

**LeetCode 42. Trapping Rain Water**

给定 n 个非负整数表示宽度为 1 的柱子的高度图，计算按此排列的柱子，下雨之后能接多少雨水。

**示例**：
```
输入：height = [0,1,0,2,1,0,1,3,2,1,2,1]
输出：6
```

```
       *
   *   ** *
 * ** ******
```

---

## 思路分析

### 方法一：按列计算

对于每个位置 i，计算它能存的水量：

```
water[i] = min(左边最高, 右边最高) - height[i]
```

如果结果为负，说明存不了水。

### 方法二：单调栈（按行计算）

维护一个单调递减栈。当遇到比栈顶高的柱子时，说明可以形成一个"凹槽"，可以存水。

---

## 解法一：预处理左右最大值

```javascript
function trap(height) {
  const n = height.length;
  if (n === 0) return 0;
  
  // 预处理每个位置左边的最大值
  const leftMax = new Array(n);
  leftMax[0] = height[0];
  for (let i = 1; i < n; i++) {
    leftMax[i] = Math.max(leftMax[i-1], height[i]);
  }
  
  // 预处理每个位置右边的最大值
  const rightMax = new Array(n);
  rightMax[n-1] = height[n-1];
  for (let i = n - 2; i >= 0; i--) {
    rightMax[i] = Math.max(rightMax[i+1], height[i]);
  }
  
  // 计算每个位置的积水
  let water = 0;
  for (let i = 0; i < n; i++) {
    water += Math.min(leftMax[i], rightMax[i]) - height[i];
  }
  
  return water;
}
```

---

## 解法二：单调栈

```javascript
function trap(height) {
  const n = height.length;
  const stack = [];  // 单调递减栈，存索引
  let water = 0;
  
  for (let i = 0; i < n; i++) {
    while (stack.length > 0 && height[i] > height[stack[stack.length - 1]]) {
      const bottom = stack.pop();  // 凹槽底部
      
      if (stack.length === 0) break;  // 没有左边界
      
      const left = stack[stack.length - 1];  // 左边界
      const width = i - left - 1;
      const h = Math.min(height[left], height[i]) - height[bottom];
      water += width * h;
    }
    stack.push(i);
  }
  
  return water;
}
```

---

## 单调栈解法详解

单调栈的思路是"按行计算"：每当形成一个凹槽时，计算这一层能存的水。

```
height = [0,1,0,2,1,0,1,3,2,1,2,1]

当 i=3 (height=2) 时，栈中有 [1,2]（对应高度[1,0]）
  弹出 2（高度0），形成凹槽
  左边界=1，右边界=3
  宽度=3-1-1=1
  高度=min(1,2)-0=1
  积水=1×1=1

当 i=7 (height=3) 时，会连续计算多层积水
```

---

## 解法三：双指针

```javascript
function trap(height) {
  let left = 0, right = height.length - 1;
  let leftMax = 0, rightMax = 0;
  let water = 0;
  
  while (left < right) {
    if (height[left] < height[right]) {
      if (height[left] >= leftMax) {
        leftMax = height[left];
      } else {
        water += leftMax - height[left];
      }
      left++;
    } else {
      if (height[right] >= rightMax) {
        rightMax = height[right];
      } else {
        water += rightMax - height[right];
      }
      right--;
    }
  }
  
  return water;
}
```

---

## 三种方法对比

| 方法 | 时间 | 空间 | 思路 |
|-----|------|------|-----|
| 预处理 | O(n) | O(n) | 按列计算 |
| 单调栈 | O(n) | O(n) | 按行计算 |
| 双指针 | O(n) | O(1) | 按列计算（优化空间）|

---

## 技巧总结

接雨水是单调栈的经典应用之一。与"柱状图最大矩形"的区别：

- **柱状图最大矩形**：用单调递增栈，找更小的边界
- **接雨水**：用单调递减栈，找更大的边界形成凹槽
