# 正则表达式匹配

## 题目描述

**LeetCode 10. Regular Expression Matching**

给你一个字符串 s 和一个字符规律 p，请你来实现一个支持 '.' 和 '*' 的正则表达式匹配。

- '.' 匹配任意单个字符
- '*' 匹配零个或多个前面的那一个元素

所谓匹配，是要涵盖整个字符串 s 的，而不是部分字符串。

**示例 1**：
```
输入：s = "aa", p = "a"
输出：false
解释："a" 无法匹配 "aa" 整个字符串。
```

**示例 2**：
```
输入：s = "aa", p = "a*"
输出：true
解释：'*' 代表可以匹配零个或多个前面的那一个元素，即可以匹配 'a'。
因此，"a*" 可以匹配 "aa"。
```

**示例 3**：
```
输入：s = "ab", p = ".*"
输出：true
解释：".*" 表示可匹配零个或多个（'*'）任意字符（'.'）。
```

**约束**：
- `1 <= s.length <= 20`
- `1 <= p.length <= 20`
- s 只包含小写英文字母
- p 只包含小写英文字母、'.' 和 '*'
- 保证每次出现字符 '*' 时，前面都匹配到有效的字符

## 思路分析

### 匹配规则

1. **普通字符**：必须完全相等
2. **'.'**：匹配任意单个字符
3. **'x*'**：匹配零个或多个 'x'（x 可以是任意字符或 '.'）

### 状态定义

`dp[i][j]` = s 的前 i 个字符是否能被 p 的前 j 个字符匹配

### 状态转移

关键是处理 '*'，需要看 p[j-1]（当前字符）是什么：

**Case 1：p[j-1] 不是 '*'**

```
dp[i][j] = match(s[i-1], p[j-1]) && dp[i-1][j-1]
```

其中 `match(a, b)` 表示单字符匹配：
```
match(a, b) = (a == b) || (b == '.')
```

**Case 2：p[j-1] 是 '*'**

'*' 可以让前面的字符出现 0 次或多次：
- **匹配 0 次**：忽略 `x*`，dp[i][j] = dp[i][j-2]
- **匹配 1+ 次**：s[i-1] 被 x 匹配，dp[i][j] = match(s[i-1], p[j-2]) && dp[i-1][j]

```
dp[i][j] = dp[i][j-2]  // 匹配 0 次
        || (match(s[i-1], p[j-2]) && dp[i-1][j])  // 匹配 1+ 次
```

### 边界条件

- `dp[0][0] = true`（空串匹配空模式）
- `dp[0][j]`：空串能否被 p 的前 j 个字符匹配
  - 只有 `x*` 这种模式可以匹配空串
  - `dp[0][j] = dp[0][j-2]` if `p[j-1] == '*'`

## 解法一：标准 DP

```typescript
function isMatch(s: string, p: string): boolean {
  const m = s.length;
  const n = p.length;
  
  // dp[i][j] = s[0..i) 是否匹配 p[0..j)
  const dp = Array.from(
    { length: m + 1 },
    () => Array(n + 1).fill(false)
  );
  
  // 空串匹配空模式
  dp[0][0] = true;
  
  // 空串 vs 非空模式（处理 x* 这种可以匹配空串的情况）
  for (let j = 2; j <= n; j++) {
    if (p[j - 1] === '*') {
      dp[0][j] = dp[0][j - 2];
    }
  }
  
  // 单字符匹配
  const matches = (i: number, j: number): boolean => {
    if (i === 0) return false;
    if (p[j - 1] === '.') return true;
    return s[i - 1] === p[j - 1];
  };
  
  // 填表
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (p[j - 1] === '*') {
        // x* 匹配 0 次或多次
        dp[i][j] = dp[i][j - 2]  // 0 次
                || (matches(i, j - 1) && dp[i - 1][j]);  // 1+ 次
      } else {
        // 普通字符或 '.'
        dp[i][j] = matches(i, j) && dp[i - 1][j - 1];
      }
    }
  }
  
  return dp[m][n];
}
```

**复杂度分析**：
- 时间：O(mn)
- 空间：O(mn)

## 解法二：记忆化搜索

更直观的递归写法：

```typescript
function isMatch(s: string, p: string): boolean {
  const memo = new Map<string, boolean>();
  
  function dp(i: number, j: number): boolean {
    // 模式用完
    if (j === p.length) {
      return i === s.length;
    }
    
    const key = `${i},${j}`;
    if (memo.has(key)) return memo.get(key)!;
    
    // 当前字符是否匹配
    const firstMatch = i < s.length && (s[i] === p[j] || p[j] === '.');
    
    let result: boolean;
    
    if (j + 1 < p.length && p[j + 1] === '*') {
      // 下一个是 *
      result = dp(i, j + 2)  // * 匹配 0 次
            || (firstMatch && dp(i + 1, j));  // * 匹配 1+ 次
    } else {
      // 普通匹配
      result = firstMatch && dp(i + 1, j + 1);
    }
    
    memo.set(key, result);
    return result;
  }
  
  return dp(0, 0);
}
```

## 图解

以 s = "aab", p = "c*a*b" 为例：

```
p = "c*a*b" 可以分解为：
- c* (匹配 0+ 个 c)
- a* (匹配 0+ 个 a)
- b  (匹配 1 个 b)

匹配过程：
s = "aab"
- c* 匹配 0 个 c → 剩余 "aab"
- a* 匹配 2 个 a → 剩余 "b"
- b 匹配 1 个 b → 剩余 ""
匹配成功！
```

DP 表：
```
      ""   c   *   a   *   b
  ""   T   F   T   F   T   F
  a    F   F   F   T   T   F
  a    F   F   F   F   T   F
  b    F   F   F   F   F   T
```

## 与通配符匹配的区别

**LeetCode 44 通配符匹配**：
- `*` 独立，匹配任意字符串
- `?` 匹配单个字符

**LeetCode 10 正则匹配**：
- `*` 依附前一个字符，匹配零个或多个前面的字符
- `.` 匹配单个字符

关键区别：`*` 的语义不同。

## 变体：NFA 实现

正则表达式的经典实现是使用 NFA（非确定有限自动机）：

```typescript
// 简化版 NFA 实现
function isMatchNFA(s: string, p: string): boolean {
  // 构建 NFA 状态
  const n = p.length;
  
  // 计算从每个状态可以通过 ε 转移到达的状态集合
  function epsilonClosure(states: Set<number>): Set<number> {
    const result = new Set(states);
    const stack = [...states];
    
    while (stack.length > 0) {
      const state = stack.pop()!;
      
      // 检查 * 带来的 ε 转移
      if (state < n - 1 && p[state + 1] === '*') {
        // 可以跳过 x*
        if (!result.has(state + 2)) {
          result.add(state + 2);
          stack.push(state + 2);
        }
      }
    }
    
    return result;
  }
  
  // 初始状态集合
  let currentStates = epsilonClosure(new Set([0]));
  
  // 处理每个输入字符
  for (const char of s) {
    const nextStates = new Set<number>();
    
    for (const state of currentStates) {
      if (state >= n) continue;
      
      const pChar = p[state];
      const nextChar = state + 1 < n ? p[state + 1] : '';
      
      if (nextChar === '*') {
        // x* 模式
        if (pChar === '.' || pChar === char) {
          // 可以匹配当前字符，停留在当前状态
          nextStates.add(state);
        }
      } else {
        // 普通字符
        if (pChar === '.' || pChar === char) {
          nextStates.add(state + 1);
        }
      }
    }
    
    currentStates = epsilonClosure(nextStates);
  }
  
  return currentStates.has(n);
}
```

## 相关题目

| 题目 | 难度 | 说明 |
|------|------|------|
| [44. 通配符匹配](https://leetcode.cn/problems/wildcard-matching/) | 困难 | * 语义不同 |
| [72. 编辑距离](https://leetcode.cn/problems/edit-distance/) | 中等 | 字符串DP |
| [115. 不同的子序列](https://leetcode.cn/problems/distinct-subsequences/) | 困难 | 字符串匹配 |
| [97. 交错字符串](https://leetcode.cn/problems/interleaving-string/) | 中等 | 双字符串DP |

## 总结

正则表达式匹配是字符串 DP 的经典题：

1. **状态定义**：dp[i][j] = 前 i 个字符是否匹配前 j 个模式
2. **核心难点**：处理 `*` 的 0 次或多次匹配
3. **转移方程**：
   - 普通字符：必须匹配
   - `*`：选择匹配 0 次或继续匹配

核心洞见：
- `*` 不是独立的，是修饰前一个字符
- 匹配 0 次 = 跳过两个字符（x*）
- 匹配 1+ 次 = 消耗一个 s 字符，模式不动
