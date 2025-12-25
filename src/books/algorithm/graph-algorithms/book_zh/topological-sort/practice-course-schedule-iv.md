# 课程表 IV

LeetCode 1462. Course Schedule IV

## 题目描述

你总共需要上 `numCourses` 门课，课程编号依次为 `0` 到 `numCourses-1`。给你一个数组 `prerequisites` 表示先修课程关系，以及一个查询数组 `queries`。

对于 `queries[i] = [ui, vi]`，判断课程 `ui` 是否是课程 `vi` 的先修课程（直接或间接）。

返回一个布尔数组，`answer[i]` 为 `queries[i]` 的答案。

## 示例

```
输入：numCourses = 3, prerequisites = [[1,2],[1,0],[2,0]], queries = [[1,0],[1,2]]
输出：[true,true]
解释：
- 课程 1 是课程 0 的先修课程
- 课程 1 是课程 2 的先修课程
```

## 思路分析

**核心问题**：判断图中任意两点的可达性。

**方法一：Floyd 传递闭包**

预处理所有点对的可达性，然后 O(1) 回答查询。

**方法二：拓扑排序 + 传递**

按拓扑序处理，将先修关系传递下去。

## 方法一：Floyd 传递闭包

```typescript
function checkIfPrerequisite(
  numCourses: number, 
  prerequisites: number[][], 
  queries: number[][]
): boolean[] {
  // reachable[i][j] = true 表示 i 是 j 的先修课
  const reachable: boolean[][] = Array.from(
    { length: numCourses }, 
    () => new Array(numCourses).fill(false)
  );
  
  // 初始化直接先修关系
  for (const [pre, course] of prerequisites) {
    reachable[pre][course] = true;
  }
  
  // Floyd 传递闭包
  for (let k = 0; k < numCourses; k++) {
    for (let i = 0; i < numCourses; i++) {
      for (let j = 0; j < numCourses; j++) {
        // 如果 i→k 且 k→j，则 i→j
        if (reachable[i][k] && reachable[k][j]) {
          reachable[i][j] = true;
        }
      }
    }
  }
  
  return queries.map(([u, v]) => reachable[u][v]);
}
```

## 方法二：拓扑排序 + 集合传递

```typescript
function checkIfPrerequisite(
  numCourses: number, 
  prerequisites: number[][], 
  queries: number[][]
): boolean[] {
  // 建图
  const graph: number[][] = Array.from({ length: numCourses }, () => []);
  const indegree = new Array(numCourses).fill(0);
  
  for (const [pre, course] of prerequisites) {
    graph[pre].push(course);
    indegree[course]++;
  }
  
  // prereqs[i] 存储课程 i 的所有先修课（直接和间接）
  const prereqs: Set<number>[] = Array.from(
    { length: numCourses }, 
    () => new Set()
  );
  
  // Kahn 算法
  const queue: number[] = [];
  for (let i = 0; i < numCourses; i++) {
    if (indegree[i] === 0) {
      queue.push(i);
    }
  }
  
  while (queue.length > 0) {
    const course = queue.shift()!;
    
    for (const next of graph[course]) {
      // next 的先修课包括 course 本身
      prereqs[next].add(course);
      // 以及 course 的所有先修课
      for (const pre of prereqs[course]) {
        prereqs[next].add(pre);
      }
      
      indegree[next]--;
      if (indegree[next] === 0) {
        queue.push(next);
      }
    }
  }
  
  return queries.map(([u, v]) => prereqs[v].has(u));
}
```

## 执行过程

```
numCourses = 4
prerequisites = [[0,1],[1,2],[2,3]]
queries = [[0,3],[0,2]]

图：0 → 1 → 2 → 3

拓扑排序处理：
1. 处理 0：prereqs[1].add(0)
   prereqs = [{}, {0}, {}, {}]

2. 处理 1：prereqs[2].add(1), prereqs[2].add(0)
   prereqs = [{}, {0}, {0,1}, {}]

3. 处理 2：prereqs[3].add(2), prereqs[3].add(0), prereqs[3].add(1)
   prereqs = [{}, {0}, {0,1}, {0,1,2}]

查询：
- [0,3]: prereqs[3].has(0) = true
- [0,2]: prereqs[2].has(0) = true

输出：[true, true]
```

## 方法三：BFS/DFS 预处理

```typescript
function checkIfPrerequisite(
  numCourses: number, 
  prerequisites: number[][], 
  queries: number[][]
): boolean[] {
  const graph: number[][] = Array.from({ length: numCourses }, () => []);
  
  for (const [pre, course] of prerequisites) {
    graph[pre].push(course);
  }
  
  // 对每个节点 BFS，找出所有可达节点
  const reachable: Set<number>[] = Array.from(
    { length: numCourses }, 
    () => new Set()
  );
  
  for (let start = 0; start < numCourses; start++) {
    const queue = [start];
    const visited = new Set<number>();
    
    while (queue.length > 0) {
      const node = queue.shift()!;
      
      for (const next of graph[node]) {
        if (!visited.has(next)) {
          visited.add(next);
          reachable[start].add(next);
          queue.push(next);
        }
      }
    }
  }
  
  return queries.map(([u, v]) => reachable[u].has(v));
}
```

## 三种方法对比

| 方法 | 预处理时间 | 查询时间 | 空间 |
|------|------------|----------|------|
| Floyd | O(n³) | O(1) | O(n²) |
| 拓扑+集合 | O(n² + e) | O(1) | O(n²) |
| BFS 预处理 | O(n·(n+e)) | O(1) | O(n²) |

**选择建议**：
- n 较小（≤1000）：三种都可
- 边稀疏：拓扑排序方法更优
- 需要简洁代码：Floyd

## 复杂度分析

以 Floyd 方法为例：
- **时间复杂度**：O(n³ + q)，n 为课程数，q 为查询数
- **空间复杂度**：O(n²)

## 相关题目

| 题号 | 题目 | 难度 |
|------|------|------|
| 207 | 课程表 | 中等 |
| 210 | 课程表 II | 中等 |
| 1462 | 课程表 IV | 中等 |
| 1059 | 从始点到终点的所有路径 | 中等 |
