# 实战：除数博弈

## 题目描述

Alice 和 Bob 玩一个游戏，他们轮流操作，Alice 先手。

最初，黑板上有一个数字 `n`。每轮中，玩家需要执行以下操作：
- 选出任一 `x`，满足 `0 < x < n` 且 `n % x === 0`
- 用 `n - x` 替换黑板上的数字 `n`

无法执行操作的玩家（当 `n = 1` 时）失败。

假设两个玩家都采取最优策略，当 Alice 获胜时返回 `true`。

📎 [LeetCode 1025. 除数博弈](https://leetcode.cn/problems/divisor-game/)

**示例**：

```
输入：n = 2
输出：true
解释：Alice 选 1，Bob 无法操作，Alice 获胜

输入：n = 3
输出：false
解释：Alice 只能选 1，然后 Bob 选 1，Alice 无法操作
```

## 方法一：动态规划

### 状态定义

```
dp[i] = 当数字为 i 时，先手是否必胜
```

### 状态转移

```
dp[i] = 存在某个 x，使得 i % x === 0 且 !dp[i - x]
```

### 代码实现

```typescript
/**
 * DP 解法
 * 时间复杂度：O(n²)
 * 空间复杂度：O(n)
 */
function divisorGame(n: number): boolean {
  if (n === 1) return false;
  
  const dp = new Array(n + 1).fill(false);
  // dp[1] = false（无法操作，输）
  
  for (let i = 2; i <= n; i++) {
    // 枚举所有可选的 x
    for (let x = 1; x < i; x++) {
      if (i % x === 0 && !dp[i - x]) {
        dp[i] = true;
        break;
      }
    }
  }
  
  return dp[n];
}
```

## 方法二：数学规律

观察 DP 结果：

```
n = 1: false
n = 2: true
n = 3: false
n = 4: true
n = 5: false
n = 6: true
...
```

**规律**：n 是偶数时 Alice 必胜，n 是奇数时 Alice 必败。

### 证明

1. **奇数的因子都是奇数**：奇数减去奇数 = 偶数
2. **偶数至少有因子 1**：偶数减 1 = 奇数

所以：
- 奇数 → Alice 必须给 Bob 偶数
- 偶数 → Alice 可以给 Bob 奇数

归纳法：
- `n = 1`：Alice 输
- `n = 2`：Alice 选 1，给 Bob 1，Alice 赢
- 假设对于 `k < n`，奇数输偶数赢
- `n` 是奇数：任何操作都给对手偶数，对手赢
- `n` 是偶数：选 1，给对手奇数，对手输

```typescript
function divisorGame(n: number): boolean {
  return n % 2 === 0;
}
```

## 示例演算

以 `n = 6` 为例：

```
DP 方式：
dp[1] = false
dp[2] = true（选 1，对手得 1，对手输）
dp[3] = false（选 1，对手得 2，对手赢）
dp[4] = true（选 1，对手得 3，对手输）
dp[5] = false（选 1，对手得 4，对手赢）
dp[6] = true（选 1，对手得 5，对手输）

或者：
6 是偶数 → Alice 必胜

Alice 策略：选 1
  6 - 1 = 5（奇数）
  Bob 只能选 1
  5 - 1 = 4（偶数）
  Alice 选 1
  4 - 1 = 3（奇数）
  Bob 选 1
  3 - 1 = 2（偶数）
  Alice 选 1
  2 - 1 = 1
  Bob 无法操作，Alice 赢！
```

## 复杂度分析

| 方法 | 时间 | 空间 |
|-----|------|------|
| DP | O(n²) | O(n) |
| 数学 | O(1) | O(1) |

## 本章小结

1. **DP 思路**：枚举所有可能操作，判断是否能让对手进入必败态
2. **数学规律**：奇偶性决定胜负
3. **证明技巧**：归纳法 + 因子分析

**启示**：很多博弈问题有简单的数学规律，DP 帮助我们发现规律。

## 相关题目

- [292. Nim 游戏](./practice-nim-game.md)
- [877. 石子游戏](./practice-stone-game.md)
