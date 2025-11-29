# 01背包与完全背包

深入理解两种基本背包的遍历顺序。

## 核心区别回顾

| 类型 | 物品使用 | 内层遍历 | 关键点 |
|-----|---------|---------|-------|
| 01背包 | 最多1次 | 容量倒序 | 防止重复选择 |
| 完全背包 | 无限次 | 容量正序 | 允许重复选择 |

## 01背包为什么倒序

```javascript
// 错误：正序遍历
for (let j = weight; j <= capacity; j++) {
    dp[j] = Math.max(dp[j], dp[j - weight] + value);
}
```

假设weight=2, value=3, capacity=4：
- j=2: dp[2] = max(0, dp[0]+3) = 3
- j=4: dp[4] = max(0, dp[2]+3) = 6 ← 错！用了更新后的dp[2]

相当于物品被选了两次。

```javascript
// 正确：倒序遍历
for (let j = capacity; j >= weight; j--) {
    dp[j] = Math.max(dp[j], dp[j - weight] + value);
}
```

- j=4: dp[4] = max(0, dp[2]+3) = 3 ← 用的是旧dp[2]=0
- j=2: dp[2] = max(0, dp[0]+3) = 3

每个物品只用了一次。

## 完全背包为什么正序

因为我们**希望**同一物品被多次选择：

```javascript
for (let j = weight; j <= capacity; j++) {
    dp[j] = Math.max(dp[j], dp[j - weight] + value);
}
```

假设weight=2, value=3, capacity=4：
- j=2: dp[2] = 3（选一次）
- j=4: dp[4] = max(0, dp[2]+3) = 6（选两次）

这正是我们想要的！

## 遍历顺序总结

### 01背包

```javascript
// 先遍历物品
for (let i = 0; i < n; i++) {
    // 容量倒序
    for (let j = capacity; j >= weights[i]; j--) {
        dp[j] = Math.max(dp[j], dp[j - weights[i]] + values[i]);
    }
}
```

### 完全背包

```javascript
// 先遍历物品
for (let i = 0; i < n; i++) {
    // 容量正序
    for (let j = weights[i]; j <= capacity; j++) {
        dp[j] = Math.max(dp[j], dp[j - weights[i]] + values[i]);
    }
}
```

## 二维数组角度理解

### 01背包（二维）

```javascript
dp[i][j] = Math.max(dp[i-1][j], dp[i-1][j-w[i]] + v[i])
```

两个来源都是`i-1`行，所以一维优化时必须倒序（否则会覆盖需要的旧值）。

### 完全背包（二维）

```javascript
dp[i][j] = Math.max(dp[i-1][j], dp[i][j-w[i]] + v[i])
```

选择时来源是`i`行（当前行），所以一维优化时正序（需要当前行已更新的值）。

## 求方案数的变体

### 组合数（物品顺序无关）

先遍历物品，再遍历容量：

```javascript
// 01背包求组合数
for (let i = 0; i < n; i++) {
    for (let j = capacity; j >= weights[i]; j--) {
        dp[j] += dp[j - weights[i]];
    }
}
```

### 排列数（物品顺序有关）

先遍历容量，再遍历物品：

```javascript
// 完全背包求排列数
for (let j = 1; j <= capacity; j++) {
    for (let i = 0; i < n; i++) {
        if (j >= weights[i]) {
            dp[j] += dp[j - weights[i]];
        }
    }
}
```

## 实例对比

问题：用[1, 2, 3]组成和为4，有多少种方式？

**组合数**（1+3和3+1算一种）：
- 答案：4种
- {1,1,1,1}, {1,1,2}, {2,2}, {1,3}

**排列数**（1+3和3+1算两种）：
- 答案：7种
- [1,1,1,1], [1,1,2], [1,2,1], [2,1,1], [2,2], [1,3], [3,1]

## 初始化的区别

### 求最大/最小值

- `dp[0] = 0`，其他根据情况初始化

### 恰好装满

- 最大值问题：`dp[0] = 0`，其他为`-Infinity`
- 最小值问题：`dp[0] = 0`，其他为`Infinity`

### 求方案数

- `dp[0] = 1`（空背包有一种方案：什么都不选）

## 小结

01背包和完全背包的核心差异在于遍历顺序：
- **01背包**：倒序，防止重复选择
- **完全背包**：正序，允许重复选择

理解这个差异，是解决所有背包问题的基础。
