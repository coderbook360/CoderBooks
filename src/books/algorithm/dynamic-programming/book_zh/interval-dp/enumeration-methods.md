# 区间 DP 的枚举方式

区间 DP 的核心在于正确的枚举顺序，确保计算大区间时，所有子区间都已计算完毕。

## 为什么枚举顺序很重要

区间 DP 的状态转移形如：
```
dp[i][j] = f(dp[i][k], dp[k+1][j])
```

计算 `dp[i][j]` 时，需要用到更小的区间 `dp[i][k]` 和 `dp[k+1][j]`。

**必须保证**：小区间先计算，大区间后计算。

## 方式一：按长度枚举

最常用、最直观的方式。

```typescript
const n = arr.length;
const dp: number[][] = Array.from(
  { length: n },
  () => new Array(n).fill(0)
);

// 边界：长度为 1 的区间
for (let i = 0; i < n; i++) {
  dp[i][i] = 初始值;
}

// 枚举区间长度：从 2 到 n
for (let len = 2; len <= n; len++) {
  // 枚举左端点
  for (let i = 0; i + len - 1 < n; i++) {
    const j = i + len - 1;  // 右端点
    
    // 枚举分割点 k
    for (let k = i; k < j; k++) {
      dp[i][j] = Math.max(dp[i][j], dp[i][k] + dp[k + 1][j]);
    }
  }
}

return dp[0][n - 1];
```

**优点**：
- 逻辑清晰，易于理解
- 保证小区间先于大区间计算

**枚举顺序示意**（n=4）：
```
长度 1：[0,0], [1,1], [2,2], [3,3]
长度 2：[0,1], [1,2], [2,3]
长度 3：[0,2], [1,3]
长度 4：[0,3]
```

## 方式二：按左端点逆序枚举

从后往前枚举左端点，从前往后枚举右端点。

```typescript
// 从后往前枚举左端点
for (let i = n - 1; i >= 0; i--) {
  // 从左端点往右枚举右端点
  for (let j = i; j < n; j++) {
    if (i === j) {
      dp[i][j] = 初始值;
    } else {
      for (let k = i; k < j; k++) {
        dp[i][j] = Math.max(dp[i][j], dp[i][k] + dp[k + 1][j]);
      }
    }
  }
}
```

**为什么这样也是正确的？**

当计算 `dp[i][j]` 时：
- `dp[i][k]`（k < j）：左端点相同，右端点更小，已在当前 i 的内层循环中计算
- `dp[k+1][j]`（k+1 > i）：左端点更大，已在之前的外层循环中计算

**枚举顺序示意**（n=4）：
```
i=3: [3,3]
i=2: [2,2], [2,3]
i=1: [1,1], [1,2], [1,3]
i=0: [0,0], [0,1], [0,2], [0,3]
```

## 方式三：按右端点枚举

```typescript
// 枚举右端点
for (let j = 0; j < n; j++) {
  // 从右端点往左枚举左端点
  for (let i = j; i >= 0; i--) {
    if (i === j) {
      dp[i][j] = 初始值;
    } else {
      for (let k = i; k < j; k++) {
        dp[i][j] = Math.max(dp[i][j], dp[i][k] + dp[k + 1][j]);
      }
    }
  }
}
```

**枚举顺序示意**（n=4）：
```
j=0: [0,0]
j=1: [1,1], [0,1]
j=2: [2,2], [1,2], [0,2]
j=3: [3,3], [2,3], [1,3], [0,3]
```

## 三种方式的对比

| 方式 | 外层循环 | 内层循环 | 适用场景 |
|-----|---------|---------|---------|
| 按长度 | len: 1→n | i: 0→n-len | 最通用 |
| 左端点逆序 | i: n-1→0 | j: i→n-1 | 某些优化场景 |
| 右端点正序 | j: 0→n-1 | i: j→0 | 某些优化场景 |

## 如何选择？

1. **默认选择**：按长度枚举，最直观
2. **滚动数组优化**：按左端点逆序或右端点正序
3. **特定问题**：根据转移方程的依赖关系选择

## 分割点 k 的枚举

### 标准枚举

```typescript
for (let k = i; k < j; k++) {
  // dp[i][k] 和 dp[k+1][j] 都是有效区间
}
```

### 包含端点的枚举

某些问题（如戳气球）需要包含端点：

```typescript
for (let k = i; k <= j; k++) {
  // k 可以是 i 或 j
}
```

### 不包含端点的枚举

某些问题只考虑内部分割：

```typescript
for (let k = i + 1; k < j; k++) {
  // k 不能是 i 或 j
}
```

## 示例：最长回文子序列

```typescript
function longestPalindromeSubseq(s: string): number {
  const n = s.length;
  const dp: number[][] = Array.from(
    { length: n },
    () => new Array(n).fill(0)
  );
  
  // 方式一：按长度
  for (let len = 1; len <= n; len++) {
    for (let i = 0; i + len - 1 < n; i++) {
      const j = i + len - 1;
      if (len === 1) {
        dp[i][j] = 1;
      } else if (s[i] === s[j]) {
        dp[i][j] = dp[i + 1][j - 1] + 2;
      } else {
        dp[i][j] = Math.max(dp[i + 1][j], dp[i][j - 1]);
      }
    }
  }
  
  return dp[0][n - 1];
}
```

等价的左端点逆序写法：

```typescript
function longestPalindromeSubseq(s: string): number {
  const n = s.length;
  const dp: number[][] = Array.from(
    { length: n },
    () => new Array(n).fill(0)
  );
  
  // 方式二：左端点逆序
  for (let i = n - 1; i >= 0; i--) {
    for (let j = i; j < n; j++) {
      if (i === j) {
        dp[i][j] = 1;
      } else if (s[i] === s[j]) {
        dp[i][j] = dp[i + 1][j - 1] + 2;
      } else {
        dp[i][j] = Math.max(dp[i + 1][j], dp[i][j - 1]);
      }
    }
  }
  
  return dp[0][n - 1];
}
```

## 复杂度分析

- **时间复杂度**：通常 O(n³)（三重循环）
- **空间复杂度**：O(n²)（二维 dp 数组）

某些问题可以优化：
- 没有分割点枚举：O(n²)
- 四边形不等式优化：O(n²)

## 本章小结

1. **核心原则**：小区间先于大区间计算
2. **三种方式**：按长度、左端点逆序、右端点正序
3. **选择建议**：默认用按长度枚举
4. **分割点**：根据问题决定是否包含端点

**下一章**：我们将通过具体问题来实践区间 DP。
