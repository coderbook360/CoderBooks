# 实战：完全平方数

完全平方数是完全背包的另一个经典应用，将平方数作为"硬币"来使用。

## 题目描述

给你一个整数 `n`，返回和为 `n` 的完全平方数的最少数量。

**完全平方数**是一个整数，其值等于另一个整数的平方；换句话说，其值等于一个整数自乘的积。例如，1、4、9 和 16 都是完全平方数，而 3 和 11 不是。

📎 [LeetCode 279. 完全平方数](https://leetcode.cn/problems/perfect-squares/)

**示例**：

```
输入：n = 12
输出：3
解释：12 = 4 + 4 + 4

输入：n = 13
输出：2
解释：13 = 4 + 9
```

**约束**：`1 <= n <= 10^4`

## 思路分析

### 与零钱兑换的关系

这道题本质上就是零钱兑换：
- **硬币面额**：所有 ≤ n 的完全平方数（1, 4, 9, 16, ...）
- **目标金额**：n
- **目标**：最少硬币数

### 状态定义

`dp[j]` = 和为 j 的完全平方数的最少数量

### 状态转移

```
dp[j] = min(dp[j], dp[j - i*i] + 1)  for all i*i <= j
```

## 解法一：完全背包

```typescript
/**
 * 完全背包
 * 时间复杂度：O(n * √n)
 * 空间复杂度：O(n)
 */
function numSquares(n: number): number {
  const dp = new Array(n + 1).fill(Infinity);
  dp[0] = 0;
  
  // 遍历所有完全平方数（物品）
  for (let i = 1; i * i <= n; i++) {
    const square = i * i;
    // 正序遍历（完全背包）
    for (let j = square; j <= n; j++) {
      dp[j] = Math.min(dp[j], dp[j - square] + 1);
    }
  }
  
  return dp[n];
}
```

## 解法二：先背包后物品

```typescript
/**
 * 先背包后物品
 * 时间复杂度：O(n * √n)
 * 空间复杂度：O(n)
 */
function numSquares(n: number): number {
  const dp = new Array(n + 1).fill(Infinity);
  dp[0] = 0;
  
  for (let j = 1; j <= n; j++) {
    for (let i = 1; i * i <= j; i++) {
      dp[j] = Math.min(dp[j], dp[j - i * i] + 1);
    }
  }
  
  return dp[n];
}
```

## 解法三：BFS

BFS 可以找到最短路径（最少数量）：

```typescript
/**
 * BFS
 * 时间复杂度：O(n * √n)
 * 空间复杂度：O(n)
 */
function numSquares(n: number): number {
  const visited = new Set<number>();
  const queue: number[] = [n];
  let steps = 0;
  
  while (queue.length > 0) {
    steps++;
    const size = queue.length;
    
    for (let k = 0; k < size; k++) {
      const curr = queue.shift()!;
      
      for (let i = 1; i * i <= curr; i++) {
        const next = curr - i * i;
        
        if (next === 0) return steps;
        if (visited.has(next)) continue;
        
        visited.add(next);
        queue.push(next);
      }
    }
  }
  
  return n;  // 最坏情况：n 个 1
}
```

## 解法四：数学方法（四平方和定理）

**拉格朗日四平方和定理**：每个正整数都可以表示为最多四个完全平方数之和。

更进一步，存在数学公式判断答案是 1、2、3 还是 4：

```typescript
/**
 * 数学方法
 * 时间复杂度：O(√n)
 * 空间复杂度：O(1)
 */
function numSquares(n: number): number {
  // 检查是否是完全平方数
  function isSquare(num: number): boolean {
    const sqrt = Math.floor(Math.sqrt(num));
    return sqrt * sqrt === num;
  }
  
  // 答案为 1：n 本身是完全平方数
  if (isSquare(n)) return 1;
  
  // 答案为 4：n = 4^a * (8b + 7)
  let temp = n;
  while (temp % 4 === 0) {
    temp /= 4;
  }
  if (temp % 8 === 7) return 4;
  
  // 答案为 2：n = a² + b²
  for (let i = 1; i * i <= n; i++) {
    if (isSquare(n - i * i)) return 2;
  }
  
  // 答案为 3
  return 3;
}
```

### 数学定理说明

1. **答案为 1**：n 是完全平方数
2. **答案为 2**：n 可以表示为两个完全平方数之和
3. **答案为 4**：当且仅当 n = 4^a × (8b + 7)
4. **答案为 3**：其他情况

## 复杂度分析

| 解法 | 时间复杂度 | 空间复杂度 |
|-----|-----------|-----------|
| 完全背包 | O(n × √n) | O(n) |
| BFS | O(n × √n) | O(n) |
| 数学方法 | O(√n) | O(1) |

## 图示理解

```
n = 12

完全平方数：1, 4, 9

dp[0] = 0
dp[1] = 1  (1)
dp[2] = 2  (1+1)
dp[3] = 3  (1+1+1)
dp[4] = 1  (4)
dp[5] = 2  (4+1)
dp[6] = 3  (4+1+1)
dp[7] = 4  (4+1+1+1)
dp[8] = 2  (4+4)
dp[9] = 1  (9)
dp[10] = 2 (9+1)
dp[11] = 3 (9+1+1)
dp[12] = 3 (4+4+4)
```

## 相关题目

| 题目 | 难度 | 说明 |
|-----|------|------|
| [322. 零钱兑换](https://leetcode.cn/problems/coin-change/) | 中等 | 相同思路 |
| [343. 整数拆分](https://leetcode.cn/problems/integer-break/) | 中等 | 乘积最大化 |
| [1641. 统计字典序元音字符串的数目](https://leetcode.cn/problems/count-sorted-vowel-strings/) | 中等 | 组合计数 |

## 本章小结

1. **问题转化**：平方数作为"硬币"，求最少硬币数
2. **完全背包模板**：正序遍历，最小值问题
3. **BFS 解法**：图论视角，求最短路径
4. **数学优化**：四平方和定理

**核心技巧**：
- 识别完全背包模型
- 利用数学性质优化
- BFS 可以求最小步数
