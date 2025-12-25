# 实战：最长递增子序列的个数

## 题目描述

给定一个未排序的整数数组 `nums`，返回最长递增子序列的个数。

注意：这个数列必须是严格递增的。

📎 [LeetCode 673. 最长递增子序列的个数](https://leetcode.cn/problems/number-of-longest-increasing-subsequence/)

**示例**：

```
输入：nums = [1, 3, 5, 4, 7]
输出：2
解释：有两个最长递增子序列，分别是 [1, 3, 4, 7] 和 [1, 3, 5, 7]
```

## 思路分析

这是 LIS 的变种，不仅要求长度，还要统计个数。

需要两个数组：
- `length[i]`：以 `nums[i]` 结尾的 LIS 长度
- `count[i]`：以 `nums[i]` 结尾的 LIS 个数

## 状态转移

```
如果 nums[j] < nums[i]：
    如果 length[j] + 1 > length[i]：
        // 找到更长的，更新长度和个数
        length[i] = length[j] + 1
        count[i] = count[j]
    
    如果 length[j] + 1 === length[i]：
        // 同样长度，累加个数
        count[i] += count[j]
```

## 代码实现

```typescript
/**
 * 最长递增子序列的个数
 * 时间复杂度：O(n²)
 * 空间复杂度：O(n)
 */
function findNumberOfLIS(nums: number[]): number {
  const n = nums.length;
  if (n === 0) return 0;
  
  // length[i] = 以 nums[i] 结尾的 LIS 长度
  // count[i] = 以 nums[i] 结尾的 LIS 个数
  const length = new Array(n).fill(1);
  const count = new Array(n).fill(1);
  
  for (let i = 1; i < n; i++) {
    for (let j = 0; j < i; j++) {
      if (nums[j] < nums[i]) {
        if (length[j] + 1 > length[i]) {
          // 找到更长的 LIS
          length[i] = length[j] + 1;
          count[i] = count[j];
        } else if (length[j] + 1 === length[i]) {
          // 相同长度，累加个数
          count[i] += count[j];
        }
      }
    }
  }
  
  // 找最长长度
  const maxLen = Math.max(...length);
  
  // 统计所有达到最长长度的个数
  let result = 0;
  for (let i = 0; i < n; i++) {
    if (length[i] === maxLen) {
      result += count[i];
    }
  }
  
  return result;
}
```

## 示例演算

以 `nums = [1, 3, 5, 4, 7]` 为例：

| i | nums[i] | length[i] | count[i] | 说明 |
|---|---------|-----------|----------|------|
| 0 | 1 | 1 | 1 | 只有自己 |
| 1 | 3 | 2 | 1 | 接在 1 后面 |
| 2 | 5 | 3 | 1 | 接在 3 后面 |
| 3 | 4 | 3 | 1 | 接在 3 后面 |
| 4 | 7 | 4 | 2 | 可接在 5 或 4 后面，各 1 种 |

最长长度 = 4，出现在位置 4，个数 = 2。

## 方法二：线段树优化 O(n log n)

对于大数据，可以用线段树优化：

```typescript
// 思路：离散化 + 线段树
// 线段树维护：区间内 (最大长度, 最大长度的个数)
// 对于每个 nums[i]，查询 [0, nums[i]-1] 范围内的最大长度和个数
// 然后更新 nums[i] 位置的值

// 这里只给出思路，具体实现较复杂
```

## 另一个示例

`nums = [2, 2, 2, 2, 2]`：

| i | nums[i] | length[i] | count[i] |
|---|---------|-----------|----------|
| 0 | 2 | 1 | 1 |
| 1 | 2 | 1 | 1 |
| 2 | 2 | 1 | 1 |
| 3 | 2 | 1 | 1 |
| 4 | 2 | 1 | 1 |

最长长度 = 1，总个数 = 5（每个元素自己就是一个长度为 1 的 LIS）。

## 与纯 LIS 的对比

| 问题 | 状态 | 答案 |
|-----|------|------|
| LIS 长度 | `length[i]` | `max(length)` |
| LIS 个数 | `length[i]`, `count[i]` | 所有最长的 `count[i]` 之和 |

## 注意事项

1. **累加时机**：只有当 `length[j] + 1 === length[i]` 时才累加
2. **初始化**：`count[i] = 1`，因为至少有自己这一种
3. **最终统计**：需要遍历所有达到最长长度的位置

## 复杂度分析

| 方法 | 时间复杂度 | 空间复杂度 |
|-----|-----------|-----------|
| DP | O(n²) | O(n) |
| 线段树 | O(n log n) | O(n) |

## 本章小结

1. **双状态设计**：同时维护长度和个数
2. **累加逻辑**：相同长度时累加，更长时重置
3. **最终答案**：所有最长位置的个数之和
