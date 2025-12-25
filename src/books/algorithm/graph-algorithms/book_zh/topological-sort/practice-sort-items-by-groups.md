# 项目管理

LeetCode 1203. Sort Items by Groups Respecting Dependencies

## 题目描述

有 `n` 个项目，每个项目或者不属于任何小组，或者属于 `m` 个小组之一。`group[i]` 表示第 `i` 个项目所属的小组，如果第 `i` 个项目不属于任何小组，则 `group[i] = -1`。

项目和小组都可能存在依赖关系：`beforeItems[i]` 是一个列表，表示在进行第 `i` 个项目前必须完成的所有项目。

请你帮忙按要求安排这些项目的进度，返回排序后的项目列表。如果存在多个解决方案，只需要返回其中任意一个。如果没有合适的解决方案，返回一个空列表。

**约束**：同一小组的项目必须排在一起。

## 示例

```
输入：n = 8, m = 2, group = [-1,-1,1,0,0,1,0,-1], 
     beforeItems = [[],[6],[5],[6],[3,6],[],[],[]]
输出：[6,3,4,1,5,2,0,7]
解释：
- 组 0：项目 3, 4, 6
- 组 1：项目 2, 5
- 无组：项目 0, 1, 7

满足依赖和分组要求的一种排列。
```

## 思路分析

这是一个**双层拓扑排序**问题：
1. **组间排序**：确定小组的执行顺序
2. **组内排序**：确定每个小组内项目的顺序

**难点**：
- 无组的项目需要分配虚拟组
- 跨组依赖会产生组间依赖

## 代码实现

```typescript
function sortItems(
  n: number, 
  m: number, 
  group: number[], 
  beforeItems: number[][]
): number[] {
  // 为无组的项目分配虚拟组
  let groupId = m;
  for (let i = 0; i < n; i++) {
    if (group[i] === -1) {
      group[i] = groupId++;
    }
  }
  
  // 建图：组间依赖 + 组内依赖
  const groupGraph: Set<number>[] = Array.from({ length: groupId }, () => new Set());
  const itemGraph: number[][] = Array.from({ length: n }, () => []);
  const groupIndegree = new Array(groupId).fill(0);
  const itemIndegree = new Array(n).fill(0);
  
  for (let i = 0; i < n; i++) {
    for (const before of beforeItems[i]) {
      // 组内依赖
      itemGraph[before].push(i);
      itemIndegree[i]++;
      
      // 跨组依赖 → 组间依赖
      if (group[before] !== group[i]) {
        if (!groupGraph[group[before]].has(group[i])) {
          groupGraph[group[before]].add(group[i]);
          groupIndegree[group[i]]++;
        }
      }
    }
  }
  
  // 辅助函数：拓扑排序
  function topologicalSort(
    graph: (number[] | Set<number>)[], 
    indegree: number[], 
    items: number[]
  ): number[] {
    const queue: number[] = [];
    for (const item of items) {
      if (indegree[item] === 0) {
        queue.push(item);
      }
    }
    
    const result: number[] = [];
    while (queue.length > 0) {
      const node = queue.shift()!;
      result.push(node);
      
      const neighbors = graph[node] instanceof Set 
        ? Array.from(graph[node] as Set<number>)
        : graph[node] as number[];
      
      for (const next of neighbors) {
        indegree[next]--;
        if (indegree[next] === 0) {
          queue.push(next);
        }
      }
    }
    
    return result.length === items.length ? result : [];
  }
  
  // 组间拓扑排序
  const allGroups = Array.from({ length: groupId }, (_, i) => i);
  const groupOrder = topologicalSort(groupGraph, groupIndegree, allGroups);
  
  if (groupOrder.length === 0) return [];
  
  // 按组分类项目
  const groupItems: number[][] = Array.from({ length: groupId }, () => []);
  for (let i = 0; i < n; i++) {
    groupItems[group[i]].push(i);
  }
  
  // 对每个组内进行拓扑排序
  const result: number[] = [];
  for (const g of groupOrder) {
    const sortedItems = topologicalSort(itemGraph, [...itemIndegree], groupItems[g]);
    if (sortedItems.length !== groupItems[g].length) {
      return [];
    }
    result.push(...sortedItems);
  }
  
  return result;
}
```

## 执行过程

```
n = 8, m = 2
group = [-1,-1,1,0,0,1,0,-1]
beforeItems = [[],[6],[5],[6],[3,6],[],[],[]]

步骤 1：分配虚拟组
group = [2, 3, 1, 0, 0, 1, 0, 4]

步骤 2：建图
项目依赖：
- 1 依赖 6
- 2 依赖 5
- 3 依赖 6
- 4 依赖 3, 6

组间依赖（跨组）：
- 组 0(6) → 组 3(1)
- 组 1(5) → 组 1(2) [同组，不计]
- 组 0(6) → 组 0(3) [同组，不计]
- 组 0(3) → 组 0(4) [同组，不计]
- 组 0(6) → 组 0(4) [同组，不计]

步骤 3：组间拓扑排序
组顺序：[0, 1, 2, 3, 4] 或其他合法顺序

步骤 4：组内拓扑排序
- 组 0 (项目 3, 4, 6)：[6, 3, 4]
- 组 1 (项目 2, 5)：[5, 2]
- 组 2 (项目 0)：[0]
- 组 3 (项目 1)：[1]
- 组 4 (项目 7)：[7]

最终结果（按组顺序拼接）：[6, 3, 4, 5, 2, 0, 1, 7]
```

## 算法要点

1. **虚拟组分配**：无组项目各自独立成组
2. **双层拓扑**：先组间，再组内
3. **跨组依赖转换**：项目依赖 → 组依赖
4. **环检测**：任一层有环则无解

## 边界情况

```typescript
// 所有项目无依赖
sortItems(3, 0, [-1, -1, -1], [[], [], []]);  
// 返回任意排列，如 [0, 1, 2]

// 组内有环
sortItems(2, 1, [0, 0], [[1], [0]]);  
// 返回 []（项目 0 和 1 循环依赖）

// 组间有环
sortItems(2, 2, [0, 1], [[1], [0]]);  
// 返回 []（组 0 和组 1 循环依赖）
```

## 复杂度分析

- **时间复杂度**：O(n + m + e)，e 为依赖边数
- **空间复杂度**：O(n + m + e)

## 相关题目

| 题号 | 题目 | 难度 |
|------|------|------|
| 1203 | 项目管理 | 困难 |
| 207 | 课程表 | 中等 |
| 210 | 课程表 II | 中等 |
| 269 | 火星词典 | 困难 |
