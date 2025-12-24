# 最大频率栈

本章我们来设计一个有趣的数据结构——**最大频率栈**。这道题的独特之处在于它结合了"频率"和"栈"两种概念，需要我们巧妙地设计数据结构来同时满足两个维度的约束。

## 问题描述

**LeetCode 895. 最大频率栈 (Maximum Frequency Stack)**

设计一个类似栈的数据结构，将元素推入栈中，并从栈中弹出**出现频率最高**的元素。

实现 `FreqStack` 类：
- `FreqStack()`：构造一个空的频率栈
- `push(int val)`：将一个整数 `val` 压入栈顶
- `pop()`：删除并返回栈中出现频率最高的元素。如果出现频率最高的元素不止一个，则移除并返回**最接近栈顶**的元素。

**示例**：
```
FreqStack freqStack = new FreqStack();
freqStack.push(5);  // 栈为 [5]
freqStack.push(7);  // 栈为 [5, 7]
freqStack.push(5);  // 栈为 [5, 7, 5]
freqStack.push(7);  // 栈为 [5, 7, 5, 7]
freqStack.push(4);  // 栈为 [5, 7, 5, 7, 4]
freqStack.push(5);  // 栈为 [5, 7, 5, 7, 4, 5]

freqStack.pop();    // 返回 5，因为 5 出现频率最高（3次）
freqStack.pop();    // 返回 7，5 和 7 都出现 2 次，但 7 更接近栈顶
freqStack.pop();    // 返回 5
freqStack.pop();    // 返回 4
```

**提示**：
- 0 <= val <= 10^9
- push 和 pop 的操作数不超过 2 × 10^4
- 输入保证在调用 pop 之前，栈中至少有一个元素

## 思路分析

### 核心挑战

这道题需要同时维护两个维度的信息：
1. **频率**：哪个元素出现次数最多
2. **顺序**：在频率相同时，哪个元素最近被插入

### 解法一的失败尝试

一个自然的想法：用有序集合按 `(频率, 插入时间)` 排序。

```python
# 每个元素存储为 (frequency, timestamp, value)
# 按频率降序，时间戳降序排序
```

问题在于：当一个元素被多次插入时，它的"最近插入时间"会变化，我们需要先删除旧记录再插入新记录。这虽然可行，但实现复杂。

### 正确思路：分层栈

**关键洞察**：把相同频率的元素放在同一个栈中。

想象这样一个结构：
- 第 1 层：所有出现 1 次的元素（按插入顺序排列）
- 第 2 层：所有出现 2 次的元素（按插入顺序排列）
- ...
- 第 k 层：所有出现 k 次的元素

当 `pop` 时，从最高层弹出栈顶元素。

## 解法：分层栈

```python
from collections import defaultdict

class FreqStack:
    def __init__(self):
        # freq[val] = val 当前的出现次数
        self.freq = defaultdict(int)
        
        # stacks[f] = 所有当前频率为 f 的元素组成的栈
        self.stacks = defaultdict(list)
        
        # 当前最大频率
        self.max_freq = 0
    
    def push(self, val: int) -> None:
        # 增加 val 的频率
        self.freq[val] += 1
        f = self.freq[val]
        
        # 将 val 加入对应频率的栈
        self.stacks[f].append(val)
        
        # 更新最大频率
        self.max_freq = max(self.max_freq, f)
    
    def pop(self) -> int:
        # 从最大频率的栈中弹出
        val = self.stacks[self.max_freq].pop()
        
        # 减少该元素的频率
        self.freq[val] -= 1
        
        # 如果当前最大频率的栈为空，减少 max_freq
        if not self.stacks[self.max_freq]:
            self.max_freq -= 1
        
        return val
```

### 执行过程演示

| 操作 | freq | stacks | max_freq | 结果 |
|------|------|--------|----------|------|
| push(5) | {5:1} | {1:[5]} | 1 | - |
| push(7) | {5:1,7:1} | {1:[5,7]} | 1 | - |
| push(5) | {5:2,7:1} | {1:[5,7],2:[5]} | 2 | - |
| push(7) | {5:2,7:2} | {1:[5,7],2:[5,7]} | 2 | - |
| push(4) | {5:2,7:2,4:1} | {1:[5,7,4],2:[5,7]} | 2 | - |
| push(5) | {5:3,7:2,4:1} | {1:[5,7,4],2:[5,7],3:[5]} | 3 | - |
| pop() | {5:2,...} | {1:[5,7,4],2:[5,7]} | 2 | 5 |
| pop() | {7:1,...} | {1:[5,7,4],2:[5]} | 2 | 7 |
| pop() | {5:1,...} | {1:[5,7,4]} | 1 | 5 |
| pop() | {4:0,...} | {1:[5,7]} | 1 | 4 |

### 为什么这个设计正确？

1. **频率最高**：我们总是从 `max_freq` 层弹出
2. **最近插入**：每一层都是一个栈，后进先出

**时间复杂度**：`push` O(1)，`pop` O(1)
**空间复杂度**：O(n)，n 是操作次数

## 为什么不需要平衡树？

这道题虽然在"平衡树与有序集合"章节，但最优解不需要平衡树。这恰好说明了一个重要原则：**选择最适合问题的数据结构**。

如果用有序集合实现：

```python
from sortedcontainers import SortedList

class FreqStack:
    def __init__(self):
        self.freq = defaultdict(int)
        self.timestamp = 0
        # (freq, timestamp, val)，按 freq 和 timestamp 降序
        self.sorted_list = SortedList(key=lambda x: (-x[0], -x[1]))
        self.val_to_entry = defaultdict(list)  # val -> [entries]
    
    def push(self, val: int) -> None:
        self.freq[val] += 1
        self.timestamp += 1
        entry = (self.freq[val], self.timestamp, val)
        self.sorted_list.add(entry)
        self.val_to_entry[val].append(entry)
    
    def pop(self) -> int:
        entry = self.sorted_list.pop(0)  # 弹出最大的
        val = entry[2]
        self.freq[val] -= 1
        self.val_to_entry[val].pop()
        return val
```

这个实现是 O(log n) 的，比分层栈的 O(1) 慢。

## 变体问题

### 变体一：支持查询最大频率元素

```python
def peek(self) -> int:
    """返回频率最高的元素，但不弹出"""
    return self.stacks[self.max_freq][-1]
```

### 变体二：支持删除任意元素

如果需要支持 `remove(val)` 操作，问题会复杂很多：
1. 需要知道 `val` 在哪些层的哪些位置
2. 删除后需要维护栈的连续性

这时候可能需要更复杂的数据结构，如：
- 链表 + 哈希表
- 或者使用懒惰删除

### 变体三：最小频率栈

将 `pop` 改为弹出频率最低的元素：

```python
def pop(self) -> int:
    # 从最小频率的栈中弹出
    val = self.stacks[self.min_freq].pop()
    self.freq[val] -= 1
    
    if not self.stacks[self.min_freq]:
        self.min_freq += 1
    
    return val
```

但维护 `min_freq` 比 `max_freq` 更复杂，因为 `push` 可能降低最小频率。

## 常见错误

### 错误一：忘记更新 max_freq

```python
def pop(self) -> int:
    val = self.stacks[self.max_freq].pop()
    self.freq[val] -= 1
    # 忘记检查栈是否为空并更新 max_freq
    return val
```

### 错误二：混淆"当前频率"和"历史频率"

每个元素在每一层只出现一次。当元素从高层弹出后，它在低层的记录仍然有效。

```python
# push(5), push(5), push(5)
# stacks = {1: [5], 2: [5], 3: [5]}

# pop() 弹出第 3 层的 5
# stacks = {1: [5], 2: [5]}
# 第 1 层和第 2 层的 5 仍在
```

### 错误三：删除错误的条目

当 `pop` 后更新 `freq[val]` 时，不要试图从其他层删除元素。

## 设计模式总结

这道题展示了一个重要的设计模式：**分层存储**。

当需要按某个维度排序，但同时需要保持插入顺序时，可以考虑：
1. 按排序维度分层
2. 每层内部保持插入顺序

类似的设计在 LRU Cache、LFU Cache 等问题中也很常见。

## 本章小结

最大频率栈是一道优雅的数据结构设计题。

**核心要点**：

1. **分层栈设计**：按频率分层，每层是一个栈
2. **多维信息维护**：频率通过层级体现，顺序通过栈内位置体现
3. **O(1) 复杂度**：设计巧妙，避免了排序
4. **维护 max_freq**：关键是在栈为空时及时减小

**设计启示**：
- 不是所有问题都需要复杂的数据结构
- 从问题本质出发设计数据结构
- 分层存储是处理多维信息的有效模式

下一章我们将回到有序集合的应用——避免洪水泛滥，这是一道结合贪心和有序集合的有趣问题。
