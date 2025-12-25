# 路径压缩优化

路径压缩是并查集最重要的优化技巧，能将 Find 操作的时间复杂度从 O(n) 降低到接近 O(1)。

## 问题回顾

基础并查集的 Find 操作可能很慢：

```
树结构：
    4
    |
    3
    |
    2
    |
    1
    |
    0

find(0) 需要访问 5 个节点
```

## 路径压缩的思想

**核心想法**：在 Find 过程中，让路径上的所有节点直接指向根节点。

```
压缩前：
    4
    |
    3
    |
    2
    |
    1
    |
    0

find(0) 后压缩：
        4
     / | | \
    3  2  1  0
```

## 实现方式一：递归压缩

```typescript
find(x: number): number {
  if (this.parent[x] !== x) {
    this.parent[x] = this.find(this.parent[x]);  // 递归 + 更新父节点
  }
  return this.parent[x];
}
```

**执行过程**：

```
parent = [1, 2, 3, 4, 4]

find(0)：
1. parent[0] ≠ 0，递归 find(1)
2. parent[1] ≠ 1，递归 find(2)
3. parent[2] ≠ 2，递归 find(3)
4. parent[3] ≠ 3，递归 find(4)
5. parent[4] = 4，返回 4
6. 回溯：parent[3] = 4，返回 4
7. 回溯：parent[2] = 4，返回 4
8. 回溯：parent[1] = 4，返回 4
9. 回溯：parent[0] = 4，返回 4

压缩后：parent = [4, 4, 4, 4, 4]
```

## 实现方式二：迭代压缩（两次遍历）

```typescript
find(x: number): number {
  // 第一次遍历：找到根节点
  let root = x;
  while (this.parent[root] !== root) {
    root = this.parent[root];
  }
  
  // 第二次遍历：将路径上所有节点直接指向根
  while (this.parent[x] !== root) {
    const next = this.parent[x];
    this.parent[x] = root;
    x = next;
  }
  
  return root;
}
```

## 实现方式三：隔代压缩（折中方案）

```typescript
find(x: number): number {
  while (this.parent[x] !== x) {
    this.parent[x] = this.parent[this.parent[x]];  // 指向爷爷节点
    x = this.parent[x];
  }
  return x;
}
```

**特点**：每次压缩一半路径，代码简洁。

## 三种压缩方式对比

| 方式 | 压缩程度 | 代码复杂度 | 额外空间 |
|------|----------|------------|----------|
| 递归压缩 | 完全压缩 | 简洁 | O(n) 栈空间 |
| 两次遍历 | 完全压缩 | 较复杂 | O(1) |
| 隔代压缩 | 部分压缩 | 简洁 | O(1) |

**实践建议**：递归压缩最常用，代码最简洁。

## 压缩效果对比

```
压缩前（链状）：
0 → 1 → 2 → 3 → 4
find(0) 需要 4 步

压缩后（扁平）：
    4
  / | \
 0  1  2
    |
    3

再次 find(0) 只需 1 步
```

## 时间复杂度分析

**不使用路径压缩**：
- Find: O(n)（最坏情况）
- Union: O(n)

**使用路径压缩**：
- Find: 均摊 O(log n)
- 配合按秩合并: 均摊 O(α(n)) ≈ O(1)

α(n) 是阿克曼函数的反函数，增长极慢：
- α(10^80) < 5
- 实际上可以认为是常数

## 完整代码

```typescript
class UnionFind {
  private parent: number[];
  
  constructor(n: number) {
    this.parent = Array.from({ length: n }, (_, i) => i);
  }
  
  // 带路径压缩的 Find
  find(x: number): number {
    if (this.parent[x] !== x) {
      this.parent[x] = this.find(this.parent[x]);
    }
    return this.parent[x];
  }
  
  union(x: number, y: number): void {
    const rootX = this.find(x);
    const rootY = this.find(y);
    if (rootX !== rootY) {
      this.parent[rootX] = rootY;
    }
  }
  
  connected(x: number, y: number): boolean {
    return this.find(x) === this.find(y);
  }
}
```

## 路径压缩的副作用

路径压缩会改变树的结构，因此：
- **秩（Rank）** 不再准确表示树的高度
- 但不影响正确性，只影响按秩合并的效果

## 小结

路径压缩是并查集的核心优化：
- **原理**：Find 时让路径上的节点直接指向根
- **效果**：将 Find 从 O(n) 优化到接近 O(1)
- **实现**：递归版本最简洁常用
- **代价**：改变树结构，秩不再准确
