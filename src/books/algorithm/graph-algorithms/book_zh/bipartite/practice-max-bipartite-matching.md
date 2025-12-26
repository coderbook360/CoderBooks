# 实战：二分图最大匹配应用

本章通过实际问题展示二分图最大匹配的应用场景和实现。

## 问题一：工作分配

### 问题描述

有 m 个工人和 n 个工作，每个工人有一个能胜任的工作列表。

求最多能完成多少个工作（每个工人最多做一个工作，每个工作最多分配给一个工人）。

### 建模

- 左侧：m 个工人
- 右侧：n 个工作
- 边：工人能胜任的工作
- 目标：最大匹配数

### 匈牙利算法实现

```typescript
function maxJobAssignment(workers: number[][], n: number): number {
  const m = workers.length;
  const match = new Array(n).fill(-1);  // match[job] = worker
  let count = 0;
  
  function dfs(worker: number, visited: boolean[]): boolean {
    for (const job of workers[worker]) {
      if (visited[job]) continue;
      visited[job] = true;
      
      // 如果工作未分配，或者占用者可以换工作
      if (match[job] === -1 || dfs(match[job], visited)) {
        match[job] = worker;
        return true;
      }
    }
    
    return false;
  }
  
  for (let worker = 0; worker < m; worker++) {
    const visited = new Array(n).fill(false);
    if (dfs(worker, visited)) {
      count++;
    }
  }
  
  return count;
}

// 使用示例
const workers = [
  [0, 2],    // 工人0能做工作0和2
  [1, 2],    // 工人1能做工作1和2
  [1, 3],    // 工人2能做工作1和3
];
const n = 4;  // 4个工作

console.log(maxJobAssignment(workers, n));  // 输出：3
```

**时间复杂度**：$O(V \times E)$，V = 工人数，E = 边数  
**空间复杂度**：$O(V + E)$

### 执行过程

```
工人 → 工作关系：
工人0 → {0, 2}
工人1 → {1, 2}
工人2 → {1, 3}

匹配过程：
1. 工人0：选择工作0 → match[0] = 0
2. 工人1：选择工作1 → match[1] = 1
3. 工人2：工作1已被占用，尝试让工人1换工作
   → 工人1换到工作2 → match[2] = 1
   → 工人2占用工作1 → match[1] = 2

最终匹配：
工作0 ← 工人0
工作1 ← 工人2
工作2 ← 工人1
工作3 未分配

最大匹配数：3
```

## 问题二：学生课程分配

### LeetCode 1349. Maximum Students Taking Exam

教室有 m×n 个座位，某些座位损坏。学生不能坐在损坏座位，也不能与左右相邻的学生坐在一起。

求最多能容纳多少学生。

### 建模（简化版本）

对于每一行：
- 左侧：可用座位（奇数列）
- 右侧：可用座位（偶数列）
- 边：不相邻的座位
- 目标：最大匹配

### 代码实现

```typescript
function maxStudents(seats: string[][]): number {
  const m = seats.length;
  const n = seats[0].length;
  
  // 将座位编号
  const id = Array.from({ length: m }, () => new Array(n).fill(-1));
  let count = 0;
  
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      if (seats[i][j] === '.') {
        id[i][j] = count++;
      }
    }
  }
  
  // 构建二分图
  const graph: number[][] = Array.from({ length: count }, () => []);
  
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j += 2) {  // 奇数列
      if (id[i][j] === -1) continue;
      
      const u = id[i][j];
      
      // 右边座位
      if (j + 1 < n && id[i][j + 1] !== -1) {
        graph[u].push(id[i][j + 1]);
      }
      
      // 左前方
      if (i > 0 && j > 0 && id[i - 1][j - 1] !== -1) {
        graph[u].push(id[i - 1][j - 1]);
      }
      
      // 右前方
      if (i > 0 && j + 1 < n && id[i - 1][j + 1] !== -1) {
        graph[u].push(id[i - 1][j + 1]);
      }
    }
  }
  
  // 最大匹配
  const match = new Array(count).fill(-1);
  let matched = 0;
  
  function dfs(u: number, visited: boolean[]): boolean {
    for (const v of graph[u]) {
      if (visited[v]) continue;
      visited[v] = true;
      
      if (match[v] === -1 || dfs(match[v], visited)) {
        match[v] = u;
        return true;
      }
    }
    return false;
  }
  
  for (let i = 0; i < count; i++) {
    if (graph[i].length > 0 && dfs(i, new Array(count).fill(false))) {
      matched++;
    }
  }
  
  return count - matched;  // 未匹配的座位 + 匹配的座位
}
```

## 问题三：任务机器匹配

### 问题描述

有 n 个任务和 m 台机器，每个任务可以在若干台机器上执行。

每个任务有执行时间 `time[i]`，每台机器同一时刻只能执行一个任务。

求最短完成时间。

### 建模

- 将时间离散化为时间片
- 左侧：任务×时间片
- 右侧：机器×时间片
- 边：任务可以在该机器该时间片执行
- 目标：最大匹配数 = 任务数

### 代码实现

```typescript
function minimumTime(tasks: number[][], machines: number[]): number {
  const n = tasks.length;
  const m = machines.length;
  
  // 二分答案
  let left = 0, right = 1000000;
  
  while (left < right) {
    const mid = Math.floor((left + right) / 2);
    
    if (canFinish(tasks, machines, mid)) {
      right = mid;
    } else {
      left = mid + 1;
    }
  }
  
  return left;
}

function canFinish(tasks: number[][], machines: number[], timeLimit: number): boolean {
  const n = tasks.length;
  const m = machines.length;
  
  // 构建二分图
  const graph: number[][] = Array.from({ length: n }, () => []);
  
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < m; j++) {
      if (tasks[i].includes(j)) {  // 任务i可以在机器j上执行
        graph[i].push(j);
      }
    }
  }
  
  // 最大匹配
  const match = new Array(m).fill(-1);
  let matched = 0;
  
  function dfs(task: number, visited: boolean[]): boolean {
    for (const machine of graph[task]) {
      if (visited[machine]) continue;
      visited[machine] = true;
      
      if (match[machine] === -1 || dfs(match[machine], visited)) {
        match[machine] = task;
        return true;
      }
    }
    return false;
  }
  
  for (let i = 0; i < n; i++) {
    if (dfs(i, new Array(m).fill(false))) {
      matched++;
    }
  }
  
  return matched === n;
}
```

## 问题四：项目人员分配

### 问题描述

有 n 个项目和 m 个员工，每个项目需要特定技能，每个员工有一组技能。

求最多能完成多少个项目。

### 实现

```typescript
interface Project {
  id: number;
  requiredSkills: Set<string>;
}

interface Employee {
  id: number;
  skills: Set<string>;
}

function maxProjectsCompleted(projects: Project[], employees: Employee[]): number {
  const n = projects.length;
  const m = employees.length;
  
  // 构建二分图：项目 → 员工
  const graph: number[][] = Array.from({ length: n }, () => []);
  
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < m; j++) {
      // 检查员工是否具备项目所需技能
      const hasAllSkills = Array.from(projects[i].requiredSkills).every(
        skill => employees[j].skills.has(skill)
      );
      
      if (hasAllSkills) {
        graph[i].push(j);
      }
    }
  }
  
  // 最大匹配
  const match = new Array(m).fill(-1);
  let count = 0;
  
  function dfs(project: number, visited: boolean[]): boolean {
    for (const employee of graph[project]) {
      if (visited[employee]) continue;
      visited[employee] = true;
      
      if (match[employee] === -1 || dfs(match[employee], visited)) {
        match[employee] = project;
        return true;
      }
    }
    return false;
  }
  
  for (let i = 0; i < n; i++) {
    if (dfs(i, new Array(m).fill(false))) {
      count++;
    }
  }
  
  return count;
}

// 使用示例
const projects: Project[] = [
  { id: 0, requiredSkills: new Set(['js', 'react']) },
  { id: 1, requiredSkills: new Set(['python', 'django']) },
  { id: 2, requiredSkills: new Set(['js', 'vue']) },
];

const employees: Employee[] = [
  { id: 0, skills: new Set(['js', 'react', 'vue']) },
  { id: 1, skills: new Set(['python', 'django', 'flask']) },
  { id: 2, skills: new Set(['js', 'angular']) },
];

console.log(maxProjectsCompleted(projects, employees));  // 输出：2
```

## 优化：Hopcroft-Karp 算法

对于大规模问题，Hopcroft-Karp 算法更高效：$O(E \sqrt{V})$

```typescript
function maxMatchingHK(graph: number[][], m: number): number {
  const n = graph.length;
  const pairU = new Array(n).fill(-1);
  const pairV = new Array(m).fill(-1);
  const dist = new Array(n);
  
  function bfs(): boolean {
    const queue: number[] = [];
    
    for (let u = 0; u < n; u++) {
      if (pairU[u] === -1) {
        dist[u] = 0;
        queue.push(u);
      } else {
        dist[u] = Infinity;
      }
    }
    
    dist[-1] = Infinity;
    
    while (queue.length > 0) {
      const u = queue.shift()!;
      
      if (dist[u] < dist[-1]) {
        for (const v of graph[u]) {
          if (dist[pairV[v]] === Infinity) {
            dist[pairV[v]] = dist[u] + 1;
            queue.push(pairV[v]);
          }
        }
      }
    }
    
    return dist[-1] !== Infinity;
  }
  
  function dfs(u: number): boolean {
    if (u !== -1) {
      for (const v of graph[u]) {
        if (dist[pairV[v]] === dist[u] + 1) {
          if (dfs(pairV[v])) {
            pairV[v] = u;
            pairU[u] = v;
            return true;
          }
        }
      }
      
      dist[u] = Infinity;
      return false;
    }
    
    return true;
  }
  
  let matching = 0;
  
  while (bfs()) {
    for (let u = 0; u < n; u++) {
      if (pairU[u] === -1 && dfs(u)) {
        matching++;
      }
    }
  }
  
  return matching;
}
```

## 总结

**二分图最大匹配的应用场景**：
1. 工作分配
2. 座位安排
3. 任务调度
4. 项目人员分配

**算法选择**：
- **匈牙利算法**：$O(V \times E)$，实现简单
- **Hopcroft-Karp**：$O(E \sqrt{V})$，大规模高效

**建模关键**：
1. 识别左右两侧集合
2. 确定边的连接规则
3. 应用最大匹配算法

掌握二分图最大匹配，是解决分配问题的关键！
