# 后缀自动机原理

**后缀自动机**（Suffix Automaton，简称 SAM）是处理字符串子串问题的终极武器。它能在 O(n) 时间和空间内表示一个字符串的所有子串，并支持各种高效查询。

---

## 什么是后缀自动机？

### 定义

后缀自动机是一个**最小化的确定性有限自动机**（DFA），它能够接受且仅接受一个字符串 s 的所有子串。

换句话说：
- 从初始状态出发，沿着某条路径到达任意状态，路径上的字符序列一定是 s 的子串
- s 的任意子串都对应从初始状态出发的某条路径

### 核心特性

1. **状态数**：最多 2n-1 个状态（n 是字符串长度）
2. **转移数**：最多 3n-4 条转移
3. **空间复杂度**：O(n)
4. **构建时间**：O(n)

---

## 核心概念：endpos 等价类

### endpos 集合的定义

对于字符串 s 的一个子串 t，定义 **endpos(t)** 为 t 在 s 中所有出现位置的**结束位置**集合。

```
s = "abcabc"
位置:  0 1 2 3 4 5

endpos("a") = {0, 3}
endpos("b") = {1, 4}
endpos("c") = {2, 5}
endpos("ab") = {1, 4}
endpos("bc") = {2, 5}
endpos("abc") = {2, 5}
endpos("abcabc") = {5}
```

### endpos 等价类

如果两个子串 t1 和 t2 有相同的 endpos 集合，我们说它们是 **endpos 等价**的。

```
在 "abcabc" 中：
endpos("ab") = {1, 4}
endpos("b") = {1, 4}
→ "ab" 和 "b" 是 endpos 等价的

endpos("abc") = {2, 5}
endpos("bc") = {2, 5}
endpos("c") = {2, 5}
→ "abc", "bc", "c" 是 endpos 等价的
```

### 关键性质

**性质 1**：如果 t1 是 t2 的后缀，且 len(t1) < len(t2)，那么：
$$endpos(t2) \subseteq endpos(t1)$$

直观理解：更长的子串出现的位置，更短的后缀一定也出现。

**性质 2**：对于两个子串 t1 和 t2（假设 len(t1) ≤ len(t2)），要么：
- $endpos(t1) \cap endpos(t2) = \emptyset$（不相交）
- 或者 $endpos(t2) \subseteq endpos(t1)$（t1 是 t2 的后缀）

这意味着 **endpos 集合形成树形结构**！

**性质 3**：同一个等价类中的子串，长度形成一个连续区间 $[min, max]$，且它们都是最长子串的后缀。

---

## SAM 的结构

### 状态

SAM 的每个**状态**对应一个 **endpos 等价类**。

每个状态包含：
- **len**：该等价类中最长子串的长度
- **link**：后缀链接，指向另一个状态
- **trans**：字符转移表

### 后缀链接（Suffix Link）

状态 p 的后缀链接指向这样的状态 q：
- q 中的子串是 p 中最长子串的**最长真后缀**
- 且这个后缀属于不同的等价类

```
状态 p: 包含 "abc", "bc", "c" (len=3, minlen=1)
状态 q: 包含 "b", "ab" 的后缀状态...
```

后缀链接形成一棵**树**（以初始状态为根），称为**后缀链接树**或 **parent 树**。

### 转移

从状态 p 读入字符 c 到达状态 q，表示：
- 如果 t 是 p 中的子串
- 那么 t + c 是 q 中的子串

---

## 直观理解

让我们用一个例子来理解 SAM 的结构。

### 示例：s = "aabab"

```
所有子串和 endpos：
  "a"     → {0, 1, 3}
  "b"     → {2, 4}
  "aa"    → {1}
  "ab"    → {2, 4}
  "ba"    → {3}
  "aab"   → {2}
  "aba"   → {3}
  "bab"   → {4}
  "aaba"  → {3}
  "abab"  → {4}
  "aabab" → {4}
```

### 等价类划分

```
等价类 0 (初始状态): endpos = 全集，代表空串
等价类 1: endpos = {0, 1, 3}，代表 "a"
等价类 2: endpos = {2, 4}，代表 "ab", "b"
等价类 3: endpos = {1}，代表 "aa"
等价类 4: endpos = {3}，代表 "aaba", "aba", "ba", "a" 的某个后缀...
... (需要仔细分析)
```

### SAM 图示

```
状态:  0 --a--> 1 --a--> 3
       |        |
       b        b
       v        v
       2 <----- 4 --b--> 5
       
后缀链接（虚线）:
  1 --> 0
  2 --> 0
  3 --> 1
  4 --> 2
  5 --> 4 (或其他，取决于具体子串)
```

---

## 状态的属性

### len 和 minlen

每个状态 p 有两个长度属性：
- **len[p]**：等价类中最长子串的长度
- **minlen[p]**：等价类中最短子串的长度

关系：
$$minlen[p] = len[link[p]] + 1$$

等价类 p 中的子串长度范围是 $[minlen[p], len[p]]$。

### 子串数量

等价类 p 包含的不同子串数量：
$$count[p] = len[p] - len[link[p]]$$

### endpos 大小

等价类 p 的 endpos 集合大小 = 该等价类对应的**终止状态数**（通过后缀链接树计算）。

---

## SAM 的数据结构

```python
class State:
    def __init__(self):
        self.len = 0        # 最长子串长度
        self.link = -1      # 后缀链接
        self.trans = {}     # 字符转移

class SuffixAutomaton:
    def __init__(self):
        self.states = [State()]  # 初始状态
        self.last = 0            # 最后添加的状态
    
    def size(self):
        return len(self.states)
```

---

## SAM 的基本操作

### 检查子串是否存在

```python
def contains(self, t: str) -> bool:
    """检查 t 是否是原字符串的子串"""
    cur = 0  # 从初始状态开始
    for c in t:
        if c not in self.states[cur].trans:
            return False
        cur = self.states[cur].trans[c]
    return True
```

时间复杂度：O(|t|)

### 查找子串出现次数

需要先预处理每个状态的 endpos 大小：

```python
def count_occurrences(self, t: str) -> int:
    """返回 t 在原字符串中的出现次数"""
    cur = 0
    for c in t:
        if c not in self.states[cur].trans:
            return 0
        cur = self.states[cur].trans[c]
    return self.endpos_size[cur]  # 预处理的 endpos 大小
```

### 查找子串首次出现位置

需要预处理每个状态的 first_pos：

```python
def first_occurrence(self, t: str) -> int:
    """返回 t 首次出现的结束位置，不存在返回 -1"""
    cur = 0
    for c in t:
        if c not in self.states[cur].trans:
            return -1
        cur = self.states[cur].trans[c]
    return self.first_pos[cur] - len(t) + 1
```

---

## SAM vs 后缀数组 vs 后缀树

| 特性 | SAM | 后缀数组 | 后缀树 |
|------|-----|---------|-------|
| 空间 | O(n) | O(n) | O(n) |
| 构建时间 | O(n) | O(n) ~ O(n log n) | O(n) |
| 子串存在 | O(m) | O(m log n) | O(m) |
| 子串计数 | O(m) | O(m log n) | O(m) |
| 不同子串数 | O(1) (预处理) | O(n) | O(n) |
| 最长公共子串 | O(m) | O((n+m) log n) | O(n+m) |
| 实现难度 | 中等 | 简单 | 困难 |

### 何时使用 SAM？

- 需要高效的子串查询和计数
- 需要处理多个模式串
- 需要在线添加字符
- 最长公共子串等问题

---

## 与其他自动机的关系

### 后缀自动机 vs 后缀树

后缀树是后缀 Trie 的压缩形式。SAM 可以看作后缀树的"反向"：
- 后缀树：共享前缀
- SAM：共享 endpos 相同的子串（即共享后缀信息）

实际上，**SAM 的后缀链接树就是反向后缀树**（将原字符串反转后建立的后缀树）！

### 后缀自动机 vs AC 自动机

- AC 自动机：识别多个模式串
- SAM：识别一个字符串的所有子串

SAM 可以看作是为"所有子串"这个特殊模式集合构建的最小自动机。

---

## 本章小结

本章介绍了后缀自动机的基本概念：

1. **定义**：接受所有子串的最小 DFA

2. **核心概念**：
   - endpos 集合：子串的结束位置集合
   - endpos 等价类：endpos 相同的子串归为一类
   - 每个状态对应一个等价类

3. **关键性质**：
   - endpos 集合形成树形包含关系
   - 同一等价类的子串长度连续
   - 状态数 ≤ 2n-1，转移数 ≤ 3n-4

4. **状态属性**：
   - len：最长子串长度
   - link：后缀链接
   - trans：字符转移

5. **基本操作**：
   - 子串存在性检查：O(m)
   - 子串出现次数：O(m)

下一章我们将学习如何**在线构建后缀自动机**。
