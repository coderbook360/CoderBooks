# 实战：加油站

> LeetCode 134. 加油站 | 难度：中等

环形路线的贪心分析，理解"起点选择"问题的经典案例。

📎 [LeetCode 134. 加油站](https://leetcode.cn/problems/gas-station/)

---

## 题目描述

在一条环路上有 n 个加油站，第 i 个加油站有汽油 `gas[i]` 升。

从第 i 个加油站开往第 i+1 个加油站需要消耗汽油 `cost[i]` 升。

从其中一个加油站出发，开始时油箱为空。如果可以绕环路行驶一周，返回出发的加油站编号，否则返回 -1。

**题目保证答案唯一（如果存在）。**

**示例1**：
```
输入：gas = [1,2,3,4,5], cost = [3,4,5,1,2]
输出：3
解释：从3号站出发，可以绕环路一周
```

**示例2**：
```
输入：gas = [2,3,4], cost = [3,4,3]
输出：-1
解释：无论从哪个站出发都无法完成环路
```

---

## 思路分析

### 问题的本质

把每个加油站看成一个"净收益"：`diff[i] = gas[i] - cost[i]`

- `diff[i] > 0`：在这站能"赚"油
- `diff[i] < 0`：在这站会"亏"油

**问题转化**：找一个起点，使得从这个起点开始累加 `diff`，任何时刻都不小于0。

### 关键洞察

**洞察1：总量决定可行性**

如果 `sum(gas) >= sum(cost)`，即 `sum(diff) >= 0`，一定存在可行起点。

**为什么？** 想象把环形数组"展开"，总和非负意味着正数足够抵消负数。一定存在一个位置，从这里开始累加，前缀和始终非负。

**洞察2：排除不可能的起点**

如果从站 A 出发，在站 B 首次油量变负：
- 说明 A 到 B 这段路的 `sum(diff)` 为负
- 那么从 A 到 B 之间的任何站出发，到达 B 时油量只会更少（因为少走了一些正收益段）
- 所以这些站都不可能是正确起点

**结论**：一旦油量变负，新起点一定在当前位置之后。

---

## 代码实现

```typescript
function canCompleteCircuit(gas: number[], cost: number[]): number {
  let totalGas = 0;     // 总净收益，用于判断是否有解
  let currentGas = 0;   // 从当前起点出发的累计油量
  let startStation = 0; // 当前尝试的起点
  
  for (let i = 0; i < gas.length; i++) {
    const diff = gas[i] - cost[i];
    totalGas += diff;
    currentGas += diff;
    
    // 油量变负，当前起点不可行
    if (currentGas < 0) {
      // 根据洞察2，新起点一定在 i+1
      startStation = i + 1;
      currentGas = 0;  // 重新开始累计
    }
  }
  
  // 根据洞察1：总量非负则有解，否则无解
  return totalGas >= 0 ? startStation : -1;
}
```

### 代码逻辑详解

1. **为什么 `startStation = i + 1`？**
   - 根据洞察2，从 A 无法到达 B 时，A 到 B 之间的所有站都不可能是起点
   - 所以直接跳到 B 的下一站尝试

2. **为什么只需遍历一次？**
   - 我们在遍历中找到了"最后一个失败点"
   - 如果总量非负，从失败点下一站出发一定能成功

---

## 执行过程详解

```
gas  = [1, 2, 3, 4, 5]
cost = [3, 4, 5, 1, 2]
diff = [-2,-2,-2, 3, 3]

遍历过程：
i=0: diff=-2, currentGas=-2 < 0
  → startStation=1, currentGas=0

i=1: diff=-2, currentGas=-2 < 0
  → startStation=2, currentGas=0

i=2: diff=-2, currentGas=-2 < 0
  → startStation=3, currentGas=0

i=3: diff=3, currentGas=3 >= 0 ✓

i=4: diff=3, currentGas=6 >= 0 ✓

totalGas = -2-2-2+3+3 = 0 >= 0 ✓

返回 startStation=3
```

**验证从站3出发**：
```
站3: 加油4，开到站4消耗1 → 剩余3
站4: 加油5，开到站0消耗2 → 剩余6
站0: 加油1，开到站1消耗3 → 剩余4
站1: 加油2，开到站2消耗4 → 剩余2
站2: 加油3，开到站3消耗5 → 剩余0 ✓ 回到起点
```

---

## 贪心正确性证明

### 证明洞察1

**命题**：如果 `sum(diff) >= 0`，一定存在可行起点。

**证明**：
考虑累计前缀和数组 `prefix[i] = sum(diff[0..i])`。

找到 `prefix` 的最小值点 `min_idx`。从 `min_idx + 1` 出发：
- 从这个点开始，前缀和从"谷底"开始上升
- 由于 `sum(diff) >= 0`，从谷底走完一圈，累计值非负
- 途中不会再次低于谷底（否则那里才是真正的最小值）

### 证明洞察2

**命题**：如果从 A 出发在 B 首次油量变负，则 A 和 B 之间的任何点 C 都不能作为起点到达 B。

**证明**：
设从 A 到 C 的净收益为 S_AC，从 C 到 B 的净收益为 S_CB。

- 从 A 到 B 油量变负：S_AC + S_CB < 0
- 从 A 能到达 C：S_AC >= 0
- 因此：S_CB < 0

所以从 C 出发到 B，油量为 S_CB < 0，无法到达。

---

## 复杂度分析

- **时间复杂度**：O(n)，一次遍历
- **空间复杂度**：O(1)，只用常量空间

---

## 暴力解法对比

```typescript
function canCompleteCircuitBrute(gas: number[], cost: number[]): number {
  const n = gas.length;
  
  for (let start = 0; start < n; start++) {
    let tank = 0;
    let canComplete = true;
    
    for (let i = 0; i < n; i++) {
      const station = (start + i) % n;
      tank += gas[station] - cost[station];
      
      if (tank < 0) {
        canComplete = false;
        break;
      }
    }
    
    if (canComplete) return start;
  }
  
  return -1;
}
```

- **时间复杂度**：O(n²)
- 贪心解法利用了"失败信息"，避免了重复尝试

---

## 常见错误

### 错误1：忘记判断总量

```typescript
// ❌ 错误：没有检查 totalGas
function canCompleteCircuit(gas: number[], cost: number[]): number {
  let currentGas = 0;
  let startStation = 0;
  
  for (let i = 0; i < gas.length; i++) {
    currentGas += gas[i] - cost[i];
    if (currentGas < 0) {
      startStation = i + 1;
      currentGas = 0;
    }
  }
  
  return startStation;  // 可能返回无效答案
}
```

当 `totalGas < 0` 时，应该返回 -1。

### 错误2：没有理解起点跳跃

```typescript
// ❌ 效率低：逐个尝试起点
if (currentGas < 0) {
  startStation++;  // 应该是 startStation = i + 1
}
```

---

## 问题变体

### 变体：双向环路

如果可以顺时针或逆时针行驶，如何解决？

分别对正向和反向数组运行算法，取存在解的那个。

### 变体：多个有效起点

如果题目不保证答案唯一，返回所有可行起点：

需要对每个候选起点进行验证，或使用更复杂的区间分析。

---

## 相关题目

- LeetCode 871. 最低加油次数（贪心 + 堆）
- LeetCode 1236. 网络爬虫（图遍历 + 起点选择）

---

## 总结

加油站问题展示了贪心的两个核心技巧：

1. **全局判断**：总量决定是否有解
2. **局部排除**：失败信息帮助跳过无效候选

这种"一次遍历找起点"的模式在很多问题中都有应用。关键是理解为什么可以跳过某些候选，而不是逐个尝试。
