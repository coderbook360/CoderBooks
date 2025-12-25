# 实战：最长字符串链

## 题目描述

给出一个单词数组 `words`，其中每个单词都由小写英文字母组成。

如果我们可以**不改变其他字符的顺序**，在 `wordA` 的任何地方添加**恰好一个**字母使其变成 `wordB`，那么我们认为 `wordA` 是 `wordB` 的**前身**。

从给定单词列表 `words` 中选择单词组成词链，返回词链的**最长可能长度**。

📎 [LeetCode 1048. 最长字符串链](https://leetcode.cn/problems/longest-string-chain/)

**示例**：

```
输入：words = ["a", "b", "ba", "bca", "bda", "bdca"]
输出：4
解释：最长词链是 "a" -> "ba" -> "bda" -> "bdca"
```

## 思路分析

这本质上是 **LIS 的变种**：
- LIS：数字大小关系
- 本题：字符串的"前身"关系

**核心思路**：
1. 按字符串长度排序
2. 对于每个字符串，检查它的所有可能前身
3. 用 DP 或记忆化搜索求最长链

## 方法一：排序 + DP

```typescript
/**
 * 最长字符串链
 * 时间复杂度：O(n × L² × log n)，L 是平均字符串长度
 * 空间复杂度：O(n × L)
 */
function longestStrChain(words: string[]): number {
  // 按长度排序
  words.sort((a, b) => a.length - b.length);
  
  // dp[word] = 以 word 结尾的最长链长度
  const dp = new Map<string, number>();
  let maxLen = 1;
  
  for (const word of words) {
    dp.set(word, 1);  // 至少包含自己
    
    // 尝试删除每个字符，看能否找到前身
    for (let i = 0; i < word.length; i++) {
      const prev = word.slice(0, i) + word.slice(i + 1);
      
      if (dp.has(prev)) {
        const newLen = dp.get(prev)! + 1;
        dp.set(word, Math.max(dp.get(word)!, newLen));
      }
    }
    
    maxLen = Math.max(maxLen, dp.get(word)!);
  }
  
  return maxLen;
}
```

## 方法二：记忆化搜索

```typescript
function longestStrChain(words: string[]): number {
  const wordSet = new Set(words);
  const memo = new Map<string, number>();
  
  function dfs(word: string): number {
    if (memo.has(word)) return memo.get(word)!;
    
    let maxLen = 1;
    
    // 尝试删除每个字符
    for (let i = 0; i < word.length; i++) {
      const prev = word.slice(0, i) + word.slice(i + 1);
      
      if (wordSet.has(prev)) {
        maxLen = Math.max(maxLen, dfs(prev) + 1);
      }
    }
    
    memo.set(word, maxLen);
    return maxLen;
  }
  
  let result = 0;
  for (const word of words) {
    result = Math.max(result, dfs(word));
  }
  
  return result;
}
```

## 示例演算

以 `words = ["a", "b", "ba", "bca", "bda", "bdca"]` 为例：

排序后（按长度）：`["a", "b", "ba", "bca", "bda", "bdca"]`

| 单词 | 前身候选 | dp 值 |
|------|---------|-------|
| "a" | - | 1 |
| "b" | - | 1 |
| "ba" | "a"✓, "b"✓ | 2 |
| "bca" | "ba"✓, "ca"✗, "bc"✗ | 3 |
| "bda" | "ba"✓, "da"✗, "bd"✗ | 3 |
| "bdca" | "dca"✗, "bca"✓, "bda"✓, "bdc"✗ | 4 |

最长链：4（"a" -> "ba" -> "bda" -> "bdca"）

## 关键：如何检查前身

**方式一**：从当前单词删除一个字符，检查是否在列表中

```typescript
// 删除第 i 个字符
const prev = word.slice(0, i) + word.slice(i + 1);
if (wordSet.has(prev)) { ... }
```

**方式二**：向前身添加一个字符，检查是否等于当前单词

```typescript
// 这种方式效率较低，不推荐
for (const prev of words) {
  if (prev.length + 1 === word.length && isPredecessor(prev, word)) { ... }
}
```

## 优化：按长度分组

```typescript
function longestStrChain(words: string[]): number {
  // 按长度分组
  const byLen = new Map<number, Set<string>>();
  let maxWordLen = 0;
  
  for (const word of words) {
    const len = word.length;
    if (!byLen.has(len)) byLen.set(len, new Set());
    byLen.get(len)!.add(word);
    maxWordLen = Math.max(maxWordLen, len);
  }
  
  const dp = new Map<string, number>();
  let result = 0;
  
  // 从短到长处理
  for (let len = 1; len <= maxWordLen; len++) {
    if (!byLen.has(len)) continue;
    
    for (const word of byLen.get(len)!) {
      dp.set(word, 1);
      
      // 只需检查长度为 len-1 的前身
      if (byLen.has(len - 1)) {
        for (let i = 0; i < word.length; i++) {
          const prev = word.slice(0, i) + word.slice(i + 1);
          if (dp.has(prev)) {
            dp.set(word, Math.max(dp.get(word)!, dp.get(prev)! + 1));
          }
        }
      }
      
      result = Math.max(result, dp.get(word)!);
    }
  }
  
  return result;
}
```

## 与 LIS 的对比

| LIS | 本题 |
|-----|------|
| 数字大小关系 | 字符串前身关系 |
| `nums[j] < nums[i]` | `isPredecessor(wordA, wordB)` |
| O(n²) 或 O(n log n) | O(n × L²) |

## 复杂度分析

| 方法 | 时间复杂度 | 空间复杂度 |
|-----|-----------|-----------|
| 排序 + DP | O(n log n + n × L²) | O(n × L) |
| 记忆化搜索 | O(n × L²) | O(n × L) |

其中 L 是单词的平均长度。

## 本章小结

1. **LIS 变种**：关系从数值大小变为字符串前身
2. **前身检查**：删除一个字符后检查是否存在
3. **排序优化**：按长度排序，确保前身先处理
4. **哈希优化**：用 Set/Map 加速查找
