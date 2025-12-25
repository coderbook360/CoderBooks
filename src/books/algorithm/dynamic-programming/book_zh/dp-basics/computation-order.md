# 计算顺序与空间优化

动态规划的最后一个关键环节是**计算顺序**和**空间优化**。正确的计算顺序保证状态转移的正确性，而空间优化则能大幅降低内存消耗。

## 为什么计算顺序重要？

动态规划是递推过程：当前状态依赖之前的状态。因此，在计算当前状态时，它所依赖的状态必须已经计算好。

**错误示例**：

```typescript
// 斐波那契数列
// 错误的顺序：从大到小
for (let i = n; i >= 0; i--) {
  dp[i] = dp[i + 1] + dp[i + 2];  // ❌ dp[i+1] 和 dp[i+2] 还没计算！
}

// 正确的顺序：从小到大
for (let i = 2; i <= n; i++) {
  dp[i] = dp[i - 1] + dp[i - 2];  // ✅ dp[i-1] 和 dp[i-2] 已经计算好
}
```

## 计算顺序的确定方法

### 方法一：依赖关系分析

分析转移方程，确定 `dp[i]` 依赖哪些状态。

**一维 DP**：

| 转移方程 | 依赖 | 计算顺序 |
|---------|------|---------|
| `dp[i] = dp[i-1] + dp[i-2]` | 前面的状态 | 从左到右 |
| `dp[i] = dp[i+1] + dp[i+2]` | 后面的状态 | 从右到左 |

**二维 DP**：

| 转移方程 | 依赖 | 计算顺序 |
|---------|------|---------|
| `dp[i][j] = dp[i-1][j] + dp[i][j-1]` | 上方和左方 | 从上到下，从左到右 |
| `dp[i][j] = dp[i+1][j-1] + 1` | 下方和左方 | 从下到上，从左到右 |

### 方法二：图论视角

把状态看作图的节点，依赖关系看作有向边。计算顺序就是这个图的**拓扑排序**。

```
对于 dp[i] = f(dp[j])，存在边 j → i
计算顺序：从入度为 0 的节点开始，逐层处理
```

### 案例分析：区间 DP

**问题**：最长回文子序列

**状态**：`dp[i][j]` = s[i..j] 的最长回文子序列长度

**转移方程**：
```
if s[i] == s[j]:
    dp[i][j] = dp[i+1][j-1] + 2
else:
    dp[i][j] = max(dp[i+1][j], dp[i][j-1])
```

**依赖分析**：
- `dp[i][j]` 依赖 `dp[i+1][j-1]`、`dp[i+1][j]`、`dp[i][j-1]`
- 即：依赖更小的区间

**计算顺序**：按区间长度从小到大

```typescript
function longestPalindromeSubseq(s: string): number {
  const n = s.length;
  const dp: number[][] = Array.from({ length: n }, () => 
    new Array(n).fill(0)
  );
  
  // 长度为 1 的区间（对角线）
  for (let i = 0; i < n; i++) {
    dp[i][i] = 1;
  }
  
  // 按长度递增计算
  for (let len = 2; len <= n; len++) {
    for (let i = 0; i + len - 1 < n; i++) {
      const j = i + len - 1;
      if (s[i] === s[j]) {
        dp[i][j] = (len === 2 ? 0 : dp[i + 1][j - 1]) + 2;
      } else {
        dp[i][j] = Math.max(dp[i + 1][j], dp[i][j - 1]);
      }
    }
  }
  
  return dp[0][n - 1];
}
```

## 空间优化

DP 的空间复杂度通常等于状态数量。但很多情况下，我们可以通过观察依赖关系来压缩空间。

### 技巧一：滚动数组

当 `dp[i]` 只依赖 `dp[i-1]` 时，可以用两个变量交替使用。

**案例：斐波那契数列**

```typescript
// 未优化：O(n) 空间
function fib(n: number): number {
  const dp = new Array(n + 1);
  dp[0] = 0;
  dp[1] = 1;
  for (let i = 2; i <= n; i++) {
    dp[i] = dp[i - 1] + dp[i - 2];
  }
  return dp[n];
}

// 优化后：O(1) 空间
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

### 技巧二：一维数组代替二维

当 `dp[i][j]` 只依赖 `dp[i-1][...]` 时，可以把二维压缩为一维。

**案例：不同路径**

```typescript
// 未优化：O(m×n) 空间
function uniquePaths(m: number, n: number): number {
  const dp: number[][] = Array.from({ length: m }, () => 
    new Array(n).fill(1)
  );
  
  for (let i = 1; i < m; i++) {
    for (let j = 1; j < n; j++) {
      dp[i][j] = dp[i - 1][j] + dp[i][j - 1];
    }
  }
  
  return dp[m - 1][n - 1];
}

// 优化后：O(n) 空间
function uniquePaths(m: number, n: number): number {
  const dp = new Array(n).fill(1);
  
  for (let i = 1; i < m; i++) {
    for (let j = 1; j < n; j++) {
      dp[j] = dp[j] + dp[j - 1];
      // dp[j] 原来的值就是 dp[i-1][j]
      // dp[j-1] 已经更新为 dp[i][j-1]
    }
  }
  
  return dp[n - 1];
}
```

### 技巧三：01 背包的空间优化

01 背包的转移方程：
```
dp[i][j] = max(dp[i-1][j], dp[i-1][j-w[i]] + v[i])
```

`dp[i][j]` 只依赖 `dp[i-1][...]`，可以压缩为一维。但要注意**遍历顺序**！

```typescript
// 二维版本
function knapsack2D(weights: number[], values: number[], W: number): number {
  const n = weights.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => 
    new Array(W + 1).fill(0)
  );
  
  for (let i = 1; i <= n; i++) {
    for (let j = 0; j <= W; j++) {
      dp[i][j] = dp[i - 1][j];
      if (j >= weights[i - 1]) {
        dp[i][j] = Math.max(dp[i][j], dp[i - 1][j - weights[i - 1]] + values[i - 1]);
      }
    }
  }
  
  return dp[n][W];
}

// 一维优化版本
function knapsack1D(weights: number[], values: number[], W: number): number {
  const dp = new Array(W + 1).fill(0);
  
  for (let i = 0; i < weights.length; i++) {
    // 关键：倒序遍历！
    for (let j = W; j >= weights[i]; j--) {
      dp[j] = Math.max(dp[j], dp[j - weights[i]] + values[i]);
    }
  }
  
  return dp[W];
}
```

**为什么要倒序？**

正序遍历时：
```
计算 dp[j] 时，dp[j-w[i]] 已经被更新为第 i 轮的值
相当于 dp[i][j-w[i]]，而不是 dp[i-1][j-w[i]]
这意味着物品 i 可能被使用多次！
```

倒序遍历时：
```
计算 dp[j] 时，dp[j-w[i]] 还是第 i-1 轮的值
即 dp[i-1][j-w[i]]，保证每个物品只用一次
```

### 技巧四：完全背包的空间优化

完全背包允许物品无限使用，转移方程：
```
dp[i][j] = max(dp[i-1][j], dp[i][j-w[i]] + v[i])
```

注意区别：依赖的是 `dp[i][j-w[i]]` 而不是 `dp[i-1][j-w[i]]`。

```typescript
// 完全背包：正序遍历
function unboundedKnapsack(weights: number[], values: number[], W: number): number {
  const dp = new Array(W + 1).fill(0);
  
  for (let i = 0; i < weights.length; i++) {
    // 正序遍历：允许物品重复使用
    for (let j = weights[i]; j <= W; j++) {
      dp[j] = Math.max(dp[j], dp[j - weights[i]] + values[i]);
    }
  }
  
  return dp[W];
}
```

### 01 背包 vs 完全背包的遍历顺序

| 背包类型 | 转移依赖 | 内层遍历顺序 |
|---------|---------|-------------|
| 01 背包 | `dp[i-1][j-w]` | **倒序**（保证只用一次） |
| 完全背包 | `dp[i][j-w]` | **正序**（允许重复使用） |

## 常见场景的计算顺序

### 场景一：线性 DP

```typescript
// 依赖前面的状态：从左到右
for (let i = start; i <= n; i++) {
  dp[i] = f(dp[i-1], dp[i-2], ...);
}

// 依赖后面的状态：从右到左
for (let i = n; i >= start; i--) {
  dp[i] = f(dp[i+1], dp[i+2], ...);
}
```

### 场景二：二维 DP（网格）

```typescript
// 依赖上方和左方
for (let i = 0; i < m; i++) {
  for (let j = 0; j < n; j++) {
    dp[i][j] = f(dp[i-1][j], dp[i][j-1]);
  }
}

// 依赖下方和右方
for (let i = m - 1; i >= 0; i--) {
  for (let j = n - 1; j >= 0; j--) {
    dp[i][j] = f(dp[i+1][j], dp[i][j+1]);
  }
}
```

### 场景三：区间 DP

```typescript
// 小区间 → 大区间
for (let len = 1; len <= n; len++) {        // 枚举长度
  for (let i = 0; i + len - 1 < n; i++) {   // 枚举起点
    const j = i + len - 1;                   // 终点
    dp[i][j] = f(dp[i+1][j-1], dp[i][j-1], dp[i+1][j]);
  }
}
```

### 场景四：背包 DP

```typescript
// 01 背包
for (let i = 0; i < n; i++) {
  for (let j = W; j >= weights[i]; j--) {  // 倒序
    dp[j] = max(dp[j], dp[j - weights[i]] + values[i]);
  }
}

// 完全背包
for (let i = 0; i < n; i++) {
  for (let j = weights[i]; j <= W; j++) {  // 正序
    dp[j] = max(dp[j], dp[j - weights[i]] + values[i]);
  }
}
```

## 空间优化的权衡

空间优化不是总是有利的，需要权衡：

**优点**：
- 降低空间复杂度
- 对缓存更友好（一维数组）
- 面试中是加分项

**缺点**：
- 代码更难理解
- 无法回溯路径（如果需要输出具体方案）
- 调试更困难

**建议**：
1. 先写出未优化的正确版本
2. 确认正确后再考虑空间优化
3. 如果需要输出路径，保留完整的 DP 数组

## 本章小结

1. **计算顺序的重要性**：确保依赖的状态已经计算好
2. **确定方法**：分析依赖关系，或者用拓扑排序思想
3. **空间优化技巧**：滚动数组、二维压一维、背包空间优化
4. **背包遍历顺序**：01 背包倒序，完全背包正序
5. **实际建议**：先求正确，再求优化

至此，动态规划的五个核心环节——状态定义、状态转移、边界条件、计算顺序、空间优化——我们都已经学习完毕。下一部分，我们将学习**记忆化搜索**，这是 DP 的另一种实现方式。
