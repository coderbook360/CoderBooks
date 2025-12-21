# 二分查找的三种模板

为了避免边界问题的困扰，本节提供三种固定模板，覆盖所有常见场景。

---

## 模板一：标准二分（找精确值）

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

**特点**：
- 区间：`[left, right]`
- 终止：`left > right`
- 用途：找到返回索引，找不到返回 -1

---

## 模板二：查找左边界（第一个 >= target）

```typescript
function lowerBound(nums: number[], target: number): number {
  let left = 0;
  let right = nums.length;  // 注意是 length，不是 length - 1
  
  while (left < right) {
    const mid = left + Math.floor((right - left) / 2);
    
    if (nums[mid] >= target) {
      right = mid;  // mid 可能是答案，保留
    } else {
      left = mid + 1;
    }
  }
  
  return left;  // left 是第一个 >= target 的位置
}
```

**特点**：
- 区间：`[left, right)`
- 终止：`left === right`
- 返回：第一个 >= target 的位置（可能是 nums.length）

---

## 模板三：查找右边界（最后一个 <= target）

```typescript
function upperBound(nums: number[], target: number): number {
  let left = 0;
  let right = nums.length;
  
  while (left < right) {
    const mid = left + Math.floor((right - left) / 2);
    
    if (nums[mid] <= target) {
      left = mid + 1;  // mid 不是答案，排除
    } else {
      right = mid;
    }
  }
  
  return left - 1;  // 最后一个 <= target 的位置
}
```

**特点**：
- 返回：最后一个 <= target 的位置（可能是 -1）

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
