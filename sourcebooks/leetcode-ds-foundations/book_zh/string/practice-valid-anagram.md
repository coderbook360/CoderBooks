# 实战：有效的字母异位词 (Valid Anagram)

"Anagram"（字母异位词）是字符串算法中的常客。它的核心在于：**内容相同，顺序不同**。

这道题看似简单，但它是理解**哈希表 (Hash Table)** 和 **字符编码** 的绝佳入门题。

---

## 题目描述

**LeetCode 242. Valid Anagram**

给定两个字符串 `s` 和 `t`，编写一个函数来判断 `t` 是否是 `s` 的字母异位词。

**示例**：
```
输入: s = "anagram", t = "nagaram"
输出: true

输入: s = "rat", t = "car"
输出: false
```

**进阶挑战**：如果输入字符串包含 Unicode 字符（如 Emoji）怎么办？

---

## 解法一：排序 (Canonical Form)

最直观的思路是将两个字符串都转换成一种**标准形式 (Canonical Form)**。对于异位词来说，按字母序排序就是它们的标准形式。

```javascript
function isAnagram(s, t) {
    if (s.length !== t.length) return false;
    
    // 1. 转数组 -> 2. 排序 -> 3. 转回字符串比较
    return [...s].sort().join('') === [...t].sort().join('');
}
```

**深度分析**：
-   **时间复杂度**：O(N log N)。排序是主要开销。
-   **空间复杂度**：O(N)。在 JavaScript 中字符串不可变，`split` 或 `[...s]` 都会创建新数组。
-   **评价**：代码最短，但在面试中通常不是最优解，因为排序的开销远大于简单的计数。

---

## 解法二：哈希表计数 (通用解)

异位词的本质是**字符频率相同**。我们可以用一个哈希表记录 `s` 中每个字符出现的次数，然后用 `t` 去抵消。

```javascript
function isAnagram(s, t) {
    if (s.length !== t.length) return false;
    
    const map = new Map();
    
    // 1. 统计 s 的字符频率
    for (const char of s) {
        map.set(char, (map.get(char) || 0) + 1);
    }
    
    // 2. 遍历 t 进行抵消
    for (const char of t) {
        // 如果字符不存在，或次数已减为 0，说明 t 中该字符多了
        if (!map.get(char)) {
            return false;
        }
        map.set(char, map.get(char) - 1);
    }
    
    return true;
}
```

**关键细节**：
-   **Unicode 支持**：使用 `for...of` 循环可以正确遍历 Unicode 字符（包括 Emoji），而普通的 `for(i)` 循环会将 4 字节字符拆成两个乱码。
-   **早期返回**：在抵消过程中，一旦发现计数不足，立即返回 `false`，无需遍历完整个字符串。

---

## 解法三：数组计数 (极致优化)

如果题目限定**只包含小写字母**，我们可以用一个长度为 26 的数组代替 Map。数组访问比 Map 哈希查找更快，且没有哈希冲突的风险。

```javascript
function isAnagram(s, t) {
    if (s.length !== t.length) return false;
    
    const count = new Array(26).fill(0);
    const base = 'a'.charCodeAt(0);
    
    // 1. 统计 s
    for (let i = 0; i < s.length; i++) {
        count[s.charCodeAt(i) - base]++;
    }
    
    // 2. 抵消 t
    for (let i = 0; i < t.length; i++) {
        const index = t.charCodeAt(i) - base;
        count[index]--;
        // 如果减去后小于 0，说明 t 中该字符多了
        if (count[index] < 0) {
            return false;
        }
    }
    
    return true;
}
```

**复杂度分析**：
-   **时间复杂度**：O(N)。只需遍历两次。
-   **空间复杂度**：O(1)。虽然申请了数组，但大小固定为 26（或 128/256），与输入规模 N 无关。

---

## 进阶思考：海量数据处理

**面试官追问**：如果 `s` 和 `t` 非常大（例如 100GB），内存放不下怎么办？

这是一个典型的**大数据处理**场景。
1.  **MapReduce**：将字符串切块，分发到多台机器统计词频（Map 阶段），然后汇总结果（Reduce 阶段）。
2.  **外部排序**：如果不能用哈希（内存不够），可以使用外部排序算法将文件排序，然后流式读取比较。

---

## 本章小结

1.  **模式识别**：涉及"字符计数"、"异位词"、"排列组合"的问题，优先考虑**哈希表/数组计数**。
2.  **权衡**：
    -   **数组**：最快，空间 O(1)，但仅限小字符集。
    -   **Map**：通用，支持 Unicode，但有哈希开销。
    -   **排序**：代码简洁，但时间复杂度高。

掌握了"频率统计"这一招，你就能解决一大类字符串问题（如"赎金信"、"字符串中的第一个唯一字符"）。
