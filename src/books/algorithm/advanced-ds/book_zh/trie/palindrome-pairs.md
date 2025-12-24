# 回文对

## 核心问题

给定一组唯一的单词，找出所有不同的索引对 `(i, j)`，使得两个单词连接起来 `words[i] + words[j]` 形成回文串。

这是一道字典树与字符串处理的综合难题——**如何高效找到所有能形成回文的配对？** 暴力枚举所有配对并判断回文需要 O(n² × m)，但字典树可以将复杂度降到 O(n × m²)。

## LeetCode 336. 回文对

**问题描述**：
```
输入：words = ["abcd","dcba","lls","s","sssll"]
输出：[[0,1],[1,0],[3,2],[2,4]]

解释：
words[0] + words[1] = "abcddcba" ✓ 回文
words[1] + words[0] = "dcbaabcd" ✓ 回文
words[3] + words[2] = "slls" ✓ 回文
words[2] + words[4] = "llssssll" ✓ 回文
```

**约束条件**：
- `1 <= words.length <= 5000`
- `0 <= words[i].length <= 300`
- 所有字符串由小写英文字母组成
- 所有字符串唯一

## 思考过程

首先要问一个问题：**什么情况下两个单词能形成回文？**

设两个单词为 `A` 和 `B`，`A + B` 形成回文需要满足：
- `A + B` 的正序和逆序相同
- 即 `A + B == reverse(B) + reverse(A)`

这提示我们：**如果 `A + B` 是回文，那么 `B` 的逆序应该和 `A` 的某个部分匹配**。

现在我要问第二个问题：**如何分类讨论配对的情况？**

考虑 `A + B` 形成回文的几种情况：

**情况1：A 和 B 长度相等**
- `A = "abc"`, `B = "cba"`
- `A + B = "abccba"` ✓
- 条件：`B == reverse(A)`

**情况2：B 比 A 长**
- `A = "ll"`, `B = "sssll"`
- `A + B = "llsssll"` ✓
- 分解：`A` + `B的前半` + `B的后半`
- 条件：`B的前半` 是回文，`B的后半 == reverse(A)`

**情况3：A 比 B 长**
- `A = "lls"`, `B = "s"`
- `A + B = "llss"` ✗（这个例子不成立）
- 正确例子：`A = "sll"`, `B = "s"`
- `A + B = "slls"` ✓
- 分解：`A的前半` + `A的后半` + `B`
- 条件：`A的前半 == reverse(B)`，`A的后半` 是回文

## 方案一：反向字典树

### 核心思路

1. **构建反向字典树**：将所有单词的逆序插入字典树
2. **枚举配对**：对每个单词 `A`，在字典树中查找能配对的 `B`
3. **分情况处理**：
   - 查找完全匹配的逆序单词
   - 查找能与 `A` 的前缀或后缀配对的单词

### 代码实现

```javascript
class TrieNode {
  constructor() {
    this.children = {};
    this.wordIndex = -1; // 单词索引
    this.palindromeIndices = []; // 经过此节点时，剩余部分是回文的单词索引
  }
}

class Trie {
  constructor() {
    this.root = new TrieNode();
  }

  // 插入单词的逆序
  insert(word, index) {
    let node = this.root;
    for (let i = word.length - 1; i >= 0; i--) {
      const char = word[i];
      // 检查 word[0...i] 是否是回文
      if (isPalindrome(word, 0, i)) {
        node.palindromeIndices.push(index);
      }
      if (!node.children[char]) {
        node.children[char] = new TrieNode();
      }
      node = node.children[char];
    }
    node.wordIndex = index;
    node.palindromeIndices.push(index); // 空字符串是回文
  }

  // 查找能与 word 配对的所有单词
  search(word, index) {
    const result = [];
    let node = this.root;

    for (let i = 0; i < word.length; i++) {
      // 情况1：当前节点是单词结尾，且 word[i...] 是回文
      if (node.wordIndex >= 0 && node.wordIndex !== index && 
          isPalindrome(word, i, word.length - 1)) {
        result.push([index, node.wordIndex]);
      }

      const char = word[i];
      if (!node.children[char]) {
        return result;
      }
      node = node.children[char];
    }

    // 情况2：word 完全匹配到某个节点，检查该节点后还能形成回文的单词
    for (const j of node.palindromeIndices) {
      if (j !== index) {
        result.push([index, j]);
      }
    }

    return result;
  }
}

function isPalindrome(s, left, right) {
  while (left < right) {
    if (s[left] !== s[right]) return false;
    left++;
    right--;
  }
  return true;
}

function palindromePairs(words) {
  const trie = new Trie();
  const result = [];

  // 1. 构建反向字典树
  for (let i = 0; i < words.length; i++) {
    trie.insert(words[i], i);
  }

  // 2. 查找配对
  for (let i = 0; i < words.length; i++) {
    result.push(...trie.search(words[i], i));
  }

  return result;
}
```

### 为什么用反向字典树？

**关键洞察**：`A + B` 是回文，等价于 `A` 的每个前缀应该与 `B` 的对应逆序后缀匹配。

反向插入的好处：
- 搜索 `A` 时，自然地与 `B` 的逆序匹配
- 避免了每次都要反转字符串

### palindromeIndices 的作用

这个数组存储：**到达当前节点后，剩余部分是回文的单词索引**。

例如单词 `"lls"`（索引 2）：
- 插入时逆序遍历：`'s' -> 'l' -> 'l'`
- 在 `'s'` 节点：`"ll"` 是回文，记录索引 2
- 在 `'l'` 节点：`"l"` 是回文，记录索引 2

查询 `"s"`（索引 3）时：
- 匹配到 `'s'` 节点
- 发现 `palindromeIndices` 中有 2
- 说明 `"s" + "lls" = "slls"` 可能是回文
- 验证：`"s"` 后的 `"lls"` 确实包含回文后缀

### 复杂度分析

- **时间复杂度**：O(n × m²)
  - 插入：对每个单词，检查 m 个前缀是否回文，每次 O(m)
  - 查询：对每个单词，遍历 m 个字符，每个节点检查回文索引
  
- **空间复杂度**：O(n × m)
  - 字典树：O(n × m)
  - `palindromeIndices` 总大小：O(n × m)

## 方案二：哈希表枚举

如果不用字典树，能否用哈希表？

### 核心思路

1. **存储逆序**：用哈希表存储每个单词的逆序及其索引
2. **枚举分割点**：对每个单词的每个分割点，检查能否配对
   - 前半部分是回文 → 查找后半部分的逆序
   - 后半部分是回文 → 查找前半部分的逆序

### 代码实现

```javascript
function palindromePairs(words) {
  const map = new Map();
  const result = [];

  // 1. 存储单词的逆序
  for (let i = 0; i < words.length; i++) {
    const reversed = words[i].split('').reverse().join('');
    map.set(reversed, i);
  }

  // 2. 枚举每个单词
  for (let i = 0; i < words.length; i++) {
    const word = words[i];

    // 情况1：整个单词的逆序存在
    if (map.has(word) && map.get(word) !== i) {
      result.push([i, map.get(word)]);
    }

    // 情况2：枚举分割点
    for (let j = 1; j <= word.length; j++) {
      const left = word.slice(0, j);
      const right = word.slice(j);

      // 左半部分是回文，查找右半部分的逆序
      if (isPalindrome(left, 0, left.length - 1) && map.has(right)) {
        const k = map.get(right);
        if (k !== i) {
          result.push([k, i]); // B + A
        }
      }

      // 右半部分是回文，查找左半部分的逆序
      if (isPalindrome(right, 0, right.length - 1) && map.has(left)) {
        const k = map.get(left);
        if (k !== i) {
          result.push([i, k]); // A + B
        }
      }
    }
  }

  // 去重
  const seen = new Set();
  return result.filter(pair => {
    const key = `${pair[0]}-${pair[1]}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
```

### 问题

这个方案有两个问题：
1. **重复计算**：可能生成重复的配对
2. **边界处理**：空字符串的处理比较麻烦

需要仔细处理分割点，避免重复。

### 复杂度分析

- **时间复杂度**：O(n × m²)
- **空间复杂度**：O(n × m)

## 方案对比

| 方案 | 时间复杂度 | 空间复杂度 | 优点 | 缺点 |
|-----|----------|----------|------|------|
| 反向字典树 | O(n × m²) | O(n × m) | 清晰，避免重复 | 实现复杂 |
| 哈希表枚举 | O(n × m²) | O(n × m) | 简单直观 | 需要去重 |

**推荐**：字典树方案，虽然实现复杂，但逻辑清晰，不易出错。

## 测试用例

```javascript
// 测试用例 1：基本示例
const words1 = ["abcd","dcba","lls","s","sssll"];
console.log(palindromePairs(words1));
// [[0,1],[1,0],[3,2],[2,4]]

// 测试用例 2：相等长度
const words2 = ["bat","tab","cat"];
console.log(palindromePairs(words2)); // [[0,1],[1,0]]

// 测试用例 3：空字符串
const words3 = ["a",""];
console.log(palindromePairs(words3)); // [[0,1],[1,0]]

// 测试用例 4：单字符
const words4 = ["a","b","c","ab","ac","aa"];
console.log(palindromePairs(words4)); // [[3,0],[1,3],[4,0],[2,4],[5,0],[0,5]]

// 测试用例 5：无配对
const words5 = ["abc","def","ghi"];
console.log(palindromePairs(words5)); // []
```

## 关键要点

1. **分类讨论**：根据两个单词的长度关系分情况
   - 相等长度：逆序匹配
   - 不等长度：部分逆序 + 回文
2. **反向字典树**：插入逆序简化匹配逻辑
3. **palindromeIndices 优化**：预存回文信息，避免重复计算
4. **边界处理**：
   - 空字符串
   - 自己与自己配对（需要排除）
   - 重复配对（需要去重）
5. **复杂度**：O(n × m²) 是理论下界，无法继续优化

## 扩展思考

**变体 1**：如果只要求返回配对的数量呢？

不需要存储具体配对，只需计数。

**变体 2**：如果单词可以重复使用呢？

需要修改去重逻辑，允许 `(i, i)` 配对（当单词本身是回文时）。

**变体 3**：如果要求三个单词形成回文呢？

复杂度爆炸到 O(n³ × m)，需要更巧妙的剪枝。

**变体 4**：如果单词很长（如 m = 10^4）呢？

`palindromeIndices` 会非常大，可能需要压缩存储或使用其他数据结构。

这道题是字典树难度的巅峰之一，展示了：**通过巧妙的数据结构设计（反向插入 + 回文预存），可以将看似 O(n² × m) 的问题优化到 O(n × m²)**。这种思维方式在处理复杂字符串匹配问题时非常有价值。
