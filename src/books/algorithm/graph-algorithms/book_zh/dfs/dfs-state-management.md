# DFS 状态管理与回溯

## 为什么需要状态管理？

DFS 过程中，我们需要：
1. **记录已访问节点**：避免重复访问和死循环
2. **记录当前路径**：某些问题需要知道如何到达当前节点
3. **记录搜索状态**：如环检测中的三色标记

正确的状态管理是 DFS 成功的关键。

## 访问标记

### 基本标记

```typescript
// 使用 Set
const visited = new Set<number>();

function dfs(node: number): void {
  visited.add(node);  // 进入时标记
  
  for (const neighbor of graph[node]) {
    if (!visited.has(neighbor)) {
      dfs(neighbor);
    }
  }
}
```

### 原地标记

对于网格问题，常常原地修改避免额外空间：

```typescript
function dfs(grid: number[][], i: number, j: number): void {
  if (i < 0 || i >= m || j < 0 || j >= n) return;
  if (grid[i][j] !== 1) return;  // 不是目标或已访问
  
  grid[i][j] = 2;  // 原地标记为已访问
  
  dfs(grid, i + 1, j);
  dfs(grid, i - 1, j);
  dfs(grid, i, j + 1);
  dfs(grid, i, j - 1);
}
```

**注意**：原地修改可能需要在最后恢复，取决于题目要求。

## 回溯

### 什么是回溯？

回溯是 DFS 的核心机制：**尝试 → 递归 → 撤销**。

```typescript
function dfs(state: State): void {
  if (isGoal(state)) {
    recordResult(state);
    return;
  }
  
  for (const choice of getChoices(state)) {
    // 做选择
    makeChoice(state, choice);
    
    // 递归
    dfs(state);
    
    // 撤销选择（回溯）
    undoChoice(state, choice);
  }
}
```

### 路径记录与回溯

```typescript
function findAllPaths(graph: number[][], start: number, end: number): number[][] {
  const result: number[][] = [];
  const path: number[] = [];
  const visited = new Set<number>();
  
  function dfs(node: number): void {
    // 做选择
    path.push(node);
    visited.add(node);
    
    if (node === end) {
      result.push([...path]);  // 找到一条路径
    } else {
      for (const neighbor of graph[node]) {
        if (!visited.has(neighbor)) {
          dfs(neighbor);
        }
      }
    }
    
    // 撤销选择（回溯）
    path.pop();
    visited.delete(node);
  }
  
  dfs(start);
  return result;
}
```

**关键点**：
- `path.push` 和 `path.pop` 配对
- `visited.add` 和 `visited.delete` 配对
- 回溯让我们能探索所有可能的路径

## 三色标记

用于检测有向图中的环：

```typescript
const WHITE = 0;  // 未访问
const GRAY = 1;   // 正在访问（在当前 DFS 路径上）
const BLACK = 2;  // 已完成

function hasCycle(graph: number[][]): boolean {
  const n = graph.length;
  const color = new Array(n).fill(WHITE);
  
  function dfs(node: number): boolean {
    color[node] = GRAY;  // 开始访问
    
    for (const neighbor of graph[node]) {
      if (color[neighbor] === GRAY) {
        // 遇到灰色节点，说明有环
        return true;
      }
      if (color[neighbor] === WHITE && dfs(neighbor)) {
        return true;
      }
    }
    
    color[node] = BLACK;  // 访问完成
    return false;
  }
  
  for (let i = 0; i < n; i++) {
    if (color[i] === WHITE && dfs(i)) {
      return true;
    }
  }
  
  return false;
}
```

**三色含义**：
- **白色**：还没访问
- **灰色**：正在访问，在当前 DFS 栈中
- **黑色**：访问完毕，所有后代都已处理

## 进入时间与离开时间

记录每个节点的进入和离开时间：

```typescript
let timestamp = 0;
const entryTime: number[] = [];
const exitTime: number[] = [];

function dfs(node: number): void {
  entryTime[node] = ++timestamp;  // 进入时间
  visited.add(node);
  
  for (const neighbor of graph[node]) {
    if (!visited.has(neighbor)) {
      dfs(neighbor);
    }
  }
  
  exitTime[node] = ++timestamp;  // 离开时间
}
```

**应用**：
- 判断祖先关系：`entryTime[u] < entryTime[v] && exitTime[u] > exitTime[v]`
- Tarjan 算法求强连通分量

## 状态管理的常见模式

### 模式一：简单访问标记

```typescript
const visited = new Set<number>();

function dfs(node: number): void {
  if (visited.has(node)) return;
  visited.add(node);
  
  for (const neighbor of graph[node]) {
    dfs(neighbor);
  }
}
```

**适用**：只需判断是否访问过。

### 模式二：路径记录

```typescript
const path: number[] = [];

function dfs(node: number): void {
  path.push(node);
  
  // 处理...
  
  path.pop();  // 回溯
}
```

**适用**：需要知道如何到达当前节点。

### 模式三：状态恢复

```typescript
function dfs(state: number): void {
  const original = state;
  
  // 修改状态
  state = modify(state);
  
  dfs(state);
  
  // 恢复状态
  state = original;
}
```

**适用**：状态是可变的，需要回溯。

### 模式四：不可变状态

```typescript
function dfs(visited: Set<number>, node: number): void {
  const newVisited = new Set(visited);
  newVisited.add(node);
  
  for (const neighbor of graph[node]) {
    dfs(newVisited, neighbor);  // 传递新状态
  }
}
```

**适用**：避免手动回溯，但内存开销大。

## 回溯 vs 不回溯

### 需要回溯

- 找所有路径
- 找所有组合/排列
- 状态需要复用

### 不需要回溯

- 只需判断是否可达
- 只需找一条路径
- 计算连通分量数

## 常见错误

### 1. 忘记回溯

```typescript
// 错误
function dfs(node: number): void {
  path.push(node);
  for (const neighbor of graph[node]) {
    dfs(neighbor);
  }
  // 忘记 path.pop()
}
```

### 2. 回溯位置错误

```typescript
// 错误
function dfs(node: number): void {
  path.push(node);
  path.pop();  // 太早回溯
  for (const neighbor of graph[node]) {
    dfs(neighbor);
  }
}
```

### 3. 标记时机错误

```typescript
// 错误：进入前标记，可能漏访问
function dfs(node: number): void {
  for (const neighbor of graph[node]) {
    if (!visited.has(neighbor)) {
      visited.add(neighbor);  // 应该在 dfs 内部标记
      dfs(neighbor);
    }
  }
}
```

## 实战技巧

### 1. 网格问题的标记

```typescript
// 方法一：使用 visited 数组
const visited = Array.from({ length: m }, () => Array(n).fill(false));

// 方法二：原地修改
grid[i][j] = '#';  // 标记

// 方法三：使用位运算（稀疏网格）
const visited = new Set<number>();
visited.add(i * n + j);  // 将二维坐标编码为一维
```

### 2. 图问题的标记

```typescript
// 方法一：Set
const visited = new Set<number>();

// 方法二：数组（节点编号连续）
const visited = new Array(n).fill(false);

// 方法三：Map（节点是对象）
const visited = new Map<Node, boolean>();
```

## 总结

DFS 状态管理的要点：

1. **访问标记**：避免重复访问
2. **回溯**：撤销选择，探索其他分支
3. **三色标记**：检测有向图的环
4. **时间戳**：记录访问顺序

核心原则：
- **做选择**和**撤销选择**配对
- 标记时机要正确（进入时标记）
- 根据问题选择合适的状态管理方式
