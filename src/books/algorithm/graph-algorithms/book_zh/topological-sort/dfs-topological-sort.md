# DFS 拓扑排序

## 算法思想

DFS 实现拓扑排序的核心思想：**后序遍历的逆序**。

当我们完成一个节点的 DFS（所有后继都已访问）时，把它加入栈。最后栈的逆序就是拓扑排序。

## 为什么后序逆序是拓扑序？

```
A → B → C

DFS(A):
  DFS(B):
    DFS(C):
      C 没有邻居，结束 DFS(C)
      后序加入 C
    结束 DFS(B)
    后序加入 B
  结束 DFS(A)
  后序加入 A

后序：[C, B, A]
逆序：[A, B, C] ✓
```

关键洞察：当节点 u 加入后序时，所有从 u 出发能到达的节点都已经加入了。所以在逆序中，u 排在它们前面。

## 标准实现

```typescript
function dfsTopologicalSort(n: number, edges: number[][]): number[] {
  const graph: number[][] = Array.from({ length: n }, () => []);
  for (const [u, v] of edges) {
    graph[u].push(v);
  }
  
  // 0: 未访问, 1: 访问中, 2: 已完成
  const state = new Array(n).fill(0);
  const result: number[] = [];
  let hasCycle = false;
  
  function dfs(node: number): void {
    if (hasCycle || state[node] === 2) return;
    
    if (state[node] === 1) {
      hasCycle = true;  // 遇到正在访问的节点，有环
      return;
    }
    
    state[node] = 1;  // 标记为访问中
    
    for (const neighbor of graph[node]) {
      dfs(neighbor);
      if (hasCycle) return;
    }
    
    state[node] = 2;  // 标记为已完成
    result.push(node);  // 后序加入
  }
  
  for (let i = 0; i < n; i++) {
    if (state[i] === 0) {
      dfs(i);
      if (hasCycle) return [];
    }
  }
  
  return result.reverse();  // 逆序
}
```

## 三种状态的含义

```
state[node] = 0（白色）：未访问
state[node] = 1（灰色）：正在访问（在当前 DFS 调用栈中）
state[node] = 2（黑色）：已完成
```

环检测：如果遇到灰色节点，说明找到了返回边（back edge），即有环。

```
A → B → C
        ↓
        A（灰色）→ 发现环！
```

## 迭代实现

```typescript
function dfsTopologicalSortIterative(n: number, edges: number[][]): number[] {
  const graph: number[][] = Array.from({ length: n }, () => []);
  for (const [u, v] of edges) {
    graph[u].push(v);
  }
  
  const state = new Array(n).fill(0);
  const result: number[] = [];
  
  for (let start = 0; start < n; start++) {
    if (state[start] !== 0) continue;
    
    const stack: Array<[number, number]> = [[start, 0]];  // [node, 邻居索引]
    state[start] = 1;
    
    while (stack.length > 0) {
      const [node, idx] = stack[stack.length - 1];
      
      if (idx < graph[node].length) {
        const neighbor = graph[node][idx];
        stack[stack.length - 1][1]++;  // 下一个邻居
        
        if (state[neighbor] === 1) {
          return [];  // 有环
        }
        
        if (state[neighbor] === 0) {
          state[neighbor] = 1;
          stack.push([neighbor, 0]);
        }
      } else {
        // 所有邻居都访问完了
        state[node] = 2;
        result.push(node);
        stack.pop();
      }
    }
  }
  
  return result.reverse();
}
```

## 与 Kahn 算法的对比

| 特性 | Kahn (BFS) | DFS |
|------|------------|-----|
| 思路 | 删除入度为 0 的节点 | 后序逆序 |
| 环检测 | 结果长度 < n | 遇到灰色节点 |
| 实现复杂度 | 简单 | 稍复杂 |
| 空间 | 队列 + 入度数组 | 递归栈 + 状态数组 |
| 适用场景 | 更通用 | 某些图问题更自然 |

## 应用：强连通分量（SCC）

DFS 拓扑排序是 Kosaraju 算法的基础：

```typescript
function kosarajuSCC(n: number, edges: number[][]): number[][] {
  // 原图
  const graph: number[][] = Array.from({ length: n }, () => []);
  // 反向图
  const reverseGraph: number[][] = Array.from({ length: n }, () => []);
  
  for (const [u, v] of edges) {
    graph[u].push(v);
    reverseGraph[v].push(u);
  }
  
  // 第一步：在原图上 DFS，记录完成顺序
  const visited = new Array(n).fill(false);
  const finishOrder: number[] = [];
  
  function dfs1(node: number): void {
    visited[node] = true;
    for (const neighbor of graph[node]) {
      if (!visited[neighbor]) dfs1(neighbor);
    }
    finishOrder.push(node);
  }
  
  for (let i = 0; i < n; i++) {
    if (!visited[i]) dfs1(i);
  }
  
  // 第二步：按完成顺序的逆序，在反向图上 DFS
  visited.fill(false);
  const sccs: number[][] = [];
  
  function dfs2(node: number, scc: number[]): void {
    visited[node] = true;
    scc.push(node);
    for (const neighbor of reverseGraph[node]) {
      if (!visited[neighbor]) dfs2(neighbor, scc);
    }
  }
  
  for (let i = n - 1; i >= 0; i--) {
    const node = finishOrder[i];
    if (!visited[node]) {
      const scc: number[] = [];
      dfs2(node, scc);
      sccs.push(scc);
    }
  }
  
  return sccs;
}
```

## 应用：所有拓扑排序

有时需要找出所有可能的拓扑排序：

```typescript
function allTopologicalSorts(n: number, edges: number[][]): number[][] {
  const graph: number[][] = Array.from({ length: n }, () => []);
  const indegree = new Array(n).fill(0);
  
  for (const [u, v] of edges) {
    graph[u].push(v);
    indegree[v]++;
  }
  
  const result: number[][] = [];
  const current: number[] = [];
  const used = new Array(n).fill(false);
  
  function backtrack(): void {
    if (current.length === n) {
      result.push([...current]);
      return;
    }
    
    for (let i = 0; i < n; i++) {
      if (!used[i] && indegree[i] === 0) {
        // 选择节点 i
        current.push(i);
        used[i] = true;
        
        // 更新邻居入度
        for (const neighbor of graph[i]) {
          indegree[neighbor]--;
        }
        
        backtrack();
        
        // 撤销选择
        current.pop();
        used[i] = false;
        for (const neighbor of graph[i]) {
          indegree[neighbor]++;
        }
      }
    }
  }
  
  backtrack();
  return result;
}
```

## 复杂度分析

- **时间复杂度**：O(V + E)
- **空间复杂度**：O(V)（递归栈 + 状态数组）

## 总结

DFS 拓扑排序的要点：

1. **核心思想**：后序逆序
2. **三色标记**：检测环
3. **应用**：SCC、关键路径、所有拓扑序
4. **选择建议**：简单拓扑排序用 Kahn，复杂图问题考虑 DFS
