# 前缀和优化

前缀和是优化区间和计算的经典技巧，可以将 O(n) 的区间求和降到 O(1)。

## 基本原理

### 一维前缀和

```typescript
// 构建前缀和数组
const prefix = [0];
for (let i = 0; i < arr.length; i++) {
  prefix.push(prefix[i] + arr[i]);
}

// O(1) 查询区间 [l, r] 的和
function rangeSum(l: number, r: number): number {
  return prefix[r + 1] - prefix[l];
}
```

### 二维前缀和

```typescript
// 构建二维前缀和
const prefix = Array.from(
  { length: m + 1 },
  () => Array(n + 1).fill(0)
);

for (let i = 0; i < m; i++) {
  for (let j = 0; j < n; j++) {
    prefix[i + 1][j + 1] = matrix[i][j]
      + prefix[i][j + 1]
      + prefix[i + 1][j]
      - prefix[i][j];
  }
}

// O(1) 查询子矩阵 [(r1,c1), (r2,c2)] 的和
function rangeSum(r1: number, c1: number, r2: number, c2: number): number {
  return prefix[r2 + 1][c2 + 1]
    - prefix[r1][c2 + 1]
    - prefix[r2 + 1][c1]
    + prefix[r1][c1];
}
```

## DP 优化应用

### 问题：最大子数组和

朴素做法：枚举所有子数组，O(n²)。

前缀和优化：最大子数组和 = max{prefix[i] - min{prefix[j] for j < i}}

```typescript
function maxSubArray(nums: number[]): number {
  let maxSum = -Infinity;
  let prefixSum = 0;
  let minPrefix = 0;  // 前面的最小前缀和
  
  for (let i = 0; i < nums.length; i++) {
    prefixSum += nums[i];
    maxSum = Math.max(maxSum, prefixSum - minPrefix);
    minPrefix = Math.min(minPrefix, prefixSum);
  }
  
  return maxSum;
}
```

### 问题：和为 K 的子数组

**LeetCode 560. Subarray Sum Equals K**

用哈希表存储前缀和出现的次数。

```typescript
function subarraySum(nums: number[], k: number): number {
  const prefixCount = new Map<number, number>();
  prefixCount.set(0, 1);  // 空前缀
  
  let count = 0;
  let prefixSum = 0;
  
  for (const num of nums) {
    prefixSum += num;
    
    // 寻找 prefixSum - k 的出现次数
    if (prefixCount.has(prefixSum - k)) {
      count += prefixCount.get(prefixSum - k)!;
    }
    
    // 更新当前前缀和计数
    prefixCount.set(prefixSum, (prefixCount.get(prefixSum) || 0) + 1);
  }
  
  return count;
}
```

### 问题：区间和的个数

**LeetCode 327. Count of Range Sum**

统计和在 [lower, upper] 范围内的区间数。

```typescript
function countRangeSum(nums: number[], lower: number, upper: number): number {
  const prefix: number[] = [0];
  for (const num of nums) {
    prefix.push(prefix.at(-1)! + num);
  }
  
  // 归并排序 + 统计
  function mergeCount(arr: number[], left: number, right: number): number {
    if (left >= right) return 0;
    
    const mid = Math.floor((left + right) / 2);
    let count = mergeCount(arr, left, mid) + mergeCount(arr, mid + 1, right);
    
    // 统计跨越 mid 的有效区间
    let lo = mid + 1, hi = mid + 1;
    for (let i = left; i <= mid; i++) {
      while (lo <= right && arr[lo] - arr[i] < lower) lo++;
      while (hi <= right && arr[hi] - arr[i] <= upper) hi++;
      count += hi - lo;
    }
    
    // 合并
    const merged: number[] = [];
    let i = left, j = mid + 1;
    while (i <= mid && j <= right) {
      if (arr[i] <= arr[j]) merged.push(arr[i++]);
      else merged.push(arr[j++]);
    }
    while (i <= mid) merged.push(arr[i++]);
    while (j <= right) merged.push(arr[j++]);
    
    for (let k = 0; k < merged.length; k++) {
      arr[left + k] = merged[k];
    }
    
    return count;
  }
  
  return mergeCount(prefix, 0, prefix.length - 1);
}
```

### 问题：最大平均子数组

**LeetCode 644. Maximum Average Subarray II**

找长度至少为 k 的子数组，使其平均值最大。

思路：二分答案 + 前缀和判断。

```typescript
function findMaxAverage(nums: number[], k: number): number {
  let lo = Math.min(...nums);
  let hi = Math.max(...nums);
  
  // 二分查找最大平均值
  while (hi - lo > 1e-5) {
    const mid = (lo + hi) / 2;
    if (canAchieve(nums, k, mid)) {
      lo = mid;
    } else {
      hi = mid;
    }
  }
  
  return lo;
}

function canAchieve(nums: number[], k: number, avg: number): boolean {
  // 判断是否存在长度 >= k 的子数组，平均值 >= avg
  // 等价于：nums[i] - avg 的和 >= 0
  const arr = nums.map(x => x - avg);
  
  let prefixSum = 0;
  let minPrefixSum = 0;
  
  for (let i = 0; i < arr.length; i++) {
    prefixSum += arr[i];
    
    if (i >= k - 1) {
      // 检查从某个 j <= i-k+1 到 i 的子数组和
      if (prefixSum >= minPrefixSum) {
        return true;
      }
      // 更新 minPrefixSum（滑动窗口的左边界）
      minPrefixSum = Math.min(minPrefixSum, prefixSum - arr[i] - ... 
        // 这里需要更精确的处理
      );
    }
  }
  
  return false;
}
```

正确实现：

```typescript
function canAchieve(nums: number[], k: number, avg: number): boolean {
  const arr = nums.map(x => x - avg);
  
  let sum = 0;
  for (let i = 0; i < k; i++) {
    sum += arr[i];
  }
  if (sum >= 0) return true;
  
  let prevSum = 0;
  let minPrevSum = 0;
  
  for (let i = k; i < arr.length; i++) {
    sum += arr[i];
    prevSum += arr[i - k];
    minPrevSum = Math.min(minPrevSum, prevSum);
    
    if (sum - minPrevSum >= 0) {
      return true;
    }
  }
  
  return false;
}
```

## 差分数组

差分是前缀和的逆运算，用于快速进行区间修改。

```typescript
// 差分数组
const diff = Array(n + 1).fill(0);

// 区间 [l, r] 加 val
function rangeAdd(l: number, r: number, val: number): void {
  diff[l] += val;
  diff[r + 1] -= val;
}

// 还原原数组
function restore(): number[] {
  const result: number[] = [];
  let sum = 0;
  for (let i = 0; i < n; i++) {
    sum += diff[i];
    result.push(sum);
  }
  return result;
}
```

### 应用：航班预订统计

**LeetCode 1109. Corporate Flight Bookings**

```typescript
function corpFlightBookings(bookings: number[][], n: number): number[] {
  const diff = Array(n + 1).fill(0);
  
  for (const [first, last, seats] of bookings) {
    diff[first - 1] += seats;
    diff[last] -= seats;
  }
  
  const answer: number[] = [];
  let sum = 0;
  for (let i = 0; i < n; i++) {
    sum += diff[i];
    answer.push(sum);
  }
  
  return answer;
}
```

## 前缀和与哈希表结合

### 模式：查找满足条件的区间

```typescript
// 和为 k 的子数组数量
const prefixCount = new Map<number, number>();
prefixCount.set(0, 1);

for (const num of nums) {
  prefix += num;
  count += prefixCount.get(prefix - k) || 0;
  prefixCount.set(prefix, (prefixCount.get(prefix) || 0) + 1);
}
```

### 模式：可被 k 整除的子数组

```typescript
// 和可被 k 整除的子数组数量
const modCount = new Map<number, number>();
modCount.set(0, 1);

let prefix = 0;
let count = 0;

for (const num of nums) {
  prefix = ((prefix + num) % k + k) % k;  // 处理负数
  count += modCount.get(prefix) || 0;
  modCount.set(prefix, (modCount.get(prefix) || 0) + 1);
}
```

## 相关题目

| 题目 | 难度 | 说明 |
|------|------|------|
| [303. 区域和检索](https://leetcode.cn/problems/range-sum-query-immutable/) | 简单 | 一维前缀和 |
| [304. 二维区域和检索](https://leetcode.cn/problems/range-sum-query-2d-immutable/) | 中等 | 二维前缀和 |
| [560. 和为 K 的子数组](https://leetcode.cn/problems/subarray-sum-equals-k/) | 中等 | 前缀和 + 哈希 |
| [327. 区间和的个数](https://leetcode.cn/problems/count-of-range-sum/) | 困难 | 归并排序 |

## 总结

前缀和优化的核心：

1. **预处理**：O(n) 构建前缀和数组
2. **O(1) 查询**：区间和 = prefix[r+1] - prefix[l]
3. **结合哈希**：统计满足条件的区间
4. **差分**：前缀和的逆运算，快速区间修改

适用场景：
- 多次查询区间和
- 统计满足某条件的子数组
- 区间修改问题
