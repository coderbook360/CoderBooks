# 实战：判断二分图

LeetCode 785. Is Graph Bipartite?

## 题目描述

给定一个无向图 `graph`，其中 `graph[i]` 是与节点 `i` 相邻的节点列表。

判断这个图是否是二分图。

**示例**：
```
输入：graph = [[1,3],[0,2],[1,3],[0,2]]
输出：true
解释：可以将节点分成两组：{0, 2} 和 {1, 3}

输入：graph = [[1,2,3],[0,2],[0,1,3],[0,2]]
输出：false
解释：无法分成两组
```

## 什么是二分图？

**定义**：节点可以分成两个独立集合，每条边连接不同集合的节点。

**等价定义**：
- 图中没有奇数环
- 可以用两种颜色染色，相邻节点不同色

```
二分图示例：
0 --- 1
|     |
3 --- 2

分组：{0, 2} 和 {1, 3}
```

```
非二分图示例：
0 --- 1
|   /
| /
2

三角形（奇数环），无法二分
```

## 方法一：BFS 染色

### 核心思路

用两种"颜色"（0和1）给节点染色：
- 从未染色节点开始 BFS
- 给邻接节点染相反颜色
- 如果遇到冲突（相邻同色）→ 不是二分图

### 代码实现

```typescript
function isBipartite(graph: number[][]): boolean {
  const n = graph.length;
  const color = new Array(n).fill(-1);  // -1 表示未染色
  
  // 可能有多个连通分量
  for (let start = 0; start < n; start++) {
    if (color[start] !== -1) continue;  // 已染色
    
    // BFS 染色
    const queue: number[] = [start];
    color[start] = 0;  // 染色为0
    
    while (queue.length > 0) {
      const node = queue.shift()!;
      
      for (const neighbor of graph[node]) {
        if (color[neighbor] === -1) {
          // 未染色，染成相反颜色
          color[neighbor] = 1 - color[node];
          queue.push(neighbor);
        } else if (color[neighbor] === color[node]) {
          // 冲突：相邻节点同色
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

### 执行过程

`graph = [[1,3],[0,2],[1,3],[0,2]]`

```
图结构：
0 --- 1
|     |
3 --- 2
```

**步骤**：
1. 从节点0开始，染色为0
2. 邻接节点1和3染色为1
3. 从队列取出1，邻接节点0已染色（OK），2染色为0
4. 从队列取出3，邻接节点0已染色（OK），2已染色（OK）
5. 所有节点染色完成，无冲突

**结果**：
- 颜色0：{0, 2}
- 颜色1：{1, 3}
- 是二分图 ✅

## 方法二：DFS 染色

### 代码实现

```typescript
function isBipartite(graph: number[][]): boolean {
  const n = graph.length;
  const color = new Array(n).fill(-1);
  
  function dfs(node: number, c: number): boolean {
    color[node] = c;
    
    for (const neighbor of graph[node]) {
      if (color[neighbor] === -1) {
        // 未染色，递归染相反颜色
        if (!dfs(neighbor, 1 - c)) {
          return false;
        }
      } else if (color[neighbor] === c) {
        // 冲突
        return false;
      }
    }
    
    return true;
  }
  
  for (let i = 0; i < n; i++) {
    if (color[i] === -1) {
      if (!dfs(i, 0)) {
        return false;
      }
    }
  }
  
  return true;
}
```

**时间复杂度**：$O(V + E)$  
**空间复杂度**：$O(V)$（递归栈）

## 方法三：并查集

### 核心思路

对于每个节点，维护两个集合：
- 自己所在的集合
- "敌人"所在的集合

**规则**：
- 我的敌人 = 我的邻居
- 我的敌人的敌人 = 我的朋友

### 代码实现

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
    const rootX = this.find(x);
    const rootY = this.find(y);
    if (rootX !== rootY) {
      this.parent[rootX] = rootY;
    }
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
      // 如果我和邻居在同一集合 → 不是二分图
      if (uf.isConnected(i, neighbor)) {
        return false;
      }
      
      // 将我的所有邻居合并到一个集合
      uf.union(graph[i][0], neighbor);
    }
  }
  
  return true;
}
```

**时间复杂度**：$O((V + E) \alpha(V))$，$\alpha$ 是反阿克曼函数  
**空间复杂度**：$O(V)$

## 三种方法对比

| 方法 | 时间复杂度 | 空间复杂度 | 实现难度 | 推荐度 |
|------|-----------|-----------|---------|--------|
| BFS | O(V+E) | O(V) | ⭐⭐ | ⭐⭐⭐⭐⭐ |
| DFS | O(V+E) | O(V) | ⭐⭐ | ⭐⭐⭐⭐ |
| 并查集 | O((V+E)α(V)) | O(V) | ⭐⭐⭐ | ⭐⭐⭐ |

**推荐**：BFS 最直观易懂。

## 常见变体

### 1. 输出二分图的分组

```typescript
function getBipartiteGroups(graph: number[][]): number[][] | null {
  const n = graph.length;
  const color = new Array(n).fill(-1);
  
  for (let start = 0; start < n; start++) {
    if (color[start] !== -1) continue;
    
    const queue = [start];
    color[start] = 0;
    
    while (queue.length > 0) {
      const node = queue.shift()!;
      
      for (const neighbor of graph[node]) {
        if (color[neighbor] === -1) {
          color[neighbor] = 1 - color[node];
          queue.push(neighbor);
        } else if (color[neighbor] === color[node]) {
          return null;  // 不是二分图
        }
      }
    }
  }
  
  // 分组
  const group0: number[] = [];
  const group1: number[] = [];
  
  for (let i = 0; i < n; i++) {
    if (color[i] === 0) {
      group0.push(i);
    } else {
      group1.push(i);
    }
  }
  
  return [group0, group1];
}
```

### 2. 计算最少删除边数使图变成二分图

```typescript
function minEdgesToRemove(graph: number[][]): number {
  const n = graph.length;
  const color = new Array(n).fill(-1);
  let removeCount = 0;
  
  for (let start = 0; start < n; start++) {
    if (color[start] !== -1) continue;
    
    const queue = [start];
    color[start] = 0;
    
    while (queue.length > 0) {
      const node = queue.shift()!;
      
      for (const neighbor of graph[node]) {
        if (color[neighbor] === -1) {
          color[neighbor] = 1 - color[node];
          queue.push(neighbor);
        } else if (color[neighbor] === color[node]) {
          removeCount++;  // 需要删除这条边
        }
      }
    }
  }
  
  return removeCount / 2;  // 每条边被计算两次
}
```

## 实战应用

### 任务分组

将 n 个任务分成两批执行，冲突的任务不能在同一批：

```typescript
function canScheduleTasks(n: number, conflicts: number[][]): boolean {
  const graph: number[][] = Array.from({ length: n }, () => []);
  
  for (const [a, b] of conflicts) {
    graph[a].push(b);
    graph[b].push(a);
  }
  
  return isBipartite(graph);
}
```

## 总结

**核心知识**：
1. 二分图 ⟺ 无奇数环 ⟺ 可2-染色
2. BFS/DFS 染色判定
3. 并查集：敌人的敌人是朋友

**算法选择**：
- **BFS**：最直观，推荐
- **DFS**：递归简洁
- **并查集**：适合动态图

**应用场景**：
- 任务分组
- 冲突检测
- 匹配问题

掌握二分图判定，是图论的必备技能！
