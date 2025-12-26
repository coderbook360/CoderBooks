# 课程表 II

LeetCode 210. Course Schedule II

## 题目描述

你这个学期必须选修 `numCourses` 门课程，记为 `0` 到 `numCourses - 1`。

在选修某些课程之前需要一些先修课程。先修课程用数组 `prerequisites` 表示，其中 `prerequisites[i] = [ai, bi]` 表示：如果要学习课程 `ai` 则必须先学习课程 `bi`。

返回完成所有课程的一个可能的学习顺序。如果不可能完成，返回空数组。

## 示例

```
输入：numCourses = 2, prerequisites = [[1,0]]
输出：[0,1]
解释：总共 2 门课程。学习课程 1 之前，需要先学习课程 0。一个正确的学习顺序是 [0,1]。

输入：numCourses = 4, prerequisites = [[1,0],[2,0],[3,1],[3,2]]
输出：[0,2,1,3] 或 [0,1,2,3]
解释：总共 4 门课程。一个可能的学习顺序是 [0,2,1,3] 或 [0,1,2,3]。
```

## 与课程表 I 的区别

| 特性 | 课程表 I | 课程表 II |
|------|---------|----------|
| 返回值 | boolean | number[] |
| 问题 | 能否完成 | 具体顺序 |
| 难度 | Medium | Medium |

## 方法一：DFS 拓扑排序

### 核心思路

DFS 后序遍历的倒序就是拓扑排序！

**为什么？**
- 后序位置意味着所有依赖都已访问
- 依赖的课程一定在结果数组更后面
- 倒序后，依赖的课程就在前面

### 代码实现

```typescript
function findOrder(numCourses: number, prerequisites: number[][]): number[] {
  // 建图：bi -> ai（先学bi才能学ai）
  const graph: number[][] = Array.from({ length: numCourses }, () => []);
  for (const [ai, bi] of prerequisites) {
    graph[bi].push(ai);
  }
  
  // 0: 未访问, 1: 访问中, 2: 已完成
  const color = new Array(numCourses).fill(0);
  const result: number[] = [];
  
  function dfs(node: number): boolean {
    color[node] = 1;
    
    for (const neighbor of graph[node]) {
      if (color[neighbor] === 1) {
        return false;  // 有环
      }
      
      if (color[neighbor] === 0) {
        if (!dfs(neighbor)) {
          return false;
        }
      }
    }
    
    color[node] = 2;
    result.push(node);  // 后序位置记录
    return true;
  }
  
  for (let i = 0; i < numCourses; i++) {
    if (color[i] === 0) {
      if (!dfs(i)) {
        return [];  // 有环，无法完成
      }
    }
  }
  
  return result.reverse();  // 倒序
}
```

**时间复杂度**：$O(V + E)$  
**空间复杂度**：$O(V)$

### 执行过程

`numCourses = 4, prerequisites = [[1,0],[2,0],[3,1],[3,2]]`

**建图**：
```
0 → 1
0 → 2
1 → 3
2 → 3
```

**DFS 顺序**：
1. 访问 0 → 访问 1 → 访问 3
2. 3 完成，加入结果：[3]
3. 1 完成，加入结果：[3, 1]
4. 访问 2 → 3 已完成，跳过
5. 2 完成，加入结果：[3, 1, 2]
6. 0 完成，加入结果：[3, 1, 2, 0]

**倒序**：[0, 2, 1, 3] ✅

## 方法二：BFS 拓扑排序（Kahn 算法）

### 核心思路

维护每个节点的入度，不断移除入度为0的节点。

**步骤**：
1. 计算所有节点的入度
2. 将入度为0的节点入队
3. 弹出节点，将其邻接节点入度-1
4. 新的入度为0的节点入队
5. 重复直到队列为空

### 代码实现

```typescript
function findOrder(numCourses: number, prerequisites: number[][]): number[] {
  // 建图 + 计算入度
  const graph: number[][] = Array.from({ length: numCourses }, () => []);
  const inDegree = new Array(numCourses).fill(0);
  
  for (const [ai, bi] of prerequisites) {
    graph[bi].push(ai);
    inDegree[ai]++;
  }
  
  // 将入度为0的节点入队
  const queue: number[] = [];
  for (let i = 0; i < numCourses; i++) {
    if (inDegree[i] === 0) {
      queue.push(i);
    }
  }
  
  const result: number[] = [];
  
  while (queue.length > 0) {
    const course = queue.shift()!;
    result.push(course);
    
    // 减少邻接节点的入度
    for (const next of graph[course]) {
      inDegree[next]--;
      if (inDegree[next] === 0) {
        queue.push(next);
      }
    }
  }
  
  // 检查是否所有课程都完成
  return result.length === numCourses ? result : [];
}
```

**时间复杂度**：$O(V + E)$  
**空间复杂度**：$O(V)$

### 执行过程

`numCourses = 4, prerequisites = [[1,0],[2,0],[3,1],[3,2]]`

**初始入度**：
```
0: 0
1: 1
2: 1
3: 2
```

**执行过程**：
1. 入队：[0]
2. 弹出 0，result: [0]，减少1和2的入度
   - 1: 1→0，入队
   - 2: 1→0，入队
3. 队列：[1, 2]
4. 弹出 1，result: [0, 1]，减少3的入度
   - 3: 2→1
5. 弹出 2，result: [0, 1, 2]，减少3的入度
   - 3: 1→0，入队
6. 弹出 3，result: [0, 1, 2, 3]

**结果**：[0, 1, 2, 3] ✅

## DFS vs BFS

| 特性 | DFS | BFS (Kahn) |
|------|-----|------------|
| 实现难度 | ⭐⭐⭐ | ⭐⭐ |
| 空间复杂度 | O(V) 调用栈 | O(V) 队列 |
| 是否需要倒序 | ✅ 需要 | ❌ 不需要 |
| 能否检测环 | ✅ 三色标记 | ✅ 检查输出数量 |
| 结果唯一性 | ❌ 不唯一 | ❌ 不唯一 |

**推荐**：BFS（Kahn算法）更直观易懂。

## 扩展：输出所有可能的拓扑排序

### 回溯 + DFS

```typescript
function allTopologicalSort(numCourses: number, prerequisites: number[][]): number[][] {
  const graph: number[][] = Array.from({ length: numCourses }, () => []);
  const inDegree = new Array(numCourses).fill(0);
  
  for (const [ai, bi] of prerequisites) {
    graph[bi].push(ai);
    inDegree[ai]++;
  }
  
  const result: number[][] = [];
  const path: number[] = [];
  const visited = new Array(numCourses).fill(false);
  
  function backtrack(): void {
    if (path.length === numCourses) {
      result.push([...path]);
      return;
    }
    
    for (let i = 0; i < numCourses; i++) {
      if (visited[i] || inDegree[i] > 0) continue;
      
      // 选择
      visited[i] = true;
      path.push(i);
      for (const next of graph[i]) {
        inDegree[next]--;
      }
      
      // 递归
      backtrack();
      
      // 撤销
      for (const next of graph[i]) {
        inDegree[next]++;
      }
      path.pop();
      visited[i] = false;
    }
  }
  
  backtrack();
  return result;
}
```

**时间复杂度**：$O(V! \times E)$（最坏情况）  
**适用场景**：课程数少（< 10）

## 实战应用

### 1. 项目依赖管理

```typescript
interface Task {
  id: string;
  dependencies: string[];
}

function buildOrder(tasks: Task[]): string[] {
  const idToIndex = new Map<string, number>();
  tasks.forEach((task, i) => idToIndex.set(task.id, i));
  
  const n = tasks.length;
  const graph: number[][] = Array.from({ length: n }, () => []);
  const inDegree = new Array(n).fill(0);
  
  for (let i = 0; i < n; i++) {
    for (const dep of tasks[i].dependencies) {
      const depIndex = idToIndex.get(dep)!;
      graph[depIndex].push(i);
      inDegree[i]++;
    }
  }
  
  // Kahn 算法
  const queue: number[] = [];
  for (let i = 0; i < n; i++) {
    if (inDegree[i] === 0) queue.push(i);
  }
  
  const result: string[] = [];
  
  while (queue.length > 0) {
    const idx = queue.shift()!;
    result.push(tasks[idx].id);
    
    for (const next of graph[idx]) {
      inDegree[next]--;
      if (inDegree[next] === 0) queue.push(next);
    }
  }
  
  return result.length === n ? result : [];
}

// 使用
const tasks: Task[] = [
  { id: 'build', dependencies: ['compile'] },
  { id: 'compile', dependencies: ['clean'] },
  { id: 'clean', dependencies: [] },
  { id: 'test', dependencies: ['build'] },
];

console.log(buildOrder(tasks));  // ['clean', 'compile', 'build', 'test']
```

### 2. Makefile 依赖解析

```typescript
class MakefileParser {
  parse(rules: string[]): string[] {
    // rules: ["target: dep1 dep2", ...]
    const graph = new Map<string, string[]>();
    const inDegree = new Map<string, number>();
    const allTargets = new Set<string>();
    
    for (const rule of rules) {
      const [target, deps] = rule.split(':');
      const depList = deps ? deps.trim().split(/\s+/) : [];
      
      allTargets.add(target);
      depList.forEach(d => allTargets.add(d));
      
      graph.set(target, depList);
      inDegree.set(target, (inDegree.get(target) || 0));
      
      for (const dep of depList) {
        inDegree.set(target, (inDegree.get(target) || 0) + 1);
      }
    }
    
    // Kahn 算法
    const queue: string[] = [];
    for (const target of allTargets) {
      if ((inDegree.get(target) || 0) === 0) {
        queue.push(target);
      }
    }
    
    const result: string[] = [];
    while (queue.length > 0) {
      const target = queue.shift()!;
      result.push(target);
      
      for (const [t, deps] of graph.entries()) {
        if (deps.includes(target)) {
          const degree = (inDegree.get(t) || 0) - 1;
          inDegree.set(t, degree);
          if (degree === 0) queue.push(t);
        }
      }
    }
    
    return result;
  }
}
```

## 常见陷阱

### 1. 建图方向错误

```typescript
// ❌ 错误：箭头方向反了
for (const [ai, bi] of prerequisites) {
  graph[ai].push(bi);  // 错：ai → bi
}

// ✅ 正确：bi是ai的前置
for (const [ai, bi] of prerequisites) {
  graph[bi].push(ai);  // 对：bi → ai
}
```

### 2. 忘记检查环

```typescript
// ❌ 错误：没检查是否所有课程都完成
return result;

// ✅ 正确：检查输出数量
return result.length === numCourses ? result : [];
```

### 3. DFS 忘记倒序

```typescript
// ❌ 错误：直接返回
return result;

// ✅ 正确：倒序
return result.reverse();
```

## 总结

**核心要点**：
1. 拓扑排序 = DAG（有向无环图）的线性顺序
2. DFS：后序遍历倒序
3. BFS（Kahn）：不断移除入度为0的节点
4. 检测环：输出数量 !== 节点数

**选择建议**：
- **BFS（Kahn）**：更直观，推荐
- **DFS**：需要理解后序遍历

**应用场景**：
- 项目构建依赖
- 课程规划
- 任务调度
- Makefile 解析

拓扑排序是图论的基础技能，务必掌握！
