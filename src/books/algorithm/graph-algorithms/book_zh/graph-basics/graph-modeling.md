# 图论问题建模思维

## 为什么需要建模？

很多问题表面上看不是图论问题，但可以通过**建模**转化为图论问题：

- 网格搜索 → 隐式图遍历
- 字符串转换 → 图的最短路径
- 状态变化 → 状态图遍历
- 依赖关系 → 拓扑排序

建模的核心：**识别出顶点和边**。

## 建模三要素

### 1. 顶点是什么？

顶点代表**状态**或**对象**：
- 位置（坐标、格子）
- 状态（字符串、数字组合）
- 实体（人、城市、课程）

### 2. 边是什么？

边代表**关系**或**转换**：
- 相邻关系（网格中上下左右）
- 可达关系（一步能变换到）
- 依赖关系（A 必须在 B 之前）

### 3. 边的权重？

- 无权：只关心连通性或最少步数
- 有权：关心最小代价或最大收益

## 常见建模模式

### 模式一：网格图

**问题特征**：二维数组，上下左右移动

**建模方式**：
- 顶点：每个格子 (i, j)
- 边：相邻且可通行的格子之间

```typescript
// 网格图不需要显式建图
const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];

function getNeighbors(grid: number[][], i: number, j: number): Array<[number, number]> {
  const m = grid.length, n = grid[0].length;
  const neighbors: Array<[number, number]> = [];
  
  for (const [di, dj] of dirs) {
    const ni = i + di, nj = j + dj;
    if (ni >= 0 && ni < m && nj >= 0 && nj < n && grid[ni][nj] !== 0) {
      neighbors.push([ni, nj]);
    }
  }
  
  return neighbors;
}
```

**典型题目**：
- 岛屿数量（LeetCode 200）
- 岛屿的最大面积（LeetCode 695）
- 01 矩阵（LeetCode 542）

### 模式二：状态图

**问题特征**：从初始状态到目标状态，每次可以做某种变换

**建模方式**：
- 顶点：每个可能的状态
- 边：一次变换能到达的状态之间

```typescript
// 例：打开转盘锁
// 顶点：4位数字组合 "0000" ~ "9999"
// 边：拨动一位得到的相邻状态

function getNextStates(state: string): string[] {
  const result: string[] = [];
  const arr = state.split('');
  
  for (let i = 0; i < 4; i++) {
    const original = arr[i];
    
    // 向上拨
    arr[i] = String((parseInt(original) + 1) % 10);
    result.push(arr.join(''));
    
    // 向下拨
    arr[i] = String((parseInt(original) + 9) % 10);
    result.push(arr.join(''));
    
    arr[i] = original;  // 还原
  }
  
  return result;
}
```

**典型题目**：
- 打开转盘锁（LeetCode 752）
- 单词接龙（LeetCode 127）
- 滑动谜题（LeetCode 773）

### 模式三：依赖图

**问题特征**：某些任务有先后顺序或依赖关系

**建模方式**：
- 顶点：每个任务/课程
- 边：依赖关系（A→B 表示 A 是 B 的前置）

```typescript
// 课程表
// prerequisites[i] = [a, b] 表示学 a 之前必须学 b
// 即 b → a

function buildDependencyGraph(n: number, prerequisites: number[][]): number[][] {
  const graph: number[][] = Array.from({ length: n }, () => []);
  
  for (const [course, prereq] of prerequisites) {
    graph[prereq].push(course);  // prereq → course
  }
  
  return graph;
}
```

**典型题目**：
- 课程表（LeetCode 207）
- 课程表 II（LeetCode 210）
- 火星词典（LeetCode 269）

### 模式四：隐式图

**问题特征**：节点和边都是隐式定义的

**特点**：
- 不预先构建完整的图
- 在搜索过程中动态生成邻居

```typescript
// 例：完全平方数
// 顶点：0 到 n 的所有整数
// 边：相差一个完全平方数的两个数
// n → n - 1², n - 2², n - 3², ...

function numSquares(n: number): number {
  const squares: number[] = [];
  for (let i = 1; i * i <= n; i++) {
    squares.push(i * i);
  }
  
  const visited = new Set<number>([n]);
  const queue: number[] = [n];
  let steps = 0;
  
  while (queue.length > 0) {
    steps++;
    const size = queue.length;
    
    for (let i = 0; i < size; i++) {
      const curr = queue.shift()!;
      
      for (const sq of squares) {
        const next = curr - sq;
        if (next === 0) return steps;
        if (next > 0 && !visited.has(next)) {
          visited.add(next);
          queue.push(next);
        }
      }
    }
  }
  
  return steps;
}
```

### 模式五：转换图

**问题特征**：字符串/数组之间的转换

**建模方式**：
- 顶点：每个可能的字符串/状态
- 边：一次操作可以转换的字符串之间

```typescript
// 单词接龙
// 顶点：词表中的单词
// 边：只差一个字母的单词之间

function buildWordGraph(wordList: string[]): Map<string, string[]> {
  const graph = new Map<string, string[]>();
  const n = wordList[0].length;
  
  // 使用通配符模式
  const patterns = new Map<string, string[]>();
  
  for (const word of wordList) {
    for (let i = 0; i < n; i++) {
      const pattern = word.slice(0, i) + '*' + word.slice(i + 1);
      if (!patterns.has(pattern)) patterns.set(pattern, []);
      patterns.get(pattern)!.push(word);
    }
  }
  
  for (const word of wordList) {
    graph.set(word, []);
    for (let i = 0; i < n; i++) {
      const pattern = word.slice(0, i) + '*' + word.slice(i + 1);
      for (const neighbor of patterns.get(pattern)!) {
        if (neighbor !== word) {
          graph.get(word)!.push(neighbor);
        }
      }
    }
  }
  
  return graph;
}
```

## 建模实战流程

### Step 1：理解问题

- 起点是什么？
- 终点是什么？
- 可以做什么操作？
- 目标是什么（最短路径、是否可达、所有路径）？

### Step 2：识别顶点

- 状态如何表示？
- 状态空间有多大？

### Step 3：识别边

- 从一个状态到另一个状态的条件？
- 边是有向还是无向？
- 边有权重吗？

### Step 4：选择算法

| 目标 | 图类型 | 算法 |
|------|--------|------|
| 是否可达 | 任意 | DFS/BFS |
| 最少步数 | 无权 | BFS |
| 最短路径 | 有权 | Dijkstra/Bellman-Ford |
| 所有路径 | 任意 | DFS 回溯 |
| 能否完成 | 有向 | 拓扑排序/环检测 |
| 连通分量 | 无向 | DFS/并查集 |

## 建模技巧

### 1. 虚拟节点

添加一个虚拟起点或终点简化问题。

```typescript
// 多源 BFS：添加虚拟起点连接所有源点
// 等价于将所有源点同时入队
```

### 2. 分层图

同一个物理位置，不同状态作为不同节点。

```typescript
// 例：带钥匙的迷宫
// 节点：(x, y, keyState)
// keyState 用位掩码表示持有的钥匙
```

### 3. 预处理

预先计算边的关系，避免重复计算。

```typescript
// 单词接龙：预处理通配符模式
// h*t → hot, hat, hit, ...
```

### 4. 状态压缩

用整数表示复杂状态。

```typescript
// 八数码：用 9 位数表示状态
// [1,2,3,4,5,6,7,8,0] → "123456780"
```

## 常见陷阱

### 1. 忘记无向图的双向边

```typescript
// 错误
graph[u].push(v);

// 正确
graph[u].push(v);
graph[v].push(u);
```

### 2. 边的方向搞反

```typescript
// prerequisites[i] = [a, b] 表示 b 是 a 的前置
// 边应该是 b → a，不是 a → b
```

### 3. 状态空间爆炸

某些问题状态空间太大，需要剪枝或换算法。

### 4. 重复访问

忘记标记已访问状态，导致死循环或超时。

## 总结

图论建模的核心：

1. **万物皆可图**：识别顶点和边
2. **状态即顶点**：位置、字符串、数字组合都可以是顶点
3. **转换即边**：一步操作能到达的状态之间连边
4. **选对算法**：根据目标选择 DFS、BFS、Dijkstra 等

建模能力来自练习，多做题、多总结。
