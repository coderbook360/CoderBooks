# 单词接龙 II

LeetCode 126. Word Ladder II

## 题目描述

与"单词接龙"类似，但要求输出**所有**最短转换序列。

## 示例

```
输入：beginWord = "hit", endWord = "cog"
wordList = ["hot","dot","dog","lot","log","cog"]

输出：
[
  ["hit","hot","dot","dog","cog"],
  ["hit","hot","lot","log","cog"]
]
```

## 思路分析

这道题的难点：
1. 要找**所有**最短路径
2. 不能只记录是否访问，要记录到达该节点的最短距离

策略：
1. **BFS 建图**：记录每个节点的最短距离
2. **DFS 回溯**：从终点逆向搜索所有最短路径

为什么从终点回溯？
- BFS 时每个节点记录了最短距离
- 从终点出发，每次只走距离减 1 的节点
- 保证找到的都是最短路径

## 代码实现

```typescript
function findLadders(beginWord: string, endWord: string, wordList: string[]): string[][] {
  const wordSet = new Set(wordList);
  if (!wordSet.has(endWord)) return [];
  
  // 第一步：BFS 建图，记录每个单词的最短距离
  const distance = new Map<string, number>();
  distance.set(beginWord, 0);
  
  const queue: string[] = [beginWord];
  let found = false;
  
  while (queue.length > 0 && !found) {
    const size = queue.length;
    
    for (let i = 0; i < size; i++) {
      const word = queue.shift()!;
      const dist = distance.get(word)!;
      
      for (const neighbor of getNeighbors(word, wordSet)) {
        if (!distance.has(neighbor)) {
          distance.set(neighbor, dist + 1);
          
          if (neighbor === endWord) {
            found = true;
          } else {
            queue.push(neighbor);
          }
        }
      }
    }
  }
  
  if (!found) return [];
  
  // 第二步：DFS 从终点回溯，找所有最短路径
  const result: string[][] = [];
  const path: string[] = [endWord];
  
  function dfs(word: string): void {
    if (word === beginWord) {
      result.push([...path].reverse());
      return;
    }
    
    const dist = distance.get(word)!;
    
    for (const neighbor of getNeighbors(word, wordSet)) {
      // 只走距离减 1 的边
      if (distance.get(neighbor) === dist - 1) {
        path.push(neighbor);
        dfs(neighbor);
        path.pop();
      }
    }
  }
  
  dfs(endWord);
  return result;
}

function getNeighbors(word: string, wordSet: Set<string>): string[] {
  const neighbors: string[] = [];
  
  for (let i = 0; i < word.length; i++) {
    const chars = word.split('');
    
    for (let c = 97; c <= 122; c++) {
      if (chars[i] === String.fromCharCode(c)) continue;
      
      chars[i] = String.fromCharCode(c);
      const newWord = chars.join('');
      
      if (wordSet.has(newWord)) {
        neighbors.push(newWord);
      }
    }
  }
  
  return neighbors;
}
```

## 执行过程

```
beginWord = "hit", endWord = "cog"

BFS 阶段（建立距离表）：
distance = {
  "hit": 0,
  "hot": 1,
  "dot": 2, "lot": 2,
  "dog": 3, "log": 3,
  "cog": 4
}

DFS 阶段（从 "cog" 回溯）：
cog(4) -> dog(3) -> dot(2) -> hot(1) -> hit(0) ✓
cog(4) -> log(3) -> lot(2) -> hot(1) -> hit(0) ✓

结果：
[["hit","hot","dot","dog","cog"],
 ["hit","hot","lot","log","cog"]]
```

## 优化版本：双向 BFS

```typescript
function findLadders(beginWord: string, endWord: string, wordList: string[]): string[][] {
  const wordSet = new Set(wordList);
  if (!wordSet.has(endWord)) return [];
  
  // 双向 BFS
  let front = new Set<string>([beginWord]);
  let back = new Set<string>([endWord]);
  
  // 邻接表（只记录最短路径上的边）
  const graph = new Map<string, string[]>();
  let found = false;
  let reversed = false;  // 标记是否交换了搜索方向
  
  while (front.size > 0 && !found) {
    // 从 wordSet 中移除已访问的节点（防止走回头路）
    for (const word of front) {
      wordSet.delete(word);
    }
    
    const nextFront = new Set<string>();
    
    for (const word of front) {
      for (const neighbor of getNeighborsFromSet(word, wordSet)) {
        // 如果邻居在另一端，说明找到了
        if (back.has(neighbor)) {
          found = true;
        }
        
        // 加入下一层
        nextFront.add(neighbor);
        
        // 建立边（注意方向）
        if (!reversed) {
          if (!graph.has(word)) graph.set(word, []);
          graph.get(word)!.push(neighbor);
        } else {
          if (!graph.has(neighbor)) graph.set(neighbor, []);
          graph.get(neighbor)!.push(word);
        }
      }
    }
    
    front = nextFront;
    
    // 选择较小的集合继续扩展
    if (front.size > back.size) {
      [front, back] = [back, front];
      reversed = !reversed;
    }
  }
  
  if (!found) return [];
  
  // DFS 找所有路径
  const result: string[][] = [];
  const path: string[] = [beginWord];
  
  function dfs(word: string): void {
    if (word === endWord) {
      result.push([...path]);
      return;
    }
    
    for (const neighbor of graph.get(word) || []) {
      path.push(neighbor);
      dfs(neighbor);
      path.pop();
    }
  }
  
  dfs(beginWord);
  return result;
}

function getNeighborsFromSet(word: string, wordSet: Set<string>): string[] {
  const neighbors: string[] = [];
  
  for (let i = 0; i < word.length; i++) {
    for (let c = 97; c <= 122; c++) {
      if (word.charCodeAt(i) === c) continue;
      
      const newWord = word.slice(0, i) + String.fromCharCode(c) + word.slice(i + 1);
      if (wordSet.has(newWord)) {
        neighbors.push(newWord);
      }
    }
  }
  
  return neighbors;
}
```

## 为什么这道题难？

1. **需要所有解**：不能剪枝太狠
2. **需要最短解**：必须 BFS 确定最短距离
3. **需要记录路径**：必须 DFS 回溯
4. **需要高效**：双向 BFS + 只建有效边

## 复杂度分析

- **时间复杂度**：O(n × L × 26 + 路径数 × 路径长度)
- **空间复杂度**：O(n × L)

最坏情况下路径数可能很多，但一般题目的测试用例不会太极端。

## 常见错误

### 错误 1：不限制只走最短路径

```typescript
// 错误：DFS 时没有检查距离
for (const neighbor of getNeighbors(word, wordSet)) {
  if (!visited.has(neighbor)) {
    // 可能走到更长的路径上
  }
}

// 正确：只走距离减 1 的边
if (distance.get(neighbor) === dist - 1) {
  // 保证是最短路径
}
```

### 错误 2：BFS 时重复访问

```typescript
// 错误：同一层的节点可能互相访问
if (!visited.has(neighbor)) {
  visited.add(neighbor);
  // ...
}

// 正确：一层结束后再标记为已访问
// 或者用 distance 表来判断
```

## 相关题目

| 题号 | 题目 | 难度 |
|------|------|------|
| 126 | 单词接龙 II | 困难 |
| 127 | 单词接龙 | 困难 |
| 433 | 最小基因变化 | 中等 |
