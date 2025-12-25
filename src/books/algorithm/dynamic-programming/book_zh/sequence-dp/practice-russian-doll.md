# 实战：俄罗斯套娃信封

## 题目描述

给你一个二维整数数组 `envelopes`，其中 `envelopes[i] = [wi, hi]` 表示第 `i` 个信封的宽度和高度。

当另一个信封的宽度和高度都比这个信封大的时候，这个信封就可以放进另一个信封里，如同俄罗斯套娃一样。

请计算**最多能有多少个**信封能组成一组"俄罗斯套娃"信封。

📎 [LeetCode 354. 俄罗斯套娃信封问题](https://leetcode.cn/problems/russian-doll-envelopes/)

**示例**：

```
输入：envelopes = [[5,4], [6,4], [6,7], [2,3]]
输出：3
解释：最多信封的个数为 3，组合为 [2,3] => [5,4] => [6,7]
```

## 思路分析

这是 **二维的 LIS 问题**：
- 一维 LIS：只比较一个数值
- 本题：需要同时比较宽度和高度

**关键洞察**：
1. 按宽度升序排序
2. 宽度相同时，按高度**降序**排序
3. 对高度数组求 LIS

**为什么高度要降序？**

防止宽度相同的信封互相嵌套。例如 `[6,4]` 和 `[6,7]`，宽度相同不能嵌套，如果高度升序排列，LIS 可能错误地包含它们。

## 代码实现

### 方法一：排序 + O(n²) LIS

```typescript
function maxEnvelopes(envelopes: number[][]): number {
  const n = envelopes.length;
  if (n === 0) return 0;
  
  // 按宽度升序，宽度相同时按高度降序
  envelopes.sort((a, b) => {
    if (a[0] !== b[0]) return a[0] - b[0];
    return b[1] - a[1];  // 高度降序
  });
  
  // 对高度求 LIS
  const dp = new Array(n).fill(1);
  
  for (let i = 1; i < n; i++) {
    for (let j = 0; j < i; j++) {
      if (envelopes[j][1] < envelopes[i][1]) {
        dp[i] = Math.max(dp[i], dp[j] + 1);
      }
    }
  }
  
  return Math.max(...dp);
}
```

### 方法二：排序 + O(n log n) LIS

```typescript
/**
 * 俄罗斯套娃信封
 * 时间复杂度：O(n log n)
 * 空间复杂度：O(n)
 */
function maxEnvelopes(envelopes: number[][]): number {
  const n = envelopes.length;
  if (n === 0) return 0;
  
  // 按宽度升序，宽度相同时按高度降序
  envelopes.sort((a, b) => {
    if (a[0] !== b[0]) return a[0] - b[0];
    return b[1] - a[1];
  });
  
  // 对高度求 LIS（二分优化）
  const tails: number[] = [];
  
  for (const [, h] of envelopes) {
    let left = 0, right = tails.length;
    
    while (left < right) {
      const mid = Math.floor((left + right) / 2);
      if (tails[mid] < h) {
        left = mid + 1;
      } else {
        right = mid;
      }
    }
    
    if (left === tails.length) {
      tails.push(h);
    } else {
      tails[left] = h;
    }
  }
  
  return tails.length;
}
```

## 示例演算

以 `envelopes = [[5,4], [6,4], [6,7], [2,3]]` 为例：

**排序后**：

| 原始 | 排序后 | 说明 |
|------|--------|------|
| [5,4] | [2,3] | 宽度最小 |
| [6,4] | [5,4] | |
| [6,7] | [6,7] | 宽度=6，高度降序 |
| [2,3] | [6,4] | 宽度=6，高度降序 |

排序结果：`[[2,3], [5,4], [6,7], [6,4]]`

**对高度 [3, 4, 7, 4] 求 LIS**：

| 步骤 | h | tails |
|-----|---|-------|
| 1 | 3 | [3] |
| 2 | 4 | [3, 4] |
| 3 | 7 | [3, 4, 7] |
| 4 | 4 | [3, 4, 7]（4 替换原来的 4，不变）|

最终 LIS 长度 = 3

## 为什么高度降序有效

考虑 `[[6,4], [6,7]]`：

**如果高度升序** `[[6,4], [6,7]]`：
- 高度序列：[4, 7]
- LIS = [4, 7]，长度 2
- 错误！宽度相同不能嵌套

**如果高度降序** `[[6,7], [6,4]]`：
- 高度序列：[7, 4]
- LIS = [7] 或 [4]，长度 1
- 正确！

## 拓展：三维套娃

如果是三维（宽、高、深），问题变成 NP-hard。

常见近似解法：
1. 按两个维度排序，对第三维用 LIS（不保证最优）
2. 使用动态规划，O(n²)

```typescript
// 三维套娃（O(n²) DP）
function maxBoxes3D(boxes: number[][]): number {
  // 先对每个盒子内部排序，确保 w <= h <= d
  boxes = boxes.map(b => [...b].sort((a, b) => a - b));
  
  // 按第一维排序
  boxes.sort((a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2]);
  
  const n = boxes.length;
  const dp = new Array(n).fill(1);
  
  for (let i = 1; i < n; i++) {
    for (let j = 0; j < i; j++) {
      if (boxes[j][0] < boxes[i][0] &&
          boxes[j][1] < boxes[i][1] &&
          boxes[j][2] < boxes[i][2]) {
        dp[i] = Math.max(dp[i], dp[j] + 1);
      }
    }
  }
  
  return Math.max(...dp);
}
```

## 复杂度分析

| 方法 | 时间复杂度 | 空间复杂度 |
|-----|-----------|-----------|
| 排序 + O(n²) LIS | O(n²) | O(n) |
| 排序 + O(n log n) LIS | O(n log n) | O(n) |

## 本章小结

1. **二维 LIS 问题**：先排序降维，再求 LIS
2. **排序技巧**：宽度升序，高度降序
3. **降序原因**：防止相同宽度的信封被错误计入
4. **二分优化**：使用 O(n log n) 的 LIS 算法
