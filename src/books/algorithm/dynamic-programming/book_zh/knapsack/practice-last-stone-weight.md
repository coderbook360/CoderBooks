# 实战：最后一块石头的重量 II

最后一块石头的重量 II 是 0-1 背包的另一个经典应用，目标是最小化两组之差。

## 题目描述

有一堆石头，用整数数组 `stones` 表示。其中 `stones[i]` 表示第 `i` 块石头的重量。

每一回合，从中选出任意两块石头，然后将它们一起粉碎。假设石头的重量分别为 `x` 和 `y`，且 `x <= y`。那么粉碎的可能结果如下：
- 如果 `x == y`，那么两块石头都会被完全粉碎；
- 如果 `x != y`，那么重量为 `x` 的石头将会完全粉碎，而重量为 `y` 的石头新重量为 `y - x`。

最后，最多只会剩下一块石头。返回此石头最小的可能重量。如果没有石头剩下，就返回 `0`。

📎 [LeetCode 1049. 最后一块石头的重量 II](https://leetcode.cn/problems/last-stone-weight-ii/)

**示例**：

```
输入：stones = [2, 7, 4, 1, 8, 1]
输出：1
解释：
组合 2 和 4，得到 2，数组变为 [2, 7, 1, 8, 1]
组合 7 和 8，得到 1，数组变为 [2, 1, 1, 1]
组合 2 和 1，得到 1，数组变为 [1, 1, 1]
组合 1 和 1，得到 0，数组变为 [1]
最终剩下的石头重量为 1
```

**约束**：
- `1 <= stones.length <= 30`
- `1 <= stones[i] <= 100`

## 思路分析

### 问题本质

无论怎么碰撞，最终结果都等价于：将石头分成两组，求两组重量之差的最小值。

**为什么？**

```
假设最后只剩 A 和 B 两块石头碰撞，结果是 |A - B|
而 A 和 B 本身可能是多次碰撞的结果

设 A = (a₁ - a₂ - ... + aₘ)，B = (b₁ - b₂ - ... + bₙ)
最终结果 = |A - B| = |(a₁ + ... + aₘ) - (b₁ + ... + bₙ)|

等价于把所有石头分成两组，求差的绝对值最小
```

### 转化为背包问题

设两组的重量分别为 P 和 N，总重量为 sum。

```
P + N = sum
目标：最小化 |P - N|
```

为了最小化差值，我们希望 P 尽可能接近 sum/2。

问题转化为：**从石头中选出若干个，使总重量尽可能接近但不超过 sum/2**。

这就是 **0-1 背包的最值问题**：
- 背包容量：sum/2
- 物品重量 = 价值 = stones[i]
- 目标：最大化背包中物品的总价值

## 解法一：二维 DP

```typescript
/**
 * 二维 DP
 * 时间复杂度：O(n * sum)
 * 空间复杂度：O(n * sum)
 */
function lastStoneWeightII(stones: number[]): number {
  const sum = stones.reduce((a, b) => a + b, 0);
  const target = Math.floor(sum / 2);
  const n = stones.length;
  
  // dp[i][j] = 从前 i 个石头中选，最大能凑出的不超过 j 的重量
  const dp: number[][] = Array.from(
    { length: n + 1 },
    () => new Array(target + 1).fill(0)
  );
  
  for (let i = 1; i <= n; i++) {
    const w = stones[i - 1];
    for (let j = 0; j <= target; j++) {
      if (j >= w) {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i - 1][j - w] + w);
      } else {
        dp[i][j] = dp[i - 1][j];
      }
    }
  }
  
  const P = dp[n][target];  // 一组的重量
  const N = sum - P;        // 另一组的重量
  
  return N - P;  // 差值（N >= P）
}
```

## 解法二：一维 DP（空间优化）

```typescript
/**
 * 一维 DP
 * 时间复杂度：O(n * sum)
 * 空间复杂度：O(sum)
 */
function lastStoneWeightII(stones: number[]): number {
  const sum = stones.reduce((a, b) => a + b, 0);
  const target = Math.floor(sum / 2);
  
  // dp[j] = 背包容量为 j 时能装的最大重量
  const dp = new Array(target + 1).fill(0);
  
  for (const w of stones) {
    // 逆序遍历，0-1 背包
    for (let j = target; j >= w; j--) {
      dp[j] = Math.max(dp[j], dp[j - w] + w);
    }
  }
  
  return sum - 2 * dp[target];
}
```

### 为什么答案是 `sum - 2 * dp[target]`？

```
设选出的一组重量为 P = dp[target]
另一组重量为 N = sum - P

差值 = N - P = (sum - P) - P = sum - 2P
```

## 解法三：可行性数组

另一种思路：用布尔数组记录哪些重量可以凑出。

```typescript
/**
 * 可行性数组
 * 时间复杂度：O(n * sum)
 * 空间复杂度：O(sum)
 */
function lastStoneWeightII(stones: number[]): number {
  const sum = stones.reduce((a, b) => a + b, 0);
  const target = Math.floor(sum / 2);
  
  // dp[j] = 能否凑出重量 j
  const dp = new Array(target + 1).fill(false);
  dp[0] = true;
  
  for (const w of stones) {
    for (let j = target; j >= w; j--) {
      dp[j] = dp[j] || dp[j - w];
    }
  }
  
  // 从 target 向下找第一个能凑出的重量
  for (let j = target; j >= 0; j--) {
    if (dp[j]) {
      return sum - 2 * j;
    }
  }
  
  return sum;
}
```

## 解法四：位运算优化

```typescript
/**
 * 位运算
 * 时间复杂度：O(n * sum / 64)
 * 空间复杂度：O(sum / 64)
 */
function lastStoneWeightII(stones: number[]): number {
  const sum = stones.reduce((a, b) => a + b, 0);
  const target = Math.floor(sum / 2);
  
  let dp = 1n;  // 初始状态：只有 0 可达
  
  for (const w of stones) {
    dp |= dp << BigInt(w);
  }
  
  // 找最接近 target 的可达状态
  for (let j = target; j >= 0; j--) {
    if ((dp & (1n << BigInt(j))) !== 0n) {
      return sum - 2 * j;
    }
  }
  
  return sum;
}
```

## 与分割等和子集的对比

| 问题 | 目标 | 状态定义 |
|-----|------|---------|
| 分割等和子集 | 能否恰好凑出 sum/2 | dp[j] = 能否凑出 j |
| 最后一块石头 | 尽可能接近 sum/2 | dp[j] = 能凑出的最大值 ≤ j |

## 复杂度分析

| 解法 | 时间复杂度 | 空间复杂度 |
|-----|-----------|-----------|
| 二维 DP | O(n × sum) | O(n × sum) |
| 一维 DP | O(n × sum) | O(sum) |
| 可行性数组 | O(n × sum) | O(sum) |
| 位运算 | O(n × sum/64) | O(sum/64) |

## 模拟碰撞过程（验证答案）

```typescript
function simulateCollision(stones: number[]): number {
  const arr = [...stones];
  
  while (arr.length > 1) {
    arr.sort((a, b) => a - b);
    const y = arr.pop()!;
    const x = arr.pop()!;
    
    if (x !== y) {
      arr.push(y - x);
    }
  }
  
  return arr.length === 0 ? 0 : arr[0];
}
```

注意：模拟可能得不到最优解，因为碰撞顺序影响结果。

## 相关题目

| 题目 | 难度 | 说明 |
|-----|------|------|
| [416. 分割等和子集](https://leetcode.cn/problems/partition-equal-subset-sum/) | 中等 | 精确分割 |
| [494. 目标和](https://leetcode.cn/problems/target-sum/) | 中等 | 方案数 |
| [1046. 最后一块石头的重量](https://leetcode.cn/problems/last-stone-weight/) | 简单 | 模拟版本 |

## 本章小结

1. **问题转化**：碰撞 → 分组 → 最小化差值
2. **背包模型**：找最接近 sum/2 的子集和
3. **答案公式**：`sum - 2 * dp[target]`
4. **多种解法**：最值、可行性、位运算

**核心技巧**：
- 理解碰撞等价于分组
- 0-1 背包求最接近目标的值
- 位运算可以显著优化
