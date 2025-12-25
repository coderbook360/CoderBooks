# 鸡蛋掉落

## 题目描述

**LeetCode 887. Super Egg Drop**

给你 k 枚相同的鸡蛋，并可以使用一栋从第 1 层到第 n 层共有 n 层楼的建筑。

已知存在楼层 f，满足 0 <= f <= n，任何从高于 f 的楼层落下的鸡蛋都会碎，从 f 楼层或比它低的楼层落下的鸡蛋都不会碎。

每次操作，你可以取一枚没有碎的鸡蛋并把它从任一楼层 x 扔下（满足 1 <= x <= n）。如果鸡蛋碎了，你就不能再次使用它。如果某枚鸡蛋扔下后没有摔碎，则可以在之后的操作中重复使用这枚鸡蛋。

请你计算并返回要确定 f 的值的最小操作次数是多少？

**示例 1**：
```
输入：k = 1, n = 2
输出：2
解释：
第1层扔鸡蛋。碎了 → f=0
没碎 → 第2层扔。碎了 → f=1，没碎 → f=2
```

**示例 2**：
```
输入：k = 2, n = 6
输出：3
```

**示例 3**：
```
输入：k = 3, n = 14
输出：4
```

**约束**：
- `1 <= k <= 100`
- `1 <= n <= 10^4`

## 思路分析

### 理解问题

- k 个鸡蛋，n 层楼
- 找到临界楼层 f
- 求最少尝试次数（最坏情况）

### 关键洞见

这是一个博弈问题：
- 我们选择扔鸡蛋的楼层
- "自然"选择最坏的结果（碎或不碎）
- 我们要在最坏情况下最小化尝试次数

## 解法一：基础 DP

### 状态定义

`dp[k][n]` = k 个鸡蛋，n 层楼，最少尝试次数

### 转移方程

在第 x 层扔鸡蛋：
- 碎了：需要检查 [1, x-1]，用 k-1 个蛋
- 没碎：需要检查 [x+1, n]，用 k 个蛋

```
dp[k][n] = min{ 1 + max(dp[k-1][x-1], dp[k][n-x]) } for x in [1, n]
```

### 实现

```typescript
function superEggDrop(k: number, n: number): number {
  // dp[i][j] = i 个蛋，j 层楼
  const dp = Array.from(
    { length: k + 1 },
    () => Array(n + 1).fill(0)
  );
  
  // 1 个蛋：只能从 1 楼开始逐层尝试
  for (let j = 1; j <= n; j++) {
    dp[1][j] = j;
  }
  
  // 0 层楼：0 次
  // 已经初始化为 0
  
  for (let i = 2; i <= k; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = j;  // 最多 j 次
      for (let x = 1; x <= j; x++) {
        const broke = dp[i - 1][x - 1];
        const notBroke = dp[i][j - x];
        dp[i][j] = Math.min(dp[i][j], 1 + Math.max(broke, notBroke));
      }
    }
  }
  
  return dp[k][n];
}
```

**复杂度**：O(kn²)，对于 n = 10^4 太慢。

## 解法二：二分优化

### 关键观察

对于固定的 k 和 n：
- `dp[k-1][x-1]` 随 x 递增（碎的情况）
- `dp[k][n-x]` 随 x 递减（没碎的情况）

两个函数一增一减，max 的最小值在交点附近。

### 二分查找交点

```typescript
function superEggDrop(k: number, n: number): number {
  const memo = new Map<string, number>();
  
  function dp(eggs: number, floors: number): number {
    if (eggs === 1) return floors;
    if (floors <= 1) return floors;
    
    const key = `${eggs},${floors}`;
    if (memo.has(key)) return memo.get(key)!;
    
    // 二分查找最优的 x
    let lo = 1, hi = floors;
    while (lo < hi) {
      const mid = Math.floor((lo + hi) / 2);
      const broke = dp(eggs - 1, mid - 1);
      const notBroke = dp(eggs, floors - mid);
      
      if (broke < notBroke) {
        lo = mid + 1;
      } else {
        hi = mid;
      }
    }
    
    // lo 是交点位置，检查 lo 和 lo-1
    let result = Infinity;
    for (const x of [lo, lo - 1]) {
      if (x >= 1 && x <= floors) {
        const broke = dp(eggs - 1, x - 1);
        const notBroke = dp(eggs, floors - x);
        result = Math.min(result, 1 + Math.max(broke, notBroke));
      }
    }
    
    memo.set(key, result);
    return result;
  }
  
  return dp(k, n);
}
```

**复杂度**：O(kn log n)

## 解法三：逆向思维（最优）

### 换个角度

不问"k 个蛋 n 层楼最少几次"，而问"k 个蛋 t 次最多检测几层"。

设 `f(k, t)` = k 个蛋，t 次尝试，最多能确定的楼层数

### 递推关系

一次尝试：
- 碎了：可以确定 f(k-1, t-1) 层（下面的）
- 没碎：可以确定 f(k, t-1) 层（上面的）

```
f(k, t) = 1 + f(k-1, t-1) + f(k, t-1)
```

### 实现

```typescript
function superEggDrop(k: number, n: number): number {
  // f[i][j] = i 个蛋，j 次尝试，最多检测的楼层数
  // f[i][j] = 1 + f[i-1][j-1] + f[i][j-1]
  
  // 一维优化：f[i] = 用当前次数时，i 个蛋能检测的楼层
  const f = Array(k + 1).fill(0);
  
  for (let t = 1; ; t++) {
    // 从后往前更新（避免覆盖）
    for (let i = k; i >= 1; i--) {
      f[i] = 1 + f[i - 1] + f[i];
    }
    
    if (f[k] >= n) return t;
  }
}
```

**复杂度**：
- 时间：O(k × t)，其中 t = O(log n)（因为 f[k] 指数增长）
- 空间：O(k)

## 图解

以 k=2, n=6 为例：

```
逆向思维：
t=1: f[1]=1, f[2]=1   (1次最多检测1层)
t=2: f[1]=2, f[2]=3   (2次最多检测3层)
t=3: f[1]=3, f[2]=6   (3次最多检测6层) ✓

答案：3
```

推导过程：
```
f[2][3] = 1 + f[1][2] + f[2][2]
        = 1 + 2 + 3
        = 6
```

## 三种解法对比

| 解法 | 时间复杂度 | 空间复杂度 | 思路 |
|------|-----------|-----------|------|
| 基础 DP | O(kn²) | O(kn) | 枚举所有楼层 |
| 二分优化 | O(kn log n) | O(kn) | 二分找最优楼层 |
| 逆向思维 | O(k log n) | O(k) | 计算能检测的楼层 |

## 相关题目

| 题目 | 难度 | 说明 |
|------|------|------|
| [1884. 鸡蛋掉落2](https://leetcode.cn/problems/egg-drop-with-2-eggs-and-n-floors/) | 中等 | 简化版 |
| [375. 猜数字大小 II](https://leetcode.cn/problems/guess-number-higher-or-lower-ii/) | 中等 | 类似博弈 |
| [312. 戳气球](https://leetcode.cn/problems/burst-balloons/) | 困难 | 区间 DP |

## 总结

这道题展示了：

1. **多种解法**：从暴力到最优，逐步优化
2. **逆向思维**：换个角度，问题简化
3. **数学分析**：利用单调性进行二分

核心洞见：
- 原问题 O(kn²) → 二分优化 O(kn log n) → 逆向思维 O(k log n)
- 有时候换个问法，会得到更优的解法
