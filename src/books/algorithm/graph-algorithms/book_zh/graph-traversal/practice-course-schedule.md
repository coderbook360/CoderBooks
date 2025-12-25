# 课程表

LeetCode 207. Course Schedule

## 题目描述

你这个学期必须选修 `numCourses` 门课程，记为 `0` 到 `numCourses - 1`。

在选修某些课程之前需要一些先修课程。先修课程用数组 `prerequisites` 表示，其中 `prerequisites[i] = [ai, bi]` 表示：如果要学习课程 `ai` 则必须先学习课程 `bi`。

判断是否可能完成所有课程的学习。

## 示例

```
输入：numCourses = 2, prerequisites = [[1,0]]
输出：true
解释：总共 2 门课程。学习课程 1 之前，需要先完成课程 0。可行。

输入：numCourses = 2, prerequisites = [[1,0],[0,1]]
输出：false
解释：总共 2 门课程。学习课程 1 之前要先完成课程 0；
      学习课程 0 之前要先完成课程 1。这是不可能的。
```

## 思路分析

这是经典的**环检测**问题：
- 把课程看作节点
- 把先修关系看作有向边（bi → ai）
- 如果图中有环，说明存在循环依赖，无法完成

## 方法一：DFS 三色标记

```typescript
function canFinish(numCourses: number, prerequisites: number[][]): boolean {
  // 建图：bi -> ai
  const graph: number[][] = Array.from({ length: numCourses }, () => []);
  for (const [ai, bi] of prerequisites) {
    graph[bi].push(ai);
  }
  
  // 0: 未访问, 1: 访问中, 2: 已完成
  const color = new Array(numCourses).fill(0);
  
  for (let i = 0; i < numCourses; i++) {
    if (color[i] === 0) {
      if (hasCycle(i, graph, color)) {
        return false;
      }
    }
  }
  
  return true;
}

function hasCycle(node: number, graph: number[][], color: number[]): boolean {
  color[node] = 1;  // 访问中
  
  for (const neighbor of graph[node]) {
    if (color[neighbor] === 1) {
      return true;  // 遇到访问中的节点，有环
    }
    
    if (color[neighbor] === 0) {
      if (hasCycle(neighbor, graph, color)) {
        return true;
      }
    }
  }
  
  color[node] = 2;  // 完成
  return false;
}
```

## 方法二：拓扑排序（BFS）

```typescript
function canFinish(numCourses: number, prerequisites: number[][]): boolean {
  const graph: number[][] = Array.from({ length: numCourses }, () => []);
  const indegree = new Array(numCourses).fill(0);
  
  for (const [ai, bi] of prerequisites) {
    graph[bi].push(ai);
    indegree[ai]++;
  }
  
  // 所有入度为 0 的节点入队
  const queue: number[] = [];
  for (let i = 0; i < numCourses; i++) {
    if (indegree[i] === 0) {
      queue.push(i);
    }
  }
  
  let count = 0;
  
  while (queue.length > 0) {
    const node = queue.shift()!;
    count++;
    
    for (const neighbor of graph[node]) {
      indegree[neighbor]--;
      if (indegree[neighbor] === 0) {
        queue.push(neighbor);
      }
    }
  }
  
  return count === numCourses;
}
```

## 执行过程

```
numCourses = 4, prerequisites = [[1,0],[2,0],[3,1],[3,2]]

图：
0 → 1 → 3
    ↘   ↑
      2 →

入度：[0, 1, 1, 2]
queue = [0]

处理 0：
  邻居 1, 2 入度减 1
  入度：[0, 0, 0, 2]
  queue = [1, 2]
  count = 1

处理 1：
  邻居 3 入度减 1
  入度：[0, 0, 0, 1]
  queue = [2]
  count = 2

处理 2：
  邻居 3 入度减 1
  入度：[0, 0, 0, 0]
  queue = [3]
  count = 3

处理 3：
  无邻居
  count = 4

count === numCourses，返回 true
```

## 有环的情况

```
numCourses = 2, prerequisites = [[1,0],[0,1]]

图：
0 ⇌ 1

入度：[1, 1]
queue = []（没有入度为 0 的节点）

count = 0 ≠ 2，返回 false
```

## 两种方法对比

| 方法 | 时间复杂度 | 空间复杂度 | 特点 |
|------|-----------|-----------|------|
| DFS | O(V + E) | O(V) | 直观，但需要理解三色标记 |
| 拓扑排序 | O(V + E) | O(V) | 更常用，还能输出排序结果 |

## 复杂度分析

- **时间复杂度**：O(V + E)
  - V = numCourses
  - E = len(prerequisites)
- **空间复杂度**：O(V + E)，存储图

## 相关题目

| 题号 | 题目 | 难度 |
|------|------|------|
| 207 | 课程表 | 中等 |
| 210 | 课程表 II | 中等 |
| 630 | 课程表 III | 困难 |
| 802 | 找到最终的安全状态 | 中等 |
