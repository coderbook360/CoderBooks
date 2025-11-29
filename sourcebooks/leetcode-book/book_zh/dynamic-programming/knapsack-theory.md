# 背包问题理论

背包问题是DP中最重要的问题类型之一。

## 什么是背包问题

有一个容量有限的背包，有若干物品各有价值和重量。
目标：在不超过背包容量的前提下，使装入物品的总价值最大。

## 背包问题的分类

### 01背包

每个物品只能用一次。

"要么装，要么不装"。

### 完全背包

每个物品可以用无限次。

### 多重背包

每个物品有数量限制。

### 分组背包

物品分组，每组最多选一个。

## 01背包详解

### 问题定义

- n个物品，第i个物品重量`w[i]`，价值`v[i]`
- 背包容量C
- 求能装入的最大价值

### 状态定义

`dp[i][j]` = 考虑前i个物品，背包容量为j时的最大价值

### 状态转移

对于第i个物品：
- 不装：`dp[i][j] = dp[i-1][j]`
- 装（如果装得下）：`dp[i][j] = dp[i-1][j-w[i]] + v[i]`

```javascript
dp[i][j] = Math.max(dp[i-1][j], dp[i-1][j-w[i]] + v[i])
```

### 基础实现

```javascript
function knapsack01(weights, values, capacity) {
    const n = weights.length;
    const dp = Array.from({length: n + 1}, () => Array(capacity + 1).fill(0));
    
    for (let i = 1; i <= n; i++) {
        for (let j = 0; j <= capacity; j++) {
            // 不选第i个物品
            dp[i][j] = dp[i - 1][j];
            
            // 选第i个物品（如果装得下）
            if (j >= weights[i - 1]) {
                dp[i][j] = Math.max(dp[i][j], dp[i - 1][j - weights[i - 1]] + values[i - 1]);
            }
        }
    }
    
    return dp[n][capacity];
}
```

### 空间优化

注意到`dp[i]`只依赖`dp[i-1]`，可以用一维数组：

```javascript
function knapsack01(weights, values, capacity) {
    const n = weights.length;
    const dp = Array(capacity + 1).fill(0);
    
    for (let i = 0; i < n; i++) {
        // 倒序遍历，保证每个物品只用一次
        for (let j = capacity; j >= weights[i]; j--) {
            dp[j] = Math.max(dp[j], dp[j - weights[i]] + values[i]);
        }
    }
    
    return dp[capacity];
}
```

**关键**：j必须倒序遍历。

为什么？因为`dp[j - weights[i]]`应该是上一轮的值。如果正序，会用到本轮更新过的值，相当于同一物品用了多次。

## 完全背包详解

### 与01背包的区别

每个物品可以用无限次。

### 状态转移

```javascript
dp[i][j] = Math.max(dp[i-1][j], dp[i][j-w[i]] + v[i])
//                    ^^^         ^^^
//                 不选i        选一个i（还可以继续选i）
```

注意是`dp[i]`而不是`dp[i-1]`。

### 空间优化

```javascript
function knapsackComplete(weights, values, capacity) {
    const n = weights.length;
    const dp = Array(capacity + 1).fill(0);
    
    for (let i = 0; i < n; i++) {
        // 正序遍历，允许重复选择
        for (let j = weights[i]; j <= capacity; j++) {
            dp[j] = Math.max(dp[j], dp[j - weights[i]] + values[i]);
        }
    }
    
    return dp[capacity];
}
```

**关键**：j正序遍历，允许同一物品多次选择。

## 01背包 vs 完全背包

| 特性 | 01背包 | 完全背包 |
|-----|-------|---------|
| 物品使用次数 | 1次 | 无限次 |
| 转移来源 | `dp[i-1][j-w]` | `dp[i][j-w]` |
| 遍历顺序 | 容量倒序 | 容量正序 |

## 背包问题的变体

### 恰好装满

初始化：`dp[0] = 0`，其他为`-Infinity`

### 求方案数

转移：`dp[j] += dp[j - weight]`

### 求具体方案

记录选择，逆推回溯

## 小结

背包问题的核心：
1. 识别是哪种背包类型
2. 写出状态转移方程
3. 注意遍历顺序（01倒序，完全正序）

接下来通过具体题目深入理解这些概念。
