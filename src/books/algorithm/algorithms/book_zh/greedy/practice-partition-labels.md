# 实战：划分字母区间

> LeetCode 763. 划分字母区间 | 难度：中等

贪心划分的巧妙应用，理解"区间扩展"的思路。

📎 [LeetCode 763. 划分字母区间](https://leetcode.cn/problems/partition-labels/)

---

## 题目描述

字符串 `s` 由小写字母组成。把字符串划分为尽可能多的片段，同一字母最多出现在一个片段中。

返回一个表示每个字符串片段长度的列表。

**示例1**：
```
输入：s = "ababcbacadefegdehijhklij"
输出：[9,7,8]
解释：
划分为 "ababcbaca", "defegde", "hijhklij"
每个字母最多出现在一个片段中
```

**示例2**：
```
输入：s = "eccbbbbdec"
输出：[10]
解释：无法划分，整个字符串是一个片段
```

---

## 问题分析

### 约束理解

"同一字母最多出现在一个片段中"意味着：
- 如果字母 'a' 出现在片段 1，那么所有 'a' 都必须在片段 1 中
- 片段的边界由字母的最后出现位置决定

### 关键洞察

当我们从左向右遍历时：
- 遇到字母 'a'，我们必须**至少**等到 'a' 的最后一次出现才能结束当前片段
- 在此过程中，我们可能遇到其他字母，需要进一步扩展边界

**本质**：片段的右边界 = 片段内所有字母的最后出现位置的最大值

---

## 贪心策略

1. **预处理**：记录每个字母的最后出现位置
2. **贪心遍历**：
   - 维护当前片段的右边界 `end`
   - 遍历每个字符，更新 `end = max(end, lastIndex[char])`
   - 当索引 `i == end` 时，完成一个片段

---

## 代码实现

```typescript
function partitionLabels(s: string): number[] {
  // 第一步：记录每个字母最后出现的位置
  const lastIndex = new Map<string, number>();
  for (let i = 0; i < s.length; i++) {
    lastIndex.set(s[i], i);
  }
  
  const result: number[] = [];
  let start = 0;  // 当前片段的起始位置
  let end = 0;    // 当前片段的结束位置
  
  // 第二步：贪心遍历，动态扩展边界
  for (let i = 0; i < s.length; i++) {
    // 扩展右边界：必须包含当前字母的所有出现
    end = Math.max(end, lastIndex.get(s[i])!);
    
    // 到达片段边界：当前位置就是边界
    if (i === end) {
      result.push(end - start + 1);
      start = i + 1;  // 下一个片段的起始位置
    }
  }
  
  return result;
}
```

---

## 执行过程详解

以 `s = "ababcbacadefegdehijhklij"` 为例：

```
索引:  0 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20 21 22 23
字符:  a b a b c b a c a d e  f  e  g  d  e  h  i  j  h  k  l  i  j

预处理 - 每个字母的最后出现位置:
a: 8,  b: 5,  c: 7,  d: 14, e: 15, f: 11
g: 13, h: 19, i: 22, j: 23, k: 20, l: 21

遍历过程:
i=0 'a': end = max(0, 8) = 8,   i≠end
i=1 'b': end = max(8, 5) = 8,   i≠end
i=2 'a': end = max(8, 8) = 8,   i≠end
i=3 'b': end = max(8, 5) = 8,   i≠end
i=4 'c': end = max(8, 7) = 8,   i≠end
i=5 'b': end = max(8, 5) = 8,   i≠end
i=6 'a': end = max(8, 8) = 8,   i≠end
i=7 'c': end = max(8, 7) = 8,   i≠end
i=8 'a': end = max(8, 8) = 8,   i=end ✓ 
         → 片段完成！长度 = 8-0+1 = 9, start = 9

i=9  'd': end = max(9, 14) = 14,  i≠end
i=10 'e': end = max(14, 15) = 15, i≠end
i=11 'f': end = max(15, 11) = 15, i≠end
i=12 'e': end = max(15, 15) = 15, i≠end
i=13 'g': end = max(15, 13) = 15, i≠end
i=14 'd': end = max(15, 14) = 15, i≠end
i=15 'e': end = max(15, 15) = 15, i=end ✓
         → 片段完成！长度 = 15-9+1 = 7, start = 16

i=16 'h': end = max(16, 19) = 19, i≠end
i=17 'i': end = max(19, 22) = 22, i≠end
i=18 'j': end = max(22, 23) = 23, i≠end
i=19 'h': end = max(23, 19) = 23, i≠end
i=20 'k': end = max(23, 20) = 23, i≠end
i=21 'l': end = max(23, 21) = 23, i≠end
i=22 'i': end = max(23, 22) = 23, i≠end
i=23 'j': end = max(23, 23) = 23, i=end ✓
         → 片段完成！长度 = 23-16+1 = 8

结果: [9, 7, 8]
```

---

## 为什么贪心正确？

### 正确性证明

**命题**：当 `i == end` 时，必须在此处划分。

**证明**：
1. `end = max(lastIndex[s[0..i]])` 表示 `s[0..i]` 中所有字母的最远出现位置
2. 如果 `i == end`，意味着后面没有 `s[0..i]` 中的字母出现
3. 因此在 `i` 处划分是安全的，不会违反约束
4. 如果在 `i` 之前划分，会导致某些字母跨越多个片段

**命题**：这种划分产生最多的片段。

**证明**：每次达到边界就立即划分，这是最早的合法划分点，因此产生最多片段。

---

## 可视化理解

```
s = "ababcbacadefegdehijhklij"

字母范围可视化（每个字母从第一次出现到最后一次出现）:
a: [0--------8]
b:  [1----5]
c:    [4--7]
d:           [9----14]
e:             [10----15]
f:               [11]
g:                 [13]
h:                     [16---19]
i:                        [17-----22]
j:                           [18-----23]
k:                               [20]
l:                                 [21]

合并重叠范围:
片段1: [0--------8]（a,b,c 重叠）
片段2: [9--------15]（d,e,f,g 重叠）
片段3: [16--------23]（h,i,j,k,l 重叠）
```

---

## 复杂度分析

- **时间复杂度**：O(n)
  - 第一次遍历记录最后位置：O(n)
  - 第二次遍历划分：O(n)

- **空间复杂度**：O(1)
  - 最多 26 个字母的 Map

---

## 与区间合并的关系

可以将每个字母看作一个区间 `[firstIndex, lastIndex]`，问题变成区间合并：

```typescript
function partitionLabelsInterval(s: string): number[] {
  // 为每个字母构建区间 [first, last]
  const intervals = new Map<string, [number, number]>();
  
  for (let i = 0; i < s.length; i++) {
    if (!intervals.has(s[i])) {
      intervals.set(s[i], [i, i]);
    } else {
      intervals.get(s[i])![1] = i;
    }
  }
  
  // 按起始位置排序
  const sorted = [...intervals.values()].sort((a, b) => a[0] - b[0]);
  
  // 合并区间
  const merged: [number, number][] = [];
  for (const [start, end] of sorted) {
    if (merged.length === 0 || start > merged[merged.length - 1][1]) {
      merged.push([start, end]);
    } else {
      merged[merged.length - 1][1] = Math.max(merged[merged.length - 1][1], end);
    }
  }
  
  return merged.map(([s, e]) => e - s + 1);
}
```

原始解法更直接高效，但区间合并视角有助于理解问题本质。

---

## 常见错误

### 错误1：忘记预处理最后位置

```typescript
// ❌ 错误：每次遍历都重新查找
for (let i = 0; i < s.length; i++) {
  const lastIdx = s.lastIndexOf(s[i]);  // O(n) 操作
  end = Math.max(end, lastIdx);
}
// 总复杂度变成 O(n²)

// ✅ 正确：预处理
for (let i = 0; i < s.length; i++) {
  lastIndex.set(s[i], i);  // O(1)
}
```

### 错误2：片段长度计算错误

```typescript
// ❌ 错误：忘记 +1
result.push(end - start);

// ✅ 正确：区间长度 = end - start + 1
result.push(end - start + 1);
```

### 错误3：忘记更新 start

```typescript
// ❌ 错误：划分后没有更新起始位置
if (i === end) {
  result.push(end - start + 1);
  // 忘记 start = i + 1
}
```

---

## 问题变体

### 变体1：返回划分位置

```typescript
function partitionLabelsPositions(s: string): number[][] {
  const lastIndex = new Map<string, number>();
  for (let i = 0; i < s.length; i++) {
    lastIndex.set(s[i], i);
  }
  
  const result: number[][] = [];
  let start = 0, end = 0;
  
  for (let i = 0; i < s.length; i++) {
    end = Math.max(end, lastIndex.get(s[i])!);
    if (i === end) {
      result.push([start, end]);
      start = i + 1;
    }
  }
  
  return result;
}
```

### 变体2：最少划分（最大片段）

反过来要求最少片段？整个字符串就是一个片段，答案就是 `[s.length]`。

---

## 相关题目

- LeetCode 56. 合并区间
- LeetCode 435. 无重叠区间
- LeetCode 452. 用最少数量的箭引爆气球

---

## 总结

划分字母区间展示了一种巧妙的贪心技巧：

1. **预处理关键信息**：每个字母的最后出现位置
2. **动态扩展边界**：遍历时不断更新片段的右边界
3. **及时划分**：到达边界时立即划分，获得最多片段

**核心思想**：片段的边界由其包含的字母的最远出现位置决定。这种"边界扩展"的思路在很多区间问题中都有应用。
