# 图遍历的选择：DFS vs BFS

在图论问题中，DFS 和 BFS 都是基础的遍历算法。那么，什么时候用 DFS？什么时候用 BFS？它们各有什么优势？

## 核心差异

| 特性 | DFS | BFS |
|------|-----|-----|
| 数据结构 | 栈（递归调用栈） | 队列 |
| 空间复杂度 | $O(h)$ h=树高 | $O(w)$ w=最宽层 |
| 实现方式 | 递归或栈 | 队列 |
| 遍历顺序 | 先深后广 | 先广后深 |
| 路径特性 | 找到的不一定最短 | 找到的一定最短（无权图） |

## DFS 的优势场景

### 1. 路径问题

**当需要探索所有可能路径时，用 DFS**：

```typescript
// 找所有从起点到终点的路径
function allPaths(graph: number[][], start: number, end: number): number[][] {
  const paths: number[][] = [];
  const path: number[] = [];
  
  function dfs(node: number): void {
    path.push(node);
    
    if (node === end) {
      paths.push([...path]);  // 找到一条路径
    } else {
      for (const next of graph[node]) {
        dfs(next);
      }
    }
    
    path.pop();  // 回溯
  }
  
  dfs(start);
  return paths;
}
```

**为什么用 DFS？**
- DFS 天然适合回溯
- 探索一条路径到底，再回溯探索其他路径
- 代码结构清晰

### 2. 拓扑排序

拓扑排序使用 DFS 的后序遍历：

```typescript
function topologicalSort(n: number, edges: number[][]): number[] {
  const graph: number[][] = Array.from({ length: n }, () => []);
  for (const [u, v] of edges) {
    graph[u].push(v);
  }
  
  const visited = new Array(n).fill(false);
  const result: number[] = [];
  
  function dfs(node: number): void {
    visited[node] = true;
    
    for (const next of graph[node]) {
      if (!visited[next]) {
        dfs(next);
      }
    }
    
    result.push(node);  // 后序位置
  }
  
  for (let i = 0; i < n; i++) {
    if (!visited[i]) {
      dfs(i);
    }
  }
  
  return result.reverse();
}
```

**为什么用 DFS？**
- 拓扑排序需要后序遍历
- DFS 的递归天然提供后序位置
- BFS 需要额外维护入度数组

### 3. 环检测

检测图中是否有环，DFS 更直观：

```typescript
function hasCycle(n: number, edges: number[][]): boolean {
  const graph: number[][] = Array.from({ length: n }, () => []);
  for (const [u, v] of edges) {
    graph[u].push(v);
  }
  
  const visited = new Array(n).fill(0);  // 0=未访问 1=访问中 2=已完成
  
  function dfs(node: number): boolean {
    visited[node] = 1;  // 标记为访问中
    
    for (const next of graph[node]) {
      if (visited[next] === 1) {
        return true;  // 遇到访问中的节点，说明有环
      }
      if (visited[next] === 0 && dfs(next)) {
        return true;
      }
    }
    
    visited[node] = 2;  // 标记为已完成
    return false;
  }
  
  for (let i = 0; i < n; i++) {
    if (visited[i] === 0 && dfs(i)) {
      return true;
    }
  }
  
  return false;
}
```

**为什么用 DFS？**
- 需要三色标记法（未访问、访问中、已完成）
- DFS 的调用栈天然维护"访问中"状态
- 回边检测更直观

### 4. 连通性问题

判断图的连通性，DFS 代码更简洁：

```typescript
function isConnected(n: number, edges: number[][]): boolean {
  const graph: number[][] = Array.from({ length: n }, () => []);
  for (const [u, v] of edges) {
    graph[u].push(v);
    graph[v].push(u);
  }
  
  const visited = new Array(n).fill(false);
  let count = 0;
  
  function dfs(node: number): void {
    visited[node] = true;
    count++;
    
    for (const next of graph[node]) {
      if (!visited[next]) {
        dfs(next);
      }
    }
  }
  
  dfs(0);  // 从节点0开始
  return count === n;  // 能访问所有节点则连通
}
```

## BFS 的优势场景

### 1. 最短路径（无权图）

**在无权图中找最短路径，必须用 BFS**：

```typescript
function shortestPath(graph: number[][], start: number, end: number): number {
  const queue: number[] = [start];
  const visited = new Set<number>([start]);
  let distance = 0;
  
  while (queue.length > 0) {
    const size = queue.length;
    
    for (let i = 0; i < size; i++) {
      const node = queue.shift()!;
      
      if (node === end) {
        return distance;
      }
      
      for (const next of graph[node]) {
        if (!visited.has(next)) {
          visited.add(next);
          queue.push(next);
        }
      }
    }
    
    distance++;
  }
  
  return -1;  // 不可达
}
```

**为什么用 BFS？**
- BFS 按层遍历，先到的一定是最短路径
- DFS 可能先找到长路径，错过最短路径

### 2. 层次遍历

需要明确的层次信息时，用 BFS：

```typescript
function levelOrder(graph: number[][], start: number): number[][] {
  const result: number[][] = [];
  const queue: number[] = [start];
  const visited = new Set<number>([start]);
  
  while (queue.length > 0) {
    const size = queue.length;
    const level: number[] = [];
    
    for (let i = 0; i < size; i++) {
      const node = queue.shift()!;
      level.push(node);
      
      for (const next of graph[node]) {
        if (!visited.has(next)) {
          visited.add(next);
          queue.push(next);
        }
      }
    }
    
    result.push(level);
  }
  
  return result;
}
```

**为什么用 BFS？**
- 队列天然支持层次遍历
- DFS 需要额外参数传递层数

### 3. 多源最短路径

多个起点同时扩散，用 BFS：

```typescript
function multiSourceBFS(grid: number[][]): number[][] {
  const m = grid.length, n = grid[0].length;
  const queue: [number, number][] = [];
  const distance = Array.from({ length: m }, () => new Array(n).fill(Infinity));
  
  // 将所有源点入队
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      if (grid[i][j] === 1) {
        queue.push([i, j]);
        distance[i][j] = 0;
      }
    }
  }
  
  const dirs = [[0, 1], [1, 0], [0, -1], [-1, 0]];
  
  while (queue.length > 0) {
    const [x, y] = queue.shift()!;
    
    for (const [dx, dy] of dirs) {
      const nx = x + dx, ny = y + dy;
      
      if (nx >= 0 && nx < m && ny >= 0 && ny < n && 
          distance[nx][ny] === Infinity) {
        distance[nx][ny] = distance[x][y] + 1;
        queue.push([nx, ny]);
      }
    }
  }
  
  return distance;
}
```

**为什么用 BFS？**
- 所有源点同时扩散
- 保证找到每个点到最近源点的距离

### 4. 最少步数问题

需要找"最少操作次数"时，用 BFS：

```typescript
// 打开转盘锁：最少旋转次数
function openLock(deadends: string[], target: string): number {
  const dead = new Set(deadends);
  if (dead.has('0000')) return -1;
  if (target === '0000') return 0;
  
  const queue: string[] = ['0000'];
  const visited = new Set<string>(['0000']);
  let steps = 0;
  
  while (queue.length > 0) {
    const size = queue.length;
    
    for (let i = 0; i < size; i++) {
      const curr = queue.shift()!;
      
      if (curr === target) {
        return steps;
      }
      
      // 生成下一步状态
      for (const next of getNextStates(curr)) {
        if (!visited.has(next) && !dead.has(next)) {
          visited.add(next);
          queue.push(next);
        }
      }
    }
    
    steps++;
  }
  
  return -1;
}

function getNextStates(state: string): string[] {
  const result: string[] = [];
  const arr = state.split('');
  
  for (let i = 0; i < 4; i++) {
    const digit = parseInt(arr[i]);
    
    // 向上拨
    arr[i] = ((digit + 1) % 10).toString();
    result.push(arr.join(''));
    
    // 向下拨
    arr[i] = ((digit + 9) % 10).toString();
    result.push(arr.join(''));
    
    // 恢复
    arr[i] = digit.toString();
  }
  
  return result;
}
```

**为什么用 BFS？**
- 状态空间搜索
- 第一次到达目标的步数一定是最少的

## 两者都可以的场景

### 连通分量统计

DFS 和 BFS 都可以：

```typescript
// DFS 版本
function countComponentsDFS(n: number, edges: number[][]): number {
  const graph = buildGraph(n, edges);
  const visited = new Array(n).fill(false);
  let count = 0;
  
  function dfs(node: number): void {
    visited[node] = true;
    for (const next of graph[node]) {
      if (!visited[next]) dfs(next);
    }
  }
  
  for (let i = 0; i < n; i++) {
    if (!visited[i]) {
      dfs(i);
      count++;
    }
  }
  
  return count;
}

// BFS 版本
function countComponentsBFS(n: number, edges: number[][]): number {
  const graph = buildGraph(n, edges);
  const visited = new Array(n).fill(false);
  let count = 0;
  
  for (let i = 0; i < n; i++) {
    if (!visited[i]) {
      const queue = [i];
      visited[i] = true;
      
      while (queue.length > 0) {
        const node = queue.shift()!;
        for (const next of graph[node]) {
          if (!visited[next]) {
            visited[next] = true;
            queue.push(next);
          }
        }
      }
      
      count++;
    }
  }
  
  return count;
}
```

**如何选择？**
- 图很深但不宽：DFS 空间更优
- 图很宽但不深：BFS 空间更优
- 无明显差异：选你更熟悉的

## 选择决策树

```
需要最短路径？
  ├─ 是 → BFS
  └─ 否 → 继续

需要所有路径？
  ├─ 是 → DFS（回溯）
  └─ 否 → 继续

需要层次信息？
  ├─ 是 → BFS
  └─ 否 → 继续

需要拓扑排序？
  ├─ 是 → DFS
  └─ 否 → 继续

需要环检测？
  ├─ 是 → DFS（三色标记）
  └─ 否 → 继续

纯连通性判断？
  └─ 都可以（看图结构选空间更优的）
```

## 性能对比

### 时间复杂度

都是 $O(V + E)$，V=节点数，E=边数

### 空间复杂度

- **DFS**：$O(h)$，h 是树的高度
  - 最好：$O(\log V)$（平衡树）
  - 最坏：$O(V)$（链状图）

- **BFS**：$O(w)$，w 是最宽层的节点数
  - 最好：$O(1)$（链状图）
  - 最坏：$O(V)$（完全图）

**什么图用 DFS 更省空间？**
- 二叉树、树状结构（高度 < 宽度）
- 链状图

**什么图用 BFS 更省空间？**
- 完全图
- 宽度较小的图

## 实战对比：岛屿数量

```typescript
// LeetCode 200. 岛屿数量

// DFS 版本
function numIslandsDFS(grid: string[][]): number {
  const m = grid.length, n = grid[0].length;
  let count = 0;
  
  function dfs(i: number, j: number): void {
    if (i < 0 || i >= m || j < 0 || j >= n || grid[i][j] === '0') {
      return;
    }
    
    grid[i][j] = '0';  // 标记为已访问
    dfs(i + 1, j);
    dfs(i - 1, j);
    dfs(i, j + 1);
    dfs(i, j - 1);
  }
  
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      if (grid[i][j] === '1') {
        dfs(i, j);
        count++;
      }
    }
  }
  
  return count;
}

// BFS 版本
function numIslandsBFS(grid: string[][]): number {
  const m = grid.length, n = grid[0].length;
  let count = 0;
  
  const dirs = [[0, 1], [1, 0], [0, -1], [-1, 0]];
  
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      if (grid[i][j] === '1') {
        const queue: [number, number][] = [[i, j]];
        grid[i][j] = '0';
        
        while (queue.length > 0) {
          const [x, y] = queue.shift()!;
          
          for (const [dx, dy] of dirs) {
            const nx = x + dx, ny = y + dy;
            if (nx >= 0 && nx < m && ny >= 0 && ny < n && grid[nx][ny] === '1') {
              grid[nx][ny] = '0';
              queue.push([nx, ny]);
            }
          }
        }
        
        count++;
      }
    }
  }
  
  return count;
}
```

**两种方法都可以，如何选择？**
- 岛屿很大很深：DFS 可能栈溢出，用 BFS
- 岛屿扁平宽广：BFS 队列占用大，用 DFS
- 无特殊要求：选你更熟悉的

## 总结

| 场景 | 推荐 | 原因 |
|------|------|------|
| 最短路径（无权图） | **BFS** | 第一次到达即最短 |
| 所有路径 | **DFS** | 回溯天然支持 |
| 拓扑排序 | **DFS** | 后序遍历简洁 |
| 环检测 | **DFS** | 三色标记直观 |
| 层次遍历 | **BFS** | 队列天然分层 |
| 多源最短路 | **BFS** | 同时扩散 |
| 最少步数 | **BFS** | 按层搜索保证最优 |
| 连通性判断 | **都可以** | 看图结构选空间优的 |

**记住核心原则**：
- **需要最短/最少**：BFS
- **需要所有/回溯**：DFS
- **需要层次**：BFS
- **需要后序**：DFS

理解了这些原则，就能在图论题中做出正确的算法选择！
