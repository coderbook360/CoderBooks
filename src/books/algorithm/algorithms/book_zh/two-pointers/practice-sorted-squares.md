# 实战：有序数组的平方

> LeetCode 977. 有序数组的平方 | 难度：简单

对撞指针处理**含负数的有序数组**的典型应用。

---

## 题目描述

给你一个按**非递减顺序**排序的整数数组 `nums`，返回**每个数字的平方**组成的新数组，要求也按非递减顺序排序。

**示例**：
```
输入：nums = [-4, -1, 0, 3, 10]
输出：[0, 1, 9, 16, 100]

输入：nums = [-7, -3, 2, 3, 11]
输出：[4, 9, 9, 49, 121]
```

---

## 思路分析

### 暴力解法

直接平方后排序：

```typescript
function sortedSquares(nums: number[]): number[] {
  return nums.map(x => x * x).sort((a, b) => a - b);
}
```

时间复杂度 O(n log n)，能否优化到 O(n)？

### 关键观察

如果数组全是非负数，平方后自然有序。

但数组包含负数时：
```
原数组：[-4, -1, 0, 3, 10]
平方后：[16, 1, 0, 9, 100]  ← 不是有序的

绝对值：[4, 1, 0, 3, 10]
```

关键洞察：**平方的最大值一定在两端**。

```
[-4, -1, 0, 3, 10]
  ↑             ↑
  |−4| = 4     |10| = 10

两端的绝对值最大，中间的绝对值最小
平方后的最大值一定来自两端之一
```

---

## 对撞指针解法

用两个指针从两端向中间移动：
- 比较两端的平方值
- 较大的那个放入结果数组的**末尾**
- 移动相应的指针

```typescript
function sortedSquares(nums: number[]): number[] {
  const n = nums.length;
  const result = new Array(n);
  let left = 0;
  let right = n - 1;
  let pos = n - 1;  // 从后往前填充
  
  while (left <= right) {
    const leftSquare = nums[left] * nums[left];
    const rightSquare = nums[right] * nums[right];
    
    if (leftSquare > rightSquare) {
      result[pos] = leftSquare;
      left++;
    } else {
      result[pos] = rightSquare;
      right--;
    }
    
    pos--;
  }
  
  return result;
}
```

---

## 执行过程可视化

```
nums = [-4, -1, 0, 3, 10]
         ↑            ↑
       left         right
       pos = 4（从后往前）

第1轮：leftSquare=16, rightSquare=100
       100 > 16，选 100
       result = [_, _, _, _, 100]
       right--, pos--

第2轮：nums = [-4, -1, 0, 3, 10]
                ↑        ↑
       leftSquare=16, rightSquare=9
       16 > 9，选 16
       result = [_, _, _, 16, 100]
       left++, pos--

第3轮：nums = [-4, -1, 0, 3, 10]
                   ↑     ↑
       leftSquare=1, rightSquare=9
       9 > 1，选 9
       result = [_, _, 9, 16, 100]
       right--, pos--

第4轮：nums = [-4, -1, 0, 3, 10]
                   ↑  ↑
       leftSquare=1, rightSquare=0
       1 > 0，选 1
       result = [_, 1, 9, 16, 100]
       left++, pos--

第5轮：nums = [-4, -1, 0, 3, 10]
                      ↑(left=right)
       leftSquare=rightSquare=0
       result = [0, 1, 9, 16, 100]

返回 [0, 1, 9, 16, 100] ✓
```

---

## 为什么从后往前填充

**从前往后**需要找最小值，但最小值可能在数组中间：

```
[-4, -1, 0, 3, 10]
         ↑
        最小值在中间
```

**从后往前**找最大值，最大值一定在两端，可以用对撞指针。

```
[-4, -1, 0, 3, 10]
  ↑             ↑
  最大值一定在这两端之一
```

---

## 另一种思路：找分界点

先找到负数和非负数的分界点，然后归并：

```typescript
function sortedSquares(nums: number[]): number[] {
  // 找到第一个非负数的位置
  let negEnd = -1;
  for (let i = 0; i < nums.length; i++) {
    if (nums[i] < 0) negEnd = i;
    else break;
  }
  
  // 两个指针：负数部分从右往左，非负部分从左往右
  let left = negEnd;      // 负数部分的末尾
  let right = negEnd + 1; // 非负部分的开头
  const result: number[] = [];
  
  while (left >= 0 || right < nums.length) {
    const leftSquare = left >= 0 ? nums[left] * nums[left] : Infinity;
    const rightSquare = right < nums.length ? nums[right] * nums[right] : Infinity;
    
    if (leftSquare < rightSquare) {
      result.push(leftSquare);
      left--;
    } else {
      result.push(rightSquare);
      right++;
    }
  }
  
  return result;
}
```

这种方法直观但代码稍长。

---

## 复杂度分析

**时间复杂度**：O(n)
- 每个元素只处理一次

**空间复杂度**：O(n)
- 需要存储结果数组
- 如果要求原地修改，这个问题更复杂

---

## 常见错误

**错误1：从前往后填充**
```typescript
// 错误：最小值不在两端
let pos = 0;
result[pos++] = Math.min(leftSquare, rightSquare);  // ❌
```

**错误2：忘记移动指针**
```typescript
if (leftSquare > rightSquare) {
  result[pos] = leftSquare;
  // 忘记 left++  ❌
}
```

**错误3：边界条件**
```typescript
// 需要 left <= right，而不是 left < right
// 因为当 left === right 时，还有一个元素未处理
while (left < right) {  // ❌
```

---

## 变体：原地修改

如果要求 O(1) 额外空间（不算结果数组），可以：
1. 先翻转负数部分
2. 使用归并的思想

但这种方法比较复杂，面试中一般不要求。

---

## 相关题目

| 题目 | 难度 | 说明 |
|-----|------|------|
| [88. 合并两个有序数组](https://leetcode.com/problems/merge-sorted-array/) | 简单 | 从后往前填充 |
| [360. 有序转化数组](https://leetcode.com/problems/sort-transformed-array/) | 中等 | 二次函数变换 |

---

## 总结

有序数组平方的核心要点：

1. **关键洞察**：平方后最大值一定在两端
2. **对撞指针**：从两端向中间移动
3. **从后往前**：填充结果数组
4. **时间优化**：从 O(n log n) 优化到 O(n)

## 复杂度分析

- **时间复杂度**：O(n)
- **空间复杂度**：O(n)（用于存放结果）

---

## 对比

| 方法 | 时间 | 空间 |
|-----|------|------|
| 平方后排序 | O(n log n) | O(1) |
| **双指针** | O(n) | O(n) |

双指针在时间上更优。
