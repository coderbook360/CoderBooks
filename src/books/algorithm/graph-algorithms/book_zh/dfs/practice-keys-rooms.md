# 实战：钥匙和房间

## 题目描述

**LeetCode 841. Keys and Rooms**

有 n 个房间，房间按从 0 到 n - 1 编号。最初，除 0 号房间外的其余所有房间都被锁住。你的目标是进入所有的房间。然而，你不能在没有获得钥匙的时候进入锁住的房间。

当你进入一个房间，你可能会在里面找到一套不同的钥匙，每把钥匙上都有对应的房间号，即表示钥匙可以打开的房间。你可以拿上所有钥匙去解锁其他房间。

给你一个数组 rooms 其中 rooms[i] 是你进入 i 号房间可以获得的钥匙集合。如果能进入所有房间返回 true，否则返回 false。

**示例 1**：
```
输入：rooms = [[1],[2],[3],[]]
输出：true
解释：
我们从 0 号房间开始，拿到钥匙 1。
之后我们去 1 号房间，拿到钥匙 2。
然后我们去 2 号房间，拿到钥匙 3。
最后我们去了 3 号房间。
由于我们能够进入每个房间，我们返回 true。
```

**示例 2**：
```
输入：rooms = [[1,3],[3,0,1],[2],[0]]
输出：false
解释：我们不能进入 2 号房间。
```

**约束**：
- `n == rooms.length`
- `2 <= n <= 1000`
- `0 <= rooms[i].length <= 1000`
- `1 <= sum(rooms[i].length) <= 3000`
- `0 <= rooms[i][j] < n`
- 所有 rooms[i] 的值互不相同

## 思路分析

这是一个典型的图遍历问题：
- **顶点**：房间
- **边**：钥匙关系（房间 i 有钥匙 j，则 i → j）
- **目标**：从房间 0 出发，能否访问所有房间

本质：**判断从节点 0 是否能到达所有节点**。

## 解法一：DFS

```typescript
function canVisitAllRooms(rooms: number[][]): boolean {
  const n = rooms.length;
  const visited = new Set<number>();
  
  function dfs(room: number): void {
    visited.add(room);
    
    for (const key of rooms[room]) {
      if (!visited.has(key)) {
        dfs(key);
      }
    }
  }
  
  dfs(0);
  
  return visited.size === n;
}
```

**复杂度分析**：
- 时间：O(n + k)，n 是房间数，k 是钥匙总数
- 空间：O(n)，visited + 递归栈

## 解法二：BFS

```typescript
function canVisitAllRooms(rooms: number[][]): boolean {
  const n = rooms.length;
  const visited = new Set<number>([0]);
  const queue: number[] = [0];
  
  while (queue.length > 0) {
    const room = queue.shift()!;
    
    for (const key of rooms[room]) {
      if (!visited.has(key)) {
        visited.add(key);
        queue.push(key);
      }
    }
  }
  
  return visited.size === n;
}
```

## 解法三：迭代 DFS

```typescript
function canVisitAllRooms(rooms: number[][]): boolean {
  const n = rooms.length;
  const visited = new Set<number>([0]);
  const stack: number[] = [0];
  
  while (stack.length > 0) {
    const room = stack.pop()!;
    
    for (const key of rooms[room]) {
      if (!visited.has(key)) {
        visited.add(key);
        stack.push(key);
      }
    }
  }
  
  return visited.size === n;
}
```

## 图解

```
rooms = [[1],[2],[3],[]]

图结构：
0 → 1 → 2 → 3

DFS 过程：
dfs(0): visited = {0}
  key 1 → dfs(1): visited = {0, 1}
    key 2 → dfs(2): visited = {0, 1, 2}
      key 3 → dfs(3): visited = {0, 1, 2, 3}

visited.size = 4 = n
返回 true
```

```
rooms = [[1,3],[3,0,1],[2],[0]]

图结构：
0 → 1, 0 → 3
1 → 3, 1 → 0, 1 → 1
2 → 2
3 → 0

从 0 可达：0, 1, 3
不可达：2

返回 false
```

## 变体：返回无法访问的房间

```typescript
function cannotVisitRooms(rooms: number[][]): number[] {
  const n = rooms.length;
  const visited = new Set<number>();
  
  function dfs(room: number): void {
    visited.add(room);
    for (const key of rooms[room]) {
      if (!visited.has(key)) {
        dfs(key);
      }
    }
  }
  
  dfs(0);
  
  const unreachable: number[] = [];
  for (let i = 0; i < n; i++) {
    if (!visited.has(i)) {
      unreachable.push(i);
    }
  }
  
  return unreachable;
}
```

## 与图遍历的关系

这道题实际上是判断图的连通性：

```typescript
// rooms 就是邻接表
// rooms[i] = 从房间 i 可以到达的房间列表

// 问题转化为：从节点 0 出发，能否遍历整个图
```

## 相关题目

| 题目 | 说明 |
|------|------|
| [547. 省份数量](https://leetcode.cn/problems/number-of-provinces/) | 连通分量 |
| [133. 克隆图](https://leetcode.cn/problems/clone-graph/) | 图遍历 |
| [797. 所有可能的路径](https://leetcode.cn/problems/all-paths-from-source-to-target/) | 图路径 |

## 总结

钥匙和房间的要点：

1. **问题转化**：房间 = 节点，钥匙 = 边
2. **本质**：从节点 0 判断图的可达性
3. **方法**：DFS 或 BFS 遍历
4. **判断条件**：visited.size === n

这是一道很好的图遍历入门题。
