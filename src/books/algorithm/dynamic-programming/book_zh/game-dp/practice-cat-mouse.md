# 实战：猫和老鼠

## 题目描述

两个玩家在一张无向图上进行游戏。老鼠在节点 1，猫在节点 2，老鼠先走。

规则：
- 老鼠想到达节点 0（洞）
- 猫想抓住老鼠（走到老鼠所在节点）
- 猫不能进入节点 0
- 每回合玩家必须移动到相邻节点或停留原地
- 如果游戏进行了太久（超过 2n 回合），判定为平局

返回：1 表示老鼠获胜，2 表示猫获胜，0 表示平局。

📎 [LeetCode 913. 猫和老鼠](https://leetcode.cn/problems/cat-and-mouse/)

**示例**：

```
输入：graph = [[2,5],[3],[0,4,5],[1,4,5],[2,3],[0,2,3]]
输出：0
解释：游戏可能无限进行，平局
```

## 问题分析

这是一道复杂的博弈问题：

- **状态**：老鼠位置、猫位置、当前回合
- **终止条件**：老鼠到洞 / 猫抓住老鼠 / 超时平局
- **博弈思想**：老鼠走向必胜态，猫阻止老鼠

## 状态设计

```
dp[mouse][cat][turn] = 在该状态下的游戏结果
  - turn = 0: 老鼠回合
  - turn = 1: 猫回合
```

## 代码实现

### 方法一：记忆化搜索

```typescript
/**
 * 记忆化搜索
 * 时间复杂度：O(n³)
 * 空间复杂度：O(n³)
 */
function catMouseGame(graph: number[][]): number {
  const n = graph.length;
  const MOUSE_WIN = 1;
  const CAT_WIN = 2;
  const DRAW = 0;
  
  // memo[mouse][cat][turn]
  // turn: 0 = 老鼠, 1 = 猫
  const memo: number[][][] = Array.from({ length: n }, () =>
    Array.from({ length: n }, () => new Array(2 * n).fill(-1))
  );
  
  function dfs(mouse: number, cat: number, turn: number): number {
    // 超时：平局
    if (turn >= 2 * n) return DRAW;
    
    // 老鼠到洞
    if (mouse === 0) return MOUSE_WIN;
    
    // 猫抓住老鼠
    if (mouse === cat) return CAT_WIN;
    
    if (memo[mouse][cat][turn] !== -1) {
      return memo[mouse][cat][turn];
    }
    
    if (turn % 2 === 0) {
      // 老鼠回合：尽量让老鼠赢
      let canDraw = false;
      
      for (const next of graph[mouse]) {
        const result = dfs(next, cat, turn + 1);
        if (result === MOUSE_WIN) {
          memo[mouse][cat][turn] = MOUSE_WIN;
          return MOUSE_WIN;
        }
        if (result === DRAW) canDraw = true;
      }
      
      memo[mouse][cat][turn] = canDraw ? DRAW : CAT_WIN;
    } else {
      // 猫回合：尽量让猫赢
      let canDraw = false;
      
      for (const next of graph[cat]) {
        if (next === 0) continue;  // 猫不能进洞
        
        const result = dfs(mouse, next, turn + 1);
        if (result === CAT_WIN) {
          memo[mouse][cat][turn] = CAT_WIN;
          return CAT_WIN;
        }
        if (result === DRAW) canDraw = true;
      }
      
      memo[mouse][cat][turn] = canDraw ? DRAW : MOUSE_WIN;
    }
    
    return memo[mouse][cat][turn];
  }
  
  return dfs(1, 2, 0);
}
```

### 方法二：拓扑排序（反向 BFS）

更高效的做法是从终止状态反向推导：

```typescript
function catMouseGame(graph: number[][]): number {
  const n = graph.length;
  const DRAW = 0, MOUSE_WIN = 1, CAT_WIN = 2;
  
  // result[mouse][cat][turn] = 游戏结果
  // turn: 0 = 老鼠, 1 = 猫
  const result: number[][][] = Array.from({ length: n }, () =>
    Array.from({ length: n }, () => [DRAW, DRAW])
  );
  
  // 出度计数（未确定结果的后继状态数）
  const degree: number[][][] = Array.from({ length: n }, () =>
    Array.from({ length: n }, () => [0, 0])
  );
  
  // 初始化出度
  for (let m = 0; m < n; m++) {
    for (let c = 1; c < n; c++) {
      degree[m][c][0] = graph[m].length;  // 老鼠的移动选择
      
      // 猫的选择（排除洞）
      let catDegree = graph[c].length;
      for (const next of graph[c]) {
        if (next === 0) catDegree--;
      }
      degree[m][c][1] = catDegree;
    }
  }
  
  // 队列：存储已确定结果的状态
  const queue: [number, number, number, number][] = [];
  
  // 初始化终止状态
  for (let c = 1; c < n; c++) {
    // 老鼠在洞里
    result[0][c][0] = MOUSE_WIN;
    result[0][c][1] = MOUSE_WIN;
    queue.push([0, c, 0, MOUSE_WIN]);
    queue.push([0, c, 1, MOUSE_WIN]);
    
    // 猫抓住老鼠
    for (let t = 0; t < 2; t++) {
      result[c][c][t] = CAT_WIN;
      queue.push([c, c, t, CAT_WIN]);
    }
  }
  
  // 反向 BFS
  while (queue.length > 0) {
    const [m, c, t, res] = queue.shift()!;
    
    // 找前驱状态
    const prevTurn = 1 - t;
    
    if (prevTurn === 0) {
      // 前一步是老鼠走
      for (const prevM of graph[m]) {
        if (result[prevM][c][0] !== DRAW) continue;
        
        if (res === MOUSE_WIN) {
          // 老鼠能走到必胜态
          result[prevM][c][0] = MOUSE_WIN;
          queue.push([prevM, c, 0, MOUSE_WIN]);
        } else {
          // 猫赢
          degree[prevM][c][0]--;
          if (degree[prevM][c][0] === 0) {
            result[prevM][c][0] = CAT_WIN;
            queue.push([prevM, c, 0, CAT_WIN]);
          }
        }
      }
    } else {
      // 前一步是猫走
      for (const prevC of graph[c]) {
        if (prevC === 0) continue;
        if (result[m][prevC][1] !== DRAW) continue;
        
        if (res === CAT_WIN) {
          // 猫能走到必胜态
          result[m][prevC][1] = CAT_WIN;
          queue.push([m, prevC, 1, CAT_WIN]);
        } else {
          // 老鼠赢
          degree[m][prevC][1]--;
          if (degree[m][prevC][1] === 0) {
            result[m][prevC][1] = MOUSE_WIN;
            queue.push([m, prevC, 1, MOUSE_WIN]);
          }
        }
      }
    }
  }
  
  return result[1][2][0];
}
```

## 关键思路

### 反向推导的核心

1. **确定终止状态**：老鼠到洞（老鼠赢）、猫抓住老鼠（猫赢）
2. **反向传播**：
   - 如果当前玩家能走到自己的必胜态 → 当前是必胜态
   - 如果所有选择都导致对手必胜 → 当前是必败态
3. **剩余状态是平局**：无法确定胜负的状态

### 出度计数

- 当一个状态的所有后继都确定为对手必胜时，该状态确定为必败
- 使用出度计数追踪未确定的后继数量

## 复杂度分析

| 方法 | 时间 | 空间 |
|-----|------|------|
| 记忆化搜索 | O(n³) | O(n³) |
| 拓扑排序 | O(n³) | O(n²) |

## 本章小结

1. **图上博弈**：状态包括双方位置和回合
2. **三种结果**：胜、负、平局
3. **反向 BFS**：从终止状态反推，效率更高
4. **出度计数**：追踪未确定状态数量

这是博弈 DP 中最难的题目之一，融合了图论和博弈论。

## 相关题目

- [1728. 猫和老鼠 II](https://leetcode.cn/problems/cat-and-mouse-ii/)
