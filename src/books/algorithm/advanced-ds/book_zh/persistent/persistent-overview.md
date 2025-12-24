# 可持久化思想概述

**可持久化数据结构**（Persistent Data Structures）是一类能够保留历史版本的数据结构。每次修改操作不会破坏原有数据，而是创建一个新版本，使得我们可以随时访问任意历史版本。

---

## 什么是可持久化？

### 普通数据结构的问题

普通数据结构是**破坏性更新**的：

```python
arr = [1, 2, 3, 4, 5]
arr[2] = 10  # 原来的 [1, 2, 3, 4, 5] 消失了
print(arr)   # [1, 2, 10, 4, 5]
```

一旦修改，原始数据就丢失了。如果我们需要：
- 查询修改前的状态
- 比较不同版本的差异
- 支持"撤销"操作

普通数据结构就无能为力了。

### 可持久化的解决方案

可持久化数据结构保留所有历史版本：

```python
# 概念示意
v0 = PersistentArray([1, 2, 3, 4, 5])
v1 = v0.set(2, 10)  # v0 不变，返回新版本 v1

print(v0.get(2))  # 3 (原始版本)
print(v1.get(2))  # 10 (新版本)
```

---

## 核心技术：路径复制

实现可持久化的关键是**路径复制**（Path Copying）。

### 朴素方法：完全复制

每次修改时，复制整个数据结构：

```
v0: [1, 2, 3, 4, 5]
v1: [1, 2, 10, 4, 5]  # 完全复制
```

- **时间复杂度**：O(n) 每次修改
- **空间复杂度**：O(n) 每个版本

对于大型数据结构，这太浪费了！

### 优化方法：共享结构

关键观察：**大部分数据没有变化**。

如果用树形结构组织数据，修改时只需要复制**从修改点到根的路径**：

```
        根
       / \
      A   B
     / \   \
    1  2   3

修改 1 → 10：只复制 根 和 A

      新根          旧根
       / \          / \
     A'   B   →    A   B
     / \   \      / \   \
   10   2  3     1   2   3

A' 指向 10 和原来的 2
新根 指向 A' 和原来的 B
```

- **时间复杂度**：O(log n) 每次修改
- **空间复杂度**：O(log n) 每次修改
- **不同版本共享大部分节点**

---

## 可持久化的分类

### 部分可持久化（Partial Persistence）

- 可以查询任意历史版本
- 只能修改最新版本

```
v0 → v1 → v2 → v3 (当前)
      ↓    ↓    ↓
     查询 查询 查询+修改
```

### 完全可持久化（Full Persistence）

- 可以查询任意历史版本
- 可以基于任意版本创建新分支

```
        v0
       /  \
      v1   v2
     / \    \
   v3  v4   v5
```

形成版本树，而不是版本链。

### 函数式持久化（Confluent Persistence）

- 完全可持久化 + 合并操作
- 可以将两个版本合并为新版本

---

## 常见的可持久化数据结构

| 数据结构 | 单次操作时间 | 单次操作空间 | 主要应用 |
|---------|------------|-------------|---------|
| 可持久化数组 | O(log n) | O(log n) | 函数式编程 |
| 可持久化线段树（主席树） | O(log n) | O(log n) | 区间第 K 小 |
| 可持久化字典树 | O(L) | O(L) | 区间异或问题 |
| 可持久化并查集 | O(log n) | O(log n) | 图连通性版本查询 |
| 可持久化平衡树 | O(log n) | O(log n) | 区间排名问题 |

---

## 应用场景

### 场景 1：区间查询问题

**问题**：给定数组 a，查询区间 [l, r] 内的第 k 小元素。

**思路**：
- 把数组从左到右插入可持久化线段树
- 版本 i 记录前 i 个元素的信息
- 区间 [l, r] 的信息 = 版本 r 的信息 - 版本 l-1 的信息

### 场景 2：版本控制

类似 Git 的版本控制系统：
- 每次提交创建新版本
- 可以查看任意历史版本
- 可以从任意版本分支

### 场景 3：撤销操作

支持"撤销"和"重做"：
- 维护当前版本指针
- 撤销：回退到上一版本
- 重做：前进到下一版本

### 场景 4：在线查询

需要处理在线查询（不能预先知道所有查询）时，可持久化结构能够支持任意时刻的查询。

---

## 路径复制的实现模式

### 基于节点的路径复制

```python
class Node:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

def update(node, index, value, left, right):
    """在 [left, right] 范围内更新 index 位置的值"""
    if left == right:
        # 叶子节点：创建新节点
        return Node(value)
    
    mid = (left + right) // 2
    
    if index <= mid:
        # 更新左子树，右子树复用
        new_left = update(node.left, index, value, left, mid)
        return Node(node.val, new_left, node.right)
    else:
        # 更新右子树，左子树复用
        new_right = update(node.right, index, value, mid + 1, right)
        return Node(node.val, node.left, new_right)
```

关键点：
1. **不修改原节点**，创建新节点
2. **复用未修改的子树**，直接引用
3. **返回新根**，代表新版本

### 版本管理

```python
class PersistentStructure:
    def __init__(self, n):
        self.roots = []  # roots[i] 是第 i 个版本的根
        self.n = n
        
        # 创建初始版本
        self.roots.append(self.build(0, n - 1))
    
    def modify(self, version, index, value):
        """基于版本 version 修改，返回新版本号"""
        old_root = self.roots[version]
        new_root = self.update(old_root, index, value, 0, self.n - 1)
        self.roots.append(new_root)
        return len(self.roots) - 1
    
    def query(self, version, ...):
        """查询指定版本"""
        return self._query(self.roots[version], ...)
```

---

## 空间优化

### 问题：空间爆炸

如果进行 Q 次修改，每次 O(log n) 个新节点：
- 总节点数：O(n + Q log n)

当 Q 很大时，空间可能超出限制。

### 解决方案 1：垃圾回收

如果确定某些版本不再需要，可以回收空间：

```python
def garbage_collect(self, keep_versions):
    """只保留指定版本"""
    new_roots = []
    visited = set()
    
    for v in keep_versions:
        new_roots.append(self.roots[v])
        self.mark_reachable(self.roots[v], visited)
    
    # 释放未标记的节点（在真实实现中需要内存管理）
```

### 解决方案 2：离线处理

如果查询可以离线处理，按时间顺序处理查询，只需保持 O(log n) 个额外节点。

---

## 与不可变数据的关系

可持久化数据结构与**函数式编程**中的不可变数据结构密切相关：

| 命令式 | 函数式/可持久化 |
|-------|---------------|
| 就地修改 | 创建新版本 |
| 破坏原数据 | 保留原数据 |
| O(1) 修改 | O(log n) 修改 |
| 无历史 | 完整历史 |

Python、JavaScript 等语言的不可变库（如 `immutablejs`）内部就使用类似技术。

---

## 时间和空间权衡

| 方面 | 普通数据结构 | 可持久化数据结构 |
|------|------------|----------------|
| 单次修改时间 | O(1) 或 O(log n) | O(log n) |
| 单次查询时间 | O(1) 或 O(log n) | O(log n) |
| 单次修改空间 | O(1) | O(log n) |
| 历史查询 | 不支持 | O(log n) |
| 总空间 | O(n) | O(n + Q log n) |

可持久化用**额外的空间和时间**换取了**历史版本访问能力**。

---

## 本章小结

本章介绍了可持久化数据结构的基本概念：

1. **核心思想**：保留历史版本，修改创建新版本

2. **关键技术**：路径复制
   - 只复制从修改点到根的路径
   - 复用未修改的部分
   - O(log n) 时间和空间

3. **分类**：
   - 部分可持久化：只能修改最新版本
   - 完全可持久化：可以基于任意版本创建新版本

4. **应用场景**：
   - 区间第 K 小（主席树）
   - 版本控制系统
   - 撤销/重做功能
   - 在线算法

后续章节将逐一实现各种可持久化数据结构，从可持久化数组开始。
