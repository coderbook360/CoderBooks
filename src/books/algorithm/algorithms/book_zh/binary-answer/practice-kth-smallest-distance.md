# 实战：找出第 K 小的距离对

> LeetCode 719. 找出第 K 小的距离对 | 难度：困难

二分答案 + 双指针的高级应用。这道题展示了如何将"第 K 小"问题转化为二分答案问题。

---

## 题目描述

给定一个整数数组 `nums` 和一个整数 `k`，返回数组中所有数对的距离中第 k 小的距离。

两个整数 a 和 b 的距离定义为 `|a - b|`。

**示例**：
```
输入：nums = [1, 3, 1], k = 1
输出：0
解释：
  所有距离对 = [(1,3), (1,1), (3,1)]
  距离 = [2, 0, 2]
  排序后 = [0, 2, 2]
  第 1 小的距离是 0

输入：nums = [1, 1, 1], k = 2
输出：0
解释：所有距离都是 0

输入：nums = [1, 6, 1], k = 3
输出：5
```

---

## 思路分析

### 暴力思路

枚举所有 n(n-1)/2 个数对，计算距离，排序取第 k 个。

```typescript
// 暴力解法 - 会超时
function smallestDistancePair(nums: number[], k: number): number {
  const distances: number[] = [];
  for (let i = 0; i < nums.length; i++) {
    for (let j = i + 1; j < nums.length; j++) {
      distances.push(Math.abs(nums[i] - nums[j]));
    }
  }
  distances.sort((a, b) => a - b);
  return distances[k - 1];
}
```

时间复杂度 O(n² log n²)，会超时。

### 二分答案思路

**关键洞察**："第 k 小"问题可以转化为二分答案。

对于某个距离值 d：
- 如果距离 <= d 的数对个数 >= k，说明第 k 小的距离 <= d
- 如果距离 <= d 的数对个数 < k，说明第 k 小的距离 > d

**答案空间**：[0, max - min]

**单调性**：距离 d 越大，距离 <= d 的对数越多

**check(d)**：统计距离 <= d 的对数，判断是否 >= k

---

## 代码实现

```typescript
function smallestDistancePair(nums: number[], k: number): number {
  // 排序是双指针统计的前提
  nums.sort((a, b) => a - b);
  const n = nums.length;
  
  let left = 0;                     // 最小距离
  let right = nums[n - 1] - nums[0]; // 最大距离
  
  while (left < right) {
    const mid = left + Math.floor((right - left) / 2);
    
    if (countPairs(nums, mid) >= k) {
      right = mid;  // 对数够了，尝试更小的距离
    } else {
      left = mid + 1;  // 对数不够，需要更大的距离
    }
  }
  
  return left;
}

// 统计距离 <= maxDist 的数对个数
function countPairs(nums: number[], maxDist: number): number {
  let count = 0;
  let j = 0;
  
  for (let i = 0; i < nums.length; i++) {
    // 双指针：找最小的 j 使得 nums[i] - nums[j] <= maxDist
    while (nums[i] - nums[j] > maxDist) {
      j++;
    }
    // [j, i-1] 范围内的元素都与 i 形成满足条件的对
    count += i - j;
  }
  
  return count;
}
```

---

## 双指针统计的原理

排序后，对于固定的 i，满足 `nums[i] - nums[j] <= maxDist` 的 j 形成一个连续区间 [j, i-1]。

```
排序后: [1, 1, 3], maxDist = 2

i=0: 没有比 i 更小的索引，count += 0
i=1: nums[1] - nums[0] = 0 <= 2, count += 1
i=2: nums[2] - nums[0] = 2 <= 2, nums[2] - nums[1] = 2 <= 2
     count += 2

总计 count = 3

验证：距离 [0, 2, 2]，<= 2 的有 3 对 ✓
```

**为什么 j 不需要重置？**

当 i 增加时，`nums[i]` 变大或不变，而 `nums[j]` 不变，所以 `nums[i] - nums[j]` 变大或不变。

这意味着如果 `nums[i] - nums[j] > maxDist`，那么 `nums[i+1] - nums[j]` 也一定 > maxDist。

所以 j 只需要向右移动，不需要重置。

---

## 执行过程可视化

```
nums = [1, 3, 1], k = 1
排序后: [1, 1, 3]

left = 0, right = 3-1 = 2

第1轮：mid = 1
       countPairs(nums, 1):
         i=0: j=0, count=0
         i=1: nums[1]-nums[0]=0<=1, j=0, count+=1
         i=2: nums[2]-nums[0]=2>1, j++
              nums[2]-nums[1]=2>1, j++
              j=2, count+=0
         return 1
       
       1 >= 1 ✓，right = 1

第2轮：mid = 0
       countPairs(nums, 0):
         i=0: j=0, count=0
         i=1: nums[1]-nums[0]=0<=0, j=0, count+=1
         i=2: nums[2]-nums[0]=2>0, j++
              nums[2]-nums[1]=2>0, j++
              j=2, count+=0
         return 1
       
       1 >= 1 ✓，right = 0

left === right === 0，返回 0 ✓
```

---

## 为什么结果一定存在

二分答案最终找到的是"第一个使得 countPairs >= k 的距离"。

**这个距离一定是某个实际存在的数对距离吗？**

是的。因为：
1. 如果 countPairs(d) >= k 而 countPairs(d-1) < k
2. 说明恰好有一些数对的距离等于 d
3. 这个 d 就是某个实际存在的距离

---

## 复杂度分析

**时间复杂度**：O(n log n + n log D)
- 排序：O(n log n)
- 二分：O(log D) 次，D = max - min
- 每次 countPairs：O(n)
- 总计：O(n log n + n log D)

**空间复杂度**：O(1)（不计排序所需空间）

---

## 常见错误

**错误1：忘记排序**
```typescript
// 双指针统计需要数组有序
// 忘记 nums.sort((a, b) => a - b)  ❌
```

**错误2：countPairs 中 j 初始化位置**
```typescript
// 错误：j 放在外面，不需要每次重置
for (let i = 0; i < nums.length; i++) {
  let j = 0;  // ❌ 不应该在循环内重置
  // ...
}

// 正确：j 在循环外
let j = 0;  // ✅
for (let i = 0; i < nums.length; i++) {
  // ...
}
```

**错误3：边界计算**
```typescript
// 对数是 i - j，不是 i - j + 1
count += i - j;  // ✅ 因为 j 到 i-1 有 i-j 个元素
```

---

## 相关题目

| 题目 | 难度 | 说明 |
|-----|------|------|
| [378. 有序矩阵中第 K 小的元素](https://leetcode.com/problems/kth-smallest-element-in-a-sorted-matrix/) | 中等 | 二分+计数 |
| [668. 乘法表中第 k 小的数](https://leetcode.com/problems/kth-smallest-number-in-multiplication-table/) | 困难 | 二分+计数 |
| [786. 第 K 个最小的素数分数](https://leetcode.com/problems/k-th-smallest-prime-fraction/) | 中等 | 二分+双指针 |

---

## 总结

找出第 K 小的距离对核心要点：

1. **问题转化**："第 K 小"→ 二分答案 + 计数
2. **排序**：为双指针统计创造条件
3. **双指针**：O(n) 统计距离 <= d 的对数
4. **j 不重置**：利用单调性优化
5. **结果保证**：二分出的值一定是实际存在的距离

---

## 要点

1. 先排序数组
2. 二分距离值
3. 用双指针高效统计满足条件的对数
