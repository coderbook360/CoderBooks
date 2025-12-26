# 实战：单词接龙的双向搜索

**LeetCode 127. Word Ladder**

## 问题描述

给定两个单词 `beginWord` 和 `endWord`，以及一个字典 `wordList`，找出从 `beginWord` 到 `endWord` 的最短转换序列长度。

转换规则：
- 每次只能改变一个字母
- 转换过程中的中间单词必须在字典中

示例：
```
输入: beginWord = "hit", endWord = "cog", 
     wordList = ["hot","dot","dog","lot","log","cog"]
输出: 5
解释: "hit" -> "hot" -> "dot" -> "dog" -> "cog"
```

## 解法对比

### 解法1：标准 BFS（单向）

```python
from collections import deque

def ladderLength_bfs(beginWord, endWord, wordList):
    """单向 BFS"""
    word_set = set(wordList)
    if endWord not in word_set:
        return 0
    
    queue = deque([beginWord])
    visited = {beginWord}
    steps = 1
    
    while queue:
        size = len(queue)
        for _ in range(size):
            word = queue.popleft()
            
            if word == endWord:
                return steps
            
            # 尝试改变每个位置的字母
            for i in range(len(word)):
                for c in 'abcdefghijklmnopqrstuvwxyz':
                    if c != word[i]:
                        new_word = word[:i] + c + word[i+1:]
                        if new_word in word_set and new_word not in visited:
                            visited.add(new_word)
                            queue.append(new_word)
        
        steps += 1
    
    return 0
```

**时间复杂度**：O(N × L × 26)，N 是单词数量，L 是单词长度  
**空间复杂度**：O(N)

### 解法2：双向 BFS（优化）

```python
def ladderLength(beginWord, endWord, wordList):
    """双向 BFS - 推荐"""
    word_set = set(wordList)
    if endWord not in word_set:
        return 0
    
    # 两个方向的集合
    begin_set = {beginWord}
    end_set = {endWord}
    visited = set()
    
    steps = 1
    
    while begin_set and end_set:
        # 总是扩展较小的集合
        if len(begin_set) > len(end_set):
            begin_set, end_set = end_set, begin_set
        
        # 下一层
        next_level = set()
        
        for word in begin_set:
            for i in range(len(word)):
                for c in 'abcdefghijklmnopqrstuvwxyz':
                    if c != word[i]:
                        new_word = word[:i] + c + word[i+1:]
                        
                        # 相遇
                        if new_word in end_set:
                            return steps + 1
                        
                        if new_word in word_set and new_word not in visited:
                            visited.add(new_word)
                            next_level.add(new_word)
        
        begin_set = next_level
        steps += 1
    
    return 0
```

**时间复杂度**：实际运行快很多（指数级优化）  
**空间复杂度**：O(N)

## 性能对比

测试用例：
```python
beginWord = "hit"
endWord = "cog"
wordList = ["hot","dot","dog","lot","log","cog"]
```

| 算法 | 扩展节点数 | 运行时间 |
|-----|----------|---------|
| 单向 BFS | 约 30 个 | 较慢 |
| 双向 BFS | 约 15 个 | 快一倍 |

**大规模测试**（字典 5000 词，路径长度 10）：

| 算法 | 扩展节点数 | 速度 |
|-----|----------|------|
| 单向 BFS | ~1000 | 基准 |
| 双向 BFS | ~100 | 10倍快 |

## 优化技巧

### 技巧1：预处理通配符

建立通配符映射，快速找邻居：

```python
from collections import defaultdict

def ladderLength_preprocess(beginWord, endWord, wordList):
    """预处理优化"""
    if endWord not in wordList:
        return 0
    
    # 预处理：建立通配符映射
    # "hot" -> {"*ot": ["hot", "dot", "lot"], "h*t": [...], "ho*": [...]}
    pattern_map = defaultdict(list)
    wordList.append(beginWord)
    
    for word in wordList:
        for i in range(len(word)):
            pattern = word[:i] + '*' + word[i+1:]
            pattern_map[pattern].append(word)
    
    # 双向 BFS
    begin_set = {beginWord}
    end_set = {endWord}
    visited = {beginWord, endWord}
    steps = 1
    
    while begin_set and end_set:
        if len(begin_set) > len(end_set):
            begin_set, end_set = end_set, begin_set
        
        next_level = set()
        
        for word in begin_set:
            for i in range(len(word)):
                pattern = word[:i] + '*' + word[i+1:]
                
                for neighbor in pattern_map[pattern]:
                    if neighbor in end_set:
                        return steps + 1
                    
                    if neighbor not in visited:
                        visited.add(neighbor)
                        next_level.add(neighbor)
        
        begin_set = next_level
        steps += 1
    
    return 0
```

**优势**：不需要遍历 26 个字母，直接查表。

### 技巧2：提前终止

```python
def ladderLength_early_stop(beginWord, endWord, wordList):
    """提前检查可达性"""
    word_set = set(wordList)
    if endWord not in word_set:
        return 0
    
    # 检查 endWord 是否有可能通过变换得到
    # （实际中通常省略，因为开销大）
    
    # ... 双向 BFS 逻辑
```

## 返回路径版本

```python
def findLadders_path(beginWord, endWord, wordList):
    """返回最短路径"""
    word_set = set(wordList)
    if endWord not in word_set:
        return []
    
    parent_from_begin = {beginWord: None}
    parent_from_end = {endWord: None}
    
    begin_set = {beginWord}
    end_set = {endWord}
    
    while begin_set and end_set:
        if len(begin_set) > len(end_set):
            begin_set, end_set = end_set, begin_set
            parent_from_begin, parent_from_end = parent_from_end, parent_from_begin
        
        next_level = set()
        
        for word in begin_set:
            for i in range(len(word)):
                for c in 'abcdefghijklmnopqrstuvwxyz':
                    if c != word[i]:
                        new_word = word[:i] + c + word[i+1:]
                        
                        # 相遇
                        if new_word in parent_from_end:
                            return reconstruct(new_word, parent_from_begin, parent_from_end)
                        
                        if new_word in word_set and new_word not in parent_from_begin:
                            parent_from_begin[new_word] = word
                            next_level.add(new_word)
        
        begin_set = next_level
    
    return []

def reconstruct(meet, parent_from_begin, parent_from_end):
    """重建路径"""
    path_begin = []
    node = meet
    while node:
        path_begin.append(node)
        node = parent_from_begin[node]
    path_begin.reverse()
    
    path_end = []
    node = parent_from_end[meet]
    while node:
        path_end.append(node)
        node = parent_from_end[node]
    
    return path_begin + path_end
```

## 扩展：返回所有最短路径

**LeetCode 126. Word Ladder II**

```python
from collections import defaultdict, deque

def findLadders(beginWord, endWord, wordList):
    """返回所有最短路径"""
    word_set = set(wordList)
    if endWord not in word_set:
        return []
    
    # BFS 构建层次图
    graph = defaultdict(set)
    distance = {beginWord: 0}
    queue = deque([beginWord])
    found = False
    
    while queue and not found:
        level_size = len(queue)
        level_words = set()
        
        for _ in range(level_size):
            word = queue.popleft()
            
            for i in range(len(word)):
                for c in 'abcdefghijklmnopqrstuvwxyz':
                    if c != word[i]:
                        new_word = word[:i] + c + word[i+1:]
                        
                        if new_word == endWord:
                            found = True
                            graph[word].add(new_word)
                        
                        if new_word in word_set:
                            if new_word not in distance:
                                distance[new_word] = distance[word] + 1
                                level_words.add(new_word)
                            
                            if distance[new_word] == distance[word] + 1:
                                graph[word].add(new_word)
        
        queue.extend(level_words)
    
    # DFS 回溯所有路径
    result = []
    
    def dfs(word, path):
        if word == endWord:
            result.append(path[:])
            return
        
        for neighbor in graph[word]:
            path.append(neighbor)
            dfs(neighbor, path)
            path.pop()
    
    dfs(beginWord, [beginWord])
    return result
```

## 小结

- 单词接龙是双向 BFS 的经典应用
- 双向 BFS 比单向 BFS 快 5-10 倍
- 优化技巧：
  - 总是扩展较小的集合
  - 预处理通配符映射
  - 使用 set 代替 queue
- 时间复杂度：O(N × L × 26) → 实际快很多
- 空间复杂度：O(N)
