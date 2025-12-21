# 实战：前 K 个高频元素

给定一个数组，返回出现频率最高的 k 个元素。这道题考查了频率统计与 Top K 问题的结合。

---

## 问题描述

**LeetCode 347. Top K Frequent Elements**

给你一个整数数组 nums 和一个整数 k，请你返回其中出现频率前 k 高的元素。答案可以按任意顺序返回。

**示例 1**：
```
输入：nums = [1,1,1,2,2,3], k = 2
输出：[1,2]
```

**示例 2**：
```
输入：nums = [1], k = 1
输出：[1]
```

**约束条件**：
- `1 <= nums.length <= 10^5`
- `-10^4 <= nums[i] <= 10^4`
- `k` 在 `[1, 数组中不相同的元素的个数]` 范围内
- 题目保证答案唯一

---

## 问题分析

这道题的核心在于：**先统计频率，再找 Top K**。

两个子问题：
1. 如何统计每个元素的出现频率？→ 哈希表
2. 如何找出频率最高的 k 个元素？→ 排序 / 堆 / 桶排序

---

## 解法一：排序

统计频率后按频率排序：

```javascript
function topKFrequent(nums, k) {
  // 第一步：统计每个元素的频率
  const freq = new Map();
  for (const num of nums) {
    freq.set(num, (freq.get(num) || 0) + 1);
  }
  
  // 第二步：按频率降序排序，取前 k 个
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, k)
    .map(x => x[0]);
}
```

**复杂度分析**：
- 时间：O(n log n)，排序的开销
- 空间：O(n)，存储频率表

---

## 解法二：最小堆

维护大小为 k 的最小堆。为什么用最小堆而不是最大堆？

**关键洞察**：我们要找的是最高的 k 个频率，用最小堆可以淘汰掉频率低的元素。堆中始终保持频率最高的 k 个元素。

```javascript
function topKFrequent(nums, k) {
  // 第一步：统计频率
  const freq = new Map();
  for (const num of nums) {
    freq.set(num, (freq.get(num) || 0) + 1);
  }
  
  // 第二步：用最小堆找 Top K
  // 堆中存储 [元素值, 频率]，按频率比较
  const heap = new MinHeap((a, b) => a[1] - b[1]);
  
  for (const [num, count] of freq) {
    heap.insert([num, count]);
    // 堆大小超过 k 时，弹出频率最小的
    if (heap.size() > k) {
      heap.extract();
    }
  }
  
  // 堆中剩下的就是 Top K
  return heap.heap.map(x => x[0]);
}
```

**执行过程示例**：

```
nums = [1,1,1,2,2,3], k = 2
频率：{1: 3, 2: 2, 3: 1}

遍历频率表：
  插入 [1, 3]，堆 = [[1, 3]]
  插入 [2, 2]，堆 = [[2, 2], [1, 3]]
  插入 [3, 1]，堆大小 > k，弹出最小的 [3, 1]
  堆 = [[2, 2], [1, 3]]

结果：[2, 1] 或 [1, 2]
```

**复杂度分析**：
- 时间：O(n log k)，每个唯一元素最多入堆出堆一次
- 空间：O(n)，频率表 O(n) + 堆 O(k)

---

## 解法三：桶排序

频率范围有限（1 到 n），可以用桶排序达到 O(n)：

```javascript
function topKFrequent(nums, k) {
  // 第一步：统计频率
  const freq = new Map();
  for (const num of nums) {
    freq.set(num, (freq.get(num) || 0) + 1);
  }
  
  // 第二步：创建桶，索引是频率
  // 频率最大为 nums.length（所有元素相同）
  const buckets = Array.from({ length: nums.length + 1 }, () => []);
  
  for (const [num, count] of freq) {
    buckets[count].push(num);
  }
  
  // 第三步：从高频到低频收集结果
  const result = [];
  for (let i = buckets.length - 1; i >= 0 && result.length < k; i--) {
    result.push(...buckets[i]);
  }
  
  return result.slice(0, k);
}
```

**桶排序可视化**：

```
nums = [1,1,1,2,2,3], k = 2
频率：{1: 3, 2: 2, 3: 1}

桶数组（索引 = 频率）：
index:   0    1    2    3    4    5    6
value:  []   [3]  [2]  [1]   []   []   []
             ↑    ↑    ↑
            频率1 频率2 频率3

从后往前收集：index=3 → [1], index=2 → [1, 2]
结果：[1, 2]
```

**复杂度分析**：
- 时间：O(n)
- 空间：O(n)

---

## 方法对比与选择

| 方法 | 时间 | 空间 | 适用场景 |
|------|------|------|----------|
| 排序 | O(n log n) | O(n) | 代码简洁，快速实现 |
| 最小堆 | O(n log k) | O(n) | k 远小于 n |
| 桶排序 | O(n) | O(n) | 追求最优时间复杂度 |

**选择建议**：
- **面试首选**：最小堆，展示对堆的理解
- **工程首选**：排序，代码简洁易维护
- **极致性能**：桶排序，但需要额外解释思路

---

## 边界情况

```javascript
// 测试用例
topKFrequent([1], 1);              // 单元素 → [1]
topKFrequent([1,1,1,1], 1);        // 所有元素相同 → [1]
topKFrequent([1,2], 2);            // k 等于不同元素个数 → [1,2]
topKFrequent([-1,-1,2,2,3], 2);    // 含负数 → [-1,2]
```

---

## 常见错误

### 1. 混淆最大堆和最小堆

```javascript
// ❌ 错误：用最大堆找 Top K
const heap = new MaxHeap((a, b) => a[1] - b[1]);
// 最大堆会保留最小的 k 个，与目标相反

// ✅ 正确：用最小堆，淘汰小的，留下大的
const heap = new MinHeap((a, b) => a[1] - b[1]);
```

### 2. 忘记堆中存储的是 [元素, 频率] 对

```javascript
// ❌ 错误：只存频率
heap.insert(count);
// 无法知道是哪个元素的频率

// ✅ 正确：存储元素和频率的配对
heap.insert([num, count]);
```

### 3. 桶排序时索引越界

```javascript
// ❌ 可能错误：桶大小不够
const buckets = Array(nums.length).fill([]);

// ✅ 正确：桶大小为 n+1，因为频率范围是 1~n
const buckets = Array.from({ length: nums.length + 1 }, () => []);
```

---

## 相关题目

| 题目 | 难度 | 关联点 |
|------|------|--------|
| [692. 前K个高频单词](https://leetcode.cn/problems/top-k-frequent-words/) | 中等 | 字符串频率 + 字典序 |
| [451. 根据字符出现频率排序](https://leetcode.cn/problems/sort-characters-by-frequency/) | 中等 | 频率排序变体 |
| [215. 数组中的第K个最大元素](https://leetcode.cn/problems/kth-largest-element-in-an-array/) | 中等 | 经典 Top K |

---

## 小结

本题的关键在于理解 Top K 问题的多种解法：

1. **排序**：最直观，但时间复杂度较高
2. **最小堆**：维护 k 个最大元素的经典技巧
3. **桶排序**：利用频率范围有限的特性，达到线性时间

掌握这三种方法后，可以根据不同场景灵活选择：
- 面试时用堆展示数据结构功底
- 实际工程中用排序保证代码可读性
- 极端性能要求时用桶排序
