# 树中距离之和

## 题目描述

**LeetCode 834. Sum of Distances in Tree**

给定一个无向、连通的树。树中有 n 个标记为 0...n-1 的节点以及 n-1 条边。

给定整数 n 和数组 edges，其中 edges[i] = [ai, bi] 表示树中的节点 ai 和 bi 之间有一条边。

返回长度为 n 的数组 answer，其中 answer[i] 是树中第 i 个节点与所有其他节点之间的距离之和。

**示例 1**：
```
输入：n = 6, edges = [[0,1],[0,2],[2,3],[2,4],[2,5]]
输出：[8,12,6,10,10,10]
解释：
树如下所示：
    0
   / \
  1   2
     /|\
    3 4 5

距离和：
- 节点 0：1+1+2+2+2 = 8
- 节点 1：1+2+3+3+3 = 12
- 节点 2：2+1+1+1+1 = 6
- 节点 3：3+2+1+2+2 = 10
- 节点 4：3+2+1+2+2 = 10
- 节点 5：3+2+1+2+2 = 10
```

**示例 2**：
```
输入：n = 1, edges = []
输出：[0]
```

**约束**：
- `1 <= n <= 3 × 10^4`
- `edges.length == n - 1`
- `edges[i].length == 2`
- `0 <= ai, bi < n`
- `ai != bi`
- 给定的输入保证为有效的树

## 思路分析

暴力：对每个节点 BFS 计算到其他所有节点的距离和。O(n²)。

优化：换根 DP，利用相邻节点答案之间的关系。

关键观察：当我们从节点 u 移动到相邻节点 v 时，距离和如何变化？

- 以 v 为根的子树中的节点：距离减 1
- 其他节点：距离加 1

设 `count[v]` 为以 v 为根的子树节点数，则：
```
answer[v] = answer[u] - count[v] + (n - count[v])
          = answer[u] - 2 * count[v] + n
```

## 解法：换根 DP

```typescript
function sumOfDistancesInTree(n: number, edges: number[][]): number[] {
  // 建图
  const graph: number[][] = Array.from({ length: n }, () => []);
  for (const [u, v] of edges) {
    graph[u].push(v);
    graph[v].push(u);
  }
  
  const count: number[] = Array(n).fill(1);  // 子树节点数
  const answer: number[] = Array(n).fill(0);
  
  // 第一次 DFS：以 0 为根，计算子树大小和 answer[0]
  function dfs1(node: number, parent: number): void {
    for (const child of graph[node]) {
      if (child !== parent) {
        dfs1(child, node);
        count[node] += count[child];
        answer[0] += count[child];  // 所有子树节点到根的距离贡献
      }
    }
  }
  
  // 第二次 DFS：换根，计算其他节点的 answer
  function dfs2(node: number, parent: number): void {
    for (const child of graph[node]) {
      if (child !== parent) {
        // 换根公式
        answer[child] = answer[node] - count[child] + (n - count[child]);
        dfs2(child, node);
      }
    }
  }
  
  dfs1(0, -1);
  dfs2(0, -1);
  
  return answer;
}
```

**算法详解**：

### 第一次 DFS（后序遍历）

目的：
1. 计算以每个节点为根的子树大小 `count[node]`
2. 计算以节点 0 为根时的距离和 `answer[0]`

```typescript
function dfs1(node: number, parent: number): void {
  for (const child of graph[node]) {
    if (child !== parent) {
      dfs1(child, node);
      count[node] += count[child];
      answer[0] += count[child];
    }
  }
}
```

为什么 `answer[0] += count[child]`？

以 0 为根时，从 child 子树中的每个节点到达 0，都需要经过 0-child 这条边。
所以这条边被经过 `count[child]` 次。

### 第二次 DFS（前序遍历）

目的：利用父节点的答案，计算子节点的答案。

```typescript
answer[child] = answer[node] - count[child] + (n - count[child]);
```

推导：
- 从 node 换根到 child
- child 子树中的节点：距离减 1，共减少 `count[child]`
- 其他节点：距离加 1，共增加 `n - count[child]`
- 总变化：`-count[child] + (n - count[child]) = n - 2 * count[child]`

**复杂度分析**：
- 时间：O(n)
- 空间：O(n)

## 图解

```
    0
   / \
  1   2
     /|\
    3 4 5

第一次 DFS（以 0 为根）：
- dfs1(3, 2): count[3] = 1
- dfs1(4, 2): count[4] = 1
- dfs1(5, 2): count[5] = 1
- dfs1(2, 0): count[2] = 1+1+1+1 = 4, answer[0] += 1+1+1 = 3
- dfs1(1, 0): count[1] = 1
- dfs1(0, -1): count[0] = 1+4+1 = 6, answer[0] += 4+1 = 8

第二次 DFS（换根）：
- answer[1] = 8 - 1 + (6-1) = 8 - 1 + 5 = 12
- answer[2] = 8 - 4 + (6-4) = 8 - 4 + 2 = 6
- answer[3] = 6 - 1 + (6-1) = 6 - 1 + 5 = 10
- answer[4] = 6 - 1 + 5 = 10
- answer[5] = 6 - 1 + 5 = 10

结果：[8, 12, 6, 10, 10, 10] ✓
```

## 换根 DP 模板

```typescript
function reRootDP(n: number, edges: number[][]): number[] {
  // 1. 建图
  const graph = buildGraph(n, edges);
  
  // 2. 第一次 DFS：计算以某个节点为根的信息
  const subtreeInfo = new Array(n);
  function dfs1(node: number, parent: number): SubtreeInfo {
    // 递归计算子树信息
    // 汇总到当前节点
  }
  
  // 3. 第二次 DFS：换根计算
  const answer = new Array(n);
  function dfs2(node: number, parent: number, parentInfo: Info): void {
    // 用父节点信息 + 子树信息计算当前节点答案
    answer[node] = compute(parentInfo, subtreeInfo[node]);
    
    // 递归到子节点
    for (const child of graph[node]) {
      if (child !== parent) {
        const newParentInfo = reroot(node, child, parentInfo, subtreeInfo);
        dfs2(child, node, newParentInfo);
      }
    }
  }
  
  dfs1(root, -1);
  dfs2(root, -1, initialParentInfo);
  
  return answer;
}
```

## 相关题目

| 题目 | 难度 | 说明 |
|------|------|------|
| [310. 最小高度树](https://leetcode.cn/problems/minimum-height-trees/) | 中等 | 找最优根 |
| [2581. 统计可能的树根数目](https://leetcode.cn/problems/count-number-of-possible-root-nodes/) | 困难 | 换根统计 |
| [2858. 可以到达每一个节点的最少边反转次数](https://leetcode.cn/problems/minimum-edge-reversals-so-every-node-is-reachable/) | 困难 | 换根 DP |

## 总结

这道题展示了换根 DP 的经典模式：

1. **两次 DFS**：
   - 第一次：计算以某个节点为根的信息
   - 第二次：利用相邻节点信息推导

2. **换根公式**：
   - 找到从 parent 换到 child 时，答案的变化规律
   - 通常与子树大小有关

3. **适用场景**：
   - 需要计算以每个节点为根的某个值
   - 相邻节点的值有递推关系

核心洞见：
- 暴力 O(n²) 可以用换根优化到 O(n)
- 关键是找到换根时答案的变化公式
- 子树大小是换根 DP 的常见辅助信息
