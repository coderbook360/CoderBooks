# 带修改莫队

普通莫队只能处理静态查询，即数组在查询过程中不会改变。但现实问题中，我们经常需要在查询之间穿插修改操作。**带修改莫队**（Mo's Algorithm with Updates）正是为此而生。

---

## 问题引入

考虑以下问题：

> 给定一个长度为 n 的数组，支持两种操作：
> 1. 修改：将 `arr[pos]` 改为 `val`
> 2. 查询：询问区间 `[l, r]` 内有多少个不同的数

如果没有修改操作，这就是普通莫队的经典问题。但现在查询之间可能有修改，情况变得复杂了。

---

## 核心思想

带修改莫队的核心思想是：**将时间维度也纳入考虑**。

在普通莫队中，我们有两个指针 (l, r) 在数组上移动。在带修改莫队中，我们引入第三个指针 t，表示**当前时刻**（已经执行了多少次修改）。

每个查询现在有三个属性：(l, r, t)
- l, r：查询的区间
- t：这次查询发生在第几次修改之后

### 三维排序

类似于普通莫队按 (l 的块, r) 排序，带修改莫队按 **(l 的块, r 的块, t)** 排序：

```python
def mo_key(query):
    l, r, t, idx = query
    l_block = l // block_size
    r_block = r // block_size
    return (l_block, r_block, t)
```

### 时间指针的移动

在处理查询时，除了移动 l 和 r，还需要移动 t：
- 如果当前时刻 cur_t < t，需要**应用修改**（从 cur_t+1 到 t 的所有修改）
- 如果当前时刻 cur_t > t，需要**撤销修改**（从 cur_t 到 t+1 的所有修改）

---

## 块大小的选择

带修改莫队的复杂度分析比普通莫队复杂。设块大小为 B：

- l 指针移动：O(q × B)
- r 指针移动：O(n × n/B) per block pair，共 (n/B)² 对块，总 O(n² / B)
- t 指针移动：O(m × n² / B²)，其中 m 是修改次数

为了平衡三者，取 **B = n^(2/3)** 时，总复杂度为 **O(n^(5/3))**。

```python
block_size = max(1, int(n ** (2/3)))
```

---

## 完整实现

```python
import math
from typing import List, Tuple, Union

def solve_with_modifications(
    n: int,
    initial_arr: List[int],
    operations: List[Tuple[str, int, int]]  # ('Q', l, r) 或 ('M', pos, val)
) -> List[int]:
    """
    处理带修改的区间不同数查询
    operations: 操作列表
        - ('Q', l, r): 查询 arr[l..r] 的不同数个数
        - ('M', pos, val): 将 arr[pos] 改为 val
    """
    arr = initial_arr[:]
    
    # 分离查询和修改
    queries = []  # (l, r, time, original_index)
    modifications = []  # (pos, new_val, old_val)
    
    query_count = 0
    for op in operations:
        if op[0] == 'Q':
            l, r = op[1], op[2]
            t = len(modifications)  # 这个查询在第 t 次修改之后
            queries.append((l, r, t, query_count))
            query_count += 1
        else:  # 'M'
            pos, new_val = op[1], op[2]
            old_val = arr[pos]
            modifications.append((pos, new_val, old_val))
            arr[pos] = new_val  # 更新数组以便记录后续修改的 old_val
    
    if not queries:
        return []
    
    # 恢复原数组
    arr = initial_arr[:]
    
    q = len(queries)
    m = len(modifications)
    
    # 块大小取 n^(2/3)
    block_size = max(1, int(n ** (2/3)))
    
    # 按 (l_block, r_block, t) 排序
    def mo_key(query):
        l, r, t, _ = query
        return (l // block_size, r // block_size, t)
    
    sorted_queries = sorted(queries, key=mo_key)
    
    # 离散化
    all_vals = set(arr)
    for _, new_val, old_val in modifications:
        all_vals.add(new_val)
        all_vals.add(old_val)
    sorted_vals = sorted(all_vals)
    val_to_id = {v: i for i, v in enumerate(sorted_vals)}
    
    mapped_arr = [val_to_id[v] for v in arr]
    mapped_mods = [(pos, val_to_id[nv], val_to_id[ov]) for pos, nv, ov in modifications]
    
    MAX_ID = len(sorted_vals)
    count = [0] * MAX_ID
    distinct = 0
    
    cur_l, cur_r = 0, -1
    cur_t = 0  # 当前已应用的修改数
    results = [0] * q
    
    def add(idx):
        nonlocal distinct
        val = mapped_arr[idx]
        if count[val] == 0:
            distinct += 1
        count[val] += 1
    
    def remove(idx):
        nonlocal distinct
        val = mapped_arr[idx]
        count[val] -= 1
        if count[val] == 0:
            distinct -= 1
    
    def apply_modification(mod_idx):
        """应用第 mod_idx 次修改"""
        pos, new_val, old_val = mapped_mods[mod_idx]
        
        # 如果 pos 在当前区间内，需要更新计数
        if cur_l <= pos <= cur_r:
            # 移除旧值
            count[old_val] -= 1
            if count[old_val] == 0:
                nonlocal distinct
                distinct -= 1
            # 添加新值
            if count[new_val] == 0:
                distinct += 1
            count[new_val] += 1
        
        # 更新数组
        mapped_arr[pos] = new_val
    
    def undo_modification(mod_idx):
        """撤销第 mod_idx 次修改"""
        pos, new_val, old_val = mapped_mods[mod_idx]
        
        # 如果 pos 在当前区间内，需要更新计数
        if cur_l <= pos <= cur_r:
            # 移除新值
            count[new_val] -= 1
            if count[new_val] == 0:
                nonlocal distinct
                distinct -= 1
            # 恢复旧值
            if count[old_val] == 0:
                distinct += 1
            count[old_val] += 1
        
        # 恢复数组
        mapped_arr[pos] = old_val
    
    for l, r, t, qi in sorted_queries:
        # 先调整时间（重要：要在调整区间之前）
        while cur_t < t:
            apply_modification(cur_t)
            cur_t += 1
        while cur_t > t:
            cur_t -= 1
            undo_modification(cur_t)
        
        # 再调整区间
        while cur_r < r:
            cur_r += 1
            add(cur_r)
        while cur_r > r:
            remove(cur_r)
            cur_r -= 1
        while cur_l > l:
            cur_l -= 1
            add(cur_l)
        while cur_l < l:
            remove(cur_l)
            cur_l += 1
        
        results[qi] = distinct
    
    return results
```

---

## 执行过程示例

让我们通过一个例子理解带修改莫队的执行过程：

```
初始数组：[1, 2, 3, 1, 2]
操作序列：
  Q 0 2  (查询 [0,2])
  M 1 3  (将 arr[1] 改为 3)
  Q 0 2  (查询 [0,2])
  M 2 1  (将 arr[2] 改为 1)
  Q 0 4  (查询 [0,4])
```

**分离操作**：
- 查询：[(0,2,0,0), (0,2,1,1), (0,4,2,2)]
- 修改：[(1,3,2), (2,1,3)]

**排序后的查询**（假设块大小为 2）：
- (0,2,0,0) → l_block=0, r_block=1, t=0
- (0,2,1,1) → l_block=0, r_block=1, t=1
- (0,4,2,2) → l_block=0, r_block=2, t=2

排序后顺序可能为：0, 1, 2（恰好按原顺序）

**执行**：

1. 处理查询 0：(l=0, r=2, t=0)
   - 当前 cur_t=0，t=0，无需调整时间
   - 扩展区间到 [0,2]
   - 答案：distinct([1,2,3]) = 3

2. 处理查询 1：(l=0, r=2, t=1)
   - 当前 cur_t=0，t=1，需要应用 1 次修改
   - apply_modification(0)：arr[1] = 3
   - 由于 1 在 [0,2] 内，更新计数：移除 2，添加 3
   - 答案：distinct([1,3,3]) = 2

3. 处理查询 2：(l=0, r=4, t=2)
   - 当前 cur_t=1，t=2，需要应用 1 次修改
   - apply_modification(1)：arr[2] = 1
   - 扩展区间到 [0,4]
   - 答案：distinct([1,3,1,1,2]) = 3

---

## 时间指针与区间指针的顺序

**关键问题**：应该先调整时间还是先调整区间？

**推荐：先调整时间**。

原因：
1. 时间调整会修改数组，而区间调整依赖于数组的当前状态
2. 先调整时间可以确保在扩展/收缩区间时，数组状态是正确的

### 不同顺序的影响

考虑以下场景：
- 当前区间 [2, 4]，修改位置 3
- 需要扩展到 [0, 5] 并应用修改

如果先扩展再修改：
- 扩展时，位置 3 的值是旧值，被错误地统计

如果先修改再扩展：
- 修改时，位置 3 在区间内，计数被正确更新
- 扩展时，位置 3 已经是新值，不会重复统计

---

## 复杂度分析

设 n 为数组长度，q 为查询数，m 为修改数，块大小 B = n^(2/3)。

### l 指针

- 同一块内移动：O(B) per query
- 总移动：O(q × B) = O(q × n^(2/3))

### r 指针

- 对于固定的 (l_block, r_block)，r 指针单调移动
- 共 (n/B)² 对块
- 总移动：O(n × (n/B)²) = O(n^(5/3))

### t 指针

- 对于固定的 (l_block, r_block)，t 指针最多移动 m
- 总移动：O(m × (n/B)²) = O(m × n^(2/3))

### 总复杂度

O((n + q) × n^(2/3) + m × n^(2/3)) = O((n + q + m) × n^(2/3))

在 n = q = m = 10^5 时，约为 10^5 × 10^(10/3) ≈ 2 × 10^8，可接受。

---

## 实战技巧

### 1. 修改记录格式

```python
# 记录 (位置, 新值, 旧值)
modifications.append((pos, new_val, old_val))
```

这样可以方便地执行和撤销修改。

### 2. 离散化包含所有值

```python
all_vals = set(initial_arr)
for _, new_val, old_val in modifications:
    all_vals.add(new_val)
    all_vals.add(old_val)
```

### 3. 先时间后区间

```python
# 推荐顺序
while cur_t < t: apply_modification(cur_t); cur_t += 1
while cur_t > t: cur_t -= 1; undo_modification(cur_t)
# 然后调整区间
```

### 4. nonlocal 的使用

在 Python 中，修改外层变量需要 `nonlocal`：

```python
def apply_modification(mod_idx):
    nonlocal distinct  # 需要修改 distinct
    # ...
```

---

## 与普通莫队的对比

| 特性 | 普通莫队 | 带修改莫队 |
|------|---------|-----------|
| 时间复杂度 | O((n+q)√n) | O((n+q+m)n^(2/3)) |
| 块大小 | √n | n^(2/3) |
| 排序维度 | 2D: (l_block, r) | 3D: (l_block, r_block, t) |
| 指针数量 | 2 (l, r) | 3 (l, r, t) |
| 适用场景 | 无修改 | 有单点修改 |

---

## 常见错误

### 1. 忘记记录旧值

```python
# 错误
modifications.append((pos, new_val))

# 正确
modifications.append((pos, new_val, arr[pos]))  # 记录旧值
```

### 2. 修改数组后忘记更新

```python
# 记录修改时需要先更新数组
old_val = arr[pos]
modifications.append((pos, new_val, old_val))
arr[pos] = new_val  # 更新，以便后续修改能获取正确的 old_val
```

### 3. apply 和 undo 的逻辑错误

```python
# apply: cur_t < t 时调用，然后 cur_t++
# undo: cur_t > t 时，先 cur_t--，然后调用

while cur_t < t:
    apply_modification(cur_t)
    cur_t += 1

while cur_t > t:
    cur_t -= 1
    undo_modification(cur_t)
```

---

## 本章小结

带修改莫队将普通莫队扩展到了支持单点修改的场景：

1. **核心思想**：引入时间维度，用三个指针 (l, r, t) 表示当前状态
2. **排序规则**：按 (l 的块, r 的块, t) 排序
3. **块大小**：取 n^(2/3) 以平衡三个指针的移动
4. **复杂度**：O((n + q + m) × n^(2/3))
5. **关键技巧**：先调整时间，再调整区间

带修改莫队是莫队家族中实用性很强的变体。下一章我们将学习另一种扩展：**树上莫队**，将莫队从序列推广到树结构。
