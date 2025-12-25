# 课程表 II

LeetCode 210. Course Schedule II

## 题目描述

现在你总共有 `numCourses` 门课需要选，记为 `0` 到 `numCourses - 1`。

给你一个数组 `prerequisites`，其中 `prerequisites[i] = [ai, bi]` 表示在选修课程 `ai` 前必须先选修 `bi`。

返回你为了学完所有课程所安排的学习顺序。可能会有多个正确的顺序，只需返回任意一种。如果不可能完成所有课程，返回空数组。

## 示例

```
输入：numCourses = 4, prerequisites = [[1,0],[2,0],[3,1],[3,2]]
输出：[0,1,2,3] 或 [0,2,1,3]
解释：
    0
   / \
  1   2
   \ /
    3

课程 0 没有先修要求，先学
然后学 1 和 2（顺序任意）
最后学 3
```

## 思路分析

这就是标准的拓扑排序问题。与"课程表 I"的区别是：
- 课程表 I：只判断能否完成（是否有环）
- 课程表 II：输出一个合法顺序（拓扑序）

## 方法一：Kahn 算法（BFS）

```typescript
function findOrder(numCourses: number, prerequisites: number[][]): number[] {
  const graph: number[][] = Array.from({ length: numCourses }, () => []);
  const indegree = new Array(numCourses).fill(0);
  
  for (const [course, prereq] of prerequisites) {
    graph[prereq].push(course);  // prereq → course
    indegree[course]++;
  }
  
  const queue: number[] = [];
  for (let i = 0; i < numCourses; i++) {
    if (indegree[i] === 0) {
      queue.push(i);
    }
  }
  
  const result: number[] = [];
  
  while (queue.length > 0) {
    const course = queue.shift()!;
    result.push(course);
    
    for (const nextCourse of graph[course]) {
      indegree[nextCourse]--;
      if (indegree[nextCourse] === 0) {
        queue.push(nextCourse);
      }
    }
  }
  
  return result.length === numCourses ? result : [];
}
```

## 方法二：DFS

```typescript
function findOrder(numCourses: number, prerequisites: number[][]): number[] {
  const graph: number[][] = Array.from({ length: numCourses }, () => []);
  
  for (const [course, prereq] of prerequisites) {
    graph[prereq].push(course);
  }
  
  // 0: 未访问, 1: 访问中, 2: 已完成
  const state = new Array(numCourses).fill(0);
  const result: number[] = [];
  let hasCycle = false;
  
  function dfs(course: number): void {
    if (hasCycle || state[course] === 2) return;
    
    if (state[course] === 1) {
      hasCycle = true;
      return;
    }
    
    state[course] = 1;
    
    for (const next of graph[course]) {
      dfs(next);
      if (hasCycle) return;
    }
    
    state[course] = 2;
    result.push(course);
  }
  
  for (let i = 0; i < numCourses; i++) {
    if (state[i] === 0) {
      dfs(i);
      if (hasCycle) return [];
    }
  }
  
  return result.reverse();
}
```

## 执行过程

```
numCourses = 4, prerequisites = [[1,0],[2,0],[3,1],[3,2]]

图：
0 → 1 → 3
  ↘   ↗
    2

入度：[0, 1, 1, 2]
queue = [0]

处理 0：result = [0]
  邻居 1, 2 入度减 1
  入度：[0, 0, 0, 2]
  queue = [1, 2]

处理 1：result = [0, 1]
  邻居 3 入度减 1
  入度：[0, 0, 0, 1]
  queue = [2]

处理 2：result = [0, 1, 2]
  邻居 3 入度减 1
  入度：[0, 0, 0, 0]
  queue = [3]

处理 3：result = [0, 1, 2, 3]

结果：[0, 1, 2, 3]
```

## 有环的情况

```
numCourses = 2, prerequisites = [[1,0],[0,1]]

图：0 ⇌ 1
入度：[1, 1]
queue = []（没有入度为 0 的节点）

result 为空，返回 []
```

## 复杂度分析

- **时间复杂度**：O(V + E)
- **空间复杂度**：O(V + E)

## 相关题目

| 题号 | 题目 | 难度 |
|------|------|------|
| 207 | 课程表 | 中等 |
| 210 | 课程表 II | 中等 |
| 630 | 课程表 III | 困难 |
| 1462 | 课程表 IV | 中等 |
| 2115 | 从给定原材料中找到所有可以做出的菜 | 中等 |
