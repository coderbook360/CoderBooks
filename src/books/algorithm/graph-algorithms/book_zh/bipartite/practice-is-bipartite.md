# 实战：判断二分图

LeetCode 785. Is Graph Bipartite?

## 题目描述

给定一个无向图 `graph`，判断这个图是否为二分图。

**示例**：
```
输入：graph = [[1,3],[0,2],[1,3],[0,2]]
输出：true
解释：可以分组为 {0, 2} 和 {1, 3}
```

## 解题思路

二分图判定 = 图染色问题 = 检测奇数环

## 方法一：BFS 染色

```typescript
function isBipartite(graph: number[][]): boolean {
  const n = graph.length;
  const color = new Array(n).fill(-1);
  
  for (let start = 0; start < n; start++) {
    if (color[start] !== -1) continue;
    
    const queue: number[] = [start];
    color[start] = 0;
    
    while (queue.length > 0) {
      const node = queue.shift()!;
      
      for (const neighbor of graph[node]) {
        if (color[neighbor] === -1) {
          color[neighbor] = 1 - color[node];
          queue.push(neighbor);
        } else if (color[neighbor] === color[node]) {
          return false;
        }
      }
    }
  }
  
  return true;
}
```

**时间复杂度**：$O(V + E)$  
**空间复杂度**：$O(V)$

## 方法二：DFS 染色

```typescript
function isBipartite(graph: number[][]): boolean {
  const n = graph.length;
  const color = new Array(n).fill(-1);
  
  function dfs(node: number, c: number): boolean {
    color[node] = c;
    
    for (const neighbor of graph[node]) {
      if (color[neighbor] === -1) {
        if (!dfs(neighbor, 1 - c)) return false;
      } else if (color[neighbor] === c) {
        return false;
      }
    }
    
    return true;
  }
  
  for (let i = 0; i < n; i++) {
    if (color[i] === -1 && !dfs(i, 0)) {
      return false;
    }
  }
  
  return true;
}
```

## 方法三：并查集

```typescript
class UnionFind {
  parent: number[];
  
  constructor(n: number) {
    this.parent = Array.from({ length: n }, (_, i) => i);
  }
  
  find(x: number): number {
    if (this.parent[x] !== x) {
      this.parent[x] = this.find(this.parent[x]);
    }
    return this.parent[x];
  }
  
  union(x: number, y: number): void {
    this.parent[this.find(x)] = this.find(y);
  }
  
  isConnected(x: number, y: number): boolean {
    return this.find(x) === this.find(y);
  }
}

function isBipartite(graph: number[][]): boolean {
  const n = graph.length;
  const uf = new UnionFind(n);
  
  for (let i = 0; i < n; i++) {
    for (const neighbor of graph[i]) {
      if (uf.isConnected(i, neighbor)) {
        return false;
      }
      uf.union(graph[i][0], neighbor);
    }
  }
  
  return true;
}
```

## 总结

- **BFS 染色**：直观易懂
- **DFS 染色**：代码简洁
- **并查集**：适合动态图

推荐使用 BFS 染色法。
