# 双向 BFS

双向 BFS（Bidirectional BFS）是 BFS 的一种优化技巧：从起点和终点同时开始搜索，当两个搜索相遇时，就找到了最短路径。

## 为什么需要双向 BFS？

**标准 BFS 的问题**：搜索空间呈指数增长。

假设每个节点平均有 b 个邻居，搜索深度为 d：
- 单向 BFS：需要搜索 O(b^d) 个节点
- 双向 BFS：两边各搜索 O(b^(d/2)) 个节点，总共 O(2 × b^(d/2))

当 b = 10, d = 10 时：
- 单向：10^10 = 100亿
- 双向：2 × 10^5 = 20万

**指数级的优化！**

## 核心思想

1. 从起点开始 BFS，建立集合 A
2. 从终点开始 BFS，建立集合 B
3. 每次扩展较小的集合
4. 当两个集合有交集时，找到了最短路径

## 基础实现

```python
from collections import deque

def bidirectional_bfs(graph, start, end):
    """
    双向 BFS 找最短路径长度
    graph: 邻接表
    """
    if start == end:
        return 0
    
    # 两个方向的访问集合
    visited_from_start = {start}
    visited_from_end = {end}
    
    # 两个方向的队列
    queue_start = deque([start])
    queue_end = deque([end])
    
    steps = 0
    
    while queue_start and queue_end:
        steps += 1
        
        # 总是扩展较小的集合
        if len(queue_start) <= len(queue_end):
            if expand(queue_start, visited_from_start, visited_from_end, graph):
                return steps
        else:
            if expand(queue_end, visited_from_end, visited_from_start, graph):
                return steps
    
    return -1  # 不可达

def expand(queue, visited, other_visited, graph):
    """
    扩展一层
    返回是否找到交集
    """
    size = len(queue)
    for _ in range(size):
        node = queue.popleft()
        
        for neighbor in graph[node]:
            if neighbor in other_visited:
                return True  # 找到交集
            
            if neighbor not in visited:
                visited.add(neighbor)
                queue.append(neighbor)
    
    return False
```

## 记录路径版本

```python
def bidirectional_bfs_with_path(graph, start, end):
    """返回最短路径"""
    if start == end:
        return [start]
    
    # 记录父节点
    parent_from_start = {start: None}
    parent_from_end = {end: None}
    
    queue_start = deque([start])
    queue_end = deque([end])
    
    while queue_start and queue_end:
        # 扩展起点方向
        meet = expand_with_parent(queue_start, parent_from_start, 
                                   parent_from_end, graph)
        if meet:
            return reconstruct_path(meet, parent_from_start, parent_from_end)
        
        # 扩展终点方向
        meet = expand_with_parent(queue_end, parent_from_end, 
                                   parent_from_start, graph)
        if meet:
            return reconstruct_path(meet, parent_from_start, parent_from_end)
    
    return []

def expand_with_parent(queue, parent, other_parent, graph):
    """扩展一层，返回相遇节点"""
    size = len(queue)
    for _ in range(size):
        node = queue.popleft()
        
        for neighbor in graph[node]:
            if neighbor in other_parent:
                return neighbor
            
            if neighbor not in parent:
                parent[neighbor] = node
                queue.append(neighbor)
    
    return None

def reconstruct_path(meet, parent_from_start, parent_from_end):
    """重建路径"""
    # 从起点到相遇点
    path_from_start = []
    node = meet
    while node is not None:
        path_from_start.append(node)
        node = parent_from_start[node]
    path_from_start.reverse()
    
    # 从相遇点到终点
    path_from_end = []
    node = parent_from_end[meet]
    while node is not None:
        path_from_end.append(node)
        node = parent_from_end[node]
    
    return path_from_start + path_from_end
```

## 优化：集合代替队列

对于隐式图（如字符串变换），使用集合更高效：

```python
def bidirectional_bfs_set(start, end, get_neighbors):
    """
    使用集合实现
    get_neighbors: 函数，返回邻居列表
    """
    if start == end:
        return 0
    
    current_start = {start}
    current_end = {end}
    visited = {start, end}
    
    steps = 0
    
    while current_start and current_end:
        steps += 1
        
        # 扩展较小的集合
        if len(current_start) > len(current_end):
            current_start, current_end = current_end, current_start
        
        next_level = set()
        for node in current_start:
            for neighbor in get_neighbors(node):
                if neighbor in current_end:
                    return steps
                
                if neighbor not in visited:
                    visited.add(neighbor)
                    next_level.add(neighbor)
        
        current_start = next_level
    
    return -1
```

## 应用场景

### 场景1：单词接龙

从 "hit" 变换到 "cog"，每次只能改变一个字母：

```python
def ladderLength(beginWord, endWord, wordList):
    """LeetCode 127"""
    word_set = set(wordList)
    if endWord not in word_set:
        return 0
    
    def get_neighbors(word):
        neighbors = []
        for i in range(len(word)):
            for c in 'abcdefghijklmnopqrstuvwxyz':
                if c != word[i]:
                    new_word = word[:i] + c + word[i+1:]
                    if new_word in word_set:
                        neighbors.append(new_word)
        return neighbors
    
    return bidirectional_bfs_set(beginWord, endWord, get_neighbors) + 1
```

### 场景2：迷宫最短路径

```python
def shortestPath(maze, start, end):
    """迷宫中的最短路径"""
    if start == end:
        return 0
    
    m, n = len(maze), len(maze[0])
    
    def get_neighbors(pos):
        x, y = pos
        neighbors = []
        for dx, dy in [(0,1), (0,-1), (1,0), (-1,0)]:
            nx, ny = x + dx, y + dy
            if 0 <= nx < m and 0 <= ny < n and maze[nx][ny] == 0:
                neighbors.append((nx, ny))
        return neighbors
    
    return bidirectional_bfs_set(tuple(start), tuple(end), get_neighbors)
```

## 注意事项

### 1. 无向图 vs 有向图

- **无向图**：可以直接用双向 BFS
- **有向图**：从终点反向搜索需要反向图

```python
def build_reverse_graph(graph):
    """构建反向图"""
    reverse_graph = defaultdict(list)
    for u in graph:
        for v in graph[u]:
            reverse_graph[v].append(u)
    return reverse_graph
```

### 2. 扩展策略

```python
# 策略1：交替扩展
while queue_start and queue_end:
    expand(queue_start, ...)
    expand(queue_end, ...)

# 策略2：扩展较小的（推荐）
while queue_start and queue_end:
    if len(queue_start) <= len(queue_end):
        expand(queue_start, ...)
    else:
        expand(queue_end, ...)
```

### 3. 相遇判断

```python
# 方式1：扩展时检查
for neighbor in graph[node]:
    if neighbor in other_visited:
        return True

# 方式2：每轮后检查交集
if visited_start & visited_end:
    return steps
```

## 时间复杂度分析

设图的分支因子为 b，最短路径长度为 d：

| 算法 | 时间复杂度 | 空间复杂度 |
|-----|-----------|-----------|
| 单向 BFS | O(b^d) | O(b^d) |
| 双向 BFS | O(b^(d/2)) | O(b^(d/2)) |

**优化倍数**：O(b^(d/2))，当 b 和 d 较大时非常显著。

## 小结

- 双向 BFS 从起点和终点同时搜索，相遇时找到最短路径
- 时间复杂度从 O(b^d) 降到 O(b^(d/2))，指数级优化
- 关键技巧：总是扩展较小的集合
- 适用于有明确起点和终点的最短路径问题
- 隐式图用集合实现更高效
