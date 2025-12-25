# 实战：所有可能的路径

## 题目描述

**LeetCode 797. All Paths From Source to Target**

给你一个有 n 个节点的有向无环图（DAG），请你找出所有从节点 0 到节点 n-1 的路径并输出（不要求按特定顺序）。

graph[i] 是一个从节点 i 可以访问的所有节点的列表（即从节点 i 到节点 graph[i][j] 存在一条有向边）。

**示例 1**：
```
输入：graph = [[1,2],[3],[3],[]]
输出：[[0,1,3],[0,2,3]]
解释：有两条路径 0 → 1 → 3 和 0 → 2 → 3
```

**示例 2**：
```
输入：graph = [[4,3,1],[3,2,4],[3],[4],[]]
输出：[[0,4],[0,3,4],[0,1,3,4],[0,1,2,3,4],[0,1,4]]
```

**约束**：
- `n == graph.length`
- `2 <= n <= 15`
- `0 <= graph[i][j] < n`
- `graph[i][j] != i`（即不存在自环）
- graph[i] 中的所有元素互不相同
- 保证输入为有向无环图（DAG）

## 思路分析

找所有路径 = DFS + 回溯

关键点：
1. 从节点 0 开始 DFS
2. 到达节点 n-1 时记录路径
3. 因为是 DAG，不需要 visited（不会重复访问）

## 解法一：DFS + 回溯

```typescript
function allPathsSourceTarget(graph: number[][]): number[][] {
  const n = graph.length;
  const result: number[][] = [];
  const path: number[] = [];
  
  function dfs(node: number): void {
    path.push(node);
    
    if (node === n - 1) {
      // 到达终点，记录路径
      result.push([...path]);
    } else {
      // 继续探索
      for (const next of graph[node]) {
        dfs(next);
      }
    }
    
    path.pop();  // 回溯
  }
  
  dfs(0);
  return result;
}
```

**复杂度分析**：
- 时间：O(2^n × n)，最坏情况所有路径都要遍历
- 空间：O(n)，递归深度

## 解法二：BFS

```typescript
function allPathsSourceTarget(graph: number[][]): number[][] {
  const n = graph.length;
  const result: number[][] = [];
  const queue: number[][] = [[0]];  // 队列中存储路径
  
  while (queue.length > 0) {
    const path = queue.shift()!;
    const node = path[path.length - 1];
    
    if (node === n - 1) {
      result.push(path);
      continue;
    }
    
    for (const next of graph[node]) {
      queue.push([...path, next]);
    }
  }
  
  return result;
}
```

**注意**：BFS 解法空间消耗较大，因为需要存储所有中间路径。

## 解法三：不显式回溯

利用参数传递路径，避免显式回溯：

```typescript
function allPathsSourceTarget(graph: number[][]): number[][] {
  const n = graph.length;
  const result: number[][] = [];
  
  function dfs(node: number, path: number[]): void {
    if (node === n - 1) {
      result.push(path);
      return;
    }
    
    for (const next of graph[node]) {
      dfs(next, [...path, next]);  // 创建新数组
    }
  }
  
  dfs(0, [0]);
  return result;
}
```

**优缺点**：
- 优点：代码简洁，无需手动回溯
- 缺点：创建大量中间数组，空间消耗大

## 图解

```
graph = [[1,2],[3],[3],[]]

图结构：
0 → 1 → 3
↓       ↑
2 ------+

DFS 过程：
dfs(0): path = [0]
  dfs(1): path = [0,1]
    dfs(3): path = [0,1,3]
      到达终点，记录 [0,1,3]
    path = [0,1]（回溯）
  path = [0]（回溯）
  dfs(2): path = [0,2]
    dfs(3): path = [0,2,3]
      到达终点，记录 [0,2,3]
    path = [0,2]（回溯）
  path = [0]（回溯）

结果：[[0,1,3], [0,2,3]]
```

## 为什么不需要 visited？

1. **DAG 无环**：不会走回头路
2. **目标是所有路径**：即使经过同一节点，路径也可能不同

```
// 例如：
// 0 → 1 → 3
// 0 → 2 → 1 → 3
// 节点 1 被访问两次，但产生不同的路径
```

如果加了 visited，会漏掉路径。

## 记忆化优化

虽然本题不需要，但可以用记忆化优化：

```typescript
function allPathsSourceTarget(graph: number[][]): number[][] {
  const n = graph.length;
  const memo = new Map<number, number[][]>();
  
  function dfs(node: number): number[][] {
    if (node === n - 1) return [[n - 1]];
    if (memo.has(node)) return memo.get(node)!;
    
    const paths: number[][] = [];
    for (const next of graph[node]) {
      for (const path of dfs(next)) {
        paths.push([node, ...path]);
      }
    }
    
    memo.set(node, paths);
    return paths;
  }
  
  return dfs(0);
}
```

## 相关题目

| 题目 | 说明 |
|------|------|
| [841. 钥匙和房间](https://leetcode.cn/problems/keys-and-rooms/) | 图遍历 |
| [133. 克隆图](https://leetcode.cn/problems/clone-graph/) | 图遍历 |
| [332. 重新安排行程](https://leetcode.cn/problems/reconstruct-itinerary/) | 欧拉路径 |

## 总结

所有可能路径的要点：

1. **DFS + 回溯**：找所有路径的标准模板
2. **DAG 特性**：无需 visited
3. **回溯时机**：探索完当前节点后 pop
4. **终止条件**：到达 n-1 时记录路径

这道题是 DFS 回溯的经典应用。
