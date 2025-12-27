# 二分查找原理与边界处理

二分查找是算法中最基础也最容易出错的技巧。看似简单的二分，边界条件却常常让人困惑。

---

## 二分查找的本质

二分查找的核心思想：**通过每次排除一半的搜索空间，将 O(n) 的查找优化到 O(log n)**。

前提条件：**搜索空间必须有某种单调性**（有序数组是最常见的形式）。

---

## 最基础的二分查找

在有序数组中查找目标值：

```typescript
/**
 * 基础二分查找 - 在有序数组中查找目标值
 * 
 * 【二分查找的本质】
 * 通过每次排除一半的搜索空间，将 O(n) 优化到 O(log n)
 * 
 * 【前提条件】
 * 数组必须有序（或具有某种单调性）
 * 
 * 【区间定义】
 * 本实现使用闭区间 [left, right]
 * - 初始化：left = 0, right = n - 1
 * - 终止条件：left > right（区间为空）
 * - 边界更新：left = mid + 1 或 right = mid - 1（排除已检查的 mid）
 * 
 * 时间复杂度：O(log n)
 * 空间复杂度：O(1)
 */
function binarySearch(nums: number[], target: number): number {
  let left = 0;
  let right = nums.length - 1;
  
  // 闭区间 [left, right] 还有元素时继续搜索
  // 为什么是 <=？因为当 left == right 时，区间还有一个元素需要检查
  while (left <= right) {
    // 计算中点（避免整数溢出的写法）
    // 普通写法 (left + right) / 2 在 left 和 right 很大时可能溢出
    const mid = left + Math.floor((right - left) / 2);
    
    if (nums[mid] === target) {
      // 找到目标，返回索引
      return mid;
    } else if (nums[mid] < target) {
      // 目标在右半边
      // mid 已经检查过了，下次从 mid + 1 开始
      left = mid + 1;
    } else {
      // 目标在左半边
      // mid 已经检查过了，下次到 mid - 1 结束
      right = mid - 1;
    }
  }
  
  // 搜索结束，未找到目标
  return -1;
}
```

---

## 边界问题：三个细节

### 1. 为什么是 `left <= right`？

搜索区间是 `[left, right]`（闭区间）。

- `left <= right`：区间还有元素需要检查
- `left > right`：区间为空，搜索结束

### 2. 为什么是 `left = mid + 1` 和 `right = mid - 1`？

因为 `mid` 已经检查过了，下一次搜索要排除它：
- `nums[mid] < target`：目标在右半边，`left = mid + 1`
- `nums[mid] > target`：目标在左半边，`right = mid - 1`

### 3. 为什么用 `left + (right - left) / 2`？

避免 `(left + right)` 整数溢出。

---

## 三种常见的边界情况

### 1. 查找精确值

```typescript
/**
 * 查找精确值 - 最基本的二分查找
 * 找到返回索引，找不到返回 -1
 */
while (left <= right) {
  if (nums[mid] === target) return mid;  // 命中目标
  else if (nums[mid] < target) left = mid + 1;  // 目标在右边
  else right = mid - 1;  // 目标在左边
}
return -1;
```

### 2. 查找第一个 >= target 的位置

```typescript
/**
 * 查找左边界（Lower Bound）
 * 返回第一个 >= target 的位置，也就是 target 应该插入的位置
 * 
 * 【应用场景】
 * - 搜索插入位置
 * - 查找 target 第一次出现的位置
 * 
 * 【为什么 nums[mid] >= target 时 right = mid - 1？】
 * nums[mid] >= target 说明 mid 可能是答案，但左边可能还有更小的满足条件的位置
 * 我们要找"第一个"，所以继续往左搜索
 * 最终 left 会停在第一个 >= target 的位置
 */
while (left <= right) {
  if (nums[mid] >= target) right = mid - 1;  // 往左找更小的
  else left = mid + 1;  // 当前太小，往右
}
return left;  // left 就是第一个 >= target 的位置
```

### 3. 查找最后一个 <= target 的位置

```typescript
/**
 * 查找右边界（Upper Bound - 1）
 * 返回最后一个 <= target 的位置
 * 
 * 【应用场景】
 * - 查找 target 最后一次出现的位置
 * - 统计 <= target 的元素个数
 * 
 * 【为什么 nums[mid] <= target 时 left = mid + 1？】
 * nums[mid] <= target 说明 mid 可能是答案，但右边可能还有更大的满足条件的位置
 * 我们要找"最后一个"，所以继续往右搜索
 * 最终 right 会停在最后一个 <= target 的位置
 */
while (left <= right) {
  if (nums[mid] <= target) left = mid + 1;  // 往右找更大的
  else right = mid - 1;  // 当前太大，往左
}
return right;  // right 就是最后一个 <= target 的位置
```

---

## 为什么二分容易出错？

1. **区间定义不清**：`[left, right]` 还是 `[left, right)`？
2. **边界更新不一致**：什么时候 `mid + 1`，什么时候 `mid`？
3. **终止条件混淆**：`<=` 还是 `<`？

下一节我们将介绍三种模板，彻底解决这些问题。

---

## 时间复杂度

| 搜索方式 | 时间复杂度 |
|---------|-----------|
| 线性查找 | O(n) |
| 二分查找 | O(log n) |

每次迭代排除一半，n 次后只剩 1 个：`n / 2^k = 1`，即 `k = log n`。
