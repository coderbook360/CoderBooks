# 高级搜索技巧总结

本部分介绍了图搜索的高级优化技巧，包括双向 BFS、A* 算法、IDA* 算法等。这些技术在实际应用中能够显著提升搜索效率。

## 核心技术对比

| 技术 | 优化目标 | 适用场景 | 典型提升 |
|-----|---------|---------|---------|
| 双向 BFS | 时间 | 明确起点和终点 | 5-10倍 |
| A* | 时间 | 有好的启发函数 | 3-10倍 |
| IDA* | 空间 | 内存受限 | 空间 O(d) |

## 技术选择指南

### 什么时候用双向 BFS？

**必备条件**：
- ✅ 有明确的起点和终点
- ✅ 图是无向的（或能构建反向图）
- ✅ 分支因子较大

**典型场景**：
- 单词接龙
- 迷宫最短路径
- 社交网络中的关系查找

**代码特征**：
```python
begin_set = {start}
end_set = {end}

while begin_set and end_set:
    if len(begin_set) > len(end_set):
        begin_set, end_set = end_set, begin_set
    # 扩展较小的集合
```

### 什么时候用 A*？

**必备条件**：
- ✅ 有明确的目标状态
- ✅ 能设计出可采纳的启发函数
- ✅ 追求最优解

**典型场景**：
- 游戏路径查找
- 机器人导航
- 八数码/滑动谜题

**代码特征**：
```python
f = g + h  # 实际代价 + 估计代价
heapq.heappush(open_set, (f, node))
```

### 什么时候用 IDA*？

**必备条件**：
- ✅ 内存严重受限
- ✅ 解的深度较浅（< 30）
- ✅ 有好的启发函数

**典型场景**：
- 八数码问题
- 魔方求解
- 嵌入式系统

**代码特征**：
```python
threshold = h(start)
while True:
    found, result = dfs_with_threshold(start, threshold)
    if found:
        return result
    threshold = result
```

## 启发函数设计

### 常用启发函数

| 场景 | 启发函数 | 可采纳性 |
|-----|---------|---------|
| 四方向网格 | 曼哈顿距离 | ✅ |
| 八方向网格 | 切比雪夫距离 | ✅ |
| 任意方向 | 欧几里得距离 | ✅ |
| 数码问题 | 曼哈顿 + 线性冲突 | ✅ |

### 启发函数质量

**衡量标准**：
- **可采纳性**：h(n) ≤ h*(n)（不高估）
- **一致性**：h(n) ≤ cost(n, n') + h(n')
- **准确性**：越接近真实距离越好

**质量对比**：
```python
# 差：h = 0（退化为 Dijkstra）
def h_zero(node, goal):
    return 0

# 中：曼哈顿距离
def h_manhattan(node, goal):
    return abs(node[0] - goal[0]) + abs(node[1] - goal[1])

# 好：曼哈顿 + 线性冲突
def h_with_conflict(node, goal):
    return manhattan(node, goal) + 2 * linear_conflict(node, goal)
```

## 优化技巧总结

### 通用优化

1. **总是扩展较小的集合**（双向 BFS）
2. **删除已访问的状态**（避免重复）
3. **使用集合代替队列**（隐式图）
4. **提前终止**（找到任一解即可）

### 空间优化

1. **状态压缩**：用整数或字符串表示状态
2. **位图**：用位替代 set/dict
3. **滚动数组**：只保留必要的层
4. **IDA***：用 DFS 代替 BFS

### 时间优化

1. **预处理**：建立索引、邻居关系
2. **剪枝**：尽早排除无效状态
3. **启发函数**：引导搜索方向
4. **双向搜索**：从两端逼近

## 性能分析方法

### 评估指标

```python
def benchmark(algorithm, test_cases):
    """性能评估"""
    results = []
    
    for case in test_cases:
        start_time = time.time()
        visited_count = 0
        
        result = algorithm(case)
        
        results.append({
            'case': case,
            'result': result,
            'time': time.time() - start_time,
            'visited': visited_count,
            'memory': get_memory_usage()
        })
    
    return results
```

### 对比报告

```python
def compare_algorithms(algorithms, test_cases):
    """算法对比"""
    print(f"{'算法':<20} {'平均时间':<15} {'平均访问节点':<15}")
    print("-" * 50)
    
    for name, algo in algorithms.items():
        results = benchmark(algo, test_cases)
        avg_time = sum(r['time'] for r in results) / len(results)
        avg_visited = sum(r['visited'] for r in results) / len(results)
        
        print(f"{name:<20} {avg_time:<15.3f} {avg_visited:<15.0f}")
```

## 实战建议

### 初学者路线

1. **掌握 BFS**：理解层次遍历
2. **学习双向 BFS**：感受指数级优化
3. **尝试 A***：理解启发式搜索
4. **挑战 IDA***：体会空间优化

### 进阶方向

1. **启发函数设计**：针对特定问题设计更好的启发函数
2. **状态压缩**：用更紧凑的方式表示状态
3. **并行搜索**：探索多线程/多进程优化
4. **机器学习辅助**：用 NN 学习启发函数

## 经典问题清单

### 必做题目

| 难度 | 题目 | 技术 |
|-----|------|------|
| 中等 | LC 127. Word Ladder | 双向 BFS |
| 中等 | LC 773. Sliding Puzzle | A* |
| 困难 | LC 1263. Minimum Moves to Move a Box | A* |
| 中等 | LC 1306. Jump Game III | BFS |
| 困难 | LC 1345. Jump Game IV | 双向 BFS + 剪枝 |

### 进阶题目

- **八数码**：经典 AI 问题
- **十五数码**：4x4 滑动谜题
- **魔方求解**：3D 状态空间
- **迷宫生成**：反向应用

## 代码模板

### 双向 BFS 模板

```python
def bidirectional_bfs(start, end, get_neighbors):
    begin = {start}
    end_set = {end}
    visited = {start, end}
    steps = 0
    
    while begin and end_set:
        if len(begin) > len(end_set):
            begin, end_set = end_set, begin
        
        next_level = set()
        for node in begin:
            for neighbor in get_neighbors(node):
                if neighbor in end_set:
                    return steps + 1
                if neighbor not in visited:
                    visited.add(neighbor)
                    next_level.add(neighbor)
        
        begin = next_level
        steps += 1
    
    return -1
```

### A* 模板

```python
import heapq

def a_star(start, goal, get_neighbors, heuristic):
    g_score = {start: 0}
    f_score = {start: heuristic(start, goal)}
    open_set = [(f_score[start], start)]
    closed_set = set()
    
    while open_set:
        _, current = heapq.heappop(open_set)
        
        if current == goal:
            return g_score[current]
        
        if current in closed_set:
            continue
        closed_set.add(current)
        
        for neighbor, cost in get_neighbors(current):
            if neighbor in closed_set:
                continue
            
            tentative_g = g_score[current] + cost
            if neighbor not in g_score or tentative_g < g_score[neighbor]:
                g_score[neighbor] = tentative_g
                f_score[neighbor] = tentative_g + heuristic(neighbor, goal)
                heapq.heappush(open_set, (f_score[neighbor], neighbor))
    
    return -1
```

## 小结

- 双向 BFS：空间换时间，指数级优化
- A*：启发式搜索，平衡速度与准确性
- IDA*：时间换空间，内存受限场景
- 选择算法：根据问题特征和资源约束
- 优化关键：状态表示、启发函数、剪枝策略
- 实战经验：从简单到复杂，逐步掌握

**核心理念**：没有银弹，根据具体问题选择合适的技术。
