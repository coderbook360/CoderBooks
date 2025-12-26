# IDA* 算法

IDA* (Iterative Deepening A*) 是 A* 算法的深度优先版本，结合了迭代加深搜索（IDS）和 A* 的启发式思想。它在空间复杂度上优于 A*，适合内存受限的场景。

## 为什么需要 IDA*？

**A* 的问题**：
- 需要维护 open_set 和 closed_set
- 空间复杂度 O(b^d)，内存消耗大
- 对于大规模搜索空间，可能内存不足

**IDA* 的优势**：
- 使用 DFS，空间复杂度 O(d)
- 不需要维护 open_set
- 适合状态空间大但解的深度浅的问题

## 核心思想

1. 设定一个阈值 threshold，初始为 h(start)
2. 进行深度优先搜索，剪枝条件：f(n) = g(n) + h(n) > threshold
3. 如果搜索失败，将 threshold 更新为搜索中遇到的最小 f(n)（超过旧阈值的）
4. 重复以上步骤，直到找到解

**与迭代加深的区别**：
- IDS：threshold 按深度递增（1, 2, 3, ...）
- IDA*：threshold 按 f(n) 值递增，更智能

## 算法实现

```python
def ida_star(start, goal, get_neighbors, heuristic):
    """
    IDA* 算法
    start: 起点
    goal: 终点
    get_neighbors: 函数 (node) -> [(neighbor, cost), ...]
    heuristic: 启发函数 (node) -> estimated_cost
    返回: (路径, 总代价) 或 ([], -1)
    """
    def search(path, g, threshold):
        """
        DFS 搜索
        path: 当前路径
        g: 从起点到当前节点的实际代价
        threshold: 当前阈值
        返回: (found, new_threshold or path)
        """
        node = path[-1]
        f = g + heuristic(node, goal)
        
        if f > threshold:
            return False, f  # 超过阈值，返回 f 值
        
        if node == goal:
            return True, path  # 找到目标
        
        min_threshold = float('inf')
        
        for neighbor, cost in get_neighbors(node):
            if neighbor not in path:  # 避免环
                path.append(neighbor)
                found, result = search(path, g + cost, threshold)
                
                if found:
                    return True, result
                
                # 更新下一轮的最小阈值
                if result < min_threshold:
                    min_threshold = result
                
                path.pop()
        
        return False, min_threshold
    
    # 初始阈值
    threshold = heuristic(start, goal)
    path = [start]
    
    while True:
        found, result = search(path, 0, threshold)
        
        if found:
            # result 是路径，计算代价
            total_cost = 0
            for i in range(len(result) - 1):
                for neighbor, cost in get_neighbors(result[i]):
                    if neighbor == result[i + 1]:
                        total_cost += cost
                        break
            return result, total_cost
        
        if result == float('inf'):
            return [], -1  # 无解
        
        threshold = result  # 更新阈值
```

## 简化版本（固定代价）

如果所有边代价相同（如网格移动），可以简化：

```python
def ida_star_simple(start, goal, get_neighbors, heuristic):
    """所有边代价为 1 的 IDA*"""
    def search(node, g, threshold, path):
        f = g + heuristic(node, goal)
        
        if f > threshold:
            return False, f
        
        if node == goal:
            return True, path
        
        min_f = float('inf')
        
        for neighbor in get_neighbors(node):
            if neighbor not in path:
                path.add(neighbor)
                found, result = search(neighbor, g + 1, threshold, path)
                
                if found:
                    return True, result
                
                min_f = min(min_f, result)
                path.remove(neighbor)
        
        return False, min_f
    
    threshold = heuristic(start, goal)
    
    while True:
        path = {start}
        found, result = search(start, 0, threshold, path)
        
        if found:
            return result, len(result) - 1
        
        if result == float('inf'):
            return [], -1
        
        threshold = result
```

## 经典应用：八数码问题

```python
def solve_8_puzzle(initial, goal):
    """
    八数码问题
    状态表示：tuple 或 字符串
    """
    def get_neighbors(state):
        """返回所有可能的下一状态"""
        state_list = list(state)
        zero_idx = state_list.index(0)
        neighbors = []
        
        # 计算 0 的位置 (x, y)
        x, y = zero_idx // 3, zero_idx % 3
        
        # 四方向移动
        for dx, dy in [(0,1), (0,-1), (1,0), (-1,0)]:
            nx, ny = x + dx, y + dy
            if 0 <= nx < 3 and 0 <= ny < 3:
                new_idx = nx * 3 + ny
                # 交换
                new_state = state_list[:]
                new_state[zero_idx], new_state[new_idx] = new_state[new_idx], new_state[zero_idx]
                neighbors.append((tuple(new_state), 1))
        
        return neighbors
    
    def heuristic(state, goal):
        """曼哈顿距离"""
        distance = 0
        for i in range(9):
            if state[i] != 0:
                curr_x, curr_y = i // 3, i % 3
                goal_idx = goal.index(state[i])
                goal_x, goal_y = goal_idx // 3, goal_idx % 3
                distance += abs(curr_x - goal_x) + abs(curr_y - goal_y)
        return distance
    
    return ida_star(initial, goal, get_neighbors, heuristic)
```

## IDA* vs A*

| 特性 | A* | IDA* |
|-----|-----|------|
| 搜索方式 | BFS（宽度优先） | DFS（深度优先） |
| 空间复杂度 | O(b^d) | O(d) |
| 时间复杂度 | O(b^d) | O(b^d)，但常数更大 |
| 是否重复访问 | 否（closed_set） | 是（每轮重新搜索） |
| 适用场景 | 内存充足，追求速度 | 内存受限，解的深度浅 |

**选择建议**：
- 解的深度浅（< 20）：IDA* 更节省内存
- 解的深度深：A* 避免重复搜索，更快
- 分支因子小：IDA* 重复搜索代价小
- 分支因子大：A* 更优

## 优化技巧

### 1. 转置表（Transposition Table）

记录已访问状态，避免重复：

```python
transposition_table = {}

def search_with_memo(node, g, threshold, path):
    state_key = (node, g)
    if state_key in transposition_table:
        return False, transposition_table[state_key]
    
    # 原搜索逻辑...
    
    transposition_table[state_key] = result
    return found, result
```

### 2. 更好的启发函数

八数码问题的改进启发函数：

```python
def heuristic_better(state, goal):
    """曼哈顿距离 + 线性冲突"""
    md = manhattan_distance(state, goal)
    lc = linear_conflict(state, goal)
    return md + 2 * lc

def linear_conflict(state, goal):
    """线性冲突：同一行/列中两个数字相对位置错误"""
    conflict = 0
    
    # 检查每一行
    for row in range(3):
        row_tiles = []
        for col in range(3):
            idx = row * 3 + col
            if state[idx] != 0:
                goal_idx = goal.index(state[idx])
                goal_row = goal_idx // 3
                if goal_row == row:
                    row_tiles.append((state[idx], col, goal.index(state[idx]) % 3))
        
        # 统计冲突
        for i in range(len(row_tiles)):
            for j in range(i + 1, len(row_tiles)):
                if row_tiles[i][1] > row_tiles[j][1] and row_tiles[i][2] < row_tiles[j][2]:
                    conflict += 1
    
    # 同理检查每一列...
    
    return conflict
```

## 实战：滑动谜题

**LeetCode 773. Sliding Puzzle**

```python
def slidingPuzzle(board):
    """2x3 滑动谜题"""
    start = tuple(board[0] + board[1])
    goal = (1, 2, 3, 4, 5, 0)
    
    def get_neighbors(state):
        state_list = list(state)
        zero_idx = state_list.index(0)
        neighbors = []
        
        # 2x3 网格的移动规则
        moves = {
            0: [1, 3],
            1: [0, 2, 4],
            2: [1, 5],
            3: [0, 4],
            4: [1, 3, 5],
            5: [2, 4]
        }
        
        for next_idx in moves[zero_idx]:
            new_state = state_list[:]
            new_state[zero_idx], new_state[next_idx] = new_state[next_idx], new_state[zero_idx]
            neighbors.append((tuple(new_state), 1))
        
        return neighbors
    
    def heuristic(state, goal):
        distance = 0
        for i in range(6):
            if state[i] != 0:
                goal_idx = goal.index(state[i])
                curr_x, curr_y = i // 3, i % 3
                goal_x, goal_y = goal_idx // 3, goal_idx % 3
                distance += abs(curr_x - goal_x) + abs(curr_y - goal_y)
        return distance
    
    path, cost = ida_star_simple(start, goal, get_neighbors, heuristic)
    return cost if path else -1
```

## 小结

- IDA* 是 A* 的深度优先版本，空间复杂度 O(d)
- 通过迭代加深和 f(n) 阈值剪枝实现
- 适合内存受限、解的深度浅的问题
- 经典应用：八数码、滑动谜题、魔方等
- 可以通过转置表和更好的启发函数优化
