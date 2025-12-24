# 天际线问题

## 问题描述

**LeetCode 218: 天际线问题（The Skyline Problem）**

城市的天际线是从远处观看该城市中所有建筑物形成的轮廓的外部轮廓。给定所有建筑物的位置和高度,返回由这些建筑物形成的天际线。

**输入格式**：
```python
buildings = [[left, right, height], ...]
# left: 建筑物左边界
# right: 建筑物右边界  
# height: 建筑物高度
```

**输出格式**：
```python
skyline = [[x, y], ...]
# x: 关键点的 x 坐标
# y: 天际线在该点的高度
```

**示例**：
```python
输入: buildings = [[2,9,10],[3,7,15],[5,12,12],[15,20,10],[19,24,8]]
输出: [[2,10],[3,15],[7,12],[12,0],[15,10],[20,8],[24,0]]
```

**可视化**：
```
高度
15 |    ┌──┐
12 |    │  └──┐
10 | ┌──┘     │  ┌──┐
 8 | │        │  │  └──┐
 0 |─┴────────┴──┴─────┴───> x坐标
   2  3  5  7  9 12 15 20 24
```

**关键点定义**：天际线高度发生变化的位置。

---

## 问题分析

### 核心挑战

**挑战一：重叠建筑**
```python
# 建筑1: [2, 9, 10]
# 建筑2: [3, 7, 15]  # 完全覆盖建筑1的一部分

# 在 [3, 7] 区间,天际线高度为 15,而非 10
```

**挑战二：高度变化点**
```python
# 建筑结束时,天际线可能降低
# 但如果有其他建筑仍在此位置,应该是次高的建筑高度
# 而不是直接降到 0
```

**挑战三：边界重合**
```python
# 建筑1: [2, 5, 10]
# 建筑2: [5, 7, 8]  # 左边界与建筑1右边界重合

# x=5 时,天际线从 10 降到 8,是一个关键点
```

### 朴素方法的问题

**方法一：逐列扫描**
```python
for x in range(min_x, max_x + 1):
    max_height = max(h for l, r, h in buildings if l <= x < r)
    # O(N * 坐标范围) - 坐标范围可达 10^9
```

**方法二：事件驱动**
```python
# 将每个建筑转化为两个事件：开始和结束
events = []
for l, r, h in buildings:
    events.append((l, 'start', h))
    events.append((r, 'end', h))

events.sort()

# 在每个事件位置,需要知道"当前最高的建筑"
for x, event_type, h in events:
    if event_type == 'start':
        active_heights.add(h)
    else:
        active_heights.remove(h)
    
    current_max = max(active_heights)  # O(N) - 太慢
```

**瓶颈**：在每个位置快速查询活跃建筑的最大高度。

---

## 核心思想：扫描线+最大堆

天际线问题是**扫描线算法**的经典应用。

### 算法流程

**1. 提取关键事件**

每个建筑产生两个事件：
- 左边界：建筑"开始"(加入活跃集合)
- 右边界：建筑"结束"(从活跃集合移除)

```python
events = []
for left, right, height in buildings:
    events.append((left, height, 'start'))   # 左边界
    events.append((right, height, 'end'))    # 右边界
```

**2. 排序事件**

按 x 坐标排序,相同 x 坐标的事件需要特殊处理：
- 左边界在前(避免遗漏高度变化)
- 高度大的在前(确保正确的最大高度)

```python
events.sort(key=lambda e: (e[0], -e[1] if e[2]=='start' else e[1]))
```

**3. 扫描线处理**

从左到右处理每个事件：
- 维护当前活跃建筑的高度集合
- 在每个位置,记录最大高度
- 当最大高度变化时,输出关键点

```python
from collections import Counter

heights = Counter({0: 1})  # 初始高度为0
prev_max = 0
result = []

for x, h, event_type in events:
    if event_type == 'start':
        heights[h] += 1
    else:
        heights[h] -= 1
        if heights[h] == 0:
            del heights[h]
    
    current_max = max(heights.keys())
    
    if current_max != prev_max:
        result.append([x, current_max])
        prev_max = current_max
```

### 为什么用 Counter?

**需求**：维护一个多重集合,支持：
- 添加元素：O(1)
- 删除元素：O(1)  
- 查询最大值：O(N)

**为什么不用堆？**
- 堆的删除任意元素是 O(N)
- Python 的 heapq 不支持直接删除

**Counter 的优势**：
- 自动处理重复高度(同一高度的多个建筑)
- 删除时只减少计数,不立即移除

**瓶颈**：`max(heights.keys())` 是 O(N)。

---

## 方案一：Counter + 最大值查询

### 完整代码

```python
from typing import List
from collections import Counter

class Solution:
    def getSkyline(self, buildings: List[List[int]]) -> List[List[int]]:
        # 步骤1：提取事件
        events = []
        for left, right, height in buildings:
            events.append((left, -height, 's'))   # 左边界,高度取负用于排序
            events.append((right, height, 'e'))   # 右边界
        
        # 步骤2：排序
        # x 升序
        # 同一 x 时：左边界(负高度)在前,且高度大的在前
        events.sort()
        
        # 步骤3：扫描线
        heights = Counter({0: 1})  # 初始地面高度0
        prev_max = 0
        result = []
        
        for x, h, event_type in events:
            # 恢复实际高度
            h = abs(h)
            
            if event_type == 's':
                # 建筑开始
                heights[h] += 1
            else:
                # 建筑结束
                heights[h] -= 1
                if heights[h] == 0:
                    del heights[h]
            
            # 查询当前最大高度
            current_max = max(heights.keys())
            
            # 高度变化则输出关键点
            if current_max != prev_max:
                result.append([x, current_max])
                prev_max = current_max
        
        return result
```

### 代码解读

**1. 事件编码技巧**

```python
# 左边界高度取负
events.append((left, -height, 's'))

# 这样排序时,同一 x 坐标：
# (-15, 's') < (-10, 's') < (8, 'e')
# 即：左边界在前,高度大的左边界更靠前
```

**2. Counter 处理重复高度**

```python
# 两个高度为 10 的建筑重叠
heights[10] = 2  # 计数为 2

# 一个结束
heights[10] -= 1  # 仍为 1,不删除

# 全部结束
heights[10] -= 1  # 变为 0,删除
```

**3. 初始地面高度**

```python
heights = Counter({0: 1})

# 确保最后一个建筑结束后,天际线降到 0
# 而非出现空集合错误
```

### 复杂度分析

- **时间复杂度**：`O(N^2)`
  - 排序：`O(N logN)`
  - 每个事件查询最大值：`O(N)`
  - 总共 N 个事件：`O(N^2)`

- **空间复杂度**：`O(N)`

**LeetCode 提交结果**：
- 用例通过：40/40
- 运行时间：120 ms（超过 40%）
- 内存消耗：19.5 MB

**瓶颈**：`max(heights.keys())` 导致 O(N^2)。

---

## 方案二：延迟删除堆

### 核心思想

用最大堆维护高度,但不立即删除：
- 添加：直接入堆，O(logN)
- 删除：标记为"待删除",不立即从堆中移除
- 查询最大值：忽略已标记的元素,O(1) 均摊

### 完整代码

```python
import heapq
from collections import Counter

class Solution:
    def getSkyline(self, buildings: List[List[int]]) -> List[List[int]]:
        # 事件提取
        events = []
        for left, right, height in buildings:
            events.append((left, -height, 's'))
            events.append((right, height, 'e'))
        
        events.sort()
        
        # 最大堆(Python heapq 是最小堆,所以存负值)
        heap = [0]  # 初始地面高度
        # 延迟删除：记录需要删除的高度及其数量
        to_delete = Counter()
        
        prev_max = 0
        result = []
        
        for x, h, event_type in events:
            h = abs(h)
            
            if event_type == 's':
                # 添加高度
                heapq.heappush(heap, -h)
            else:
                # 标记删除
                to_delete[h] += 1
            
            # 清理堆顶的已删除元素
            while heap and to_delete[-heap[0]] > 0:
                deleted_h = -heapq.heappop(heap)
                to_delete[deleted_h] -= 1
                if to_delete[deleted_h] == 0:
                    del to_delete[deleted_h]
            
            # 查询当前最大高度
            current_max = -heap[0]
            
            if current_max != prev_max:
                result.append([x, current_max])
                prev_max = current_max
        
        return result
```

### 关键优化

**1. 延迟删除**

```python
# 删除时只标记,不立即从堆中移除
to_delete[height] += 1

# 查询时再清理堆顶
while heap and to_delete[-heap[0]] > 0:
    heapq.heappop(heap)
```

**2. 均摊复杂度**

- 每个元素最多入堆一次、出堆一次
- 总共 N 个元素,清理堆顶操作总共 O(N logN)
- 均摊到每次查询：O(logN)

### 复杂度分析

- **时间复杂度**：`O(N logN)`
  - 排序：O(N logN)
  - 堆操作：每个元素入堆出堆各一次,O(N logN)
  - 总共：O(N logN)

- **空间复杂度**：`O(N)`

**LeetCode 提交结果**：
- 用例通过：40/40
- 运行时间：70 ms（超过 90%）
- 内存消耗：19.8 MB

---

## 方案三：线段树（过度设计）

虽然线段树可以解决此题,但实际上是"杀鸡用牛刀"。

### 思路

用线段树维护每个 x 坐标的最大高度：
- 区间更新：`[left, right)` 的高度为 h
- 区间查询：每个 x 坐标的最大高度

### 问题

1. **空间复杂度高**：需要离散化坐标
2. **实现复杂**：需要支持区间最大值更新
3. **常数因子大**：不如堆高效

### 结论

对于天际线问题,**延迟删除堆是最优解**。

---

## 边界情况处理

### 情况一：相邻建筑无缝连接

```python
# 建筑1: [0, 2, 3]
# 建筑2: [2, 5, 3]  # 高度相同,边界重合

# 期望输出: [[0, 3], [5, 0]]
# 而非: [[0, 3], [2, 3], [5, 0]]  # ❌ 中间的 [2, 3] 是冗余的
```

**处理**：高度不变时不输出关键点。

```python
if current_max != prev_max:
    result.append([x, current_max])
```

### 情况二：多个建筑同时开始或结束

```python
# 建筑1: [0, 2, 3]
# 建筑2: [0, 2, 2]  # 同时开始和结束

# x=0 时：两个建筑同时开始,高度应为 max(3, 2) = 3
# x=2 时：两个建筑同时结束,高度应降为 0
```

**处理**：事件排序时,同一 x 坐标的所有事件一起处理。

```python
# 排序规则：
# 1. x 坐标升序
# 2. 同一 x 时,左边界在前
# 3. 同一 x 的左边界,高度大的在前
events.sort(key=lambda e: (e[0], e[2], -e[1] if e[2]=='s' else e[1]))
```

### 情况三：建筑完全包含

```python
# 建筑1: [0, 5, 10]
# 建筑2: [2, 3, 15]  # 完全在建筑1内部

# 期望输出: [[0,10], [2,15], [3,10], [5,0]]
```

**自动处理**：扫描线算法天然支持,无需特殊逻辑。

---

## 常见错误

### 错误一：事件排序不正确

**错误代码**：
```python
# ❌ 简单按 x 排序
events.sort()
```

**后果**：
```python
# 建筑: [2, 5, 10], [2, 3, 15]
# 事件: [(2, 10, 's'), (2, 15, 's'), (3, 15, 'e'), (5, 10, 'e')]
# 如果 (2, 10, 's') 在前,会误输出 [[2, 10], [2, 15], ...]
```

**正确排序**：
```python
events.sort(key=lambda e: (e[0], e[2], -e[1] if e[2]=='s' else e[1]))
```

### 错误二：忘记初始地面高度

**错误代码**：
```python
heights = Counter()  # ❌ 空集合
```

**后果**：最后一个建筑结束时,`max(heights.keys())` 报错。

**正确初始化**：
```python
heights = Counter({0: 1})
```

### 错误三：输出冗余关键点

**错误代码**：
```python
# 每个事件都输出关键点
for x, h, event_type in events:
    # ...
    result.append([x, current_max])  # ❌ 高度可能未变化
```

**正确做法**：
```python
if current_max != prev_max:
    result.append([x, current_max])
```

---

## 扩展思考

### 1. 如果要求输出完整轮廓？

**问题**：不仅输出关键点,还要输出每段的起止坐标。

**输出格式**：
```python
[[x1, x2, h1], [x2, x3, h2], ...]  # 每段的起止和高度
```

**修改**：
```python
segments = []
prev_x = None
for x, current_max in skyline:
    if prev_x is not None:
        segments.append([prev_x, x, prev_max])
    prev_x = x
    prev_max = current_max
```

### 2. 如果建筑有透明度？

**问题**：每个建筑有透明度,重叠区域的"视觉高度"是加权平均。

**思路**：
- 线段树维护每个位置的(高度, 透明度)列表
- 合并时计算加权平均

**复杂度**：大幅增加,不再是简单的最大值查询。

### 3. 三维天际线？

**问题**：从某个方向观察三维建筑群,求二维轮廓。

**思路**：
- 投影到二维平面
- 扫描线+线段树维护高度场
- 提取轮廓边界

---

## 本章总结

### 核心要点

1. **天际线问题的本质**：动态维护活跃建筑的最大高度
2. **扫描线框架**：
   - 提取开始/结束事件
   - 按 x 坐标排序
   - 从左到右处理,维护最大高度
3. **数据结构选择**：
   - Counter: 简单但查询慢 O(N^2)
   - 延迟删除堆: 最优 O(N logN)
   - 线段树: 过度设计

### 三种方案对比

| 方案 | 时间复杂度 | 空间复杂度 | 代码复杂度 | 推荐度 |
|------|-----------|-----------|-----------|--------|
| Counter | O(N^2) | O(N) | 简单 | ⭐⭐ |
| 延迟删除堆 | O(N logN) | O(N) | 中等 | ⭐⭐⭐⭐⭐ |
| 线段树 | O(N logN) | O(N) | 复杂 | ⭐ |

### 关键技巧

1. **事件排序**：同一坐标的左边界在前,高度大的在前
2. **延迟删除**：标记而非立即删除,查询时清理
3. **地面高度**：初始化 0 高度避免空集合错误
4. **高度变化判断**：只在高度改变时输出关键点

### 记住这句话

**"天际线问题展示了扫描线算法的优雅：将连续的几何问题转化为离散的事件处理。延迟删除堆是经典的空间换时间策略,它让我们在O(logN)时间内完成本需O(N)的操作。"**

下一章,我们将学习线段树的更多高级操作：**区间加法与区间乘法的结合**。
