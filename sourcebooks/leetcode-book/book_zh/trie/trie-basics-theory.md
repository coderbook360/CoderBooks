# 字典树基础理论

字典树（Trie），也叫前缀树，是一种专门用于**字符串检索**的树形结构。它能在O(m)时间内完成插入、查找和前缀匹配（m是字符串长度），在搜索引擎、自动补全、拼写检查等场景中广泛应用。

## 为什么需要字典树？

假设你要实现一个搜索框的自动补全功能，用户输入"app"，你需要快速找出所有以"app"开头的单词。

**用数组/哈希表**：需要遍历所有单词检查前缀，O(n × m)

**用字典树**：直接定位到"app"对应的节点，O(m)

当单词量很大时，字典树的优势非常明显。

## 字典树的结构

字典树是一棵多叉树，每个节点代表一个字符，从根到某个节点的路径表示一个前缀。

存储单词`["app", "apple", "apply", "bad"]`的字典树：

```
        root
       /    \
      a      b
      |      |
      p      a
      |      |
      p*     d*
     / \
    l   l
    |   |
    e*  y*

* 表示单词结束标记
```

### 关键特征

1. **根节点不存储字符**
2. **每条边代表一个字符**
3. **从根到节点的路径 = 一个前缀**
4. **节点可以标记为"单词结束"**

### 节点结构

```javascript
class TrieNode {
    constructor() {
        this.children = {};  // 子节点映射
        this.isEnd = false;  // 是否是单词结尾
    }
}
```

`children`是一个字典，键是字符，值是子节点。这种设计支持任意字符集。

如果只处理小写字母，也可以用固定长度数组：

```javascript
class TrieNode {
    constructor() {
        this.children = new Array(26).fill(null);
        this.isEnd = false;
    }
}
```

## 基本操作

### 插入单词

从根开始，逐字符向下走，没有路径就创建新节点。

```javascript
insert(word) {
    let node = this.root;
    for (const char of word) {
        if (!node.children[char]) {
            node.children[char] = new TrieNode();
        }
        node = node.children[char];
    }
    node.isEnd = true;  // 标记单词结束
}
```

插入"apple"的过程：
```
初始：root

插入'a': root → a
插入'p': root → a → p
插入'p': root → a → p → p
插入'l': root → a → p → p → l
插入'e': root → a → p → p → l → e*
```

### 查找单词

从根开始，逐字符向下走。如果某个字符不存在，返回false。走完后检查是否是单词结尾。

```javascript
search(word) {
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

### 前缀查询

和查找类似，但不需要检查单词结尾。

```javascript
startsWith(prefix) {
    let node = this.root;
    for (const char of prefix) {
        if (!node.children[char]) {
            return false;
        }
        node = node.children[char];
    }
    return true;
}
```

## 完整实现

```javascript
class Trie {
    constructor() {
        this.root = new TrieNode();
    }
    
    insert(word) {
        let node = this.root;
        for (const char of word) {
            if (!node.children[char]) {
                node.children[char] = new TrieNode();
            }
            node = node.children[char];
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
    
    // 辅助函数：查找前缀对应的节点
    _searchPrefix(prefix) {
        let node = this.root;
        for (const char of prefix) {
            if (!node.children[char]) {
                return null;
            }
            node = node.children[char];
        }
        return node;
    }
}
```

## 时间复杂度

| 操作 | 时间复杂度 |
|------|-----------|
| 插入 | O(m) |
| 查找 | O(m) |
| 前缀查询 | O(m) |

m是字符串长度。注意这与字典中的单词数量无关！

## 空间复杂度

最坏情况O(n × m)，n是单词数，m是平均长度。但实际上，如果单词有很多公共前缀，空间会大大减少。

例如`["apple", "apply", "application"]`只需要少量节点，因为它们共享前缀"appl"。

## 字典树 vs 哈希表

| 方面 | 字典树 | 哈希表 |
|------|--------|--------|
| 查找单词 | O(m) | O(m)（计算哈希）|
| 前缀查询 | O(m) ✓ | O(n)（需遍历）|
| 空间 | 可能更大 | 通常更小 |
| 有序遍历 | 支持 | 不支持 |

**关键差异**：哈希表不支持高效的前缀查询。

## 应用场景

1. **自动补全**：搜索框、IDE代码提示
2. **拼写检查**：检测单词是否存在
3. **IP路由**：最长前缀匹配
4. **词频统计**：在节点中存储额外信息
5. **单词游戏**：如Boggle、Wordle

## 小结

字典树的核心价值在于**前缀共享**和**高效的前缀操作**：

- 结构直观：每个节点代表一个字符
- 查找高效：时间只与字符串长度相关
- 前缀友好：天然支持前缀查询

下一章我们将学习字典树的更多应用场景和变体。
