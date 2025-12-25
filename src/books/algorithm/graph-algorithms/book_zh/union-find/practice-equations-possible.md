# 等式方程的可满足性

LeetCode 990. Satisfiability of Equality Equations

## 题目描述

给定一个由表示变量之间关系的字符串方程组成的数组，每个字符串方程 `equations[i]` 的长度为 4，并采用两种不同的形式之一：`"a==b"` 或 `"a!=b"`。在这里，`a` 和 `b` 是小写字母，表示单字母变量名。

只有当可以将整数分配给变量名，以便满足所有给定的方程时才返回 `true`，否则返回 `false`。

## 示例

```
输入：["a==b","b!=a"]
输出：false
解释：a==b 意味着 a 和 b 相等，但 b!=a 要求不等，矛盾

输入：["a==b","b==c","a==c"]
输出：true
解释：可以分配 a=b=c=1

输入：["a==b","b!=c","c==a"]
输出：false
解释：a==b, c==a 推出 a=b=c，与 b!=c 矛盾
```

## 思路分析

**两步走**：
1. 先处理所有 `==`：用并查集合并相等的变量
2. 再处理所有 `!=`：检查是否与相等关系矛盾

**矛盾条件**：`a!=b` 但 `find(a) == find(b)`

## 代码实现

```typescript
function equationsPossible(equations: string[]): boolean {
  const parent = Array.from({ length: 26 }, (_, i) => i);
  
  function find(x: number): number {
    if (parent[x] !== x) {
      parent[x] = find(parent[x]);
    }
    return parent[x];
  }
  
  function union(x: number, y: number): void {
    parent[find(x)] = find(y);
  }
  
  // 第一遍：处理所有相等关系
  for (const eq of equations) {
    if (eq[1] === '=') {
      const a = eq.charCodeAt(0) - 97;
      const b = eq.charCodeAt(3) - 97;
      union(a, b);
    }
  }
  
  // 第二遍：检查所有不等关系
  for (const eq of equations) {
    if (eq[1] === '!') {
      const a = eq.charCodeAt(0) - 97;
      const b = eq.charCodeAt(3) - 97;
      if (find(a) === find(b)) {
        return false;  // 矛盾：要求不等，但并查集显示相等
      }
    }
  }
  
  return true;
}
```

## 执行过程

```
equations = ["a==b", "b==c", "c!=a"]

第一遍（处理 ==）：
"a==b": union(0, 1) → parent[0] = 1
"b==c": union(1, 2) → parent[1] = 2

parent = [1, 2, 2, 3, 4, ...]
等价关系：a ≡ b ≡ c

第二遍（检查 !=）：
"c!=a": find(2)=2, find(0)=2
  相等！但要求不等 → 返回 false
```

## 特殊情况

```typescript
// 自己和自己不等
equationsPossible(["a!=a"]);  
// find(a) == find(a)，返回 false ✓

// 自己和自己相等
equationsPossible(["a==a"]);  
// 没有不等关系，返回 true ✓

// 无关变量
equationsPossible(["a==b", "c!=d"]);  
// a≡b, c 和 d 各自独立
// c!=d: find(c)≠find(d)，不矛盾
// 返回 true ✓
```

## 为什么先处理 == 再检查 !=？

顺序很重要：
- 必须先建立完整的相等关系（传递闭包）
- 才能正确检查不等关系是否矛盾

```
反例：如果边处理边检查
equations = ["a!=b", "a==c", "b==c"]

如果先检查 a!=b：
  此时 a 和 b 不连通，似乎不矛盾
再处理 a==c, b==c 后，a 和 b 变得连通

正确做法：先全部 union，再检查
```

## 复杂度分析

- **时间复杂度**：O(n · α(26)) = O(n)，n 为方程数
- **空间复杂度**：O(26) = O(1)

## 相关题目

| 题号 | 题目 | 难度 |
|------|------|------|
| 990 | 等式方程的可满足性 | 中等 |
| 1061 | 按字典序排列最小的等效字符串 | 中等 |
| 721 | 账户合并 | 中等 |
| 399 | 除法求值 | 中等 |
