# 实战：单词拆分

这道题可以用动态规划或者Trie + 记忆化搜索来解决。我们会介绍两种方法，并展示Trie如何优化前缀查找。

## 问题描述

给你一个字符串`s`和一个字符串列表`wordDict`作为字典。如果可以利用字典中的单词拼接出`s`则返回`true`。

**注意**：字典中的单词可以重复使用。

**示例**：
```
s = "leetcode"
wordDict = ["leet","code"]
输出: true
解释: "leetcode" = "leet" + "code"

s = "applepenapple"
wordDict = ["apple","pen"]
输出: true
解释: "applepenapple" = "apple" + "pen" + "apple"

s = "catsandog"
wordDict = ["cats","dog","sand","and","cat"]
输出: false
```

## 思路分析

### 核心问题

从位置0开始，如果`s[0...i]`是字典中的单词，那么问题变成：从位置`i+1`开始，剩余部分能否被拆分？

这是典型的**动态规划**或**递归 + 记忆化**问题。

### 状态定义

`dp[i]` = 从位置i开始的子串能否被字典中的单词拆分

或者

`dp[i]` = s的前i个字符能否被拆分

## 解法一：动态规划 + HashSet

```javascript
/**
 * @param {string} s
 * @param {string[]} wordDict
 * @return {boolean}
 */
function wordBreak(s, wordDict) {
    const wordSet = new Set(wordDict);
    const n = s.length;
    
    // dp[i] 表示 s[0..i-1] 能否被拆分
    const dp = new Array(n + 1).fill(false);
    dp[0] = true;  // 空字符串可以被"拆分"
    
    for (let i = 1; i <= n; i++) {
        for (let j = 0; j < i; j++) {
            // 如果 s[0..j-1] 可以拆分，且 s[j..i-1] 在字典中
            if (dp[j] && wordSet.has(s.substring(j, i))) {
                dp[i] = true;
                break;
            }
        }
    }
    
    return dp[n];
}
```

## 解法二：Trie + 动态规划

用Trie可以更高效地检查"某个位置开始是否有字典中的单词"：

```javascript
class TrieNode {
    constructor() {
        this.children = {};
        this.isEnd = false;
    }
}

function wordBreak(s, wordDict) {
    // 1. 构建Trie
    const root = new TrieNode();
    for (const word of wordDict) {
        let node = root;
        for (const char of word) {
            if (!node.children[char]) {
                node.children[char] = new TrieNode();
            }
            node = node.children[char];
        }
        node.isEnd = true;
    }
    
    const n = s.length;
    const dp = new Array(n + 1).fill(false);
    dp[0] = true;
    
    // 2. 动态规划
    for (let i = 0; i < n; i++) {
        if (!dp[i]) continue;  // 如果位置i不可达，跳过
        
        // 从位置i开始，在Trie中查找所有匹配的单词
        let node = root;
        for (let j = i; j < n; j++) {
            const char = s[j];
            if (!node.children[char]) {
                break;  // Trie中没有这条路
            }
            node = node.children[char];
            if (node.isEnd) {
                dp[j + 1] = true;  // 找到一个单词，标记位置j+1可达
            }
        }
    }
    
    return dp[n];
}
```

## 解法三：记忆化递归

```javascript
function wordBreak(s, wordDict) {
    const wordSet = new Set(wordDict);
    const memo = new Map();
    
    function canBreak(start) {
        if (start === s.length) return true;
        if (memo.has(start)) return memo.get(start);
        
        for (let end = start + 1; end <= s.length; end++) {
            const word = s.substring(start, end);
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

## 执行过程

```
s = "leetcode"
wordDict = ["leet", "code"]

DP过程：
dp = [true, false, false, false, false, false, false, false, false]
     位置:  0     1     2     3     4     5     6     7     8

i=0 (dp[0]=true):
  检查 s[0..0]="l" → 不在字典
  检查 s[0..1]="le" → 不在字典
  检查 s[0..2]="lee" → 不在字典
  检查 s[0..3]="leet" → 在字典！dp[4]=true

i=1,2,3: dp[i]=false，跳过

i=4 (dp[4]=true):
  检查 s[4..4]="c" → 不在字典
  检查 s[4..5]="co" → 不在字典
  检查 s[4..6]="cod" → 不在字典
  检查 s[4..7]="code" → 在字典！dp[8]=true

dp[8] = true，返回true
```

## Trie的优势

当字典很大时，Trie的优势体现在：

1. **前缀剪枝**：如果某个前缀在Trie中不存在，可以提前停止
2. **共享前缀**：类似的单词共享Trie路径，节省空间
3. **一次遍历**：从位置i开始，一次遍历就能找到所有匹配的单词

例如，字典有`["a", "aa", "aaa", "aaaa"]`：
- HashSet方案：需要分别检查每个长度
- Trie方案：沿着Trie走，遇到单词结尾就标记

## 复杂度分析

| 解法 | 时间复杂度 | 空间复杂度 |
|------|-----------|-----------|
| DP + HashSet | O(n² × m) | O(n) |
| DP + Trie | O(n × L) | O(D × L) |
| 记忆化递归 | O(n² × m) | O(n) |

其中n是字符串长度，m是单词平均长度，L是最长单词长度，D是字典大小。

## 小结

这道题有多种解法，选择取决于具体场景：

1. **DP + HashSet**：最直观，代码简单
2. **DP + Trie**：字典很大时更高效
3. **记忆化递归**：思路直接，容易理解

关键洞察：这是一个**可达性问题**——从起点出发，能否通过字典中的单词"跳"到终点。每个单词是一条边，动态规划就是在计算哪些位置可达。
