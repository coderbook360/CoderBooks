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
function binarySearch(nums: number[], target: number): number {
  let left = 0;
  let right = nums.length - 1;
  
  while (left <= right) {
    const mid = left + Math.floor((right - left) / 2);
    
    if (nums[mid] === target) {
      return mid;
    } else if (nums[mid] < target) {
      left = mid + 1;
    } else {
      right = mid - 1;
    }
  }
  
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
// 找到返回索引，找不到返回 -1
while (left <= right) {
  if (nums[mid] === target) return mid;
  else if (nums[mid] < target) left = mid + 1;
  else right = mid - 1;
}
return -1;
```

### 2. 查找第一个 >= target 的位置

```typescript
// 返回插入位置（左边界）
while (left <= right) {
  if (nums[mid] >= target) right = mid - 1;
  else left = mid + 1;
}
return left;
```

### 3. 查找最后一个 <= target 的位置

```typescript
// 返回右边界
while (left <= right) {
  if (nums[mid] <= target) left = mid + 1;
  else right = mid - 1;
}
return right;
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
