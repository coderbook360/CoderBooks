# 完全平方数

LeetCode 279. Perfect Squares

## 题目描述

给你一个整数 n，返回和为 n 的完全平方数的最少数量。

完全平方数是一个整数，其值等于另一个整数的平方，如 1, 4, 9, 16...

## 示例

```
输入：n = 12
输出：3
解释：12 = 4 + 4 + 4

输入：n = 13
输出：2
解释：13 = 4 + 9
```

## 思路分析

这道题可以用动态规划，但用 BFS 的视角更容易理解：

把问题转化为图：
- 节点：0 到 n 的每个数
- 边：如果 a + k² = b，则 a 到 b 有一条边
- 目标：从 0 到 n 的最短路径

```
从 0 开始：
  0 + 1² = 1
  0 + 2² = 4
  0 + 3² = 9
  ...

从 1 开始：
  1 + 1² = 2
  1 + 2² = 5
  ...
```

BFS 找到 n 时的层数就是答案。

## 代码实现

```typescript
function numSquares(n: number): number {
  // 预计算所有可用的完全平方数
  const squares: number[] = [];
  for (let i = 1; i * i <= n; i++) {
    squares.push(i * i);
  }
  
  // BFS
  const visited = new Set<number>([0]);
  const queue: number[] = [0];
  let steps = 0;
  
  while (queue.length > 0) {
    steps++;
    const size = queue.length;
    
    for (let i = 0; i < size; i++) {
      const curr = queue.shift()!;
      
      for (const sq of squares) {
        const next = curr + sq;
        
        if (next === n) return steps;
        
        if (next < n && !visited.has(next)) {
          visited.add(next);
          queue.push(next);
        }
      }
    }
  }
  
  return steps;
}
```

## 执行过程

以 n = 12 为例：

```
可用完全平方数：[1, 4, 9]

第 1 步（从 0 出发）：
  0 + 1 = 1
  0 + 4 = 4
  0 + 9 = 9
  queue = [1, 4, 9]

第 2 步：
  1 + 1 = 2, 1 + 4 = 5, 1 + 9 = 10
  4 + 1 = 5(已访问), 4 + 4 = 8, 4 + 9 = 13(超出)
  9 + 1 = 10(已访问), 9 + 4 = 13(超出)
  queue = [2, 5, 10, 8]

第 3 步：
  2 + 1 = 3, 2 + 4 = 6, 2 + 9 = 11
  5 + 1 = 6(已访问), 5 + 4 = 9(已访问)
  10 + 1 = 11(已访问)
  8 + 1 = 9(已访问), 8 + 4 = 12 ✓

找到 12，返回 3
```

## 优化：双向 BFS

从 0 和 n 两端同时搜索：

```typescript
function numSquares(n: number): number {
  const squares: number[] = [];
  for (let i = 1; i * i <= n; i++) {
    squares.push(i * i);
  }
  
  // 特殊情况：n 本身就是完全平方数
  if (squares.includes(n)) return 1;
  
  let front = new Set<number>([0]);
  let back = new Set<number>([n]);
  const visited = new Set<number>([0, n]);
  let steps = 0;
  
  while (front.size > 0 && back.size > 0) {
    steps++;
    
    // 选择较小的集合扩展
    if (front.size > back.size) {
      [front, back] = [back, front];
    }
    
    const nextFront = new Set<number>();
    
    for (const curr of front) {
      for (const sq of squares) {
        const next = curr + sq;
        
        // 两端相遇
        if (back.has(next)) return steps;
        
        if (next < n && !visited.has(next)) {
          visited.add(next);
          nextFront.add(next);
        }
      }
    }
    
    front = nextFront;
  }
  
  return steps;
}
```

## 动态规划解法对比

```typescript
function numSquaresDP(n: number): number {
  const dp = new Array(n + 1).fill(Infinity);
  dp[0] = 0;
  
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j * j <= i; j++) {
      dp[i] = Math.min(dp[i], dp[i - j * j] + 1);
    }
  }
  
  return dp[n];
}
```

BFS 和 DP 的关系：
- BFS 是从起点向终点搜索
- DP 是计算所有子问题
- BFS 可能更早找到答案（不用计算所有值）
- DP 更适合需要多次查询的场景

## 复杂度分析

- **时间复杂度**：O(n × √n)
  - 最多访问 n 个节点
  - 每个节点最多 √n 条边
- **空间复杂度**：O(n)

## 相关题目

| 题号 | 题目 | 难度 |
|------|------|------|
| 279 | 完全平方数 | 中等 |
| 322 | 零钱兑换 | 中等 |
| 127 | 单词接龙 | 困难 |
| 752 | 打开转盘锁 | 中等 |
