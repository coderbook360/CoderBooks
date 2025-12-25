# 迷宫中离入口最近的出口

LeetCode 1926. Nearest Exit from Entrance in Maze

## 题目描述

给你一个 m x n 的迷宫矩阵 `maze`（下标从 0 开始），矩阵中有空格子（'.'）和墙（'+'）。同时给你迷宫的入口 `entrance`。

每一步中，你可以往上、下、左、右四个方向移动一步。你不能移动到墙所在的格子。

请你返回从入口到最近出口的最短路径的步数。如果不存在这样的路径，返回 -1。

**出口**定义为：在迷宫**边界**上的空格子。入口不算作出口。

## 示例

```
输入：maze = [["+","+",".","+"],[".",".",".","+"],["+","+","+","."]]
entrance = [1,2]

+ + . +
. . . +    入口：(1,2)
+ + + .

输出：1
解释：从 (1,2) 向下走到 (2,2) 是边界出口，但那是墙。
      从 (1,2) 向上走到 (0,2) 是边界出口，距离 1。
```

## 思路分析

标准的 BFS 最短路问题：
- 起点：entrance
- 终点：边界上的任意空格子（不含入口）
- 障碍：墙（'+'）

## 代码实现

```typescript
function nearestExit(maze: string[][], entrance: number[]): number {
  const m = maze.length, n = maze[0].length;
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const [startI, startJ] = entrance;
  
  // 标记入口为已访问
  maze[startI][startJ] = '+';
  const queue: Array<[number, number]> = [[startI, startJ]];
  let steps = 0;
  
  while (queue.length > 0) {
    steps++;
    const size = queue.length;
    
    for (let k = 0; k < size; k++) {
      const [i, j] = queue.shift()!;
      
      for (const [di, dj] of dirs) {
        const ni = i + di, nj = j + dj;
        
        // 越界或者是墙
        if (ni < 0 || ni >= m || nj < 0 || nj >= n || maze[ni][nj] === '+') {
          continue;
        }
        
        // 是否是出口（边界上的空格子）
        if (ni === 0 || ni === m - 1 || nj === 0 || nj === n - 1) {
          return steps;
        }
        
        // 标记为已访问并入队
        maze[ni][nj] = '+';
        queue.push([ni, nj]);
      }
    }
  }
  
  return -1;
}
```

## 执行过程

```
maze = [["+","+",".","+"],[".",".",".","+"],["+","+","+","."]]
entrance = [1,2]

初始：标记 (1,2) 为访问，queue = [(1,2)]

步骤 1：
  从 (1,2) 扩展：
  - (0,2): 空格，在边界上 → 是出口！返回 1

返回 1
```

## 另一个例子

```
maze = [["+",".","+","+","+","+","+"],
        ["+",".","+",".",".",".","+"],
        ["+",".","+",".","+",".","+"],
        ["+",".",".",".","+",".","+"],
        ["+","+","+","+","+",".","+"],
        ["+","+","+","+","+",".","+"],
        ["+","+","+","+","+",".","."],]
entrance = [0,1]

+ . + + + + +
+ . + . . . +    入口：(0,1)
+ . + . + . +
+ . . . + . +
+ + + + + . +
+ + + + + . +
+ + + + + . .

从 (0,1) 出发，需要走一条弯曲的路径才能到达 (6,6)
```

## 不修改原数组的版本

```typescript
function nearestExit(maze: string[][], entrance: number[]): number {
  const m = maze.length, n = maze[0].length;
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const [startI, startJ] = entrance;
  
  const visited = new Set<string>();
  visited.add(`${startI},${startJ}`);
  const queue: Array<[number, number]> = [[startI, startJ]];
  let steps = 0;
  
  while (queue.length > 0) {
    steps++;
    const size = queue.length;
    
    for (let k = 0; k < size; k++) {
      const [i, j] = queue.shift()!;
      
      for (const [di, dj] of dirs) {
        const ni = i + di, nj = j + dj;
        const key = `${ni},${nj}`;
        
        if (ni < 0 || ni >= m || nj < 0 || nj >= n 
            || maze[ni][nj] === '+' || visited.has(key)) {
          continue;
        }
        
        if (ni === 0 || ni === m - 1 || nj === 0 || nj === n - 1) {
          return steps;
        }
        
        visited.add(key);
        queue.push([ni, nj]);
      }
    }
  }
  
  return -1;
}
```

## 边界情况

```typescript
// 入口就在边界但不算出口
maze = [[".","+"],["+","+"]]
entrance = [0,0]
// 返回 -1（没有其他出口）

// 所有边界都被墙堵住
maze = [["+","+","+"],["+",".","+"],["+"，"+","+"]]
entrance = [1,1]
// 返回 -1
```

## 复杂度分析

- **时间复杂度**：O(m × n)，每个格子最多访问一次
- **空间复杂度**：O(m × n)，队列最坏情况

## 相关题目

| 题号 | 题目 | 难度 |
|------|------|------|
| 1926 | 迷宫中离入口最近的出口 | 中等 |
| 490 | 迷宫 | 中等 |
| 505 | 迷宫 II | 中等 |
| 499 | 迷宫 III | 困难 |
| 1091 | 二进制矩阵中的最短路径 | 中等 |
