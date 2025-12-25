# 排序项目

LeetCode 1203. Sort Items by Groups Respecting Dependencies

## 题目描述

有 `n` 个项目，编号为 `0` 到 `n - 1`。每个项目可能属于某个组，用 `group[i]` 表示（-1 表示不属于任何组）。

给定一个二维数组 `beforeItems`，其中 `beforeItems[i]` 是在项目 i 之前必须完成的项目列表。

返回一个排序，满足：
1. 同组的项目必须相邻
2. 所有依赖关系必须满足

如果无法完成，返回空数组。

## 示例

```
输入：n = 8, m = 2, group = [-1,-1,1,0,0,1,0,-1], 
      beforeItems = [[],[6],[5],[6],[3,6],[],[],[]]

项目：0  1  2  3  4  5  6  7
组号：-1 -1 1  0  0  1  0  -1

依赖：
1 依赖 6
2 依赖 5
3 依赖 6
4 依赖 3, 6

输出：[6,3,4,1,5,2,0,7]
```

## 思路分析

这是**双层拓扑排序**问题：

1. **组间排序**：确定组的执行顺序
2. **组内排序**：确定每组内项目的执行顺序

两层都需要拓扑排序，任何一层有环都无法完成。

## 代码实现

```typescript
function sortItems(n: number, m: number, group: number[], beforeItems: number[][]): number[] {
  // 给无组项目分配虚拟组号
  let groupId = m;
  for (let i = 0; i < n; i++) {
    if (group[i] === -1) {
      group[i] = groupId++;
    }
  }
  
  // 组间图 和 组内图
  const groupGraph: number[][] = Array.from({ length: groupId }, () => []);
  const groupIndegree = new Array(groupId).fill(0);
  
  const itemGraph: number[][] = Array.from({ length: n }, () => []);
  const itemIndegree = new Array(n).fill(0);
  
  // 建图
  for (let i = 0; i < n; i++) {
    for (const before of beforeItems[i]) {
      // 项目间依赖
      itemGraph[before].push(i);
      itemIndegree[i]++;
      
      // 组间依赖
      if (group[before] !== group[i]) {
        groupGraph[group[before]].push(group[i]);
        groupIndegree[group[i]]++;
      }
    }
  }
  
  // 拓扑排序函数
  function topSort(n: number, graph: number[][], indegree: number[]): number[] {
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
      
      for (const next of graph[node]) {
        indegree[next]--;
        if (indegree[next] === 0) {
          queue.push(next);
        }
      }
    }
    
    return result;
  }
  
  // 组间拓扑排序
  const groupOrder = topSort(groupId, groupGraph, groupIndegree);
  if (groupOrder.length !== groupId) return [];  // 组间有环
  
  // 组内拓扑排序
  const itemOrder = topSort(n, itemGraph, itemIndegree);
  if (itemOrder.length !== n) return [];  // 项目间有环
  
  // 按组分类项目
  const groupItems: number[][] = Array.from({ length: groupId }, () => []);
  for (const item of itemOrder) {
    groupItems[group[item]].push(item);
  }
  
  // 按组顺序输出
  const result: number[] = [];
  for (const g of groupOrder) {
    result.push(...groupItems[g]);
  }
  
  return result;
}
```

## 执行过程

```
n = 8, m = 2
group = [-1,-1,1,0,0,1,0,-1]

分配虚拟组后：
group = [2, 3, 1, 0, 0, 1, 0, 4]

项目依赖关系：
6 → 1, 6 → 3, 6 → 4
5 → 2
3 → 4

组间依赖：
group[6]=0 → group[1]=3 (组 0 → 组 3)
group[6]=0 → group[3]=0 (同组，跳过)
group[6]=0 → group[4]=0 (同组，跳过)
group[5]=1 → group[2]=1 (同组，跳过)
group[3]=0 → group[4]=0 (同组，跳过)

组间图：0 → 3

组间拓扑排序：[0, 1, 2, 3, 4] 或其他有效排列
项目拓扑排序：[6, 3, 4, 5, 2, 0, 1, 7] 或其他有效排列

按组分类：
组 0: [6, 3, 4]
组 1: [5, 2]
组 2: [0]
组 3: [1]
组 4: [7]

按组顺序输出：[6,3,4,5,2,0,1,7]
```

## 简化版本

去除重复边的处理：

```typescript
function sortItems(n: number, m: number, group: number[], beforeItems: number[][]): number[] {
  // 分配虚拟组
  let gId = m;
  for (let i = 0; i < n; i++) {
    if (group[i] === -1) group[i] = gId++;
  }
  
  // 建图（使用 Set 去重）
  const gGraph: Set<number>[] = Array.from({ length: gId }, () => new Set());
  const gIn = new Array(gId).fill(0);
  const iGraph: number[][] = Array.from({ length: n }, () => []);
  const iIn = new Array(n).fill(0);
  
  for (let i = 0; i < n; i++) {
    for (const b of beforeItems[i]) {
      iGraph[b].push(i);
      iIn[i]++;
      
      if (group[b] !== group[i] && !gGraph[group[b]].has(group[i])) {
        gGraph[group[b]].add(group[i]);
        gIn[group[i]]++;
      }
    }
  }
  
  // 拓扑排序
  const topSort = (n: number, graph: any[], indeg: number[]): number[] => {
    const q: number[] = [];
    for (let i = 0; i < n; i++) if (indeg[i] === 0) q.push(i);
    
    const res: number[] = [];
    while (q.length) {
      const u = q.shift()!;
      res.push(u);
      for (const v of (graph[u] instanceof Set ? graph[u] : graph[u])) {
        if (--indeg[v] === 0) q.push(v);
      }
    }
    return res;
  };
  
  const gOrder = topSort(gId, gGraph, gIn);
  if (gOrder.length !== gId) return [];
  
  const iOrder = topSort(n, iGraph, iIn);
  if (iOrder.length !== n) return [];
  
  const gItems: number[][] = Array.from({ length: gId }, () => []);
  for (const i of iOrder) gItems[group[i]].push(i);
  
  return gOrder.flatMap(g => gItems[g]);
}
```

## 复杂度分析

- **时间复杂度**：O(n + m + E)，E 为依赖边数
- **空间复杂度**：O(n + m + E)

## 相关题目

| 题号 | 题目 | 难度 |
|------|------|------|
| 1203 | 排序项目 | 困难 |
| 210 | 课程表 II | 中等 |
| 269 | 火星词典 | 困难 |
