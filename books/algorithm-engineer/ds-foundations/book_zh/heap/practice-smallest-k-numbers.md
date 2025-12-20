# 实战：最小的 K 个数

从数组中找出最小的 K 个数，这是 Top K 问题的经典变种。与"第 K 大"相对应，本题求"前 K 小"。

---

## 问题描述

**剑指 Offer 40. 最小的 K 个数**

输入整数数组 arr，找出其中最小的 k 个数。答案可以任意顺序返回。

**示例 1**：
```
输入：arr = [3,2,1], k = 2
输出：[1,2] 或 [2,1]
```

**示例 2**：
```
输入：arr = [0,1,2,1], k = 1
输出：[0]
```

**约束条件**：
- `0 <= k <= arr.length <= 10000`
- `0 <= arr[i] <= 10000`

---

## 问题分析

这是"找最小的 K 个数"问题，与"找最大的 K 个数"思路相反：

| 问题 | 堆类型 | 堆顶含义 | 淘汰策略 |
|------|--------|----------|----------|
| 最大的 K 个 | 最小堆 | K 个中最小的 | 淘汰小的 |
| 最小的 K 个 | 最大堆 | K 个中最大的 | 淘汰大的 |

**核心思想**：维护一个大小为 K 的窗口，窗口用堆来快速确定边界值。

---

## 解法一：排序

最直观的方法：排序后取前 k 个。

```javascript
function getLeastNumbers(arr, k) {
  arr.sort((a, b) => a - b);
  return arr.slice(0, k);
}
```

**复杂度分析**：
- 时间：O(n log n)，排序开销
- 空间：O(log n)，排序栈空间

---

## 解法二：最大堆

维护大小为 k 的最大堆：

```javascript
function getLeastNumbers(arr, k) {
  if (k === 0) return [];
  
  const heap = new MaxHeap();
  
  for (const num of arr) {
    heap.insert(num);
    // 堆大小超过 k 时，移除最大的
    if (heap.size() > k) {
      heap.extract();
    }
  }
  
  return heap.heap;
}
```

**为什么用最大堆？**

直觉上可能会想用最小堆，但其实不然：

```
场景：从 [5, 3, 8, 1, 2] 中找最小的 2 个数

用最大堆（正确）：
  insert 5: heap = [5]
  insert 3: heap = [5, 3]
  insert 8: heap = [8, 5, 3], 弹出 8 → [5, 3]
  insert 1: heap = [5, 3, 1], 弹出 5 → [3, 1]
  insert 2: heap = [3, 2, 1], 弹出 3 → [2, 1]
  结果：[2, 1] ✅

用最小堆（错误）：
  最小堆会弹出最小的元素
  如果堆大小超过 k 就弹出，会弹出我们想要的小元素
```

**关键洞察**：
- 堆中始终保持 k 个"候选"最小值
- 每次新元素进来，与堆顶（k 个中最大的）比较
- 如果新元素更小，就淘汰堆顶，保留新元素

**复杂度分析**：
- 时间：O(n log k)
- 空间：O(k)

---

## 解法三：快速选择

利用快速排序的 partition 思想，平均 O(n) 找到第 k 小：

```javascript
function getLeastNumbers(arr, k) {
  if (k === 0) return [];
  if (k >= arr.length) return arr;
  
  quickSelect(arr, 0, arr.length - 1, k);
  return arr.slice(0, k);
}

function quickSelect(arr, left, right, k) {
  if (left >= right) return;
  
  const pivotIndex = partition(arr, left, right);
  
  if (pivotIndex === k) {
    // 正好找到了分界点
    return;
  } else if (pivotIndex < k) {
    // 需要在右边继续找
    quickSelect(arr, pivotIndex + 1, right, k);
  } else {
    // 需要在左边继续找
    quickSelect(arr, left, pivotIndex - 1, k);
  }
}

function partition(arr, left, right) {
  // 选择最右边的元素作为 pivot
  const pivot = arr[right];
  let i = left;
  
  // 把比 pivot 小的元素都移到左边
  for (let j = left; j < right; j++) {
    if (arr[j] < pivot) {
      [arr[i], arr[j]] = [arr[j], arr[i]];
      i++;
    }
  }
  
  // 把 pivot 放到正确位置
  [arr[i], arr[right]] = [arr[right], arr[i]];
  return i;
}
```

**快速选择执行过程**：

```
arr = [3, 2, 1, 5, 4], k = 2

初始：[3, 2, 1, 5, 4]
      └─────────┘ pivot = 4

partition 后：
  比 4 小的：3, 2, 1
  比 4 大的：5
  结果：[3, 2, 1, 4, 5]
               ↑ pivotIndex = 3

pivotIndex (3) > k (2)，在左边 [0, 2] 继续

对 [3, 2, 1] partition：
  pivot = 1
  结果：[1, 2, 3, ...]
           ↑ pivotIndex = 0

pivotIndex (0) < k (2)，在右边 [1, 2] 继续

对 [2, 3] partition：
  pivot = 3
  结果：[1, 2, 3, ...]
              ↑ pivotIndex = 2

pivotIndex (2) == k (2)，找到！
结果：arr[0..1] = [1, 2]
```

**复杂度分析**：
- 时间：平均 O(n)，最坏 O(n²)
- 空间：O(log n) 递归栈

---

## 解法四：计数排序（特定场景）

当元素范围有限时（本题 0~10000），可以用计数排序：

```javascript
function getLeastNumbers(arr, k) {
  if (k === 0) return [];
  
  // 计数
  const count = new Array(10001).fill(0);
  for (const num of arr) {
    count[num]++;
  }
  
  // 收集前 k 个
  const result = [];
  for (let i = 0; i < count.length && result.length < k; i++) {
    while (count[i] > 0 && result.length < k) {
      result.push(i);
      count[i]--;
    }
  }
  
  return result;
}
```

**复杂度分析**：
- 时间：O(n + m)，m 是值域范围
- 空间：O(m)

---

## 方法对比

| 方法 | 时间 | 空间 | 特点 |
|------|------|------|------|
| 排序 | O(n log n) | O(log n) | 简单，但排序了整个数组 |
| 最大堆 | O(n log k) | O(k) | k 小时高效 |
| 快速选择 | O(n) 平均 | O(log n) | 最快，但会改变原数组 |
| 计数排序 | O(n + m) | O(m) | 值域有限时最优 |

---

## 选择建议

- **k 很小**（如 k = 10，n = 10^6）：用最大堆
- **可以修改原数组**：用快速选择
- **值域有限**：用计数排序
- **快速实现**：用排序

---

## 边界情况

```javascript
// 测试用例
getLeastNumbers([], 0);         // 空数组 → []
getLeastNumbers([1,2,3], 0);    // k = 0 → []
getLeastNumbers([1,2,3], 5);    // k > n → [1,2,3]
getLeastNumbers([1,1,1], 2);    // 重复元素 → [1,1]
getLeastNumbers([5,4,3,2,1], 1);// 逆序 → [1]
```

---

## 常见错误

### 1. 混淆最大堆和最小堆

```javascript
// ❌ 错误：用最小堆找最小的 k 个
const heap = new MinHeap();
// 最小堆弹出最小的，会丢失我们要的元素

// ✅ 正确：用最大堆，弹出最大的来淘汰
const heap = new MaxHeap();
```

### 2. 快速选择忘记处理 k = 0

```javascript
// ❌ 错误：没有特判
quickSelect(arr, 0, arr.length - 1, k);
return arr.slice(0, k);  // k = 0 时会出问题

// ✅ 正确：特判 k = 0
if (k === 0) return [];
```

### 3. partition 的边界问题

```javascript
// ❌ 错误：i 起始位置错误
let i = 0;  // 应该从 left 开始

// ✅ 正确
let i = left;
```

---

## 相关题目

| 题目 | 难度 | 关联点 |
|------|------|--------|
| [215. 数组中的第K个最大元素](https://leetcode.cn/problems/kth-largest-element-in-an-array/) | 中等 | 对称问题 |
| [347. 前 K 个高频元素](https://leetcode.cn/problems/top-k-frequent-elements/) | 中等 | Top K 变体 |
| [973. 最接近原点的 K 个点](https://leetcode.cn/problems/k-closest-points-to-origin/) | 中等 | 自定义比较 |

---

## 小结

本题展示了 Top K 问题的几种经典解法：

1. **排序法**：简单直接，适合快速实现
2. **堆方法**：找最小用最大堆，找最大用最小堆
3. **快速选择**：平均 O(n)，但会修改原数组
4. **计数排序**：值域有限时的最优解

**记忆技巧**：
- 找**最小**的 K 个 → 用**最大**堆（淘汰大的，留下小的）
- 找**最大**的 K 个 → 用**最小**堆（淘汰小的，留下大的）
