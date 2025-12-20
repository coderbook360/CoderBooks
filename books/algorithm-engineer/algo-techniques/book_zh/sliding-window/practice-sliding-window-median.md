# 实战：滑动窗口中位数

> LeetCode 480. 滑动窗口中位数 | 难度：困难

这道题综合了滑动窗口和数据结构设计，需要高效维护有序集合。

---

## 题目描述

给定一个数组 `nums`，有一个大小为 k 的窗口从数组的最左侧移动到最右侧。请返回每次窗口移动后窗口中数字的中位数。

**示例**：
```
输入：nums = [1, 3, -1, -3, 5, 3, 6, 7], k = 3
输出：[1, -1, -1, 3, 5, 6]

窗口位置                    中位数
[1  3  -1] -3  5  3  6  7     1
 1 [3  -1  -3] 5  3  6  7    -1
 1  3 [-1  -3  5] 3  6  7    -1
 1  3  -1 [-3  5  3] 6  7     3
 1  3  -1  -3 [5  3  6] 7     5
 1  3  -1  -3  5 [3  6  7]    6
```

---

## 思路分析

核心难点：如何高效地在窗口滑动时维护中位数？

**方法一：暴力排序**

每次窗口移动后排序取中位数。时间 O(nk log k)。

**方法二：双堆（最优解）**

- 大顶堆存较小的一半
- 小顶堆存较大的一半
- 中位数从两个堆顶获取

---

## 代码实现

由于 JavaScript 没有内置堆，这里使用简化版本：

```typescript
function medianSlidingWindow(nums: number[], k: number): number[] {
  const result: number[] = [];
  const window: number[] = [];
  
  for (let i = 0; i < nums.length; i++) {
    // 插入新元素（保持有序）
    insertSorted(window, nums[i]);
    
    // 窗口大小超过 k，移除最左边的元素
    if (window.length > k) {
      const idx = binarySearch(window, nums[i - k]);
      window.splice(idx, 1);
    }
    
    // 窗口大小达到 k，计算中位数
    if (window.length === k) {
      if (k % 2 === 1) {
        result.push(window[Math.floor(k / 2)]);
      } else {
        result.push((window[k / 2 - 1] + window[k / 2]) / 2);
      }
    }
  }
  
  return result;
}

function insertSorted(arr: number[], val: number): void {
  let left = 0, right = arr.length;
  while (left < right) {
    const mid = (left + right) >> 1;
    if (arr[mid] < val) left = mid + 1;
    else right = mid;
  }
  arr.splice(left, 0, val);
}

function binarySearch(arr: number[], val: number): number {
  let left = 0, right = arr.length;
  while (left < right) {
    const mid = (left + right) >> 1;
    if (arr[mid] < val) left = mid + 1;
    else right = mid;
  }
  return left;
}
```

---

## 执行过程可视化

```
nums = [1, 3, -1, -3, 5, 3, 6, 7], k = 3

Step 1: i=0, 插入 1
  window = [1]，大小 < k

Step 2: i=1, 插入 3
  window = [1, 3]，大小 < k

Step 3: i=2, 插入 -1
  window = [-1, 1, 3]，大小 = k
  中位数 = window[1] = 1
  result = [1]

Step 4: i=3, 插入 -3，移除 nums[0]=1
  window = [-3, -1, 3]
  中位数 = window[1] = -1
  result = [1, -1]

Step 5: i=4, 插入 5，移除 nums[1]=3
  window = [-3, -1, 5]
  中位数 = -1
  result = [1, -1, -1]

Step 6: i=5, 插入 3，移除 nums[2]=-1
  window = [-3, 3, 5]
  中位数 = 3
  result = [1, -1, -1, 3]

Step 7: i=6, 插入 6，移除 nums[3]=-3
  window = [3, 5, 6]
  中位数 = 5
  result = [1, -1, -1, 3, 5]

Step 8: i=7, 插入 7，移除 nums[4]=5
  window = [3, 6, 7]
  中位数 = 6
  result = [1, -1, -1, 3, 5, 6]
```

---

## 双堆解法（概念）

```
大顶堆（较小的一半）  小顶堆（较大的一半）
      [1, 2, 3]           [5, 6, 7]
          ↑                   ↑
        堆顶=3              堆顶=5
        
中位数 = (3 + 5) / 2 = 4
```

**维护规则**：
1. 两堆大小差不超过 1
2. 大顶堆堆顶 <= 小顶堆堆顶
3. 优先往大顶堆放（奇数时大顶堆多一个）

**插入操作**：
1. 如果新元素 <= 大顶堆顶，放入大顶堆
2. 否则放入小顶堆
3. 平衡两堆大小

**删除操作**：
1. 确定元素在哪个堆
2. 延迟删除（标记删除，实际堆顶弹出时才真正删除）
3. 平衡两堆大小

---

## 复杂度分析

**简化版（有序数组）**：
- 时间：O(nk)，插入/删除是 O(k)（splice 操作）
- 空间：O(k)

**双堆版本**：
- 时间：O(n log k)
- 空间：O(k)

---

## 常见错误

### 错误1：中位数计算溢出

```typescript
// ❌ 潜在溢出（虽然 JS 中不会）
const median = (window[k/2 - 1] + window[k/2]) / 2;

// ✓ 更安全的写法（其他语言需要）
const median = window[k/2 - 1] + (window[k/2] - window[k/2 - 1]) / 2;
```

### 错误2：移除元素时索引错误

```typescript
// ❌ 错误：直接用 indexOf（遇到重复元素可能找错）
const idx = window.indexOf(nums[i - k]);

// ✓ 正确：用二分查找确保找到正确位置
const idx = binarySearch(window, nums[i - k]);
```

### 错误3：边界情况

```typescript
// k = 1：每个元素都是自己的中位数
// k = nums.length：只有一个中位数
// 偶数 k：需要取两个中间值的平均
```

---

## 相关题目

- **295. 数据流的中位数**：动态添加元素，求中位数
- **239. 滑动窗口最大值**：类似的滑动窗口问题
- **703. 数据流中的第 K 大元素**：堆的应用

---

## 要点

这道题的难点在于数据结构的选择：

1. **需要快速插入/删除**：堆 O(log k) vs 数组 O(k)
2. **需要快速获取中位数**：双堆 O(1) vs 排序数组 O(1)
3. **延迟删除技巧**：堆中元素不立即删除，而是在成为堆顶时才真正删除

双堆是解决"动态中位数"问题的标准技巧，值得深入理解。
