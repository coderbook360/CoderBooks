# 二分优化：最长递增子序列

二分优化可以将某些 O(n²) 的 DP 优化到 O(n log n)。最经典的例子是最长递增子序列（LIS）。

## LIS 问题回顾

**LeetCode 300. Longest Increasing Subsequence**

给你一个整数数组 nums，找到其中最长严格递增子序列的长度。

### 朴素 DP：O(n²)

```typescript
function lengthOfLIS(nums: number[]): number {
  const n = nums.length;
  const dp = Array(n).fill(1);
  
  for (let i = 1; i < n; i++) {
    for (let j = 0; j < i; j++) {
      if (nums[j] < nums[i]) {
        dp[i] = Math.max(dp[i], dp[j] + 1);
      }
    }
  }
  
  return Math.max(...dp);
}
```

问题：对于每个位置 i，都要遍历前面所有位置。

## 贪心 + 二分优化：O(n log n)

### 核心思想

维护一个数组 `tails`：`tails[k]` 表示长度为 k+1 的递增子序列的最小末尾元素。

关键性质：`tails` 是严格递增的。

### 算法流程

```typescript
function lengthOfLIS(nums: number[]): number {
  const tails: number[] = [];
  
  for (const num of nums) {
    // 在 tails 中找第一个 >= num 的位置
    let left = 0, right = tails.length;
    while (left < right) {
      const mid = Math.floor((left + right) / 2);
      if (tails[mid] < num) {
        left = mid + 1;
      } else {
        right = mid;
      }
    }
    
    // 更新或扩展
    if (left === tails.length) {
      tails.push(num);  // 扩展
    } else {
      tails[left] = num;  // 更新
    }
  }
  
  return tails.length;
}
```

### 为什么正确？

1. **扩展情况**：num > tails 中所有元素，可以接在任何 LIS 后面
2. **更新情况**：num 替换第一个 >= num 的元素，使得相同长度的 LIS 有更小的末尾

例如：`[10, 9, 2, 5, 3, 7, 101, 18]`

```
num=10: tails=[10]
num=9:  tails=[9]       (9 替换 10，长度1的LIS末尾更小)
num=2:  tails=[2]       (2 替换 9)
num=5:  tails=[2,5]     (扩展)
num=3:  tails=[2,3]     (3 替换 5，长度2的LIS末尾更小)
num=7:  tails=[2,3,7]   (扩展)
num=101:tails=[2,3,7,101] (扩展)
num=18: tails=[2,3,7,18]  (18 替换 101)

LIS 长度 = 4
```

### 复杂度分析

- **时间**：O(n log n)
- **空间**：O(n)

## 重要变体

### 非严格递增（允许相等）

找第一个 > num 的位置：

```typescript
function lengthOfLIS_nonStrict(nums: number[]): number {
  const tails: number[] = [];
  
  for (const num of nums) {
    let left = 0, right = tails.length;
    while (left < right) {
      const mid = Math.floor((left + right) / 2);
      if (tails[mid] <= num) {  // 改为 <=
        left = mid + 1;
      } else {
        right = mid;
      }
    }
    
    if (left === tails.length) {
      tails.push(num);
    } else {
      tails[left] = num;
    }
  }
  
  return tails.length;
}
```

### 最长递减子序列

反转数组或反转比较：

```typescript
function lengthOfLDS(nums: number[]): number {
  return lengthOfLIS(nums.reverse());
}
```

### 返回具体的 LIS

需要额外记录每个元素的前驱：

```typescript
function findLIS(nums: number[]): number[] {
  const n = nums.length;
  const tails: number[] = [];
  const indices: number[] = [];  // indices[i] = tails[i] 对应的下标
  const parent: number[] = Array(n).fill(-1);
  
  for (let i = 0; i < n; i++) {
    let left = 0, right = tails.length;
    while (left < right) {
      const mid = Math.floor((left + right) / 2);
      if (tails[mid] < nums[i]) {
        left = mid + 1;
      } else {
        right = mid;
      }
    }
    
    if (left > 0) {
      parent[i] = indices[left - 1];
    }
    
    if (left === tails.length) {
      tails.push(nums[i]);
      indices.push(i);
    } else {
      tails[left] = nums[i];
      indices[left] = i;
    }
  }
  
  // 回溯构造 LIS
  const lis: number[] = [];
  let idx = indices[indices.length - 1];
  while (idx !== -1) {
    lis.push(nums[idx]);
    idx = parent[idx];
  }
  
  return lis.reverse();
}
```

## 相关问题

### 俄罗斯套娃信封

**LeetCode 354. Russian Doll Envelopes**

先按宽度升序、高度降序排序，然后对高度求 LIS。

```typescript
function maxEnvelopes(envelopes: number[][]): number {
  // 按宽度升序，宽度相同时按高度降序
  envelopes.sort((a, b) => {
    if (a[0] !== b[0]) return a[0] - b[0];
    return b[1] - a[1];
  });
  
  // 对高度求 LIS
  const heights = envelopes.map(e => e[1]);
  return lengthOfLIS(heights);
}
```

**为什么高度降序？**

防止相同宽度的信封互相嵌套。例如 [3,3] 和 [3,4]，宽度相同不能嵌套。降序后 LIS 不会同时选中它们。

### 最少导弹拦截系统

经典问题：最少需要多少个递减序列覆盖所有元素。

根据 Dilworth 定理：最少递减序列数 = 最长递增子序列长度。

```typescript
function minInterceptors(heights: number[]): number {
  return lengthOfLIS(heights);
}
```

### 最长数对链

**LeetCode 646. Maximum Length of Pair Chain**

```typescript
function findLongestChain(pairs: number[][]): number {
  // 按第二个元素排序
  pairs.sort((a, b) => a[1] - b[1]);
  
  let chains = 0;
  let end = -Infinity;
  
  for (const [start, finish] of pairs) {
    if (start > end) {
      chains++;
      end = finish;
    }
  }
  
  return chains;
}
```

## 二分优化的一般形式

当 DP 转移满足以下条件时，考虑二分优化：

1. **单调性**：决策点的某个属性单调
2. **最值查询**：需要在满足条件的位置中找最值
3. **可维护性**：可以高效维护单调序列

### 模式识别

```typescript
// 原始 O(n²)
for (let i = 0; i < n; i++) {
  for (let j = 0; j < i; j++) {
    if (condition(j, i)) {
      dp[i] = Math.max(dp[i], dp[j] + 1);
    }
  }
}

// 如果 condition 可以用二分加速查找
// 优化为 O(n log n)
```

## 相关题目

| 题目 | 难度 | 说明 |
|------|------|------|
| [300. 最长递增子序列](https://leetcode.cn/problems/longest-increasing-subsequence/) | 中等 | 经典 LIS |
| [354. 俄罗斯套娃信封](https://leetcode.cn/problems/russian-doll-envelopes/) | 困难 | 二维 LIS |
| [646. 最长数对链](https://leetcode.cn/problems/maximum-length-of-pair-chain/) | 中等 | 贪心 |
| [673. 最长递增子序列的个数](https://leetcode.cn/problems/number-of-longest-increasing-subsequence/) | 中等 | LIS 变体 |

## 总结

LIS 二分优化的核心：

1. **贪心思想**：维护各长度 LIS 的最小末尾
2. **二分查找**：快速定位更新/扩展位置
3. **时间复杂度**：从 O(n²) 优化到 O(n log n)

关键洞见：
- `tails` 数组天然有序
- 二分查找定位位置
- 更新使得相同长度的 LIS 末尾更小
- 扩展意味着找到了更长的 LIS
