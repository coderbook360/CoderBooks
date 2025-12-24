# 回滚莫队

普通莫队要求 add 和 remove 操作都能在 O(1) 时间内完成。但有些问题中，add 容易而 **remove 困难**（或不可能）。例如：

> 查询区间内的最大值——添加一个元素时更新 max 很简单，但删除当前 max 后如何找到新的 max？

**回滚莫队**（Rollback Mo's Algorithm，也称"不删除莫队"）正是为解决这类问题而设计的。

---

## 核心思想

回滚莫队的核心思想是：**只进行 add 操作，用"回滚"代替 remove**。

### 按块分组处理

将所有查询按左端点所在的块分组。对于同一块内的查询：

1. 固定一个**基准右边界**（块的右边界）
2. 所有查询的右端点只往右扩展（只 add）
3. 左端点每次从基准位置出发往左扩展（只 add）
4. 查询结束后，**回滚**左端点到基准位置，恢复状态

### 关键操作

- **add**：添加元素，更新答案
- **rollback**：恢复到之前保存的状态（不需要真正 remove）

---

## 算法流程

```
对于每个块 B:
    1. 将左端点在块 B 内的查询按右端点排序
    2. 设置基准：cur_l = cur_r = 块 B 的右边界
    3. 对于每个查询 (l, r):
       a. 扩展右边界：while cur_r < r: add(++cur_r)
       b. 保存当前状态
       c. 扩展左边界：while cur_l > l: add(--cur_l)
       d. 记录答案
       e. 回滚左边界：恢复到步骤 b 保存的状态
    4. 处理左右端点都在块内的查询（直接暴力）
```

---

## 完整实现：区间最大值

```python
import math
from typing import List, Tuple

def solve_range_max(n: int, arr: List[int], queries: List[Tuple[int, int]]) -> List[int]:
    """
    使用回滚莫队解决区间最大值查询
    （注意：这个问题有更优解法，这里仅作演示）
    """
    q = len(queries)
    if n == 0 or q == 0:
        return [0] * q
    
    block_size = max(1, int(math.sqrt(n)))
    
    # 将查询按 (左端点块号, 右端点) 分组和排序
    indexed = [(l, r, i) for i, (l, r) in enumerate(queries)]
    indexed.sort(key=lambda x: (x[0] // block_size, x[1]))
    
    results = [0] * q
    
    # 按块分组处理
    block_id = -1
    cur_r = -1
    cur_max = float('-inf')
    
    for l, r, qi in indexed:
        new_block = l // block_size
        
        # 如果查询的左右端点在同一块内，直接暴力
        if l // block_size == r // block_size:
            results[qi] = max(arr[l:r+1])
            continue
        
        # 切换到新块
        if new_block != block_id:
            block_id = new_block
            # 重置右指针到块的右边界
            block_right = (block_id + 1) * block_size - 1
            cur_r = block_right
            cur_max = float('-inf')
        
        # 扩展右边界（只 add）
        while cur_r < r:
            cur_r += 1
            cur_max = max(cur_max, arr[cur_r])
        
        # 保存当前状态
        saved_max = cur_max
        
        # 扩展左边界（临时 add）
        temp_l = (block_id + 1) * block_size  # 块的右边界 + 1
        while temp_l > l:
            temp_l -= 1
            cur_max = max(cur_max, arr[temp_l])
        
        # 记录答案
        results[qi] = cur_max
        
        # 回滚：恢复到保存的状态
        cur_max = saved_max
    
    return results
```

---

## 更复杂的示例：区间最大连续段

> 查询区间 [l, r] 内，相同元素组成的最大连续段长度。

这个问题的 remove 操作非常复杂（需要重新分裂段），但 add 操作只需要检查是否能与相邻元素合并。

```python
from collections import defaultdict
import math
from typing import List, Tuple

def solve_max_consecutive(n: int, arr: List[int], queries: List[Tuple[int, int]]) -> List[int]:
    q = len(queries)
    if n == 0 or q == 0:
        return [0] * q
    
    block_size = max(1, int(math.sqrt(n)))
    
    indexed = [(l, r, i) for i, (l, r) in enumerate(queries)]
    indexed.sort(key=lambda x: (x[0] // block_size, x[1]))
    
    results = [0] * q
    
    def brute_force(l, r):
        """暴力计算 [l, r] 内最大连续段"""
        if l > r:
            return 0
        max_len = 1
        cur_len = 1
        for i in range(l + 1, r + 1):
            if arr[i] == arr[i - 1]:
                cur_len += 1
                max_len = max(max_len, cur_len)
            else:
                cur_len = 1
        return max_len
    
    block_id = -1
    
    for l, r, qi in indexed:
        new_block = l // block_size
        
        # 同一块内，直接暴力
        if l // block_size == r // block_size:
            results[qi] = brute_force(l, r)
            continue
        
        # 切换块
        if new_block != block_id:
            block_id = new_block
            block_right = (block_id + 1) * block_size
            
            # 初始化数据结构
            # 从 block_right 开始，只往右扩展
            cur_r = block_right - 1
            
            # count[v] = v 在当前区间出现的次数
            count = defaultdict(int)
            # left_run[i] = 从位置 i 往左的连续段长度
            # right_run[i] = 从位置 i 往右的连续段长度
            left_run = [0] * n
            right_run = [0] * n
            max_run = 0
        
        # 扩展右边界
        while cur_r < r:
            cur_r += 1
            val = arr[cur_r]
            
            if cur_r > block_right - 1 and arr[cur_r] == arr[cur_r - 1]:
                # 可以与左边合并
                left_run[cur_r] = left_run[cur_r - 1] + 1
            else:
                left_run[cur_r] = 1
            
            right_run[cur_r] = 1
            # 更新左边元素的 right_run
            if cur_r > block_right - 1 and arr[cur_r] == arr[cur_r - 1]:
                # 找到这个连续段的起点
                start = cur_r - left_run[cur_r] + 1
                for j in range(start, cur_r + 1):
                    right_run[j] = cur_r - j + 1
            
            max_run = max(max_run, left_run[cur_r])
        
        # 保存状态
        saved_max_run = max_run
        
        # 暴力扩展左边界并计算
        temp_max = max_run
        temp_l = block_right
        
        # 计算左边部分对答案的贡献
        left_part_max = brute_force(l, block_right - 1)
        
        # 检查跨越块边界的连续段
        if arr[block_right - 1] == arr[block_right]:
            # 需要计算跨界连续段
            left_len = 0
            for i in range(block_right - 1, l - 1, -1):
                if arr[i] == arr[block_right]:
                    left_len += 1
                else:
                    break
            right_len = left_run[block_right] if block_right <= cur_r else 0
            temp_max = max(temp_max, left_len + right_len)
        
        temp_max = max(temp_max, left_part_max)
        
        results[qi] = temp_max
        
        # 回滚（这里我们没有修改持久状态，所以不需要显式回滚）
        max_run = saved_max_run
    
    return results
```

---

## 回滚的实现方式

### 方式一：保存和恢复

对于简单的状态（如最大值、最小值）：

```python
saved_state = current_state
# 执行临时操作
# ...
current_state = saved_state  # 恢复
```

### 方式二：记录操作栈

对于复杂状态，可以记录所有操作，然后逆序撤销：

```python
operations = []

def add_with_record(idx):
    # 记录操作前的状态
    old_value = state[key]
    operations.append((key, old_value))
    # 执行操作
    update_state(idx)

def rollback():
    while operations:
        key, old_value = operations.pop()
        state[key] = old_value
```

### 方式三：使用持久化数据结构

对于非常复杂的状态，可以使用可持久化数据结构，每个版本独立。

---

## 复杂度分析

设 n 为数组长度，q 为查询数，块大小 B = √n。

### 右指针

- 同一块内的查询，右端点单调递增
- 切换块时重置
- 总移动：O(n × n/B) = O(n√n)

### 左指针

- 每次查询从块边界开始
- 最多移动 B = √n
- 总移动：O(q × B) = O(q√n)

### 回滚操作

- 每次回滚代价 = 左指针移动距离 = O(B)
- 总代价：O(q × B) = O(q√n)

### 块内暴力

- 每个块内查询数量 × 块大小 = O(B) × O(B) = O(B²)
- 共 n/B 个块，总代价 O(n × B) = O(n√n)

### 总复杂度

O((n + q) × √n)

---

## 适用场景

回滚莫队适用于以下场景：

1. **add 容易，remove 困难**
   - 区间最大/最小值
   - 区间最大连续段
   - 区间中出现次数最多的数

2. **可以快速回滚**
   - 状态可以用少量变量描述
   - 或者可以用栈记录操作

3. **离线查询**

---

## 与普通莫队的对比

| 特性 | 普通莫队 | 回滚莫队 |
|------|---------|---------|
| add 操作 | 需要 O(1) | 需要 O(1) |
| remove 操作 | 需要 O(1) | 不需要 |
| 额外操作 | 无 | rollback |
| 复杂度 | O((n+q)√n) | O((n+q)√n) |
| 适用范围 | add/remove 都简单 | add 简单，remove 困难 |

---

## 常见错误

### 1. 忘记处理块内查询

```python
if l // block_size == r // block_size:
    results[qi] = brute_force(l, r)
    continue
```

块内查询不能用回滚莫队的框架，必须单独暴力处理。

### 2. 块边界计算错误

```python
block_right = (block_id + 1) * block_size  # 下一块的起点
# 块内最后一个位置是 block_right - 1
```

### 3. 回滚不完整

确保回滚后状态完全恢复，包括：
- 答案变量
- 计数数组
- 任何辅助数据结构

---

## 本章小结

回滚莫队是处理"add 容易 remove 困难"问题的有效工具：

1. **核心思想**：只进行 add 操作，用回滚代替 remove
2. **算法框架**：
   - 按块分组，块内按右端点排序
   - 右指针只扩展不收缩
   - 左指针每次从块边界开始，查询后回滚
3. **复杂度**：O((n + q) × √n)
4. **适用场景**：区间最值、最大连续段等 remove 困难的问题

回滚莫队是莫队家族中的重要成员，它展示了一个重要思想：**当正向操作困难时，换一个角度思考**。

下一章我们将学习莫队的一个经典应用：**区间不同数个数**的完整实现与优化。
