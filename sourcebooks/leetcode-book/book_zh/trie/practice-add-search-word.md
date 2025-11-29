# 实战：添加与搜索单词

这道题在基础Trie上增加了**通配符**支持，考察你对DFS和回溯的理解。

## 问题描述

设计一个数据结构，支持添加新单词和查找字符串是否与之前添加的单词匹配。

实现`WordDictionary`类：
- `void addWord(word)` 将word添加到数据结构中
- `bool search(word)` 如果存在与word匹配的字符串则返回true，否则返回false。word中可能包含`.`，`.`可以表示任何一个字母

**示例**：
```
WordDictionary wordDictionary = new WordDictionary();
wordDictionary.addWord("bad");
wordDictionary.addWord("dad");
wordDictionary.addWord("mad");
wordDictionary.search("pad"); // false
wordDictionary.search("bad"); // true
wordDictionary.search(".ad"); // true（匹配bad, dad, mad）
wordDictionary.search("b.."); // true（匹配bad）
```

## 思路分析

### addWord：标准Trie插入

和普通Trie完全一样，没有什么特殊处理。

### search：需要处理通配符

当遇到`.`时，不能确定走哪条路，需要**尝试所有可能的子节点**——这就是回溯！

```
Trie结构（插入bad, dad, mad后）：
        root
       / | \
      b  d  m
      |  |  |
      a  a  a
      |  |  |
      d* d* d*

搜索".ad"：
在root，遇到'.'，尝试所有子节点(b, d, m)
  从b走：b→a→d，找到了！返回true
```

## 完整实现

```javascript
class TrieNode {
    constructor() {
        this.children = {};
        this.isEnd = false;
    }
}

class WordDictionary {
    constructor() {
        this.root = new TrieNode();
    }
    
    /**
     * 添加单词 - 标准Trie插入
     * @param {string} word
     * @return {void}
     */
    addWord(word) {
        let node = this.root;
        for (const char of word) {
            if (!node.children[char]) {
                node.children[char] = new TrieNode();
            }
            node = node.children[char];
        }
        node.isEnd = true;
    }
    
    /**
     * 搜索单词，支持通配符'.'
     * @param {string} word
     * @return {boolean}
     */
    search(word) {
        return this._searchHelper(word, 0, this.root);
    }
    
    /**
     * 递归搜索辅助函数
     */
    _searchHelper(word, index, node) {
        // 基础情况：搜索完成
        if (index === word.length) {
            return node.isEnd;
        }
        
        const char = word[index];
        
        if (char === '.') {
            // 通配符：尝试所有子节点
            for (const child of Object.values(node.children)) {
                if (this._searchHelper(word, index + 1, child)) {
                    return true;  // 找到一个匹配就返回
                }
            }
            return false;  // 所有路径都不匹配
        } else {
            // 普通字符：精确匹配
            if (!node.children[char]) {
                return false;
            }
            return this._searchHelper(word, index + 1, node.children[char]);
        }
    }
}
```

## 执行过程详解

```
添加 "bad", "dad", "mad" 后的Trie：

        root
       / | \
      b  d  m
      |  |  |
      a  a  a
      |  |  |
      d* d* d*

搜索 ".ad"：

_searchHelper(".ad", 0, root)
  char = '.', 是通配符
  尝试子节点 b:
    _searchHelper(".ad", 1, b_node)
      char = 'a', 精确匹配
      _searchHelper(".ad", 2, a_node)
        char = 'd', 精确匹配
        _searchHelper(".ad", 3, d_node)
          index === length，检查 d_node.isEnd = true
          返回 true
      返回 true
    返回 true
  返回 true

搜索 "b.."：

_searchHelper("b..", 0, root)
  char = 'b', 精确匹配，进入b节点
  _searchHelper("b..", 1, b_node)
    char = '.', 尝试所有子节点（只有a）
    _searchHelper("b..", 2, a_node)
      char = '.', 尝试所有子节点（只有d）
      _searchHelper("b..", 3, d_node)
        index === length，检查 d_node.isEnd = true
        返回 true
```

## 数组实现优化

```javascript
class TrieNode {
    constructor() {
        this.children = new Array(26).fill(null);
        this.isEnd = false;
    }
}

class WordDictionary {
    constructor() {
        this.root = new TrieNode();
    }
    
    addWord(word) {
        let node = this.root;
        for (const char of word) {
            const idx = char.charCodeAt(0) - 97;
            if (!node.children[idx]) {
                node.children[idx] = new TrieNode();
            }
            node = node.children[idx];
        }
        node.isEnd = true;
    }
    
    search(word) {
        return this._dfs(word, 0, this.root);
    }
    
    _dfs(word, index, node) {
        if (index === word.length) {
            return node.isEnd;
        }
        
        const char = word[index];
        
        if (char === '.') {
            // 遍历所有可能的子节点
            for (let i = 0; i < 26; i++) {
                if (node.children[i] && this._dfs(word, index + 1, node.children[i])) {
                    return true;
                }
            }
            return false;
        } else {
            const idx = char.charCodeAt(0) - 97;
            if (!node.children[idx]) return false;
            return this._dfs(word, index + 1, node.children[idx]);
        }
    }
}
```

## 复杂度分析

**addWord**：
- 时间：O(m)，m是单词长度
- 空间：O(m)

**search**：
- 时间：最坏O(26^m)，当模式全是`.`时需要遍历所有路径
- 平均情况取决于`.`的数量和位置

**总空间**：O(n × m)，n是单词数，m是平均长度

## 优化思路

如果查询很频繁，可以按长度分组存储单词，减少无效搜索：

```javascript
class WordDictionary {
    constructor() {
        this.root = new TrieNode();
        this.wordsByLength = {};  // 按长度分组
    }
    
    addWord(word) {
        // 标准插入...
        
        // 额外记录长度
        const len = word.length;
        if (!this.wordsByLength[len]) {
            this.wordsByLength[len] = [];
        }
        this.wordsByLength[len].push(word);
    }
    
    search(word) {
        // 如果该长度没有单词，直接返回false
        if (!this.wordsByLength[word.length]) {
            return false;
        }
        return this._dfs(word, 0, this.root);
    }
}
```

## 小结

这道题的关键：

1. **addWord是标准Trie**：没有特殊处理
2. **search需要回溯**：遇到`.`时尝试所有可能
3. **提前返回**：一旦找到匹配就返回true
4. **注意边界**：必须完全匹配，不能多也不能少

通配符匹配是Trie的常见扩展，理解了这道题，后面的题目会更容易。
