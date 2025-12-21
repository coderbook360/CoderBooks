# 实战：搜索旋转排序数组 II

> LeetCode 81. 搜索旋转排序数组 II | 难度：中等

与上一题的区别：数组中**可能存在重复元素**。这个变化看似微小，却带来了本质的复杂度变化。

---

## 题目描述

已知存在一个按非降序排列的整数数组 `nums`，数组中的值**可能重复**。

在传递给函数之前，`nums` 在预先未知的某个下标 k 上进行了旋转。

给你旋转后的数组 `nums` 和一个整数 `target`，判断 `target` 是否在数组中。

**示例**：
```
输入：nums = [2, 5, 6, 0, 0, 1, 2], target = 0
输出：true

输入：nums = [2, 5, 6, 0, 0, 1, 2], target = 3
输出：false
```

---

## 思路分析

### 重复元素带来的问题

在无重复的版本中，我们通过 `nums[left] <= nums[mid]` 判断左半边是否有序。

但当存在重复元素时：

```
nums = [1, 0, 1, 1, 1]
           ↑
        旋转点

left=0, mid=2, right=4
nums[left]=1, nums[mid]=1, nums[right]=1

nums[left] <= nums[mid] 成立
但左半边 [1, 0, 1] 并不是有序的！
```

**问题根源**：当 `nums[left] === nums[mid]` 时，无法判断哪边有序。

### 解决方案

当 `nums[left] === nums[mid]` 时，无法确定，只能保守地让 `left++`，缩小搜索范围。

---

## 代码实现

```typescript
function search(nums: number[], target: number): boolean {
  let left = 0;
  let right = nums.length - 1;
  
  while (left <= right) {
    const mid = left + Math.floor((right - left) / 2);
    
    if (nums[mid] === target) return true;
    
    // 关键：无法判断时，缩小范围
    if (nums[left] === nums[mid]) {
      left++;
      continue;
    }
    
    if (nums[left] < nums[mid]) {
      // 左半边严格有序
      if (nums[left] <= target && target < nums[mid]) {
        right = mid - 1;
      } else {
        left = mid + 1;
      }
    } else {
      // 右半边有序
      if (nums[mid] < target && target <= nums[right]) {
        left = mid + 1;
      } else {
        right = mid - 1;
      }
    }
  }
  
  return false;
}
```

---

## 执行过程可视化

### 正常情况

```
nums = [2, 5, 6, 0, 0, 1, 2], target = 0

初始：left=0, right=6

第1轮：mid=3, nums[mid]=0 === target
       返回 true ✓
```

### 需要跳过的情况

```
nums = [1, 0, 1, 1, 1], target = 0

初始：left=0, right=4

第1轮：mid=2, nums[mid]=1 !== 0
       nums[left]=1 === nums[mid]=1
       无法判断，left++

第2轮：left=1, mid=2
       nums[mid]=1 !== 0
       nums[left]=0 < nums[mid]=1
       左半边 [0, 1] 有序
       nums[left]=0 <= 0 && 0 < nums[mid]=1 ✓
       right = 1

第3轮：left=1, mid=1
       nums[mid]=0 === target
       返回 true ✓
```

---

## 为什么只需要 `left++`

当 `nums[left] === nums[mid]` 时：

- **不能直接排除任何一半**：target 可能在左边也可能在右边
- **left 位置不是 target**：因为我们已经检查过 `nums[mid] !== target`
- **安全的做法**：跳过 left，因为 `nums[left] === nums[mid] !== target`

同理，也可以检查 `nums[mid] === nums[right]` 时让 `right--`。

---

## 时间复杂度分析

| 情况 | 时间复杂度 | 例子 |
|-----|-----------|------|
| 最好 | O(log n) | 无重复元素 |
| 平均 | O(log n) | 少量重复 |
| 最坏 | O(n) | 全部相同 |

**最坏情况**：

```
nums = [1, 1, 1, 1, 1, 1, 1, 1, 1, 0]
       target = 0

每次 nums[left] === nums[mid]，只能 left++
需要遍历几乎所有元素
```

---

## 与版本 I 的对比

| 特性 | 版本 I (33) | 版本 II (81) |
|-----|------------|-------------|
| 重复元素 | 无 | 可能有 |
| 时间复杂度 | O(log n) | O(n) 最坏 |
| 判断条件 | `nums[left] <= nums[mid]` | 需要特判相等情况 |
| 返回值 | 索引或 -1 | 布尔值 |

---

## 复杂度分析

**时间复杂度**：
- 最好/平均：O(log n)
- 最坏：O(n)

**空间复杂度**：O(1)

---

## 常见错误

**错误1：忘记特判相等情况**
```typescript
// 错误：直接用版本 I 的逻辑
if (nums[left] <= nums[mid]) {  // ❌
  // 左半边"有序"
}

// 正确：先处理相等情况
if (nums[left] === nums[mid]) {
  left++;
  continue;
}
if (nums[left] < nums[mid]) {  // ✅
  // 左半边严格有序
}
```

**错误2：两边都跳过**
```typescript
// 过度跳过可能遗漏答案
if (nums[left] === nums[mid]) left++;
if (nums[mid] === nums[right]) right--;  // ⚠️ 同时执行可能有问题
```

---

## 进一步优化（可选）

可以同时处理左右两端的重复：

```typescript
function search(nums: number[], target: number): boolean {
  let left = 0;
  let right = nums.length - 1;
  
  while (left <= right) {
    // 去除两端重复元素
    while (left < right && nums[left] === nums[left + 1]) left++;
    while (left < right && nums[right] === nums[right - 1]) right--;
    
    const mid = left + Math.floor((right - left) / 2);
    
    if (nums[mid] === target) return true;
    
    if (nums[left] <= nums[mid]) {
      if (nums[left] <= target && target < nums[mid]) {
        right = mid - 1;
      } else {
        left = mid + 1;
      }
    } else {
      if (nums[mid] < target && target <= nums[right]) {
        left = mid + 1;
      } else {
        right = mid - 1;
      }
    }
  }
  
  return false;
}
```

---

## 相关题目

| 题目 | 难度 | 说明 |
|-----|------|------|
| [33. 搜索旋转排序数组](https://leetcode.com/problems/search-in-rotated-sorted-array/) | 中等 | 无重复版本 |
| [153. 寻找旋转排序数组中的最小值](https://leetcode.com/problems/find-minimum-in-rotated-sorted-array/) | 中等 | 找最小值 |
| [154. 寻找旋转排序数组中的最小值 II](https://leetcode.com/problems/find-minimum-in-rotated-sorted-array-ii/) | 困难 | 有重复+找最小值 |

---

## 总结

搜索旋转排序数组 II 的核心要点：

1. **重复元素的影响**：`nums[left] === nums[mid]` 时无法判断有序性
2. **保守处理**：相等时 `left++` 跳过
3. **复杂度退化**：最坏情况 O(n)
4. **对比记忆**：与版本 I 的唯一区别就是特判相等情况
| 版本 II | 有 | O(n) 最坏 | 需处理 `nums[left] == nums[mid]` |
