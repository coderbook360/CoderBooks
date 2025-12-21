# 实战：盛最多水的容器

> LeetCode 11. 盛最多水的容器 | 难度：中等

这道题是对撞指针与贪心思想结合的经典题目。难点不在于写代码，而在于**理解为什么这样移动指针是正确的**。

---

## 题目描述

给定一个长度为 `n` 的整数数组 `height`。有 `n` 条垂线，第 `i` 条线的两个端点是 `(i, 0)` 和 `(i, height[i])`。

找出其中的两条线，使得它们与 x 轴共同构成的容器可以容纳最多的水。

返回容器可以储存的最大水量。

**示例**：
```
输入：height = [1,8,6,2,5,4,8,3,7]
输出：49
解释：选择第 2 条线（高度 8）和第 9 条线（高度 7）
     面积 = min(8, 7) × (9 - 2) = 7 × 7 = 49
```

```
   |        |              |
   |        |              |
   |        |     |        |
   |        |     |   |    |
   |        |     |   |    |  |
   |   |    |     |   |    |  |
   |   |    |  |  |   |    |  |
___|___|____|__|__|___|____|__|___
   1   8    6  2  5   4    8  3  7
```

---

## 暴力解法

最直接的想法：枚举所有可能的左右边界。

```typescript
function maxAreaBruteForce(height: number[]): number {
  let maxArea = 0;
  
  for (let i = 0; i < height.length; i++) {
    for (let j = i + 1; j < height.length; j++) {
      const area = Math.min(height[i], height[j]) * (j - i);
      maxArea = Math.max(maxArea, area);
    }
  }
  
  return maxArea;
}
```

时间复杂度 O(n²)，能否优化？

---

## 对撞指针解法

用两个指针从两端开始，每次移动较矮的那个指针：

```typescript
function maxArea(height: number[]): number {
  let left = 0;
  let right = height.length - 1;
  let maxArea = 0;
  
  while (left < right) {
    // 计算当前面积
    const width = right - left;
    const h = Math.min(height[left], height[right]);
    const area = width * h;
    maxArea = Math.max(maxArea, area);
    
    // 移动较矮的指针
    if (height[left] < height[right]) {
      left++;
    } else {
      right--;
    }
  }
  
  return maxArea;
}
```

时间复杂度 O(n)。

---

## 核心问题：为什么移动较矮的指针

这是本题的难点。让我们来证明。

假设当前 `height[left] < height[right]`：

```
面积公式：area = min(height[left], height[right]) × (right - left)

当前受限于 height[left]（较矮的那个）
```

如果我们移动较高的 `right`：
- 宽度 `(right - left)` 减少 1
- 高度最多还是 `height[left]`（因为 min 取较小值）
- **面积一定减少或不变，不可能增加**

如果我们移动较矮的 `left`：
- 宽度减少 1
- 高度**可能**增加（如果遇到更高的柱子）
- **面积有可能增加**

所以，**移动较高的柱子毫无意义**，只有移动较矮的柱子才有可能找到更大的面积。

---

## 图示过程

```
height = [1, 8, 6, 2, 5, 4, 8, 3, 7]
          ↑                       ↑
        left=0                right=8

步骤详解：

Step 1: height[0]=1 < height[8]=7
  area = min(1,7) × 8 = 8
  maxArea = 8
  移动 left（较矮）→ left=1

Step 2: height[1]=8 > height[8]=7
  area = min(8,7) × 7 = 49
  maxArea = 49  ← 最大值
  移动 right（较矮）→ right=7

Step 3: height[1]=8 > height[7]=3
  area = min(8,3) × 6 = 18
  移动 right → right=6

Step 4: height[1]=8 = height[6]=8
  area = min(8,8) × 5 = 40
  移动 right → right=5

Step 5: height[1]=8 > height[5]=4
  area = min(8,4) × 4 = 16
  移动 right → right=4

Step 6: height[1]=8 > height[4]=5
  area = min(8,5) × 3 = 15
  移动 right → right=3

Step 7: height[1]=8 > height[3]=2
  area = min(8,2) × 2 = 4
  移动 right → right=2

Step 8: height[1]=8 > height[2]=6
  area = min(8,6) × 1 = 6
  移动 right → right=1

left(1) >= right(1)，结束

最大面积 = 49 ✓
```

---

## 正确性的严谨证明

**命题**：对撞指针不会错过最优解。

**证明**（反证法）：

假设最优解是 `(i, j)`，其中 `i < j`。

初始时 `left = 0, right = n-1`。

在移动过程中，如果 left 在到达 i 之前就已经跨过 i，或 right 在到达 j 之前就已经跨过 j，那就"错过"了。

但我们证明这不可能发生：

假设算法首先到达位置 (i, right)，其中 right > j：
- 如果 `height[i] <= height[right]`，算法会移动 left，不会错过 i
- 如果 `height[i] > height[right]`，算法会移动 right 向 j 靠近

类似地，算法不会在 right 到达 j 之前就让 left 跨过 i。

因此，算法一定会经过 (i, j) 这个状态，不会错过最优解。

---

## 复杂度分析

- **时间复杂度**：O(n)，每个元素最多被访问一次
- **空间复杂度**：O(1)，只使用两个指针

---

## 常见错误

### 错误1：移动较高的指针

```typescript
// ❌ 错误策略
if (height[left] > height[right]) {
  left++;  // 移动较高的，永远不会找到更大面积
}
```

### 错误2：相等时不移动

```typescript
// ❌ 错误：可能陷入无限循环
while (left < right) {
  if (height[left] === height[right]) {
    // 没有移动任何指针！
  }
}

// ✓ 正确：相等时移动任意一个都可以
if (height[left] <= height[right]) {
  left++;
} else {
  right--;
}
```

### 错误3：面积计算错误

```typescript
// ❌ 错误：用了加法
const area = height[left] + height[right];

// ❌ 错误：没有取 min
const area = height[left] * (right - left);

// ✓ 正确
const area = Math.min(height[left], height[right]) * (right - left);
```

---

## 与接雨水的区别

| 盛水容器 | 接雨水 |
|---------|--------|
| 选两条边围成容器 | 所有柱子之间接水 |
| 一个容器 | 多个"凹槽" |
| 只看边界高度 | 看每个位置的水量 |
| 面积 = min × 宽 | 水量 = Σ(min(左max,右max) - h) |

---

## 要点总结

这道题的关键洞察：

1. **面积受限于较矮的柱子**
2. **移动较高的柱子不可能让面积增加**
3. **只有移动较矮的柱子才有可能找到更大面积**

这种"贪心地放弃不可能更优的选项"的思想，是对撞指针能够正确工作的基础。

---

## 相关题目

- **42. 接雨水**：类似的柱子问题，但计算逻辑不同
- **84. 柱状图中最大的矩形**：更复杂的面积问题
