# 连通网络的操作次数

LeetCode 1319. Number of Operations to Make Network Connected

## 题目描述

用以太网线缆将 `n` 台计算机连接成一个网络，计算机的编号从 `0` 到 `n-1`。线缆用 `connections` 表示，其中 `connections[i] = [a, b]` 连接了计算机 `a` 和 `b`。

网络中的任何一台计算机都可以通过网络直接或者间接访问同一个网络中其他任意一台计算机。

给你这个计算机网络的初始布线 `connections`，你可以拔开任意两台直接相连的计算机之间的线缆，并用它连接一对未直接相连的计算机。请计算并返回使所有计算机都连通所需的最少操作次数。如果不可能，则返回 -1。

## 示例

```
输入：n = 4, connections = [[0,1],[0,2],[1,2]]
输出：1
解释：
初始：0-1-2 连通，3 孤立
有 3 条线缆，n-1=3 条刚好够用
拔掉 1-2 的线缆，连接 2-3
结果：所有计算机连通

输入：n = 6, connections = [[0,1],[0,2],[0,3],[1,2],[1,3]]
输出：2
解释：5 条线缆，需要 5 条才能连通 6 台电脑，够用
```

## 思路分析

**关键洞察**：
1. 连通 n 台电脑至少需要 n-1 条线缆
2. 如果线缆数 < n-1，不可能全部连通
3. 多余的线缆可以用来连接不同的连通块

**解题步骤**：
1. 判断线缆是否足够
2. 用并查集计算连通块数量
3. 需要的操作数 = 连通块数 - 1

## 代码实现

```typescript
function makeConnected(n: number, connections: number[][]): number {
  // 线缆数不足
  if (connections.length < n - 1) {
    return -1;
  }
  
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
  
  // 合并已连接的计算机
  for (const [a, b] of connections) {
    union(a, b);
  }
  
  // 统计连通块数量
  let components = 0;
  for (let i = 0; i < n; i++) {
    if (find(i) === i) {
      components++;
    }
  }
  
  // 需要 components - 1 次操作
  return components - 1;
}
```

## 执行过程

```
n = 6
connections = [[0,1],[0,2],[0,3],[1,2],[1,3]]

线缆数 = 5 >= n-1 = 5，足够

并查集合并：
union(0,1): parent = [1,1,2,3,4,5]
union(0,2): parent = [1,2,2,3,4,5] → find(0)=1, parent = [1,2,2,3,4,5]
           实际：parent[1] = 2 → parent = [1,2,2,3,4,5]
union(0,3): find(0)→find(1)→2, parent[2]=3
union(1,2): 已连通
union(1,3): 已连通

最终连通块：
- {0,1,2,3}
- {4}
- {5}

components = 3
操作数 = 3 - 1 = 2
```

## 为什么操作数 = components - 1？

```
假设有 k 个连通块：
[块1] [块2] [块3] ... [块k]

需要 k-1 条线缆把它们连起来：
[块1] - [块2] - [块3] - ... - [块k]

这 k-1 条线缆从哪来？
- 原有线缆数 >= n-1
- 连通 k 个块内部需要 <= n-k 条线缆
- 多余线缆 >= (n-1) - (n-k) = k-1
- 足够用来连接 k 个块
```

## 带 count 的优化版本

```typescript
function makeConnected(n: number, connections: number[][]): number {
  if (connections.length < n - 1) {
    return -1;
  }
  
  const parent = Array.from({ length: n }, (_, i) => i);
  let components = n;  // 初始每台电脑是独立的
  
  function find(x: number): number {
    if (parent[x] !== x) {
      parent[x] = find(parent[x]);
    }
    return parent[x];
  }
  
  function union(x: number, y: number): boolean {
    const rootX = find(x);
    const rootY = find(y);
    if (rootX === rootY) return false;
    
    parent[rootX] = rootY;
    components--;
    return true;
  }
  
  for (const [a, b] of connections) {
    union(a, b);
  }
  
  return components - 1;
}
```

## 复杂度分析

- **时间复杂度**：O(m · α(n))，m 为边数
- **空间复杂度**：O(n)

## 相关题目

| 题号 | 题目 | 难度 |
|------|------|------|
| 1319 | 连通网络的操作次数 | 中等 |
| 547 | 省份数量 | 中等 |
| 684 | 冗余连接 | 中等 |
| 1579 | 保证图可完全遍历 | 困难 |
