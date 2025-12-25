# BFS 的层次遍历特性

## 什么是层次遍历？

BFS 天然具有层次结构：第一层是起点，第二层是距离起点为 1 的节点，第三层是距离为 2 的节点...

```
       0          ← 第 0 层
      / \
     1   2        ← 第 1 层
    / \   \
   3   4   5      ← 第 2 层
```

## 层次遍历的实现

关键：在每一轮循环开始时，记录当前队列的大小。

```typescript
function bfsLevelOrder(graph: number[][], start: number): number[][] {
  const visited = new Set<number>([start]);
  const queue: number[] = [start];
  const levels: number[][] = [];
  
  while (queue.length > 0) {
    const levelSize = queue.length;  // 当前层的节点数
    const currentLevel: number[] = [];
    
    for (let i = 0; i < levelSize; i++) {
      const node = queue.shift()!;
      currentLevel.push(node);
      
      for (const neighbor of graph[node]) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push(neighbor);
        }
      }
    }
    
    levels.push(currentLevel);
  }
  
  return levels;
}
```

## 为什么这样可以分层？

```
初始：queue = [0]

处理第 0 层：
  levelSize = 1
  处理节点 0，将邻居 1, 2 入队
  queue = [1, 2]
  第 0 层 = [0]

处理第 1 层：
  levelSize = 2
  处理节点 1，将邻居入队
  处理节点 2，将邻居入队
  queue = [3, 4, 5]
  第 1 层 = [1, 2]

处理第 2 层：
  levelSize = 3
  ...
  第 2 层 = [3, 4, 5]
```

关键洞察：
- 处理当前层时，下一层的节点会入队
- 但在循环开始时已经记录了当前层的大小
- 所以只会处理当前层的节点，不会越界到下一层

## 应用：二叉树层序遍历

```typescript
class TreeNode {
  val: number;
  left: TreeNode | null;
  right: TreeNode | null;
}

function levelOrder(root: TreeNode | null): number[][] {
  if (!root) return [];
  
  const result: number[][] = [];
  const queue: TreeNode[] = [root];
  
  while (queue.length > 0) {
    const levelSize = queue.length;
    const currentLevel: number[] = [];
    
    for (let i = 0; i < levelSize; i++) {
      const node = queue.shift()!;
      currentLevel.push(node.val);
      
      if (node.left) queue.push(node.left);
      if (node.right) queue.push(node.right);
    }
    
    result.push(currentLevel);
  }
  
  return result;
}
```

## 应用：计算最短距离

层次 = 距离，所以 BFS 天然可以计算最短距离：

```typescript
function shortestPath(graph: number[][], start: number, end: number): number {
  if (start === end) return 0;
  
  const visited = new Set<number>([start]);
  const queue: number[] = [start];
  let distance = 0;
  
  while (queue.length > 0) {
    distance++;
    const levelSize = queue.length;
    
    for (let i = 0; i < levelSize; i++) {
      const node = queue.shift()!;
      
      for (const neighbor of graph[node]) {
        if (neighbor === end) return distance;
        
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push(neighbor);
        }
      }
    }
  }
  
  return -1;
}
```

## 应用：找到第 K 层的所有节点

```typescript
function getNodesAtLevel(graph: number[][], start: number, k: number): number[] {
  const visited = new Set<number>([start]);
  const queue: number[] = [start];
  let level = 0;
  
  while (queue.length > 0 && level < k) {
    const levelSize = queue.length;
    
    for (let i = 0; i < levelSize; i++) {
      const node = queue.shift()!;
      
      for (const neighbor of graph[node]) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push(neighbor);
        }
      }
    }
    
    level++;
  }
  
  return level === k ? [...queue] : [];
}
```

## 变体：按层逆序输出

```typescript
function levelOrderBottom(root: TreeNode | null): number[][] {
  const levels = levelOrder(root);  // 使用之前的函数
  return levels.reverse();
}
```

## 变体：锯齿形层序遍历

```typescript
function zigzagLevelOrder(root: TreeNode | null): number[][] {
  if (!root) return [];
  
  const result: number[][] = [];
  const queue: TreeNode[] = [root];
  let leftToRight = true;
  
  while (queue.length > 0) {
    const levelSize = queue.length;
    const currentLevel: number[] = [];
    
    for (let i = 0; i < levelSize; i++) {
      const node = queue.shift()!;
      
      // 根据方向决定插入位置
      if (leftToRight) {
        currentLevel.push(node.val);
      } else {
        currentLevel.unshift(node.val);
      }
      
      if (node.left) queue.push(node.left);
      if (node.right) queue.push(node.right);
    }
    
    result.push(currentLevel);
    leftToRight = !leftToRight;
  }
  
  return result;
}
```

## 网格 BFS 的层次遍历

```typescript
// 计算从起点到所有格子的最短距离
function shortestDistanceGrid(grid: number[][], startI: number, startJ: number): number[][] {
  const m = grid.length, n = grid[0].length;
  const dist: number[][] = Array.from({ length: m }, () => Array(n).fill(-1));
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  
  dist[startI][startJ] = 0;
  const queue: Array<[number, number]> = [[startI, startJ]];
  
  while (queue.length > 0) {
    const [i, j] = queue.shift()!;
    
    for (const [di, dj] of dirs) {
      const ni = i + di, nj = j + dj;
      
      if (ni >= 0 && ni < m && nj >= 0 && nj < n 
          && dist[ni][nj] === -1 && grid[ni][nj] !== 0) {
        dist[ni][nj] = dist[i][j] + 1;
        queue.push([ni, nj]);
      }
    }
  }
  
  return dist;
}
```

## 常见问题

### Q1: 为什么不能用 for...of 遍历队列？

```typescript
// 错误！
for (const node of queue) {
  // queue 在循环中被修改，行为未定义
}

// 正确
const size = queue.length;
for (let i = 0; i < size; i++) {
  const node = queue.shift()!;
  // ...
}
```

### Q2: 可以不分层吗？

可以，如果不需要知道层数：

```typescript
// 不分层的 BFS
while (queue.length > 0) {
  const node = queue.shift()!;
  // 处理...
  for (const neighbor of graph[node]) {
    if (!visited.has(neighbor)) {
      visited.add(neighbor);
      queue.push(neighbor);
    }
  }
}
```

但如果要计算距离、输出层次信息，就必须分层。

## 总结

BFS 层次遍历的要点：

1. **分层技巧**：循环开始时记录队列大小
2. **层数 = 距离**：BFS 的层数就是最短距离
3. **应用广泛**：二叉树层序、最短路径、多源 BFS
4. **关键代码**：
   ```typescript
   while (queue.length > 0) {
     const size = queue.length;
     for (let i = 0; i < size; i++) {
       // 处理当前层
     }
     // 这里已经进入下一层
   }
   ```
