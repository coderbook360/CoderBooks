# 并查集原理与实现

并查集（Union-Find）是一种高效处理**动态连通性**问题的数据结构，支持两种核心操作：合并集合（Union）和查找元素所属集合（Find）。

## 什么是并查集？

**并查集**用于管理一系列不相交的集合，支持：
- **Find(x)**：查找元素 x 所属的集合（返回集合的代表元素）
- **Union(x, y)**：合并 x 和 y 所在的两个集合

## 为什么需要并查集？

**场景**：判断两个人是否属于同一个社交圈。

```
朋友关系：
A - B（A 和 B 是朋友）
B - C（B 和 C 是朋友）
D - E（D 和 E 是朋友）

问：A 和 C 是否在同一圈子？A 和 D 呢？
```

**暴力方法**：每次 DFS/BFS 遍历，时间复杂度 O(n)。

**并查集**：近乎 O(1) 完成查询和合并。

## 基础实现：数组表示

用数组 `parent[i]` 表示元素 i 的父节点。

```typescript
class UnionFind {
  private parent: number[];
  
  constructor(n: number) {
    // 初始时，每个元素的父节点是自己
    this.parent = Array.from({ length: n }, (_, i) => i);
  }
  
  // 查找 x 所属集合的根节点
  find(x: number): number {
    while (this.parent[x] !== x) {
      x = this.parent[x];
    }
    return x;
  }
  
  // 合并 x 和 y 所在的集合
  union(x: number, y: number): void {
    const rootX = this.find(x);
    const rootY = this.find(y);
    if (rootX !== rootY) {
      this.parent[rootX] = rootY;  // 将 rootX 挂到 rootY 下
    }
  }
  
  // 判断 x 和 y 是否在同一集合
  connected(x: number, y: number): boolean {
    return this.find(x) === this.find(y);
  }
}
```

## 执行过程示例

```
初始状态（5 个元素）：
parent = [0, 1, 2, 3, 4]
每个元素都是独立的集合

union(0, 1)：
find(0) = 0, find(1) = 1
parent[0] = 1
parent = [1, 1, 2, 3, 4]

union(2, 3)：
find(2) = 2, find(3) = 3
parent[2] = 3
parent = [1, 1, 3, 3, 4]

union(1, 3)：
find(1) = 1, find(3) = 3
parent[1] = 3
parent = [1, 3, 3, 3, 4]

connected(0, 2)：
find(0): 0 → 1 → 3，返回 3
find(2): 2 → 3，返回 3
3 === 3，返回 true
```

## 可视化理解

```
初始：每个元素是独立的树
0   1   2   3   4

union(0,1)：
1       2   3   4
|
0

union(2,3)：
1       3       4
|       |
0       2

union(1,3)：
    3           4
   / \
  1   2
  |
  0
```

## 问题：树可能退化成链

```
连续执行 union(0,1), union(1,2), union(2,3), union(3,4)：

4
|
3
|
2
|
1
|
0

此时 find(0) 需要遍历整个链，时间复杂度退化为 O(n)
```

## 复杂度分析（基础版本）

- **Find**：O(n)（最坏情况，树退化成链）
- **Union**：O(n)（需要先 Find）
- **空间**：O(n)

## 如何优化？

基础版本的问题是**树可能很深**，导致 Find 操作很慢。

两种优化策略：
1. **路径压缩**：Find 时顺便压缩路径
2. **按秩合并**：Union 时让小树挂到大树上

优化后，Find 和 Union 的均摊时间复杂度接近 **O(α(n))**，其中 α 是阿克曼函数的反函数，实际上可以认为是 **O(1)**。

## 并查集的应用场景

1. **连通性判断**：两点是否连通
2. **连通分量计数**：图中有多少个连通块
3. **最小生成树**：Kruskal 算法
4. **等价类划分**：将等价的元素分组
5. **动态图连通性**：边不断加入时维护连通性

## 完整模板（带优化）

```typescript
class UnionFind {
  private parent: number[];
  private rank: number[];
  public count: number;  // 连通分量数
  
  constructor(n: number) {
    this.parent = Array.from({ length: n }, (_, i) => i);
    this.rank = new Array(n).fill(1);
    this.count = n;
  }
  
  find(x: number): number {
    if (this.parent[x] !== x) {
      this.parent[x] = this.find(this.parent[x]);  // 路径压缩
    }
    return this.parent[x];
  }
  
  union(x: number, y: number): boolean {
    const rootX = this.find(x);
    const rootY = this.find(y);
    
    if (rootX === rootY) return false;
    
    // 按秩合并
    if (this.rank[rootX] < this.rank[rootY]) {
      this.parent[rootX] = rootY;
    } else if (this.rank[rootX] > this.rank[rootY]) {
      this.parent[rootY] = rootX;
    } else {
      this.parent[rootY] = rootX;
      this.rank[rootX]++;
    }
    
    this.count--;
    return true;
  }
  
  connected(x: number, y: number): boolean {
    return this.find(x) === this.find(y);
  }
}
```

## 小结

并查集是处理动态连通性问题的利器：
- **核心操作**：Find（查找根）和 Union（合并集合）
- **优化手段**：路径压缩 + 按秩合并
- **时间复杂度**：优化后接近 O(1)
- **典型应用**：连通分量、最小生成树、等价类划分
