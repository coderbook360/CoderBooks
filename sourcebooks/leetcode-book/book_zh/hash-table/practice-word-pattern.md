# 实战：单词规律

这道题是"同构字符串"的变体——从字符到字符的映射变成了字符到单词的映射。

## 问题描述

给定一种规律`pattern`和一个字符串`s`，判断`s`是否遵循相同的规律。

这里的**遵循**指完全匹配：`pattern`里的每个字母和字符串`s`中的每个非空单词之间存在着**双向连接**的对应规律。

**示例**：
```
输入: pattern = "abba", s = "dog cat cat dog"
输出: true
解释: a→dog, b→cat

输入: pattern = "abba", s = "dog cat cat fish"
输出: false
解释: a需要同时映射到dog和fish

输入: pattern = "aaaa", s = "dog cat cat dog"
输出: false
解释: a不能同时映射到dog, cat, dog
```

## 思路分析

和"同构字符串"完全相同的思路：
1. pattern中的每个字符映射到一个单词
2. 每个单词也要映射回那个字符
3. 必须是**一一对应**的关系

## 完整实现

```javascript
/**
 * @param {string} pattern
 * @param {string} s
 * @return {boolean}
 */
function wordPattern(pattern, s) {
    const words = s.split(' ');
    
    // 长度必须相同
    if (pattern.length !== words.length) {
        return false;
    }
    
    const p2w = new Map();  // 字符 → 单词
    const w2p = new Map();  // 单词 → 字符
    
    for (let i = 0; i < pattern.length; i++) {
        const p = pattern[i];
        const w = words[i];
        
        // 检查 字符→单词 映射
        if (p2w.has(p) && p2w.get(p) !== w) {
            return false;
        }
        
        // 检查 单词→字符 映射
        if (w2p.has(w) && w2p.get(w) !== p) {
            return false;
        }
        
        // 建立双向映射
        p2w.set(p, w);
        w2p.set(w, p);
    }
    
    return true;
}
```

## 执行过程图解

以`pattern = "abba"`, `s = "dog cat cat dog"`为例：

```
words = ["dog", "cat", "cat", "dog"]

i=0: p='a', w="dog"
  p2w 中无 'a', w2p 中无 "dog"
  建立映射: p2w={a→dog}, w2p={dog→a}

i=1: p='b', w="cat"
  p2w 中无 'b', w2p 中无 "cat"
  建立映射: p2w={a→dog, b→cat}, w2p={dog→a, cat→b}

i=2: p='b', w="cat"
  p2w.get('b') = "cat" = w ✓
  w2p.get("cat") = 'b' = p ✓
  映射一致

i=3: p='a', w="dog"
  p2w.get('a') = "dog" = w ✓
  w2p.get("dog") = 'a' = p ✓
  映射一致

返回 true
```

以`pattern = "abba"`, `s = "dog dog dog dog"`为例：

```
words = ["dog", "dog", "dog", "dog"]

i=0: p='a', w="dog"
  建立映射: p2w={a→dog}, w2p={dog→a}

i=1: p='b', w="dog"
  p2w 中无 'b' ✓
  w2p.get("dog") = 'a' ≠ 'b' ✗
  返回 false
```

## 简洁写法

```javascript
function wordPattern(pattern, s) {
    const words = s.split(' ');
    if (pattern.length !== words.length) return false;
    
    const p2w = new Map();
    const w2p = new Map();
    
    for (let i = 0; i < pattern.length; i++) {
        const p = pattern[i], w = words[i];
        
        if ((p2w.has(p) && p2w.get(p) !== w) ||
            (w2p.has(w) && w2p.get(w) !== p)) {
            return false;
        }
        
        p2w.set(p, w);
        w2p.set(w, p);
    }
    
    return true;
}
```

## 与"同构字符串"的对比

| 题目 | 映射关系 | 分割方式 |
|------|----------|----------|
| 同构字符串 | 字符 ↔ 字符 | 逐字符 |
| 单词规律 | 字符 ↔ 单词 | 空格分割 |

代码结构几乎相同，只是获取对应元素的方式不同。

## 边界情况

| 输入 | 分析 | 结果 |
|------|------|------|
| `"a"`, `"dog cat"` | 长度不匹配 | false |
| `"ab"`, `"dog"` | 长度不匹配 | false |
| `"a"`, `"a"` | 字符和单词相同也可以 | true |
| `"abc"`, `"b c a"` | a→b, b→c, c→a | true |

## 复杂度分析

**时间复杂度：O(n + m)**
- n是pattern长度
- m是字符串s的长度（分割需要遍历）

**空间复杂度：O(n)**
- 两个Map最多存储n个映射
- words数组存储n个单词

## 扩展思考

如果pattern中可以有重复的连续字符，比如`"aabb"`，而单词用其他分隔符？

这就是一个更通用的**模式匹配**问题，可能需要回溯或动态规划来解决。

## 小结

单词规律的核心：

1. **双向映射**：字符→单词，单词→字符
2. **一一对应**：任一方向的映射冲突都返回false
3. **预处理**：先用split分割单词

这道题和"同构字符串"是一对姐妹题，掌握了一道，另一道就能快速解决。核心都是**双向Map检查一一对应关系**。
