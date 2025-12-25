# 实战：交错字符串

## 题目描述

给定三个字符串 `s1`、`s2`、`s3`，请你帮忙验证 `s3` 是否是由 `s1` 和 `s2` **交错** 组成的。

两个字符串 `s` 和 `t` **交错** 的定义与过程如下，其中每个字符串都会被分割成若干**非空**子字符串：

- `s = s1 + s2 + ... + sn`
- `t = t1 + t2 + ... + tm`
- `|n - m| <= 1`
- **交错** 是 `s1 + t1 + s2 + t2 + s3 + t3 + ...` 或者 `t1 + s1 + t2 + s2 + t3 + s3 + ...`

📎 [LeetCode 97. 交错字符串](https://leetcode.cn/problems/interleaving-string/)

**示例**：

```
输入：s1 = "aabcc", s2 = "dbbca", s3 = "aadbbcbcac"
输出：true
解释：
s3 = "aa" + "dbbc" + "bc" + "a" + "c"
   = s1的"aa" + s2的"dbbc" + s1的"bc" + s2的"a" + s1的"c"
```

## 思路分析

这是一个**双序列 DP** 问题，需要判断 s1 和 s2 能否交错形成 s3。

**关键观察**：
- s3 的每个字符要么来自 s1，要么来自 s2
- 来自 s1 和 s2 的字符顺序不能改变

## 状态定义

```
dp[i][j] = s1 的前 i 个字符和 s2 的前 j 个字符能否交错形成 s3 的前 i+j 个字符
```

## 状态转移

```
dp[i][j] = (dp[i-1][j] && s1[i-1] === s3[i+j-1])  // s3 的最后一个来自 s1
        || (dp[i][j-1] && s2[j-1] === s3[i+j-1])  // s3 的最后一个来自 s2
```

## 边界条件

```
dp[0][0] = true  // 空串交错空串得到空串
dp[i][0] = dp[i-1][0] && s1[i-1] === s3[i-1]  // 只用 s1
dp[0][j] = dp[0][j-1] && s2[j-1] === s3[j-1]  // 只用 s2
```

## 代码实现

```typescript
/**
 * 交错字符串
 * 时间复杂度：O(m × n)
 * 空间复杂度：O(m × n)
 */
function isInterleave(s1: string, s2: string, s3: string): boolean {
  const m = s1.length, n = s2.length;
  
  // 长度不匹配，直接返回 false
  if (m + n !== s3.length) return false;
  
  // dp[i][j] = s1[0..i-1] 和 s2[0..j-1] 能否交错成 s3[0..i+j-1]
  const dp: boolean[][] = Array.from(
    { length: m + 1 },
    () => new Array(n + 1).fill(false)
  );
  
  dp[0][0] = true;
  
  // 初始化第一列：只用 s1
  for (let i = 1; i <= m; i++) {
    dp[i][0] = dp[i - 1][0] && s1[i - 1] === s3[i - 1];
  }
  
  // 初始化第一行：只用 s2
  for (let j = 1; j <= n; j++) {
    dp[0][j] = dp[0][j - 1] && s2[j - 1] === s3[j - 1];
  }
  
  // 填表
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const k = i + j - 1;  // s3 的当前位置
      dp[i][j] = (dp[i - 1][j] && s1[i - 1] === s3[k])
              || (dp[i][j - 1] && s2[j - 1] === s3[k]);
    }
  }
  
  return dp[m][n];
}
```

## 空间优化

```typescript
function isInterleave(s1: string, s2: string, s3: string): boolean {
  const m = s1.length, n = s2.length;
  if (m + n !== s3.length) return false;
  
  const dp = new Array(n + 1).fill(false);
  
  for (let i = 0; i <= m; i++) {
    for (let j = 0; j <= n; j++) {
      if (i === 0 && j === 0) {
        dp[j] = true;
      } else if (i === 0) {
        dp[j] = dp[j - 1] && s2[j - 1] === s3[j - 1];
      } else if (j === 0) {
        dp[j] = dp[j] && s1[i - 1] === s3[i - 1];
      } else {
        const k = i + j - 1;
        dp[j] = (dp[j] && s1[i - 1] === s3[k])
             || (dp[j - 1] && s2[j - 1] === s3[k]);
      }
    }
  }
  
  return dp[n];
}
```

## 示例演算

以 `s1 = "aab"`, `s2 = "axy"`, `s3 = "aaxaby"` 为例：

|   | "" | a | x | y |
|---|---|---|---|---|
| "" | T | T | F | F |
| a | T | T | T | F |
| a | T | T | T | F |
| b | F | F | T | **T** |

最终答案：`dp[3][3] = true`

**回溯路径**：
- dp[3][3] 从 dp[3][2] 来（s3[5]='y' 来自 s2）
- dp[3][2] 从 dp[2][2] 来（s3[4]='b' 来自 s1）
- ...

## 方法二：记忆化搜索

```typescript
function isInterleave(s1: string, s2: string, s3: string): boolean {
  const m = s1.length, n = s2.length;
  if (m + n !== s3.length) return false;
  
  const memo = new Map<string, boolean>();
  
  function dfs(i: number, j: number): boolean {
    if (i === m && j === n) return true;
    
    const key = `${i},${j}`;
    if (memo.has(key)) return memo.get(key)!;
    
    const k = i + j;
    let result = false;
    
    // 尝试从 s1 取
    if (i < m && s1[i] === s3[k]) {
      result = result || dfs(i + 1, j);
    }
    
    // 尝试从 s2 取
    if (j < n && s2[j] === s3[k]) {
      result = result || dfs(i, j + 1);
    }
    
    memo.set(key, result);
    return result;
  }
  
  return dfs(0, 0);
}
```

## 状态转移图解

```
s3 的每个字符可以来自 s1 或 s2：

dp[i-1][j] ──→ dp[i][j]  （s3[k] 来自 s1[i-1]）
                  ↑
dp[i][j-1] ──────┘        （s3[k] 来自 s2[j-1]）
```

## 理解"交错"

交错不是简单的拼接，而是保持各自顺序的混合：

```
s1 = "ab"
s2 = "cd"

可能的交错结果：
"abcd" ✓  (a, b, c, d)
"acbd" ✓  (a, c, b, d)
"acdb" ✓  (a, c, d, b)
"cabd" ✓  (c, a, b, d)
"cadb" ✓  (c, a, d, b)
"cdab" ✓  (c, d, a, b)

不是交错：
"bacd" ✗  (b 在 a 之前，违反 s1 的顺序)
```

## 复杂度分析

| 方法 | 时间复杂度 | 空间复杂度 |
|-----|-----------|-----------|
| 二维 DP | O(m × n) | O(m × n) |
| 空间优化 | O(m × n) | O(n) |
| 记忆化搜索 | O(m × n) | O(m × n) |

## 本章小结

1. **三序列问题**：s3 的每个字符来自 s1 或 s2
2. **状态定义**：dp[i][j] 表示前 i+j 个字符能否由前 i 和前 j 交错形成
3. **转移方程**：两种来源取 OR
4. **边界处理**：单独处理只用 s1 或只用 s2 的情况
