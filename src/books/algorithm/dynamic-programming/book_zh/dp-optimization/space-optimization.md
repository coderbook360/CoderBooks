# 空间优化技巧

空间优化是 DP 最常用的优化手段，通过减少存储空间来降低内存消耗。

## 滚动数组

当 dp[i] 只依赖于 dp[i-1]（或有限的前几个状态）时，可以用滚动数组优化。

### 基础形式

```typescript
// 原始：O(n) 空间
const dp = Array(n).fill(0);
dp[0] = initial;
for (let i = 1; i < n; i++) {
  dp[i] = f(dp[i-1]);
}
return dp[n-1];

// 优化：O(1) 空间
let prev = initial;
for (let i = 1; i < n; i++) {
  prev = f(prev);
}
return prev;
```

### 实例：斐波那契数列

```typescript
// 原始
function fib(n: number): number {
  if (n <= 1) return n;
  const dp = Array(n + 1).fill(0);
  dp[1] = 1;
  for (let i = 2; i <= n; i++) {
    dp[i] = dp[i-1] + dp[i-2];
  }
  return dp[n];
}

// 优化
function fib(n: number): number {
  if (n <= 1) return n;
  let prev2 = 0, prev1 = 1;
  for (let i = 2; i <= n; i++) {
    const curr = prev1 + prev2;
    prev2 = prev1;
    prev1 = curr;
  }
  return prev1;
}
```

### 实例：爬楼梯

```typescript
function climbStairs(n: number): number {
  if (n <= 2) return n;
  let prev2 = 1, prev1 = 2;
  for (let i = 3; i <= n; i++) {
    const curr = prev1 + prev2;
    prev2 = prev1;
    prev1 = curr;
  }
  return prev1;
}
```

## 二维转一维

当二维 DP 中 dp[i][j] 只依赖于 dp[i-1][...] 时，可以降为一维。

### 基本原理

```typescript
// 原始：O(n×m) 空间
const dp = Array.from({length: n}, () => Array(m).fill(0));
for (let i = 1; i < n; i++) {
  for (let j = 0; j < m; j++) {
    dp[i][j] = f(dp[i-1][...]);
  }
}

// 优化：O(m) 空间
const dp = Array(m).fill(0);
for (let i = 1; i < n; i++) {
  for (let j = ...; j ...; j...) {  // 注意遍历顺序！
    dp[j] = f(dp[...]);
  }
}
```

**关键**：遍历顺序取决于依赖关系。

### 实例：0-1 背包

```typescript
// 原始：O(n×W) 空间
function knapsack01(weights: number[], values: number[], W: number): number {
  const n = weights.length;
  const dp = Array.from({length: n + 1}, () => Array(W + 1).fill(0));
  
  for (let i = 1; i <= n; i++) {
    for (let w = 0; w <= W; w++) {
      dp[i][w] = dp[i-1][w];  // 不选
      if (w >= weights[i-1]) {
        dp[i][w] = Math.max(dp[i][w], dp[i-1][w - weights[i-1]] + values[i-1]);
      }
    }
  }
  
  return dp[n][W];
}

// 优化：O(W) 空间
function knapsack01(weights: number[], values: number[], W: number): number {
  const dp = Array(W + 1).fill(0);
  
  for (let i = 0; i < weights.length; i++) {
    // 逆序遍历！确保使用的是上一行的值
    for (let w = W; w >= weights[i]; w--) {
      dp[w] = Math.max(dp[w], dp[w - weights[i]] + values[i]);
    }
  }
  
  return dp[W];
}
```

**为什么逆序？**

```
考虑 weights = [2, 3], W = 5

正序遍历（错误）：
dp[2] = dp[0] + v[0] // 用了物品 0
dp[4] = dp[2] + v[0] // 又用了物品 0！重复使用

逆序遍历（正确）：
dp[4] = dp[2] + v[0] // dp[2] 还是旧值（不含物品 0）
dp[2] = dp[0] + v[0] // 更新 dp[2]
```

### 实例：完全背包

完全背包每个物品可以无限选，需要正序遍历：

```typescript
function knapsackComplete(weights: number[], values: number[], W: number): number {
  const dp = Array(W + 1).fill(0);
  
  for (let i = 0; i < weights.length; i++) {
    // 正序遍历！允许重复使用同一物品
    for (let w = weights[i]; w <= W; w++) {
      dp[w] = Math.max(dp[w], dp[w - weights[i]] + values[i]);
    }
  }
  
  return dp[W];
}
```

### 实例：最长公共子序列

```typescript
// 原始：O(m×n) 空间
function lcs(text1: string, text2: string): number {
  const m = text1.length, n = text2.length;
  const dp = Array.from({length: m + 1}, () => Array(n + 1).fill(0));
  
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (text1[i-1] === text2[j-1]) {
        dp[i][j] = dp[i-1][j-1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i-1][j], dp[i][j-1]);
      }
    }
  }
  
  return dp[m][n];
}

// 优化：O(n) 空间
function lcs(text1: string, text2: string): number {
  const m = text1.length, n = text2.length;
  const dp = Array(n + 1).fill(0);
  
  for (let i = 1; i <= m; i++) {
    let prev = 0;  // dp[i-1][j-1]
    for (let j = 1; j <= n; j++) {
      const temp = dp[j];  // 保存 dp[i-1][j]
      if (text1[i-1] === text2[j-1]) {
        dp[j] = prev + 1;
      } else {
        dp[j] = Math.max(dp[j], dp[j-1]);
      }
      prev = temp;
    }
  }
  
  return dp[n];
}
```

**为什么需要 prev？**

dp[i][j] 依赖于 dp[i-1][j-1]、dp[i-1][j]、dp[i][j-1]。

一维化后：
- dp[j] 在更新前是 dp[i-1][j]
- dp[j-1] 已经是 dp[i][j-1]（刚更新）
- dp[i-1][j-1] 需要额外保存

## 双数组滚动

有时用两个数组交替使用更清晰：

```typescript
let curr = Array(m).fill(0);
let prev = Array(m).fill(0);

for (let i = 1; i < n; i++) {
  for (let j = 0; j < m; j++) {
    curr[j] = f(prev[...]);
  }
  [prev, curr] = [curr, prev];  // 交换
}

return prev[...];
```

## 空间优化的代价

### 无法回溯

空间优化后，无法重建完整的 DP 表，也就无法回溯找到最优解的具体方案。

```typescript
// 能找到最长公共子序列的长度
// 但无法重建子序列本身
```

**解决方案**：
1. 如果只需要最优值，用空间优化
2. 如果需要方案，保留完整 DP 表

### 必须正确处理依赖

遍历顺序必须正确，否则会用到错误的值。

| 依赖类型 | 遍历顺序 |
|---------|---------|
| 只依赖上一行 | 任意 |
| 依赖同一行前面 | 正序 |
| 依赖上一行同位置左边 | 逆序 |

## 总结

空间优化要点：

1. **识别依赖**：dp[i][j] 依赖哪些状态
2. **选择策略**：滚动数组、一维化、双数组
3. **确定顺序**：根据依赖关系决定遍历顺序
4. **权衡取舍**：优化空间可能无法回溯

常见模式：
- 一维线性 DP：直接用变量
- 二维依赖上一行：一维数组
- 0-1 背包：逆序遍历
- 完全背包：正序遍历
- LCS 类：需要额外变量保存对角线值
