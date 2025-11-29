# 实战：连接词

这是"单词拆分"的进阶版，要求找出所有由其他单词连接而成的单词。

## 问题描述

给你一个**不含重复**单词的字符串数组`words`，返回其中所有的**连接词**。

连接词的定义：完全由给定数组中的至少两个较短单词连接而成的字符串。

**示例**：
```
words = ["cat","cats","catsdogcats","dog","dogcatsdog","hippopotamuses","rat","ratcatdogcat"]

输出：["catsdogcats","dogcatsdog","ratcatdogcat"]

解释：
- "catsdogcats" = "cats" + "dog" + "cats"
- "dogcatsdog" = "dog" + "cats" + "dog"
- "ratcatdogcat" = "rat" + "cat" + "dog" + "cat"
```

## 思路分析

这道题结合了**Trie**和**动态规划**：

1. 把所有单词按长度排序（短的先处理）
2. 对每个单词，检查它是否能由之前的单词拼接而成
3. 如果不能，把它加入Trie；如果能，加入结果

### 为什么要按长度排序？

"连接词"必须由**较短**的单词组成。按长度排序后，处理某个单词时，所有可能组成它的单词都已经在Trie中了。

## 完整实现

```javascript
class TrieNode {
    constructor() {
        this.children = {};
        this.isEnd = false;
    }
}

/**
 * @param {string[]} words
 * @return {string[]}
 */
function findAllConcatenatedWordsInADict(words) {
    // 1. 按长度排序
    words.sort((a, b) => a.length - b.length);
    
    const root = new TrieNode();
    const result = [];
    
    // Trie插入
    function insert(word) {
        let node = root;
        for (const char of word) {
            if (!node.children[char]) {
                node.children[char] = new TrieNode();
            }
            node = node.children[char];
        }
        node.isEnd = true;
    }
    
    // 检查单词是否能被拆分（类似"单词拆分"问题）
    function canForm(word) {
        if (word.length === 0) return false;
        
        const n = word.length;
        const dp = new Array(n + 1).fill(false);
        dp[0] = true;
        
        for (let i = 0; i < n; i++) {
            if (!dp[i]) continue;
            
            let node = root;
            for (let j = i; j < n; j++) {
                const char = word[j];
                if (!node.children[char]) break;
                
                node = node.children[char];
                if (node.isEnd) {
                    dp[j + 1] = true;
                }
            }
        }
        
        return dp[n];
    }
    
    // 2. 处理每个单词
    for (const word of words) {
        if (word.length === 0) continue;
        
        if (canForm(word)) {
            result.push(word);  // 是连接词
        } else {
            insert(word);  // 不是连接词，加入Trie
        }
    }
    
    return result;
}
```

## 执行过程

```
words = ["cat", "cats", "dog", "catsdogcats"]

排序后：["cat", "dog", "cats", "catsdogcats"]

处理 "cat":
  Trie为空，canForm("cat") = false
  insert("cat")
  Trie: root → c → a → t*

处理 "dog":
  canForm("dog") = false（d不在Trie中）
  insert("dog")
  Trie: root → c → a → t*
             → d → o → g*

处理 "cats":
  canForm("cats"):
    dp[0]=true
    从0开始：c→a→t（isEnd=true），dp[3]=true
    从3开始：s不在Trie中
    dp[4]=false
  canForm = false
  insert("cats")

处理 "catsdogcats":
  canForm("catsdogcats"):
    dp[0]=true
    从0开始：c→a→t（dp[3]=true），c→a→t→s（dp[4]=true）
    从3开始：s不在Trie中
    从4开始：d→o→g（dp[7]=true）
    从7开始：c→a→t（dp[10]=true），c→a→t→s（dp[11]=true）
    dp[11]=true
  canForm = true，加入结果

结果：["catsdogcats"]
```

## 优化：记忆化

对于很长的单词，可以加记忆化避免重复计算：

```javascript
function canForm(word, memo = new Set()) {
    if (word.length === 0) return true;
    if (memo.has(word)) return false;
    
    let node = root;
    for (let i = 0; i < word.length; i++) {
        const char = word[i];
        if (!node.children[char]) break;
        
        node = node.children[char];
        if (node.isEnd) {
            const suffix = word.substring(i + 1);
            if (canForm(suffix, memo)) {
                return true;
            }
        }
    }
    
    memo.add(word);
    return false;
}
```

## 注意事项

### 空字符串处理

空字符串不应该被认为是连接词，需要特殊处理：
```javascript
if (word.length === 0) continue;
```

### "至少两个单词"的要求

连接词必须由**至少两个**较短单词组成。这通过"先处理短单词"自然保证：当检查某个单词时，它自己还没有加入Trie，所以不会用自己拆分自己。

### 相同长度的单词

如果两个单词长度相同，它们之间不能互相拆分。排序保证了这一点：相同长度的单词在同一"批次"处理，互相不可见。

## 复杂度分析

**时间复杂度**：O(n × L²)
- 排序：O(n log n)
- 每个单词的canForm：O(L²)，L是单词长度
- 总计：O(n × L²)

**空间复杂度**：O(n × L)
- Trie存储所有非连接词

## 小结

这道题是"单词拆分"的扩展应用：

1. **排序是关键**：保证处理顺序正确
2. **Trie + DP**：高效判断单词能否被拆分
3. **增量构建**：边判断边构建Trie

掌握这道题，你就能处理大多数Trie + DP的组合问题了。
