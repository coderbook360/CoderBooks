# 实战：跳跃游戏 II

> LeetCode 45. 跳跃游戏 II | 难度：中等

最少跳跃次数的贪心解法。

---

## 题目描述

给定一个非负整数数组，初始位于第一个位置。数组中的每个元素代表在该位置可以跳跃的最大长度。

假设总是可以到达最后一个位置，求**最少的跳跃次数**。

**示例**：
```
输入：nums = [2,3,1,1,4]
输出：2
解释：跳到位置1，再跳到末尾。最少2次。
```

---

## 思路分析

**贪心策略**：在当前跳跃范围内，选择能跳到最远的位置作为下一跳。

关键洞察：我们不需要知道具体跳到哪个位置，只需要知道这一跳的范围内能达到的最远距离。

---

## 代码实现

```typescript
function jump(nums: number[]): number {
  const n = nums.length;
  if (n <= 1) return 0;
  
  let jumps = 0;       // 跳跃次数
  let currentEnd = 0;  // 当前跳跃的边界
  let farthest = 0;    // 下一跳能到达的最远位置
  
  for (let i = 0; i < n - 1; i++) {
    // 更新最远可达
    farthest = Math.max(farthest, i + nums[i]);
    
    // 到达当前跳跃的边界，必须跳跃
    if (i === currentEnd) {
      jumps++;
      currentEnd = farthest;
      
      // 如果已经能到达终点
      if (currentEnd >= n - 1) {
        break;
      }
    }
  }
  
  return jumps;
}
```

---

## 图示

```
nums = [2,3,1,1,4]
索引:   0 1 2 3 4

第1跳范围: [0,2]
  从0能跳到: 0+2=2
  从1能跳到: 1+3=4 ← 最远
  从2能跳到: 2+1=3
  
到达边界 i=2 时，必须跳跃
jumps=1, currentEnd=4

第2跳范围: [3,4]
  4 >= n-1，已到达终点
  
总跳跃: 2次
```

---

## 执行过程详解

```
nums = [2, 3, 1, 1, 4], n = 5

初始状态：
  jumps = 0
  currentEnd = 0（第一跳的边界）
  farthest = 0

i = 0:
  farthest = max(0, 0+2) = 2
  i(0) === currentEnd(0)?  是！
    jumps = 1
    currentEnd = farthest = 2
  状态：jumps=1, currentEnd=2, farthest=2

i = 1:
  farthest = max(2, 1+3) = 4
  i(1) === currentEnd(2)?  否
  状态：jumps=1, currentEnd=2, farthest=4

i = 2:
  farthest = max(4, 2+1) = 4
  i(2) === currentEnd(2)?  是！
    jumps = 2
    currentEnd = farthest = 4
    4 >= n-1(4)?  是！break
  
返回 jumps = 2
```

---

## 理解"边界"概念

```
      第1跳范围    第2跳范围
      ↓-----↓     ↓----↓
nums: [2, 3, 1, 1, 4]
      起点  边界1  边界2

i=0: farthest = 2
i=1: farthest = 4
i=2: i == currentEnd(2), 跳跃! currentEnd = 4
```

**边界的意义**：
- `currentEnd` 表示"当前这一跳能到达的最远位置"
- 当 `i === currentEnd` 时，说明必须再跳一次才能继续前进
- `farthest` 记录了在当前跳跃范围内能到达的最远位置

---

## 复杂度分析

- **时间复杂度**：O(n)，一次遍历
- **空间复杂度**：O(1)，只用了三个变量

---

## 与跳跃游戏 I 的区别

| 跳跃游戏 I (55) | 跳跃游戏 II (45) |
|----------------|-----------------|
| 判断能否到达终点 | 求最少跳跃次数 |
| 只需维护 maxReach | 需要维护跳跃边界 |
| 返回 boolean | 返回 number |
| 更简单 | 需要理解"分层"思想 |

---

## 与动态规划对比

**DP 解法**：
```typescript
function jumpDP(nums: number[]): number {
  const n = nums.length;
  const dp = new Array(n).fill(Infinity);
  dp[0] = 0;
  
  for (let i = 0; i < n; i++) {
    for (let j = 1; j <= nums[i] && i + j < n; j++) {
      dp[i + j] = Math.min(dp[i + j], dp[i] + 1);
    }
  }
  
  return dp[n - 1];
}
```

| 解法 | 时间复杂度 | 空间复杂度 |
|-----|-----------|-----------|
| 贪心 | O(n) | O(1) |
| 动态规划 | O(n²) | O(n) |

贪心更优。

---

## 常见错误

### 错误1：遍历到最后一个位置

```typescript
// ❌ 错误：遍历到 n
for (let i = 0; i < n; i++) {
  // 当 i = n-1 且 i === currentEnd 时，会多算一次跳跃
}

// ✓ 正确：只遍历到 n-1（倒数第二个位置）
for (let i = 0; i < n - 1; i++) {
  // ...
}
```

**为什么？** 如果遍历到最后一个位置，当 `i === currentEnd` 时会触发 `jumps++`，但我们已经在终点了，不需要再跳。

### 错误2：忘记更新 farthest

```typescript
// ❌ 错误：只在边界处更新
if (i === currentEnd) {
  farthest = Math.max(farthest, i + nums[i]);
  jumps++;
  currentEnd = farthest;
}

// ✓ 正确：每一步都更新 farthest
farthest = Math.max(farthest, i + nums[i]);
if (i === currentEnd) {
  jumps++;
  currentEnd = farthest;
}
```

### 错误3：边界情况

```typescript
// 单个元素：已经在终点
if (n <= 1) return 0;

// 第一个位置就能跳到终点
nums = [5, 1, 1, 1, 1]  // 只需 1 跳
```

---

## 贪心正确性

为什么贪心能得到最优解？

**关键洞察**：在同一跳范围内，无论选哪个位置，跳跃次数都是一样的。

假设在范围 `[a, b]` 内选择位置 `x` 或 `y` 作为落点：
- 选 `x`：下一跳范围是 `[x+1, x+nums[x]]`
- 选 `y`：下一跳范围是 `[y+1, y+nums[y]]`

无论选哪个，**这一跳的次数都是 1**。差别只在于下一跳的范围大小。

**贪心策略**：选能让下一跳范围最大的位置。

这样可以保证后续的选择空间最大，不会导致更多的跳跃次数。

---

## 相关题目

- **55. 跳跃游戏**：判断能否到达终点
- **1306. 跳跃游戏 III**：可以向左或向右跳
- **1345. 跳跃游戏 IV**：可以跳到相同值的位置
