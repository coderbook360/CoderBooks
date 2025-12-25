# 拓扑排序原理

## 什么是拓扑排序？

拓扑排序是对**有向无环图（DAG）**的节点进行线性排序，使得对于每一条有向边 (u, v)，节点 u 都排在节点 v 之前。

```
原图：
A → B → D
↓   ↓
C → E

一种拓扑排序：A, B, C, D, E
另一种拓扑排序：A, C, B, E, D
```

## 为什么叫"拓扑"排序？

"拓扑"指的是图的结构关系。排序结果要保持原图中的**偏序关系**：如果 A 必须在 B 之前，排序结果也必须如此。

## 存在条件

**有向无环图（DAG）** ⟺ **存在拓扑排序**

如果图中有环：

```
A → B → C
↑       ↓
+ ← ← ← +

A 在 B 前，B 在 C 前，C 在 A 前 → 矛盾！
```

## 应用场景

1. **任务调度**：任务有依赖关系
2. **课程安排**：课程有先修要求
3. **编译顺序**：模块有依赖关系
4. **依赖管理**：npm、maven 包依赖

## 两种实现方法

### 方法一：Kahn 算法（BFS）

基于**入度**的方法：
1. 找到所有入度为 0 的节点，加入队列
2. 每次取出一个节点，将其加入结果
3. 删除该节点的所有出边，更新邻居入度
4. 如果某个邻居入度变为 0，加入队列
5. 重复直到队列为空

```typescript
function topologicalSort(n: number, edges: number[][]): number[] {
  const graph: number[][] = Array.from({ length: n }, () => []);
  const indegree = new Array(n).fill(0);
  
  for (const [u, v] of edges) {
    graph[u].push(v);
    indegree[v]++;
  }
  
  const queue: number[] = [];
  for (let i = 0; i < n; i++) {
    if (indegree[i] === 0) {
      queue.push(i);
    }
  }
  
  const result: number[] = [];
  
  while (queue.length > 0) {
    const node = queue.shift()!;
    result.push(node);
    
    for (const neighbor of graph[node]) {
      indegree[neighbor]--;
      if (indegree[neighbor] === 0) {
        queue.push(neighbor);
      }
    }
  }
  
  // 检查是否有环
  return result.length === n ? result : [];
}
```

### 方法二：DFS 后序逆序

基于 DFS 的方法：
1. 对每个未访问的节点执行 DFS
2. 当一个节点的所有邻居都访问完后，将其加入结果
3. 最后将结果反转

```typescript
function topologicalSortDFS(n: number, edges: number[][]): number[] {
  const graph: number[][] = Array.from({ length: n }, () => []);
  for (const [u, v] of edges) {
    graph[u].push(v);
  }
  
  const visited = new Array(n).fill(false);
  const inStack = new Array(n).fill(false);  // 检测环
  const result: number[] = [];
  let hasCycle = false;
  
  function dfs(node: number): void {
    if (hasCycle) return;
    
    visited[node] = true;
    inStack[node] = true;
    
    for (const neighbor of graph[node]) {
      if (!visited[neighbor]) {
        dfs(neighbor);
      } else if (inStack[neighbor]) {
        hasCycle = true;
        return;
      }
    }
    
    inStack[node] = false;
    result.push(node);  // 后序：所有邻居都处理完才加入
  }
  
  for (let i = 0; i < n; i++) {
    if (!visited[i]) {
      dfs(i);
    }
  }
  
  return hasCycle ? [] : result.reverse();
}
```

## 为什么 DFS 后序的逆序是拓扑排序？

关键洞察：节点在后序中的位置取决于它的所有后继何时完成。

```
A → B → C

DFS(A):
  DFS(B):
    DFS(C):
      后序加入 C
    后序加入 B
  后序加入 A

后序结果：[C, B, A]
逆序结果：[A, B, C] ← 正确的拓扑序
```

原因：
- 当 A 被加入后序时，所有从 A 出发能到达的节点都已经被加入
- 所以在逆序中，A 会排在这些节点之前

## 两种方法对比

| 特性 | Kahn (BFS) | DFS 后序 |
|------|------------|---------|
| 直观性 | 高（模拟删除过程）| 中 |
| 代码复杂度 | 简单 | 稍复杂 |
| 环检测 | 自然（结果长度 < n）| 需要额外标记 |
| 适用场景 | 更常用 | 某些变体问题 |

## 执行过程示例

```
节点：0, 1, 2, 3, 4
边：[[0,1], [0,2], [1,3], [2,3], [3,4]]

    0
   / \
  1   2
   \ /
    3
    |
    4

Kahn 算法：
初始入度：[0, 1, 1, 2, 1]
queue = [0]

处理 0：result = [0]
  邻居 1, 2 入度减 1
  入度：[0, 0, 0, 2, 1]
  queue = [1, 2]

处理 1：result = [0, 1]
  邻居 3 入度减 1
  入度：[0, 0, 0, 1, 1]
  queue = [2]

处理 2：result = [0, 1, 2]
  邻居 3 入度减 1
  入度：[0, 0, 0, 0, 1]
  queue = [3]

处理 3：result = [0, 1, 2, 3]
  邻居 4 入度减 1
  入度：[0, 0, 0, 0, 0]
  queue = [4]

处理 4：result = [0, 1, 2, 3, 4]

最终：[0, 1, 2, 3, 4]
```

## 复杂度分析

- **时间复杂度**：O(V + E)
- **空间复杂度**：O(V + E)

## 拓扑排序的唯一性

什么时候拓扑排序唯一？

**当且仅当**每一步都只有一个入度为 0 的节点时。

换句话说，图形成一条"链"：

```
唯一排序：
0 → 1 → 2 → 3

非唯一排序：
0 → 1
↓   ↓
2 → 3
```

## 总结

拓扑排序的核心：

1. **前提**：有向无环图（DAG）
2. **目标**：线性排序，保持偏序关系
3. **方法**：
   - Kahn（BFS）：基于入度
   - DFS 后序：基于递归结构
4. **应用**：任务调度、依赖分析、编译顺序
