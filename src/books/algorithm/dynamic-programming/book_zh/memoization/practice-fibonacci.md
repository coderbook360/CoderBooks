# 实战：斐波那契数列（三种写法对比）

斐波那契数列是学习动态规划的最佳入门题目。本章用这道题展示三种写法的完整对比。

## 题目描述

斐波那契数列由 `0` 和 `1` 开始，后面的每一项都等于前两项之和。

```
F(0) = 0
F(1) = 1
F(n) = F(n-1) + F(n-2), n > 1
```

给定 `n`，计算 `F(n)`。

📎 [LeetCode 509. 斐波那契数](https://leetcode.cn/problems/fibonacci-number/)

**示例**：

```
输入：n = 4
输出：3
解释：F(4) = F(3) + F(2) = 2 + 1 = 3
```

**约束**：`0 <= n <= 30`

## 思路分析

### 这道题在考什么？

斐波那契数列的定义本身就是一个递推公式，这是动态规划的天然适用场景。

### 三种解法概览

| 解法 | 时间复杂度 | 空间复杂度 | 特点 |
|-----|-----------|-----------|------|
| 暴力递归 | O(2^n) | O(n) 栈 | 最直观，但超时 |
| 记忆化搜索 | O(n) | O(n) | 递归 + 备忘录 |
| 递推 | O(n) | O(n) → O(1) | 循环，可空间优化 |

## 解法一：暴力递归

```typescript
/**
 * 暴力递归
 * 时间复杂度：O(2^n) - 指数级，会超时
 * 空间复杂度：O(n) - 递归栈深度
 */
function fib(n: number): number {
  // 基本情况
  if (n <= 1) return n;
  
  // 递归关系
  return fib(n - 1) + fib(n - 2);
}
```

### 为什么这么慢？

递归树展示：

```
                    fib(5)
                   /      \
              fib(4)      fib(3)
             /     \      /     \
         fib(3)  fib(2) fib(2) fib(1)
         /    \
     fib(2) fib(1)
     /    \
 fib(1) fib(0)
```

- `fib(3)` 计算了 2 次
- `fib(2)` 计算了 3 次
- 总调用次数呈指数增长

## 解法二：记忆化搜索

```typescript
/**
 * 记忆化搜索（自顶向下）
 * 时间复杂度：O(n) - 每个子问题只计算一次
 * 空间复杂度：O(n) - 备忘录 + 递归栈
 */
function fib(n: number): number {
  // 备忘录，-1 表示未计算
  const memo: number[] = new Array(n + 1).fill(-1);
  
  function dp(k: number): number {
    // 检查备忘录
    if (memo[k] !== -1) {
      return memo[k];
    }
    
    // 基本情况
    if (k <= 1) {
      return k;
    }
    
    // 计算并存入备忘录
    memo[k] = dp(k - 1) + dp(k - 2);
    return memo[k];
  }
  
  return dp(n);
}
```

### 优化效果

有了备忘录，递归树变成了"递归链"：

```
fib(5) → fib(4) → fib(3) → fib(2) → fib(1) → fib(0)
```

每个节点只访问一次，时间复杂度 O(n)。

## 解法三：递推（自底向上）

```typescript
/**
 * 递推（自底向上）
 * 时间复杂度：O(n)
 * 空间复杂度：O(n) - DP 数组
 */
function fib(n: number): number {
  if (n <= 1) return n;
  
  const dp: number[] = new Array(n + 1);
  
  // 初始化边界
  dp[0] = 0;
  dp[1] = 1;
  
  // 递推计算
  for (let i = 2; i <= n; i++) {
    dp[i] = dp[i - 1] + dp[i - 2];
  }
  
  return dp[n];
}
```

### 空间优化版本

观察转移方程：`dp[i] = dp[i-1] + dp[i-2]`

每次只需要前两个值，可以用两个变量代替数组：

```typescript
/**
 * 递推 + 空间优化
 * 时间复杂度：O(n)
 * 空间复杂度：O(1)
 */
function fib(n: number): number {
  if (n <= 1) return n;
  
  let prev2 = 0;  // dp[i-2]
  let prev1 = 1;  // dp[i-1]
  
  for (let i = 2; i <= n; i++) {
    const curr = prev1 + prev2;
    prev2 = prev1;
    prev1 = curr;
  }
  
  return prev1;
}
```

## 三种写法的对比

### 代码复杂度

| 写法 | 代码行数 | 思考难度 |
|-----|---------|---------|
| 暴力递归 | ~5 行 | 最简单 |
| 记忆化搜索 | ~15 行 | 中等 |
| 递推 | ~10 行 | 中等 |
| 递推+优化 | ~10 行 | 稍难 |

### 性能对比

测试 `fib(40)`：

| 写法 | 运行时间 |
|-----|---------|
| 暴力递归 | ~1000 ms（超时） |
| 记忆化搜索 | <1 ms |
| 递推 | <1 ms |

### 内存使用

| 写法 | 空间复杂度 |
|-----|-----------|
| 暴力递归 | O(n) 栈 |
| 记忆化搜索 | O(n) 栈 + O(n) 备忘录 |
| 递推 | O(n) 数组 |
| 递推+优化 | O(1) |

## 进阶：矩阵快速幂

对于更大的 n，可以用矩阵快速幂将时间复杂度降到 O(log n)。

斐波那契数列可以表示为矩阵形式：

```
[F(n)  ]   [1 1]^(n-1)   [F(1)]
[F(n-1)] = [1 0]       × [F(0)]
```

```typescript
/**
 * 矩阵快速幂
 * 时间复杂度：O(log n)
 * 空间复杂度：O(1)
 */
function fib(n: number): number {
  if (n <= 1) return n;
  
  // 矩阵乘法
  function multiply(a: number[][], b: number[][]): number[][] {
    return [
      [a[0][0] * b[0][0] + a[0][1] * b[1][0],
       a[0][0] * b[0][1] + a[0][1] * b[1][1]],
      [a[1][0] * b[0][0] + a[1][1] * b[1][0],
       a[1][0] * b[0][1] + a[1][1] * b[1][1]]
    ];
  }
  
  // 矩阵快速幂
  function matrixPow(m: number[][], p: number): number[][] {
    let result = [[1, 0], [0, 1]];  // 单位矩阵
    while (p > 0) {
      if (p & 1) {
        result = multiply(result, m);
      }
      m = multiply(m, m);
      p >>= 1;
    }
    return result;
  }
  
  const base = [[1, 1], [1, 0]];
  const result = matrixPow(base, n - 1);
  return result[0][0];
}
```

## 本章小结

1. **暴力递归**：代码最简洁，但时间复杂度指数级
2. **记忆化搜索**：加备忘录避免重复计算，时间 O(n)
3. **递推**：用循环代替递归，可进一步空间优化到 O(1)
4. **矩阵快速幂**：适合超大 n，时间 O(log n)

**实践建议**：
- 面试时从暴力递归开始，展示思维过程
- 然后优化为记忆化搜索
- 最后改写为递推，并尝试空间优化
- 矩阵快速幂作为加分项
