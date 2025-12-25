# 交换字符串中的元素

LeetCode 1202. Smallest String With Swaps

## 题目描述

给你一个字符串 `s`，以及该字符串中的一些「索引对」数组 `pairs`，其中 `pairs[i] = [a, b]` 表示字符串中的两个索引。

你可以任意多次交换 `pairs` 中任意一对索引处的字符。

返回在经过若干次交换后，`s` 可以变成的字典序最小的字符串。

## 示例

```
输入：s = "dcab", pairs = [[0,3],[1,2]]
输出："bacd"
解释：
可交换位置：0↔3, 1↔2
位置 {0,3} 的字符 {d,b}，排序后 {b,d} → 位置 0='b', 位置 3='d'
位置 {1,2} 的字符 {c,a}，排序后 {a,c} → 位置 1='a', 位置 2='c'
结果："bacd"
```

## 思路分析

**关键洞察**：如果位置 a 和 b 可以交换，b 和 c 可以交换，那么 a、b、c 三个位置的字符可以任意排列。

**传递性 → 并查集**：
1. 可交换的位置形成连通块
2. 同一连通块内的字符可以任意排列
3. 对每个连通块内的字符排序，按位置填入

## 代码实现

```typescript
function smallestStringWithSwaps(s: string, pairs: number[][]): string {
  const n = s.length;
  const parent = Array.from({ length: n }, (_, i) => i);
  
  function find(x: number): number {
    if (parent[x] !== x) {
      parent[x] = find(parent[x]);
    }
    return parent[x];
  }
  
  function union(x: number, y: number): void {
    parent[find(x)] = find(y);
  }
  
  // 合并可交换的位置
  for (const [a, b] of pairs) {
    union(a, b);
  }
  
  // 按连通块分组：root → [位置列表]
  const groups = new Map<number, number[]>();
  for (let i = 0; i < n; i++) {
    const root = find(i);
    if (!groups.has(root)) {
      groups.set(root, []);
    }
    groups.get(root)!.push(i);
  }
  
  // 对每个连通块：排序字符，按位置填入
  const result = s.split('');
  for (const indices of groups.values()) {
    // 收集这些位置的字符
    const chars = indices.map(i => s[i]).sort();
    // 位置也要排序
    indices.sort((a, b) => a - b);
    // 按顺序填入
    for (let i = 0; i < indices.length; i++) {
      result[indices[i]] = chars[i];
    }
  }
  
  return result.join('');
}
```

## 执行过程

```
s = "dcab", pairs = [[0,3],[1,2]]

并查集合并：
union(0,3): parent = [3, 1, 2, 3]
union(1,2): parent = [3, 2, 2, 3]

分组：
find(0)=3 → group 3: [0]
find(1)=2 → group 2: [1]
find(2)=2 → group 2: [1, 2]
find(3)=3 → group 3: [0, 3]

处理 group 3 (位置 [0, 3])：
  字符：[s[0], s[3]] = ['d', 'b']
  排序：['b', 'd']
  位置排序：[0, 3]
  填入：result[0]='b', result[3]='d'

处理 group 2 (位置 [1, 2])：
  字符：[s[1], s[2]] = ['c', 'a']
  排序：['a', 'c']
  位置排序：[1, 2]
  填入：result[1]='a', result[2]='c'

结果："bacd"
```

## 优化：使用优先队列

```typescript
function smallestStringWithSwaps(s: string, pairs: number[][]): string {
  const n = s.length;
  const parent = Array.from({ length: n }, (_, i) => i);
  
  function find(x: number): number {
    if (parent[x] !== x) {
      parent[x] = find(parent[x]);
    }
    return parent[x];
  }
  
  function union(x: number, y: number): void {
    parent[find(x)] = find(y);
  }
  
  for (const [a, b] of pairs) {
    union(a, b);
  }
  
  // 使用 Map<root, 字符数组（已排序）>
  const charGroups = new Map<number, string[]>();
  for (let i = 0; i < n; i++) {
    const root = find(i);
    if (!charGroups.has(root)) {
      charGroups.set(root, []);
    }
    charGroups.get(root)!.push(s[i]);
  }
  
  // 对每组字符降序排序（方便 pop）
  for (const chars of charGroups.values()) {
    chars.sort((a, b) => b.localeCompare(a));
  }
  
  // 构建结果
  let result = '';
  for (let i = 0; i < n; i++) {
    const root = find(i);
    result += charGroups.get(root)!.pop();
  }
  
  return result;
}
```

## 边界情况

```typescript
// 没有可交换对
smallestStringWithSwaps("dcab", []);  // "dcab"

// 全部连通
smallestStringWithSwaps("dcab", [[0,1],[1,2],[2,3]]);  // "abcd"

// 单字符
smallestStringWithSwaps("a", []);  // "a"
```

## 复杂度分析

设 n = s.length，m = pairs.length

- **时间复杂度**：O(m · α(n) + n log n)
  - 并查集操作：O(m · α(n))
  - 排序：O(n log n)
- **空间复杂度**：O(n)

## 相关题目

| 题号 | 题目 | 难度 |
|------|------|------|
| 1202 | 交换字符串中的元素 | 中等 |
| 1061 | 按字典序排列最小的等效字符串 | 中等 |
| 721 | 账户合并 | 中等 |
| 990 | 等式方程的可满足性 | 中等 |
