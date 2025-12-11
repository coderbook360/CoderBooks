# Rabin-Karp 算法

上一章我们学习了字符串哈希，可以 O(1) 计算子串的哈希值。本章将这个技术应用到字符串匹配中——这就是 **Rabin-Karp 算法**。

## 算法核心思想

Rabin-Karp 的思路很直接：**用哈希值代替逐字符比较**。

基本流程：
1. 计算模式串的哈希值
2. 滑动窗口遍历主串，计算每个窗口的哈希值
3. 哈希值相等时，逐字符验证（处理冲突）

与朴素算法的区别：
- 朴素：每个位置逐字符比较，O(m)
- Rabin-Karp：每个位置比较哈希值，O(1)

关键问题：如何快速计算"下一个窗口"的哈希值？

## 滚动哈希

如果每次都从头计算窗口的哈希值，复杂度还是 O(n×m)。我们需要**滚动哈希**：利用前一个窗口的哈希值，O(1) 计算下一个窗口的哈希值。

### 推导

```
当前窗口：s[i..i+m-1]
hash_i = s[i]×B^(m-1) + s[i+1]×B^(m-2) + ... + s[i+m-1]×B^0

下一窗口：s[i+1..i+m]
hash_{i+1} = s[i+1]×B^(m-1) + s[i+2]×B^(m-2) + ... + s[i+m]×B^0
```

观察两者的关系：
```
hash_{i+1} = (hash_i - s[i]×B^(m-1)) × B + s[i+m]
```

用文字描述：
1. 减去最高位（移出窗口的字符）
2. 乘以 B（所有位左移）
3. 加上最低位（新进入窗口的字符）

### 图示

```
窗口 i:   [a b c d] e f
           ↑ 移出

窗口 i+1:   a [b c d e] f
                     ↑ 移入

hash_{i+1} = (hash_i - hash('a')×B³) × B + hash('e')
```

## 算法实现

```javascript
/**
 * Rabin-Karp 字符串匹配
 * @param {string} text - 主串
 * @param {string} pattern - 模式串
 * @returns {number} - 匹配位置，未找到返回 -1
 */
function rabinKarp(text, pattern, B = 31, MOD = 1e9 + 7) {
    const n = text.length;
    const m = pattern.length;
    
    if (m === 0) return 0;
    if (n < m) return -1;
    
    // 计算 B^(m-1) % MOD
    let highPower = 1;
    for (let i = 0; i < m - 1; i++) {
        highPower = (highPower * B) % MOD;
    }
    
    // 计算模式串的哈希值
    let patternHash = 0;
    for (const char of pattern) {
        patternHash = (patternHash * B + char.charCodeAt(0)) % MOD;
    }
    
    // 计算第一个窗口的哈希值
    let windowHash = 0;
    for (let i = 0; i < m; i++) {
        windowHash = (windowHash * B + text.charCodeAt(i)) % MOD;
    }
    
    // 滑动窗口匹配
    for (let i = 0; i <= n - m; i++) {
        // 哈希值相等，验证实际字符串
        if (windowHash === patternHash) {
            if (text.slice(i, i + m) === pattern) {
                return i;
            }
        }
        
        // 计算下一个窗口的哈希值
        if (i < n - m) {
            // 滚动：减去最高位，乘 B，加新字符
            windowHash = (
                (windowHash - text.charCodeAt(i) * highPower % MOD + MOD) * B +
                text.charCodeAt(i + m)
            ) % MOD;
        }
    }
    
    return -1;
}
```

**注意负数处理**：`windowHash - text.charCodeAt(i) * highPower % MOD` 可能为负，需要 `+ MOD` 再取模。

### 查找所有匹配

```javascript
function rabinKarpAll(text, pattern, B = 31, MOD = 1e9 + 7) {
    const n = text.length;
    const m = pattern.length;
    const result = [];
    
    if (m === 0 || n < m) return result;
    
    let highPower = 1;
    for (let i = 0; i < m - 1; i++) {
        highPower = (highPower * B) % MOD;
    }
    
    let patternHash = 0;
    for (const char of pattern) {
        patternHash = (patternHash * B + char.charCodeAt(0)) % MOD;
    }
    
    let windowHash = 0;
    for (let i = 0; i < m; i++) {
        windowHash = (windowHash * B + text.charCodeAt(i)) % MOD;
    }
    
    for (let i = 0; i <= n - m; i++) {
        if (windowHash === patternHash && text.slice(i, i + m) === pattern) {
            result.push(i);
        }
        
        if (i < n - m) {
            windowHash = (
                (windowHash - text.charCodeAt(i) * highPower % MOD + MOD) * B +
                text.charCodeAt(i + m)
            ) % MOD;
        }
    }
    
    return result;
}
```

## 复杂度分析

**时间复杂度**：
- 预处理：O(m)
- 匹配：O(n)（无冲突时）或 O(n×m)（大量冲突时）
- **期望**：O(n + m)

如果选择好的哈希参数，冲突概率很低，期望时间复杂度是线性的。

**空间复杂度**：O(1)（不考虑输入输出）

### 与 KMP 对比

| 特性 | KMP | Rabin-Karp |
|-----|-----|------------|
| 时间复杂度 | O(n+m) 确定 | O(n+m) 期望 |
| 空间复杂度 | O(m) | O(1) |
| 最坏情况 | O(n+m) | O(n×m) |
| 多模式匹配 | 需要 AC 自动机 | 容易扩展 |
| 实现复杂度 | 较复杂 | 较简单 |

**选择建议**：
- 需要稳定性能：KMP
- 多模式匹配：Rabin-Karp
- 快速实现：Rabin-Karp

## 多模式匹配扩展

Rabin-Karp 的一大优势是容易扩展到多模式匹配。

场景：在主串中查找多个模式串。

思路：将所有模式串的哈希值存入 Set，然后滑动窗口检查。

```javascript
function rabinKarpMultiple(text, patterns) {
    if (patterns.length === 0) return new Map();
    
    const result = new Map();
    const B = 31, MOD = 1e9 + 7;
    
    // 按长度分组
    const byLength = new Map();
    for (const p of patterns) {
        const len = p.length;
        if (!byLength.has(len)) {
            byLength.set(len, new Map());  // hash -> pattern
        }
        const hash = stringHash(p, B, MOD);
        byLength.get(len).set(hash, p);
    }
    
    // 对每种长度进行匹配
    for (const [m, hashMap] of byLength) {
        if (text.length < m) continue;
        
        let highPower = 1;
        for (let i = 0; i < m - 1; i++) {
            highPower = (highPower * B) % MOD;
        }
        
        let windowHash = 0;
        for (let i = 0; i < m; i++) {
            windowHash = (windowHash * B + text.charCodeAt(i)) % MOD;
        }
        
        for (let i = 0; i <= text.length - m; i++) {
            if (hashMap.has(windowHash)) {
                const p = hashMap.get(windowHash);
                if (text.slice(i, i + m) === p) {
                    if (!result.has(p)) result.set(p, []);
                    result.get(p).push(i);
                }
            }
            
            if (i < text.length - m) {
                windowHash = (
                    (windowHash - text.charCodeAt(i) * highPower % MOD + MOD) * B +
                    text.charCodeAt(i + m)
                ) % MOD;
            }
        }
    }
    
    return result;
}

function stringHash(s, B, MOD) {
    let hash = 0;
    for (const char of s) {
        hash = (hash * B + char.charCodeAt(0)) % MOD;
    }
    return hash;
}
```

## 常见错误

1. **溢出和负数**：减法后必须处理负数情况
2. **哈希冲突**：哈希相等必须验证实际字符串
3. **highPower 计算**：是 B^(m-1)，不是 B^m
4. **边界条件**：空串、主串比模式串短

## 本章小结

Rabin-Karp 算法的核心是**滚动哈希**：

1. 用哈希值代替逐字符比较
2. 滚动计算：O(1) 更新窗口哈希值
3. 哈希相等时验证实际字符串
4. 期望时间复杂度 O(n+m)

它的优势在于：
- 实现相对简单
- 容易扩展到多模式匹配
- 空间复杂度 O(1)

下一章我们将综合运用本部分学到的所有算法，解决 LeetCode 上的字符串匹配题目。
