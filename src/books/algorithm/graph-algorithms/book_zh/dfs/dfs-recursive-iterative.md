# DFS 的递归与迭代写法

## 两种实现方式

DFS 可以用递归或迭代（栈）实现，本质相同。

## 递归实现

```typescript
function dfsRecursive(graph: number[][], start: number): number[] {
  const visited = new Set<number>();
  const result: number[] = [];
  
  function explore(node: number): void {
    visited.add(node);
    result.push(node);
    
    for (const neighbor of graph[node]) {
      if (!visited.has(neighbor)) {
        explore(neighbor);
      }
    }
  }
  
  explore(start);
  return result;
}
```

**特点**：
- 代码简洁直观
- 利用系统调用栈
- 可能栈溢出（递归太深时）

## 迭代实现（显式栈）

```typescript
function dfsIterative(graph: number[][], start: number): number[] {
  const visited = new Set<number>();
  const result: number[] = [];
  const stack: number[] = [start];
  
  while (stack.length > 0) {
    const node = stack.pop()!;
    
    if (visited.has(node)) continue;
    visited.add(node);
    result.push(node);
    
    // 逆序入栈，保证访问顺序一致
    for (let i = graph[node].length - 1; i >= 0; i--) {
      const neighbor = graph[node][i];
      if (!visited.has(neighbor)) {
        stack.push(neighbor);
      }
    }
  }
  
  return result;
}
```

**注意**：为了保持和递归相同的访问顺序，邻居需要**逆序入栈**。

## 访问顺序对比

```
图结构：
    0
   / \
  1   2
```

```typescript
// 邻接表
graph[0] = [1, 2];
```

**递归版**：先访问 1，再访问 2
```
explore(0)
  → explore(1)
  → explore(2)
结果：[0, 1, 2]
```

**迭代版（正序入栈）**：先访问 2，再访问 1
```
stack: [0]
pop 0, push [1, 2]
stack: [1, 2]
pop 2
stack: [1]
pop 1
结果：[0, 2, 1]  // 顺序不同！
```

**迭代版（逆序入栈）**：先访问 1，再访问 2
```
stack: [0]
pop 0, push [2, 1]  // 逆序
stack: [2, 1]
pop 1
stack: [2]
pop 2
结果：[0, 1, 2]  // 与递归一致
```

## 网格 DFS 的两种写法

### 递归版

```typescript
function dfsGridRecursive(grid: number[][], i: number, j: number): void {
  const m = grid.length, n = grid[0].length;
  if (i < 0 || i >= m || j < 0 || j >= n || grid[i][j] === 0) return;
  
  grid[i][j] = 0;  // 标记
  
  dfsGridRecursive(grid, i + 1, j);
  dfsGridRecursive(grid, i - 1, j);
  dfsGridRecursive(grid, i, j + 1);
  dfsGridRecursive(grid, i, j - 1);
}
```

### 迭代版

```typescript
function dfsGridIterative(grid: number[][], startI: number, startJ: number): void {
  const m = grid.length, n = grid[0].length;
  if (grid[startI][startJ] === 0) return;
  
  const stack: Array<[number, number]> = [[startI, startJ]];
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  
  while (stack.length > 0) {
    const [i, j] = stack.pop()!;
    
    if (i < 0 || i >= m || j < 0 || j >= n || grid[i][j] === 0) {
      continue;
    }
    
    grid[i][j] = 0;  // 标记
    
    for (const [di, dj] of dirs) {
      stack.push([i + di, j + dj]);
    }
  }
}
```

## 如何选择？

### 优先使用递归

- 代码更简洁
- LeetCode 大多数场景不会栈溢出
- 更容易理解和调试

### 使用迭代的场景

1. **递归深度太大**：可能栈溢出
2. **需要手动控制遍历顺序**
3. **面试官要求**

## 递归深度问题

### 栈溢出风险

```typescript
// 递归深度 = 最长路径长度
// 例如：链式图 0 → 1 → 2 → ... → 9999
// 递归深度 10000，可能栈溢出
```

### 解决方案

1. **使用迭代版**：显式栈在堆上，不受调用栈限制

2. **增加栈大小**（部分语言支持）

3. **尾递归优化**（TypeScript/JavaScript 不支持）

## 带状态的 DFS

某些问题需要在 DFS 过程中维护额外状态。

### 递归版

```typescript
// 找所有从 start 到 end 的路径
function findAllPaths(graph: number[][], start: number, end: number): number[][] {
  const result: number[][] = [];
  const path: number[] = [];
  
  function dfs(node: number): void {
    path.push(node);
    
    if (node === end) {
      result.push([...path]);
    } else {
      for (const neighbor of graph[node]) {
        dfs(neighbor);
      }
    }
    
    path.pop();  // 回溯
  }
  
  dfs(start);
  return result;
}
```

### 迭代版（更复杂）

```typescript
function findAllPathsIterative(graph: number[][], start: number, end: number): number[][] {
  const result: number[][] = [];
  // 栈中存储：[当前节点, 当前路径, 下一个要访问的邻居索引]
  const stack: Array<[number, number[], number]> = [[start, [start], 0]];
  
  while (stack.length > 0) {
    const [node, path, idx] = stack[stack.length - 1];
    
    if (node === end) {
      result.push([...path]);
      stack.pop();
      continue;
    }
    
    if (idx >= graph[node].length) {
      stack.pop();
      continue;
    }
    
    // 更新当前状态的索引
    stack[stack.length - 1][2]++;
    
    const neighbor = graph[node][idx];
    stack.push([neighbor, [...path, neighbor], 0]);
  }
  
  return result;
}
```

**观察**：迭代版需要手动管理状态，代码复杂度显著增加。

## 颜色标记法

三色标记用于检测有向图中的环：

```typescript
// 0: 白色（未访问）
// 1: 灰色（正在访问）
// 2: 黑色（已完成）

function hasCycle(graph: number[][]): boolean {
  const n = graph.length;
  const color = new Array(n).fill(0);
  
  function dfs(node: number): boolean {
    color[node] = 1;  // 灰色
    
    for (const neighbor of graph[node]) {
      if (color[neighbor] === 1) return true;  // 发现环
      if (color[neighbor] === 0 && dfs(neighbor)) return true;
    }
    
    color[node] = 2;  // 黑色
    return false;
  }
  
  for (let i = 0; i < n; i++) {
    if (color[i] === 0 && dfs(i)) {
      return true;
    }
  }
  
  return false;
}
```

## 性能对比

| 方面 | 递归 | 迭代 |
|------|------|------|
| 代码量 | 少 | 多 |
| 可读性 | 好 | 一般 |
| 空间 | 调用栈 | 显式栈 |
| 栈溢出风险 | 有 | 无 |
| 性能 | 略慢（函数调用开销） | 略快 |

实际刷题中，性能差异可以忽略，优先考虑代码清晰度。

## 总结

1. **递归版**：首选，代码简洁
2. **迭代版**：处理深度大或需要精细控制时使用
3. **访问顺序**：迭代版需要逆序入栈才能保持一致
4. **状态管理**：递归利用调用栈，迭代需要手动管理

建议：
- 优先掌握递归写法
- 了解迭代写法的原理
- 根据具体问题选择合适的实现方式
