# 实战：接雨水（双指针解法）

> LeetCode 42. 接雨水 | 难度：困难

这是一道经典的困难题，有多种解法。本节介绍空间复杂度为 O(1) 的**双指针解法**。

---

## 题目描述

给定 n 个非负整数表示每个宽度为 1 的柱子的高度图，计算按此排列的柱子，下雨之后能接多少雨水。

**示例**：
```
输入：height = [0,1,0,2,1,0,1,3,2,1,2,1]
输出：6

图示：
       |
   |   || |
 | || ||||||
_____________
```

---

## 思路分析

每个位置能接的水量 = `min(左边最高, 右边最高) - 当前高度`

暴力做法：对每个位置分别向左向右扫描，O(n²)。

优化思路：用双指针同时从两端向中间移动，边移动边更新左右最高值。

**关键洞察**：
- 如果 `leftMax < rightMax`，那么位置 `left` 的水量由 `leftMax` 决定
- 如果 `rightMax <= leftMax`，那么位置 `right` 的水量由 `rightMax` 决定

---

## 代码实现

```typescript
function trap(height: number[]): number {
  let left = 0;
  let right = height.length - 1;
  let leftMax = 0;
  let rightMax = 0;
  let water = 0;
  
  while (left < right) {
    leftMax = Math.max(leftMax, height[left]);
    rightMax = Math.max(rightMax, height[right]);
    
    if (leftMax < rightMax) {
      // left 位置的水量由 leftMax 决定
      water += leftMax - height[left];
      left++;
    } else {
      // right 位置的水量由 rightMax 决定
      water += rightMax - height[right];
      right--;
    }
  }
  
  return water;
}
```

---

## 为什么这样是正确的

以 `leftMax < rightMax` 的情况为例：

当前 `left` 位置的左边最高是 `leftMax`。右边最高**至少**是 `rightMax`（可能更高，因为还没扫描到）。

由于水量取决于 `min(左边最高, 右边最高)`，而 `leftMax < rightMax`，所以无论右边实际最高是多少，水量都由 `leftMax` 决定。

```
水量 = min(leftMax, 右边最高) - height[left]
     = min(leftMax, 至少为 rightMax 的值) - height[left]
     = leftMax - height[left]  （因为 leftMax < rightMax）
```

---

## 执行过程可视化

```
height = [0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1]
          0  1  2  3  4  5  6  7  8  9 10 11

初始：left=0, right=11, leftMax=0, rightMax=0, water=0

Step 1: 
  leftMax = max(0, height[0]=0) = 0
  rightMax = max(0, height[11]=1) = 1
  leftMax(0) < rightMax(1)
  water += 0 - 0 = 0, left++ → left=1

Step 2:
  leftMax = max(0, height[1]=1) = 1
  rightMax = 1
  leftMax(1) == rightMax(1)，走 else 分支
  water += 1 - 1 = 0, right-- → right=10

Step 3:
  leftMax = 1
  rightMax = max(1, height[10]=2) = 2
  leftMax(1) < rightMax(2)
  water += 1 - 1 = 0, left++ → left=2

Step 4:
  leftMax = max(1, height[2]=0) = 1
  rightMax = 2
  leftMax(1) < rightMax(2)
  water += 1 - 0 = 1, left++ → left=3

Step 5:
  leftMax = max(1, height[3]=2) = 2
  rightMax = 2
  leftMax(2) == rightMax(2)，走 else
  water += 2 - 2 = 0, right-- → right=9

Step 6:
  leftMax = 2
  rightMax = max(2, height[9]=1) = 2
  leftMax(2) == rightMax(2)
  water += 2 - 1 = 1, right-- → right=8

Step 7:
  rightMax = max(2, height[8]=2) = 2
  water += 2 - 2 = 0, right-- → right=7

Step 8:
  rightMax = max(2, height[7]=3) = 3
  leftMax(2) < rightMax(3)
  water += 2 - 2 = 0, left++ → left=4

Step 9:
  leftMax = max(2, height[4]=1) = 2
  leftMax(2) < rightMax(3)
  water += 2 - 1 = 1, left++ → left=5

Step 10:
  leftMax = max(2, height[5]=0) = 2
  water += 2 - 0 = 2, left++ → left=6

Step 11:
  leftMax = max(2, height[6]=1) = 2
  water += 2 - 1 = 1, left++ → left=7

left(7) >= right(7)，结束

总水量 = 0+0+0+1+0+1+0+0+1+2+1 = 6 ✓
```

---

## 复杂度分析

- **时间复杂度**：O(n)
  - left 和 right 各自最多移动 n 次
  
- **空间复杂度**：O(1)
  - 只用了 4 个变量

---

## 动态规划解法对比

动态规划预处理左右最大值：

```typescript
function trapDP(height: number[]): number {
  const n = height.length;
  if (n === 0) return 0;
  
  // 预处理：leftMax[i] = max(height[0..i])
  const leftMax = new Array(n);
  leftMax[0] = height[0];
  for (let i = 1; i < n; i++) {
    leftMax[i] = Math.max(leftMax[i - 1], height[i]);
  }
  
  // 预处理：rightMax[i] = max(height[i..n-1])
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

**双指针本质是对动态规划的空间优化**：
- 不需要存储所有位置的 leftMax 和 rightMax
- 利用"短板决定水量"的性质，实时计算

---

## 其他解法对比

- **暴力法**：O(n²) 时间，O(1) 空间，每个位置分别向左向右扫描
- **动态规划**：O(n) 时间，O(n) 空间，预处理左右最大值数组
- **单调栈**：O(n) 时间，O(n) 空间，按层计算（横向累加）
- **双指针**：O(n) 时间，O(1) 空间，实时计算（最优解）

---

## 常见错误

### 错误1：先更新指针再计算

```typescript
// ❌ 错误顺序
if (leftMax < rightMax) {
  left++;  // 先移动
  water += leftMax - height[left];  // 位置错了！
}

// ✓ 正确顺序
if (leftMax < rightMax) {
  water += leftMax - height[left];  // 先计算
  left++;  // 后移动
}
```

### 错误2：忘记更新 leftMax/rightMax

```typescript
// ❌ 错误：没有更新最大值
while (left < right) {
  if (leftMax < rightMax) {
    water += leftMax - height[left];  // leftMax 可能过期
    left++;
  }
  ...
}
```

### 错误3：边界条件

```typescript
// 空数组或单元素数组
if (height.length <= 2) return 0;
```

---

## 相关题目

- **11. 盛最多水的容器**：类似的双指针思想
- **84. 柱状图中最大的矩形**：单调栈经典题
- **407. 接雨水 II**：二维版本，需要用优先队列

---

## 总结

接雨水的双指针解法核心思想：

1. **木桶原理**：水量由较短的边决定
2. **实时计算**：不需要预处理所有位置的左右最大值
3. **指针选择**：哪边的最大值小，就先处理哪边
