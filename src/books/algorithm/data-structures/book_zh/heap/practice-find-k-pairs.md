# 实战：查找和最小的 K 对数字

给定两个有序数组，找出和最小的 K 对数字组合。这是多路归并的变体问题。

---

## 问题描述

**LeetCode 373. Find K Pairs with Smallest Sums**

给定两个以升序排列的整数数组 nums1 和 nums2，以及一个整数 k。定义一对值 (u, v)，其中第一个元素来自 nums1，第二个元素来自 nums2。

找到和最小的 k 个数对并返回。

**示例 1**：
```
输入：nums1 = [1,7,11], nums2 = [2,4,6], k = 3
输出：[[1,2],[1,4],[1,6]]
解释：
所有可能的配对：[1,2],[1,4],[1,6],[7,2],[7,4],[7,6],[11,2],[11,4],[11,6]
最小的 3 对是：[1,2],[1,4],[1,6]
```

**示例 2**：
```
输入：nums1 = [1,1,2], nums2 = [1,2,3], k = 2
输出：[[1,1],[1,1]]
```

**示例 3**：
```
输入：nums1 = [1,2], nums2 = [3], k = 3
输出：[[1,3],[2,3]]
解释：只有 2 对可能，全部返回
```

**约束条件**：
- `1 <= nums1.length, nums2.length <= 10^5`
- `-10^9 <= nums1[i], nums2[i] <= 10^9`
- nums1 和 nums2 均按升序排列
- `1 <= k <= 10^4`
- `k <= nums1.length * nums2.length`

---

## 问题分析

### 暴力方法

枚举所有 m × n 对，排序后取前 k 个。

- 时间：O(mn log(mn))
- 当 m、n 很大时，无法接受

### 利用有序性

两个数组都是**升序**的，这意味着：

```
nums1 = [1, 7, 11]
nums2 = [2, 4, 6]

配对矩阵（值为和）：
        2    4    6
    ┌─────────────────
  1 │  3    5    7    ← 这一行是有序的
  7 │  9   11   13
 11 │ 13   15   17
    ↓
    这一列也是有序的
```

每一行和每一列都是有序的！这就变成了**从多个有序列表中找第 k 小**的问题。

### 核心思路

把问题转化为"合并 K 个有序链表"的变体：

- 把每一行看作一个有序链表：`[1+2, 1+4, 1+6]`, `[7+2, 7+4, 7+6]`, ...
- 初始时，每行的第一个元素（列 j=0）是该行最小的
- 用最小堆找当前最小的和

---

## 解法

```javascript
function kSmallestPairs(nums1, nums2, k) {
  if (!nums1.length || !nums2.length) return [];
  
  // 最小堆，存储 [sum, i, j]
  // i 是 nums1 的索引，j 是 nums2 的索引
  const heap = new MinHeap((a, b) => a[0] - b[0]);
  const result = [];
  
  // 初始化：把 (nums1[0], nums2[j]) 的所有配对加入堆
  // 但最多只需要 min(k, nums2.length) 个
  for (let j = 0; j < Math.min(k, nums2.length); j++) {
    heap.insert([nums1[0] + nums2[j], 0, j]);
  }
  
  // 取 k 个最小的
  while (k > 0 && heap.size() > 0) {
    const [sum, i, j] = heap.extract();
    result.push([nums1[i], nums2[j]]);
    k--;
    
    // 把 (i+1, j) 加入堆（同一列的下一行）
    if (i + 1 < nums1.length) {
      heap.insert([nums1[i + 1] + nums2[j], i + 1, j]);
    }
  }
  
  return result;
}
```

---

## 执行过程详解

```
nums1 = [1, 7, 11], nums2 = [2, 4, 6], k = 3

配对矩阵：
       j=0  j=1  j=2
i=0:    3    5    7
i=1:    9   11   13
i=2:   13   15   17

【初始化】
把第一行的元素加入堆：
  heap = [(3,0,0), (5,0,1), (7,0,2)]  // (sum, i, j)

【第 1 轮】
  取出 (3,0,0) → 输出 [1,2]
  加入 (9,1,0)  // i+1=1, j=0
  heap = [(5,0,1), (7,0,2), (9,1,0)]

【第 2 轮】
  取出 (5,0,1) → 输出 [1,4]
  加入 (11,1,1)  // i+1=1, j=1
  heap = [(7,0,2), (9,1,0), (11,1,1)]

【第 3 轮】
  取出 (7,0,2) → 输出 [1,6]
  k=0，结束

输出：[[1,2], [1,4], [1,6]]
```

**可视化**：

```
       j=0  j=1  j=2
i=0:   [3]  [5]  [7]   ← 初始时堆中的元素
i=1:    9   11   13
i=2:   13   15   17

取出 (0,0)=3，加入 (1,0)=9：
       j=0  j=1  j=2
i=0:    ×   [5]  [7]
i=1:   [9]  11   13
i=2:   13   15   17

取出 (0,1)=5，加入 (1,1)=11：
       j=0  j=1  j=2
i=0:    ×    ×   [7]
i=1:   [9] [11]  13
i=2:   13   15   17

取出 (0,2)=7，结束
```

---

## 为什么这样初始化？

**问题**：为什么只初始化第一行？

**回答**：

1. nums1[0] 是 nums1 中最小的
2. 对于任意 j，(0, j) 的和一定 ≤ (i, j) 的和（i > 0）
3. 所以最小的 k 个和的第一个一定来自第一行

**问题**：为什么取出 (i, j) 后只加入 (i+1, j) 而不加入 (i, j+1)？

**回答**：

- (i, j+1) 已经在初始化时加入了（如果 j+1 < k）
- 我们通过"按列初始化 + 按行扩展"来覆盖所有候选
- 每个位置最多被加入一次，避免重复

---

## 复杂度分析

**时间复杂度**：O(k log k)
- 堆的大小最多为 min(k, n)
- 每次操作 O(log k)
- 共 k 次操作

**空间复杂度**：O(k)
- 堆和结果数组各 O(k)

---

## 边界情况

```javascript
// 测试用例
kSmallestPairs([1,2], [3], 3);          // k > 可能的配对数 → [[1,3],[2,3]]
kSmallestPairs([1,1,2], [1,2,3], 2);    // 重复元素 → [[1,1],[1,1]]
kSmallestPairs([], [1,2], 3);           // 空数组 → []
kSmallestPairs([1,2], [], 3);           // 空数组 → []
kSmallestPairs([1], [1], 1);            // 单元素 → [[1,1]]
```

---

## 常见错误

### 1. 初始化过多元素

```javascript
// ❌ 可能错误：把所有 nums2 的元素都加入
for (let j = 0; j < nums2.length; j++) {
  heap.insert([nums1[0] + nums2[j], 0, j]);
}
// 当 nums2 很大而 k 很小时，浪费空间和时间

// ✅ 正确：限制初始化数量
for (let j = 0; j < Math.min(k, nums2.length); j++) {
  heap.insert([nums1[0] + nums2[j], 0, j]);
}
```

### 2. 重复添加元素

```javascript
// ❌ 错误：取出 (i,j) 后加入 (i,j+1) 和 (i+1,j)
// 这会导致某些元素被重复添加

// ✅ 正确：只加入 (i+1, j)
// (i, j+1) 在初始化时已经加入了
```

### 3. 索引越界

```javascript
// ❌ 错误：没有检查边界
heap.insert([nums1[i + 1] + nums2[j], i + 1, j]);

// ✅ 正确：检查边界
if (i + 1 < nums1.length) {
  heap.insert([nums1[i + 1] + nums2[j], i + 1, j]);
}
```

---

## 另一种初始化方式

也可以按"按行初始化 + 按列扩展"：

```javascript
function kSmallestPairs(nums1, nums2, k) {
  if (!nums1.length || !nums2.length) return [];
  
  const heap = new MinHeap((a, b) => a[0] - b[0]);
  const result = [];
  
  // 初始化：第一列
  for (let i = 0; i < Math.min(k, nums1.length); i++) {
    heap.insert([nums1[i] + nums2[0], i, 0]);
  }
  
  while (k > 0 && heap.size() > 0) {
    const [sum, i, j] = heap.extract();
    result.push([nums1[i], nums2[j]]);
    k--;
    
    // 扩展到下一列
    if (j + 1 < nums2.length) {
      heap.insert([nums1[i] + nums2[j + 1], i, j + 1]);
    }
  }
  
  return result;
}
```

两种方式等价，选择哪种取决于 nums1 和 nums2 的长度。

---

## 相关题目

| 题目 | 难度 | 关联点 |
|------|------|--------|
| [23. 合并K个升序链表](https://leetcode.cn/problems/merge-k-sorted-lists/) | 困难 | 多路归并 |
| [378. 有序矩阵中第K小的元素](https://leetcode.cn/problems/kth-smallest-element-in-a-sorted-matrix/) | 中等 | 矩阵中找第 K 小 |
| [719. 找出第 K 小的数对距离](https://leetcode.cn/problems/find-k-th-smallest-pair-distance/) | 困难 | 二分 + 计数 |

---

## 小结

本题展示了**利用有序性优化搜索**的技巧：

1. **问题转化**：把 m×n 的配对空间看作 m 个有序列表
2. **多路归并**：用最小堆合并多个有序列表
3. **延迟扩展**：每次只扩展一个方向，避免重复

**关键技巧**：
- 堆中存储 `[值, 位置信息]`，方便后续扩展
- 初始化时控制数量，避免不必要的计算
- 利用矩阵的有序性，只在一个方向扩展

这种"多路归并"的思想是处理有序数据的通用技巧，可以应用到很多场景。
