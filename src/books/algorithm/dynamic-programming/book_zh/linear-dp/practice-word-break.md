# 实战：单词拆分

单词拆分是线性 DP 的经典应用，结合了字符串处理和动态规划。

## 题目描述

给你一个字符串 `s` 和一个字符串列表 `wordDict` 作为字典。如果可以利用字典中出现的一个或多个单词拼接出 `s` 则返回 `true`。

**注意**：拆分时可以重复使用字典中的单词。

📎 [LeetCode 139. 单词拆分](https://leetcode.cn/problems/word-break/)

**示例**：

```
输入：s = "leetcode", wordDict = ["leet", "code"]
输出：true
解释："leetcode" 可以拆分为 "leet code"

输入：s = "applepenapple", wordDict = ["apple", "pen"]
输出：true
解释："applepenapple" 可以拆分为 "apple pen apple"

输入：s = "catsandog", wordDict = ["cats", "dog", "sand", "and", "cat"]
输出：false
```

**约束**：
- `1 <= s.length <= 300`
- `1 <= wordDict.length <= 1000`
- `1 <= wordDict[i].length <= 20`
- `s` 和 `wordDict[i]` 仅由小写英文字母组成
- `wordDict` 中的所有字符串互不相同

## 思路分析

### 问题建模

把字符串 `s` 想象成一段路程，每个单词是一块跳板。问题变成：能否从起点跳到终点？

```
s = "leetcode"

  l  e  e  t  c  o  d  e
  ↑        ↑           ↑
  0        4           8
  起点     跳板        终点
       [leet]    [code]
```

### 状态定义

`dp[i]` = `s[0..i-1]`（前 i 个字符）能否被拆分

为什么用"前 i 个"而不是"以 i 结尾"？因为我们关心的是前缀能否被完整拆分，而不是某个子串的性质。

### 状态转移

`dp[i] = true` 当且仅当存在某个 `j < i`，使得：
1. `dp[j] = true`（前 j 个字符可以被拆分）
2. `s[j..i-1]` 在字典中（第 j+1 到第 i 个字符组成的单词存在）

```
dp[i] = OR(dp[j] && wordDict.has(s[j..i-1])) for all j < i
```

### 图示理解

```
s = "leetcode"
wordDict = ["leet", "code"]

dp[0] = true   // 空串
dp[1] = false  // "l" 不在字典
dp[2] = false  // "le" 不在字典
dp[3] = false  // "lee" 不在字典
dp[4] = true   // dp[0] && "leet" 在字典
dp[5] = false  // "c" 不在，"leetc" 不在
dp[6] = false  // ...
dp[7] = false  // ...
dp[8] = true   // dp[4] && "code" 在字典
```

## 解法一：递推

```typescript
/**
 * 递推
 * 时间复杂度：O(n² * m)，m 是单词平均长度
 * 空间复杂度：O(n + k)，k 是字典大小
 */
function wordBreak(s: string, wordDict: string[]): boolean {
  const n = s.length;
  const wordSet = new Set(wordDict);
  const dp = new Array(n + 1).fill(false);
  
  dp[0] = true;  // 空串可以被拆分
  
  for (let i = 1; i <= n; i++) {
    for (let j = 0; j < i; j++) {
      // 前 j 个字符可拆分，且 s[j..i-1] 在字典中
      if (dp[j] && wordSet.has(s.slice(j, i))) {
        dp[i] = true;
        break;  // 找到一种方案即可
      }
    }
  }
  
  return dp[n];
}
```

### 优化：限制单词长度

```typescript
function wordBreak(s: string, wordDict: string[]): boolean {
  const n = s.length;
  const wordSet = new Set(wordDict);
  
  // 获取单词的最大长度
  let maxLen = 0;
  for (const word of wordDict) {
    maxLen = Math.max(maxLen, word.length);
  }
  
  const dp = new Array(n + 1).fill(false);
  dp[0] = true;
  
  for (let i = 1; i <= n; i++) {
    // 只检查合理范围内的 j
    for (let j = Math.max(0, i - maxLen); j < i; j++) {
      if (dp[j] && wordSet.has(s.slice(j, i))) {
        dp[i] = true;
        break;
      }
    }
  }
  
  return dp[n];
}
```

## 解法二：记忆化搜索

```typescript
/**
 * 记忆化搜索
 * 时间复杂度：O(n² * m)
 * 空间复杂度：O(n)
 */
function wordBreak(s: string, wordDict: string[]): boolean {
  const wordSet = new Set(wordDict);
  const memo: Map<number, boolean> = new Map();
  
  function canBreak(start: number): boolean {
    // 到达末尾，成功
    if (start === s.length) return true;
    
    // 查备忘录
    if (memo.has(start)) return memo.get(start)!;
    
    // 尝试所有可能的切分点
    for (let end = start + 1; end <= s.length; end++) {
      const word = s.slice(start, end);
      if (wordSet.has(word) && canBreak(end)) {
        memo.set(start, true);
        return true;
      }
    }
    
    memo.set(start, false);
    return false;
  }
  
  return canBreak(0);
}
```

## 解法三：BFS

把问题看作图的遍历：节点是位置，边是单词。

```typescript
/**
 * BFS
 * 时间复杂度：O(n² * m)
 * 空间复杂度：O(n)
 */
function wordBreak(s: string, wordDict: string[]): boolean {
  const n = s.length;
  const wordSet = new Set(wordDict);
  const visited = new Set<number>();
  const queue: number[] = [0];
  
  while (queue.length > 0) {
    const start = queue.shift()!;
    
    if (visited.has(start)) continue;
    visited.add(start);
    
    for (let end = start + 1; end <= n; end++) {
      if (wordSet.has(s.slice(start, end))) {
        if (end === n) return true;
        queue.push(end);
      }
    }
  }
  
  return false;
}
```

## 变体问题

### 变体一：输出所有拆分方案

📎 [LeetCode 140. 单词拆分 II](https://leetcode.cn/problems/word-break-ii/)

```typescript
function wordBreak(s: string, wordDict: string[]): string[] {
  const wordSet = new Set(wordDict);
  const memo: Map<number, string[]> = new Map();
  
  function backtrack(start: number): string[] {
    if (start === s.length) return [''];
    
    if (memo.has(start)) return memo.get(start)!;
    
    const result: string[] = [];
    
    for (let end = start + 1; end <= s.length; end++) {
      const word = s.slice(start, end);
      if (wordSet.has(word)) {
        const rest = backtrack(end);
        for (const r of rest) {
          result.push(r.length === 0 ? word : word + ' ' + r);
        }
      }
    }
    
    memo.set(start, result);
    return result;
  }
  
  return backtrack(0);
}
```

### 变体二：最少单词数

```typescript
function minWordBreak(s: string, wordDict: string[]): number {
  const n = s.length;
  const wordSet = new Set(wordDict);
  const dp = new Array(n + 1).fill(Infinity);
  
  dp[0] = 0;
  
  for (let i = 1; i <= n; i++) {
    for (let j = 0; j < i; j++) {
      if (dp[j] !== Infinity && wordSet.has(s.slice(j, i))) {
        dp[i] = Math.min(dp[i], dp[j] + 1);
      }
    }
  }
  
  return dp[n] === Infinity ? -1 : dp[n];
}
```

### 变体三：判断能否恰好用 k 个单词

```typescript
function wordBreakK(s: string, wordDict: string[], k: number): boolean {
  const n = s.length;
  const wordSet = new Set(wordDict);
  
  // dp[i][j] = 前 i 个字符能否用恰好 j 个单词拆分
  const dp: boolean[][] = Array.from(
    { length: n + 1 },
    () => new Array(k + 1).fill(false)
  );
  
  dp[0][0] = true;
  
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= Math.min(i, k); j++) {
      for (let p = 0; p < i; p++) {
        if (dp[p][j - 1] && wordSet.has(s.slice(p, i))) {
          dp[i][j] = true;
          break;
        }
      }
    }
  }
  
  return dp[n][k];
}
```

## 复杂度分析

| 解法 | 时间复杂度 | 空间复杂度 |
|-----|-----------|-----------|
| 递推 | O(n² × m) | O(n + k) |
| 记忆化搜索 | O(n² × m) | O(n) |
| BFS | O(n² × m) | O(n) |

其中 n 是字符串长度，m 是单词平均长度，k 是字典大小。

## 易错点

1. **空串处理**：`dp[0] = true`，空串可以被拆分
2. **字符串切片**：`s.slice(j, i)` 是左闭右开区间
3. **单词可重复使用**：同一个单词可以用多次

## 本章小结

1. **状态定义**：`dp[i]` = 前 i 个字符能否被拆分
2. **决策**：枚举最后一个单词的起始位置
3. **转移条件**：前面能拆分 && 最后一段是单词
4. **优化**：限制单词长度范围

**解题技巧**：
- 将字符串问题建模为"跳台阶"
- 使用 Set 加速单词查找
- 记忆化或 DP 避免重复计算
