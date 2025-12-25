# 实战：摆动序列

> LeetCode 376. 摆动序列 | 难度：中等

通过贪心策略求最长摆动子序列。

---

## 题目描述

如果连续数字之间的差严格地在正数和负数之间交替，则称该序列为**摆动序列**。

第一个差（如果存在）可能是正数或负数。仅有一个元素或两个不相等的元素组成的序列也被视为摆动序列。

给定一个整数数组 `nums`，返回 `nums` 中作为**摆动序列**的**最长子序列的长度**。

**示例**：
```
输入：nums = [1,7,4,9,2,5]
输出：6
解释：整个序列就是摆动序列：[1,7,4,9,2,5]
      差值：[+6,-3,+5,-7,+3]，符号交替

输入：nums = [1,17,5,10,13,15,10,5,16,8]
输出：7
解释：[1,17,10,13,10,16,8] 是一个摆动子序列
```

---

## 思路分析

**贪心策略**：统计「峰」和「谷」的数量。

```
       峰
       /\
      /  \    峰
     /    \  /\
    /      \/  \
  起点      谷   终点
```

每个峰或谷都应该保留，因为它们代表了方向的转变。

**关键观察**：
- 在单调区间内，只需保留端点
- 每次方向改变（峰或谷）都增加序列长度

---

## 代码实现

### 方法一：贪心（统计峰谷）

```typescript
function wiggleMaxLength(nums: number[]): number {
  const n = nums.length;
  if (n < 2) return n;
  
  let prevDiff = nums[1] - nums[0];
  // 如果前两个数不同，初始长度为2；相同则为1
  let count = prevDiff !== 0 ? 2 : 1;
  
  for (let i = 2; i < n; i++) {
    const currDiff = nums[i] - nums[i - 1];
    
    // 方向改变：从上升变下降，或从下降变上升
    if ((currDiff > 0 && prevDiff <= 0) || 
        (currDiff < 0 && prevDiff >= 0)) {
      count++;
      prevDiff = currDiff;
    }
  }
  
  return count;
}
```

### 方法二：动态规划

```typescript
function wiggleMaxLengthDP(nums: number[]): number {
  const n = nums.length;
  if (n < 2) return n;
  
  // up[i]: 以 nums[i] 结尾，最后是上升的最长摆动序列
  // down[i]: 以 nums[i] 结尾，最后是下降的最长摆动序列
  let up = 1;
  let down = 1;
  
  for (let i = 1; i < n; i++) {
    if (nums[i] > nums[i - 1]) {
      // 当前是上升，接在下降后面
      up = down + 1;
    } else if (nums[i] < nums[i - 1]) {
      // 当前是下降，接在上升后面
      down = up + 1;
    }
    // 相等时不更新
  }
  
  return Math.max(up, down);
}
```

---

## 图示

```
nums = [1, 7, 4, 9, 2, 5]

可视化：
        9
       / \
      /   \
  7 /     \  5
   /       \/
  1         2
            4

差值：[+6, -3, +5, -7, +3]
       ↑   ↑   ↑   ↑   ↑
      上升 下降 上升 下降 上升

方向交替5次 + 起始1 = 6
```

---

## 执行过程详解

```
nums = [1, 17, 5, 10, 13, 15, 10, 5, 16, 8]

贪心方法：
初始：prevDiff = 17-1 = 16 > 0, count = 2

i=2: currDiff = 5-17 = -12 < 0
     prevDiff(16) > 0, currDiff < 0 → 方向改变
     count = 3, prevDiff = -12

i=3: currDiff = 10-5 = 5 > 0
     prevDiff(-12) < 0, currDiff > 0 → 方向改变
     count = 4, prevDiff = 5

i=4: currDiff = 13-10 = 3 > 0
     prevDiff(5) > 0, currDiff > 0 → 同向，不计数

i=5: currDiff = 15-13 = 2 > 0
     prevDiff(5) > 0, currDiff > 0 → 同向，不计数

i=6: currDiff = 10-15 = -5 < 0
     prevDiff(5) > 0, currDiff < 0 → 方向改变
     count = 5, prevDiff = -5

i=7: currDiff = 5-10 = -5 < 0
     prevDiff(-5) < 0, currDiff < 0 → 同向，不计数

i=8: currDiff = 16-5 = 11 > 0
     prevDiff(-5) < 0, currDiff > 0 → 方向改变
     count = 6, prevDiff = 11

i=9: currDiff = 8-16 = -8 < 0
     prevDiff(11) > 0, currDiff < 0 → 方向改变
     count = 7, prevDiff = -8

结果：7
```

---

## 处理平台（连续相等）

```
nums = [1, 2, 2, 2, 3, 4]

如果不特殊处理：
  差值：[+1, 0, 0, +1, +1]
  
正确处理：
  只看非零差值：[+1, +1, +1]
  没有方向改变，长度 = 2 (首尾)
```

贪心代码中的 `prevDiff <= 0` 和 `prevDiff >= 0` 自然处理了这种情况。

---

## 复杂度分析

**贪心方法**：
- 时间复杂度：O(n)
- 空间复杂度：O(1)

**动态规划方法**：
- 时间复杂度：O(n)
- 空间复杂度：O(1)

---

## 贪心正确性证明

**为什么只统计峰谷就够了？**

1. **峰谷必须保留**：峰谷是方向转变点，删除会减少摆动次数
2. **单调段只需端点**：例如 `[1,2,3]`，只需保留 `[1,3]`
3. **贪心选择最优**：每个峰谷都贡献一次方向改变

```
证明：设最优解选了 k 个元素
     则有 k-1 次差值
     最多有 k-1 次方向改变
     
     贪心解统计了所有方向改变
     所以 贪心解 >= 最优解

     又 贪心解 <= 最优解（显然）
     
     所以 贪心解 = 最优解
```

---

## 小结

本题的贪心策略：

1. **统计峰谷**：每次方向改变都计数
2. **忽略单调段**：同方向移动不增加计数
3. **处理平台**：连续相等值视为同方向

核心理解：**摆动序列的长度 = 峰谷数量 + 1**
