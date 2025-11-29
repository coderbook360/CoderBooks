# 字典树的应用场景

上一章我们学习了字典树的基本结构和操作。这一章深入探讨字典树的各种应用场景，以及如何根据需求扩展基础实现。

## 场景一：自动补全

搜索引擎、IDE、手机输入法都需要自动补全功能。字典树是实现这个功能的首选数据结构。

### 基本实现

```javascript
class AutoComplete {
    constructor() {
        this.root = new TrieNode();
    }
    
    // 添加单词
    addWord(word) {
        let node = this.root;
        for (const char of word) {
            if (!node.children[char]) {
                node.children[char] = new TrieNode();
            }
            node = node.children[char];
        }
        node.isEnd = true;
        node.word = word;  // 存储完整单词
    }
    
    // 获取以prefix开头的所有单词
    getSuggestions(prefix) {
        let node = this.root;
        
        // 先找到前缀对应的节点
        for (const char of prefix) {
            if (!node.children[char]) {
                return [];
            }
            node = node.children[char];
        }
        
        // DFS收集所有单词
        const result = [];
        this._collect(node, result);
        return result;
    }
    
    _collect(node, result) {
        if (node.isEnd) {
            result.push(node.word);
        }
        for (const child of Object.values(node.children)) {
            this._collect(child, result);
        }
    }
}
```

### 按热度排序

实际应用中，搜索建议需要按热度排序：

```javascript
class TrieNode {
    constructor() {
        this.children = {};
        this.isEnd = false;
        this.word = null;
        this.frequency = 0;  // 搜索频率
    }
}

// 获取建议时按频率排序
getSuggestions(prefix, limit = 10) {
    // ... 找到前缀节点
    const candidates = [];
    this._collect(node, candidates);
    
    // 按频率降序，取前limit个
    candidates.sort((a, b) => b.frequency - a.frequency);
    return candidates.slice(0, limit).map(c => c.word);
}
```

## 场景二：拼写检查

检测单词是否拼写正确，以及提供可能的正确拼写。

### 基本检查

```javascript
isValidWord(word) {
    let node = this.root;
    for (const char of word) {
        if (!node.children[char]) {
            return false;
        }
        node = node.children[char];
    }
    return node.isEnd;
}
```

### 模糊匹配（支持一个错误）

```javascript
findSimilar(word) {
    const result = [];
    
    function dfs(node, pos, word, errors, path) {
        if (errors > 1) return;  // 最多允许1个错误
        
        if (pos === word.length) {
            if (node.isEnd && errors === 1) {
                result.push(path);
            }
            return;
        }
        
        for (const [char, child] of Object.entries(node.children)) {
            if (char === word[pos]) {
                // 匹配，继续
                dfs(child, pos + 1, word, errors, path + char);
            } else {
                // 不匹配，消耗一次错误机会
                dfs(child, pos + 1, word, errors + 1, path + char);
            }
        }
    }
    
    dfs(this.root, 0, word, 0, '');
    return result;
}
```

## 场景三：词频统计

统计文本中每个单词出现的次数：

```javascript
class WordCounter {
    constructor() {
        this.root = new TrieNode();
    }
    
    addWord(word) {
        let node = this.root;
        for (const char of word) {
            if (!node.children[char]) {
                node.children[char] = new TrieNode();
            }
            node = node.children[char];
        }
        node.count = (node.count || 0) + 1;
    }
    
    getCount(word) {
        let node = this.root;
        for (const char of word) {
            if (!node.children[char]) return 0;
            node = node.children[char];
        }
        return node.count || 0;
    }
    
    // 获取出现次数最多的k个单词
    topK(k) {
        const words = [];
        
        function dfs(node, path) {
            if (node.count) {
                words.push({ word: path, count: node.count });
            }
            for (const [char, child] of Object.entries(node.children)) {
                dfs(child, path + char);
            }
        }
        
        dfs(this.root, '');
        words.sort((a, b) => b.count - a.count);
        return words.slice(0, k);
    }
}
```

## 场景四：通配符匹配

支持`.`匹配任意单个字符：

```javascript
searchWithWildcard(pattern) {
    function dfs(node, pos) {
        if (pos === pattern.length) {
            return node.isEnd;
        }
        
        const char = pattern[pos];
        
        if (char === '.') {
            // 通配符：尝试所有子节点
            for (const child of Object.values(node.children)) {
                if (dfs(child, pos + 1)) {
                    return true;
                }
            }
            return false;
        } else {
            // 普通字符：精确匹配
            if (!node.children[char]) return false;
            return dfs(node.children[char], pos + 1);
        }
    }
    
    return dfs(this.root, 0);
}
```

## 场景五：最长公共前缀

找一组字符串的最长公共前缀：

```javascript
function longestCommonPrefix(words) {
    if (words.length === 0) return '';
    
    const trie = new Trie();
    for (const word of words) {
        trie.insert(word);
    }
    
    let prefix = '';
    let node = trie.root;
    
    while (true) {
        const children = Object.keys(node.children);
        
        // 只有一个子节点且当前节点不是单词结尾
        if (children.length === 1 && !node.isEnd) {
            const char = children[0];
            prefix += char;
            node = node.children[char];
        } else {
            break;
        }
    }
    
    return prefix;
}
```

## 字典树的变体

### 压缩字典树（Patricia Trie）

当某个节点只有一个子节点时，将它们合并：

```
普通Trie:    压缩Trie:
   r           romane
  /             / \
 o           ulus  -ic
 |             |    |
 m          -us   ation
 |
 a
/|\
...
```

优点是节省空间，缺点是实现更复杂。

### 后缀树

将字符串的所有后缀插入字典树，用于字符串匹配算法。

### 双数组字典树

使用两个数组表示字典树，空间更紧凑，查询更快，常用于分词系统。

## 性能优化技巧

1. **使用数组代替Map**：如果字符集固定（如只有小写字母），用数组更快
2. **懒删除**：标记删除而不是真正删除节点
3. **内存池**：预分配节点，减少内存分配开销
4. **持久化**：将字典树序列化到磁盘，支持大规模数据

## 小结

字典树的应用远不止基本的插入和查找：

- **自动补全**：搜索建议、代码提示
- **拼写检查**：检测和修正错误
- **词频统计**：文本分析
- **通配符匹配**：模式搜索
- **公共前缀**：字符串处理

理解这些应用场景，能帮助你在实际开发中选择合适的数据结构。接下来我们通过实战题目来巩固这些知识。
