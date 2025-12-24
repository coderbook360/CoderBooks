# 字典树基础与实现

字典树（Trie），也叫前缀树，是处理字符串集合的高效数据结构。当你需要快速判断一个单词是否存在，或者查找以某前缀开头的所有单词时，字典树是最佳选择。

---

## 为什么需要字典树？

假设我们有一个包含 10 万个单词的词典，需要支持两种操作：
1. 查询某个单词是否存在
2. 查询以某前缀开头的所有单词

**方案一：使用数组存储**
- 查询单词：O(n) 遍历
- 查询前缀：O(n × m)，n 是单词数，m 是平均单词长度

**方案二：使用哈希表**
- 查询单词：O(1)
- 查询前缀：O(n × m)，需要遍历所有单词检查前缀

**方案三：使用字典树**
- 查询单词：O(m)，m 是单词长度
- 查询前缀：O(m)

字典树的优势在于：**前缀相同的单词共享存储空间**，查询效率只与单词长度有关，与词典大小无关。

---

## 字典树的结构

字典树是一棵多叉树，每个节点代表一个字符，从根到某节点的路径表示一个前缀。

### 结构示例

存储单词 `["app", "apple", "apply", "apt", "bat"]`：

```
        root
       /    \
      a      b
      |      |
      p      a
     / \     |
    p   t*   t*
    |
    l
   / \
  e*  y*

* 表示单词结束
```

### 节点定义

```typescript
class TrieNode {
  children: Map<string, TrieNode>;  // 子节点映射
  isEndOfWord: boolean;              // 是否是单词结尾
  
  constructor() {
    this.children = new Map();
    this.isEndOfWord = false;
  }
}
```

### 关键观察

1. **根节点不存储字符**，仅作为起点
2. **每条边代表一个字符**
3. **从根到任意节点的路径**组成一个前缀
4. **isEndOfWord 标记**区分前缀和完整单词

---

## 基本操作实现

### 1. 插入单词

从根节点开始，沿着单词的每个字符向下走：
- 如果字符对应的子节点不存在，创建它
- 如果存在，直接移动到该节点
- 到达末尾时，标记 `isEndOfWord = true`

```typescript
class Trie {
  private root: TrieNode;
  
  constructor() {
    this.root = new TrieNode();
  }
  
  insert(word: string): void {
    let node = this.root;
    
    for (const char of word) {
      // 如果字符不存在，创建新节点
      if (!node.children.has(char)) {
        node.children.set(char, new TrieNode());
      }
      // 移动到下一个节点
      node = node.children.get(char)!;
    }
    
    // 标记单词结束
    node.isEndOfWord = true;
  }
}
```

**时间复杂度**：O(m)，m 是单词长度

### 2. 查询单词

沿着单词的每个字符向下走：
- 如果某个字符不存在，返回 false
- 到达末尾时，检查 `isEndOfWord`

```typescript
search(word: string): boolean {
  let node = this.root;
  
  for (const char of word) {
    if (!node.children.has(char)) {
      return false;  // 字符不存在
    }
    node = node.children.get(char)!;
  }
  
  // 必须是单词结尾，而非仅仅是前缀
  return node.isEndOfWord;
}
```

**关键点**：`search("app")` 在上面的例子中返回 `true`（因为 "app" 是完整单词），但如果我们只插入了 "apple"，则返回 `false`。

### 3. 查询前缀

与查询单词类似，但不需要检查 `isEndOfWord`：

```typescript
startsWith(prefix: string): boolean {
  let node = this.root;
  
  for (const char of prefix) {
    if (!node.children.has(char)) {
      return false;
    }
    node = node.children.get(char)!;
  }
  
  return true;  // 只要能走完前缀就返回 true
}
```

---

## 完整实现

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
   * 时间复杂度：O(m)，m 是单词长度
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
   * 时间复杂度：O(m)
   */
  search(word: string): boolean {
    const node = this.searchPrefix(word);
    return node !== null && node.isEndOfWord;
  }
  
  /**
   * 查询是否存在以 prefix 开头的单词
   * 时间复杂度：O(m)
   */
  startsWith(prefix: string): boolean {
    return this.searchPrefix(prefix) !== null;
  }
  
  /**
   * 辅助方法：查找前缀对应的节点
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

## 数组实现 vs Map 实现

上面使用 Map 存储子节点，适合字符集较大的情况（如 Unicode）。对于只包含小写字母的场景，可以使用数组优化：

```typescript
class TrieNode {
  children: (TrieNode | null)[];  // 固定大小为 26
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
  
  private charToIndex(char: string): number {
    return char.charCodeAt(0) - 'a'.charCodeAt(0);
  }
  
  insert(word: string): void {
    let node = this.root;
    
    for (const char of word) {
      const index = this.charToIndex(char);
      if (node.children[index] === null) {
        node.children[index] = new TrieNode();
      }
      node = node.children[index]!;
    }
    
    node.isEndOfWord = true;
  }
  
  search(word: string): boolean {
    let node = this.root;
    
    for (const char of word) {
      const index = this.charToIndex(char);
      if (node.children[index] === null) {
        return false;
      }
      node = node.children[index]!;
    }
    
    return node.isEndOfWord;
  }
  
  startsWith(prefix: string): boolean {
    let node = this.root;
    
    for (const char of prefix) {
      const index = this.charToIndex(char);
      if (node.children[index] === null) {
        return false;
      }
      node = node.children[index]!;
    }
    
    return true;
  }
}
```

**对比**：

| 实现方式 | 空间复杂度 | 访问速度 | 适用场景 |
|---------|-----------|---------|---------|
| Map | 动态分配，节省空间 | O(1) 哈希查找 | 字符集大或稀疏 |
| 数组 | 固定 26 × 节点数 | O(1) 直接索引 | 只有小写字母 |

---

## 扩展操作

### 1. 删除单词

删除操作需要考虑：
- 该单词是否是其他单词的前缀
- 是否有其他单词是该单词的前缀

```typescript
delete(word: string): boolean {
  return this.deleteHelper(this.root, word, 0);
}

private deleteHelper(node: TrieNode, word: string, depth: number): boolean {
  if (depth === word.length) {
    // 到达单词末尾
    if (!node.isEndOfWord) {
      return false;  // 单词不存在
    }
    node.isEndOfWord = false;
    return node.children.size === 0;  // 如果没有子节点，可以删除
  }
  
  const char = word[depth];
  const child = node.children.get(char);
  
  if (!child) {
    return false;  // 单词不存在
  }
  
  const shouldDeleteChild = this.deleteHelper(child, word, depth + 1);
  
  if (shouldDeleteChild) {
    node.children.delete(char);
    return node.children.size === 0 && !node.isEndOfWord;
  }
  
  return false;
}
```

### 2. 统计以某前缀开头的单词数量

在节点中增加计数器：

```typescript
class TrieNode {
  children: Map<string, TrieNode>;
  isEndOfWord: boolean;
  count: number;  // 新增：经过该节点的单词数
  
  constructor() {
    this.children = new Map();
    this.isEndOfWord = false;
    this.count = 0;
  }
}

// 插入时增加计数
insert(word: string): void {
  let node = this.root;
  
  for (const char of word) {
    if (!node.children.has(char)) {
      node.children.set(char, new TrieNode());
    }
    node = node.children.get(char)!;
    node.count++;  // 新增
  }
  
  node.isEndOfWord = true;
}

// 查询前缀数量
countPrefix(prefix: string): number {
  let node = this.root;
  
  for (const char of prefix) {
    if (!node.children.has(char)) {
      return 0;
    }
    node = node.children.get(char)!;
  }
  
  return node.count;
}
```

### 3. 获取所有以某前缀开头的单词

```typescript
getWordsWithPrefix(prefix: string): string[] {
  const result: string[] = [];
  let node = this.root;
  
  // 先找到前缀对应的节点
  for (const char of prefix) {
    if (!node.children.has(char)) {
      return result;
    }
    node = node.children.get(char)!;
  }
  
  // DFS 收集所有单词
  this.collectWords(node, prefix, result);
  return result;
}

private collectWords(node: TrieNode, prefix: string, result: string[]): void {
  if (node.isEndOfWord) {
    result.push(prefix);
  }
  
  for (const [char, child] of node.children) {
    this.collectWords(child, prefix + char, result);
  }
}
```

---

## 复杂度分析

设 n 为单词数量，m 为单词平均长度，L 为最长单词长度。

| 操作 | 时间复杂度 | 说明 |
|-----|-----------|------|
| 插入 | O(m) | 与单词长度成正比 |
| 查询 | O(m) | 与单词长度成正比 |
| 前缀查询 | O(m) | 与前缀长度成正比 |
| 删除 | O(m) | 需要回溯清理节点 |

**空间复杂度**：
- 最坏情况：O(n × m)，所有单词没有公共前缀
- 最好情况：O(L × k)，k 是字符集大小，所有单词共享前缀

---

## 应用场景

1. **自动补全**：输入法、搜索引擎、IDE 代码提示
2. **拼写检查**：检查单词是否在词典中
3. **IP 路由**：最长前缀匹配
4. **词频统计**：统计以某前缀开头的单词数量
5. **字符串排序**：利用字典树的有序性

---

## 本章小结

1. **字典树本质**：利用字符串的公共前缀减少存储和查询开销
2. **核心操作**：插入、查询、前缀查询，时间复杂度都是 O(m)
3. **两种实现**：Map 适合大字符集，数组适合固定小字符集
4. **扩展能力**：可以轻松扩展删除、计数、收集等功能

下一章我们将通过 LeetCode 208 题来实战字典树的实现。
