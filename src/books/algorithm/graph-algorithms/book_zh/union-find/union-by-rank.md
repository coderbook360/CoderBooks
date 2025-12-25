# 按秩合并优化

按秩合并是并查集的另一种重要优化，通过控制合并方向来避免树的退化。

## 问题回顾

没有优化的合并可能导致树退化成链：

```
连续执行 union(0,1), union(1,2), union(2,3)：

3
|
2
|
1
|
0

树的高度达到 n-1
```

## 按秩合并的思想

**核心想法**：合并时，让较小的树挂到较大的树上。

**秩（Rank）** 的定义：
- 可以是**树的高度**
- 也可以是**树的节点数**

```
合并两棵树：
树A（高度2）   树B（高度3）
    1              4
   / \            /|\
  0   2          3 5 6

按秩合并：将矮树挂到高树
        4
       /|\\ 
      3 5 6 1
           / \
          0   2
```

## 实现方式一：按高度合并

```typescript
class UnionFind {
  private parent: number[];
  private rank: number[];  // rank[i] 表示以 i 为根的树的高度
  
  constructor(n: number) {
    this.parent = Array.from({ length: n }, (_, i) => i);
    this.rank = new Array(n).fill(0);  // 初始高度为 0
  }
  
  find(x: number): number {
    if (this.parent[x] !== x) {
      this.parent[x] = this.find(this.parent[x]);
    }
    return this.parent[x];
  }
  
  union(x: number, y: number): void {
    const rootX = this.find(x);
    const rootY = this.find(y);
    
    if (rootX === rootY) return;
    
    // 将矮树挂到高树上
    if (this.rank[rootX] < this.rank[rootY]) {
      this.parent[rootX] = rootY;
    } else if (this.rank[rootX] > this.rank[rootY]) {
      this.parent[rootY] = rootX;
    } else {
      // 高度相同，随意挂，但需要增加高度
      this.parent[rootY] = rootX;
      this.rank[rootX]++;
    }
  }
}
```

## 实现方式二：按大小合并

```typescript
class UnionFind {
  private parent: number[];
  private size: number[];  // size[i] 表示以 i 为根的树的节点数
  
  constructor(n: number) {
    this.parent = Array.from({ length: n }, (_, i) => i);
    this.size = new Array(n).fill(1);  // 初始大小为 1
  }
  
  find(x: number): number {
    if (this.parent[x] !== x) {
      this.parent[x] = this.find(this.parent[x]);
    }
    return this.parent[x];
  }
  
  union(x: number, y: number): void {
    const rootX = this.find(x);
    const rootY = this.find(y);
    
    if (rootX === rootY) return;
    
    // 将小树挂到大树上
    if (this.size[rootX] < this.size[rootY]) {
      this.parent[rootX] = rootY;
      this.size[rootY] += this.size[rootX];
    } else {
      this.parent[rootY] = rootX;
      this.size[rootX] += this.size[rootY];
    }
  }
  
  // 获取集合大小
  getSize(x: number): number {
    return this.size[this.find(x)];
  }
}
```

## 执行过程示例

```
按大小合并：

初始：parent = [0,1,2,3,4], size = [1,1,1,1,1]

union(0, 1)：
size[0] = size[1]，parent[1] = 0
parent = [0,0,2,3,4], size = [2,1,1,1,1]

union(2, 3)：
size[2] = size[3]，parent[3] = 2
parent = [0,0,2,2,4], size = [2,1,2,1,1]

union(0, 2)：
size[0] = size[2] = 2，parent[2] = 0
parent = [0,0,0,2,4], size = [4,1,2,1,1]

树结构：
    0
   / \
  1   2
      |
      3
```

## 两种方式对比

| 方式 | 优点 | 缺点 |
|------|------|------|
| 按高度 | 严格控制树高 | 路径压缩后高度不准确 |
| 按大小 | 可获取集合大小 | 不直接控制高度 |

**实践建议**：
- 需要获取集合大小时用"按大小合并"
- 其他情况两种都可以

## 为什么按秩合并有效？

**定理**：使用按秩合并，n 个元素的并查集，树的高度最多为 O(log n)。

**证明思路**：
- 高度为 h 的树至少有 2^h 个节点
- n 个节点的树高度最多 log n

## 时间复杂度分析

| 优化策略 | Find | Union |
|----------|------|-------|
| 无优化 | O(n) | O(n) |
| 仅路径压缩 | 均摊 O(log n) | 均摊 O(log n) |
| 仅按秩合并 | O(log n) | O(log n) |
| 两者结合 | 均摊 O(α(n)) | 均摊 O(α(n)) |

α(n) 是反阿克曼函数，实际上可认为是常数。

## 完整模板（路径压缩 + 按秩合并）

```typescript
class UnionFind {
  private parent: number[];
  private rank: number[];
  public count: number;
  
  constructor(n: number) {
    this.parent = Array.from({ length: n }, (_, i) => i);
    this.rank = new Array(n).fill(1);
    this.count = n;
  }
  
  find(x: number): number {
    if (this.parent[x] !== x) {
      this.parent[x] = this.find(this.parent[x]);
    }
    return this.parent[x];
  }
  
  union(x: number, y: number): boolean {
    const rootX = this.find(x);
    const rootY = this.find(y);
    
    if (rootX === rootY) return false;
    
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

## 关于路径压缩对秩的影响

路径压缩会改变树结构，使得秩不再准确表示高度。但这不影响正确性：
- 秩仍然可以作为"相对大小"的估计
- 合并结果仍然比不优化要好

## 小结

按秩合并是并查集的重要优化：
- **原理**：小树挂到大树上
- **实现**：按高度或按大小
- **效果**：保证树高度为 O(log n)
- **最佳实践**：与路径压缩结合使用
