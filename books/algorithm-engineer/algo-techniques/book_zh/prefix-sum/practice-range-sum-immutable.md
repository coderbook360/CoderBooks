# 实战：区域和检索（不可变）

> LeetCode 303. 区域和检索 - 数组不可变 | 难度：简单

前缀和的入门经典题，理解透彻后可以举一反三解决大量区间问题。

---

## 题目描述

给定一个整数数组 `nums`，处理以下类型的多个查询：

计算索引 `left` 和 `right`（包含 left 和 right）之间的 nums 元素的和。

实现 `NumArray` 类：
- `NumArray(nums)` 使用数组 `nums` 初始化对象
- `sumRange(left, right)` 返回数组 `nums` 中索引 `left` 和 `right` 之间的元素的总和

**示例**：
```
NumArray numArray = new NumArray([-2, 0, 3, -5, 2, -1]);
numArray.sumRange(0, 2); // return (-2) + 0 + 3 = 1
numArray.sumRange(2, 5); // return 3 + (-5) + 2 + (-1) = -1
numArray.sumRange(0, 5); // return (-2) + 0 + 3 + (-5) + 2 + (-1) = -3
```

---

## 思路分析

### 暴力方法

每次查询遍历区间求和：

```typescript
sumRange(left, right) {
  let sum = 0;
  for (let i = left; i <= right; i++) {
    sum += nums[i];
  }
  return sum;
}
// 每次查询 O(n)
```

问题：多次查询时效率低，总时间 O(q × n)

### 前缀和优化

**核心思想**：预处理前缀和数组，区间和 = prefix[right+1] - prefix[left]

```
原数组：  [-2, 0, 3, -5, 2, -1]
前缀和：[0, -2, -2, 1, -4, -2, -3]

sumRange(2, 5) = prefix[6] - prefix[2]
               = -3 - (-2)
               = -1
```

---

## 代码实现

### 标准实现

```typescript
class NumArray {
  private prefix: number[];
  
  constructor(nums: number[]) {
    const n = nums.length;
    // prefix[i] = nums[0] + nums[1] + ... + nums[i-1]
    this.prefix = new Array(n + 1).fill(0);
    
    for (let i = 0; i < n; i++) {
      this.prefix[i + 1] = this.prefix[i] + nums[i];
    }
  }
  
  sumRange(left: number, right: number): number {
    // 区间[left, right]的和 = prefix[right+1] - prefix[left]
    return this.prefix[right + 1] - this.prefix[left];
  }
}
```

### 不使用额外空间的变体

```typescript
class NumArray {
  private nums: number[];
  
  constructor(nums: number[]) {
    // 直接修改原数组为前缀和
    for (let i = 1; i < nums.length; i++) {
      nums[i] += nums[i - 1];
    }
    this.nums = nums;
  }
  
  sumRange(left: number, right: number): number {
    if (left === 0) {
      return this.nums[right];
    }
    return this.nums[right] - this.nums[left - 1];
  }
}
```

---

## 图示解析

### 前缀和构建过程

```
nums:     [-2,  0,  3, -5,  2, -1]
索引:       0   1   2   3   4   5

prefix[0] = 0                              （空前缀）
prefix[1] = 0 + (-2) = -2                  （前1个元素之和）
prefix[2] = -2 + 0 = -2                    （前2个元素之和）
prefix[3] = -2 + 3 = 1                     （前3个元素之和）
prefix[4] = 1 + (-5) = -4                  （前4个元素之和）
prefix[5] = -4 + 2 = -2                    （前5个元素之和）
prefix[6] = -2 + (-1) = -3                 （前6个元素之和）

prefix: [0, -2, -2, 1, -4, -2, -3]
索引:     0   1   2  3   4   5   6
```

### 区间和计算

```
查询 sumRange(2, 5):

nums:     [-2,  0,  3, -5,  2, -1]
                   └────────────┘  要计算这个区间

prefix[6] = nums[0] + nums[1] + nums[2] + nums[3] + nums[4] + nums[5]
prefix[2] = nums[0] + nums[1]

prefix[6] - prefix[2] = nums[2] + nums[3] + nums[4] + nums[5]
                      = 3 + (-5) + 2 + (-1)
                      = -1 ✓
```

---

## 为什么 prefix 长度是 n+1？

**好处1**：统一处理边界

```typescript
// 如果prefix长度是n：
sumRange(left, right) {
  if (left === 0) {
    return prefix[right];  // 特殊处理
  }
  return prefix[right] - prefix[left - 1];
}

// 如果prefix长度是n+1：
sumRange(left, right) {
  return prefix[right + 1] - prefix[left];  // 统一公式
}
```

**好处2**：避免索引越界

```
left = 0 时：
prefix[left - 1] = prefix[-1]  // 越界！
prefix[left] = prefix[0] = 0   // 安全
```

---

## 复杂度分析

**初始化**：O(n)
- 遍历一次构建前缀和

**每次查询**：O(1)
- 只需一次减法

**空间复杂度**：O(n)
- 存储前缀和数组

### 与暴力方法对比

| 方法 | 初始化 | 单次查询 | q次查询 |
|-----|--------|---------|---------|
| 暴力 | O(1) | O(n) | O(q×n) |
| 前缀和 | O(n) | O(1) | O(n+q) |

当查询次数q较大时，前缀和优势明显。

---

## 边界情况

```typescript
// 单元素数组
nums = [5]
sumRange(0, 0) = prefix[1] - prefix[0] = 5 - 0 = 5 ✓

// 全负数
nums = [-1, -2, -3]
prefix = [0, -1, -3, -6]
sumRange(0, 2) = -6 - 0 = -6 ✓

// 单点查询（left === right）
nums = [1, 2, 3]
sumRange(1, 1) = prefix[2] - prefix[1] = 3 - 1 = 2 ✓
```

---

## 常见错误

**错误1：前缀和索引偏移**
```typescript
// 错误：边界处理不当
return prefix[right] - prefix[left - 1];  // ❌ left=0时越界

// 正确
return prefix[right + 1] - prefix[left];  // ✅
```

**错误2：构建时忘记偏移**
```typescript
// 错误
this.prefix[i] = this.prefix[i - 1] + nums[i];  // ❌ i=0时越界

// 正确
this.prefix[i + 1] = this.prefix[i] + nums[i];  // ✅
```

**错误3：初始值设置错误**
```typescript
// 错误
this.prefix = new Array(n);  // ❌ 长度不对

// 正确
this.prefix = new Array(n + 1).fill(0);  // ✅ 长度n+1，初始化为0
```

---

## 相关题目

| 题目 | 难度 | 说明 |
|-----|------|------|
| [304. 二维区域和检索](https://leetcode.com/problems/range-sum-query-2d-immutable/) | 中等 | 二维前缀和 |
| [307. 区域和检索（可变）](https://leetcode.com/problems/range-sum-query-mutable/) | 中等 | 需要线段树/树状数组 |
| [560. 和为K的子数组](https://leetcode.com/problems/subarray-sum-equals-k/) | 中等 | 前缀和+哈希 |

---

## 扩展：二维前缀和预览

```typescript
class NumMatrix {
  private prefix: number[][];
  
  constructor(matrix: number[][]) {
    const m = matrix.length, n = matrix[0].length;
    this.prefix = Array.from(
      { length: m + 1 },
      () => Array(n + 1).fill(0)
    );
    
    for (let i = 0; i < m; i++) {
      for (let j = 0; j < n; j++) {
        this.prefix[i + 1][j + 1] = matrix[i][j] +
          this.prefix[i][j + 1] + this.prefix[i + 1][j] -
          this.prefix[i][j];
      }
    }
  }
  
  sumRegion(r1: number, c1: number, r2: number, c2: number): number {
    return this.prefix[r2 + 1][c2 + 1] -
      this.prefix[r1][c2 + 1] - this.prefix[r2 + 1][c1] +
      this.prefix[r1][c1];
  }
}
```

---

## 总结

区域和检索的核心要点：

1. **前缀和定义**：prefix[i] = nums[0..i-1]的和
2. **区间和公式**：sum[left, right] = prefix[right+1] - prefix[left]
3. **长度n+1**：避免边界特殊处理
4. **时间优化**：O(n)预处理后，每次查询O(1)

前缀和是区间问题的基础工具，掌握这道入门题后，可以解决大量区间相关问题。

## 为什么 prefix 多一个元素？

```
// 如果 prefix[i] = nums[0..i] 的和
sumRange(0, 2) 需要特判

// 如果 prefix[i] = nums[0..i-1] 的和（前 i 个元素）
prefix[0] = 0
sumRange(0, 2) = prefix[3] - prefix[0]  // 统一公式
```

多一个元素可以避免边界特判。
