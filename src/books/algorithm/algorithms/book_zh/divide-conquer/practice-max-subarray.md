# 实战：最大子数组和

> LeetCode 53. 最大子数组和 | 难度：中等

这道题展示了分治思想的巧妙应用：最大子数组可能在左半部分、右半部分，或**跨越中点**。

📎 [LeetCode 53. 最大子数组和](https://leetcode.cn/problems/maximum-subarray/)

---

## 题目描述

给定一个整数数组 `nums`，找到具有最大和的连续子数组（子数组至少包含一个元素），返回其最大和。

**示例1**：
```
输入：nums = [-2,1,-3,4,-1,2,1,-5,4]
输出：6
解释：连续子数组 [4,-1,2,1] 的和最大，为 6
```

**示例2**：
```
输入：nums = [1]
输出：1
```

**示例3**：
```
输入：nums = [5,4,-1,7,8]
输出：23
解释：整个数组的和最大
```

---

## 问题分析

### 问题本质

在数组中寻找**连续**的一段，使得这一段的和最大。

### 为什么用分治？

这道题有更优的 DP 解法（O(n)），但用分治来解决有两个意义：
1. **学习分治思想**：如何处理"跨越分界点"的情况
2. **面试考察点**：展示对分治的理解

---

## 分治思路

将数组从中间分为两半，最大子数组有三种情况：

1. **完全在左半部分**
2. **完全在右半部分**  
3. **跨越中点**（必须包含中点左右两侧的元素）

```
          [-2, 1, -3, 4, -1, 2, 1, -5, 4]
                     ↑
                   中点 mid=4

  左半 [−2,1,−3,4,−1]        右半 [2,1,−5,4]
          ↓                       ↓
   递归求解 leftMax          递归求解 rightMax
          ↓                       ↓
      跨越中点：必须同时包含 mid 和 mid+1
            左侧最大后缀 + 右侧最大前缀
```

### 关键洞察

**跨越中点的子数组**必须同时包含 mid 和 mid+1 位置的元素，所以：
- 从 mid 向左扩展，找最大后缀和
- 从 mid+1 向右扩展，找最大前缀和
- 两者相加即为跨越部分的最大和

---

## 代码实现

```typescript
function maxSubArray(nums: number[]): number {
  function divideConquer(left: number, right: number): number {
    // 基准情形：只有一个元素
    if (left === right) return nums[left];
    
    const mid = Math.floor((left + right) / 2);
    
    // 1. 左半部分最大子数组和（递归）
    const leftMax = divideConquer(left, mid);
    
    // 2. 右半部分最大子数组和（递归）
    const rightMax = divideConquer(mid + 1, right);
    
    // 3. 计算跨越中点的最大子数组和
    let leftSum = -Infinity;
    let sum = 0;
    
    // 从 mid 向左扫描，找最大后缀
    for (let i = mid; i >= left; i--) {
      sum += nums[i];
      leftSum = Math.max(leftSum, sum);
    }
    
    let rightSum = -Infinity;
    sum = 0;
    
    // 从 mid+1 向右扫描，找最大前缀
    for (let i = mid + 1; i <= right; i++) {
      sum += nums[i];
      rightSum = Math.max(rightSum, sum);
    }
    
    const crossMax = leftSum + rightSum;
    
    // 返回三种情况的最大值
    return Math.max(leftMax, rightMax, crossMax);
  }
  
  return divideConquer(0, nums.length - 1);
}
```

---

## 执行过程详解

以 `nums = [-2, 1, -3, 4, -1, 2, 1, -5, 4]` 为例：

```
第一层：left=0, right=8, mid=4
├── 递归左半：divideConquer(0, 4)
├── 递归右半：divideConquer(5, 8)
└── 计算跨越中点

计算跨越中点（mid=4, 值为 -1）：

从 mid=4 向左扫描：
  i=4: sum = -1, leftSum = max(-∞, -1) = -1
  i=3: sum = -1+4 = 3, leftSum = max(-1, 3) = 3
  i=2: sum = 3+(-3) = 0, leftSum = max(3, 0) = 3
  i=1: sum = 0+1 = 1, leftSum = max(3, 1) = 3
  i=0: sum = 1+(-2) = -1, leftSum = max(3, -1) = 3
  
  → leftSum = 3, 对应子数组 [4, -1]

从 mid+1=5 向右扫描：
  i=5: sum = 2, rightSum = max(-∞, 2) = 2
  i=6: sum = 2+1 = 3, rightSum = max(2, 3) = 3
  i=7: sum = 3+(-5) = -2, rightSum = max(3, -2) = 3
  i=8: sum = -2+4 = 2, rightSum = max(3, 2) = 3
  
  → rightSum = 3, 对应子数组 [2, 1]

跨越中点的最大和：crossMax = 3 + 3 = 6
对应子数组：[4, -1, 2, 1]

最终：max(leftMax, rightMax, crossMax) = max(4, 3, 6) = 6
```

---

## 复杂度分析

### 时间复杂度

设 `T(n)` 为处理长度为 n 的数组的时间：

```
T(n) = 2·T(n/2) + O(n)
```

- `2·T(n/2)`：两次递归调用，各处理一半
- `O(n)`：计算跨越中点需要扫描整个区间

根据主定理，`a=2, b=2, f(n)=O(n)`，满足 `f(n) = Θ(n^log_b(a)) = Θ(n)`

**时间复杂度：O(n log n)**

### 空间复杂度

递归深度为 log n，**空间复杂度：O(log n)**

---

## 对比：动态规划解法

这道题用 DP 更简洁高效：

```typescript
function maxSubArrayDP(nums: number[]): number {
  let maxSum = nums[0];
  let currentSum = nums[0];
  
  for (let i = 1; i < nums.length; i++) {
    // 要么从当前元素开始新的子数组，要么延续之前的
    currentSum = Math.max(nums[i], currentSum + nums[i]);
    maxSum = Math.max(maxSum, currentSum);
  }
  
  return maxSum;
}
```

### DP 思路

`currentSum` 表示以当前元素结尾的最大子数组和：
- 如果 `currentSum + nums[i] < nums[i]`，说明之前的累计是负的，不如从当前重新开始
- 否则，延续之前的子数组

**DP 复杂度**：O(n) 时间，O(1) 空间，明显优于分治。

---

## 分治 vs DP

| 方法 | 时间复杂度 | 空间复杂度 | 优势 |
|------|-----------|-----------|------|
| 分治 | O(n log n) | O(log n) | 可并行化、展示分治思想 |
| DP | O(n) | O(1) | 更高效、代码更简洁 |

### 何时用分治？

这道题**实际中不推荐分治**，但通过这道题我们学会了**处理跨越分界点的情况**，这个技巧在很多问题中都会用到：

- **归并排序**：合并两个有序数组
- **逆序对统计**：跨越中点的逆序对
- **最近点对**：跨越分界线的点对

---

## 常见错误

### 错误1：跨越部分初始化为 0

```typescript
// ❌ 错误：如果所有元素都是负数，0 会是错误答案
let leftSum = 0;

// ✅ 正确：初始化为负无穷
let leftSum = -Infinity;
```

### 错误2：跨越扫描方向错误

```typescript
// ❌ 错误：左半应该从 mid 向左扫描
for (let i = left; i <= mid; i++) { ... }

// ✅ 正确：从 mid 向左，找最大后缀
for (let i = mid; i >= left; i--) { ... }
```

### 错误3：遗漏跨越情况

```typescript
// ❌ 错误：只考虑了左右两部分
return Math.max(leftMax, rightMax);

// ✅ 正确：必须考虑跨越中点的情况
return Math.max(leftMax, rightMax, crossMax);
```

---

## 问题变体

### 变体1：返回子数组本身

```typescript
function maxSubArrayWithRange(nums: number[]): [number, number, number] {
  function divideConquer(left: number, right: number): [number, number, number] {
    if (left === right) return [nums[left], left, right];
    
    const mid = Math.floor((left + right) / 2);
    
    const [leftMax, ll, lr] = divideConquer(left, mid);
    const [rightMax, rl, rr] = divideConquer(mid + 1, right);
    
    // 计算跨越中点
    let leftSum = -Infinity, maxLeft = mid;
    let sum = 0;
    for (let i = mid; i >= left; i--) {
      sum += nums[i];
      if (sum > leftSum) {
        leftSum = sum;
        maxLeft = i;
      }
    }
    
    let rightSum = -Infinity, maxRight = mid + 1;
    sum = 0;
    for (let i = mid + 1; i <= right; i++) {
      sum += nums[i];
      if (sum > rightSum) {
        rightSum = sum;
        maxRight = i;
      }
    }
    
    const crossMax = leftSum + rightSum;
    
    if (leftMax >= rightMax && leftMax >= crossMax) {
      return [leftMax, ll, lr];
    } else if (rightMax >= leftMax && rightMax >= crossMax) {
      return [rightMax, rl, rr];
    } else {
      return [crossMax, maxLeft, maxRight];
    }
  }
  
  return divideConquer(0, nums.length - 1);
}
```

### 变体2：环形数组最大子数组和

环形数组中最大子数组和 = max(普通最大和, 总和 - 最小子数组和)

---

## 相关题目

- LeetCode 152. 乘积最大子数组
- LeetCode 918. 环形子数组的最大和
- LeetCode 1186. 删除一次得到子数组最大和

---

## 总结

最大子数组和是学习分治思想的经典题目：

1. **分治三部分**：左边、右边、跨越中点
2. **跨越计算技巧**：从中点双向扫描
3. **实际选择**：虽然分治能解，但 DP 更优

**学习价值**：
- 理解"跨越分界点"的处理方法
- 掌握分治复杂度分析（主定理）
- 培养算法选择的判断力
