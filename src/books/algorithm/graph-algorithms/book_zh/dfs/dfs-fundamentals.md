# DFS 原理与实现

## 什么是 DFS？

**深度优先搜索（Depth-First Search，DFS）** 是图遍历的基本算法。核心思想：**走到底，再回头**。

```
从起点出发，沿着一条路一直走到尽头，
然后回退到上一个分叉点，尝试另一条路，
直到遍历完所有节点。
```

## 直观理解

想象你在迷宫中探索：
1. 选择一条路，一直走
2. 遇到死路，原路返回到上一个岔路口
3. 尝试另一条路
4. 重复直到找到出口或探索完所有路

这就是 DFS 的本质：**深入探索 + 回溯**。

## 基本实现

### 递归版本（推荐）

```typescript
function dfs(graph: number[][], start: number): void {
  const visited = new Set<number>();
  
  function explore(node: number): void {
    // 标记已访问
    visited.add(node);
    console.log('访问节点:', node);
    
    // 递归访问所有未访问的邻居
    for (const neighbor of graph[node]) {
      if (!visited.has(neighbor)) {
        explore(neighbor);
      }
    }
  }
  
  explore(start);
}
```

### 遍历所有节点

图可能不连通，需要从多个起点出发：

```typescript
function dfsAll(graph: number[][]): void {
  const n = graph.length;
  const visited = new Set<number>();
  
  function explore(node: number): void {
    visited.add(node);
    for (const neighbor of graph[node]) {
      if (!visited.has(neighbor)) {
        explore(neighbor);
      }
    }
  }
  
  for (let i = 0; i < n; i++) {
    if (!visited.has(i)) {
      explore(i);
    }
  }
}
```

## DFS 的执行过程

以下图为例：

```
    0
   / \
  1   2
 / \
3   4
```

邻接表：
```
0: [1, 2]
1: [0, 3, 4]
2: [0]
3: [1]
4: [1]
```

从 0 开始 DFS：

```
explore(0)
  visited: {0}
  → explore(1)
      visited: {0, 1}
      → explore(3)
          visited: {0, 1, 3}
          邻居 1 已访问，返回
      → explore(4)
          visited: {0, 1, 3, 4}
          邻居 1 已访问，返回
      返回
  → explore(2)
      visited: {0, 1, 3, 4, 2}
      邻居 0 已访问，返回
  返回

访问顺序：0 → 1 → 3 → 4 → 2
```

## DFS 的特点

### 1. 时间复杂度

- **O(V + E)**：每个顶点和每条边都只访问一次
- V = 顶点数，E = 边数

### 2. 空间复杂度

- **O(V)**：visited 集合 + 递归栈

### 3. 访问顺序

- 先深入后回溯
- 同一层的节点可能相隔很远才访问

### 4. 适用场景

- 判断连通性
- 寻找路径
- 检测环
- 拓扑排序
- 连通分量

## 网格上的 DFS

网格图是 DFS 的常见应用场景：

```typescript
function dfsGrid(grid: number[][], i: number, j: number, visited: boolean[][]): void {
  const m = grid.length, n = grid[0].length;
  
  // 边界检查
  if (i < 0 || i >= m || j < 0 || j >= n) return;
  // 已访问或障碍
  if (visited[i][j] || grid[i][j] === 0) return;
  
  visited[i][j] = true;
  
  // 四个方向递归
  dfsGrid(grid, i + 1, j, visited);  // 下
  dfsGrid(grid, i - 1, j, visited);  // 上
  dfsGrid(grid, i, j + 1, visited);  // 右
  dfsGrid(grid, i, j - 1, visited);  // 左
}

// 更简洁的写法
function dfsGridCompact(grid: number[][], i: number, j: number): void {
  const m = grid.length, n = grid[0].length;
  if (i < 0 || i >= m || j < 0 || j >= n || grid[i][j] === 0) return;
  
  grid[i][j] = 0;  // 标记已访问（原地修改）
  
  const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
  for (const [di, dj] of dirs) {
    dfsGridCompact(grid, i + di, j + dj);
  }
}
```

## DFS 模板

### 模板一：图遍历

```typescript
function dfs(graph: number[][], start: number): void {
  const visited = new Set<number>();
  
  function explore(node: number): void {
    visited.add(node);
    // 处理当前节点
    process(node);
    
    for (const neighbor of graph[node]) {
      if (!visited.has(neighbor)) {
        explore(neighbor);
      }
    }
  }
  
  explore(start);
}
```

### 模板二：网格遍历

```typescript
function dfsGrid(grid: number[][], i: number, j: number): void {
  const m = grid.length, n = grid[0].length;
  if (i < 0 || i >= m || j < 0 || j >= n) return;
  if (grid[i][j] === 0) return;  // 边界条件
  
  grid[i][j] = 0;  // 标记
  
  dfsGrid(grid, i + 1, j);
  dfsGrid(grid, i - 1, j);
  dfsGrid(grid, i, j + 1);
  dfsGrid(grid, i, j - 1);
}
```

### 模板三：路径搜索

```typescript
function findPath(graph: number[][], start: number, end: number): number[] | null {
  const visited = new Set<number>();
  const path: number[] = [];
  
  function dfs(node: number): boolean {
    if (node === end) {
      path.push(node);
      return true;
    }
    
    visited.add(node);
    path.push(node);
    
    for (const neighbor of graph[node]) {
      if (!visited.has(neighbor) && dfs(neighbor)) {
        return true;
      }
    }
    
    path.pop();  // 回溯
    return false;
  }
  
  return dfs(start) ? path : null;
}
```

## DFS vs 递归

DFS 本质上是一种递归思想：

```
DFS(当前节点):
    标记当前节点已访问
    对于每个邻居:
        如果未访问:
            DFS(邻居)
```

递归天然适合实现 DFS，因为：
- 递归栈自动管理"回溯"
- 代码简洁直观

## 常见错误

### 1. 忘记标记已访问

```typescript
// 错误：会无限循环
function dfs(node: number): void {
  for (const neighbor of graph[node]) {
    dfs(neighbor);  // 没有检查是否已访问
  }
}
```

### 2. 在错误的位置标记

```typescript
// 错误：可能重复访问
function dfs(node: number): void {
  for (const neighbor of graph[node]) {
    if (!visited.has(neighbor)) {
      dfs(neighbor);
      visited.add(neighbor);  // 太晚了！
    }
  }
}
```

### 3. 网格边界检查遗漏

```typescript
// 错误：可能越界
function dfs(i: number, j: number): void {
  grid[i][j] = 0;  // 应该先检查边界
  dfs(i + 1, j);
}
```

## 总结

DFS 是图算法的基础：

1. **核心思想**：深入探索 + 回溯
2. **实现方式**：递归（推荐）或栈
3. **时间复杂度**：O(V + E)
4. **空间复杂度**：O(V)
5. **关键点**：正确标记已访问节点

下一节我们将学习 DFS 的迭代实现，以及递归和迭代的选择。
