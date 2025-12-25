# 实战：Nim 游戏

## 题目描述

你和你的朋友，两个人一起玩 Nim 游戏：

- 桌子上有一堆石头
- 每次你们轮流拿掉 1 到 3 块石头
- 拿走最后一块石头的人就是获胜者

你作为先手，假设每一步都是最优解，判断你是否能赢得比赛。

📎 [LeetCode 292. Nim 游戏](https://leetcode.cn/problems/nim-game/)

**示例**：

```
输入：n = 4
输出：false
解释：无论你拿几个，对手总能拿走剩下的

输入：n = 5
输出：true
解释：你可以先拿 1 个，剩下 4 个，对手必败
```

## 方法一：动态规划

### 状态定义

```
dp[i] = 当有 i 块石头时，先手是否必胜
```

### 状态转移

```
dp[i] = !dp[i-1] || !dp[i-2] || !dp[i-3]
```

**理解**：如果存在一种拿法让对手进入必败态，则当前是必胜态。

### 代码实现

```typescript
/**
 * DP 解法
 * 时间复杂度：O(n)
 * 空间复杂度：O(n)
 */
function canWinNim(n: number): boolean {
  if (n <= 3) return true;
  
  const dp = new Array(n + 1).fill(false);
  dp[1] = dp[2] = dp[3] = true;
  
  for (let i = 4; i <= n; i++) {
    // 存在一种拿法让对手进入必败态
    dp[i] = !dp[i - 1] || !dp[i - 2] || !dp[i - 3];
  }
  
  return dp[n];
}
```

## 方法二：找规律

观察 DP 结果：

```
n = 1: true
n = 2: true
n = 3: true
n = 4: false
n = 5: true
n = 6: true
n = 7: true
n = 8: false
...
```

**规律**：当 `n % 4 === 0` 时先手必败，否则先手必胜。

### 证明

- `n = 4k`：无论先手拿 1、2、3，对手都可以拿 3、2、1，使剩余始终是 4 的倍数，最终对手拿走最后一批。
- `n ≠ 4k`：先手可以拿走 `n % 4` 块，使剩余是 4 的倍数，让对手陷入必败。

### 代码

```typescript
/**
 * 数学解法
 * 时间复杂度：O(1)
 * 空间复杂度：O(1)
 */
function canWinNim(n: number): boolean {
  return n % 4 !== 0;
}
```

## 变体：通用 Nim 游戏

如果每次可以拿 1 到 k 块：

```typescript
function canWinNimK(n: number, k: number): boolean {
  return n % (k + 1) !== 0;
}
```

**证明**：类似地，`n = (k+1) * m` 时先手必败。

## 经典 Nim 博弈

当有**多堆石头**时，使用 **Nim 和**判断：

```
如果 a1 XOR a2 XOR ... XOR an ≠ 0，先手必胜
如果 a1 XOR a2 XOR ... XOR an = 0，先手必败
```

```typescript
function canWinMultiPile(piles: number[]): boolean {
  let xorSum = 0;
  for (const pile of piles) {
    xorSum ^= pile;
  }
  return xorSum !== 0;
}
```

### Nim 和的证明思路

1. **终止态**：所有堆为空，XOR = 0，先手败
2. **从 XOR ≠ 0 可以走到 XOR = 0**：总存在一种拿法
3. **从 XOR = 0 只能走到 XOR ≠ 0**：任何拿法都会改变 XOR 结果

## 示例演算

以三堆石头 `[3, 4, 5]` 为例：

```
XOR = 3 ^ 4 ^ 5 = 011 ^ 100 ^ 101 = 010 = 2 ≠ 0

先手必胜！

如何操作？
找到最高位为 1 的堆（第三堆，5 的二进制 101）
5 ^ 2 = 101 ^ 010 = 111 = 7 > 5，不行

再看，XOR 的最高位是第 1 位（从 0 开始）
找一个在第 1 位为 1 的数：4 (100) 的第 1 位是 0，3 (011) 的第 1 位是 1
3 ^ 2 = 011 ^ 010 = 001 = 1
把第一堆从 3 改成 1（拿走 2 个）

新状态：[1, 4, 5]
XOR = 1 ^ 4 ^ 5 = 001 ^ 100 ^ 101 = 000 = 0

对手进入必败态！
```

## 本章小结

1. **单堆 Nim**：`n % 4 !== 0` 先手必胜
2. **多堆 Nim**：`XOR ≠ 0` 先手必胜
3. **DP 思路**：必胜 = 存在一步让对手必败
4. **数学规律**：很多博弈问题有简单的数学公式

## 相关题目

- [1908. Nim 游戏 II](https://leetcode.cn/problems/game-of-nim/)（多堆 Nim）
- [877. 石子游戏](./practice-stone-game.md)
