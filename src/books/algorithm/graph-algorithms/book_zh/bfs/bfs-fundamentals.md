# BFS 原理与实现

## 什么是 BFS？

**广度优先搜索（Breadth-First Search，BFS）** 是图遍历的另一种基本算法。核心思想：**层层扩展，由近及远**。

```
从起点出发，先访问所有直接邻居（第1层），
再访问邻居的邻居（第2层），
以此类推，直到遍历完所有节点。
```

## 直观理解

想象一颗石子投入水中：
1. 水波从中心向外扩散
2. 先到达近处，再到达远处
3. 同一圈的点同时被触及

这就是 BFS 的本质：**按距离远近层层遍历**。

## 基本实现

BFS 使用**队列（Queue）**实现：

```typescript
function bfs(graph: number[][], start: number): void {
  const visited = new Set<number>([start]);
  const queue: number[] = [start];
  
  while (queue.length > 0) {
    const node = queue.shift()!;
    console.log('访问节点:', node);
    
    for (const neighbor of graph[node]) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push(neighbor);
      }
    }
  }
}
```

## BFS 的执行过程

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

从 0 开始 BFS：

```
初始：queue = [0], visited = {0}

Step 1: 取出 0
  邻居 1, 2 入队
  queue = [1, 2], visited = {0, 1, 2}

Step 2: 取出 1
  邻居 0 已访问
  邻居 3, 4 入队
  queue = [2, 3, 4], visited = {0, 1, 2, 3, 4}

Step 3: 取出 2
  邻居 0 已访问
  queue = [3, 4]

Step 4: 取出 3
  邻居 1 已访问
  queue = [4]

Step 5: 取出 4
  邻居 1 已访问
  queue = []

访问顺序：0 → 1 → 2 → 3 → 4
```

## BFS 的特点

### 1. 时间复杂度

- **O(V + E)**：每个顶点和每条边都只访问一次

### 2. 空间复杂度

- **O(V)**：visited 集合 + 队列

### 3. 访问顺序

- 先近后远
- 同层节点连续访问

### 4. 最短路径特性

**在无权图中，BFS 找到的路径一定是最短路径**。

这是 BFS 最重要的性质！

## 层次遍历模板

很多问题需要知道当前是第几层：

```typescript
function bfsWithLevel(graph: number[][], start: number): void {
  const visited = new Set<number>([start]);
  const queue: number[] = [start];
  let level = 0;
  
  while (queue.length > 0) {
    const size = queue.length;  // 当前层的节点数
    
    console.log(`第 ${level} 层:`, queue.slice(0, size));
    
    for (let i = 0; i < size; i++) {
      const node = queue.shift()!;
      
      for (const neighbor of graph[node]) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push(neighbor);
        }
      }
    }
    
    level++;
  }
}
```

## 求最短距离

```typescript
function shortestDistance(graph: number[][], start: number, end: number): number {
  if (start === end) return 0;
  
  const visited = new Set<number>([start]);
  const queue: number[] = [start];
  let distance = 0;
  
  while (queue.length > 0) {
    distance++;
    const size = queue.length;
    
    for (let i = 0; i < size; i++) {
      const node = queue.shift()!;
      
      for (const neighbor of graph[node]) {
        if (neighbor === end) return distance;
        
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push(neighbor);
        }
      }
    }
  }
  
  return -1;  // 不可达
}
```

## 网格上的 BFS

```typescript
function bfsGrid(grid: number[][], startI: number, startJ: number): void {
  const m = grid.length, n = grid[0].length;
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  
  const visited = new Set<string>();
  visited.add(`${startI},${startJ}`);
  
  const queue: Array<[number, number]> = [[startI, startJ]];
  
  while (queue.length > 0) {
    const [i, j] = queue.shift()!;
    
    for (const [di, dj] of dirs) {
      const ni = i + di, nj = j + dj;
      const key = `${ni},${nj}`;
      
      if (ni >= 0 && ni < m && nj >= 0 && nj < n 
          && !visited.has(key) && grid[ni][nj] !== 0) {
        visited.add(key);
        queue.push([ni, nj]);
      }
    }
  }
}
```

## BFS 模板总结

### 模板一：基本遍历

```typescript
const visited = new Set([start]);
const queue = [start];

while (queue.length > 0) {
  const node = queue.shift()!;
  
  for (const next of getNeighbors(node)) {
    if (!visited.has(next)) {
      visited.add(next);
      queue.push(next);
    }
  }
}
```

### 模板二：层次遍历

```typescript
const visited = new Set([start]);
const queue = [start];
let level = 0;

while (queue.length > 0) {
  const size = queue.length;
  
  for (let i = 0; i < size; i++) {
    const node = queue.shift()!;
    // 处理 node
    
    for (const next of getNeighbors(node)) {
      if (!visited.has(next)) {
        visited.add(next);
        queue.push(next);
      }
    }
  }
  
  level++;
}
```

### 模板三：最短路径

```typescript
const visited = new Set([start]);
const queue = [start];
let distance = 0;

while (queue.length > 0) {
  const size = queue.length;
  
  for (let i = 0; i < size; i++) {
    const node = queue.shift()!;
    if (node === target) return distance;
    
    for (const next of getNeighbors(node)) {
      if (!visited.has(next)) {
        visited.add(next);
        queue.push(next);
      }
    }
  }
  
  distance++;
}

return -1;
```

## 常见错误

### 1. 出队时标记（太晚）

```typescript
// 错误：会导致重复入队
while (queue.length > 0) {
  const node = queue.shift()!;
  visited.add(node);  // 太晚了！
  
  for (const next of graph[node]) {
    if (!visited.has(next)) {
      queue.push(next);
    }
  }
}
```

### 2. 忘记初始标记

```typescript
// 错误：起点未标记
const queue = [start];
// 忘记 visited.add(start)
```

### 3. 队列为空时继续访问

```typescript
// 错误：queue.shift() 可能返回 undefined
const node = queue.shift();
// 应该检查 queue.length > 0
```

## BFS vs DFS

| 方面 | BFS | DFS |
|------|-----|-----|
| 数据结构 | 队列 | 栈/递归 |
| 遍历顺序 | 层次（由近及远） | 深入（一条路走到底） |
| 最短路径 | ✓ 无权图最短 | ✗ |
| 空间 | O(w) w=最大层宽 | O(h) h=最大深度 |
| 适用场景 | 最短路、层次遍历 | 路径搜索、连通性 |

## 总结

BFS 是图算法的基础：

1. **核心思想**：层层扩展，由近及远
2. **数据结构**：队列
3. **最重要性质**：无权图最短路径
4. **时间复杂度**：O(V + E)
5. **关键点**：入队时标记，不是出队时标记

下一节我们将深入讨论 BFS 的层次遍历特性。
