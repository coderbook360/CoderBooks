# 实战：寻找旋转排序数组中的最小值

> LeetCode 153. 寻找旋转排序数组中的最小值 | 难度：中等

在旋转数组中寻找"断点"的经典问题，展示二分在非单调数组上的应用。

---

## 题目描述

已知一个长度为 n 的数组，预先按照升序排列，经由 1 到 n 次**旋转**后，得到输入数组。

给你一个元素值**互不相同**的数组 `nums`，它原来是一个升序排列的数组，并按上述情形进行了多次旋转。请你找出并返回数组中的**最小元素**。

**示例**：
```
输入：nums = [3, 4, 5, 1, 2]
输出：1
解释：原数组 [1,2,3,4,5] 旋转 3 次得到 [3,4,5,1,2]

输入：nums = [4, 5, 6, 7, 0, 1, 2]
输出：0

输入：nums = [11, 13, 15, 17]
输出：11（没有旋转，最小值在开头）
```

---

## 思路分析

### 旋转数组的结构

```
原数组：[0, 1, 2, 4, 5, 6, 7]
旋转后：[4, 5, 6, 7, 0, 1, 2]
        ↑--------↑  ↑-----↑
         较大部分    较小部分
                    ↑
                  最小值（断点）
```

旋转数组由**两个升序子数组**组成，最小值是它们的**分界点**。

### 关键洞察

比较 `nums[mid]` 和 `nums[right]`：

- 如果 `nums[mid] > nums[right]`：最小值在右半边（mid 右侧）
- 如果 `nums[mid] < nums[right]`：最小值在左半边（含 mid）

```
情况1：nums[mid] > nums[right]
       [4, 5, 6, 7, 0, 1, 2]
              mid      right
        mid 在较大部分，最小值在右边

情况2：nums[mid] < nums[right]
       [4, 5, 6, 7, 0, 1, 2]
                    mid right
        mid 在较小部分，最小值在左边（含 mid）
```

---

## 代码实现

```typescript
function findMin(nums: number[]): number {
  let left = 0;
  let right = nums.length - 1;
  
  while (left < right) {
    const mid = left + Math.floor((right - left) / 2);
    
    if (nums[mid] > nums[right]) {
      // mid 在较大部分，最小值在右半边
      left = mid + 1;
    } else {
      // mid 在较小部分，最小值在左半边（含 mid）
      right = mid;
    }
  }
  
  return nums[left];
}
```

---

## 执行过程可视化

```
nums = [3, 4, 5, 1, 2]

初始：left=0, right=4

第1轮：mid=2
       nums[2]=5 > nums[4]=2
       5 在较大部分，最小值在右边
       left = 3

第2轮：mid=3
       nums[3]=1 < nums[4]=2
       1 在较小部分，最小值在左边（含 mid）
       right = 3

left === right === 3
返回 nums[3] = 1 ✓
```

```
nums = [4, 5, 6, 7, 0, 1, 2]

初始：left=0, right=6

第1轮：mid=3
       nums[3]=7 > nums[6]=2
       left = 4

第2轮：mid=5
       nums[5]=1 < nums[6]=2
       right = 5

第3轮：mid=4
       nums[4]=0 < nums[5]=1
       right = 4

left === right === 4
返回 nums[4] = 0 ✓
```

---

## 为什么与 right 比较而不是 left？

与 left 比较可能产生歧义：

```
nums = [3, 4, 5, 1, 2], mid=2
nums[mid]=5, nums[left]=3

5 > 3，能确定什么吗？
- 如果是正常升序 [1,2,3,4,5]，mid > left 也成立
- 无法区分 mid 是在较大部分还是较小部分

与 right 比较：
nums[mid]=5, nums[right]=2
5 > 2，说明 mid 在较大部分，最小值在右边 ✓
```

**与 right 比较的优势**：
- 如果 `mid > right`：mid 一定在较大部分
- 如果 `mid < right`：mid 一定在较小部分
- 不存在歧义！

---

## 边界情况

### 没有旋转（或旋转了 n 次）

```
nums = [1, 2, 3, 4, 5]

初始：left=0, right=4

mid=2: nums[2]=3 < nums[4]=5, right=2
mid=1: nums[1]=2 < nums[2]=3, right=1
mid=0: nums[0]=1 < nums[1]=2, right=0

left === right === 0
返回 nums[0] = 1 ✓
```

代码自动处理了这种情况！

---

## 复杂度分析

**时间复杂度**：O(log n)
- 每次迭代搜索范围减半

**空间复杂度**：O(1)
- 只使用常数额外空间

---

## 常见错误

**错误1：与 left 比较**
```typescript
// 可能产生歧义
if (nums[mid] > nums[left]) {  // ❌
```

**错误2：使用 left <= right**
```typescript
// 配合 right = mid 会死循环
while (left <= right) {
  right = mid;  // ❌
}
```

**错误3：返回索引而非值**
```typescript
return left;  // ❌ 应该返回 nums[left]
```

---

## 与搜索旋转排序数组的区别

| 题目 | 目标 | 核心思路 |
|-----|------|---------|
| 153（本题） | 找最小值 | 找断点 |
| 33 搜索旋转数组 | 找 target | 判断有序半边 + 二分 |

---

## 相关题目

| 题目 | 难度 | 说明 |
|-----|------|------|
| [154. 寻找旋转排序数组中的最小值 II](https://leetcode.com/problems/find-minimum-in-rotated-sorted-array-ii/) | 困难 | 有重复元素 |
| [33. 搜索旋转排序数组](https://leetcode.com/problems/search-in-rotated-sorted-array/) | 中等 | 搜索目标值 |
| [81. 搜索旋转排序数组 II](https://leetcode.com/problems/search-in-rotated-sorted-array-ii/) | 中等 | 有重复+搜索 |

---

## 有重复元素时（154 题扩展）

当存在重复元素且 `nums[mid] === nums[right]` 时，无法判断最小值位置：

```typescript
function findMin(nums: number[]): number {
  let left = 0;
  let right = nums.length - 1;
  
  while (left < right) {
    const mid = left + Math.floor((right - left) / 2);
    
    if (nums[mid] > nums[right]) {
      left = mid + 1;
    } else if (nums[mid] < nums[right]) {
      right = mid;
    } else {
      // nums[mid] === nums[right]，无法判断
      // 只能排除一个元素
      right--;
    }
  }
  
  return nums[left];
}
```

---

## 总结

寻找旋转排序数组中的最小值核心要点：

1. **找断点**：最小值是两个升序子数组的分界点
2. **与 right 比较**：避免歧义
3. **left < right**：因为 `right = mid` 保留 mid
4. **自动处理边界**：未旋转数组也能正确处理
5. **返回值**：返回 `nums[left]` 而非 `left`

- **时间复杂度**：O(log n)
- **空间复杂度**：O(1)

---

## 变体：有重复元素

当 `nums[mid] === nums[right]` 时，无法判断最小值在哪边，让 `right--`。

时间复杂度最坏退化为 O(n)。
