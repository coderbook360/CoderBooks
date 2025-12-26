# 实战：可能的二分法

LeetCode 886. Possible Bipartition

## 题目描述

给定 `n` 个人（编号 1 到 n）和一个数组 `dislikes`，其中 `dislikes[i] = [ai, bi]` 表示编号 ai 和 bi 的人互相厌恶。

判断能否将所有人分成两组，使得每组内的人互不厌恶。

**示例**：
```
输入：n = 4, dislikes = [[1,2],[1,3],[2,4]]
输出：true
解释：group1 = [1,4], group2 = [2,3]

输入：n = 3, dislikes = [[1,2],[1,3],[2,3]]
输出：false
解释：三人相互厌恶，无法分组
```

## 与判断二分图的关系

这题本质上是**判断二分图**：
- 每个人是节点
- 厌恶关系是边
- 能分组 ⟺ 图是二分图

**区别**：
| 特性 | 785. Is Bipartite | 886. Possible Bipartition |
|------|-------------------|---------------------------|
| 图的表示 | 邻接表 | 边列表 |
| 节点编号 | 0 到 n-1 | 1 到 n |
| 题意 | 判断二分图 | 判断可分组 |

**本质相同**：都是二分图判定。

## 方法一：BFS 染色

### 代码实现

```typescript
function possibleBipartition(n: number, dislikes: number[][]): boolean {
  // 建图（邻接表）
  const graph: number[][] = Array.from({ length: n + 1 }, () => []);
  for (const [a, b] of dislikes) {
    graph[a].push(b);
    graph[b].push(a);
  }
  
  const color = new Array(n + 1).fill(-1);
  
  for (let start = 1; start <= n; start++) {
    if (color[start] !== -1) continue;
    
    // BFS 染色
    const queue: number[] = [start];
    color[start] = 0;
    
    while (queue.length > 0) {
      const node = queue.shift()!;
      
      for (const neighbor of graph[node]) {
        if (color[neighbor] === -1) {
          color[neighbor] = 1 - color[node];
          queue.push(neighbor);
        } else if (color[neighbor] === color[node]) {
          return false;  // 冲突
        }
      }
    }
  }
  
  return true;
}
```

**时间复杂度**：$O(n + len(dislikes))$  
**空间复杂度**：$O(n + len(dislikes))$

### 执行过程

`n = 4, dislikes = [[1,2],[1,3],[2,4]]`

**建图**：
```
1 -- 2
|    |
3    4
```

**BFS染色**：
1. 从节点1开始，染色为0
2. 邻接节点2和3染色为1
3. 从队列取出2，邻接节点1已染色（OK），4染色为0
4. 从队列取出3，邻接节点1已染色（OK）
5. 染色完成

**结果**：
- 颜色0：{1, 4}
- 颜色1：{2, 3}
- 可以分组 ✅

## 方法二：DFS 染色

### 代码实现

```typescript
function possibleBipartition(n: number, dislikes: number[][]): boolean {
  const graph: number[][] = Array.from({ length: n + 1 }, () => []);
  for (const [a, b] of dislikes) {
    graph[a].push(b);
    graph[b].push(a);
  }
  
  const color = new Array(n + 1).fill(-1);
  
  function dfs(node: number, c: number): boolean {
    color[node] = c;
    
    for (const neighbor of graph[node]) {
      if (color[neighbor] === -1) {
        if (!dfs(neighbor, 1 - c)) {
          return false;
        }
      } else if (color[neighbor] === c) {
        return false;
      }
    }
    
    return true;
  }
  
  for (let i = 1; i <= n; i++) {
    if (color[i] === -1) {
      if (!dfs(i, 0)) {
        return false;
      }
    }
  }
  
  return true;
}
```

**时间复杂度**：$O(n + len(dislikes))$  
**空间复杂度**：$O(n + len(dislikes))$

## 方法三：并查集

### 核心思路

对于每个人，维护：
- 朋友集合
- 敌人集合

**规则**：
- 我的敌人 = 我厌恶的人
- 我的敌人的敌人 = 我的朋友

### 代码实现

```typescript
class UnionFind {
  parent: number[];
  
  constructor(n: number) {
    this.parent = Array.from({ length: n }, (_, i) => i);
  }
  
  find(x: number): number {
    if (this.parent[x] !== x) {
      this.parent[x] = this.find(this.parent[x]);
    }
    return this.parent[x];
  }
  
  union(x: number, y: number): void {
    const rootX = this.find(x);
    const rootY = this.find(y);
    if (rootX !== rootY) {
      this.parent[rootX] = rootY;
    }
  }
  
  isConnected(x: number, y: number): boolean {
    return this.find(x) === this.find(y);
  }
}

function possibleBipartition(n: number, dislikes: number[][]): boolean {
  // 建图
  const graph: number[][] = Array.from({ length: n + 1 }, () => []);
  for (const [a, b] of dislikes) {
    graph[a].push(b);
    graph[b].push(a);
  }
  
  const uf = new UnionFind(n + 1);
  
  for (let i = 1; i <= n; i++) {
    if (graph[i].length === 0) continue;
    
    // 如果我和我的敌人在同一组 → 失败
    if (uf.isConnected(i, graph[i][0])) {
      return false;
    }
    
    // 将我的所有敌人合并到一组
    for (let j = 1; j < graph[i].length; j++) {
      uf.union(graph[i][0], graph[i][j]);
    }
  }
  
  return true;
}
```

**时间复杂度**：$O((n + m) \alpha(n))$  
**空间复杂度**：$O(n + m)$

## 与相似题目对比

### LeetCode 785 vs 886

| 题目 | 输入 | 节点编号 | 难度 |
|------|------|---------|------|
| 785. Is Graph Bipartite | 邻接表 | 0~n-1 | Medium |
| 886. Possible Bipartition | 边列表 | 1~n | Medium |

**代码区别**：
```typescript
// 785: 图已给定
function isBipartite(graph: number[][]): boolean {
  // 直接使用 graph
}

// 886: 需要建图
function possibleBipartition(n: number, dislikes: number[][]): boolean {
  // 先建图
  const graph: number[][] = Array.from({ length: n + 1 }, () => []);
  for (const [a, b] of dislikes) {
    graph[a].push(b);
    graph[b].push(a);
  }
  // 然后判定
}
```

## 常见错误

### 1. 节点编号错误

```typescript
// ❌ 错误：节点从1开始，不是0
const graph: number[][] = Array.from({ length: n }, () => []);

// ✅ 正确：需要 n+1 个位置
const graph: number[][] = Array.from({ length: n + 1 }, () => []);
```

### 2. 忘记检查孤立节点

```typescript
// 对于没有厌恶关系的人，也需要染色
for (let i = 1; i <= n; i++) {  // ✅ 所有节点
  if (color[i] === -1) {
    // BFS/DFS
  }
}
```

### 3. 边的方向

```typescript
// 厌恶关系是双向的
for (const [a, b] of dislikes) {
  graph[a].push(b);
  graph[b].push(a);  // ✅ 别忘了反向边
}
```

## 扩展：输出分组方案

```typescript
function getBipartition(n: number, dislikes: number[][]): number[][] | null {
  const graph: number[][] = Array.from({ length: n + 1 }, () => []);
  for (const [a, b] of dislikes) {
    graph[a].push(b);
    graph[b].push(a);
  }
  
  const color = new Array(n + 1).fill(-1);
  
  for (let start = 1; start <= n; start++) {
    if (color[start] !== -1) continue;
    
    const queue = [start];
    color[start] = 0;
    
    while (queue.length > 0) {
      const node = queue.shift()!;
      
      for (const neighbor of graph[node]) {
        if (color[neighbor] === -1) {
          color[neighbor] = 1 - color[node];
          queue.push(neighbor);
        } else if (color[neighbor] === color[node]) {
          return null;  // 无法分组
        }
      }
    }
  }
  
  // 生成分组
  const group0: number[] = [];
  const group1: number[] = [];
  
  for (let i = 1; i <= n; i++) {
    if (color[i] === 0) {
      group0.push(i);
    } else {
      group1.push(i);
    }
  }
  
  return [group0, group1];
}

// 使用
const result = getBipartition(4, [[1,2],[1,3],[2,4]]);
console.log(result);  // [[1, 4], [2, 3]]
```

## 实战应用

### 会议室分配

将 n 个会议分配到两个会议室，冲突的会议不能在同一个室：

```typescript
function allocateMeetingRooms(n: number, conflicts: number[][]): boolean {
  const graph: number[][] = Array.from({ length: n + 1 }, () => []);
  
  for (const [a, b] of conflicts) {
    graph[a].push(b);
    graph[b].push(a);
  }
  
  const color = new Array(n + 1).fill(-1);
  
  for (let i = 1; i <= n; i++) {
    if (color[i] !== -1) continue;
    
    const queue = [i];
    color[i] = 0;
    
    while (queue.length > 0) {
      const node = queue.shift()!;
      
      for (const neighbor of graph[node]) {
        if (color[neighbor] === -1) {
          color[neighbor] = 1 - color[node];
          queue.push(neighbor);
        } else if (color[neighbor] === color[node]) {
          return false;
        }
      }
    }
  }
  
  return true;
}
```

### 团队分组

将员工分成两个团队，有矛盾的员工不能同组：

```typescript
interface Employee {
  id: number;
  conflicts: number[];
}

function divideIntoTeams(employees: Employee[]): number[][] | null {
  const n = employees.length;
  const idToIndex = new Map<number, number>();
  employees.forEach((emp, i) => idToIndex.set(emp.id, i));
  
  const graph: number[][] = Array.from({ length: n }, () => []);
  
  for (let i = 0; i < n; i++) {
    for (const conflictId of employees[i].conflicts) {
      const j = idToIndex.get(conflictId);
      if (j !== undefined) {
        graph[i].push(j);
      }
    }
  }
  
  const color = new Array(n).fill(-1);
  
  for (let start = 0; start < n; start++) {
    if (color[start] !== -1) continue;
    
    const queue = [start];
    color[start] = 0;
    
    while (queue.length > 0) {
      const node = queue.shift()!;
      
      for (const neighbor of graph[node]) {
        if (color[neighbor] === -1) {
          color[neighbor] = 1 - color[node];
          queue.push(neighbor);
        } else if (color[neighbor] === color[node]) {
          return null;
        }
      }
    }
  }
  
  const team0: number[] = [];
  const team1: number[] = [];
  
  for (let i = 0; i < n; i++) {
    if (color[i] === 0) {
      team0.push(employees[i].id);
    } else {
      team1.push(employees[i].id);
    }
  }
  
  return [team0, team1];
}
```

## 总结

**核心知识**：
1. 分组问题 = 二分图判定
2. BFS/DFS 染色
3. 注意节点编号（1 到 n）

**算法选择**：
- **BFS**：最直观
- **DFS**：递归简洁
- **并查集**：适合动态图

**常见陷阱**：
- 节点编号从1开始
- 需要建图（边列表 → 邻接表）
- 边是双向的

**应用场景**：
- 会议室分配
- 团队分组
- 冲突检测

二分图判定是图论基础，务必掌握！
