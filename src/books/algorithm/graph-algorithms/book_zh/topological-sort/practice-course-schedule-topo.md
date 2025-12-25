# 课程表（拓扑排序）

LeetCode 207. Course Schedule

## 题目描述

你这个学期必须选修 `numCourses` 门课程，记为 `0` 到 `numCourses - 1`。

在选修某些课程之前需要一些先修课程。先修课程按数组 `prerequisites` 给出，其中 `prerequisites[i] = [ai, bi]` ，表示如果要学习课程 `ai` 则必须先学习课程 `bi`。

判断是否可能完成所有课程的学习。

## 示例

```
输入：numCourses = 2, prerequisites = [[1,0]]
输出：true
解释：总共有 2 门课程。学习课程 1 之前，你需要完成课程 0。这是可能的。

输入：numCourses = 2, prerequisites = [[1,0],[0,1]]
输出：false
解释：总共有 2 门课程。学习课程 1 之前，你需要先完成课程 0；
     学习课程 0 之前，你需要先完成课程 1。这是不可能的。
```

## 思路分析

这是一个**环检测**问题：
- 将课程看作顶点，先修关系看作有向边
- 如果存在环，说明有循环依赖，无法完成所有课程
- 如果是 DAG，则可以进行拓扑排序，即可完成

**核心**：判断有向图是否有环 = 判断拓扑排序是否存在

## Kahn 算法实现

```typescript
function canFinish(numCourses: number, prerequisites: number[][]): boolean {
  // 建图 + 计算入度
  const graph: number[][] = Array.from({ length: numCourses }, () => []);
  const indegree = new Array(numCourses).fill(0);
  
  for (const [course, pre] of prerequisites) {
    graph[pre].push(course);  // pre → course
    indegree[course]++;
  }
  
  // 将入度为 0 的课程加入队列
  const queue: number[] = [];
  for (let i = 0; i < numCourses; i++) {
    if (indegree[i] === 0) {
      queue.push(i);
    }
  }
  
  let count = 0;  // 已完成的课程数
  
  while (queue.length > 0) {
    const course = queue.shift()!;
    count++;
    
    for (const next of graph[course]) {
      indegree[next]--;
      if (indegree[next] === 0) {
        queue.push(next);
      }
    }
  }
  
  // 如果完成的课程数等于总数，说明可以完成
  return count === numCourses;
}
```

## 执行过程

```
numCourses = 4
prerequisites = [[1,0],[2,0],[3,1],[3,2]]

图结构：
0 → 1 → 3
↓       ↑
2 ------+

入度：
0: 0, 1: 1, 2: 1, 3: 2

BFS 过程：
1. queue = [0]，count = 0
2. 处理 0，count = 1，1 和 2 入度减 1
   indegree = [0, 0, 0, 2]
   queue = [1, 2]
3. 处理 1，count = 2，3 入度减 1
   indegree = [0, 0, 0, 1]
   queue = [2]
4. 处理 2，count = 3，3 入度减 1
   indegree = [0, 0, 0, 0]
   queue = [3]
5. 处理 3，count = 4

count = 4 = numCourses，返回 true
```

## DFS 实现

```typescript
function canFinish(numCourses: number, prerequisites: number[][]): boolean {
  const graph: number[][] = Array.from({ length: numCourses }, () => []);
  
  for (const [course, pre] of prerequisites) {
    graph[pre].push(course);
  }
  
  // 0: 未访问, 1: 访问中, 2: 已完成
  const visited = new Array(numCourses).fill(0);
  
  function hasCycle(course: number): boolean {
    if (visited[course] === 1) return true;   // 发现环
    if (visited[course] === 2) return false;  // 已处理过
    
    visited[course] = 1;  // 标记为访问中
    
    for (const next of graph[course]) {
      if (hasCycle(next)) {
        return true;
      }
    }
    
    visited[course] = 2;  // 标记为已完成
    return false;
  }
  
  for (let i = 0; i < numCourses; i++) {
    if (hasCycle(i)) {
      return false;
    }
  }
  
  return true;
}
```

## 两种方法对比

| 方法 | 环检测方式 | 优点 |
|------|------------|------|
| Kahn | count < numCourses | 直观，可得到拓扑序 |
| DFS | 访问中遇到访问中 | 代码简洁，递归自然 |

## 边界情况

```typescript
// 没有先修要求
canFinish(3, []);  // true

// 自己依赖自己
canFinish(1, [[0, 0]]);  // false

// 多个独立的课程组
canFinish(4, [[1, 0], [3, 2]]);  // true
```

## 复杂度分析

- **时间复杂度**：O(V + E)，V 为课程数，E 为先修关系数
- **空间复杂度**：O(V + E)，存储图结构

## 相关题目

| 题号 | 题目 | 难度 |
|------|------|------|
| 207 | 课程表 | 中等 |
| 210 | 课程表 II | 中等 |
| 630 | 课程表 III | 困难 |
| 1462 | 课程表 IV | 中等 |
