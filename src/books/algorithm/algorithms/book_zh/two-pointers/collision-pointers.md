# 对撞指针模式

上一章我们认识了双指针的两大模式。这一章，我们深入探讨**对撞指针**——一种从两端向中间逼近的技巧。

---

## 对撞指针的核心原理

对撞指针的精髓在于一个问题：**每次移动指针时，我们排除了什么？**

以有序数组求两数之和为例：

```
数组：[1, 2, 4, 6, 8, 9]，目标和 = 10
      ↑              ↑
    left           right
```

初始时，`left = 0`，`right = 5`，和为 `1 + 9 = 10`，正好等于目标。

但如果目标是 11 呢？

```
sum = 1 + 9 = 10 < 11

此时我们知道：
- 1 + 9 = 10 < 11
- 1 + 8 = 9 < 11
- 1 + 6 = 7 < 11
- ...
- 1 与任何数的组合都 < 11

所以，nums[left] = 1 可以被排除，left++
```

同理，如果 `sum > target`：

```
假设 sum = 2 + 9 = 11 > 10

- 2 + 9 = 11 > 10
- 4 + 9 = 13 > 10
- 6 + 9 = 15 > 10
- ...
- 任何数 + 9 都 > 10

所以，nums[right] = 9 可以被排除，right--
```

**每一次指针移动，都在排除一整行或一整列的组合。** 这就是对撞指针能将 O(n²) 降到 O(n) 的原因。

---

## 对撞指针模板

理解了原理，我们可以提炼出通用模板：

```typescript
function collisionPointer(nums: number[], target: number): number[] {
  let left = 0;
  let right = nums.length - 1;
  
  while (left < right) {
    const current = evaluate(nums[left], nums[right]);
    
    if (current === target) {
      return [left, right];  // 找到答案
    }
    
    if (current < target) {
      left++;   // 需要更大的值，左指针右移
    } else {
      right--;  // 需要更小的值，右指针左移
    }
  }
  
  return [];  // 未找到
}
```

模板中的 `evaluate` 函数根据具体问题定义：
- **两数之和**：`nums[left] + nums[right]`
- **两数之差**：`nums[right] - nums[left]`
- **乘积**：`nums[left] * nums[right]`

关键点：
- **循环条件 `left < right`**：两个指针不能重叠（避免同一个元素用两次）
- **每次只移动一个指针**：根据当前值与目标的大小关系决定移动哪个

---

## 典型应用场景

### 场景一：回文串判断

回文串从两端向中间看是对称的，天然适合对撞指针。

```typescript
function isPalindrome(s: string): boolean {
  let left = 0;
  let right = s.length - 1;
  
  while (left < right) {
    if (s[left] !== s[right]) {
      return false;  // 不对称，不是回文
    }
    left++;
    right--;
  }
  
  return true;
}
```

这里的移动规则很简单：**无论是否相等，两个指针都同时移动**。

### 场景二：盛水容器

LeetCode 11 题：给定一个数组 `height`，选择两条线，使得它们与 x 轴构成的容器能容纳最多的水。

```
height = [1, 8, 6, 2, 5, 4, 8, 3, 7]

容量 = min(左高度, 右高度) × 宽度
```

这个问题乍看不像"有序"问题，但我们可以用对撞指针：

```typescript
function maxArea(height: number[]): number {
  let left = 0;
  let right = height.length - 1;
  let maxWater = 0;
  
  while (left < right) {
    const width = right - left;
    const h = Math.min(height[left], height[right]);
    maxWater = Math.max(maxWater, width * h);
    
    // 移动较短的那根柱子
    if (height[left] < height[right]) {
      left++;
    } else {
      right--;
    }
  }
  
  return maxWater;
}
```

**为什么移动较短的柱子？**

假设 `height[left] < height[right]`：
- 当前容量受限于 `height[left]`
- 如果移动 `right`，宽度减小，高度最多还是 `height[left]`，容量只会减小
- 只有移动 `left`，才**可能**找到更高的柱子，获得更大容量

### 场景三：三数之和

三数之和可以转化为：**固定一个数，然后在剩余部分用对撞指针找两数之和**。

```typescript
function threeSum(nums: number[]): number[][] {
  nums.sort((a, b) => a - b);  // 排序是前提
  const result: number[][] = [];
  
  for (let i = 0; i < nums.length - 2; i++) {
    // 跳过重复的第一个数
    if (i > 0 && nums[i] === nums[i - 1]) continue;
    
    const target = -nums[i];
    let left = i + 1;
    let right = nums.length - 1;
    
    // 对撞指针找两数之和
    while (left < right) {
      const sum = nums[left] + nums[right];
      
      if (sum === target) {
        result.push([nums[i], nums[left], nums[right]]);
        
        // 跳过重复
        while (left < right && nums[left] === nums[left + 1]) left++;
        while (left < right && nums[right] === nums[right - 1]) right--;
        
        left++;
        right--;
      } else if (sum < target) {
        left++;
      } else {
        right--;
      }
    }
  }
  
  return result;
}
```

这种"固定一个 + 对撞找两个"的模式，是解决多数之和问题的通用策略。

---

## 对撞指针的适用条件

总结一下，对撞指针适用于以下场景：

| 场景 | 特征 | 例题 |
|-----|------|------|
| **有序数组** | 需要利用单调性排除答案 | 两数之和、三数之和 |
| **回文结构** | 需要从两端向中间对比 | 验证回文串、回文子串 |
| **区间优化** | 需要在两端选择并收缩 | 盛水容器、接雨水 |

**注意**：对撞指针要求问题具有**单调性**或**对称性**。如果移动指针无法确定性地排除一些情况，就不能使用对撞指针。

---

## 常见陷阱

### 陷阱一：忘记排序

```typescript
// ❌ 错误：未排序的数组不能用对撞指针
const nums = [3, 1, 4, 1, 5];
// 直接用对撞指针找两数之和会出错
```

### 陷阱二：循环条件写错

```typescript
// ❌ 错误：left <= right 可能导致同一个元素用两次
while (left <= right) { ... }

// ✅ 正确：left < right 确保是不同元素
while (left < right) { ... }
```

### 陷阱三：未处理重复元素

在三数之和等问题中，如果不跳过重复元素，会产生重复答案。

---

## 本章小结

对撞指针是处理**有序数组**和**区间问题**的利器。

**核心思想**：每次移动都在排除一批不可能的答案。

**适用前提**：问题具有单调性或对称性，能够确定移动哪个指针。

**模板要点**：
- `left = 0, right = n - 1`
- `while (left < right)`
- 根据当前值与目标的关系决定移动哪个指针

下一章，我们将学习另一种模式——快慢指针。
