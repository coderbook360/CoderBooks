# 打开转盘锁

LeetCode 752. Open the Lock

## 题目描述

你有一个带有四个圆形拨轮的转盘锁。每个拨轮都有 10 个数字：'0' 到 '9'。每个拨轮可以自由旋转（向上或向下）。

给定一个死亡数字列表 `deadends`，一旦拨轮转到这些数字，锁就会永久锁定。

给定解锁密码 `target`，返回从 "0000" 开始到达 `target` 的最少旋转次数。如果无法到达，返回 -1。

## 示例

```
输入：deadends = ["0201","0101","0102","1212","2002"], target = "0202"
输出：6
解释：
可能的移动序列为 "0000" -> "1000" -> "1100" -> "1200" -> "1201" -> "1202" -> "0202"
```

## 思路分析

把问题建模为图：
- 节点：每个 4 位数字组合（共 10000 个）
- 边：两个数字只有一位相差 1 的节点之间有边
- 障碍：deadends 中的节点不可访问
- 目标：从 "0000" 到 target 的最短路径

这是典型的 BFS 最短路问题。

## 代码实现

```typescript
function openLock(deadends: string[], target: string): number {
  const dead = new Set(deadends);
  
  // 边界情况
  if (dead.has('0000')) return -1;
  if (target === '0000') return 0;
  
  const visited = new Set<string>(['0000']);
  const queue: string[] = ['0000'];
  let steps = 0;
  
  while (queue.length > 0) {
    steps++;
    const size = queue.length;
    
    for (let i = 0; i < size; i++) {
      const curr = queue.shift()!;
      
      // 生成所有相邻状态
      for (const next of getNeighbors(curr)) {
        if (next === target) return steps;
        
        if (!visited.has(next) && !dead.has(next)) {
          visited.add(next);
          queue.push(next);
        }
      }
    }
  }
  
  return -1;
}

function getNeighbors(state: string): string[] {
  const result: string[] = [];
  const chars = state.split('');
  
  for (let i = 0; i < 4; i++) {
    const digit = parseInt(chars[i]);
    
    // 向上拨
    chars[i] = String((digit + 1) % 10);
    result.push(chars.join(''));
    
    // 向下拨
    chars[i] = String((digit + 9) % 10);  // +9 等于 -1 (mod 10)
    result.push(chars.join(''));
    
    // 恢复
    chars[i] = String(digit);
  }
  
  return result;
}
```

## 执行过程

```
target = "0202", dead = ["0201","0101","0102","1212","2002"]

从 "0000" 开始：
步骤 1：
  "0000" 的邻居：
  "1000", "9000", "0100", "0900", "0010", "0090", "0001", "0009"
  
步骤 2：
  从 "1000" 扩展：
  "2000", "0000"(已访问), "1100", "1900", "1010", "1090", "1001", "1009"
  ...

经过 6 步到达 "0202"
```

## 优化：双向 BFS

从起点和终点同时搜索，相遇时返回：

```typescript
function openLock(deadends: string[], target: string): number {
  const dead = new Set(deadends);
  
  if (dead.has('0000')) return -1;
  if (target === '0000') return 0;
  
  let front = new Set<string>(['0000']);
  let back = new Set<string>([target]);
  const visited = new Set<string>(['0000', target]);
  let steps = 0;
  
  while (front.size > 0 && back.size > 0) {
    steps++;
    
    // 选择较小的集合扩展（优化）
    if (front.size > back.size) {
      [front, back] = [back, front];
    }
    
    const nextFront = new Set<string>();
    
    for (const curr of front) {
      for (const next of getNeighbors(curr)) {
        // 两端相遇
        if (back.has(next)) return steps;
        
        if (!visited.has(next) && !dead.has(next)) {
          visited.add(next);
          nextFront.add(next);
        }
      }
    }
    
    front = nextFront;
  }
  
  return -1;
}
```

双向 BFS 的优势：
- 单向 BFS：扩展的节点数约为 b^d（b 是分支因子，d 是深度）
- 双向 BFS：扩展的节点数约为 2 × b^(d/2)
- 当 b = 8, d = 6 时：单向约 262144，双向约 512

## 代码简化

使用更简洁的邻居生成：

```typescript
function* getNeighbors(state: string): Generator<string> {
  for (let i = 0; i < 4; i++) {
    const d = parseInt(state[i]);
    
    // 向上拨
    yield state.slice(0, i) + String((d + 1) % 10) + state.slice(i + 1);
    
    // 向下拨
    yield state.slice(0, i) + String((d + 9) % 10) + state.slice(i + 1);
  }
}
```

## 边界情况

```typescript
// 起点就是死亡数字
openLock(["0000"], "8888")  // 返回 -1

// 起点就是目标
openLock(["0001"], "0000")  // 返回 0

// 目标是死亡数字
openLock(["8888"], "8888")  // 返回 -1

// 完全被封锁
openLock(["1000","9000","0100","0900","0010","0090","0001","0009"], "8888")
// 返回 -1（从 0000 无法移动）
```

## 复杂度分析

- **时间复杂度**：O(10^4 × 4 × 2) = O(10^4)
  - 最多 10000 个状态
  - 每个状态 8 个邻居
- **空间复杂度**：O(10^4)

## 相关题目

| 题号 | 题目 | 难度 |
|------|------|------|
| 752 | 打开转盘锁 | 中等 |
| 127 | 单词接龙 | 困难 |
| 433 | 最小基因变化 | 中等 |
| 773 | 滑动谜题 | 困难 |
