# 序列重建

LeetCode 444. Sequence Reconstruction

## 题目描述

给定一个整数数组 `nums` 和一个序列列表 `sequences`，其中每个 `sequences[i]` 是 `nums` 的一个子序列。

检查 `nums` 是否是唯一的最短超序列。最短超序列是指每个 `sequences[i]` 都是它的子序列的最短序列。

## 示例

```
输入：nums = [1,2,3], sequences = [[1,2],[1,3]]
输出：false
解释：
[1,2,3] 和 [1,3,2] 都是有效的超序列
所以 nums 不是唯一的最短超序列

输入：nums = [1,2,3], sequences = [[1,2],[1,3],[2,3]]
输出：true
解释：
只有 [1,2,3] 是有效的超序列
```

## 思路分析

把问题转化为拓扑排序：
- 每个 sequence 提供了节点之间的顺序关系
- 建图后做拓扑排序
- 如果拓扑排序唯一且等于 nums，则返回 true

唯一性条件：在 Kahn 算法的每一步，队列中只有一个元素。

## 代码实现

```typescript
function sequenceReconstruction(nums: number[], sequences: number[][]): boolean {
  const n = nums.length;
  
  // 建图
  const graph = new Map<number, Set<number>>();
  const indegree = new Map<number, number>();
  
  // 初始化（只考虑 nums 中的节点）
  for (const num of nums) {
    graph.set(num, new Set());
    indegree.set(num, 0);
  }
  
  // 从 sequences 构建边
  for (const seq of sequences) {
    for (let i = 0; i < seq.length - 1; i++) {
      const from = seq[i], to = seq[i + 1];
      
      // 验证节点有效性
      if (!graph.has(from) || !graph.has(to)) {
        return false;
      }
      
      if (!graph.get(from)!.has(to)) {
        graph.get(from)!.add(to);
        indegree.set(to, indegree.get(to)! + 1);
      }
    }
    
    // 验证单节点序列
    for (const num of seq) {
      if (!graph.has(num)) {
        return false;
      }
    }
  }
  
  // Kahn 拓扑排序，检查唯一性
  const queue: number[] = [];
  for (const [num, deg] of indegree) {
    if (deg === 0) {
      queue.push(num);
    }
  }
  
  const result: number[] = [];
  
  while (queue.length > 0) {
    // 唯一性检查：队列中必须只有一个元素
    if (queue.length > 1) {
      return false;
    }
    
    const num = queue.shift()!;
    result.push(num);
    
    for (const next of graph.get(num)!) {
      indegree.set(next, indegree.get(next)! - 1);
      if (indegree.get(next) === 0) {
        queue.push(next);
      }
    }
  }
  
  // 检查结果是否等于 nums
  if (result.length !== n) return false;
  
  for (let i = 0; i < n; i++) {
    if (result[i] !== nums[i]) return false;
  }
  
  return true;
}
```

## 执行过程

```
nums = [1,2,3], sequences = [[1,2],[1,3],[2,3]]

建图：
从 [1,2]: 1 → 2
从 [1,3]: 1 → 3
从 [2,3]: 2 → 3

图：
1 → 2 → 3
  ↘   ↗
    →

入度：{1:0, 2:1, 3:2}

拓扑排序：
queue = [1], 只有一个 ✓
1 出队，result = [1]
2 入度变 0, 3 入度变 1
queue = [2], 只有一个 ✓
2 出队，result = [1,2]
3 入度变 0
queue = [3], 只有一个 ✓
3 出队，result = [1,2,3]

result = nums = [1,2,3]，返回 true
```

## 不唯一的情况

```
nums = [1,2,3], sequences = [[1,2],[1,3]]

图：
1 → 2
1 → 3
（2 和 3 之间没有关系）

入度：{1:0, 2:1, 3:1}

拓扑排序：
queue = [1], 只有一个 ✓
1 出队，result = [1]
2 和 3 入度都变 0
queue = [2, 3], 有两个 ✗

返回 false（排序不唯一）
```

## 简化版本

```typescript
function sequenceReconstruction(nums: number[], sequences: number[][]): boolean {
  const n = nums.length;
  const graph: Set<number>[] = Array.from({ length: n + 1 }, () => new Set());
  const indegree = new Array(n + 1).fill(0);
  
  for (const seq of sequences) {
    for (let i = 0; i < seq.length - 1; i++) {
      if (!graph[seq[i]].has(seq[i + 1])) {
        graph[seq[i]].add(seq[i + 1]);
        indegree[seq[i + 1]]++;
      }
    }
  }
  
  const queue: number[] = [];
  for (let i = 1; i <= n; i++) {
    if (indegree[i] === 0) queue.push(i);
  }
  
  let idx = 0;
  while (queue.length === 1) {  // 必须恰好一个
    const curr = queue.shift()!;
    if (curr !== nums[idx++]) return false;
    
    for (const next of graph[curr]) {
      if (--indegree[next] === 0) queue.push(next);
    }
  }
  
  return idx === n;
}
```

## 复杂度分析

设 V = nums.length，E = sequences 中所有边的数量

- **时间复杂度**：O(V + E)
- **空间复杂度**：O(V + E)

## 相关题目

| 题号 | 题目 | 难度 |
|------|------|------|
| 444 | 序列重建 | 中等 |
| 210 | 课程表 II | 中等 |
| 269 | 火星词典 | 困难 |
