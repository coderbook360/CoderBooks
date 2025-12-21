# 实战：搜索插入位置

> LeetCode 35. 搜索插入位置 | 难度：简单

考察"左边界"模板的典型题，是理解二分边界查找的关键一步。

---

## 题目描述

给定一个排序数组和一个目标值，在数组中找到目标值，并返回其索引。如果目标值不存在于数组中，返回它将会被按顺序插入的位置。

要求时间复杂度 O(log n)。

**示例**：
```
输入：nums = [1, 3, 5, 6], target = 5
输出：2

输入：nums = [1, 3, 5, 6], target = 2
输出：1（插入到索引 1 的位置）

输入：nums = [1, 3, 5, 6], target = 7
输出：4（插入到末尾）

输入：nums = [1, 3, 5, 6], target = 0
输出：0（插入到开头）
```

---

## 思路分析

本题本质是找**第一个 >= target 的位置**，即**左边界**。

### 几种情况分析

```
nums = [1, 3, 5, 6]

target = 5: 找到5，返回其位置2
target = 2: 找不到，但第一个≥2的是3，位置1
target = 7: 找不到，所有元素都<7，返回4
target = 0: 找不到，所有元素都>0，返回0
```

---

## 代码实现

### 左闭右开区间 [left, right)

```typescript
function searchInsert(nums: number[], target: number): number {
  let left = 0;
  let right = nums.length;  // 右边界初始为length，因为插入位置可能在末尾
  
  while (left < right) {
    const mid = left + Math.floor((right - left) / 2);
    
    if (nums[mid] >= target) {
      right = mid;  // 满足条件，收缩右边界
    } else {
      left = mid + 1;  // 不满足，排除左边
    }
  }
  
  return left;  // left就是第一个>=target的位置
}
```

### 左闭右闭区间 [left, right]

```typescript
function searchInsert(nums: number[], target: number): number {
  let left = 0;
  let right = nums.length - 1;
  
  while (left <= right) {
    const mid = left + Math.floor((right - left) / 2);
    
    if (nums[mid] >= target) {
      right = mid - 1;
    } else {
      left = mid + 1;
    }
  }
  
  return left;
}
```

---

## 为什么right初始为nums.length？

因为插入位置可能在数组末尾：

```
nums = [1, 2, 3], target = 4

所有元素都 < 4
插入位置应该是3（即nums.length）

如果right初始为nums.length-1=2
循环结束时left最大只能是3 ✓
```

---

## 执行过程可视化

### 示例1：目标存在

```
nums = [1, 3, 5, 6], target = 5

初始：left=0, right=4

第1轮：mid=2, nums[2]=5 >= 5
       → right=2

第2轮：mid=1, nums[1]=3 < 5
       → left=2

left=right=2，循环结束
返回2 ✓
```

### 示例2：目标不存在，插入中间

```
nums = [1, 3, 5, 6], target = 2

初始：left=0, right=4

第1轮：mid=2, nums[2]=5 >= 2
       → right=2

第2轮：mid=1, nums[1]=3 >= 2
       → right=1

第3轮：mid=0, nums[0]=1 < 2
       → left=1

left=right=1，循环结束
返回1（插入位置）✓
```

### 示例3：插入末尾

```
nums = [1, 3, 5, 6], target = 7

初始：left=0, right=4

第1轮：mid=2, nums[2]=5 < 7
       → left=3

第2轮：mid=3, nums[3]=6 < 7
       → left=4

left=right=4，循环结束
返回4（nums.length）✓
```

---

## 与标准二分的对比

| 特性 | 标准二分 | 搜索插入位置 |
|-----|---------|-------------|
| 目标 | 找到目标值 | 找第一个>=target的位置 |
| 返回值 | 找到返回位置，否则-1 | 总是返回有效位置 |
| 区间 | 可用左闭右闭 | 推荐左闭右开 |
| right初始 | length-1 | length |

---

## 常见错误

**错误1：right初始化错误**
```typescript
// 错误：无法处理插入末尾的情况
let right = nums.length - 1;  // 使用左闭右开时 ❌

// 正确
let right = nums.length;  // ✅
```

**错误2：条件写反**
```typescript
// 错误：找的是>target而不是>=target
if (nums[mid] > target) {  // ❌ 当target存在时会错

// 正确
if (nums[mid] >= target) {  // ✅
```

**错误3：返回值错误**
```typescript
// 错误：返回mid
return mid;  // ❌ 循环结束时mid可能不正确

// 正确：返回left（或right）
return left;  // ✅
```

---

## 边界情况测试

```typescript
// 空数组
searchInsert([], 1);  // 0

// 单元素
searchInsert([1], 0);  // 0
searchInsert([1], 1);  // 0
searchInsert([1], 2);  // 1

// 插入两端
searchInsert([1, 3, 5], 0);  // 0
searchInsert([1, 3, 5], 6);  // 3

// 重复元素
searchInsert([1, 3, 3, 3, 5], 3);  // 1（第一个3的位置）
```

---

## 相关题目

| 题目 | 难度 | 说明 |
|-----|------|------|
| [704. 二分查找](https://leetcode.com/problems/binary-search/) | 简单 | 标准二分 |
| [34. 查找首尾位置](https://leetcode.com/problems/find-first-and-last-position/) | 中等 | 左右边界 |
| [278. 第一个错误版本](https://leetcode.com/problems/first-bad-version/) | 简单 | 类似的左边界问题 |

---

## 左边界模板

```typescript
// 找第一个满足条件的位置
function leftBound(nums: number[], target: number): number {
  let left = 0;
  let right = nums.length;
  
  while (left < right) {
    const mid = left + Math.floor((right - left) / 2);
    
    if (check(nums[mid], target)) {  // 满足条件
      right = mid;
    } else {
      left = mid + 1;
    }
  }
  
  return left;
}
```

---

## 总结

搜索插入位置的核心要点：

1. **问题转化**：找第一个 >= target 的位置
2. **左边界思想**：满足条件时收缩右边界
3. **right初始化**：设为length以处理插入末尾
4. **返回值**：循环结束时left即为答案
5. **通用性**：这是解决"第一个满足条件"问题的模板

第1次：left=0, right=4, mid=2
       nums[2]=5 >= 2, right=2

第2次：left=0, right=2, mid=1
       nums[1]=3 >= 2, right=1

第3次：left=0, right=1, mid=0
       nums[0]=1 < 2, left=1

left === right = 1，返回 1
```

---

## 复杂度分析

- **时间复杂度**：O(log n)
- **空间复杂度**：O(1)
