# 实现 Trie（前缀树）

本章通过 LeetCode 208 题，实战实现一个完整的字典树。

---

## 题目描述

**LeetCode 208. 实现 Trie（前缀树）**

实现 Trie 类：
- `Trie()` 初始化前缀树对象
- `void insert(String word)` 向前缀树中插入字符串 word
- `boolean search(String word)` 如果字符串 word 在前缀树中，返回 true；否则返回 false
- `boolean startsWith(String prefix)` 如果之前已经插入的字符串 word 的前缀之一为 prefix，返回 true；否则返回 false

**示例**：

```
输入
["Trie", "insert", "search", "search", "startsWith", "insert", "search"]
[[], ["apple"], ["apple"], ["app"], ["app"], ["app"], ["app"]]

输出
[null, null, true, false, true, null, true]

解释
Trie trie = new Trie();
trie.insert("apple");
trie.search("apple");   // 返回 True
trie.search("app");     // 返回 False
trie.startsWith("app"); // 返回 True
trie.insert("app");
trie.search("app");     // 返回 True
```

---

## 思路分析

### 这道题在考什么？

字典树的标准实现。核心考点：
1. 理解字典树的结构
2. 区分 `search` 和 `startsWith` 的区别

### 关键区别

- `search("app")`：判断 "app" 是否是一个**完整的单词**
- `startsWith("app")`：判断是否存在**以 "app" 开头的单词**

两者的实现几乎相同，唯一区别是最后是否检查 `isEndOfWord`。

---

## 代码实现

```typescript
class TrieNode {
  children: Map<string, TrieNode>;
  isEndOfWord: boolean;
  
  constructor() {
    this.children = new Map();
    this.isEndOfWord = false;
  }
}

class Trie {
  private root: TrieNode;
  
  constructor() {
    this.root = new TrieNode();
  }
  
  /**
   * 插入单词
   */
  insert(word: string): void {
    let node = this.root;
    
    for (const char of word) {
      if (!node.children.has(char)) {
        node.children.set(char, new TrieNode());
      }
      node = node.children.get(char)!;
    }
    
    node.isEndOfWord = true;
  }
  
  /**
   * 查询单词是否存在
   */
  search(word: string): boolean {
    const node = this.searchPrefix(word);
    return node !== null && node.isEndOfWord;
  }
  
  /**
   * 查询是否存在以 prefix 开头的单词
   */
  startsWith(prefix: string): boolean {
    return this.searchPrefix(prefix) !== null;
  }
  
  /**
   * 辅助方法：返回前缀对应的节点
   */
  private searchPrefix(prefix: string): TrieNode | null {
    let node = this.root;
    
    for (const char of prefix) {
      if (!node.children.has(char)) {
        return null;
      }
      node = node.children.get(char)!;
    }
    
    return node;
  }
}
```

---

## 执行过程演示

以示例为例：

```
操作序列：insert("apple") → search("apple") → search("app") → startsWith("app")

1. insert("apple"):
   root → 'a' → 'p' → 'p' → 'l' → 'e'*
   
2. search("apple"):
   沿 root → a → p → p → l → e 走到末尾
   检查 isEndOfWord = true ✓
   返回 true
   
3. search("app"):
   沿 root → a → p → p 走到 'p' 节点
   检查 isEndOfWord = false ✗
   返回 false
   
4. startsWith("app"):
   沿 root → a → p → p 走到 'p' 节点
   节点存在 ✓
   返回 true
```

---

## 复杂度分析

- **时间复杂度**：
  - `insert`：O(m)，m 是单词长度
  - `search`：O(m)
  - `startsWith`：O(m)

- **空间复杂度**：O(T)，T 是所有插入单词的字符总数

---

## 数组实现版本

如果题目明确只包含小写字母，可以用数组替代 Map：

```typescript
class TrieNode {
  children: (TrieNode | null)[];
  isEndOfWord: boolean;
  
  constructor() {
    this.children = new Array(26).fill(null);
    this.isEndOfWord = false;
  }
}

class Trie {
  private root: TrieNode;
  
  constructor() {
    this.root = new TrieNode();
  }
  
  private getIndex(char: string): number {
    return char.charCodeAt(0) - 97; // 'a' 的 ASCII 码是 97
  }
  
  insert(word: string): void {
    let node = this.root;
    
    for (const char of word) {
      const idx = this.getIndex(char);
      if (node.children[idx] === null) {
        node.children[idx] = new TrieNode();
      }
      node = node.children[idx]!;
    }
    
    node.isEndOfWord = true;
  }
  
  search(word: string): boolean {
    const node = this.searchPrefix(word);
    return node !== null && node.isEndOfWord;
  }
  
  startsWith(prefix: string): boolean {
    return this.searchPrefix(prefix) !== null;
  }
  
  private searchPrefix(prefix: string): TrieNode | null {
    let node = this.root;
    
    for (const char of prefix) {
      const idx = this.getIndex(char);
      if (node.children[idx] === null) {
        return null;
      }
      node = node.children[idx]!;
    }
    
    return node;
  }
}
```

---

## 易错点

1. **忘记标记 isEndOfWord**
   ```typescript
   // 错误：插入后忘记标记
   insert(word: string): void {
     let node = this.root;
     for (const char of word) {
       if (!node.children.has(char)) {
         node.children.set(char, new TrieNode());
       }
       node = node.children.get(char)!;
     }
     // 忘记这一行！
     // node.isEndOfWord = true;
   }
   ```

2. **混淆 search 和 startsWith**
   ```typescript
   // 错误：search 没有检查 isEndOfWord
   search(word: string): boolean {
     const node = this.searchPrefix(word);
     return node !== null; // 应该是 node !== null && node.isEndOfWord
   }
   ```

3. **数组索引计算错误**
   ```typescript
   // 错误：使用了错误的基准值
   private getIndex(char: string): number {
     return char.charCodeAt(0) - 65; // 这是大写字母 'A'，应该用 97
   }
   ```

---

## 相关题目

| 题号 | 题目 | 难度 | 关联 |
|-----|------|------|------|
| 211 | 添加与搜索单词 | 中等 | 下一章 |
| 212 | 单词搜索 II | 困难 | Trie + 回溯 |
| 648 | 单词替换 | 中等 | 前缀匹配 |
| 1268 | 搜索推荐系统 | 中等 | Trie + 排序 |

---

## 本章小结

1. **核心实现**：掌握 `insert`、`search`、`startsWith` 三个基本操作
2. **关键区别**：`search` 需要检查 `isEndOfWord`，`startsWith` 不需要
3. **两种实现**：Map 实现通用性强，数组实现效率高
4. **代码复用**：提取 `searchPrefix` 辅助方法减少重复代码
