# 添加与搜索单词

本章讲解如何在字典树中支持通配符搜索，通过 LeetCode 211 题实战演练。

---

## 题目描述

**LeetCode 211. 添加与搜索单词 - 数据结构设计**

设计一个数据结构，支持两种操作：
- `void addWord(word)` 添加单词
- `bool search(word)` 搜索单词，其中 word 可以包含 `.`，`.` 可以匹配任意一个字母

**示例**：

```
输入
["WordDictionary","addWord","addWord","addWord","search","search","search","search"]
[[],["bad"],["dad"],["mad"],["pad"],["bad"],[".ad"],["b.."]]

输出
[null,null,null,null,false,true,true,true]

解释
WordDictionary wordDictionary = new WordDictionary();
wordDictionary.addWord("bad");
wordDictionary.addWord("dad");
wordDictionary.addWord("mad");
wordDictionary.search("pad"); // 返回 false
wordDictionary.search("bad"); // 返回 true
wordDictionary.search(".ad"); // 返回 true，匹配 "bad"、"dad"、"mad"
wordDictionary.search("b.."); // 返回 true，匹配 "bad"
```

---

## 思路分析

### 这道题在考什么？

1. 字典树的基本实现
2. 通配符匹配的处理策略

### 关键挑战

普通的字典树查询是沿着确定的路径走。但 `.` 可以匹配任意字符，意味着可能有多条路径需要探索。

**解决方案**：遇到 `.` 时，尝试当前节点的所有子节点，只要有一条路径成功就返回 true。

这本质上是一个 **DFS + 回溯**的过程。

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

class WordDictionary {
  private root: TrieNode;
  
  constructor() {
    this.root = new TrieNode();
  }
  
  /**
   * 添加单词 - 标准的 Trie 插入
   */
  addWord(word: string): void {
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
   * 搜索单词 - 支持通配符 '.'
   */
  search(word: string): boolean {
    return this.searchInNode(word, 0, this.root);
  }
  
  /**
   * 在指定节点下搜索从 index 开始的子串
   */
  private searchInNode(word: string, index: number, node: TrieNode): boolean {
    // 到达单词末尾
    if (index === word.length) {
      return node.isEndOfWord;
    }
    
    const char = word[index];
    
    if (char === '.') {
      // 通配符：尝试所有可能的子节点
      for (const child of node.children.values()) {
        if (this.searchInNode(word, index + 1, child)) {
          return true;
        }
      }
      return false;
    } else {
      // 普通字符：走确定的路径
      if (!node.children.has(char)) {
        return false;
      }
      return this.searchInNode(word, index + 1, node.children.get(char)!);
    }
  }
}
```

---

## 执行过程演示

以搜索 ".ad" 为例，假设已插入 ["bad", "dad", "mad"]：

```
Trie 结构：
       root
      / | \
     b  d  m
     |  |  |
     a  a  a
     |  |  |
     d* d* d*

搜索 ".ad"：

1. index=0, char='.'
   遍历 root 的所有子节点：[b, d, m]
   
2. 尝试 'b'：
   index=1, char='a'
   'b' 节点有子节点 'a'，继续
   
3. index=2, char='d'
   'a' 节点有子节点 'd'，继续
   
4. index=3 = word.length
   检查 isEndOfWord = true ✓
   返回 true

搜索成功！
```

---

## 复杂度分析

- **时间复杂度**：
  - `addWord`：O(m)，m 是单词长度
  - `search`：
    - 无通配符：O(m)
    - 有通配符：最坏情况 O(26^m)，但实际远小于此

- **空间复杂度**：O(T)，T 是所有单词的字符总数

---

## 优化思路

### 1. 按长度分组

如果查询模式中通配符位置固定（如 `.ad`），可以按单词长度建立索引：

```typescript
class WordDictionary {
  private wordsByLength: Map<number, Set<string>>;
  private root: TrieNode;
  
  // 先按长度过滤，再在 Trie 中搜索
}
```

### 2. 提前终止

如果节点没有子节点，提前返回：

```typescript
if (char === '.' && node.children.size === 0) {
  return false;
}
```

---

## 变体：多个通配符

如果搜索模式是 "b.." ：

```
搜索 "b.."：

1. index=0, char='b'
   走到 'b' 节点
   
2. index=1, char='.'
   'b' 只有一个子节点 'a'，走到 'a'
   
3. index=2, char='.'
   'a' 只有一个子节点 'd'，走到 'd'
   
4. index=3 = word.length
   检查 isEndOfWord = true ✓
   返回 true
```

多个通配符不会导致复杂度倍增，因为每次只探索实际存在的分支。

---

## 易错点

1. **递归终止条件**
   ```typescript
   // 错误：忘记检查 isEndOfWord
   if (index === word.length) {
     return true; // 应该是 return node.isEndOfWord
   }
   ```

2. **通配符处理**
   ```typescript
   // 错误：遇到 '.' 只检查了一个子节点
   if (char === '.') {
     const firstChild = node.children.values().next().value;
     return this.searchInNode(word, index + 1, firstChild);
     // 应该遍历所有子节点
   }
   ```

3. **空节点检查**
   ```typescript
   // 错误：没有检查子节点是否存在
   if (char === '.') {
     for (const child of node.children.values()) {
       // 如果 children 为空，这里不会执行，但需要确保返回 false
     }
   }
   ```

---

## 相关题目

| 题号 | 题目 | 难度 | 关联 |
|-----|------|------|------|
| 208 | 实现 Trie | 中等 | 上一章 |
| 212 | 单词搜索 II | 困难 | Trie + 回溯 |
| 79 | 单词搜索 | 中等 | 回溯基础 |
| 10 | 正则表达式匹配 | 困难 | 更复杂的匹配 |

---

## 本章小结

1. **核心技巧**：遇到通配符时，DFS 遍历所有可能的子节点
2. **递归结构**：`searchInNode(word, index, node)` 处理从 index 开始的匹配
3. **复杂度控制**：虽然最坏情况是指数级，但实际受 Trie 结构限制
4. **设计模式**：标准 Trie + 回溯搜索的组合
