# 两种方法的选择与权衡

记忆化搜索和递推本质上是等价的，但在实际应用中各有优劣。本章帮你建立选择标准，做到因地制宜。

## 对比总览

| 维度 | 记忆化搜索 | 递推 |
|-----|-----------|------|
| 思考方式 | 自顶向下，更直观 | 自底向上，需要推导 |
| 实现难度 | 递归好写，转移自然 | 需要确定遍历顺序 |
| 运行效率 | 有函数调用开销 | 纯循环，更快 |
| 栈空间 | O(递归深度) | O(1)（不考虑 DP 数组） |
| 子问题计算 | 按需计算 | 全部计算 |
| 空间优化 | 困难 | 容易（滚动数组） |

## 什么时候用记忆化搜索？

### 场景一：状态转移复杂

当状态转移关系复杂、涉及多个条件分支时，递归的写法更自然。

**案例：正则表达式匹配**

```typescript
function isMatch(s: string, p: string): boolean {
  const memo = new Map<string, boolean>();
  
  function dp(i: number, j: number): boolean {
    const key = `${i},${j}`;
    if (memo.has(key)) return memo.get(key)!;
    
    // 基本情况
    if (j === p.length) return i === s.length;
    
    // 当前字符是否匹配
    const firstMatch = i < s.length && (s[i] === p[j] || p[j] === '.');
    
    let result: boolean;
    if (j + 1 < p.length && p[j + 1] === '*') {
      // 有 '*'：可以匹配 0 次或多次
      result = dp(i, j + 2) || (firstMatch && dp(i + 1, j));
    } else {
      // 无 '*'：必须匹配当前字符
      result = firstMatch && dp(i + 1, j + 1);
    }
    
    memo.set(key, result);
    return result;
  }
  
  return dp(0, 0);
}
```

这个问题的状态转移涉及多个条件分支，用递归写更清晰。

### 场景二：子问题稀疏

当实际需要计算的子问题只是全部子问题的一小部分时，记忆化搜索更高效。

**案例：博弈问题**

在某些博弈问题中，很多状态是不可达的。记忆化搜索只计算可达状态，而递推会计算所有状态。

### 场景三：递归思维更熟悉

如果你对递归更熟悉，或者题目本身就是用递归定义的，先写记忆化搜索再说。

**技巧**：面试时可以先写记忆化搜索拿到基本分，有时间再优化为递推。

### 场景四：不确定计算顺序

有些问题的计算顺序不容易确定，记忆化搜索可以自动处理依赖关系。

## 什么时候用递推？

### 场景一：需要空间优化

递推可以方便地使用滚动数组降低空间复杂度。

```typescript
// 记忆化搜索很难做空间优化
// 递推可以轻松用两个变量代替数组
let prev2 = 0, prev1 = 1;
for (let i = 2; i <= n; i++) {
  const curr = prev1 + prev2;
  prev2 = prev1;
  prev1 = curr;
}
```

### 场景二：追求极致性能

递推没有函数调用开销，对于大规模数据更快。

**性能对比**（计算 fib(10000)）：

| 方法 | 时间 |
|-----|------|
| 暴力递归 | 超时 |
| 记忆化搜索 | ~50ms |
| 递推 | ~10ms |
| 递推 + 空间优化 | ~5ms |

### 场景三：可能栈溢出

递归深度过大时会栈溢出，递推没有这个问题。

```typescript
// 记忆化搜索：n=100000 可能栈溢出
function fib_memo(n) {
  if (n <= 1) return n;
  return fib_memo(n-1) + fib_memo(n-2);  // 递归深度 O(n)
}

// 递推：再大的 n 也不会栈溢出
function fib_dp(n) {
  const dp = new Array(n + 1);
  dp[0] = 0; dp[1] = 1;
  for (let i = 2; i <= n; i++) {
    dp[i] = dp[i-1] + dp[i-2];
  }
  return dp[n];
}
```

### 场景四：需要输出路径

递推保留了完整的 DP 数组，方便回溯路径。

```typescript
// 最长公共子序列：输出具体的 LCS
function findLCS(text1: string, text2: string): string {
  const m = text1.length, n = text2.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  
  // 填表
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (text1[i-1] === text2[j-1]) {
        dp[i][j] = dp[i-1][j-1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i-1][j], dp[i][j-1]);
      }
    }
  }
  
  // 回溯路径
  let i = m, j = n;
  let result = '';
  while (i > 0 && j > 0) {
    if (text1[i-1] === text2[j-1]) {
      result = text1[i-1] + result;
      i--; j--;
    } else if (dp[i-1][j] > dp[i][j-1]) {
      i--;
    } else {
      j--;
    }
  }
  
  return result;
}
```

## 实际选择建议

### 做题/面试时

```
1. 先分析问题，确定状态和转移
2. 如果思路清晰，直接写递推
3. 如果转移复杂，先写记忆化搜索
4. 通过后，有时间再优化
```

### 竞赛时

```
1. 优先递推（更快、更省栈空间）
2. 记忆化搜索用于状态复杂的题目
3. 注意递归深度限制（通常 10^6 会栈溢出）
```

### 工程中

```
1. 优先可读性和可维护性
2. 小规模数据用哪种都行
3. 大规模数据用递推 + 空间优化
```

## 混合策略

有时候可以结合两种方法的优点。

### 策略一：先记忆化后递推

```
1. 先用记忆化搜索理清思路，确保正确
2. 然后转换为递推，优化性能
3. 最后尝试空间优化
```

### 策略二：主体递推 + 边界记忆化

```typescript
// 主体用递推（高效）
// 复杂的边界情况用记忆化处理（方便）
```

## 经典对比案例

### 案例：编辑距离

**记忆化搜索版本**

```typescript
function minDistance(word1: string, word2: string): number {
  const m = word1.length, n = word2.length;
  const memo: number[][] = Array.from({ length: m }, () => 
    new Array(n).fill(-1)
  );
  
  function dp(i: number, j: number): number {
    // 边界情况
    if (i === m) return n - j;
    if (j === n) return m - i;
    
    if (memo[i][j] !== -1) return memo[i][j];
    
    if (word1[i] === word2[j]) {
      memo[i][j] = dp(i + 1, j + 1);
    } else {
      memo[i][j] = 1 + Math.min(
        dp(i + 1, j),     // 删除
        dp(i, j + 1),     // 插入
        dp(i + 1, j + 1)  // 替换
      );
    }
    
    return memo[i][j];
  }
  
  return dp(0, 0);
}
```

**递推版本**

```typescript
function minDistance(word1: string, word2: string): number {
  const m = word1.length, n = word2.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => 
    new Array(n + 1).fill(0)
  );
  
  // 初始化边界
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  
  // 递推
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (word1[i - 1] === word2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(
          dp[i - 1][j],
          dp[i][j - 1],
          dp[i - 1][j - 1]
        );
      }
    }
  }
  
  return dp[m][n];
}
```

**递推 + 空间优化版本**

```typescript
function minDistance(word1: string, word2: string): number {
  const m = word1.length, n = word2.length;
  let prev = new Array(n + 1).fill(0);
  let curr = new Array(n + 1).fill(0);
  
  // 初始化第一行
  for (let j = 0; j <= n; j++) prev[j] = j;
  
  for (let i = 1; i <= m; i++) {
    curr[0] = i;  // 第一列
    for (let j = 1; j <= n; j++) {
      if (word1[i - 1] === word2[j - 1]) {
        curr[j] = prev[j - 1];
      } else {
        curr[j] = 1 + Math.min(prev[j], curr[j - 1], prev[j - 1]);
      }
    }
    [prev, curr] = [curr, prev];
  }
  
  return prev[n];
}
```

## 本章小结

1. **记忆化搜索适合**：状态转移复杂、子问题稀疏、不确定计算顺序
2. **递推适合**：需要空间优化、追求性能、防止栈溢出、需要输出路径
3. **实际建议**：先保证正确（记忆化简单），再追求高效（递推优化）
4. **不要纠结**：两种方法本质等价，选择你更熟练的

下一章开始，我们将通过实战题目来巩固记忆化搜索和递推的写法。
