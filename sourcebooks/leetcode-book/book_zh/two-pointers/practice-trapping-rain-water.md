# 实战：接雨水

接雨水是双指针的巅峰之作，也是面试必考题。它完美展示了对撞指针如何利用"短板效应"解决复杂问题。

## 问题描述

给定`n`个非负整数表示每个宽度为1的柱子的高度，计算按此排列的柱子，下雨之后能接多少雨水。

**示例**：
```
输入：height = [0,1,0,2,1,0,1,3,2,1,2,1]
输出：6

高度图：
      █
  █   ██ █
█ ██ ██████
------------
0102101321 21
```

## 思路分析

### 核心洞察

每个位置能接的水量 = min(左边最高, 右边最高) - 当前高度

为什么是**最小值**？因为水会从矮的那边流走，就像木桶原理。

### 暴力解法

对每个位置，向左扫描找最高，向右扫描找最高：

```javascript
function trap(height) {
    let water = 0;
    for (let i = 0; i < height.length; i++) {
        let leftMax = 0, rightMax = 0;
        // 向左找最高
        for (let j = i; j >= 0; j--) {
            leftMax = Math.max(leftMax, height[j]);
        }
        // 向右找最高
        for (let j = i; j < height.length; j++) {
            rightMax = Math.max(rightMax, height[j]);
        }
        water += Math.min(leftMax, rightMax) - height[i];
    }
    return water;
}
```

时间O(n²)，可以优化。

### 双指针思路

关键洞察：**我们不需要知道两边的确切最高值，只需要知道哪边更矮**。

- 如果`leftMax < rightMax`：左边是短板，左边位置的水量由`leftMax`决定
- 如果`leftMax >= rightMax`：右边是短板，右边位置的水量由`rightMax`决定

用对撞指针，每次移动较矮那一侧的指针。

## 完整实现

```javascript
/**
 * @param {number[]} height
 * @return {number}
 */
function trap(height) {
    let left = 0;
    let right = height.length - 1;
    let leftMax = 0;
    let rightMax = 0;
    let water = 0;
    
    while (left < right) {
        // 更新两边的最大值
        leftMax = Math.max(leftMax, height[left]);
        rightMax = Math.max(rightMax, height[right]);
        
        if (leftMax < rightMax) {
            // 左边是短板，计算左边位置的水量
            water += leftMax - height[left];
            left++;
        } else {
            // 右边是短板，计算右边位置的水量
            water += rightMax - height[right];
            right--;
        }
    }
    
    return water;
}
```

## 执行过程

```
height = [0,1,0,2,1,0,1,3,2,1,2,1]
         L                     R
leftMax = 0, rightMax = 0

step 1: leftMax=0, rightMax=1
  0 < 1, 左边短板
  water += 0 - 0 = 0
  left++

step 2: leftMax=1, rightMax=1
  1 >= 1, 右边短板
  water += 1 - 1 = 0
  right--

step 3: leftMax=1, rightMax=2
  1 < 2, 左边短板
  water += 1 - 0 = 1
  left++

step 4: leftMax=2, rightMax=2
  2 >= 2, 右边短板
  water += 2 - 1 = 1
  right--

... 继续执行 ...

最终 water = 6
```

## 为什么双指针正确？

这是很多人困惑的地方。让我解释清楚：

### 场景1：leftMax < rightMax

此时`left`位置的水量一定是`leftMax - height[left]`。

为什么？因为：
- 左边最高是`leftMax`（我们已经扫描过）
- 右边最高**至少**是`rightMax`（可能更高，但不影响）
- 水量 = min(leftMax, rightMax) - height[left] = leftMax - height[left]

### 场景2：leftMax >= rightMax

同理，`right`位置的水量是`rightMax - height[right]`。

## 其他解法

### 动态规划

预处理每个位置的左边最高和右边最高：

```javascript
function trap(height) {
    const n = height.length;
    if (n === 0) return 0;
    
    // 预处理左边最高
    const leftMax = new Array(n);
    leftMax[0] = height[0];
    for (let i = 1; i < n; i++) {
        leftMax[i] = Math.max(leftMax[i - 1], height[i]);
    }
    
    // 预处理右边最高
    const rightMax = new Array(n);
    rightMax[n - 1] = height[n - 1];
    for (let i = n - 2; i >= 0; i--) {
        rightMax[i] = Math.max(rightMax[i + 1], height[i]);
    }
    
    // 计算水量
    let water = 0;
    for (let i = 0; i < n; i++) {
        water += Math.min(leftMax[i], rightMax[i]) - height[i];
    }
    
    return water;
}
```

时间O(n)，空间O(n)。

### 单调栈

横向计算水量（按层计算）：

```javascript
function trap(height) {
    const stack = [];  // 存下标
    let water = 0;
    
    for (let i = 0; i < height.length; i++) {
        while (stack.length && height[i] > height[stack[stack.length - 1]]) {
            const bottom = stack.pop();
            if (stack.length === 0) break;
            
            const left = stack[stack.length - 1];
            const width = i - left - 1;
            const h = Math.min(height[left], height[i]) - height[bottom];
            water += width * h;
        }
        stack.push(i);
    }
    
    return water;
}
```

## 复杂度分析

**双指针解法**：
- 时间复杂度：O(n)
- 空间复杂度：O(1)

**动态规划解法**：
- 时间复杂度：O(n)
- 空间复杂度：O(n)

## 小结

接雨水问题的核心：

1. **单个位置的水量**：min(左边最高, 右边最高) - 当前高度
2. **双指针优化**：利用"短板效应"，每次处理较矮一侧
3. **正确性保证**：短板那边的水量已经确定，不受另一边更高柱子的影响

这道题展示了双指针的精髓：**用O(1)空间维护O(n)的信息**。
