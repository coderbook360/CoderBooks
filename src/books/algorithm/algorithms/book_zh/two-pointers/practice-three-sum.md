# 实战：三数之和

> LeetCode 15. 三数之和 | 难度：中等

这道题是对撞指针的经典进阶应用，面试高频题。难点不在于对撞指针本身，而在于**去重处理**。

---

## 题目描述

给你一个整数数组 `nums`，判断是否存在三元组 `[nums[i], nums[j], nums[k]]` 满足 `i != j`、`i != k` 且 `j != k`，同时还满足 `nums[i] + nums[j] + nums[k] == 0`。

返回所有和为 0 且**不重复**的三元组。

**示例**：
```
输入：nums = [-1, 0, 1, 2, -1, -4]
输出：[[-1, -1, 2], [-1, 0, 1]]
```

---

## 思路分析

### 核心转化

三数之和 `a + b + c = 0` 可以改写为 `b + c = -a`。

如果我们固定 `a`，问题就变成了在剩余数组中寻找两数之和等于 `-a`，这正是对撞指针的经典场景。

### 算法步骤

1. **排序**：使数组有序，这是对撞指针的前提
2. **遍历第一个数**：枚举 `nums[i]` 作为三元组的第一个数
3. **对撞指针**：在 `[i+1, n-1]` 范围内用对撞指针寻找另外两个数
4. **去重**：跳过重复元素，避免产生重复三元组

---

## 代码实现

```typescript
function threeSum(nums: number[]): number[][] {
  const result: number[][] = [];
  nums.sort((a, b) => a - b);  // 排序
  
  for (let i = 0; i < nums.length - 2; i++) {
    // 剪枝：最小的数都 > 0，不可能凑出和为 0
    if (nums[i] > 0) break;
    
    // 去重1：跳过重复的第一个数
    if (i > 0 && nums[i] === nums[i - 1]) continue;
    
    let left = i + 1;
    let right = nums.length - 1;
    const target = -nums[i];
    
    while (left < right) {
      const sum = nums[left] + nums[right];
      
      if (sum === target) {
        result.push([nums[i], nums[left], nums[right]]);
        
        // 去重2：跳过重复的第二个数
        while (left < right && nums[left] === nums[left + 1]) left++;
        // 去重3：跳过重复的第三个数
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

---

## 去重详解

这道题最容易出错的地方就是去重。我们需要在三个位置去重：

### 位置1：第一个数去重

```typescript
// 为什么是 nums[i] === nums[i - 1] 而不是 nums[i] === nums[i + 1]？

// 假设数组是 [-1, -1, 0, 1]

// 如果用 nums[i] === nums[i + 1] 跳过：
// i=0 时，nums[0]=-1, nums[1]=-1，跳过
// 这样 [-1, -1, 0, 1] 中的 [-1, 0, 1] 就被漏掉了！

// 正确做法是 nums[i] === nums[i - 1]：
// i=0 时，正常处理
// i=1 时，nums[1]=-1 === nums[0]=-1，跳过
// 这样确保每个数值只作为第一个数使用一次
```

### 位置2&3：第二、三个数去重

```typescript
// 找到一组解后，跳过所有重复的 left 和 right
while (left < right && nums[left] === nums[left + 1]) left++;
while (left < right && nums[right] === nums[right - 1]) right--;

// 例如：nums = [-2, 0, 0, 2, 2]
// 找到 [-2, 0, 2] 后，需要跳过重复的 0 和 2
```

---

## 图示过程

```
nums = [-1, 0, 1, 2, -1, -4]
排序后：[-4, -1, -1, 0, 1, 2]

第1轮：i=0, nums[i]=-4, target=4
      left=1, right=5
      -1+2=1 < 4, left++
      -1+2=1 < 4, left++
      0+2=2 < 4, left++
      1+2=3 < 4, left++
      left >= right, 结束

第2轮：i=1, nums[i]=-1, target=1
      left=2, right=5
      -1+2=1 = 1, 找到 [-1,-1,2]
      去重后 left=3, right=4
      0+1=1 = 1, 找到 [-1,0,1]
      去重后 left=4, right=3
      left >= right, 结束

第3轮：i=2, nums[i]=-1
      与前一个相同，跳过

...

结果：[[-1,-1,2], [-1,0,1]]
```

---

## 剪枝优化

```typescript
// 剪枝1：最小的数 > 0
if (nums[i] > 0) break;
// 如果排序后的第一个数都大于 0，后面所有数都大于 0
// 三个正数相加不可能等于 0

// 剪枝2（可选）：最大的三个数之和 < 0
if (nums[i] + nums[n-1] + nums[n-2] < 0) continue;
// 当前数与最大的两个数之和都 < 0，说明当前数太小了

// 剪枝3（可选）：最小的三个数之和 > 0
if (nums[i] + nums[i+1] + nums[i+2] > 0) break;
// 当前数与最小的两个数之和都 > 0，说明后面不可能有解了
```

---

## 复杂度分析

- **时间复杂度**：O(n²)
  - 排序：O(n log n)
  - 双重循环：外层 O(n)，内层对撞指针 O(n)
  - 总体：O(n²)
  
- **空间复杂度**：O(1)（不计输出数组）

---

## N 数之和的推广

这种"固定一个数 + 对撞指针"的思想可以推广到 N 数之和：

```typescript
// 四数之和：固定两个数 + 对撞指针
for (let i = 0; i < n - 3; i++) {
  for (let j = i + 1; j < n - 2; j++) {
    // 对撞指针找剩余两个数
  }
}

// N 数之和：固定 N-2 个数 + 对撞指针
// 时间复杂度：O(n^(N-1))
```

---

## 要点总结

1. **排序是前提**：使对撞指针成为可能
2. **固定一个数**：将三数之和转化为两数之和
3. **去重是关键**：三处去重，防止重复三元组
4. **剪枝优化**：利用有序性提前退出

---

## 相关题目

- **16. 最接近的三数之和**：找和最接近 target 的三元组
- **18. 四数之和**：固定两个数 + 对撞指针
- **167. 两数之和 II**：有序数组的两数之和
