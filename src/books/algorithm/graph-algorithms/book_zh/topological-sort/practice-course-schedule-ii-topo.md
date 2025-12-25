# 课程表 II（拓扑排序）

LeetCode 210. Course Schedule II

## 题目描述

现在你总共有 `numCourses` 门课需要选，记为 `0` 到 `numCourses - 1`。给你一个数组 `prerequisites`，其中 `prerequisites[i] = [ai, bi]`，表示在选修课程 `ai` 前必须先选修 `bi`。

返回你为了学完所有课程所安排的学习顺序。可能会有多个正确的顺序，只需返回任意一种。如果不可能完成所有课程，返回一个空数组。

## 示例

```
输入：numCourses = 4, prerequisites = [[1,0],[2,0],[3,1],[3,2]]
输出：[0,2,1,3] 或 [0,1,2,3]
解释：总共有 4 门课程。要学习课程 3，你应该先完成课程 1 和课程 2。
     并且课程 1 和课程 2 都应该排在课程 0 之后。

输入：numCourses = 2, prerequisites = [[1,0],[0,1]]
输出：[]
解释：存在循环依赖，无法完成。
```

## 思路分析

与课程表 I 相比，这道题需要**输出具体的拓扑序列**。

**核心变化**：不仅要检测环，还要记录排序结果。

## Kahn 算法实现

```typescript
function findOrder(numCourses: number, prerequisites: number[][]): number[] {
  // 建图 + 计算入度
  const graph: number[][] = Array.from({ length: numCourses }, () => []);
  const indegree = new Array(numCourses).fill(0);
  
  for (const [course, pre] of prerequisites) {
    graph[pre].push(course);
    indegree[course]++;
  }
  
  // 入度为 0 的课程入队
  const queue: number[] = [];
  for (let i = 0; i < numCourses; i++) {
    if (indegree[i] === 0) {
      queue.push(i);
    }
  }
  
  const result: number[] = [];
  
  while (queue.length > 0) {
    const course = queue.shift()!;
    result.push(course);  // 记录拓扑序
    
    for (const next of graph[course]) {
      indegree[next]--;
      if (indegree[next] === 0) {
        queue.push(next);
      }
    }
  }
  
  return result.length === numCourses ? result : [];
}
```

## 执行过程

```
numCourses = 4
prerequisites = [[1,0],[2,0],[3,1],[3,2]]

图结构：0 → 1, 0 → 2, 1 → 3, 2 → 3
入度：[0, 1, 1, 2]

BFS：
1. queue = [0], result = []
2. 出队 0, result = [0]
   1 入度 1→0, 2 入度 1→0
   queue = [1, 2]
3. 出队 1, result = [0, 1]
   3 入度 2→1
   queue = [2]
4. 出队 2, result = [0, 1, 2]
   3 入度 1→0
   queue = [3]
5. 出队 3, result = [0, 1, 2, 3]

返回 [0, 1, 2, 3]
```

## DFS 实现

```typescript
function findOrder(numCourses: number, prerequisites: number[][]): number[] {
  const graph: number[][] = Array.from({ length: numCourses }, () => []);
  
  for (const [course, pre] of prerequisites) {
    graph[pre].push(course);
  }
  
  const visited = new Array(numCourses).fill(0);
  const result: number[] = [];
  let hasCycle = false;
  
  function dfs(course: number): void {
    if (hasCycle) return;
    
    visited[course] = 1;
    
    for (const next of graph[course]) {
      if (visited[next] === 1) {
        hasCycle = true;
        return;
      }
      if (visited[next] === 0) {
        dfs(next);
      }
    }
    
    visited[course] = 2;
    result.push(course);  // 后序位置记录
  }
  
  for (let i = 0; i < numCourses; i++) {
    if (visited[i] === 0) {
      dfs(i);
    }
  }
  
  return hasCycle ? [] : result.reverse();
}
```

## DFS 为什么要反转？

DFS 的后序遍历是"完成时间"的顺序：
- 最先完成的节点（没有后继依赖）最先加入
- 实际上应该放在拓扑序的最后

```
图：0 → 1 → 2

DFS 后序：[2, 1, 0]  （2 最先完成）
反转后：[0, 1, 2]    （正确的拓扑序）
```

## 多解情况

当多个节点入度同时为 0 时，选择顺序不同会产生不同的合法拓扑序：

```
图：0 → 2, 1 → 2

合法序列：
- [0, 1, 2]（先选 0）
- [1, 0, 2]（先选 1）
```

## 复杂度分析

- **时间复杂度**：O(V + E)
- **空间复杂度**：O(V + E)

## 相关题目

| 题号 | 题目 | 难度 |
|------|------|------|
| 207 | 课程表 | 中等 |
| 210 | 课程表 II | 中等 |
| 269 | 火星词典 | 困难 |
| 1136 | 并行课程 | 中等 |
