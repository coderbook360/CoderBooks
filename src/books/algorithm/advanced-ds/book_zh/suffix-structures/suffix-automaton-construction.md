# 后缀自动机构建

上一章我们学习了后缀自动机的基本概念。本章将详细讲解如何**在线构建**后缀自动机，这是一个精巧的 O(n) 算法。

---

## 在线构建思想

后缀自动机支持**在线构建**：每次向字符串末尾添加一个字符，更新自动机。

核心问题：添加字符 c 后，如何维护自动机的状态和转移？

### 变化分析

假设当前字符串是 s，添加字符 c 后变成 s + c。

新增的子串是：**s + c 的所有后缀中，以 c 结尾的那些**。

具体地：
- 新子串：c, sc, ssc, sssc, ...
- 其中 s, ss, sss, ... 是 s 的后缀

这些新子串需要在自动机中得到正确的表示。

---

## 构建算法

### 状态定义

```python
class State:
    def __init__(self):
        self.len = 0        # 该状态最长字符串的长度
        self.link = -1      # 后缀链接
        self.trans = {}     # 转移字典
```

### 核心变量

- `last`：当前整个字符串对应的状态（即终态）
- `size`：当前状态数量

### 添加字符的过程

```python
def add_char(self, c: str):
    """添加一个字符，更新 SAM"""
    # 创建新状态
    cur = len(self.states)
    self.states.append(State())
    self.states[cur].len = self.states[self.last].len + 1
    
    # 从 last 沿后缀链接向上走
    p = self.last
    while p != -1 and c not in self.states[p].trans:
        self.states[p].trans[c] = cur
        p = self.states[p].link
    
    if p == -1:
        # 情况 1：没有任何状态有字符 c 的转移
        self.states[cur].link = 0
    else:
        q = self.states[p].trans[c]
        if self.states[p].len + 1 == self.states[q].len:
            # 情况 2：q 的最长字符串正好是 p 的最长字符串 + c
            self.states[cur].link = q
        else:
            # 情况 3：需要分裂状态 q
            clone = len(self.states)
            self.states.append(State())
            self.states[clone].len = self.states[p].len + 1
            self.states[clone].trans = self.states[q].trans.copy()
            self.states[clone].link = self.states[q].link
            
            # 更新 q 和 cur 的后缀链接
            self.states[q].link = clone
            self.states[cur].link = clone
            
            # 更新所有指向 q 的转移
            while p != -1 and self.states[p].trans.get(c) == q:
                self.states[p].trans[c] = clone
                p = self.states[p].link
    
    self.last = cur
```

---

## 三种情况详解

### 情况 1：无转移

从 `last` 沿后缀链接一直走到初始状态（根），都没有字符 c 的转移。

这意味着字符 c 之前从未出现过，或者以 c 结尾的子串都是全新的。

**处理**：新状态的后缀链接直接指向根。

```
添加前: last = 2, 状态 0,1,2 都没有 c 的转移
添加后: 新状态 3 的 link 指向 0
       状态 0,1,2 都添加到 3 的 c 转移
```

### 情况 2：转移存在且连续

找到了状态 p 有字符 c 的转移，转移到状态 q。

并且 `len[q] == len[p] + 1`，说明 q 的最长子串正好比 p 的最长子串多一个字符。

**处理**：新状态的后缀链接直接指向 q。

```
p 的最长子串: "ab"  (len=2)
q 的最长子串: "abc" (len=3)
关系: q 包含 p + c，完美匹配
```

### 情况 3：需要分裂

找到了状态 p 有字符 c 的转移到 q，但 `len[q] > len[p] + 1`。

这意味着 q 包含了一些**不应该和 p + c 共享 endpos 的子串**。

**处理**：创建 q 的克隆 clone，让 clone 承担"短"的部分。

```
p 的最长子串: "a"   (len=1)
q 的最长子串: "abc" (len=3)

问题: q 中还包含 "bc"(len=2)
      而 p + c = "ac" (len=2) 和 "bc" 的 endpos 不同

解决: 创建 clone，len=2
      clone 代表 "ac" 和 "bc" 这些长度 ≤ len[p]+1 的子串
      原来的 q 只代表 "abc" 这样的更长子串
```

---

## 完整实现

```python
from typing import Dict, List

class State:
    def __init__(self):
        self.len = 0
        self.link = -1
        self.trans: Dict[str, int] = {}

class SuffixAutomaton:
    def __init__(self):
        self.states: List[State] = [State()]  # 初始状态
        self.states[0].link = -1
        self.last = 0
    
    def add_char(self, c: str) -> None:
        """添加一个字符"""
        cur = len(self.states)
        self.states.append(State())
        self.states[cur].len = self.states[self.last].len + 1
        
        p = self.last
        while p != -1 and c not in self.states[p].trans:
            self.states[p].trans[c] = cur
            p = self.states[p].link
        
        if p == -1:
            self.states[cur].link = 0
        else:
            q = self.states[p].trans[c]
            if self.states[p].len + 1 == self.states[q].len:
                self.states[cur].link = q
            else:
                clone = len(self.states)
                self.states.append(State())
                self.states[clone].len = self.states[p].len + 1
                self.states[clone].trans = self.states[q].trans.copy()
                self.states[clone].link = self.states[q].link
                
                self.states[q].link = clone
                self.states[cur].link = clone
                
                while p != -1 and self.states[p].trans.get(c) == q:
                    self.states[p].trans[c] = clone
                    p = self.states[p].link
        
        self.last = cur
    
    def build(self, s: str) -> None:
        """从字符串构建 SAM"""
        for c in s:
            self.add_char(c)
    
    def size(self) -> int:
        """返回状态数"""
        return len(self.states)
    
    def contains(self, t: str) -> bool:
        """检查 t 是否是子串"""
        cur = 0
        for c in t:
            if c not in self.states[cur].trans:
                return False
            cur = self.states[cur].trans[c]
        return True
```

---

## 执行过程示例

以 `s = "aab"` 为例，逐步构建 SAM：

### 初始状态

```
状态 0: len=0, link=-1, trans={}
last = 0
```

### 添加 'a' (第一个)

```
创建状态 1: len=1
从 last=0 向上走:
  0 没有 'a' 转移，添加 0->1
  p 变为 -1
情况 1: link[1] = 0

状态 0: len=0, link=-1, trans={a: 1}
状态 1: len=1, link=0, trans={}
last = 1
```

### 添加 'a' (第二个)

```
创建状态 2: len=2
从 last=1 向上走:
  1 没有 'a' 转移，添加 1->2
  0 已有 'a' 转移到 1，停止
  p = 0, q = 1
  len[1] = 1, len[0] + 1 = 1
情况 2: link[2] = 1

状态 0: len=0, link=-1, trans={a: 1}
状态 1: len=1, link=0, trans={a: 2}
状态 2: len=2, link=1, trans={}
last = 2
```

### 添加 'b'

```
创建状态 3: len=3
从 last=2 向上走:
  2 没有 'b' 转移，添加 2->3
  1 没有 'b' 转移，添加 1->3
  0 没有 'b' 转移，添加 0->3
  p = -1
情况 1: link[3] = 0

状态 0: len=0, link=-1, trans={a: 1, b: 3}
状态 1: len=1, link=0, trans={a: 2, b: 3}
状态 2: len=2, link=1, trans={b: 3}
状态 3: len=3, link=0, trans={}
last = 3
```

### 最终 SAM

```
   0 --a--> 1 --a--> 2
   |        |        |
   b        b        b
   |        |        |
   +------> 3 <------+

后缀链接:
  1 -> 0
  2 -> 1
  3 -> 0
```

验证：
- "a" 存在：0 -> 1 ✓
- "aa" 存在：0 -> 1 -> 2 ✓
- "aab" 存在：0 -> 1 -> 2 -> 3 ✓
- "ab" 存在：0 -> 1 -> 3 ✓
- "b" 存在：0 -> 3 ✓

---

## 时间复杂度分析

### 为什么是 O(n)？

看起来 `add_char` 中有两个 while 循环，每个都可能遍历很多状态。但实际上：

**关键观察**：每次添加字符后，`last` 的 len 增加 1。

**势能分析**：
- 定义势能 Φ = len[last]
- 第一个 while 循环：每次 p 沿 link 上移，势能减少
- 添加新状态后：势能增加 1
- 总势能增加 = n（总共 n 个字符）
- 所以总循环次数 = O(n)

类似地，第二个 while 循环的分析也是 O(n)。

**总时间复杂度**：O(n)

### 空间复杂度

- 状态数 ≤ 2n - 1
- 每个状态的转移数最多是字母表大小
- **总空间**：O(n × |Σ|)，其中 |Σ| 是字母表大小

如果用哈希表存储转移，空间是 O(n)。

---

## 预处理：计算 endpos 大小

很多应用需要知道每个状态的 endpos 集合大小（即该子串出现了多少次）。

```python
def compute_endpos_sizes(self) -> List[int]:
    """
    计算每个状态的 endpos 大小
    需要在 build 完成后调用
    """
    n = len(self.states)
    
    # 按 len 降序排序状态
    order = sorted(range(n), key=lambda i: -self.states[i].len)
    
    # 初始化：只有 last 路径上的状态有 endpos
    size = [0] * n
    
    # 标记所有"终态"（代表原字符串后缀的状态）
    cur = self.last
    while cur > 0:
        size[cur] = 1
        cur = self.states[cur].link
    
    # 按 len 从大到小传递
    for v in order:
        if self.states[v].link >= 0:
            size[self.states[v].link] += size[v]
    
    return size
```

**解释**：
1. 终态是代表原字符串某个后缀的状态，每个终态的 endpos 包含一个位置
2. 沿后缀链接，endpos 是子集关系，所以大小要累加

---

## 预处理：计算 first_pos

```python
def compute_first_pos(self) -> List[int]:
    """
    计算每个状态的 first_pos（endpos 中的最小值）
    """
    n = len(self.states)
    first_pos = [-1] * n
    
    # 按 len 升序排序
    order = sorted(range(n), key=lambda i: self.states[i].len)
    
    # 初始化：直接创建的状态（非 clone）
    # 它们的 first_pos 就是创建时的位置
    # 需要在 add_char 时记录
    
    # 简化版本：通过后缀链接传递
    for v in order:
        if first_pos[v] == -1 and self.states[v].link >= 0:
            first_pos[v] = first_pos[self.states[v].link]
    
    return first_pos
```

更准确的做法是在 `add_char` 时记录每个非克隆状态的创建位置。

---

## 完整功能版本

```python
from typing import Dict, List, Optional

class State:
    def __init__(self):
        self.len = 0
        self.link = -1
        self.trans: Dict[str, int] = {}
        self.first_pos = -1  # 首次出现的结束位置
        self.is_clone = False  # 是否是克隆状态

class SuffixAutomaton:
    def __init__(self):
        self.states: List[State] = [State()]
        self.states[0].link = -1
        self.last = 0
        self._endpos_size: Optional[List[int]] = None
    
    def add_char(self, c: str, pos: int = -1) -> None:
        """添加一个字符"""
        cur = len(self.states)
        self.states.append(State())
        self.states[cur].len = self.states[self.last].len + 1
        self.states[cur].first_pos = self.states[cur].len - 1  # 当前位置
        
        p = self.last
        while p != -1 and c not in self.states[p].trans:
            self.states[p].trans[c] = cur
            p = self.states[p].link
        
        if p == -1:
            self.states[cur].link = 0
        else:
            q = self.states[p].trans[c]
            if self.states[p].len + 1 == self.states[q].len:
                self.states[cur].link = q
            else:
                clone = len(self.states)
                self.states.append(State())
                self.states[clone].len = self.states[p].len + 1
                self.states[clone].trans = self.states[q].trans.copy()
                self.states[clone].link = self.states[q].link
                self.states[clone].first_pos = self.states[q].first_pos
                self.states[clone].is_clone = True
                
                self.states[q].link = clone
                self.states[cur].link = clone
                
                while p != -1 and self.states[p].trans.get(c) == q:
                    self.states[p].trans[c] = clone
                    p = self.states[p].link
        
        self.last = cur
        self._endpos_size = None  # 失效缓存
    
    def build(self, s: str) -> None:
        """从字符串构建"""
        for i, c in enumerate(s):
            self.add_char(c, i)
    
    def contains(self, t: str) -> bool:
        """检查子串存在性"""
        cur = 0
        for c in t:
            if c not in self.states[cur].trans:
                return False
            cur = self.states[cur].trans[c]
        return True
    
    def count_distinct_substrings(self) -> int:
        """统计不同子串数量"""
        result = 0
        for state in self.states[1:]:  # 跳过初始状态
            result += state.len - self.states[state.link].len
        return result
    
    def get_endpos_sizes(self) -> List[int]:
        """获取每个状态的 endpos 大小"""
        if self._endpos_size is not None:
            return self._endpos_size
        
        n = len(self.states)
        order = sorted(range(n), key=lambda i: -self.states[i].len)
        
        size = [0] * n
        cur = self.last
        while cur > 0:
            size[cur] = 1
            cur = self.states[cur].link
        
        for v in order:
            if self.states[v].link >= 0:
                size[self.states[v].link] += size[v]
        
        self._endpos_size = size
        return size
    
    def count_occurrences(self, t: str) -> int:
        """统计子串出现次数"""
        cur = 0
        for c in t:
            if c not in self.states[cur].trans:
                return 0
            cur = self.states[cur].trans[c]
        return self.get_endpos_sizes()[cur]
```

---

## 使用示例

```python
# 构建 SAM
sam = SuffixAutomaton()
sam.build("abcabc")

# 检查子串
print(sam.contains("abc"))   # True
print(sam.contains("cab"))   # True
print(sam.contains("acb"))   # False

# 统计不同子串
print(sam.count_distinct_substrings())  # 15

# 统计出现次数
print(sam.count_occurrences("abc"))  # 2
print(sam.count_occurrences("ab"))   # 2
print(sam.count_occurrences("a"))    # 2
```

---

## 本章小结

本章详细讲解了后缀自动机的在线构建算法：

1. **核心思想**：每次添加字符，维护 endpos 等价类

2. **三种情况**：
   - 无转移：新状态链接到根
   - 转移存在且连续：直接链接
   - 需要分裂：创建克隆状态

3. **时间复杂度**：O(n)，通过势能分析证明

4. **实用预处理**：
   - endpos 大小：统计子串出现次数
   - first_pos：找子串首次出现位置

5. **常用操作**：
   - `contains(t)`：O(|t|) 检查子串存在
   - `count_occurrences(t)`：O(|t|) 统计出现次数
   - `count_distinct_substrings()`：O(n) 统计不同子串

下一章我们将应用 SAM 解决经典问题：**本质不同子串计数**。
