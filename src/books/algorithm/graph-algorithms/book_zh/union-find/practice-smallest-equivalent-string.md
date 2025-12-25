# 按字典序排列最小的等效字符串

LeetCode 1061. Lexicographically Smallest Equivalent String

## 题目描述

给定两个长度相同的字符串 `s1` 和 `s2`，以及一个字符串 `baseStr`。

`s1[i]` 和 `s2[i]` 是等价字符。等价关系具有传递性。

返回 `baseStr` 的等效字符串，该字符串使用等价关系中的最小等效字符替换每个字符。

## 示例

```
输入：s1 = "parker", s2 = "morris", baseStr = "parser"
输出："makkek"
解释：
等价关系：p≡m, a≡o, r≡r, k≡r, e≡i, r≡s
传递后：{p,m}, {a,o}, {r,k,s}, {e,i}
每组取最小：m, a, k, e
"parser" → "makkek"
```

## 思路分析

**并查集 + 字典序最小**：
1. 用并查集维护等价字符的集合
2. 每个集合的代表元素选最小的字符
3. 替换 baseStr 中的每个字符为其集合的最小字符

## 代码实现

```typescript
function smallestEquivalentString(s1: string, s2: string, baseStr: string): string {
  // 26 个字母的并查集
  const parent = Array.from({ length: 26 }, (_, i) => i);
  
  function find(x: number): number {
    if (parent[x] !== x) {
      parent[x] = find(parent[x]);
    }
    return parent[x];
  }
  
  // 合并时，让较小的字符作为根
  function union(x: number, y: number): void {
    const rootX = find(x);
    const rootY = find(y);
    if (rootX !== rootY) {
      if (rootX < rootY) {
        parent[rootY] = rootX;
      } else {
        parent[rootX] = rootY;
      }
    }
  }
  
  // 建立等价关系
  for (let i = 0; i < s1.length; i++) {
    const c1 = s1.charCodeAt(i) - 97;
    const c2 = s2.charCodeAt(i) - 97;
    union(c1, c2);
  }
  
  // 替换 baseStr
  let result = '';
  for (const c of baseStr) {
    const idx = c.charCodeAt(0) - 97;
    const root = find(idx);
    result += String.fromCharCode(root + 97);
  }
  
  return result;
}
```

## 执行过程

```
s1 = "abc", s2 = "bcd", baseStr = "eed"

建立等价关系：
a(0) ≡ b(1): union(0,1), 0 < 1, parent[1] = 0
b(1) ≡ c(2): find(1)=0, union(0,2), 0 < 2, parent[2] = 0
c(2) ≡ d(3): find(2)=0, union(0,3), 0 < 3, parent[3] = 0

parent = [0, 0, 0, 0, 4, 5, ...]
等价类：{a, b, c, d}，代表元素 a

替换 "eed"：
e(4) → find(4) = 4 → 'e'
e(4) → find(4) = 4 → 'e'  
d(3) → find(3) = 0 → 'a'

结果："eea"
```

## 为什么 union 时选小的作为根？

普通并查集的 union 是随意选根，但这道题需要：
- 每个等价类的代表元素是**最小字符**

通过让较小字符作为根，保证 find 返回的总是最小字符。

## 边界情况

```typescript
// 没有等价关系
smallestEquivalentString("", "", "hello");  // "hello"

// 自等价
smallestEquivalentString("aa", "aa", "abc");  // "abc"

// 全部等价
smallestEquivalentString("abc", "bca", "xyz");  
// a≡b, b≡c, c≡a → {a,b,c}
// xyz 不变，因为 x,y,z 不在等价类中
```

## 另一种实现：后处理找最小

```typescript
function smallestEquivalentString(s1: string, s2: string, baseStr: string): string {
  const parent = Array.from({ length: 26 }, (_, i) => i);
  
  function find(x: number): number {
    if (parent[x] !== x) {
      parent[x] = find(parent[x]);
    }
    return parent[x];
  }
  
  function union(x: number, y: number): void {
    const rootX = find(x);
    const rootY = find(y);
    if (rootX !== rootY) {
      parent[rootX] = rootY;  // 普通合并
    }
  }
  
  for (let i = 0; i < s1.length; i++) {
    union(s1.charCodeAt(i) - 97, s2.charCodeAt(i) - 97);
  }
  
  // 后处理：找每个集合的最小字符
  const minChar = new Array(26).fill(25);  // 初始为 'z'
  for (let i = 0; i < 26; i++) {
    const root = find(i);
    minChar[root] = Math.min(minChar[root], i);
  }
  
  let result = '';
  for (const c of baseStr) {
    const root = find(c.charCodeAt(0) - 97);
    result += String.fromCharCode(minChar[root] + 97);
  }
  
  return result;
}
```

## 复杂度分析

- **时间复杂度**：O((n + m) · α(26)) ≈ O(n + m)，n 为 s1 长度，m 为 baseStr 长度
- **空间复杂度**：O(26) = O(1)

## 相关题目

| 题号 | 题目 | 难度 |
|------|------|------|
| 1061 | 按字典序排列最小的等效字符串 | 中等 |
| 990 | 等式方程的可满足性 | 中等 |
| 721 | 账户合并 | 中等 |
| 1202 | 交换字符串中的元素 | 中等 |
