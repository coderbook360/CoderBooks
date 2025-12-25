# 从暴力递归到记忆化搜索

很多人觉得动态规划很难，一上来就要想状态定义、转移方程。其实有一条更平滑的学习路径：**先写暴力递归，再加备忘录，最后改成递推**。

本章讲解这条路径的第一步——从暴力递归到记忆化搜索。

## 暴力递归的问题

让我们用经典的斐波那契数列来说明。

### 暴力递归实现

```typescript
function fib(n: number): number {
  if (n <= 1) return n;
  return fib(n - 1) + fib(n - 2);
}
```

代码很简洁，但效率极低。计算 `fib(40)` 需要约 10 亿次函数调用！

### 为什么这么慢？

画出递归树：

```
                    fib(5)
                   /      \
              fib(4)      fib(3)
             /     \      /     \
         fib(3)  fib(2) fib(2) fib(1)
         /    \
     fib(2) fib(1)
```

观察：`fib(3)` 被计算了 2 次，`fib(2)` 被计算了 3 次...

**时间复杂度**：O(2^n)，指数级爆炸。

**问题本质**：大量的**重复计算**。

## 记忆化搜索的思想

既然问题是重复计算，那**记住已经算过的结果**不就行了？

这就是记忆化搜索（Memoization）的核心思想：
1. 在递归前检查：这个子问题算过吗？
2. 如果算过，直接返回存储的结果
3. 如果没算过，计算后存起来

### 记忆化搜索实现

```typescript
function fib(n: number): number {
  // 备忘录，用于存储已计算的结果
  const memo: Map<number, number> = new Map();
  
  function dp(n: number): number {
    // 检查备忘录
    if (memo.has(n)) {
      return memo.get(n)!;
    }
    
    // 基本情况
    if (n <= 1) return n;
    
    // 计算结果
    const result = dp(n - 1) + dp(n - 2);
    
    // 存入备忘录
    memo.set(n, result);
    
    return result;
  }
  
  return dp(n);
}
```

### 效果对比

| 方法 | fib(40) 时间 | fib(50) 时间 |
|-----|-------------|-------------|
| 暴力递归 | ~1 秒 | 超时 |
| 记忆化搜索 | <1 毫秒 | <1 毫秒 |

**时间复杂度**：从 O(2^n) 降到 O(n)！

## 记忆化搜索的模板

```typescript
function solve(params) {
  // 1. 创建备忘录
  const memo = new Map();  // 或者用数组
  
  // 2. 定义递归函数
  function dp(state) {
    // 2.1 检查备忘录
    const key = encodeState(state);  // 将状态转换为 key
    if (memo.has(key)) {
      return memo.get(key);
    }
    
    // 2.2 基本情况（递归出口）
    if (isBaseCase(state)) {
      return baseValue;
    }
    
    // 2.3 递归计算
    let result = initialValue;
    for (const nextState of getNextStates(state)) {
      result = combine(result, dp(nextState));
    }
    
    // 2.4 存入备忘录
    memo.set(key, result);
    
    return result;
  }
  
  // 3. 从初始状态开始递归
  return dp(initialState);
}
```

## 备忘录的实现方式

### 方式一：哈希表（Map）

适用于状态是复杂对象或稀疏的情况。

```typescript
const memo = new Map<string, number>();

// 存储
memo.set(`${i},${j}`, result);

// 读取
if (memo.has(`${i},${j}`)) {
  return memo.get(`${i},${j}`)!;
}
```

### 方式二：数组

适用于状态是整数且范围已知的情况。

```typescript
// 一维状态
const memo: number[] = new Array(n + 1).fill(-1);

// 二维状态
const memo: number[][] = Array.from({ length: m + 1 }, () => 
  new Array(n + 1).fill(-1)
);

// 使用 -1 表示"未计算"
if (memo[i][j] !== -1) {
  return memo[i][j];
}
```

### 选择建议

| 场景 | 推荐方式 |
|-----|---------|
| 状态是连续整数 | 数组（更快） |
| 状态是复杂对象 | Map |
| 状态范围很大但实际访问少 | Map |
| 需要判断"未计算"和"值为 0" | Map 或特殊标记值 |

## 实战案例

### 案例一：爬楼梯

> 每次可以爬 1 或 2 级台阶，爬到第 n 级有多少种方法？

```typescript
function climbStairs(n: number): number {
  const memo: number[] = new Array(n + 1).fill(-1);
  
  function dp(i: number): number {
    // 检查备忘录
    if (memo[i] !== -1) return memo[i];
    
    // 基本情况
    if (i <= 2) return i;
    
    // 递归计算并存入备忘录
    memo[i] = dp(i - 1) + dp(i - 2);
    return memo[i];
  }
  
  return dp(n);
}
```

### 案例二：零钱兑换

> 给定硬币面额和目标金额，求凑成目标金额的最少硬币数。

```typescript
function coinChange(coins: number[], amount: number): number {
  const memo: number[] = new Array(amount + 1).fill(-2);
  
  function dp(remaining: number): number {
    // 基本情况
    if (remaining === 0) return 0;
    if (remaining < 0) return -1;  // 无法凑出
    
    // 检查备忘录
    if (memo[remaining] !== -2) return memo[remaining];
    
    // 尝试每种硬币
    let minCoins = Infinity;
    for (const coin of coins) {
      const subResult = dp(remaining - coin);
      if (subResult !== -1) {
        minCoins = Math.min(minCoins, subResult + 1);
      }
    }
    
    // 存入备忘录
    memo[remaining] = minCoins === Infinity ? -1 : minCoins;
    return memo[remaining];
  }
  
  return dp(amount);
}
```

### 案例三：最长递增子序列

> 给定数组，求最长严格递增子序列的长度。

```typescript
function lengthOfLIS(nums: number[]): number {
  const n = nums.length;
  const memo: number[] = new Array(n).fill(-1);
  
  // dp(i) = 以 nums[i] 结尾的 LIS 长度
  function dp(i: number): number {
    if (memo[i] !== -1) return memo[i];
    
    let maxLen = 1;  // 至少包含自己
    for (let j = 0; j < i; j++) {
      if (nums[j] < nums[i]) {
        maxLen = Math.max(maxLen, dp(j) + 1);
      }
    }
    
    memo[i] = maxLen;
    return maxLen;
  }
  
  // 枚举所有结尾位置，取最大值
  let result = 0;
  for (let i = 0; i < n; i++) {
    result = Math.max(result, dp(i));
  }
  return result;
}
```

### 案例四：不同路径

> m×n 网格，从左上到右下，每次只能向右或向下，有多少种路径？

```typescript
function uniquePaths(m: number, n: number): number {
  const memo: number[][] = Array.from({ length: m }, () => 
    new Array(n).fill(-1)
  );
  
  function dp(i: number, j: number): number {
    // 基本情况：到达起点
    if (i === 0 && j === 0) return 1;
    
    // 越界
    if (i < 0 || j < 0) return 0;
    
    // 检查备忘录
    if (memo[i][j] !== -1) return memo[i][j];
    
    // 递归计算：只能从上方或左方来
    memo[i][j] = dp(i - 1, j) + dp(i, j - 1);
    return memo[i][j];
  }
  
  return dp(m - 1, n - 1);
}
```

## 记忆化搜索 vs 暴力递归

| 特点 | 暴力递归 | 记忆化搜索 |
|-----|---------|-----------|
| 代码结构 | 相同的递归框架 | 增加备忘录 |
| 时间复杂度 | 指数级 | 多项式级 |
| 空间复杂度 | 递归栈 | 递归栈 + 备忘录 |
| 实现难度 | 简单 | 略复杂 |

## 从暴力到记忆化的步骤

1. **写出暴力递归**
   - 确定递归函数的参数和返回值
   - 确定基本情况（递归出口）
   - 确定递归关系

2. **识别重复计算**
   - 画递归树
   - 找出重复的子问题

3. **添加备忘录**
   - 选择合适的数据结构（数组或 Map）
   - 在递归开始时检查备忘录
   - 在递归返回前存入备忘录

4. **处理特殊值**
   - 确定"未计算"的标记值
   - 区分"未计算"和"计算结果为某值"

## 常见陷阱

### 陷阱一：备忘录 key 设计错误

```typescript
// ❌ 错误：直接用对象做 key
const memo = new Map();
memo.set([i, j], result);  // 每次创建新数组，key 永远不匹配

// ✅ 正确：用字符串或数字做 key
memo.set(`${i},${j}`, result);
// 或者用一维映射
memo.set(i * n + j, result);
```

### 陷阱二："未计算"标记与有效值冲突

```typescript
// ❌ 错误：用 0 做标记，但 0 可能是有效结果
const memo = new Array(n).fill(0);

// ✅ 正确：用不会出现的值做标记
const memo = new Array(n).fill(-1);  // 如果结果都是非负数
// 或者用 null/undefined
const memo = new Array(n).fill(null);
```

### 陷阱三：忘记存入备忘录

```typescript
// ❌ 错误：计算了但没存
function dp(i) {
  if (memo[i] !== -1) return memo[i];
  const result = dp(i-1) + dp(i-2);
  return result;  // 忘记存入 memo[i]！
}

// ✅ 正确：计算后立即存入
function dp(i) {
  if (memo[i] !== -1) return memo[i];
  memo[i] = dp(i-1) + dp(i-2);  // 存入后再返回
  return memo[i];
}
```

## 本章小结

1. **暴力递归的问题**：存在大量重复计算，导致指数级时间复杂度
2. **记忆化搜索的思想**：用备忘录记住已计算的结果，避免重复计算
3. **实现步骤**：写暴力递归 → 识别重复 → 添加备忘录
4. **备忘录选择**：数组更快，Map 更灵活
5. **时间复杂度**：从 O(2^n) 降到 O(子问题数量)

下一章，我们将学习如何把记忆化搜索转换为递推形式的动态规划。
