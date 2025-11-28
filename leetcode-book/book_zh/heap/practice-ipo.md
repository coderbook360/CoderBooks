# 实战：IPO问题

## 题目描述

**LeetCode 502**：假设力扣（LeetCode）即将开始 IPO。为了以更高的价格将股票卖给风险投资公司，力扣希望在 IPO 之前开展一些项目以增加其资本。

给你 `n` 个项目，第 `i` 个项目具有纯利润 `profits[i]`，以及启动该项目需要的最小资本 `capital[i]`。

最初你的资本为 `w`。当你完成一个项目时，你将获得纯利润，且利润将被添加到你的总资本中。

总而言之，从给定项目中选择**最多 k 个**不同项目的列表，以**最大化最终资本**，并输出最终可获得的最多资本。

**示例**：

```
输入: k = 2, w = 0, profits = [1,2,3], capital = [0,1,1]
输出: 4
解释:
- 初始资本 w = 0，只能启动项目 0（资本需求 0）
- 完成项目 0，资本变为 0 + 1 = 1
- 现在可以启动项目 1 或 2（都需要资本 1）
- 选择项目 2（利润更高），资本变为 1 + 3 = 4
- 完成 2 个项目，最终资本 4

输入: k = 3, w = 0, profits = [1,2,3], capital = [0,1,2]
输出: 6
```

## 思路分析

这是一道典型的**贪心 + 堆**问题。

### 贪心策略

每次选择项目时，从**当前资本能启动的项目中，选择利润最高的**。

为什么这是最优的？
- 完成项目的顺序不影响最终总利润（利润是累加的）
- 但先做利润高的项目，能更快积累资本
- 更多资本意味着更多选择，可能解锁利润更高的项目

### 双堆策略

如何高效实现这个贪心策略？

1. **按资本需求排序**：先把所有项目按资本需求升序排列
2. **最大堆存储可行项目**：把当前资本能启动的项目加入最大堆（按利润）
3. **选择利润最高的**：从堆顶取出利润最高的项目执行
4. **更新资本**：资本增加，可能解锁新项目
5. **重复 k 次**

## 代码实现

```javascript
function findMaximizedCapital(k, w, profits, capital) {
    const n = profits.length;
    
    // 把项目打包：[资本需求, 利润]
    const projects = [];
    for (let i = 0; i < n; i++) {
        projects.push([capital[i], profits[i]]);
    }
    
    // 按资本需求升序排序
    projects.sort((a, b) => a[0] - b[0]);
    
    // 最大堆存储当前可执行项目的利润
    const maxHeap = new MaxHeap();
    
    let i = 0;  // 指向下一个待考虑的项目
    
    // 最多执行 k 个项目
    while (k > 0) {
        // 把所有当前资本能启动的项目加入堆
        while (i < n && projects[i][0] <= w) {
            maxHeap.push(projects[i][1]);  // 只需存利润
            i++;
        }
        
        // 如果没有可执行的项目，结束
        if (maxHeap.size() === 0) break;
        
        // 选择利润最高的项目执行
        w += maxHeap.pop();
        k--;
    }
    
    return w;
}
```

## 执行过程详解

以 `k = 2, w = 0, profits = [1,2,3], capital = [0,1,1]` 为例：

```
项目列表：
项目0: 资本需求=0, 利润=1
项目1: 资本需求=1, 利润=2
项目2: 资本需求=1, 利润=3

按资本需求排序后：
[(0,1), (1,2), (1,3)]

初始状态：w = 0, k = 2, i = 0

第一轮 (k=2):
  - 检查 projects[0]=(0,1)，资本需求0 <= w(0)，加入堆
  - 检查 projects[1]=(1,2)，资本需求1 > w(0)，停止
  - maxHeap = [1]
  - 取出利润1，w = 0 + 1 = 1
  
第二轮 (k=1):
  - 检查 projects[1]=(1,2)，资本需求1 <= w(1)，加入堆
  - 检查 projects[2]=(1,3)，资本需求1 <= w(1)，加入堆
  - maxHeap = [3, 2]（最大堆，3在堆顶）
  - 取出利润3，w = 1 + 3 = 4

k=0，结束
返回 4
```

## 完整代码

```javascript
class MaxHeap {
    constructor() {
        this.heap = [];
    }
    
    push(val) {
        this.heap.push(val);
        this.siftUp(this.heap.length - 1);
    }
    
    pop() {
        if (this.heap.length === 0) return undefined;
        const top = this.heap[0];
        const last = this.heap.pop();
        if (this.heap.length > 0) {
            this.heap[0] = last;
            this.siftDown(0);
        }
        return top;
    }
    
    peek() {
        return this.heap[0];
    }
    
    size() {
        return this.heap.length;
    }
    
    siftUp(i) {
        while (i > 0) {
            const parent = Math.floor((i - 1) / 2);
            if (this.heap[i] <= this.heap[parent]) break;
            [this.heap[i], this.heap[parent]] = [this.heap[parent], this.heap[i]];
            i = parent;
        }
    }
    
    siftDown(i) {
        const n = this.heap.length;
        while (true) {
            let largest = i;
            const left = 2 * i + 1;
            const right = 2 * i + 2;
            if (left < n && this.heap[left] > this.heap[largest]) largest = left;
            if (right < n && this.heap[right] > this.heap[largest]) largest = right;
            if (largest === i) break;
            [this.heap[i], this.heap[largest]] = [this.heap[largest], this.heap[i]];
            i = largest;
        }
    }
}

function findMaximizedCapital(k, w, profits, capital) {
    const n = profits.length;
    
    const projects = [];
    for (let i = 0; i < n; i++) {
        projects.push([capital[i], profits[i]]);
    }
    
    projects.sort((a, b) => a[0] - b[0]);
    
    const maxHeap = new MaxHeap();
    let i = 0;
    
    while (k > 0) {
        while (i < n && projects[i][0] <= w) {
            maxHeap.push(projects[i][1]);
            i++;
        }
        
        if (maxHeap.size() === 0) break;
        
        w += maxHeap.pop();
        k--;
    }
    
    return w;
}
```

## 为什么不用两个堆？

有些解法用两个堆：最小堆按资本排序，最大堆按利润排序。

但这不是必要的——先按资本排序，再用一个最大堆就够了：
- 排序后，项目按资本需求从小到大排列
- 随着资本增加，依次把能启动的项目加入最大堆
- 这样更简洁，空间效率更高

## 复杂度分析

- **时间复杂度**：O(n log n)
  - 排序 O(n log n)
  - 每个项目最多入堆出堆一次，O(n log n)

- **空间复杂度**：O(n)
  - 项目数组 O(n)
  - 堆最大 O(n)

## 贪心正确性证明

为什么"每次选择利润最高"是最优的？

**交换论证**：假设最优解不是每次选最大利润，而是某次选了利润较小的项目 A，后面选了利润较大的项目 B。

交换 A 和 B 的顺序：
- 如果 B 在 A 之前也能启动（资本足够），交换后利润不变
- 但先做 B 能更快积累资本，可能解锁更多选择

所以贪心选择不会比其他选择差。

## 类似问题

**会议室调度**：有多个会议，每个有开始时间、持续时间、收益，一个会议室最多同时开一个会议，求最大收益。

**任务调度**：有多个任务，每个有截止时间和收益，求能完成的最大收益。

这类问题的共同模式：
1. 贪心策略确定选择顺序
2. 堆维护当前可选的最优候选

## 小结

这道题展示了**贪心 + 堆**的经典组合：

**核心模式**：
- 按某个属性排序（解锁条件）
- 用堆维护当前可选项（按另一个属性排序）
- 贪心选择最优的可选项

**适用场景**：
- 带约束的选择最优问题
- 需要根据已有结果动态解锁新选项
- "越早获得回报，越有利于后续选择"的问题
