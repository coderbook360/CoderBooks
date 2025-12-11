# 实战：单词规律

这道题需要**双向映射**——两个哈希表。

## 题目描述

> **LeetCode 290. 单词规律**
>
> 给定一种规律 pattern 和一个字符串 s，判断 s 是否遵循相同的规律。
>
> 这里的「遵循」指**双向连接的对应规律**。

**示例**：

```
输入：pattern = "abba", s = "dog cat cat dog"
输出：true
解释：a ↔ dog, b ↔ cat

输入：pattern = "abba", s = "dog cat cat fish"
输出：false
解释：a 对应 dog，最后一个 a 却对应 fish

输入：pattern = "abba", s = "dog dog dog dog"
输出：false
解释：a 和 b 都对应 dog，违反一一对应
```

## 为什么需要双向映射？

思考一下，如果只用一个哈希表会怎样？

```
pattern = "abba", s = "dog dog dog dog"

只检查 pattern → word：
a → dog ✓
b → dog ✓（b 没映射过，直接映射到 dog）
b → dog ✓
a → dog ✓
结果：true ❌（错误！）
```

问题在于：a 和 b 都映射到了 dog，**不是一一对应**。

**正确做法**：需要两个方向的映射：
- pattern → word（每个字符对应唯一单词）
- word → pattern（每个单词对应唯一字符）

## 解法：双哈希表

```javascript
function wordPattern(pattern, s) {
    const words = s.split(' ');
    
    // 长度必须相等
    if (pattern.length !== words.length) {
        return false;
    }
    
    const charToWord = new Map();  // 字符 → 单词
    const wordToChar = new Map();  // 单词 → 字符
    
    for (let i = 0; i < pattern.length; i++) {
        const char = pattern[i];
        const word = words[i];
        
        // 检查 char → word 映射
        if (charToWord.has(char)) {
            if (charToWord.get(char) !== word) {
                return false;
            }
        } else {
            charToWord.set(char, word);
        }
        
        // 检查 word → char 映射
        if (wordToChar.has(word)) {
            if (wordToChar.get(word) !== char) {
                return false;
            }
        } else {
            wordToChar.set(word, char);
        }
    }
    
    return true;
}
```

### 执行过程

```
pattern = "abba", s = "dog cat cat dog"
words = ["dog", "cat", "cat", "dog"]

i=0: char='a', word="dog"
     charToWord: {a → dog}
     wordToChar: {dog → a}

i=1: char='b', word="cat"
     charToWord: {a → dog, b → cat}
     wordToChar: {dog → a, cat → b}

i=2: char='b', word="cat"
     charToWord.get('b') = "cat" === "cat" ✓
     wordToChar.get("cat") = 'b' === 'b' ✓

i=3: char='a', word="dog"
     charToWord.get('a') = "dog" === "dog" ✓
     wordToChar.get("dog") = 'a' === 'a' ✓

return true
```

### 检测 "abba" → "dog dog dog dog"

```
i=0: char='a', word="dog"
     charToWord: {a → dog}
     wordToChar: {dog → a}

i=1: char='b', word="dog"
     charToWord 中没有 'b'，准备添加
     但 wordToChar 中已有 "dog" → 'a'
     wordToChar.get("dog") = 'a' !== 'b' ❌
     return false
```

双向映射成功检测出问题！

## 复杂度分析

- **时间**：O(n + m)，n 是 pattern 长度，m 是 s 长度
- **空间**：O(n)，两个哈希表

## 与"同构字符串"的关系

这道题和 LeetCode 205（同构字符串）思路相同，都需要双向映射。

| 题目 | 映射关系 |
|-----|---------|
| 同构字符串 | 字符 ↔ 字符 |
| 单词规律 | 字符 ↔ 单词 |

本质上都是检验**一一对应（双射）**关系。

## 本章小结

单词规律展示了**双向映射**的必要性：

1. **双射检验**：不仅 A→B 一致，还要 B→A 一致
2. **两个哈希表**：分别存储正向和反向映射
3. **边界条件**：先检查长度是否相等

当题目要求"一一对应"关系时，记得用双向映射来检验。
