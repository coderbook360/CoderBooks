# 找到最终的安全状态

LeetCode 802. Find Eventual Safe States

## 题目描述

有一个有向图，节点标记为 `0` 到 `n - 1`。图中每个节点 `i` 都有一组出边，用 `graph[i]` 表示。

如果一个节点没有出边，则它是**终端节点**。如果从一个节点出发的所有路径最终都能到达终端节点，则该节点是**安全节点**。

返回所有安全节点的列表，升序排列。

## 示例

```
输入：graph = [[1,2],[2,3],[5],[0],[5],[],[]]

0 → 1 → 2 → 5
    ↓   ↓
    3 ← 
    ↓
    0（回到 0，有环）

4 → 5
6（孤立终端节点）

输出：[2,4,5,6]
解释：
- 节点 5, 6 是终端节点（没有出边）
- 节点 2 只能到 5（安全）
- 节点 4 只能到 5（安全）
- 节点 0, 1, 3 可能进入 0→3→0 的环
```

## 思路分析

安全节点 = 不在环中 + 不会走到环中的节点

方法：
1. **反向拓扑排序**：从终端节点开始向回传播
2. **DFS 三色标记**：判断是否会进入环

## 方法一：反向图 + 拓扑排序

```typescript
function eventualSafeNodes(graph: number[][]): number[] {
  const n = graph.length;
  
  // 建立反向图
  const reverseGraph: number[][] = Array.from({ length: n }, () => []);
  const outDegree = new Array(n).fill(0);
  
  for (let u = 0; u < n; u++) {
    outDegree[u] = graph[u].length;
    for (const v of graph[u]) {
      reverseGraph[v].push(u);
    }
  }
  
  // 出度为 0 的节点（终端节点）入队
  const queue: number[] = [];
  for (let i = 0; i < n; i++) {
    if (outDegree[i] === 0) {
      queue.push(i);
    }
  }
  
  const safe = new Array(n).fill(false);
  
  while (queue.length > 0) {
    const node = queue.shift()!;
    safe[node] = true;
    
    // 所有指向 node 的节点
    for (const prev of reverseGraph[node]) {
      outDegree[prev]--;
      // 如果所有出边都指向安全节点
      if (outDegree[prev] === 0) {
        queue.push(prev);
      }
    }
  }
  
  const result: number[] = [];
  for (let i = 0; i < n; i++) {
    if (safe[i]) result.push(i);
  }
  
  return result;
}
```

## 方法二：DFS 三色标记

```typescript
function eventualSafeNodes(graph: number[][]): number[] {
  const n = graph.length;
  // 0: 未访问, 1: 访问中, 2: 安全
  const color = new Array(n).fill(0);
  
  function isSafe(node: number): boolean {
    if (color[node] > 0) {
      return color[node] === 2;
    }
    
    color[node] = 1;  // 访问中
    
    for (const neighbor of graph[node]) {
      if (!isSafe(neighbor)) {
        return false;  // 邻居不安全，自己也不安全
      }
    }
    
    color[node] = 2;  // 安全
    return true;
  }
  
  const result: number[] = [];
  
  for (let i = 0; i < n; i++) {
    if (isSafe(i)) {
      result.push(i);
    }
  }
  
  return result;
}
```

## 执行过程

```
graph = [[1,2],[2,3],[5],[0],[5],[],[]]

方法二执行：

isSafe(0)：
  color[0] = 1
  检查邻居 1：isSafe(1)
    color[1] = 1
    检查邻居 2：isSafe(2)
      color[2] = 1
      检查邻居 5：isSafe(5)
        color[5] = 1，无邻居，color[5] = 2，返回 true
      color[2] = 2，返回 true
    检查邻居 3：isSafe(3)
      color[3] = 1
      检查邻居 0：color[0] = 1（访问中），返回 false
    返回 false
  返回 false

isSafe(2)：color[2] = 2，返回 true
isSafe(4)：
  color[4] = 1
  检查邻居 5：color[5] = 2，返回 true
  color[4] = 2，返回 true

结果：[2, 4, 5, 6]
```

## 为什么三色标记有效？

- **白色 (0)**：未探索
- **灰色 (1)**：正在探索（在当前 DFS 路径上）
- **黑色 (2)**：已确定安全

关键洞察：
- 遇到灰色节点 → 有环 → 不安全
- 遇到黑色节点 → 已知安全 → 可以信任
- 所有邻居都安全 → 自己也安全

## 两种方法对比

| 方法 | 优点 | 缺点 |
|------|------|------|
| 反向拓扑排序 | 直观，从终端节点开始 | 需要建反向图 |
| DFS 三色标记 | 不需要反向图 | 需要理解三色含义 |

## 复杂度分析

- **时间复杂度**：O(V + E)
- **空间复杂度**：O(V + E)

## 相关题目

| 题号 | 题目 | 难度 |
|------|------|------|
| 802 | 找到最终的安全状态 | 中等 |
| 207 | 课程表 | 中等 |
| 210 | 课程表 II | 中等 |
| 1462 | 课程表 IV | 中等 |
