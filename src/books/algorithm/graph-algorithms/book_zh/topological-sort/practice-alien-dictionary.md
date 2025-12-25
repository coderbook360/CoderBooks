# 火星词典

LeetCode 269. Alien Dictionary

## 题目描述

现有一种使用英语字母的火星语言，这门语言的字母顺序与英语顺序不同。

给你一个字符串列表 `words`，作为这门语言的词典，词典中的字符串已经按这门新语言的字母顺序进行了排序。

请你根据该词典还原出此语言中已知的字母顺序，并按字母递增顺序排列。若无法推断出，返回空字符串。

## 示例

```
输入：words = ["wrt","wrf","er","ett","rftt"]
输出："wertf"
解释：
从 "wrt" 和 "wrf"：t 在 f 前面
从 "wrf" 和 "er"：w 在 e 前面
从 "er" 和 "ett"：r 在 t 前面
从 "ett" 和 "rftt"：e 在 r 前面

综合：w → e → r → t → f
```

## 思路分析

1. **提取顺序信息**：比较相邻单词，找出字母顺序关系
2. **建图**：字母是节点，顺序关系是边
3. **拓扑排序**：找出一个合法的字母顺序

比较两个单词的规则：
- 从左到右比较
- 第一个不同的字符位置确定顺序
- 如果一个是另一个的前缀，则短的在前

## 代码实现

```typescript
function alienOrder(words: string[]): string {
  // 收集所有字母
  const chars = new Set<string>();
  for (const word of words) {
    for (const c of word) {
      chars.add(c);
    }
  }
  
  // 建图
  const graph = new Map<string, Set<string>>();
  const indegree = new Map<string, number>();
  
  for (const c of chars) {
    graph.set(c, new Set());
    indegree.set(c, 0);
  }
  
  // 比较相邻单词，提取顺序
  for (let i = 0; i < words.length - 1; i++) {
    const word1 = words[i];
    const word2 = words[i + 1];
    
    // 特殊情况：前缀问题
    if (word1.length > word2.length && word1.startsWith(word2)) {
      return "";  // 无效输入
    }
    
    // 找第一个不同的字符
    const minLen = Math.min(word1.length, word2.length);
    for (let j = 0; j < minLen; j++) {
      if (word1[j] !== word2[j]) {
        const from = word1[j], to = word2[j];
        
        if (!graph.get(from)!.has(to)) {
          graph.get(from)!.add(to);
          indegree.set(to, indegree.get(to)! + 1);
        }
        
        break;  // 只看第一个不同的
      }
    }
  }
  
  // Kahn 拓扑排序
  const queue: string[] = [];
  for (const [c, deg] of indegree) {
    if (deg === 0) {
      queue.push(c);
    }
  }
  
  const result: string[] = [];
  
  while (queue.length > 0) {
    const c = queue.shift()!;
    result.push(c);
    
    for (const next of graph.get(c)!) {
      indegree.set(next, indegree.get(next)! - 1);
      if (indegree.get(next) === 0) {
        queue.push(next);
      }
    }
  }
  
  // 检查是否所有字母都被处理
  return result.length === chars.size ? result.join('') : "";
}
```

## 执行过程

```
words = ["wrt","wrf","er","ett","rftt"]

收集字母：{w, r, t, f, e}

比较相邻单词：
"wrt" vs "wrf": t → f
"wrf" vs "er": w → e
"er" vs "ett": r → t
"ett" vs "rftt": e → r

图：
w → e → r → t → f

入度：{w:0, e:1, r:1, t:1, f:1}

拓扑排序：
queue = [w]
w 出队 → result = [w], e 入度变 0
queue = [e]
e 出队 → result = [w,e], r 入度变 0
...
最终 result = [w,e,r,t,f]

返回 "wertf"
```

## 边界情况

```typescript
// 1. 只有一个单词
words = ["abc"]
// 返回 "abc" 的任意排列（字母顺序未知）

// 2. 前缀问题（无效）
words = ["abc", "ab"]
// "abc" 应该在 "ab" 后面，矛盾，返回 ""

// 3. 有环
words = ["a", "b", "a"]
// a < b 且 b < a，矛盾，返回 ""
```

## 进阶：字典序最小的结果

使用优先队列：

```typescript
function alienOrderLexical(words: string[]): string {
  // ... 建图同上 ...
  
  // 使用最小堆
  const heap: string[] = [];
  
  const push = (x: string) => {
    heap.push(x);
    let i = heap.length - 1;
    while (i > 0 && heap[i] < heap[Math.floor((i - 1) / 2)]) {
      const p = Math.floor((i - 1) / 2);
      [heap[i], heap[p]] = [heap[p], heap[i]];
      i = p;
    }
  };
  
  const pop = (): string => {
    const result = heap[0];
    heap[0] = heap[heap.length - 1];
    heap.pop();
    let i = 0;
    while (true) {
      const l = 2 * i + 1, r = 2 * i + 2;
      let smallest = i;
      if (l < heap.length && heap[l] < heap[smallest]) smallest = l;
      if (r < heap.length && heap[r] < heap[smallest]) smallest = r;
      if (smallest === i) break;
      [heap[i], heap[smallest]] = [heap[smallest], heap[i]];
      i = smallest;
    }
    return result;
  };
  
  // ... 使用 push/pop 代替 queue ...
}
```

## 复杂度分析

设 C 为总字符数，U 为不同字母数

- **时间复杂度**：O(C)
  - 遍历所有字符收集字母
  - 比较相邻单词提取顺序
  - 拓扑排序
- **空间复杂度**：O(U² + C)
  - 图最多 U² 条边
  - 存储单词需要 O(C)

## 相关题目

| 题号 | 题目 | 难度 |
|------|------|------|
| 269 | 火星词典 | 困难 |
| 953 | 验证外星语词典 | 简单 |
| 210 | 课程表 II | 中等 |
