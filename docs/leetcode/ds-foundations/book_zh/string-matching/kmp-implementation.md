# KMP 算法实现与优化

上一章我们理解了 next 数组的含义，知道它记录的是"最长公共前后缀长度"。本章来解决两个问题：

1. 如何**高效**构建 next 数组？
2. 如何用 next 数组完成匹配？

## 构建 next 数组

暴力计算 next 数组需要 O(m²) 甚至 O(m³)。但有一个精妙的方法可以在 O(m) 时间内完成。

核心思想：**利用已计算的 next 值来计算新的 next 值**（动态规划思想）。

### 推导过程

假设我们已经知道 next[0..i-1]，现在要计算 next[i]。

设 j = next[i-1]，即 P[0..j-1] = P[i-j..i-1]（长度为 j 的公共前后缀）。

**情况 1**：P[j] == P[i]

```
P: [A B A B] [C] A B A [B] [C]
    ├──j──┤  ↑          ↑  ↑
    前缀    P[j]       后缀 P[i]

既然 P[j] = P[i]，公共前后缀可以延长一位：
next[i] = j + 1
```

**情况 2**：P[j] != P[i]

需要尝试更短的公共前后缀。怎么找？用 next[j-1]！

```
j = next[j-1]  // 跳到更短的公共前后缀
继续比较 P[j] 和 P[i]
```

重复这个过程，直到 j = 0 或找到匹配。

### 代码实现

```javascript
/**
 * 构建 next 数组
 * @param {string} pattern - 模式串
 * @returns {number[]} - next 数组
 */
function buildNext(pattern) {
    const m = pattern.length;
    const next = new Array(m).fill(0);
    
    // j 表示当前最长公共前后缀的长度
    // 同时也是前缀的"下一个待比较位置"
    let j = 0;
    
    for (let i = 1; i < m; i++) {
        // 不匹配时，回退到更短的前缀
        while (j > 0 && pattern[i] !== pattern[j]) {
            j = next[j - 1];
        }
        
        // 匹配时，长度加 1
        if (pattern[i] === pattern[j]) {
            j++;
        }
        
        next[i] = j;
    }
    
    return next;
}
```

### 执行过程追踪

以 P = "ABABC" 为例：

```
初始：next = [0, 0, 0, 0, 0], j = 0

i=1: P[1]='B', P[j]=P[0]='A'
     'B' ≠ 'A', j=0 不变
     next[1] = 0

i=2: P[2]='A', P[j]=P[0]='A'
     'A' = 'A', j++, j=1
     next[2] = 1

i=3: P[3]='B', P[j]=P[1]='B'
     'B' = 'B', j++, j=2
     next[3] = 2

i=4: P[4]='C', P[j]=P[2]='A'
     'C' ≠ 'A', j=next[1]=0
     P[0]='A', 'C' ≠ 'A', j=0 不变
     next[4] = 0

最终：next = [0, 0, 1, 2, 0]
```

## KMP 匹配算法

有了 next 数组，匹配过程就很直接：

```javascript
/**
 * KMP 字符串匹配
 * @param {string} text - 主串
 * @param {string} pattern - 模式串
 * @returns {number} - 匹配位置，未找到返回 -1
 */
function kmpSearch(text, pattern) {
    if (pattern.length === 0) return 0;
    if (text.length < pattern.length) return -1;
    
    const n = text.length;
    const m = pattern.length;
    const next = buildNext(pattern);
    
    let j = 0;  // 模式串当前位置
    
    for (let i = 0; i < n; i++) {
        // 失配时，根据 next 数组回退
        while (j > 0 && text[i] !== pattern[j]) {
            j = next[j - 1];
        }
        
        // 匹配时，前进
        if (text[i] === pattern[j]) {
            j++;
        }
        
        // 完全匹配
        if (j === m) {
            return i - m + 1;
        }
    }
    
    return -1;
}
```

### 查找所有匹配

```javascript
function kmpSearchAll(text, pattern) {
    if (pattern.length === 0) return [];
    
    const n = text.length;
    const m = pattern.length;
    const next = buildNext(pattern);
    const result = [];
    
    let j = 0;
    
    for (let i = 0; i < n; i++) {
        while (j > 0 && text[i] !== pattern[j]) {
            j = next[j - 1];
        }
        
        if (text[i] === pattern[j]) {
            j++;
        }
        
        if (j === m) {
            result.push(i - m + 1);
            // 关键：找到一个后，继续找下一个
            j = next[j - 1];
        }
    }
    
    return result;
}
```

## 完整执行示例

```
T = "ABABDABABC"
P = "ABABC"
next = [0, 0, 1, 2, 0]

i=0: T[0]='A', j=0
     'A'='A', j=1

i=1: T[1]='B', j=1
     'B'='B', j=2

i=2: T[2]='A', j=2
     'A'='A', j=3

i=3: T[3]='B', j=3
     'B'='B', j=4

i=4: T[4]='D', j=4
     'D'≠'C', j=next[3]=2
     'D'≠'A', j=next[1]=0
     'D'≠'A', j=0 保持

i=5: T[5]='A', j=0
     'A'='A', j=1

i=6: T[6]='B', j=1
     'B'='B', j=2

i=7: T[7]='A', j=2
     'A'='A', j=3

i=8: T[8]='B', j=3
     'B'='B', j=4

i=9: T[9]='C', j=4
     'C'='C', j=5

j=5=m，匹配成功！返回 9-5+1=5
```

用图示来看跳转过程：

```
T: A B A B D A B A B C
P: A B A B C
         ↑ 位置 4 失配

跳转 j=next[3]=2：
T: A B A B D A B A B C
       P: A B A B C
          ↑ 仍不匹配

跳转 j=next[1]=0：
T: A B A B D A B A B C
         P: A B A B C
            ↑ 仍不匹配，j=0

继续前进：
T: A B A B D A B A B C
           P: A B A B C
                      ↑ 完全匹配！位置 5
```

## 时间复杂度分析

**构建 next 数组**：O(m)

关键观察：j 最多增加 m 次，减少也最多 m 次。虽然有 while 循环，但总操作次数是 O(m)。

**匹配过程**：O(n)

类似的分析：i 只增不减，j 最多增加 n 次、减少 n 次。

**总时间复杂度**：O(n + m)

**空间复杂度**：O(m)（存储 next 数组）

### 与朴素算法对比

| 算法 | 时间复杂度 | 空间复杂度 |
|-----|-----------|-----------|
| 朴素 | O(n × m) 最坏 | O(1) |
| KMP | O(n + m) 确定 | O(m) |

KMP 用 O(m) 的额外空间换取了稳定的线性时间复杂度。

## next 数组的优化（nextval）

标准的 next 数组在某些情况下仍有冗余比较。看这个例子：

```
P = "AAAAB"
next = [0, 1, 2, 3, 0]

T = "AAAACAAAAB"
当 T[4]='C' 与 P[4]='B' 失配时：
- j=next[3]=3, P[3]='A' ≠ 'C'
- j=next[2]=2, P[2]='A' ≠ 'C'
- j=next[1]=1, P[1]='A' ≠ 'C'
- j=next[0]=0, P[0]='A' ≠ 'C'
```

回退了 4 次，但每次 P[j] 都是 'A'，都会失配！

优化思路：如果 P[j] == P[next[j]]，直接跳到更远的位置。

```javascript
function buildNextVal(pattern) {
    const m = pattern.length;
    const next = buildNext(pattern);
    const nextval = [...next];
    
    for (let i = 1; i < m; i++) {
        let j = next[i];
        // 如果回退后的字符相同，继续回退
        while (j > 0 && pattern[i] === pattern[j]) {
            j = nextval[j - 1];
        }
        if (j > 0 && pattern[i] === pattern[j]) {
            nextval[i] = 0;
        } else {
            nextval[i] = j;
        }
    }
    
    return nextval;
}
```

这是一个优化版本，在竞赛中有时会用到。但对于大多数场景，标准 next 数组已经足够高效。

## 本章小结

KMP 算法的完整实现包括两部分：

1. **构建 next 数组**：O(m)，利用已计算的值推导新值
2. **匹配过程**：O(n)，失配时根据 next 跳转

核心代码结构几乎相同：while 循环回退，if 判断前进。这是 KMP 的精妙之处——构建和匹配使用同样的逻辑。

**记忆要点**：
- next[i] 表示 P[0..i-1] 的最长公共前后缀长度
- 失配时 j = next[j-1]
- 匹配时 j++
- j == m 时匹配成功

下一章我们将学习另一种思路——字符串哈希和 Rabin-Karp 算法。
