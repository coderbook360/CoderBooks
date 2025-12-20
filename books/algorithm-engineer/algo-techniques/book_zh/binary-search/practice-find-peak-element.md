# 实战：寻找峰值

> LeetCode 162. 寻找峰值 | 难度：中等

二分查找在"无序"数组中的经典应用，打破了"二分必须有序"的思维定式。

---

## 题目描述

峰值元素是指其值严格大于左右相邻值的元素。

给你一个整数数组 `nums`，找到峰值元素并返回其索引。数组可能包含多个峰值，返回**任意**一个即可。

假设 `nums[-1] = nums[n] = -∞`。

**示例**：
```
输入：nums = [1, 2, 3, 1]
输出：2
解释：3 是峰值元素，索引为 2

输入：nums = [1, 2, 1, 3, 5, 6, 4]
输出：5（或 1）
解释：nums[5] = 6 是峰值，nums[1] = 2 也是峰值
```

---

## 思路分析

### 关键洞察：爬山思想

**问题**：数组无序，为什么能用二分？

**答案**：因为题目保证 `nums[-1] = nums[n] = -∞`，所以数组的两端都是"谷底"。无论从哪个方向开始"爬山"，最终一定能到达某个峰值。

```
情况1：上坡（nums[mid] < nums[mid + 1]）
       右边一定存在峰值
       
         ?
        /
       /
      mid  mid+1

情况2：下坡（nums[mid] > nums[mid + 1]）
       左边（含 mid）一定存在峰值
       
      \
       \
        ?
      mid  mid+1
```

---

## 代码实现

### 标准版本

```typescript
function findPeakElement(nums: number[]): number {
  let left = 0;
  let right = nums.length - 1;
  
  while (left < right) {
    const mid = left + Math.floor((right - left) / 2);
    
    if (nums[mid] < nums[mid + 1]) {
      // 上坡，峰值在右边
      left = mid + 1;
    } else {
      // 下坡或峰值，答案在左边（含 mid）
      right = mid;
    }
  }
  
  return left;
}
```

### 另一种理解

```typescript
function findPeakElement(nums: number[]): number {
  let left = 0;
  let right = nums.length - 1;
  
  while (left < right) {
    const mid = Math.floor((left + right) / 2);
    
    // 比较 mid 和 mid+1
    // 总是往"更高"的方向走
    if (nums[mid] > nums[mid + 1]) {
      right = mid;  // mid 可能是峰值
    } else {
      left = mid + 1;  // mid+1 更高，往右走
    }
  }
  
  return left;
}
```

---

## 执行过程可视化

```
nums = [1, 2, 1, 3, 5, 6, 4]
         0  1  2  3  4  5  6

第1轮：left=0, right=6, mid=3
       nums[3]=3 < nums[4]=5, 上坡
       峰值在右边，left = 4

第2轮：left=4, right=6, mid=5
       nums[5]=6 > nums[6]=4, 下坡
       峰值在左边（含5），right = 5

第3轮：left=4, right=5, mid=4
       nums[4]=5 < nums[5]=6, 上坡
       峰值在右边，left = 5

left === right === 5
返回 5（nums[5]=6 是峰值）✓
```

---

## 为什么用 left < right 而不是 left <= right？

**关键区别**在于我们如何处理边界：

| 模板 | 更新方式 | 终止条件 |
|-----|---------|---------|
| `left <= right` | `right = mid - 1` | 需要判断最后元素 |
| `left < right` | `right = mid` | 自然收敛到答案 |

本题使用 `left < right` 的原因：
- 当 `nums[mid] > nums[mid + 1]` 时，mid 可能是峰值，不能排除
- 所以用 `right = mid`（保留 mid）
- 最终 `left === right` 就是答案

---

## 为什么一定存在峰值？

**证明**：

1. 假设 `nums[-1] = nums[n] = -∞`
2. 从任意位置开始，往"更高"的方向走
3. 每一步都在上升，但数组有限
4. 最终一定会到达一个无法再上升的位置 = 峰值

**更形式化的证明**：
- 如果整个数组单调递增：`nums[n-1]` 是峰值（因为 `nums[n] = -∞`）
- 如果整个数组单调递减：`nums[0]` 是峰值（因为 `nums[-1] = -∞`）
- 否则存在"拐点"，即峰值

---

## 复杂度分析

**时间复杂度**：O(log n)
- 每次迭代搜索范围减半

**空间复杂度**：O(1)
- 只使用常数额外空间

---

## 常见错误

**错误1：比较 mid 和 mid-1**
```typescript
// 可能导致 mid-1 越界
if (nums[mid] > nums[mid - 1]) {  // ❌ 当 mid=0 时越界
```

**错误2：用 left <= right 但 right = mid**
```typescript
while (left <= right) {
  // ...
  right = mid;  // ❌ 可能死循环
}
```

**错误3：返回值错误**
```typescript
return nums[left];  // ❌ 应该返回索引
return left;        // ✅ 正确
```

---

## 相关题目

| 题目 | 难度 | 说明 |
|-----|------|------|
| [852. 山脉数组的峰顶索引](https://leetcode.com/problems/peak-index-in-a-mountain-array/) | 中等 | 只有一个峰 |
| [1095. 山脉数组中查找目标值](https://leetcode.com/problems/find-in-mountain-array/) | 困难 | 找峰值+两次二分 |
| [33. 搜索旋转排序数组](https://leetcode.com/problems/search-in-rotated-sorted-array/) | 中等 | 类似思想 |

---

## 二分的本质

本题告诉我们，二分查找的本质不是"有序"，而是**能够排除一半的搜索空间**。

只要满足以下条件，就可以用二分：
1. 存在某种判断条件
2. 根据条件可以确定答案在左半部分还是右半部分
3. 每次可以排除至少一半的范围

---

## 总结

寻找峰值的核心要点：

1. **爬山思想**：往更高的方向走一定能找到峰值
2. **二分条件**：比较 nums[mid] 和 nums[mid+1]
3. **边界处理**：nums[-1] = nums[n] = -∞ 保证峰值存在
4. **模板选择**：`left < right`，因为 mid 可能是答案
5. **二分本质**：不是有序，而是能排除一半

## 思考

这道题说明二分不一定需要完全有序，只要能保证"答案在某一侧"就可以二分。
