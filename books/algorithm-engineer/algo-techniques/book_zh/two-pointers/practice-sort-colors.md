# 实战：颜色分类

> LeetCode 75. 颜色分类 | 难度：中等

这道题是**三指针**（双指针变体）的经典应用，也称为荷兰国旗问题（Dutch National Flag Problem）。

---

## 题目描述

给定一个包含红色、白色和蓝色（共 n 个元素）的数组 `nums`，**原地**对它们进行排序，使得相同颜色的元素相邻，并按照红色、白色、蓝色顺序排列。

我们使用整数 0、1 和 2 分别表示红色、白色和蓝色。

必须在不使用库内置的排序函数的情况下解决这个问题。

**示例**：
```
输入：nums = [2, 0, 2, 1, 1, 0]
输出：[0, 0, 1, 1, 2, 2]

输入：nums = [2, 0, 1]
输出：[0, 1, 2]
```

---

## 思路分析

### 方法一：两次遍历（计数排序思想）

统计 0、1、2 的个数，然后覆写数组。

```typescript
function sortColors(nums: number[]): void {
  const count = [0, 0, 0];
  
  // 统计
  for (const num of nums) {
    count[num]++;
  }
  
  // 覆写
  let i = 0;
  for (let c = 0; c < 3; c++) {
    for (let j = 0; j < count[c]; j++) {
      nums[i++] = c;
    }
  }
}
```

**缺点**：需要两次遍历。

### 方法二：三指针（一次遍历）

使用三个指针划分数组为四个区域：

```
[0, 0, ..., 0] [1, 1, ..., 1] [未处理区域] [2, 2, ..., 2]
              ↑              ↑            ↑
             p0            curr          p2
```

- `p0`：下一个 0 应该放的位置
- `p2`：下一个 2 应该放的位置
- `curr`：当前遍历位置

---

## 代码实现

```typescript
function sortColors(nums: number[]): void {
  let p0 = 0;               // 下一个 0 应该放的位置
  let p2 = nums.length - 1; // 下一个 2 应该放的位置
  let curr = 0;             // 当前位置
  
  while (curr <= p2) {
    if (nums[curr] === 0) {
      // 交换到前面
      [nums[curr], nums[p0]] = [nums[p0], nums[curr]];
      p0++;
      curr++;  // 交换来的只可能是1，可以前进
    } else if (nums[curr] === 2) {
      // 交换到后面
      [nums[curr], nums[p2]] = [nums[p2], nums[curr]];
      p2--;
      // 注意：curr 不动，因为交换过来的数还需要判断
    } else {
      // nums[curr] === 1，不需要移动
      curr++;
    }
  }
}
```

---

## 执行过程可视化

```
nums = [2, 0, 2, 1, 1, 0]

初始状态：
  [2, 0, 2, 1, 1, 0]
   ↑              ↑
  p0,curr        p2

Step 1: nums[0]=2，与 nums[5]=0 交换
  [0, 0, 2, 1, 1, 2]
   ↑           ↑
  p0,curr     p2
  p2--，curr 不动（需要检查交换来的0）

Step 2: nums[0]=0，与 nums[0]=0 交换（自己换自己）
  [0, 0, 2, 1, 1, 2]
      ↑        ↑
   p0,curr    p2
  p0++，curr++

Step 3: nums[1]=0，与 nums[1]=0 交换
  [0, 0, 2, 1, 1, 2]
         ↑     ↑
      p0,curr p2
  p0++，curr++

Step 4: nums[2]=2，与 nums[4]=1 交换
  [0, 0, 1, 1, 2, 2]
         ↑  ↑
        p0 p2,curr
  p2--，curr 不动

Step 5: nums[2]=1，curr++
  [0, 0, 1, 1, 2, 2]
         ↑  ↑
        p0 curr,p2

Step 6: nums[3]=1，curr++
  [0, 0, 1, 1, 2, 2]
         ↑     ↑
        p0    curr
  curr > p2，结束

最终结果：[0, 0, 1, 1, 2, 2] ✓
```

---

## 关键问题：为什么遇到 2 时 curr 不动？

```
假设 nums = [2, 1, 0], curr=0, p2=2

第1步：nums[0]=2，与 nums[2]=0 交换
      nums = [0, 1, 2], p2=1
      
      如果 curr++ 变成1，就跳过了新换来的 0！
      所以 curr 不动，继续检查当前位置
```

**但遇到 0 时 curr 可以动**：

因为 `p0 <= curr`，交换来的元素要么是：
1. `p0 < curr`：交换来的是 1（之前遍历过）
2. `p0 === curr`：自己和自己交换

两种情况都不需要重新检查。

---

## 循环不变式（Loop Invariant）

在每次迭代开始时：
- `[0, p0)`：全是 0
- `[p0, curr)`：全是 1
- `[curr, p2]`：未处理
- `(p2, n-1]`：全是 2

---

## 复杂度分析

**时间复杂度**：O(n)
- 一次遍历，每个元素最多被交换一次

**空间复杂度**：O(1)
- 只使用三个指针

---

## 常见错误

**错误1：循环条件写错**
```typescript
// 错误：用 < 会漏掉最后一个元素
while (curr < p2) { }  // ❌

// 正确
while (curr <= p2) { }  // ✅
```

**错误2：遇到 2 时移动 curr**
```typescript
if (nums[curr] === 2) {
  swap(curr, p2);
  p2--;
  curr++;  // ❌ 错误！交换来的数没检查
}
```

**错误3：交换后 p0 忘记移动**
```typescript
if (nums[curr] === 0) {
  swap(curr, p0);
  // 忘记 p0++  ❌
  curr++;
}
```

---

## 扩展：K 种颜色问题

如果有 K 种颜色（0 到 K-1），三指针不再适用。

**方法1**：计数排序 O(n)
**方法2**：类似快排的分区思想，复杂度 O(nK)

---

## 相关题目

| 题目 | 难度 | 说明 |
|-----|------|------|
| [283. 移动零](https://leetcode.com/problems/move-zeroes/) | 简单 | 两种元素 |
| [905. 按奇偶排序数组](https://leetcode.com/problems/sort-array-by-parity/) | 简单 | 两种元素 |
| [324. 摆动排序 II](https://leetcode.com/problems/wiggle-sort-ii/) | 中等 | 三路划分变体 |

---

## 总结

颜色分类问题的核心要点：

1. **三指针划分**：p0 追踪 0，p2 追踪 2，curr 遍历
2. **遇 0 换前**：与 p0 交换，两个指针都前进
3. **遇 2 换后**：与 p2 交换，只有 p2 后退
4. **遇 1 跳过**：只有 curr 前进
5. **循环条件**：`curr <= p2`，处理完所有未知区域
- `(p2, n-1]`：全是 2
- `[curr, p2]`：待处理

当 `curr > p2` 时，所有元素都已归位。
