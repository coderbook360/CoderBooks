# 树上莫队

普通莫队处理的是线性序列上的区间查询。但如果问题定义在**树**上呢？比如查询从节点 u 到节点 v 的路径上有多少种不同的颜色？**树上莫队**正是解决这类问题的利器。

---

## 问题引入

> 给定一棵有 n 个节点的树，每个节点有一个颜色 color[i]。有 q 个查询，每次询问从节点 u 到节点 v 的路径上有多少种不同的颜色。

这个问题的挑战在于：树上的路径不是线性的，无法直接用序列上的区间表示。

---

## 核心思想：欧拉序

树上莫队的关键是将**树上路径转化为序列区间**。这需要用到**欧拉序**（Euler Tour）。

### 欧拉序的定义

对树进行 DFS，在**进入**和**离开**每个节点时都记录它，得到一个长度为 2n 的序列。

```
      1
     /|\
    2 3 4
   /|   |
  5 6   7
```

DFS 顺序（进入用 +，离开用 -）：
`+1, +2, +5, -5, +6, -6, -2, +3, -3, +4, +7, -7, -4, -1`

欧拉序（只记录节点编号）：
`[1, 2, 5, 5, 6, 6, 2, 3, 3, 4, 7, 7, 4, 1]`

对于每个节点 v，记录：
- `first[v]`：第一次出现的位置（进入时）
- `last[v]`：第二次出现的位置（离开时）

### 路径转区间

对于查询路径 (u, v)（假设 first[u] ≤ first[v]）：

**情况 1：u 是 v 的祖先**
- 路径上的节点恰好出现在欧拉序的 [first[u], first[v]] 区间中，且**只出现一次**
- 出现两次的节点不在路径上（它们已经"进去又出来"了）

**情况 2：u 不是 v 的祖先**
- 使用区间 [last[u], first[v]]
- 需要额外考虑 LCA(u, v)

### 出现次数的处理

一个节点在欧拉序区间 [L, R] 中：
- 出现 0 次或 2 次：**不在路径上**
- 出现 1 次：**在路径上**

这启发我们用**异或**或**奇偶计数**来判断节点是否在路径上。

---

## 算法框架

```python
from collections import defaultdict
from typing import List, Tuple
import math

def solve_tree_queries(
    n: int,
    edges: List[Tuple[int, int]],
    colors: List[int],
    queries: List[Tuple[int, int]]
) -> List[int]:
    # 建树
    adj = defaultdict(list)
    for u, v in edges:
        adj[u].append(v)
        adj[v].append(u)
    
    # 计算欧拉序和 LCA 所需信息
    euler = []  # 欧拉序列
    first = [0] * n  # first[v] = v 第一次出现位置
    last = [0] * n   # last[v] = v 第二次出现位置
    depth = [0] * n
    parent = [[-1] * 20 for _ in range(n)]  # 倍增 LCA
    
    def dfs(u, p, d):
        first[u] = len(euler)
        euler.append(u)
        depth[u] = d
        parent[u][0] = p
        
        for v in adj[u]:
            if v != p:
                dfs(v, u, d + 1)
        
        last[u] = len(euler)
        euler.append(u)
    
    dfs(0, -1, 0)  # 假设 0 是根
    
    # 预处理倍增 LCA
    for j in range(1, 20):
        for i in range(n):
            if parent[i][j-1] != -1:
                parent[i][j] = parent[parent[i][j-1]][j-1]
    
    def lca(u, v):
        if depth[u] < depth[v]:
            u, v = v, u
        diff = depth[u] - depth[v]
        for j in range(20):
            if (diff >> j) & 1:
                u = parent[u][j]
        if u == v:
            return u
        for j in range(19, -1, -1):
            if parent[u][j] != parent[v][j]:
                u = parent[u][j]
                v = parent[v][j]
        return parent[u][0]
    
    # 将查询转化为欧拉序区间
    q = len(queries)
    euler_queries = []  # (L, R, need_lca, lca_node, original_index)
    
    for i, (u, v) in enumerate(queries):
        if first[u] > first[v]:
            u, v = v, u
        
        l = lca(u, v)
        if l == u:
            # u 是 v 的祖先，使用 [first[u], first[v]]
            euler_queries.append((first[u], first[v], False, -1, i))
        else:
            # 使用 [last[u], first[v]]，需要额外加上 lca
            euler_queries.append((last[u], first[v], True, l, i))
    
    # 莫队处理
    block_size = max(1, int(len(euler) / math.sqrt(q) + 1))
    
    euler_queries.sort(key=lambda x: (x[0] // block_size, x[1] if (x[0] // block_size) % 2 == 0 else -x[1]))
    
    # 每个节点是否"激活"（在当前路径上）
    active = [False] * n
    
    # 每个颜色的出现次数
    color_count = defaultdict(int)
    distinct = 0
    
    def toggle(node):
        """切换节点状态"""
        nonlocal distinct
        c = colors[node]
        
        if active[node]:
            # 移除
            color_count[c] -= 1
            if color_count[c] == 0:
                distinct -= 1
            active[node] = False
        else:
            # 添加
            if color_count[c] == 0:
                distinct += 1
            color_count[c] += 1
            active[node] = True
    
    cur_l, cur_r = 0, -1
    results = [0] * q
    
    for L, R, need_lca, lca_node, qi in euler_queries:
        # 调整区间
        while cur_r < R:
            cur_r += 1
            toggle(euler[cur_r])
        while cur_l > L:
            cur_l -= 1
            toggle(euler[cur_l])
        while cur_r > R:
            toggle(euler[cur_r])
            cur_r -= 1
        while cur_l < L:
            toggle(euler[cur_l])
            cur_l += 1
        
        # 如果需要单独处理 LCA
        if need_lca:
            toggle(lca_node)
        
        results[qi] = distinct
        
        # 还原 LCA 的影响（为下一个查询做准备）
        if need_lca:
            toggle(lca_node)
    
    return results
```

---

## 关键细节解析

### 1. 为什么用 toggle 而不是 add/remove？

在欧拉序中，一个节点可能出现两次。我们用 `active[node]` 记录节点当前是否被"激活"：
- 第一次遇到：激活（加入统计）
- 第二次遇到：取消激活（移除统计）

使用 toggle 可以统一处理这两种情况。

### 2. LCA 的特殊处理

当 u 不是 v 的祖先时，我们使用区间 [last[u], first[v]]。

问题：LCA 在这个区间中**可能不出现**（如果 LCA 在 u 和 v 之间的"另一侧"）。

解决方案：在统计答案前，手动 toggle(lca)，统计后再 toggle(lca) 还原。

### 3. 区间边界的处理

```python
if first[u] > first[v]:
    u, v = v, u
```

确保 u 是"先访问"的节点，简化后续处理。

---

## 复杂度分析

设 n 为节点数，q 为查询数，欧拉序长度为 2n。

- 欧拉序长度：2n
- 块大小：√(2n / q) × q ≈ √(2nq)
- 时间复杂度：O((n + q) × √n)

与普通莫队相同级别。

---

## 实战示例

### 示例输入

```
树结构（5 个节点）：
    0
   / \
  1   2
 / \
3   4

颜色：[1, 2, 1, 3, 2]

查询：
(3, 4)：路径 3-1-4
(0, 3)：路径 0-1-3
(2, 4)：路径 2-0-1-4
```

### 手动模拟

**DFS 欧拉序**（从节点 0 开始）：
```
访问顺序：0, 1, 3, 3, 4, 4, 1, 2, 2, 0
first: [0, 1, 7, 2, 4]
last:  [9, 6, 8, 3, 5]
```

**查询 (3, 4)**：
- first[3]=2, first[4]=4, lca(3,4)=1
- 3 不是 4 的祖先，使用 [last[3], first[4]] = [3, 4]
- 欧拉序[3:5] = [3, 4]，toggle 3 和 4
- 需要额外 toggle LCA=1
- 激活节点：3, 4, 1，颜色：{1, 2, 3}，distinct=3

**查询 (0, 3)**：
- first[0]=0 < first[3]=2, lca(0,3)=0
- 0 是 3 的祖先，使用 [first[0], first[3]] = [0, 2]
- 欧拉序[0:3] = [0, 1, 3]
- 检查出现次数：0(1次), 1(1次), 3(1次)，都是奇数次
- 激活节点：0, 1, 3，颜色：{1, 2, 3}，distinct=3

---

## 常见变体

### 1. 路径上的元素和

将 `distinct` 改为累加和，`toggle` 时加减 `values[node]`。

### 2. 路径上的最大值

需要用其他数据结构（如线段树或可删除堆），因为最大值的"移除"操作不是 O(1)。

### 3. 带修改的树上莫队

类似带修改莫队，增加时间维度，复杂度变为 O((n + q + m) × n^(2/3))。

---

## 树上莫队的适用条件

**适用**：
- 询问路径上的统计信息
- toggle 操作是 O(1) 或 O(log n)
- 可以离线处理

**不适用**：
- 在线查询
- toggle 操作复杂度高
- 问题有更优的树上数据结构解法（如树链剖分）

---

## 与其他方法的对比

| 方法 | 时间复杂度 | 适用场景 |
|------|-----------|---------|
| 暴力 | O(q × n) | n, q 很小 |
| 树链剖分 | O(q × log²n) | 可合并的信息 |
| 点分治 | O(n × log n) | 特定统计问题 |
| 树上莫队 | O((n+q) × √n) | 不可合并的离线统计 |

---

## 本章小结

树上莫队将莫队算法从序列扩展到树：

1. **核心技术**：欧拉序将树上路径转化为序列区间
2. **关键操作**：
   - toggle：切换节点的激活状态
   - 路径上的节点 = 区间中出现奇数次的节点
3. **LCA 处理**：非祖先关系的查询需要单独处理 LCA
4. **复杂度**：O((n + q) × √n)

树上莫队是处理**离线树上路径统计**问题的强力工具。下一章我们将学习**回滚莫队**，处理"只能添加不能删除"的特殊场景。
