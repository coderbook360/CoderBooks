# 实战：零钱兑换

完全背包求最少物品数。

## 问题描述

给定不同面额的硬币coins和一个总金额amount，计算凑成总金额所需的最少硬币个数。

如果没有任何一种硬币组合能凑成总金额，返回-1。

示例：
- coins = [1,2,5], amount = 11 → 3（5+5+1）
- coins = [2], amount = 3 → -1

## 分析

每种硬币可以用无限次 → 完全背包

求最少硬币数 → 求最小值

## 解法

```javascript
function coinChange(coins, amount) {
    const dp = new Array(amount + 1).fill(Infinity);
    dp[0] = 0;  // 金额0需要0枚硬币
    
    for (const coin of coins) {
        // 完全背包：正序遍历
        for (let j = coin; j <= amount; j++) {
            dp[j] = Math.min(dp[j], dp[j - coin] + 1);
        }
    }
    
    return dp[amount] === Infinity ? -1 : dp[amount];
}
```

## 状态转移

`dp[j]` = 凑成金额j的最少硬币数

对于每种硬币：
- 不用：`dp[j]`不变
- 用一枚：`dp[j - coin] + 1`

取最小值。

## 为什么初始化为Infinity

我们求最小值，用Infinity表示"无法凑成"。

- `dp[0] = 0`：金额0需要0枚硬币
- 其他初始为Infinity：还没找到凑成方案

## 另一种遍历顺序

也可以先遍历金额，再遍历硬币：

```javascript
function coinChange(coins, amount) {
    const dp = new Array(amount + 1).fill(Infinity);
    dp[0] = 0;
    
    for (let j = 1; j <= amount; j++) {
        for (const coin of coins) {
            if (j >= coin && dp[j - coin] !== Infinity) {
                dp[j] = Math.min(dp[j], dp[j - coin] + 1);
            }
        }
    }
    
    return dp[amount] === Infinity ? -1 : dp[amount];
}
```

对于完全背包求最值，两种顺序都可以。

## BFS解法

把问题看成图的最短路径：

```javascript
function coinChange(coins, amount) {
    if (amount === 0) return 0;
    
    const queue = [0];
    const visited = new Set([0]);
    let steps = 0;
    
    while (queue.length) {
        steps++;
        const size = queue.length;
        
        for (let i = 0; i < size; i++) {
            const curr = queue.shift();
            
            for (const coin of coins) {
                const next = curr + coin;
                if (next === amount) return steps;
                if (next < amount && !visited.has(next)) {
                    visited.add(next);
                    queue.push(next);
                }
            }
        }
    }
    
    return -1;
}
```

## 复杂度分析

**DP解法**：
- 时间：O(n × amount)
- 空间：O(amount)

**BFS解法**：
- 时间：O(n × amount)
- 空间：O(amount)

## 小结

零钱兑换展示了完全背包求最小值：
- 每种硬币可用无限次 → 完全背包
- 正序遍历容量
- 初始化为Infinity，dp[0] = 0
