# 拓扑排序原理

拓扑排序是有向无环图（DAG）中一种重要的排序方式，在任务调度、编译依赖、课程安排等场景中有广泛应用。

## 什么是拓扑排序？

**定义**：对于有向无环图 G = (V, E)，拓扑排序是将所有顶点排成一个线性序列，使得对于图中任意一条有向边 (u, v)，u 在序列中都出现在 v 之前。

简单来说：**如果 A 依赖 B，那么 B 必须排在 A 前面**。

## 为什么需要拓扑排序？

**场景一：课程安排**
```
数据结构 → 算法设计
高等数学 → 线性代数 → 机器学习
```
必须先修完前置课程，才能学习后续课程。

**场景二：编译依赖**
```
模块A 依赖 模块B
模块B 依赖 模块C
```
编译顺序：C → B → A

**场景三：任务调度**
```
任务1 完成后才能开始 任务2
任务2 完成后才能开始 任务3
```

## 拓扑排序的前提条件

**必须是有向无环图（DAG）**：
- **有向**：边有方向，表示依赖关系
- **无环**：不能有循环依赖

```
有环的情况（无法拓扑排序）：
A → B → C → A  （循环依赖）
```

## 拓扑排序的性质

1. **不唯一**：一个 DAG 可能有多种合法的拓扑排序
2. **存在性**：当且仅当图是 DAG 时，拓扑排序存在
3. **入度为 0 的顶点**：总是可以作为排序的起点

```
示例图：
1 → 2 → 4
↓   ↓
3 → 5

合法的拓扑序列：
- 1, 2, 3, 4, 5
- 1, 2, 3, 5, 4
- 1, 3, 2, 4, 5
- 1, 3, 2, 5, 4
```

## 两种经典实现方法

### 方法一：Kahn 算法（BFS）

**核心思想**：不断选择入度为 0 的顶点

```typescript
function kahnTopologicalSort(n: number, edges: number[][]): number[] {
  // 建图 + 计算入度
  const graph: number[][] = Array.from({ length: n }, () => []);
  const indegree = new Array(n).fill(0);
  
  for (const [from, to] of edges) {
    graph[from].push(to);
    indegree[to]++;
  }
  
  // 将入度为 0 的顶点加入队列
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
  
  // 如果结果长度不等于 n，说明有环
  return result.length === n ? result : [];
}
```

### 方法二：DFS 后序遍历

**核心思想**：DFS 完成时间的逆序就是拓扑序

```typescript
function dfsTopologicalSort(n: number, edges: number[][]): number[] {
  const graph: number[][] = Array.from({ length: n }, () => []);
  
  for (const [from, to] of edges) {
    graph[from].push(to);
  }
  
  const visited = new Array(n).fill(0);  // 0: 未访问, 1: 访问中, 2: 已完成
  const result: number[] = [];
  let hasCycle = false;
  
  function dfs(node: number): void {
    if (hasCycle) return;
    
    visited[node] = 1;  // 标记为访问中
    
    for (const neighbor of graph[node]) {
      if (visited[neighbor] === 1) {
        hasCycle = true;
        return;
      }
      if (visited[neighbor] === 0) {
        dfs(neighbor);
      }
    }
    
    visited[node] = 2;  // 标记为已完成
    result.push(node);  // 后序位置加入结果
  }
  
  for (let i = 0; i < n; i++) {
    if (visited[i] === 0) {
      dfs(i);
    }
  }
  
  return hasCycle ? [] : result.reverse();
}
```

## 两种方法对比

| 特性 | Kahn 算法 | DFS 方法 |
|------|-----------|----------|
| 思想 | 不断删除入度为 0 的点 | 后序遍历逆序 |
| 环检测 | 结果长度 < n | 访问中遇到访问中的点 |
| 实现复杂度 | 需要维护入度数组 | 需要三状态标记 |
| 适用场景 | 层次遍历、求最短层数 | 递归自然、代码简洁 |

## 拓扑排序的应用

1. **任务调度**：确定任务执行顺序
2. **编译系统**：确定模块编译顺序
3. **课程规划**：确定选课顺序
4. **依赖解析**：包管理器解析依赖
5. **环检测**：判断图中是否有环

## 复杂度分析

- **时间复杂度**：O(V + E)，每个顶点和边各访问一次
- **空间复杂度**：O(V + E)，存储图结构

## 小结

拓扑排序是处理依赖关系问题的核心算法：
- 前提条件：有向无环图
- 两种实现：Kahn（BFS）和 DFS
- 核心应用：任务调度、依赖解析、环检测
