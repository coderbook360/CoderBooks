# 单词接龙

LeetCode 127. Word Ladder

## 题目描述

给定两个单词 `beginWord` 和 `endWord`，以及一个字典 `wordList`，找出从 `beginWord` 到 `endWord` 的最短转换序列的长度。

转换规则：
- 每次只能改变一个字母
- 中间单词必须在字典中

## 示例

```
输入：beginWord = "hit", endWord = "cog", wordList = ["hot","dot","dog","lot","log","cog"]
输出：5
解释：最短转换序列是 "hit" -> "hot" -> "dot" -> "dog" -> "cog"
```

## 思路分析

把问题建模为图：
- 节点：每个单词
- 边：只差一个字母的单词之间有边
- 目标：从 beginWord 到 endWord 的最短路径

关键问题：如何高效地找到"只差一个字母"的单词？

两种方法：
1. **O(n² × L)**：两两比较所有单词
2. **O(n × L × 26)**：对每个位置尝试替换 26 个字母

当字典很大时，方法 2 更快。

## 代码实现

### 方法一：替换字母

```typescript
function ladderLength(beginWord: string, endWord: string, wordList: string[]): number {
  const wordSet = new Set(wordList);
  
  // 边界情况
  if (!wordSet.has(endWord)) return 0;
  
  const visited = new Set<string>([beginWord]);
  const queue: string[] = [beginWord];
  let steps = 1;
  
  while (queue.length > 0) {
    const size = queue.length;
    
    for (let i = 0; i < size; i++) {
      const word = queue.shift()!;
      
      // 尝试改变每个位置
      for (let j = 0; j < word.length; j++) {
        const chars = word.split('');
        
        // 尝试 26 个字母
        for (let c = 97; c <= 122; c++) {  // 'a' 到 'z'
          chars[j] = String.fromCharCode(c);
          const newWord = chars.join('');
          
          if (newWord === endWord) return steps + 1;
          
          if (wordSet.has(newWord) && !visited.has(newWord)) {
            visited.add(newWord);
            queue.push(newWord);
          }
        }
      }
    }
    
    steps++;
  }
  
  return 0;
}
```

### 方法二：双向 BFS

```typescript
function ladderLength(beginWord: string, endWord: string, wordList: string[]): number {
  const wordSet = new Set(wordList);
  
  if (!wordSet.has(endWord)) return 0;
  
  let front = new Set<string>([beginWord]);
  let back = new Set<string>([endWord]);
  const visited = new Set<string>([beginWord, endWord]);
  let steps = 1;
  
  while (front.size > 0 && back.size > 0) {
    // 选择较小的集合扩展
    if (front.size > back.size) {
      [front, back] = [back, front];
    }
    
    const nextFront = new Set<string>();
    
    for (const word of front) {
      for (let j = 0; j < word.length; j++) {
        const chars = word.split('');
        
        for (let c = 97; c <= 122; c++) {
          chars[j] = String.fromCharCode(c);
          const newWord = chars.join('');
          
          // 两端相遇
          if (back.has(newWord)) return steps + 1;
          
          if (wordSet.has(newWord) && !visited.has(newWord)) {
            visited.add(newWord);
            nextFront.add(newWord);
          }
        }
      }
    }
    
    front = nextFront;
    steps++;
  }
  
  return 0;
}
```

### 方法三：预处理通用状态

使用通配符建立索引：

```typescript
function ladderLength(beginWord: string, endWord: string, wordList: string[]): number {
  const wordSet = new Set(wordList);
  if (!wordSet.has(endWord)) return 0;
  
  // 预处理：建立通用状态到单词的映射
  // "hot" -> ["*ot", "h*t", "ho*"]
  const patternToWords = new Map<string, string[]>();
  
  for (const word of wordList) {
    for (let i = 0; i < word.length; i++) {
      const pattern = word.slice(0, i) + '*' + word.slice(i + 1);
      if (!patternToWords.has(pattern)) {
        patternToWords.set(pattern, []);
      }
      patternToWords.get(pattern)!.push(word);
    }
  }
  
  // BFS
  const visited = new Set<string>([beginWord]);
  const queue: string[] = [beginWord];
  let steps = 1;
  
  while (queue.length > 0) {
    const size = queue.length;
    
    for (let i = 0; i < size; i++) {
      const word = queue.shift()!;
      
      // 找所有邻居
      for (let j = 0; j < word.length; j++) {
        const pattern = word.slice(0, j) + '*' + word.slice(j + 1);
        const neighbors = patternToWords.get(pattern) || [];
        
        for (const neighbor of neighbors) {
          if (neighbor === endWord) return steps + 1;
          
          if (!visited.has(neighbor)) {
            visited.add(neighbor);
            queue.push(neighbor);
          }
        }
      }
    }
    
    steps++;
  }
  
  return 0;
}
```

## 执行过程

```
beginWord = "hit", endWord = "cog"
wordList = ["hot","dot","dog","lot","log","cog"]

步骤 1：从 "hit" 开始
  "hit" -> "*it", "h*t", "hi*"
  匹配 "hot"（通过 "h*t"）
  queue = ["hot"]

步骤 2：从 "hot" 开始
  "hot" -> "*ot", "h*t", "ho*"
  匹配 "dot", "lot"（通过 "*ot"）
  queue = ["dot", "lot"]

步骤 3：从 "dot", "lot" 开始
  "dot" -> 匹配 "dog"
  "lot" -> 匹配 "log"
  queue = ["dog", "log"]

步骤 4：从 "dog", "log" 开始
  "dog" -> 匹配 "cog" ✓
  
返回 5
```

## 边界情况

```typescript
// endWord 不在字典中
ladderLength("hit", "cog", ["hot","dot","dog"])  // 返回 0

// 无法到达
ladderLength("hit", "cog", ["hot","dot","dog","lot","log"])  // 返回 0

// 起点等于终点（题目保证不会）
ladderLength("hit", "hit", ["hit"])  // 返回 1
```

## 复杂度分析

设 n = 字典大小，L = 单词长度

| 方法 | 时间复杂度 | 空间复杂度 |
|------|-----------|-----------|
| 替换字母 | O(n × L × 26) | O(n) |
| 双向 BFS | O(n × L × 26) | O(n) |
| 预处理通配符 | O(n × L) | O(n × L) |

双向 BFS 在实际中更快，因为搜索空间更小。

## 相关题目

| 题号 | 题目 | 难度 |
|------|------|------|
| 127 | 单词接龙 | 困难 |
| 126 | 单词接龙 II | 困难 |
| 433 | 最小基因变化 | 中等 |
| 752 | 打开转盘锁 | 中等 |
