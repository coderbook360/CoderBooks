# 实战：滑动谜题（A* 应用）

**LeetCode 773. Sliding Puzzle**

## 问题描述

在一个 2 x 3 的板上有 5 块方块和一个空位，用数字 1 到 5 表示方块，用 0 表示空位。

一次移动定义为：选择 0 与相邻的方块（上下左右）交换位置。

返回解决谜题所需的最少移动次数，如果无法完成谜题返回 -1。

示例：
```
输入: board = [[1,2,3],[4,0,5]]
输出: 1
解释: 交换 0 和 5，一步完成
```

```
输入: board = [[1,2,3],[5,4,0]]
输出: -1
解释: 无解
```

## 解法对比

### 解法1：标准 BFS

```python
from collections import deque

def slidingPuzzle_bfs(board):
    """标准 BFS"""
    # 目标状态
    target = "123450"
    
    # 将 board 转为字符串
    start = "".join(str(num) for row in board for num in row)
    
    if start == target:
        return 0
    
    # 2x3 网格的邻居关系
    neighbors = {
        0: [1, 3],
        1: [0, 2, 4],
        2: [1, 5],
        3: [0, 4],
        4: [1, 3, 5],
        5: [2, 4]
    }
    
    queue = deque([start])
    visited = {start}
    steps = 0
    
    while queue:
        size = len(queue)
        for _ in range(size):
            state = queue.popleft()
            
            # 找到 0 的位置
            zero_idx = state.index('0')
            
            # 尝试所有移动
            for next_idx in neighbors[zero_idx]:
                # 交换
                state_list = list(state)
                state_list[zero_idx], state_list[next_idx] = state_list[next_idx], state_list[zero_idx]
                new_state = "".join(state_list)
                
                if new_state == target:
                    return steps + 1
                
                if new_state not in visited:
                    visited.add(new_state)
                    queue.append(new_state)
        
        steps += 1
    
    return -1
```

**时间复杂度**：O(6!) = O(720)，最坏情况遍历所有状态  
**空间复杂度**：O(6!) = O(720)

### 解法2：A* 算法（优化）

```python
import heapq

def slidingPuzzle(board):
    """A* 算法"""
    target = "123450"
    start = "".join(str(num) for row in board for num in row)
    
    if start == target:
        return 0
    
    # 邻居关系
    neighbors = {
        0: [1, 3], 1: [0, 2, 4], 2: [1, 5],
        3: [0, 4], 4: [1, 3, 5], 5: [2, 4]
    }
    
    # 目标位置
    target_pos = {c: i for i, c in enumerate(target)}
    
    def heuristic(state):
        """曼哈顿距离"""
        distance = 0
        for i, c in enumerate(state):
            if c != '0':
                goal_idx = target_pos[c]
                curr_x, curr_y = i // 3, i % 3
                goal_x, goal_y = goal_idx // 3, goal_idx % 3
                distance += abs(curr_x - goal_x) + abs(curr_y - goal_y)
        return distance
    
    # g_score: 从起点到当前状态的实际代价
    g_score = {start: 0}
    
    # f_score: g + h
    f_score = {start: heuristic(start)}
    
    # 优先队列
    open_set = [(f_score[start], start)]
    closed_set = set()
    
    while open_set:
        current_f, current = heapq.heappop(open_set)
        
        if current == target:
            return g_score[current]
        
        if current in closed_set:
            continue
        
        closed_set.add(current)
        zero_idx = current.index('0')
        
        for next_idx in neighbors[zero_idx]:
            # 生成新状态
            state_list = list(current)
            state_list[zero_idx], state_list[next_idx] = state_list[next_idx], state_list[zero_idx]
            neighbor = "".join(state_list)
            
            if neighbor in closed_set:
                continue
            
            tentative_g = g_score[current] + 1
            
            if neighbor not in g_score or tentative_g < g_score[neighbor]:
                g_score[neighbor] = tentative_g
                f_score[neighbor] = tentative_g + heuristic(neighbor)
                heapq.heappush(open_set, (f_score[neighbor], neighbor))
    
    return -1
```

**时间复杂度**：实际运行更快（A* 引导搜索方向）  
**空间复杂度**：O(6!) = O(720)

### 解法3：IDA*（内存优化）

```python
def slidingPuzzle_ida(board):
    """IDA* 算法"""
    target = "123450"
    start = "".join(str(num) for row in board for num in row)
    
    if start == target:
        return 0
    
    neighbors = {
        0: [1, 3], 1: [0, 2, 4], 2: [1, 5],
        3: [0, 4], 4: [1, 3, 5], 5: [2, 4]
    }
    
    target_pos = {c: i for i, c in enumerate(target)}
    
    def heuristic(state):
        distance = 0
        for i, c in enumerate(state):
            if c != '0':
                goal_idx = target_pos[c]
                curr_x, curr_y = i // 3, i % 3
                goal_x, goal_y = goal_idx // 3, goal_idx % 3
                distance += abs(curr_x - goal_x) + abs(curr_y - goal_y)
        return distance
    
    def search(state, g, threshold, prev_zero_idx):
        """DFS 搜索"""
        f = g + heuristic(state)
        
        if f > threshold:
            return False, f
        
        if state == target:
            return True, g
        
        zero_idx = state.index('0')
        min_threshold = float('inf')
        
        for next_idx in neighbors[zero_idx]:
            # 避免回退
            if next_idx == prev_zero_idx:
                continue
            
            # 生成新状态
            state_list = list(state)
            state_list[zero_idx], state_list[next_idx] = state_list[next_idx], state_list[zero_idx]
            new_state = "".join(state_list)
            
            found, result = search(new_state, g + 1, threshold, zero_idx)
            
            if found:
                return True, result
            
            min_threshold = min(min_threshold, result)
        
        return False, min_threshold
    
    threshold = heuristic(start)
    
    while threshold < 50:  # 最大步数限制
        found, result = search(start, 0, threshold, -1)
        
        if found:
            return result
        
        if result == float('inf'):
            return -1
        
        threshold = result
    
    return -1
```

**时间复杂度**：实际快但常数大（重复搜索）  
**空间复杂度**：O(depth) ≈ O(20)，非常省内存

## 性能对比

测试用例：`board = [[4,1,2],[5,0,3]]`（需 5 步）

| 算法 | 访问状态数 | 运行时间 |
|-----|----------|---------|
| BFS | 约 200 | 基准 |
| A* | 约 50 | 4倍快 |
| IDA* | 约 100（重复） | 稍慢但省内存 |

## 启发函数改进

### 线性冲突

两个方块在目标行/列，但相对位置错误：

```python
def heuristic_with_conflict(state):
    """曼哈顿距离 + 线性冲突"""
    md = manhattan_distance(state)
    lc = linear_conflict(state)
    return md + 2 * lc

def linear_conflict(state):
    """计算线性冲突"""
    conflict = 0
    
    # 检查每一行
    for row in range(2):
        row_tiles = []
        for col in range(3):
            idx = row * 3 + col
            c = state[idx]
            if c != '0':
                goal_idx = target_pos[c]
                goal_row = goal_idx // 3
                if goal_row == row:
                    row_tiles.append((int(c), col, goal_idx % 3))
        
        # 统计冲突
        for i in range(len(row_tiles)):
            for j in range(i + 1, len(row_tiles)):
                if row_tiles[i][1] > row_tiles[j][1] and row_tiles[i][2] < row_tiles[j][2]:
                    conflict += 1
    
    # 同理检查列...
    return conflict
```

## 扩展：N-Puzzle

通用 N x N 滑动谜题：

```python
def n_puzzle(board):
    """N x N 滑动谜题"""
    n = len(board)
    target = list(range(1, n * n)) + [0]
    target_str = "".join(map(str, target))
    
    start = "".join(str(num) for row in board for num in row)
    
    def get_neighbors(idx, n):
        """N x N 网格的邻居"""
        x, y = idx // n, idx % n
        neighbors = []
        for dx, dy in [(0,1), (0,-1), (1,0), (-1,0)]:
            nx, ny = x + dx, y + dy
            if 0 <= nx < n and 0 <= ny < n:
                neighbors.append(nx * n + ny)
        return neighbors
    
    def heuristic(state):
        distance = 0
        for i, c in enumerate(state):
            if c != '0':
                val = int(c)
                goal_idx = val - 1 if val != 0 else n * n - 1
                curr_x, curr_y = i // n, i % n
                goal_x, goal_y = goal_idx // n, goal_idx % n
                distance += abs(curr_x - goal_x) + abs(curr_y - goal_y)
        return distance
    
    # 使用 A* 求解...
```

## 可解性判断

并非所有初始状态都有解，可以通过**逆序数**判断：

```python
def is_solvable(board):
    """判断 2x3 谜题是否可解"""
    arr = [num for row in board for num in row if num != 0]
    
    # 计算逆序数
    inversions = 0
    for i in range(len(arr)):
        for j in range(i + 1, len(arr)):
            if arr[i] > arr[j]:
                inversions += 1
    
    # 2x3 谜题：逆序数为偶数可解
    return inversions % 2 == 0
```

## 小结

- 滑动谜题是 A* 算法的经典应用
- 启发函数：曼哈顿距离（可采纳）
- A* 比 BFS 快 3-5 倍
- IDA* 省内存，适合更大的谜题（3x3, 4x4）
- 优化：线性冲突、可解性预判断
- 时间复杂度：O((mn)!），实际远小于此
