# 实战：翻转对

> LeetCode 493. 翻转对 | 难度：困难

这是"计算右侧小于当前元素的个数"的加强版，统计条件更复杂。

---

## 问题描述

给定数组 `nums`，如果 `i < j` 且 `nums[i] > 2 * nums[j]`，则 `(i, j)` 是一个翻转对。

**示例**：
```
输入：[1, 3, 2, 3, 1]
输出：2

解释：
(1,4): 3 > 2*1=2  ✓
(3,4): 3 > 2*1=2  ✓
```

---

## 归并排序计数

核心思路：在归并排序的合并前，统计跨越左右两半的翻转对。

```typescript
function reversePairs(nums: number[]): number {
  let count = 0;
  
  function mergeSort(left: number, right: number): void {
    if (left >= right) return;
    
    const mid = Math.floor((left + right) / 2);
    mergeSort(left, mid);
    mergeSort(mid + 1, right);
    
    // 统计跨越的翻转对
    count += countPairs(left, mid, right);
    
    // 合并
    merge(left, mid, right);
  }
  
  function countPairs(left: number, mid: number, right: number): number {
    let pairCount = 0;
    let j = mid + 1;
    
    for (let i = left; i <= mid; i++) {
      // 找到第一个满足 nums[i] <= 2 * nums[j] 的 j
      while (j <= right && nums[i] > 2 * nums[j]) {
        j++;
      }
      pairCount += j - (mid + 1);
    }
    
    return pairCount;
  }
  
  function merge(left: number, mid: number, right: number): void {
    const temp: number[] = [];
    let i = left, j = mid + 1;
    
    while (i <= mid && j <= right) {
      if (nums[i] <= nums[j]) {
        temp.push(nums[i++]);
      } else {
        temp.push(nums[j++]);
      }
    }
    
    while (i <= mid) temp.push(nums[i++]);
    while (j <= right) temp.push(nums[j++]);
    
    for (let k = 0; k < temp.length; k++) {
      nums[left + k] = temp[k];
    }
  }
  
  mergeSort(0, nums.length - 1);
  return count;
}
```

---

## 关键区别

**与"计算右侧小于当前元素"的区别**：

1. **统计条件不同**：
   - 小于：`nums[i] > nums[j]`
   - 翻转对：`nums[i] > 2 * nums[j]`

2. **统计时机不同**：
   - 小于：在合并过程中统计
   - 翻转对：在合并**之前**单独统计

**为什么要分开？**

因为合并会改变数组顺序，导致统计错误。我们需要在左右两部分**各自有序**，但**相对位置未变**时统计。

---

## 执行示例

```
[1, 3, 2, 3, 1]
      ↓
左: [1,3,2]  右: [3,1]
  ↓ 递归     ↓ 递归
[1,3] [2]  [3] [1]
  ↓          ↓
[1,3]      [1,3]

合并 [1,3] 和 [2]：
统计：1 > 2*2? 否
      3 > 2*2? 否
count = 0

合并 [3] 和 [1]：
统计：3 > 2*1? 是
count = 1

最后合并 [1,2,3] 和 [1,3]：
统计：1 > 2*1? 否
      2 > 2*1? 否
      3 > 2*1? 是
count = 1 + 1 = 2  ✓
```

---

## 复杂度分析

- **时间复杂度**：O(n log n)
  - 归并排序：O(n log n)
  - 每次统计：O(n)（双指针优化）

- **空间复杂度**：O(n)

---

## 双指针优化原理

在 `countPairs` 函数中，我们使用了双指针优化：

```typescript
for (let i = left; i <= mid; i++) {
  while (j <= right && nums[i] > 2 * nums[j]) {
    j++;
  }
  pairCount += j - (mid + 1);
}
```

**为什么 `j` 不需要回退？**

因为左右两部分分别有序：
- 左半部分：`nums[left...mid]` 递增
- 右半部分：`nums[mid+1...right]` 递增

当 `nums[i]` 增大时：
- 能满足 `nums[i] > 2 * nums[j]` 的 `j` 只会更多
- 所以 `j` 只需要继续向右扫描，无需回退

**时间复杂度**：外层 O(n/2)，内层 `j` 最多移动 O(n/2)，总共 O(n)

---

## 执行过程详细分析

以 `[1, 3, 2, 3, 1]` 为例：

**第一层分割**：
```
[1, 3, 2, 3, 1]
      ↓
左: [1, 3, 2]    右: [3, 1]
```

**左半递归 [1, 3, 2]**：
```
分割：[1, 3] 和 [2]
  
[1, 3] 内部：
  分割：[1] 和 [3]
  合并：1 > 2*3? 否，count=0
        结果 [1, 3]

合并 [1, 3] 和 [2]：
  统计：1 > 2*2? 否
        3 > 2*2=4? 否
  count += 0

  合并后：[1, 2, 3]
```

**右半递归 [3, 1]**：
```
分割：[3] 和 [1]

统计：3 > 2*1=2? 是！
count += 1

合并后：[1, 3]
```

**最终合并 [1, 2, 3] 和 [1, 3]**：
```
统计翻转对：
  i=0, nums[i]=1:
    j=3, nums[j]=1: 1 > 2*1? 否
    pairCount += 0
    
  i=1, nums[i]=2:
    j=3, nums[j]=1: 2 > 2*1=2? 否
    pairCount += 0
    
  i=2, nums[i]=3:
    j=3, nums[j]=1: 3 > 2*1=2? 是！j++
    j=4, nums[j]=3: 3 > 2*3=6? 否
    pairCount += 1

count += 1
总 count = 0 + 1 + 1 = 2 ✓
```

---

## 与"计算右侧小于当前元素"的对比

| 对比项 | 315. 计算右侧小于 | 493. 翻转对 |
|-------|------------------|------------|
| 统计条件 | `nums[i] > nums[j]` | `nums[i] > 2 * nums[j]` |
| 统计时机 | 合并过程中 | 合并前单独统计 |
| 需要原索引 | 是（输出每个位置的计数） | 否（只输出总数） |
| 技巧 | 利用"右边已选走的"计数 | 双指针扫描 |

**为什么统计时机不同？**

- **315题**：条件是简单的 `>`，恰好可以在归并的"选择小元素"时统计
- **493题**：条件是 `> 2*`，与归并的选择逻辑不一致，必须单独统计

---

## 变体：统计满足 `nums[i] < 2 * nums[j]` 的对数

如果条件变为 `nums[i] < 2 * nums[j]`，只需调整统计逻辑：

```typescript
function countPairs(left: number, mid: number, right: number): number {
  let pairCount = 0;
  let j = mid + 1;
  
  for (let i = left; i <= mid; i++) {
    // 找到第一个满足 nums[i] >= 2 * nums[j] 的 j
    while (j <= right && nums[i] >= 2 * nums[j]) {
      j++;
    }
    // 从 j 到 right 的所有元素都满足 nums[i] < 2 * nums[j]
    pairCount += right - j + 1;
  }
  
  return pairCount;
}
```

---

## 常见错误

### 错误1：在合并过程中统计

```typescript
// ❌ 错误：条件与合并逻辑不一致
function merge(left, mid, right) {
  while (i <= mid && j <= right) {
    if (nums[i] > 2 * nums[j]) {  // 这是统计条件
      // 但这不是合并的正确逻辑！
    }
  }
}

// ✅ 正确：统计和合并分开
function merge(left, mid, right) {
  count += countPairs(left, mid, right);  // 先统计
  // 然后正常合并
}
```

### 错误2：忘记双指针优化

```typescript
// ❌ O(n²) 会超时
for (let i = left; i <= mid; i++) {
  for (let j = mid + 1; j <= right; j++) {
    if (nums[i] > 2 * nums[j]) count++;
  }
}

// ✅ O(n) 双指针
for (let i = left; i <= mid; i++) {
  while (j <= right && nums[i] > 2 * nums[j]) j++;
  count += j - (mid + 1);
}
```

### 错误3：整数溢出

```typescript
// ❌ 2 * nums[j] 可能溢出
nums[i] > 2 * nums[j]

// ✅ 使用除法或 BigInt
nums[i] / 2.0 > nums[j]  // 或
BigInt(nums[i]) > BigInt(2) * BigInt(nums[j])
```

---

## 通用模式总结

处理"特殊逆序对"的分治模式：

1. **归并排序框架**：分割 → 递归 → 合并
2. **统计时机选择**：
   - 条件与归并选择一致 → 合并中统计
   - 条件复杂 → 合并前单独统计
3. **双指针优化**：利用有序性，避免 O(n²)
4. **处理索引/值**：
   - 需要原索引 → 使用 (值, 索引) 对
   - 只需总数 → 直接操作值

---

## 相关题目

- **315. 计算右侧小于当前元素的个数**：基础版，合并中统计
- **327. 区间和的个数**：使用前缀和 + 归并排序
- **LintCode 532. 逆序对**：经典逆序对统计

这些题目的核心都是：**在归并排序中收集有序性带来的额外信息**。
