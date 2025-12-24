# 设计跳表

前面几章我们一直在"使用"有序集合，本章我们来亲手"实现"一个——**跳表（Skip List）**。跳表是一种优雅的概率数据结构，它用随机化的方式实现了平衡树的功能，但代码比红黑树简单得多。

## 问题描述

**LeetCode 1206. 设计跳表 (Design Skiplist)**

设计一个跳表，支持以下操作：
- `search(target)`：返回 `target` 是否存在于跳表中
- `add(num)`：插入一个元素到跳表
- `erase(num)`：删除一个值等于 `num` 的元素。如果有多个，只删除一个。如果不存在，返回 `false`

**跳表简介**：跳表是一种数据结构，允许在 O(log n) 时间内完成增加、删除、搜索操作。跳表相比于树堆与红黑树，其功能与性能相当，实现更简单。

## 跳表的原理

### 从链表到跳表

普通链表的查找是 O(n) 的——必须从头遍历到尾。

跳表的核心思想：**建立多层索引**。

想象一个排序链表 `1 -> 3 -> 5 -> 7 -> 9 -> 11`：

```
Level 2:  1 ----------------> 7 ----------------> NULL
Level 1:  1 ------> 5 ------> 7 ------> 11 -----> NULL
Level 0:  1 -> 3 -> 5 -> 7 -> 9 -> 11 ----------> NULL
```

查找 9：
1. 从 Level 2 开始：1 → 7，7 < 9，继续；7 的下一个是 NULL，下降
2. 在 Level 1：7 → 11，11 > 9，下降
3. 在 Level 0：7 → 9，找到！

通过跳跃，我们跳过了很多节点，平均只需 O(log n) 次比较。

### 随机层数

如何决定一个节点应该出现在哪些层？

**随机化**：每个节点以 1/2 的概率"升级"到上一层。

- 节点在 Level 0：概率 1（所有节点都在）
- 节点在 Level 1：概率 1/2
- 节点在 Level 2：概率 1/4
- ...
- 节点在 Level k：概率 (1/2)^k

这种分布使得每一层的节点数约为下一层的一半，形成类似二分查找的结构。

## 跳表的实现

### 节点结构

```python
import random

class SkipListNode:
    def __init__(self, val: int, level: int):
        self.val = val
        # forward[i] 指向第 i 层的下一个节点
        self.forward = [None] * (level + 1)
```

### 完整实现

```python
import random

class SkipListNode:
    def __init__(self, val: int, level: int):
        self.val = val
        self.forward = [None] * (level + 1)


class Skiplist:
    MAX_LEVEL = 16  # 最大层数
    P = 0.5         # 升级概率
    
    def __init__(self):
        # 头节点，值为负无穷（或任意占位符）
        self.head = SkipListNode(-1, self.MAX_LEVEL)
        self.level = 0  # 当前跳表的最大层数
    
    def _random_level(self) -> int:
        """随机生成层数"""
        lvl = 0
        while random.random() < self.P and lvl < self.MAX_LEVEL:
            lvl += 1
        return lvl
    
    def search(self, target: int) -> bool:
        curr = self.head
        
        # 从最高层开始向下搜索
        for i in range(self.level, -1, -1):
            # 在当前层向右移动
            while curr.forward[i] and curr.forward[i].val < target:
                curr = curr.forward[i]
        
        # 移动到 Level 0 的下一个节点
        curr = curr.forward[0]
        
        return curr is not None and curr.val == target
    
    def add(self, num: int) -> None:
        # update[i] 记录第 i 层需要更新的前驱节点
        update = [None] * (self.MAX_LEVEL + 1)
        curr = self.head
        
        # 找到每一层的前驱节点
        for i in range(self.level, -1, -1):
            while curr.forward[i] and curr.forward[i].val < num:
                curr = curr.forward[i]
            update[i] = curr
        
        # 随机生成新节点的层数
        new_level = self._random_level()
        
        # 如果新层数大于当前最大层数，更新 head 作为前驱
        if new_level > self.level:
            for i in range(self.level + 1, new_level + 1):
                update[i] = self.head
            self.level = new_level
        
        # 创建新节点
        new_node = SkipListNode(num, new_level)
        
        # 在每一层插入新节点
        for i in range(new_level + 1):
            new_node.forward[i] = update[i].forward[i]
            update[i].forward[i] = new_node
    
    def erase(self, num: int) -> bool:
        update = [None] * (self.MAX_LEVEL + 1)
        curr = self.head
        
        # 找到每一层的前驱节点
        for i in range(self.level, -1, -1):
            while curr.forward[i] and curr.forward[i].val < num:
                curr = curr.forward[i]
            update[i] = curr
        
        # 移动到目标节点
        curr = curr.forward[0]
        
        # 如果目标不存在，返回 False
        if curr is None or curr.val != num:
            return False
        
        # 从每一层删除该节点
        for i in range(self.level + 1):
            if update[i].forward[i] != curr:
                break
            update[i].forward[i] = curr.forward[i]
        
        # 降低最大层数（如果需要）
        while self.level > 0 and self.head.forward[self.level] is None:
            self.level -= 1
        
        return True
```

## 执行过程演示

### 插入过程

插入序列 `[1, 5, 3, 7]`，假设随机层数分别为 `[1, 0, 2, 1]`：

**插入 1（level=1）**：
```
Level 1: head -> 1 -> NULL
Level 0: head -> 1 -> NULL
```

**插入 5（level=0）**：
```
Level 1: head -> 1 -----------> NULL
Level 0: head -> 1 -> 5 ------> NULL
```

**插入 3（level=2）**：
```
Level 2: head -> 3 -----------> NULL
Level 1: head -> 1 -> 3 ------> NULL
Level 0: head -> 1 -> 3 -> 5 -> NULL
```

**插入 7（level=1）**：
```
Level 2: head -> 3 ----------------> NULL
Level 1: head -> 1 -> 3 ------> 7 -> NULL
Level 0: head -> 1 -> 3 -> 5 -> 7 -> NULL
```

### 搜索过程

搜索 5：
1. Level 2：head → 3，3 < 5，移动到 3；3 的下一个是 NULL，下降
2. Level 1：3 → 7，7 > 5，下降
3. Level 0：3 → 5，找到！

## 复杂度分析

### 时间复杂度

**期望 O(log n)**：
- 每层期望有 n/2^k 个节点（k 是层数）
- 每层期望遍历 O(1) 个节点
- 总层数期望是 O(log n)
- 总时间期望是 O(log n)

**最坏 O(n)**：如果所有节点都只在 Level 0（极端不幸的随机）。

### 空间复杂度

**期望 O(n)**：
- 每个节点平均有 1/(1-P) = 2 个指针（当 P=0.5 时）
- 总空间期望是 2n = O(n)

## 跳表 vs 平衡树

| 维度 | 跳表 | 红黑树 |
|------|------|--------|
| 实现复杂度 | 简单 | 复杂 |
| 代码量 | ~100 行 | ~300 行 |
| 时间复杂度 | 期望 O(log n) | 确定 O(log n) |
| 空间复杂度 | O(n) | O(n) |
| 缓存友好性 | 较好 | 较差 |
| 范围查询 | 天然支持 | 需要中序遍历 |
| 并发友好性 | 更容易实现 | 较难 |

**跳表的优势**：
- 实现简单，不需要复杂的旋转操作
- 范围查询只需在 Level 0 遍历
- 更容易支持并发操作（可以部分加锁）

**红黑树的优势**：
- 确定性的时间复杂度
- 空间开销稍小

## 实际应用

跳表在工业界有广泛应用：
- **Redis**：有序集合（Sorted Set）使用跳表实现
- **LevelDB / RocksDB**：内存中的排序结构
- **Java ConcurrentSkipListMap**：并发有序映射

## 常见错误

### 错误一：忘记更新所有层

```python
# 错误：只更新部分层
for i in range(new_level):  # 应该是 new_level + 1
    new_node.forward[i] = update[i].forward[i]
    update[i].forward[i] = new_node
```

### 错误二：随机层数生成有偏差

```python
# 错误：总是返回 0
def _random_level(self):
    return 0  # 应该是随机的

# 正确：使用几何分布
def _random_level(self):
    lvl = 0
    while random.random() < self.P and lvl < self.MAX_LEVEL:
        lvl += 1
    return lvl
```

### 错误三：删除时没有检查节点是否在该层

```python
# 错误：假设节点在所有层都存在
for i in range(self.level + 1):
    update[i].forward[i] = curr.forward[i]

# 正确：检查节点是否在该层
for i in range(self.level + 1):
    if update[i].forward[i] != curr:
        break
    update[i].forward[i] = curr.forward[i]
```

## 扩展功能

### 支持排名查询

在每个指针上记录"跨越了多少个节点"：

```python
class SkipListNode:
    def __init__(self, val, level):
        self.val = val
        self.forward = [None] * (level + 1)
        self.span = [0] * (level + 1)  # span[i] = 第 i 层指针跨越的节点数
```

这是 Redis 跳表的实现方式，支持 O(log n) 的排名查询。

### 支持重复元素计数

在节点中记录重复次数：

```python
class SkipListNode:
    def __init__(self, val, level):
        self.val = val
        self.count = 1  # 该值出现的次数
        self.forward = [None] * (level + 1)
```

## 本章小结

跳表是一种优雅的概率数据结构，用随机化实现了平衡树的功能。

**核心要点**：

1. **多层索引**：高层稀疏，低层密集，形成类似二分的结构
2. **随机层数**：每个节点以 1/2 概率升级，自动保持平衡
3. **update 数组**：记录每一层的前驱节点，用于插入和删除
4. **期望复杂度**：所有操作期望 O(log n)

**设计启示**：
- 随机化可以简化复杂的确定性算法
- 空间换时间：多层索引提高查询效率
- 简单性有价值：跳表比红黑树更易实现和维护

下一章是平衡树部分的最后一章，我们将用堆解决一个经典问题——K 个最近的点。
