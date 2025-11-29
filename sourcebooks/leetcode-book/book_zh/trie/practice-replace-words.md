# 实战：替换单词

这道题是Trie的经典应用——用Trie快速找到最短前缀。

## 问题描述

在英语中，有一个叫做"词根"的概念，可以在其后添加字母来组成更长的单词。例如，"an"是"another"的词根。

给你一个词根字典`dictionary`和一个句子`sentence`，句子由空格分隔的单词组成。如果单词有词根在字典中，就用词根替换它。如果有多个词根匹配，用**最短**的那个。

**示例**：
```
dictionary = ["cat","bat","rat"]
sentence = "the cattle was rattled by the battery"
输出: "the cat was rat by the bat"

解释：
- cattle → cat（词根）
- rattled → rat（词根）
- battery → bat（词根）
```

## 思路分析

### 暴力思路

对每个单词，遍历字典检查是否以某个词根开头。时间复杂度O(n × d × m)，其中n是单词数，d是词根数，m是词根平均长度。

### Trie优化

1. 把所有词根插入Trie
2. 对每个单词，在Trie中找最短匹配的词根
3. 找到就替换，没找到就保留原单词

Trie的优势在于：找最短词根只需要O(m)时间，不需要遍历整个字典。

## 完整实现

```javascript
class TrieNode {
    constructor() {
        this.children = {};
        this.word = null;  // 存储词根
    }
}

/**
 * @param {string[]} dictionary
 * @param {string} sentence
 * @return {string}
 */
function replaceWords(dictionary, sentence) {
    // 1. 构建Trie
    const root = new TrieNode();
    for (const word of dictionary) {
        let node = root;
        for (const char of word) {
            if (!node.children[char]) {
                node.children[char] = new TrieNode();
            }
            node = node.children[char];
        }
        node.word = word;
    }
    
    // 2. 查找最短词根
    function findRoot(word) {
        let node = root;
        for (const char of word) {
            // 找到一个词根就立即返回（最短优先）
            if (node.word) {
                return node.word;
            }
            // 没有匹配的路径
            if (!node.children[char]) {
                return word;  // 返回原单词
            }
            node = node.children[char];
        }
        // 整个单词遍历完，检查是否本身就是词根
        return node.word || word;
    }
    
    // 3. 处理句子
    const words = sentence.split(' ');
    return words.map(findRoot).join(' ');
}
```

## 关键点：最短词根

在`findRoot`中，我们在遍历过程中**一旦发现词根就立即返回**：

```javascript
if (node.word) {
    return node.word;  // 找到最短词根
}
```

这保证了返回的是最短的词根。

例如，如果字典有`["a", "ap", "app"]`，单词是"apple"：
- 走到'a'节点，发现是词根，立即返回"a"
- 不会继续找"ap"或"app"

## 执行过程

```
dictionary = ["cat", "bat", "rat"]
sentence = "the cattle was rattled"

Trie:
        root
       / | \
      c  b  r
      |  |  |
      a  a  a
      |  |  |
      t* t* t*

处理 "cattle":
  c → a → t (找到词根"cat") → 返回"cat"

处理 "rattled":
  r → a → t (找到词根"rat") → 返回"rat"

处理 "the":
  没有t开头的词根 → 返回"the"

结果: "the cat was rat"
```

## 不用Trie的解法（对比）

用Set和字符串切片：

```javascript
function replaceWords(dictionary, sentence) {
    const rootSet = new Set(dictionary);
    
    function findRoot(word) {
        for (let i = 1; i <= word.length; i++) {
            const prefix = word.substring(0, i);
            if (rootSet.has(prefix)) {
                return prefix;
            }
        }
        return word;
    }
    
    return sentence.split(' ').map(findRoot).join(' ');
}
```

这个解法也能通过，但时间复杂度略高：每个单词要尝试O(m)次Set查询。

## 复杂度分析

**Trie解法**：
- 构建Trie：O(d × k)，d是词根数，k是平均长度
- 处理句子：O(n × m)，n是单词数，m是平均长度
- 总计：O(d × k + n × m)

**空间复杂度**：O(d × k) 存储Trie

## 小结

这道题展示了Trie的一个典型应用：**前缀匹配**。

关键技巧：
1. **早停策略**：找到最短词根就停止
2. **节点存储完整单词**：方便返回结果
3. **处理边界**：单词本身就是词根的情况

Trie在处理"最短前缀"、"最长前缀"这类问题时特别高效，因为它天然支持按前缀长度遍历。
