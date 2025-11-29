# 实战：实现Trie（前缀树）

这是字典树的入门题，要求你从零实现一个前缀树。掌握这道题，就掌握了字典树的核心。

## 问题描述

实现`Trie`类：
- `Trie()` 初始化前缀树对象
- `void insert(String word)` 向前缀树中插入字符串word
- `boolean search(String word)` 如果字符串word在前缀树中，返回true；否则返回false
- `boolean startsWith(String prefix)` 如果之前已经插入的字符串word的前缀之一为prefix，返回true；否则返回false

**示例**：
```
Trie trie = new Trie();
trie.insert("apple");
trie.search("apple");   // 返回 True
trie.search("app");     // 返回 False
trie.startsWith("app"); // 返回 True
trie.insert("app");
trie.search("app");     // 返回 True
```

## 思路分析

### 核心数据结构

每个节点需要：
1. **子节点映射**：记录当前字符到下一个字符的路径
2. **结束标记**：标识是否有单词在此结束

```javascript
class TrieNode {
    constructor() {
        this.children = {};  // 子节点
        this.isEnd = false;  // 是否是单词结尾
    }
}
```

### 三个操作的本质

- **insert**：沿着路径走，没路就建路，最后标记结束
- **search**：沿着路径走，走完检查结束标记
- **startsWith**：沿着路径走，能走完就行

## 完整实现

```javascript
class TrieNode {
    constructor() {
        this.children = {};
        this.isEnd = false;
    }
}

class Trie {
    constructor() {
        this.root = new TrieNode();
    }
    
    /**
     * 插入单词
     * @param {string} word
     * @return {void}
     */
    insert(word) {
        let node = this.root;
        
        for (const char of word) {
            // 如果没有这个字符的路径，创建新节点
            if (!node.children[char]) {
                node.children[char] = new TrieNode();
            }
            // 移动到下一个节点
            node = node.children[char];
        }
        
        // 标记单词结束
        node.isEnd = true;
    }
    
    /**
     * 查找单词是否存在
     * @param {string} word
     * @return {boolean}
     */
    search(word) {
        const node = this._searchPrefix(word);
        return node !== null && node.isEnd;
    }
    
    /**
     * 查找是否有以prefix开头的单词
     * @param {string} prefix
     * @return {boolean}
     */
    startsWith(prefix) {
        return this._searchPrefix(prefix) !== null;
    }
    
    /**
     * 辅助方法：查找前缀对应的节点
     * @param {string} prefix
     * @return {TrieNode|null}
     */
    _searchPrefix(prefix) {
        let node = this.root;
        
        for (const char of prefix) {
            if (!node.children[char]) {
                return null;  // 路径断了
            }
            node = node.children[char];
        }
        
        return node;
    }
}
```

## 执行过程详解

```
操作序列：
1. insert("apple")
2. search("apple")
3. search("app")
4. startsWith("app")
5. insert("app")
6. search("app")

执行过程：

1. insert("apple")
   root → a → p → p → l → e*
   创建5个新节点，最后一个标记isEnd=true

2. search("apple")
   沿 root → a → p → p → l → e 走完
   e节点的isEnd=true，返回true

3. search("app")
   沿 root → a → p → p 走到第二个p
   p节点的isEnd=false，返回false

4. startsWith("app")
   沿 root → a → p → p 走完
   成功走完，返回true

5. insert("app")
   沿已有路径 root → a → p → p
   标记第二个p的isEnd=true

6. search("app")
   沿 root → a → p → p 走完
   p节点的isEnd=true，返回true
```

## 数组实现（固定字符集）

如果只处理小写字母，用数组更快：

```javascript
class TrieNode {
    constructor() {
        this.children = new Array(26).fill(null);
        this.isEnd = false;
    }
}

class Trie {
    constructor() {
        this.root = new TrieNode();
    }
    
    insert(word) {
        let node = this.root;
        for (const char of word) {
            const index = char.charCodeAt(0) - 97;  // 'a' = 97
            if (!node.children[index]) {
                node.children[index] = new TrieNode();
            }
            node = node.children[index];
        }
        node.isEnd = true;
    }
    
    search(word) {
        const node = this._searchPrefix(word);
        return node !== null && node.isEnd;
    }
    
    startsWith(prefix) {
        return this._searchPrefix(prefix) !== null;
    }
    
    _searchPrefix(prefix) {
        let node = this.root;
        for (const char of prefix) {
            const index = char.charCodeAt(0) - 97;
            if (!node.children[index]) {
                return null;
            }
            node = node.children[index];
        }
        return node;
    }
}
```

## 两种实现对比

| 方面 | Map实现 | 数组实现 |
|------|---------|----------|
| 空间 | 按需分配，更省 | 固定26个位置 |
| 时间 | 哈希操作开销 | 直接索引，更快 |
| 灵活性 | 支持任意字符 | 仅限小写字母 |

大多数LeetCode题目只有小写字母，数组实现更优。但实际开发中Map更灵活。

## 复杂度分析

**时间复杂度**：
- insert: O(m)，m是单词长度
- search: O(m)
- startsWith: O(m)

**空间复杂度**：O(n × m)
- n是单词数量，m是平均长度
- 但有公共前缀时，空间会小很多

## 小结

实现Trie的关键点：

1. **节点结构**：children + isEnd
2. **插入**：走已有路，没路建路，终点标记
3. **查找**：走已有路，检查终点标记
4. **前缀**：走已有路，能走完就行

这道题是字典树的基础，后续的字典树题目都建立在这个实现之上。
