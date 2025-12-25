# 实战：克隆图

## 题目描述

**LeetCode 133. Clone Graph**

给你无向连通图中一个节点的引用，请你返回该图的深拷贝（克隆）。

图中的每个节点都包含它的值 val（int）和其邻居的列表（list[Node]）。

```typescript
class Node {
  val: number;
  neighbors: Node[];
  
  constructor(val?: number, neighbors?: Node[]) {
    this.val = val === undefined ? 0 : val;
    this.neighbors = neighbors === undefined ? [] : neighbors;
  }
}
```

**示例**：
```
输入：adjList = [[2,4],[1,3],[2,4],[1,3]]
输出：[[2,4],[1,3],[2,4],[1,3]]
解释：
图中有 4 个节点。
节点 1 的值是 1，它有两个邻居：节点 2 和 4。
节点 2 的值是 2，它有两个邻居：节点 1 和 3。
节点 3 的值是 3，它有两个邻居：节点 2 和 4。
节点 4 的值是 4，它有两个邻居：节点 1 和 3。
```

**约束**：
- 节点数不超过 100
- 每个节点值 Node.val 都是唯一的，`1 <= Node.val <= 100`
- 无向图意味着连通且无自环

## 思路分析

深拷贝图需要：
1. 为每个原节点创建一个新节点
2. 复制邻居关系
3. 避免重复创建（处理环）

关键：用哈希表记录 **原节点 → 克隆节点** 的映射。

## 解法一：DFS

```typescript
function cloneGraph(node: Node | null): Node | null {
  if (!node) return null;
  
  // 原节点 → 克隆节点 的映射
  const visited = new Map<Node, Node>();
  
  function dfs(original: Node): Node {
    // 如果已经克隆过，直接返回
    if (visited.has(original)) {
      return visited.get(original)!;
    }
    
    // 创建克隆节点
    const clone = new Node(original.val);
    visited.set(original, clone);
    
    // 递归克隆邻居
    for (const neighbor of original.neighbors) {
      clone.neighbors.push(dfs(neighbor));
    }
    
    return clone;
  }
  
  return dfs(node);
}
```

**复杂度分析**：
- 时间：O(n + m)，n 是节点数，m 是边数
- 空间：O(n)

## 解法二：BFS

```typescript
function cloneGraph(node: Node | null): Node | null {
  if (!node) return null;
  
  const visited = new Map<Node, Node>();
  const queue: Node[] = [node];
  
  // 先克隆起始节点
  visited.set(node, new Node(node.val));
  
  while (queue.length > 0) {
    const original = queue.shift()!;
    const clone = visited.get(original)!;
    
    for (const neighbor of original.neighbors) {
      // 如果邻居未被克隆，先克隆它
      if (!visited.has(neighbor)) {
        visited.set(neighbor, new Node(neighbor.val));
        queue.push(neighbor);
      }
      
      // 添加邻居关系
      clone.neighbors.push(visited.get(neighbor)!);
    }
  }
  
  return visited.get(node)!;
}
```

## 图解

```
原图：
1 --- 2
|     |
4 --- 3

DFS 过程：
dfs(1):
  创建 clone1
  visited = {1 → clone1}
  
  dfs(2):
    创建 clone2
    visited = {1 → clone1, 2 → clone2}
    
    dfs(3):
      创建 clone3
      visited = {..., 3 → clone3}
      
      dfs(4):
        创建 clone4
        visited = {..., 4 → clone4}
        
        邻居 1 已在 visited，返回 clone1
        邻居 3 已在 visited，返回 clone3
        
      返回 clone4
      
    dfs(4) 返回 clone4（已存在）
    clone3.neighbors = [clone2, clone4]
    
  clone2.neighbors = [clone1, clone3]
  
  dfs(4) 返回 clone4（已存在）
  clone1.neighbors = [clone2, clone4]

返回 clone1
```

## 为什么需要 visited？

```typescript
// 如果没有 visited，会无限循环
// 1 → 2 → 1 → 2 → ...

// visited 的作用：
// 1. 避免重复创建节点
// 2. 处理环形结构
// 3. 保证每个节点只创建一次
```

## 变体：深拷贝带权图

```typescript
class WeightedNode {
  val: number;
  neighbors: Array<[WeightedNode, number]>;  // [节点, 权重]
}

function cloneWeightedGraph(node: WeightedNode | null): WeightedNode | null {
  if (!node) return null;
  
  const visited = new Map<WeightedNode, WeightedNode>();
  
  function dfs(original: WeightedNode): WeightedNode {
    if (visited.has(original)) {
      return visited.get(original)!;
    }
    
    const clone = new WeightedNode(original.val);
    visited.set(original, clone);
    
    for (const [neighbor, weight] of original.neighbors) {
      clone.neighbors.push([dfs(neighbor), weight]);
    }
    
    return clone;
  }
  
  return dfs(node);
}
```

## 常见错误

### 1. 忘记处理 null

```typescript
// 错误
function cloneGraph(node: Node): Node {
  // 如果 node 是 null 会报错
}

// 正确
function cloneGraph(node: Node | null): Node | null {
  if (!node) return null;
  // ...
}
```

### 2. 先克隆后标记

```typescript
// 错误：可能重复克隆
function dfs(original: Node): Node {
  const clone = new Node(original.val);
  // 如果在这之后才标记，递归中可能再次创建同一节点
  visited.set(original, clone);
  // ...
}
```

### 3. 混淆原节点和克隆节点

```typescript
// 错误：把原节点加入克隆节点的邻居
clone.neighbors.push(neighbor);  // neighbor 是原节点！

// 正确：加入克隆后的邻居
clone.neighbors.push(dfs(neighbor));
```

## 相关题目

| 题目 | 说明 |
|------|------|
| [138. 复制带随机指针的链表](https://leetcode.cn/problems/copy-list-with-random-pointer/) | 链表克隆 |
| [1490. 克隆 N 叉树](https://leetcode.cn/problems/clone-n-ary-tree/) | 树克隆 |

## 总结

克隆图的要点：

1. **哈希表**：记录原节点到克隆节点的映射
2. **先创建后连接**：先创建节点，再建立邻居关系
3. **处理环**：visited 防止重复克隆
4. **DFS/BFS**：两种方法都可以

这道题是图遍历与哈希表结合的经典例题。
