# 二分查找的三种模板

为了避免边界问题的困扰，本节提供三种固定模板，覆盖所有常见场景。

---

## 模板一：标准二分（找精确值）

```typescript
function binarySearch(nums: number[], target: number): number {
  // 初始化搜索区间 [left, right]，包含所有可能的索引
  let left = 0;
  let right = nums.length - 1;
  
  // 当搜索区间不为空时继续搜索
  // 为什么用 <=？因为区间 [left, right] 在 left === right 时仍有一个元素
  while (left <= right) {
    // 计算中点，使用 left + (right - left) / 2 避免整数溢出
    const mid = left + Math.floor((right - left) / 2);
    
    if (nums[mid] === target) {
      // 找到目标，直接返回索引
      return mid;
    } else if (nums[mid] < target) {
      // 中点值小于目标，目标在右半部分
      // mid 已检查过，排除它，搜索 [mid + 1, right]
      left = mid + 1;
    } else {
      // 中点值大于目标，目标在左半部分
      // mid 已检查过，排除它，搜索 [left, mid - 1]
      right = mid - 1;
    }
  }
  
  // 搜索区间为空，未找到目标
  return -1;
}
```

**特点**：
- 区间：`[left, right]`（闭区间）
- 终止：`left > right`（区间为空）
- 用途：找到返回索引，找不到返回 -1

**为什么使用闭区间？**
- 闭区间 `[left, right]` 直观表示"还需要检查的范围"
- `left === right` 时区间还有一个元素，必须检查
- 每次更新 `left = mid + 1` 或 `right = mid - 1`，确保 mid 被排除

---

## 模板二：查找左边界（第一个 >= target）

```typescript
function lowerBound(nums: number[], target: number): number {
  // 初始化搜索区间 [left, right)，左闭右开
  // 为什么 right = length？因为结果可能是"插入到末尾"
  let left = 0;
  let right = nums.length;
  
  // 当搜索区间不为空时继续搜索
  // 为什么用 <？因为区间 [left, right) 在 left === right 时为空
  while (left < right) {
    const mid = left + Math.floor((right - left) / 2);
    
    if (nums[mid] >= target) {
      // mid 可能是答案（第一个 >= target 的位置）
      // 但左边可能还有更小的满足条件的位置
      // 所以收缩右边界，但保留 mid（可能是答案）
      right = mid;
    } else {
      // nums[mid] < target，mid 绝对不是答案
      // 排除 mid，搜索 [mid + 1, right)
      left = mid + 1;
    }
  }
  
  // 循环结束时 left === right，就是第一个 >= target 的位置
  // 如果所有元素都 < target，返回 nums.length（插入位置）
  return left;
}
```

**特点**：
- 区间：`[left, right)`（左闭右开）
- 终止：`left === right`（区间为空）
- 返回：第一个 >= target 的位置（可能是 nums.length）

**为什么使用左闭右开区间？**
- 便于表示"可能的答案范围"
- `right = mid` 保留 mid（可能是答案）
- `left = mid + 1` 排除 mid（绝对不是答案）
- 终止时 `left === right`，不会遗漏任何候选

---

## 模板三：查找右边界（最后一个 <= target）

```typescript
function upperBound(nums: number[], target: number): number {
  // 初始化搜索区间 [left, right)，左闭右开
  let left = 0;
  let right = nums.length;
  
  // 当搜索区间不为空时继续搜索
  while (left < right) {
    const mid = left + Math.floor((right - left) / 2);
    
    if (nums[mid] <= target) {
      // mid 可能是答案，但右边可能还有更大的满足条件的位置
      // 排除 mid，搜索 [mid + 1, right)
      // 为什么排除 mid？因为我们找的是"最后一个"，需要尽量往右
      left = mid + 1;
    } else {
      // nums[mid] > target，mid 绝对不是答案
      // 收缩右边界，搜索 [left, mid)
      right = mid;
    }
  }
  
  // 循环结束时 left 是第一个 > target 的位置
  // 所以 left - 1 是最后一个 <= target 的位置
  // 如果所有元素都 > target，返回 -1
  return left - 1;
}
```

**特点**：
- 区间：`[left, right)`（左闭右开）
- 终止：`left === right`
- 返回：最后一个 <= target 的位置（可能是 -1）

**为什么返回 left - 1？**
- 我们实际找的是"第一个 > target 的位置"
- 那么它前一个位置就是"最后一个 <= target"
- 如果 left = 0，说明没有 <= target 的元素，返回 -1

---

## 三种模板对比

| 模板 | 区间 | 终止条件 | 返回值 |
|-----|-----|---------|-------|
| 精确查找 | [left, right] | left > right | 索引或 -1 |
| 左边界 | [left, right) | left == right | 第一个 >= target |
| 右边界 | [left, right) | left == right | 最后一个 <= target |

---

## 如何选择模板？

| 需求 | 选择模板 |
|-----|---------|
| 找精确值 | 模板一 |
| 找第一个等于 target | 模板二 + 验证 |
| 找最后一个等于 target | 模板三 + 验证 |
| 找第一个 > target | 模板二，target 改为 target + 1 |
| 找最后一个 < target | 模板三，target 改为 target - 1 |
| 找插入位置 | 模板二 |

---

## 示例：找第一个等于 target

```typescript
function findFirst(nums: number[], target: number): number {
  const pos = lowerBound(nums, target);
  
  if (pos < nums.length && nums[pos] === target) {
    return pos;
  }
  return -1;
}
```

## 示例：找最后一个等于 target

```typescript
function findLast(nums: number[], target: number): number {
  const pos = upperBound(nums, target);
  
  if (pos >= 0 && nums[pos] === target) {
    return pos;
  }
  return -1;
}
```
