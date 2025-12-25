# 实战：最短路径访问所有节点

## 题目描述

给出一个无向连通图，其中节点编号为 0 到 n-1。

返回能够访问所有节点的最短路径的长度。你可以在任意节点开始和停止，可以多次经过同一条边，可以多次访问同一个节点。

📎 [LeetCode 847. 最短路径访问所有节点](https://leetcode.cn/problems/shortest-path-visiting-all-nodes/)

**示例**：

```
输入：graph = [[1,2,3],[0],[0],[0]]
输出：4
解释：一种可能的路径为 [1,0,2,0,3]

输入：graph = [[1],[0,2,4],[1,3,4],[2],[1,2]]
输出：4
解释：一种可能的路径为 [0,1,4,2,3]
```

## 问题分析

这是旅行商问题（TSP）的变体：
- 可以重复访问节点
- 需要访问所有节点
- 求最短路径长度

**状态设计**：
- 需要记录"访问了哪些节点"→ 状态压缩
- 需要记录"当前在哪个节点"→ 额外维度

## 方法一：状态压缩 BFS

### 思路

状态：`(mask, node)` 表示已访问节点集合 mask，当前在 node。

由于边权都是 1，用 BFS 求最短路。

### 代码实现

```typescript
/**
 * 状态压缩 BFS
 * 时间复杂度：O(n² × 2^n)
 * 空间复杂度：O(n × 2^n)
 */
function shortestPathLength(graph: number[][]): number {
  const n = graph.length;
  const FULL = (1 << n) - 1;
  
  // 特殊情况
  if (n === 1) return 0;
  
  // visited[mask][node] = 是否访问过该状态
  const visited: boolean[][] = Array.from(
    { length: 1 << n },
    () => new Array(n).fill(false)
  );
  
  // 队列：[mask, node, dist]
  const queue: [number, number, number][] = [];
  
  // 从所有节点开始
  for (let i = 0; i < n; i++) {
    const mask = 1 << i;
    queue.push([mask, i, 0]);
    visited[mask][i] = true;
  }
  
  while (queue.length > 0) {
    const [mask, node, dist] = queue.shift()!;
    
    // 访问邻居
    for (const neighbor of graph[node]) {
      const newMask = mask | (1 << neighbor);
      
      // 找到答案
      if (newMask === FULL) {
        return dist + 1;
      }
      
      if (!visited[newMask][neighbor]) {
        visited[newMask][neighbor] = true;
        queue.push([newMask, neighbor, dist + 1]);
      }
    }
  }
  
  return -1;  // 不会到达
}
```

## 方法二：状态压缩 DP + Floyd

### 思路

1. 先用 Floyd 求所有点对最短路
2. 状态压缩 DP 求访问所有节点的最短路

### 代码实现

```typescript
function shortestPathLength(graph: number[][]): number {
  const n = graph.length;
  const FULL = (1 << n) - 1;
  
  if (n === 1) return 0;
  
  // Floyd 求所有点对最短路
  const dist: number[][] = Array.from(
    { length: n },
    () => new Array(n).fill(Infinity)
  );
  
  for (let i = 0; i < n; i++) {
    dist[i][i] = 0;
    for (const j of graph[i]) {
      dist[i][j] = 1;
    }
  }
  
  for (let k = 0; k < n; k++) {
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (dist[i][k] + dist[k][j] < dist[i][j]) {
          dist[i][j] = dist[i][k] + dist[k][j];
        }
      }
    }
  }
  
  // dp[mask][i] = 访问了 mask 中的节点，当前在 i 的最短路
  const dp: number[][] = Array.from(
    { length: 1 << n },
    () => new Array(n).fill(Infinity)
  );
  
  // base case
  for (let i = 0; i < n; i++) {
    dp[1 << i][i] = 0;
  }
  
  // 状态转移
  for (let mask = 1; mask <= FULL; mask++) {
    for (let i = 0; i < n; i++) {
      if (!(mask & (1 << i))) continue;
      if (dp[mask][i] === Infinity) continue;
      
      for (let j = 0; j < n; j++) {
        if (mask & (1 << j)) continue;
        
        const newMask = mask | (1 << j);
        dp[newMask][j] = Math.min(
          dp[newMask][j],
          dp[mask][i] + dist[i][j]
        );
      }
    }
  }
  
  // 答案
  let result = Infinity;
  for (let i = 0; i < n; i++) {
    result = Math.min(result, dp[FULL][i]);
  }
  
  return result;
}
```

## 方法三：记忆化搜索

```typescript
function shortestPathLength(graph: number[][]): number {
  const n = graph.length;
  const FULL = (1 << n) - 1;
  
  if (n === 1) return 0;
  
  // 预处理最短路
  const dist: number[][] = Array.from(
    { length: n },
    () => new Array(n).fill(Infinity)
  );
  
  // BFS 求从每个点出发的最短路
  for (let start = 0; start < n; start++) {
    const d = new Array(n).fill(Infinity);
    d[start] = 0;
    const queue = [start];
    
    while (queue.length > 0) {
      const u = queue.shift()!;
      for (const v of graph[u]) {
        if (d[v] === Infinity) {
          d[v] = d[u] + 1;
          queue.push(v);
        }
      }
    }
    
    dist[start] = d;
  }
  
  // 记忆化搜索
  const memo: number[][] = Array.from(
    { length: 1 << n },
    () => new Array(n).fill(-1)
  );
  
  function dfs(mask: number, pos: number): number {
    if (mask === FULL) return 0;
    
    if (memo[mask][pos] !== -1) return memo[mask][pos];
    
    let result = Infinity;
    for (let next = 0; next < n; next++) {
      if (mask & (1 << next)) continue;
      
      const newMask = mask | (1 << next);
      result = Math.min(result, dist[pos][next] + dfs(newMask, next));
    }
    
    memo[mask][pos] = result;
    return result;
  }
  
  // 从任意点开始
  let result = Infinity;
  for (let start = 0; start < n; start++) {
    result = Math.min(result, dfs(1 << start, start));
  }
  
  return result;
}
```

## 示例演算

以 `graph = [[1,2,3],[0],[0],[0]]` 为例：

```
图结构：
    0
   /|\
  1 2 3

BFS 过程：
初始：(0001, 0), (0010, 1), (0100, 2), (1000, 3)

从 (0001, 0) 扩展：
  → (0011, 1), (0101, 2), (1001, 3)

从 (0010, 1) 扩展：
  → (0011, 0) - 已存在类似状态

...

最终在 dist = 4 时找到 FULL = 1111
```

## 复杂度分析

| 方法 | 时间 | 空间 |
|-----|------|------|
| BFS | O(n² × 2^n) | O(n × 2^n) |
| DP + Floyd | O(n³ + n² × 2^n) | O(n × 2^n) |

## 本章小结

1. **状态设计**：`(访问集合, 当前位置)`
2. **BFS 适用于等权边**：直接求最短路
3. **Floyd 预处理**：处理重复访问的距离

## 相关题目

- [943. 最短超级串](https://leetcode.cn/problems/find-the-shortest-superstring/)
- [1125. 最小的必要团队](./practice-smallest-team.md)
