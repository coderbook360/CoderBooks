# 从记忆化搜索到递推

记忆化搜索虽然解决了重复计算问题，但仍然使用递归，有函数调用开销和栈空间限制。本章讲解如何把记忆化搜索转换为递推形式——这就是我们常说的"动态规划"。

## 两种方式的本质区别

| 特点 | 记忆化搜索（自顶向下） | 递推（自底向上） |
|-----|---------------------|-----------------|
| 计算方向 | 从大问题到小问题 | 从小问题到大问题 |
| 实现方式 | 递归 + 备忘录 | 循环 + DP 数组 |
| 入口 | 目标状态 | 边界状态 |
| 子问题计算 | 按需计算 | 全部计算 |
| 栈空间 | O(递归深度) | O(1) |

**核心区别**：
- 记忆化搜索：**需要时才算**（惰性求值）
- 递推：**全部算完再取**（急性求值）

## 转换的通用方法

### 步骤一：确定状态变量

记忆化搜索中递归函数的参数，就是递推中 DP 数组的维度。

```typescript
// 记忆化搜索
function dp(i: number, j: number): number { ... }
// ↓ 转换为
// 递推
const dp: number[][] = new Array(m).map(() => new Array(n));
```

### 步骤二：确定计算顺序

分析依赖关系，确保计算 `dp[i][j]` 时，所依赖的状态已经计算好。

```typescript
// 如果 dp(i,j) 依赖 dp(i-1,j) 和 dp(i,j-1)
// 那么遍历顺序是：从小到大遍历 i 和 j
for (let i = 0; i < m; i++) {
  for (let j = 0; j < n; j++) {
    // 此时 dp[i-1][j] 和 dp[i][j-1] 已计算好
  }
}
```

### 步骤三：处理边界条件

递归中的基本情况，对应递推中的初始值。

```typescript
// 记忆化搜索
function dp(i) {
  if (i <= 1) return i;  // 基本情况
  // ...
}

// 递推
dp[0] = 0;  // 边界初始化
dp[1] = 1;
for (let i = 2; i <= n; i++) {
  // 递推计算
}
```

### 步骤四：改写递归为循环

把递归调用改成数组访问。

```typescript
// 记忆化搜索
function dp(i) {
  return dp(i-1) + dp(i-2);  // 递归调用
}

// 递推
dp[i] = dp[i-1] + dp[i-2];  // 数组访问
```

## 经典案例：斐波那契数列

### 记忆化搜索版本

```typescript
function fib(n: number): number {
  const memo: number[] = new Array(n + 1).fill(-1);
  
  function dp(i: number): number {
    if (memo[i] !== -1) return memo[i];
    if (i <= 1) return i;
    memo[i] = dp(i - 1) + dp(i - 2);
    return memo[i];
  }
  
  return dp(n);
}
```

### 转换分析

1. **状态变量**：`i`（一维）
2. **计算顺序**：`dp(i)` 依赖 `dp(i-1)` 和 `dp(i-2)`，从小到大
3. **边界条件**：`i <= 1` 时返回 `i`
4. **递归改循环**：`dp(i-1) + dp(i-2)` → `dp[i-1] + dp[i-2]`

### 递推版本

```typescript
function fib(n: number): number {
  if (n <= 1) return n;
  
  const dp: number[] = new Array(n + 1);
  
  // 边界初始化
  dp[0] = 0;
  dp[1] = 1;
  
  // 递推计算
  for (let i = 2; i <= n; i++) {
    dp[i] = dp[i - 1] + dp[i - 2];
  }
  
  return dp[n];
}
```

## 经典案例：不同路径

### 记忆化搜索版本

```typescript
function uniquePaths(m: number, n: number): number {
  const memo: number[][] = Array.from({ length: m }, () => 
    new Array(n).fill(-1)
  );
  
  function dp(i: number, j: number): number {
    if (i === 0 && j === 0) return 1;
    if (i < 0 || j < 0) return 0;
    if (memo[i][j] !== -1) return memo[i][j];
    memo[i][j] = dp(i - 1, j) + dp(i, j - 1);
    return memo[i][j];
  }
  
  return dp(m - 1, n - 1);
}
```

### 转换分析

1. **状态变量**：`(i, j)`（二维）
2. **计算顺序**：依赖 `(i-1, j)` 和 `(i, j-1)`，从左上到右下
3. **边界条件**：`(0, 0)` 返回 1，越界返回 0
4. **递归改循环**：`dp(i-1,j) + dp(i,j-1)` → `dp[i-1][j] + dp[i][j-1]`

### 递推版本

```typescript
function uniquePaths(m: number, n: number): number {
  const dp: number[][] = Array.from({ length: m }, () => 
    new Array(n).fill(0)
  );
  
  // 边界初始化：第一行和第一列都是 1
  for (let i = 0; i < m; i++) dp[i][0] = 1;
  for (let j = 0; j < n; j++) dp[0][j] = 1;
  
  // 递推计算
  for (let i = 1; i < m; i++) {
    for (let j = 1; j < n; j++) {
      dp[i][j] = dp[i - 1][j] + dp[i][j - 1];
    }
  }
  
  return dp[m - 1][n - 1];
}
```

## 经典案例：最长公共子序列

### 记忆化搜索版本

```typescript
function longestCommonSubsequence(text1: string, text2: string): number {
  const m = text1.length, n = text2.length;
  const memo: number[][] = Array.from({ length: m }, () => 
    new Array(n).fill(-1)
  );
  
  // dp(i, j) = text1[i:] 和 text2[j:] 的 LCS 长度
  function dp(i: number, j: number): number {
    // 边界：任一字符串遍历完
    if (i === m || j === n) return 0;
    
    if (memo[i][j] !== -1) return memo[i][j];
    
    if (text1[i] === text2[j]) {
      memo[i][j] = 1 + dp(i + 1, j + 1);
    } else {
      memo[i][j] = Math.max(dp(i + 1, j), dp(i, j + 1));
    }
    
    return memo[i][j];
  }
  
  return dp(0, 0);
}
```

### 转换分析

这里记忆化搜索的定义是"后缀"形式：`dp(i,j)` 表示 `text1[i:]` 和 `text2[j:]` 的 LCS。

转换为递推时，可以保持相同定义（从后往前算），也可以改为"前缀"形式（从前往后算）。

### 递推版本（前缀形式）

```typescript
function longestCommonSubsequence(text1: string, text2: string): number {
  const m = text1.length, n = text2.length;
  
  // dp[i][j] = text1[0:i] 和 text2[0:j] 的 LCS 长度
  const dp: number[][] = Array.from({ length: m + 1 }, () => 
    new Array(n + 1).fill(0)
  );
  
  // 边界：dp[0][j] = dp[i][0] = 0（空字符串的 LCS 为 0）
  // 已经通过 fill(0) 初始化
  
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (text1[i - 1] === text2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }
  
  return dp[m][n];
}
```

## 经典案例：零钱兑换

### 记忆化搜索版本

```typescript
function coinChange(coins: number[], amount: number): number {
  const memo: number[] = new Array(amount + 1).fill(-2);
  
  function dp(remaining: number): number {
    if (remaining === 0) return 0;
    if (remaining < 0) return -1;
    if (memo[remaining] !== -2) return memo[remaining];
    
    let minCoins = Infinity;
    for (const coin of coins) {
      const sub = dp(remaining - coin);
      if (sub !== -1) {
        minCoins = Math.min(minCoins, sub + 1);
      }
    }
    
    memo[remaining] = minCoins === Infinity ? -1 : minCoins;
    return memo[remaining];
  }
  
  return dp(amount);
}
```

### 递推版本

```typescript
function coinChange(coins: number[], amount: number): number {
  // dp[i] = 凑成金额 i 的最少硬币数
  const dp: number[] = new Array(amount + 1).fill(Infinity);
  dp[0] = 0;  // 凑 0 元需要 0 枚硬币
  
  for (let i = 1; i <= amount; i++) {
    for (const coin of coins) {
      if (i >= coin && dp[i - coin] !== Infinity) {
        dp[i] = Math.min(dp[i], dp[i - coin] + 1);
      }
    }
  }
  
  return dp[amount] === Infinity ? -1 : dp[amount];
}
```

## 转换技巧总结

### 技巧一：参数映射到数组下标

```typescript
// 记忆化：参数范围 [0, n]
function dp(i) { ... }
// 递推：数组大小 n+1
const dp = new Array(n + 1);
```

### 技巧二：递归方向决定遍历顺序

```typescript
// 记忆化中 dp(i) 调用 dp(i-1)：从大到小递归
// 递推中要从小到大遍历，保证依赖先计算

// 记忆化中 dp(i) 调用 dp(i+1)：从小到大递归
// 递推中要从大到小遍历
```

### 技巧三：递归出口变初始化

| 记忆化搜索 | 递推 |
|-----------|------|
| `if (i == 0) return 1` | `dp[0] = 1` |
| `if (i < 0) return 0` | 不访问负数下标 |
| `if (memo[i] != -1) return memo[i]` | 删除（递推不需要） |

### 技巧四：下标偏移处理

有时候为了避免负数下标，需要偏移：

```typescript
// 记忆化：参数范围 [-100, 100]
function dp(i) { ... }

// 递推：偏移 100，范围变为 [0, 200]
const dp = new Array(201);
// dp[i + 100] 对应原来的 dp(i)
```

## 常见问题

### 问题一：递推方向搞反

```typescript
// 错误：依赖后面的状态，却从前往后遍历
for (let i = 0; i < n; i++) {
  dp[i] = dp[i + 1] + dp[i + 2];  // ❌ dp[i+1], dp[i+2] 还没算！
}

// 正确：从后往前遍历
for (let i = n - 1; i >= 0; i--) {
  dp[i] = dp[i + 1] + dp[i + 2];  // ✅
}
```

### 问题二：边界处理不完整

```typescript
// 记忆化中的隐式边界
function dp(i, j) {
  if (i < 0 || j < 0) return 0;  // 越界返回 0
  // ...
}

// 递推中需要显式处理
// 方法一：if 判断
if (i > 0) dp[i][j] += dp[i-1][j];
if (j > 0) dp[i][j] += dp[i][j-1];

// 方法二：扩展数组，留出边界空间
const dp = new Array(m + 1).map(() => new Array(n + 1).fill(0));
// 遍历从 1 开始
for (let i = 1; i <= m; i++) { ... }
```

### 问题三：遗漏某些状态

记忆化搜索只计算需要的状态，而递推会计算所有状态。

```typescript
// 如果只需要部分结果，递推可能计算了不必要的状态
// 这通常不是问题，但要注意：
// 1. 递推的复杂度可能看起来更高（实际上记忆化也是这么多）
// 2. 某些情况下记忆化更高效（稀疏子问题）
```

## 本章小结

1. **记忆化搜索是递归 + 备忘录**，递推是循环 + DP 数组
2. **转换步骤**：确定状态变量 → 确定计算顺序 → 处理边界 → 递归改循环
3. **关键点**：计算顺序要保证依赖的状态先计算
4. **常见问题**：方向搞反、边界处理不完整
5. **两种方式等价**：时间复杂度相同，递推通常更快（无函数调用开销）

下一章，我们将讨论何时选择记忆化搜索，何时选择递推。
