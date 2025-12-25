# Kahn 算法详解

## 算法思想

Kahn 算法是拓扑排序的 BFS 实现，核心思想是**不断移除入度为 0 的节点**。

直觉：入度为 0 的节点没有任何前置依赖，可以"立即执行"。

## 算法步骤

1. 计算所有节点的入度
2. 将入度为 0 的节点加入队列
3. 循环：
   - 取出队首节点，加入结果
   - 对于该节点的每个邻居，入度减 1
   - 如果邻居入度变为 0，加入队列
4. 如果结果长度等于节点数，成功；否则有环

## 标准实现

```typescript
function kahnTopologicalSort(n: number, edges: number[][]): number[] {
  // 建图
  const graph: number[][] = Array.from({ length: n }, () => []);
  const indegree = new Array(n).fill(0);
  
  for (const [u, v] of edges) {
    graph[u].push(v);
    indegree[v]++;
  }
  
  // 初始化队列
  const queue: number[] = [];
  for (let i = 0; i < n; i++) {
    if (indegree[i] === 0) {
      queue.push(i);
    }
  }
  
  // BFS
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

## 为什么能检测环？

如果图中有环，环上的节点永远不会入度变为 0：

```
A → B
↑   ↓
D ← C

入度：A=1, B=1, C=1, D=1
没有入度为 0 的节点，队列为空
结果长度 = 0 < 4，检测到环
```

## 变体：字典序最小的拓扑排序

使用优先队列（最小堆）代替普通队列：

```typescript
function topologicalSortLexical(n: number, edges: number[][]): number[] {
  const graph: number[][] = Array.from({ length: n }, () => []);
  const indegree = new Array(n).fill(0);
  
  for (const [u, v] of edges) {
    graph[u].push(v);
    indegree[v]++;
  }
  
  // 使用最小堆
  const heap: number[] = [];
  
  const push = (x: number) => {
    heap.push(x);
    let i = heap.length - 1;
    while (i > 0 && heap[i] < heap[Math.floor((i - 1) / 2)]) {
      const p = Math.floor((i - 1) / 2);
      [heap[i], heap[p]] = [heap[p], heap[i]];
      i = p;
    }
  };
  
  const pop = (): number => {
    const result = heap[0];
    const last = heap.pop()!;
    if (heap.length > 0) {
      heap[0] = last;
      let i = 0;
      while (true) {
        const left = 2 * i + 1, right = 2 * i + 2;
        let smallest = i;
        if (left < heap.length && heap[left] < heap[smallest]) smallest = left;
        if (right < heap.length && heap[right] < heap[smallest]) smallest = right;
        if (smallest === i) break;
        [heap[i], heap[smallest]] = [heap[smallest], heap[i]];
        i = smallest;
      }
    }
    return result;
  };
  
  for (let i = 0; i < n; i++) {
    if (indegree[i] === 0) {
      push(i);
    }
  }
  
  const result: number[] = [];
  
  while (heap.length > 0) {
    const node = pop();
    result.push(node);
    
    for (const neighbor of graph[node]) {
      indegree[neighbor]--;
      if (indegree[neighbor] === 0) {
        push(neighbor);
      }
    }
  }
  
  return result.length === n ? result : [];
}
```

## 变体：计算从源点到每个节点的最长/最短路径

利用拓扑排序的顺序进行动态规划：

```typescript
function longestPathDAG(n: number, edges: Array<[number, number, number]>): number[] {
  // edges: [from, to, weight]
  const graph: Array<Array<[number, number]>> = Array.from({ length: n }, () => []);
  const indegree = new Array(n).fill(0);
  
  for (const [u, v, w] of edges) {
    graph[u].push([v, w]);
    indegree[v]++;
  }
  
  const queue: number[] = [];
  for (let i = 0; i < n; i++) {
    if (indegree[i] === 0) queue.push(i);
  }
  
  // 拓扑排序
  const order: number[] = [];
  while (queue.length > 0) {
    const node = queue.shift()!;
    order.push(node);
    
    for (const [neighbor] of graph[node]) {
      indegree[neighbor]--;
      if (indegree[neighbor] === 0) queue.push(neighbor);
    }
  }
  
  // DP 计算最长路径
  const dist = new Array(n).fill(-Infinity);
  dist[0] = 0;  // 假设从节点 0 开始
  
  for (const node of order) {
    if (dist[node] === -Infinity) continue;
    
    for (const [neighbor, weight] of graph[node]) {
      dist[neighbor] = Math.max(dist[neighbor], dist[node] + weight);
    }
  }
  
  return dist;
}
```

## 变体：统计入度为 0 的节点在每一层

```typescript
function topologicalLayers(n: number, edges: number[][]): number[][] {
  const graph: number[][] = Array.from({ length: n }, () => []);
  const indegree = new Array(n).fill(0);
  
  for (const [u, v] of edges) {
    graph[u].push(v);
    indegree[v]++;
  }
  
  let currentLayer: number[] = [];
  for (let i = 0; i < n; i++) {
    if (indegree[i] === 0) currentLayer.push(i);
  }
  
  const layers: number[][] = [];
  
  while (currentLayer.length > 0) {
    layers.push([...currentLayer]);
    const nextLayer: number[] = [];
    
    for (const node of currentLayer) {
      for (const neighbor of graph[node]) {
        indegree[neighbor]--;
        if (indegree[neighbor] === 0) {
          nextLayer.push(neighbor);
        }
      }
    }
    
    currentLayer = nextLayer;
  }
  
  return layers;
}
```

这在并行任务调度中很有用：每一层的任务可以并行执行。

## 应用：判断是否存在唯一拓扑排序

```typescript
function hasUniqueTopologicalSort(n: number, edges: number[][]): boolean {
  const graph: number[][] = Array.from({ length: n }, () => []);
  const indegree = new Array(n).fill(0);
  
  for (const [u, v] of edges) {
    graph[u].push(v);
    indegree[v]++;
  }
  
  const queue: number[] = [];
  for (let i = 0; i < n; i++) {
    if (indegree[i] === 0) queue.push(i);
  }
  
  // 如果任何时刻队列中有多个元素，排序不唯一
  while (queue.length > 0) {
    if (queue.length > 1) return false;
    
    const node = queue.shift()!;
    
    for (const neighbor of graph[node]) {
      indegree[neighbor]--;
      if (indegree[neighbor] === 0) {
        queue.push(neighbor);
      }
    }
  }
  
  return true;
}
```

## 复杂度分析

- **时间复杂度**：O(V + E)
  - 每个节点入队/出队一次
  - 每条边被访问一次（更新入度）
- **空间复杂度**：O(V + E)
  - 邻接表存储图
  - 入度数组和队列

## 总结

Kahn 算法的优点：

1. **直观**：模拟"删除"节点的过程
2. **自然检测环**：结果长度 ≠ n 说明有环
3. **易于变体**：优先队列、分层等
4. **适合实际应用**：任务调度、依赖分析
