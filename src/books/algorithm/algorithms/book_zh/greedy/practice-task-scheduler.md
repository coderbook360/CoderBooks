# 实战：任务调度器

> LeetCode 621. 任务调度器 | 难度：中等

贪心与数学的优雅结合，理解"冷却时间决定下界"的关键洞察。

📎 [LeetCode 621. 任务调度器](https://leetcode.cn/problems/task-scheduler/)

---

## 题目描述

给定一个用字符数组表示的 CPU 任务列表。相同任务之间必须有 n 个冷却时间。

在冷却期内，CPU 可以执行其他任务或者空闲。

求完成所有任务所需的**最短时间**。

**示例1**：
```
输入：tasks = ["A","A","A","B","B","B"], n = 2
输出：8
解释：A -> B -> 待机 -> A -> B -> 待机 -> A -> B
```

**示例2**：
```
输入：tasks = ["A","A","A","B","B","B"], n = 0
输出：6
解释：冷却时间为0，任务可以连续执行
```

**示例3**：
```
输入：tasks = ["A","A","A","A","B","B","C"], n = 2
输出：10
解释：A -> B -> C -> A -> B -> 待机 -> A -> 待机 -> 待机 -> A
```

---

## 问题分析

### 核心洞察

**出现次数最多的任务决定了最短时间的下界**。

为什么？因为最高频任务之间必须间隔 n 个单位时间，这是无法避免的约束。

### 两种情况

1. **任务不够多**：需要空闲时间来满足冷却要求
2. **任务足够多**：空闲时间被其他任务填满，总时间等于任务数量

---

## 解法一：数学公式

### 核心公式

设最大频率为 `maxFreq`，有 `maxCount` 个任务达到最大频率。

```
最少时间 = max(任务总数, (maxFreq - 1) * (n + 1) + maxCount)
```

### 公式推导

以 `tasks = ["A","A","A","B","B","B"], n = 2` 为例：

```
maxFreq = 3 (A 和 B 都出现3次)
maxCount = 2 (有2个任务达到最大频率)

构建时间框架（以最高频任务为骨架）：

周期1   周期2   尾部
[A B _] [A B _] [A B]
 \_____/ \_____/
  n+1=3   n+1=3

时间 = (maxFreq - 1) * (n + 1) + maxCount
     = (3 - 1) * (2 + 1) + 2
     = 2 * 3 + 2
     = 8
```

### 为什么是 `maxFreq - 1`？

- 最后一个周期不需要完整的 `n+1` 个时间单位
- 只需要放置达到最大频率的 `maxCount` 个任务

### 代码实现

```typescript
function leastInterval(tasks: string[], n: number): number {
  // 统计频率
  const freq = new Map<string, number>();
  let maxFreq = 0;
  
  for (const task of tasks) {
    freq.set(task, (freq.get(task) || 0) + 1);
    maxFreq = Math.max(maxFreq, freq.get(task)!);
  }
  
  // 统计有多少任务达到最大频率
  let maxCount = 0;
  for (const count of freq.values()) {
    if (count === maxFreq) {
      maxCount++;
    }
  }
  
  // 公式计算
  const minTime = (maxFreq - 1) * (n + 1) + maxCount;
  
  // 取两者最大值
  return Math.max(minTime, tasks.length);
}
```

---

## 执行过程详解

### 例1：任务不够（需要空闲）

```
tasks = ["A","A","A","B","B","B"], n = 2
任务总数 = 6

maxFreq = 3
maxCount = 2 (A 和 B)

框架构建：
周期1: [A][B][_]  (n+1 = 3 slots)
周期2: [A][B][_]
尾部:  [A][B]     (只有 maxCount = 2 个)

公式 = (3-1) * 3 + 2 = 8
任务数 = 6 < 8

答案 = max(6, 8) = 8 ✓
```

### 例2：任务足够（无空闲）

```
tasks = ["A","A","B","B","C","C","D","D"], n = 1
任务总数 = 8

maxFreq = 2
maxCount = 4 (A, B, C, D 都是2次)

框架构建：
周期1: [A][B]  (n+1 = 2 slots)
尾部:  [A][B][C][D]  ← 4个任务

等等，让我重新分析：
公式 = (2-1) * 2 + 4 = 6
任务数 = 8 > 6

实际调度：A B C D A B C D
（无需空闲，每个时间点都有任务）

答案 = max(8, 6) = 8 ✓
```

### 例3：复杂情况

```
tasks = ["A","A","A","A","B","B","C"], n = 2
任务总数 = 7

maxFreq = 4 (只有 A)
maxCount = 1

框架构建：
周期1: [A][_][_]
周期2: [A][_][_]
周期3: [A][_][_]
尾部:  [A]

可填入其他任务（B=2, C=1）：
周期1: [A][B][C]
周期2: [A][B][_]  ← 只剩1个空位
周期3: [A][_][_]  ← 2个空位，但没有任务了
尾部:  [A]

公式 = (4-1) * 3 + 1 = 10
任务数 = 7 < 10

答案 = max(7, 10) = 10 ✓

调度：A -> B -> C -> A -> B -> 空 -> A -> 空 -> 空 -> A
```

---

## 解法二：模拟（堆）

用最大堆模拟实际调度过程：

```typescript
function leastIntervalSimulation(tasks: string[], n: number): number {
  // 统计频率
  const freq = new Map<string, number>();
  for (const task of tasks) {
    freq.set(task, (freq.get(task) || 0) + 1);
  }
  
  // 最大堆（存储剩余次数）
  let heap = [...freq.values()].sort((a, b) => b - a);
  
  let time = 0;
  
  while (heap.length > 0) {
    const temp: number[] = [];  // 本轮减少后还有剩余的任务
    let slots = n + 1;          // 本周期可用的时间槽
    
    // 在一个周期内尽量执行不同任务
    while (slots > 0 && heap.length > 0) {
      const count = heap.shift()!;
      if (count > 1) {
        temp.push(count - 1);
      }
      slots--;
      time++;
    }
    
    // 如果还有任务需要冷却，填充空闲时间
    if (temp.length > 0) {
      time += slots;  // 剩余的 slots 变成空闲时间
    }
    
    // 将剩余任务放回堆
    heap = [...heap, ...temp].sort((a, b) => b - a);
  }
  
  return time;
}
```

### 模拟过程

```
tasks = ["A","A","A","B","B","B"], n = 2
freq: A=3, B=3
heap: [3, 3]

周期1 (slots=3):
  取出 3, 剩余 2, temp=[2]
  取出 3, 剩余 2, temp=[2,2]
  slots=1, 空闲
  time = 3, heap=[2,2]

周期2 (slots=3):
  取出 2, 剩余 1, temp=[1]
  取出 2, 剩余 1, temp=[1,1]
  slots=1, 空闲
  time = 6, heap=[1,1]

周期3 (slots=3):
  取出 1, 剩余 0, temp=[]
  取出 1, 剩余 0, temp=[]
  slots=1, 但 temp 为空，不加空闲
  time = 8, heap=[]

答案 = 8 ✓
```

---

## 复杂度分析

### 数学公式解法
- **时间复杂度**：O(n)，遍历任务统计频率
- **空间复杂度**：O(1)，最多 26 种任务类型

### 模拟解法
- **时间复杂度**：O(n log n)，每次需要排序
- **空间复杂度**：O(26) = O(1)

---

## 常见错误

### 错误1：忘记取 max

```typescript
// ❌ 错误：任务足够多时，公式结果可能小于任务数
return (maxFreq - 1) * (n + 1) + maxCount;

// ✅ 正确：取两者最大值
return Math.max(minTime, tasks.length);
```

### 错误2：maxCount 理解错误

```typescript
// ❌ 错误：只统计一个最高频任务
let maxCount = 1;  // 可能有多个任务都达到最高频率

// ✅ 正确：统计所有达到最高频率的任务
for (const count of freq.values()) {
  if (count === maxFreq) maxCount++;
}
```

### 错误3：冷却时间理解错误

```
// 冷却时间 n = 2 表示相同任务之间需要间隔 2 个时间单位
// 即：A _ _ A（两个 A 之间有 2 个空位）
// 一个完整周期 = n + 1 = 3 个时间单位
```

---

## 问题变体

### 变体1：返回具体调度序列

```typescript
function taskSchedulerWithOrder(tasks: string[], n: number): string[] {
  const freq = new Map<string, number>();
  for (const task of tasks) {
    freq.set(task, (freq.get(task) || 0) + 1);
  }
  
  const result: string[] = [];
  const entries = [...freq.entries()];
  
  while (entries.some(([_, count]) => count > 0)) {
    // 按剩余次数排序
    entries.sort((a, b) => b[1] - a[1]);
    
    let slots = n + 1;
    for (let i = 0; i < entries.length && slots > 0; i++) {
      if (entries[i][1] > 0) {
        result.push(entries[i][0]);
        entries[i][1]--;
        slots--;
      }
    }
    
    // 填充空闲（如果还有任务需要执行）
    if (entries.some(([_, count]) => count > 0)) {
      while (slots > 0) {
        result.push('idle');
        slots--;
      }
    }
  }
  
  return result;
}
```

### 变体2：不同任务有不同冷却时间

这种情况下公式不适用，需要用模拟或优先队列解决。

---

## 相关题目

- LeetCode 358. K 距离间隔重排字符串
- LeetCode 767. 重构字符串
- LeetCode 1405. 最长快乐字符串

---

## 总结

任务调度器展示了数学推导和贪心思维的完美结合：

1. **识别瓶颈**：最高频任务决定了时间下界
2. **构建框架**：以最高频任务为骨架，填充其他任务
3. **公式推导**：`(maxFreq - 1) * (n + 1) + maxCount`
4. **边界处理**：任务足够多时不需要空闲

**核心思想**：先分析约束的本质（冷却时间），再找到决定性因素（最高频率），最后推导出数学公式。
```
