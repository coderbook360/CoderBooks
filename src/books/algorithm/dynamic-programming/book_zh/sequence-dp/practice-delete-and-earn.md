# 实战：删除与获得点数

## 题目描述

给你一个整数数组 `nums`，你可以对它进行一些操作。

每次操作中，选择任意一个 `nums[i]`，删除它并获得 `nums[i]` 的点数。之后，你必须删除**所有**等于 `nums[i] - 1` 和 `nums[i] + 1` 的元素。

开始你拥有 `0` 个点数。返回你能通过这些操作获得的最大点数。

📎 [LeetCode 740. 删除与获得点数](https://leetcode.cn/problems/delete-and-earn/)

**示例**：

```
输入：nums = [3, 4, 2]
输出：6
解释：
- 删除 4 获得 4 分，同时删除 3 和 5（5 不存在）
- 删除 2 获得 2 分
总共获得 4 + 2 = 6 分
```

## 思路分析

这道题乍看复杂，但可以转化为**打家劫舍**问题。

**关键转化**：
1. 统计每个数字的出现次数
2. 如果选择数字 `x`，就获得 `x × count[x]` 分
3. 选择了 `x` 就不能选择 `x-1` 和 `x+1`

这和打家劫舍一样：选了当前房子，不能选相邻的。

## 转化为打家劫舍

```typescript
// 原问题
nums = [2, 2, 3, 3, 3, 4]

// 转化后
// 数字 2 出现 2 次，价值 = 2 × 2 = 4
// 数字 3 出现 3 次，价值 = 3 × 3 = 9
// 数字 4 出现 1 次，价值 = 4 × 1 = 4

// 等价于打家劫舍
houses = [0, 0, 4, 9, 4]  // 下标代表数字，值代表总价值
```

## 代码实现

```typescript
/**
 * 删除与获得点数
 * 时间复杂度：O(n + maxVal)
 * 空间复杂度：O(maxVal)
 */
function deleteAndEarn(nums: number[]): number {
  if (nums.length === 0) return 0;
  
  // 找到最大值
  const maxVal = Math.max(...nums);
  
  // 统计每个数字的总价值
  const values = new Array(maxVal + 1).fill(0);
  for (const num of nums) {
    values[num] += num;
  }
  
  // 打家劫舍
  let rob = 0;      // 选当前数字
  let notRob = 0;   // 不选当前数字
  
  for (let i = 1; i <= maxVal; i++) {
    const prevRob = rob;
    const prevNotRob = notRob;
    
    // 选当前数字：上一个必须不选
    rob = prevNotRob + values[i];
    
    // 不选当前数字：上一个选或不选都行
    notRob = Math.max(prevRob, prevNotRob);
  }
  
  return Math.max(rob, notRob);
}
```

## 优化：处理稀疏数据

如果数字范围很大但数量很少，上面的方法会浪费空间。

```typescript
function deleteAndEarn(nums: number[]): number {
  if (nums.length === 0) return 0;
  
  // 用 Map 统计
  const count = new Map<number, number>();
  for (const num of nums) {
    count.set(num, (count.get(num) || 0) + num);
  }
  
  // 获取所有不同的数字并排序
  const uniqueNums = [...count.keys()].sort((a, b) => a - b);
  
  let rob = 0, notRob = 0;
  let prev = -Infinity;  // 上一个处理的数字
  
  for (const num of uniqueNums) {
    const value = count.get(num)!;
    
    if (num === prev + 1) {
      // 相邻，不能同时选
      const newRob = notRob + value;
      const newNotRob = Math.max(rob, notRob);
      rob = newRob;
      notRob = newNotRob;
    } else {
      // 不相邻，可以独立选择
      const best = Math.max(rob, notRob);
      rob = best + value;
      notRob = best;
    }
    
    prev = num;
  }
  
  return Math.max(rob, notRob);
}
```

## 示例演算

以 `nums = [2, 2, 3, 3, 3, 4]` 为例：

**统计**：
- 数字 2：价值 4
- 数字 3：价值 9
- 数字 4：价值 4

**打家劫舍**：

| 数字 | 价值 | rob | notRob |
|------|------|-----|--------|
| 1 | 0 | 0 | 0 |
| 2 | 4 | 4 | 0 |
| 3 | 9 | 9 | 4 |
| 4 | 4 | 8 | 9 |

最终答案：max(8, 9) = 9

## 与打家劫舍的对比

| 打家劫舍 | 本题 |
|---------|------|
| 房子编号 | 数字值 |
| 房子价值 | 数字×出现次数 |
| 不能选相邻房子 | 选了 x 不能选 x±1 |

## 另一种理解：分组背包

也可以看作分组背包：
- 每个数字是一个组
- 每个组只能选"全选"或"全不选"

## 复杂度分析

| 方法 | 时间复杂度 | 空间复杂度 |
|-----|-----------|-----------|
| 数组 | O(n + maxVal) | O(maxVal) |
| Map | O(n + k log k) | O(k)，k 是不同数字个数 |

## 相关题目

- [198. 打家劫舍](https://leetcode.cn/problems/house-robber/)
- [213. 打家劫舍 II](https://leetcode.cn/problems/house-robber-ii/)

## 本章小结

1. **问题转化**：选了 x 不能选 x±1 → 打家劫舍
2. **预处理**：统计每个数字的总价值
3. **状态转移**：和打家劫舍完全一样
4. **优化**：稀疏数据用 Map + 排序
