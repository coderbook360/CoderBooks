# 实战：完全平方数

背包问题的变体。

## 问题描述

给定正整数n，找到若干个完全平方数（如1, 4, 9, 16, ...）使得它们的和等于n。

返回组成和所需的完全平方数的**最少个数**。

示例：
- n = 12 → 3（4 + 4 + 4）
- n = 13 → 2（4 + 9）

## 思路分析

这是一个完全背包问题：
- 物品：完全平方数1, 4, 9, 16, ...
- 背包容量：n
- 目标：最少物品数

## 解法1：DP

```javascript
function numSquares(n) {
    const dp = new Array(n + 1).fill(Infinity);
    dp[0] = 0;
    
    for (let i = 1; i <= n; i++) {
        for (let j = 1; j * j <= i; j++) {
            dp[i] = Math.min(dp[i], dp[i - j * j] + 1);
        }
    }
    
    return dp[n];
}
```

## 状态转移解释

`dp[i]` = 组成i需要的最少完全平方数个数

对于每个i，尝试减去一个完全平方数`j*j`：
- 如果减去`j*j`，则`dp[i] = dp[i - j*j] + 1`
- 遍历所有可能的j，取最小值

## 解法2：BFS

把问题看成最短路径：从n到0，每次减去一个完全平方数。

```javascript
function numSquares(n) {
    const squares = [];
    for (let i = 1; i * i <= n; i++) {
        squares.push(i * i);
    }
    
    const queue = [n];
    const visited = new Set([n]);
    let level = 0;
    
    while (queue.length) {
        level++;
        const size = queue.length;
        
        for (let i = 0; i < size; i++) {
            const curr = queue.shift();
            
            for (const sq of squares) {
                const next = curr - sq;
                if (next === 0) return level;
                if (next < 0) break;
                if (!visited.has(next)) {
                    visited.add(next);
                    queue.push(next);
                }
            }
        }
    }
    
    return n;  // 最坏情况：n个1
}
```

## 解法3：数学（四平方和定理）

拉格朗日四平方和定理：任何正整数都可以表示为最多4个完全平方数之和。

```javascript
function numSquares(n) {
    // 判断是否是完全平方数
    if (isSquare(n)) return 1;
    
    // 判断是否是4^a(8b+7)的形式（四平方和定理）
    let temp = n;
    while (temp % 4 === 0) {
        temp /= 4;
    }
    if (temp % 8 === 7) return 4;
    
    // 判断是否是两个完全平方数之和
    for (let i = 1; i * i <= n; i++) {
        if (isSquare(n - i * i)) return 2;
    }
    
    return 3;
}

function isSquare(n) {
    const sqrt = Math.floor(Math.sqrt(n));
    return sqrt * sqrt === n;
}
```

这是最快的解法，O(√n)。

## 三种解法对比

| 解法 | 时间复杂度 | 空间复杂度 | 特点 |
|-----|-----------|-----------|------|
| DP | O(n√n) | O(n) | 通用 |
| BFS | O(n√n) | O(n) | 最短路径思维 |
| 数学 | O(√n) | O(1) | 依赖定理 |

## 复杂度分析（DP）

- **时间复杂度**：O(n√n)
  - 外层n次
  - 内层√n次
  
- **空间复杂度**：O(n)

## 小结

完全平方数展示了同一问题的多种解法：
- DP：完全背包思路
- BFS：最短路径思路
- 数学：利用四平方和定理

面试中DP解法最实用，数学解法作为加分项。
