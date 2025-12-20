# 实战：四数之和

> LeetCode 18. 四数之和 | 难度：中等

这道题是三数之和的直接扩展，核心思想完全一致：**固定两个数 + 对撞指针**。

---

## 题目描述

给你一个由 n 个整数组成的数组 `nums`，和一个目标值 `target`。找出所有满足条件的四元组 `[nums[a], nums[b], nums[c], nums[d]]`，使得 `nums[a] + nums[b] + nums[c] + nums[d] == target`。

答案中不可以包含重复的四元组。

**示例**：
```
输入：nums = [1, 0, -1, 0, -2, 2], target = 0
输出：[[-2, -1, 1, 2], [-2, 0, 0, 2], [-1, 0, 0, 1]]
```

---

## 思路分析

四数之和 = 固定第一个数 + 三数之和 = 固定两个数 + 两数之和（对撞指针）

```
a + b + c + d = target
固定 a, b 后：c + d = target - a - b
用对撞指针在 [b+1, n-1] 范围内找 c 和 d
```

---

## 代码实现

```typescript
function fourSum(nums: number[], target: number): number[][] {
  const result: number[][] = [];
  nums.sort((a, b) => a - b);
  const n = nums.length;
  
  for (let i = 0; i < n - 3; i++) {
    // 去重：第一个数
    if (i > 0 && nums[i] === nums[i - 1]) continue;
    
    // 剪枝：当前最小四数之和 > target
    if (nums[i] + nums[i+1] + nums[i+2] + nums[i+3] > target) break;
    // 剪枝：当前数 + 最大三数 < target
    if (nums[i] + nums[n-1] + nums[n-2] + nums[n-3] < target) continue;
    
    for (let j = i + 1; j < n - 2; j++) {
      // 去重：第二个数
      if (j > i + 1 && nums[j] === nums[j - 1]) continue;
      
      // 剪枝
      if (nums[i] + nums[j] + nums[j+1] + nums[j+2] > target) break;
      if (nums[i] + nums[j] + nums[n-1] + nums[n-2] < target) continue;
      
      let left = j + 1;
      let right = n - 1;
      const remain = target - nums[i] - nums[j];
      
      while (left < right) {
        const sum = nums[left] + nums[right];
        
        if (sum === remain) {
          result.push([nums[i], nums[j], nums[left], nums[right]]);
          
          // 去重
          while (left < right && nums[left] === nums[left + 1]) left++;
          while (left < right && nums[right] === nums[right - 1]) right--;
          
          left++;
          right--;
        } else if (sum < remain) {
          left++;
        } else {
          right--;
        }
      }
    }
  }
  
  return result;
}
```

---

## 去重与剪枝

与三数之和类似，需要在四个位置去重。剪枝可以显著提高性能：

```typescript
// 剪枝1：最小四数之和 > target
if (nums[i] + nums[i+1] + nums[i+2] + nums[i+3] > target) break;

// 剪枝2：当前数 + 最大三数 < target
if (nums[i] + nums[n-1] + nums[n-2] + nums[n-3] < target) continue;
```

### 去重详解

四数之和需要在四个位置去重：

```typescript
// 位置1：第一个数去重（i 循环）
if (i > 0 && nums[i] === nums[i - 1]) continue;

// 位置2：第二个数去重（j 循环）
if (j > i + 1 && nums[j] === nums[j - 1]) continue;

// 位置3&4：第三、四个数去重（对撞指针）
while (left < right && nums[left] === nums[left + 1]) left++;
while (left < right && nums[right] === nums[right - 1]) right--;
```

**为什么 j 的条件是 `j > i + 1` 而不是 `j > 0`？**

因为 j 从 `i + 1` 开始，第一个 j 应该正常处理，只有后续相同的才跳过。

---

## 执行过程可视化

```
nums = [1, 0, -1, 0, -2, 2], target = 0
排序后：[-2, -1, 0, 0, 1, 2]

第1轮：i=0, nums[i]=-2
  j=1, nums[j]=-1, remain=3
    left=2, right=5: 0+2=2 < 3, left++
    left=3, right=5: 0+2=2 < 3, left++
    left=4, right=5: 1+2=3 = 3 ✓ → [-2,-1,1,2]
    去重后 left=5, right=4, 结束
    
  j=2, nums[j]=0, remain=2
    left=3, right=5: 0+2=2 = 2 ✓ → [-2,0,0,2]
    去重后 left=4, right=4, 结束
    
  j=3, nums[j]=0, 与 j=2 相同，跳过

第2轮：i=1, nums[i]=-1
  j=2, nums[j]=0, remain=1
    left=3, right=5: 0+2=2 > 1, right--
    left=3, right=4: 0+1=1 = 1 ✓ → [-1,0,0,1]
    去重后 left=4, right=3, 结束

...

最终结果：[[-2,-1,1,2], [-2,0,0,2], [-1,0,0,1]]
```

---

## 复杂度分析

- **时间复杂度**：O(n³)
  - 两层 for 循环：O(n²)
  - 对撞指针：O(n)
  - 总计：O(n³)
  
- **空间复杂度**：O(1)（不计排序所用空间）

---

## 注意：大数溢出问题

当 target 较大时，四个数相加可能溢出：

```typescript
// ❌ 可能溢出（JavaScript 中通常不会，但其他语言需注意）
const sum = nums[i] + nums[j] + nums[left] + nums[right];

// ✓ 安全做法：分步计算
const sum = nums[left] + nums[right];
const remain = target - nums[i] - nums[j];
if (sum === remain) { ... }
```

在 JavaScript 中，数值精度问题较少，但面试时应该提及这个考虑。

---

## 常见错误

### 错误1：去重条件写错

```typescript
// ❌ 错误：会跳过第一个有效值
if (nums[j] === nums[j - 1]) continue;

// ✓ 正确：确保不是第一个
if (j > i + 1 && nums[j] === nums[j - 1]) continue;
```

### 错误2：剪枝时用 continue 还是 break

```typescript
// 当前最小和 > target，后续更大，用 break
if (nums[i] + nums[i+1] + nums[i+2] + nums[i+3] > target) break;

// 当前最大和 < target，当前 i 没戏，用 continue
if (nums[i] + nums[n-1] + nums[n-2] + nums[n-3] < target) continue;
```

### 错误3：循环边界条件

```typescript
// ❌ 错误：可能越界
for (let i = 0; i < n; i++)

// ✓ 正确：需要预留至少4个位置
for (let i = 0; i < n - 3; i++)
```

---

## N 数之和通用模式

```
N 数之和：
- 固定 N-2 个数（N-2 层循环）
- 对撞指针找最后 2 个数
- 时间复杂度：O(n^(N-1))
```

### 通用实现框架

```typescript
function nSum(nums: number[], n: number, target: number): number[][] {
  nums.sort((a, b) => a - b);
  return nSumHelper(nums, n, 0, target);
}

function nSumHelper(
  nums: number[],
  n: number,
  start: number,
  target: number
): number[][] {
  const len = nums.length;
  const result: number[][] = [];
  
  // 递归终止：两数之和
  if (n === 2) {
    let left = start, right = len - 1;
    while (left < right) {
      const sum = nums[left] + nums[right];
      if (sum === target) {
        result.push([nums[left], nums[right]]);
        while (left < right && nums[left] === nums[left + 1]) left++;
        while (left < right && nums[right] === nums[right - 1]) right--;
        left++; right--;
      } else if (sum < target) {
        left++;
      } else {
        right--;
      }
    }
    return result;
  }
  
  // 递归：固定一个数，求 n-1 数之和
  for (let i = start; i < len - n + 1; i++) {
    if (i > start && nums[i] === nums[i - 1]) continue;
    
    const subResults = nSumHelper(nums, n - 1, i + 1, target - nums[i]);
    for (const sub of subResults) {
      result.push([nums[i], ...sub]);
    }
  }
  
  return result;
}
```

---

## 相关题目

- **1. 两数之和**：基础版本
- **15. 三数之和**：三数版本
- **454. 四数相加 II**：四个数组各取一个数，可用哈希表优化到 O(n²)
