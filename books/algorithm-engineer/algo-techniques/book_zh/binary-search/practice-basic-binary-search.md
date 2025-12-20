# 实战：基础二分查找

> LeetCode 704. 二分查找 | 难度：简单

二分查找的入门题，考察最基础的模板应用。理解透彻后可以举一反三。

---

## 题目描述

给定一个 n 个元素有序的（升序）整型数组 `nums` 和一个目标值 `target`，写一个函数搜索 `nums` 中的 `target`，如果目标值存在返回下标，否则返回 -1。

**示例**：
```
输入：nums = [-1, 0, 3, 5, 9, 12], target = 9
输出：4
解释：9 出现在 nums 中，下标为 4

输入：nums = [-1, 0, 3, 5, 9, 12], target = 2
输出：-1
解释：2 不存在 nums 中
```

**约束**：
- 数组中的元素都是唯一的
- 数组已按升序排列

---

## 思路分析

### 为什么用二分？

线性搜索需要O(n)，而**有序数组**具有单调性，可以利用这一特性将每次判断排除一半元素。

### 二分的核心思想

```
每次取中间元素：
- 如果等于target → 找到
- 如果小于target → 答案在右半部分
- 如果大于target → 答案在左半部分
```

---

## 代码实现

### 左闭右闭区间 [left, right]

```typescript
function search(nums: number[], target: number): number {
  let left = 0;
  let right = nums.length - 1;  // 右边界包含
  
  while (left <= right) {  // 因为right是有效索引
    // 防止溢出的中点计算
    const mid = left + Math.floor((right - left) / 2);
    
    if (nums[mid] === target) {
      return mid;  // 找到目标
    } else if (nums[mid] < target) {
      left = mid + 1;  // 目标在右边
    } else {
      right = mid - 1;  // 目标在左边
    }
  }
  
  return -1;  // 未找到
}
```

### 左闭右开区间 [left, right)

```typescript
function search(nums: number[], target: number): number {
  let left = 0;
  let right = nums.length;  // 右边界不包含
  
  while (left < right) {  // 因为right是无效索引
    const mid = left + Math.floor((right - left) / 2);
    
    if (nums[mid] === target) {
      return mid;
    } else if (nums[mid] < target) {
      left = mid + 1;
    } else {
      right = mid;  // 不是mid-1，因为right本就不包含
    }
  }
  
  return -1;
}
```

---

## 两种区间对比

| 特性 | [left, right] | [left, right) |
|-----|---------------|---------------|
| 初始right | nums.length - 1 | nums.length |
| 循环条件 | left <= right | left < right |
| right更新 | right = mid - 1 | right = mid |
| 结束时 | left > right | left === right |

**推荐**：左闭右闭更直观，面试时更容易讲清楚。

---

## 执行过程可视化

```
nums = [-1, 0, 3, 5, 9, 12], target = 9

初始：left=0, right=5

第1轮：
  mid = (0+5)/2 = 2
  nums[2] = 3 < 9
  → left = 3
  
  [-1, 0, 3, 5, 9, 12]
               ↑L    ↑R

第2轮：
  mid = (3+5)/2 = 4
  nums[4] = 9 === 9
  → 返回 4

找到！位置是 4
```

---

## 边界情况测试

```typescript
// 空数组
search([], 1);  // -1

// 单元素
search([1], 1);  // 0
search([1], 2);  // -1

// 目标在两端
search([1, 2, 3], 1);  // 0
search([1, 2, 3], 3);  // 2

// 目标不存在
search([1, 3, 5], 2);  // -1
search([1, 3, 5], 0);  // -1
search([1, 3, 5], 6);  // -1
```

---

## 复杂度分析

**时间复杂度**：O(log n)
- 每次排除一半元素
- 最多log₂n次比较

**空间复杂度**：O(1)
- 只使用几个变量

### 为什么是O(log n)？

```
n个元素 → 第1次后剩n/2 → 第2次后剩n/4 → ... → 第k次后剩1
n/2^k = 1
k = log₂n
```

---

## 常见错误

**错误1：中点计算溢出**
```typescript
// 错误：left + right可能溢出（在某些语言中）
const mid = (left + right) / 2;  // ❌

// 正确
const mid = left + Math.floor((right - left) / 2);  // ✅
```

**错误2：边界更新错误**
```typescript
// 错误：可能导致死循环
left = mid;  // ❌ 当left+1=right时死循环

// 正确
left = mid + 1;  // ✅
```

**错误3：循环条件错误**
```typescript
// 左闭右闭区间应该用 <=
while (left < right) { ... }  // ❌ 可能漏掉最后一个元素

while (left <= right) { ... }  // ✅
```

---

## 相关题目

| 题目 | 难度 | 说明 |
|-----|------|------|
| [35. 搜索插入位置](https://leetcode.com/problems/search-insert-position/) | 简单 | 找不到时返回插入位置 |
| [34. 查找首尾位置](https://leetcode.com/problems/find-first-and-last-position/) | 中等 | 元素重复时找边界 |
| [69. x的平方根](https://leetcode.com/problems/sqrtx/) | 简单 | 二分答案 |

---

## 二分查找模板

```typescript
function binarySearch(nums: number[], target: number): number {
  let left = 0;
  let right = nums.length - 1;
  
  while (left <= right) {
    const mid = left + Math.floor((right - left) / 2);
    
    if (/* 找到目标 */) {
      return mid;
    } else if (/* 目标在右边 */) {
      left = mid + 1;
    } else {
      right = mid - 1;
    }
  }
  
  return -1;  // 或其他默认值
}
```

---

## 总结

基础二分查找的核心要点：

1. **前提条件**：数组有序
2. **区间定义**：明确左闭右闭还是左闭右开
3. **循环条件**：与区间定义匹配
4. **边界更新**：避免死循环
5. **中点计算**：防止溢出

掌握这道基础题后，可以扩展到：
- 查找第一个/最后一个位置
- 在旋转数组中查找
- 二分答案问题

## 常见错误

```typescript
// 错误 1：mid 计算溢出
const mid = (left + right) / 2;  // 可能溢出
const mid = left + (right - left) / 2;  // 正确

// 错误 2：忘记取整
const mid = left + (right - left) / 2;  // JS 会得到小数
const mid = left + Math.floor((right - left) / 2);  // 正确

// 错误 3：边界更新错误
left = mid;      // 可能死循环
left = mid + 1;  // 正确
```
