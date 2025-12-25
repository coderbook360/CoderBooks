# 并行课程

LeetCode 1136. Parallel Courses

## 题目描述

已知有 N 门课需要选，编号为 1 到 N。

给你一个数组 `relations` 表示先修关系，其中 `relations[i] = [prevCourse, nextCourse]` 表示要学习 nextCourse 必须先学习 prevCourse。

一个学期内你可以学习任意数量的课程，但前提是你已经学完了所需的先修课程。

返回你需要学习所有课程的最少学期数。如果没有办法做到，返回 -1。

## 示例

```
输入：n = 3, relations = [[1,3],[2,3]]
输出：2
解释：
学期 1：学习课程 1 和 2
学期 2：学习课程 3

    1 → 3
    2 ↗

输入：n = 3, relations = [[1,2],[2,3],[3,1]]
输出：-1
解释：存在环，无法完成
```

## 思路分析

这是拓扑排序 + 层次遍历的结合：
- 每一"层"的课程可以同时学习
- 层数就是最少学期数
- 如果有环，返回 -1

实际上就是求 DAG 的**最长路径** + 1。

## 代码实现

```typescript
function minimumSemesters(n: number, relations: number[][]): number {
  const graph: number[][] = Array.from({ length: n + 1 }, () => []);
  const indegree = new Array(n + 1).fill(0);
  
  for (const [prev, next] of relations) {
    graph[prev].push(next);
    indegree[next]++;
  }
  
  // 所有入度为 0 的课程可以在第一学期学习
  let queue: number[] = [];
  for (let i = 1; i <= n; i++) {
    if (indegree[i] === 0) {
      queue.push(i);
    }
  }
  
  let semesters = 0;
  let coursesLearned = 0;
  
  while (queue.length > 0) {
    semesters++;
    const nextQueue: number[] = [];
    
    for (const course of queue) {
      coursesLearned++;
      
      for (const next of graph[course]) {
        indegree[next]--;
        if (indegree[next] === 0) {
          nextQueue.push(next);
        }
      }
    }
    
    queue = nextQueue;
  }
  
  return coursesLearned === n ? semesters : -1;
}
```

## 执行过程

```
n = 3, relations = [[1,3],[2,3]]

图：
1 → 3 ← 2

入度：[_, 0, 0, 2]  (索引从 1 开始)

学期 1：
queue = [1, 2]
学习 1, 2，coursesLearned = 2
3 的入度从 2 → 0
nextQueue = [3]

学期 2：
queue = [3]
学习 3，coursesLearned = 3
nextQueue = []

coursesLearned = 3 = n，返回 semesters = 2
```

## 另一种思路：DP 求最长路径

```typescript
function minimumSemesters(n: number, relations: number[][]): number {
  const graph: number[][] = Array.from({ length: n + 1 }, () => []);
  const indegree = new Array(n + 1).fill(0);
  
  for (const [prev, next] of relations) {
    graph[prev].push(next);
    indegree[next]++;
  }
  
  // dist[i] = 从入度为 0 的节点到 i 的最长路径
  const dist = new Array(n + 1).fill(0);
  
  const queue: number[] = [];
  for (let i = 1; i <= n; i++) {
    if (indegree[i] === 0) {
      queue.push(i);
      dist[i] = 1;
    }
  }
  
  let count = 0;
  let maxDist = 0;
  
  while (queue.length > 0) {
    const course = queue.shift()!;
    count++;
    maxDist = Math.max(maxDist, dist[course]);
    
    for (const next of graph[course]) {
      dist[next] = Math.max(dist[next], dist[course] + 1);
      indegree[next]--;
      if (indegree[next] === 0) {
        queue.push(next);
      }
    }
  }
  
  return count === n ? maxDist : -1;
}
```

## 复杂度分析

- **时间复杂度**：O(V + E)
- **空间复杂度**：O(V + E)

## 进阶：并行课程 II

LeetCode 1494：每学期最多学 k 门课。

这变成了带约束的问题，需要状态压缩 DP：

```typescript
function minNumberOfSemesters(n: number, relations: number[][], k: number): number {
  // prereq[i] = 学习课程 i 需要的先修课程（位掩码）
  const prereq = new Array(n).fill(0);
  for (const [prev, next] of relations) {
    prereq[next - 1] |= (1 << (prev - 1));
  }
  
  // dp[mask] = 学完 mask 代表的课程所需最少学期
  const dp = new Array(1 << n).fill(n + 1);
  dp[0] = 0;
  
  for (let mask = 0; mask < (1 << n); mask++) {
    if (dp[mask] === n + 1) continue;
    
    // 找出可以学习的课程
    let canLearn = 0;
    for (let i = 0; i < n; i++) {
      // 课程 i 未学过，且先修课程都学过
      if ((mask & (1 << i)) === 0 && (prereq[i] & mask) === prereq[i]) {
        canLearn |= (1 << i);
      }
    }
    
    // 枚举 canLearn 的子集（最多选 k 门）
    for (let sub = canLearn; sub > 0; sub = (sub - 1) & canLearn) {
      if (countBits(sub) <= k) {
        dp[mask | sub] = Math.min(dp[mask | sub], dp[mask] + 1);
      }
    }
  }
  
  return dp[(1 << n) - 1];
}

function countBits(x: number): number {
  let count = 0;
  while (x > 0) {
    count += x & 1;
    x >>= 1;
  }
  return count;
}
```

## 相关题目

| 题号 | 题目 | 难度 |
|------|------|------|
| 1136 | 并行课程 | 中等 |
| 1494 | 并行课程 II | 困难 |
| 2050 | 并行课程 III | 困难 |
| 207 | 课程表 | 中等 |
