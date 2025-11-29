# 实战：背包问题九讲

背包问题的系统总结。

## 九种背包类型

### 1. 01背包

每件物品最多用一次。

```javascript
for (let i = 0; i < n; i++) {
    for (let j = capacity; j >= weight[i]; j--) {  // 倒序
        dp[j] = Math.max(dp[j], dp[j - weight[i]] + value[i]);
    }
}
```

### 2. 完全背包

每件物品可以用无限次。

```javascript
for (let i = 0; i < n; i++) {
    for (let j = weight[i]; j <= capacity; j++) {  // 正序
        dp[j] = Math.max(dp[j], dp[j - weight[i]] + value[i]);
    }
}
```

### 3. 多重背包

每件物品有数量限制count[i]。

```javascript
// 二进制优化
for (let i = 0; i < n; i++) {
    let num = count[i];
    for (let k = 1; num > 0; k *= 2) {
        const take = Math.min(k, num);
        num -= take;
        const w = weight[i] * take;
        const v = value[i] * take;
        
        for (let j = capacity; j >= w; j--) {
            dp[j] = Math.max(dp[j], dp[j - w] + v);
        }
    }
}
```

### 4. 混合背包

部分物品只能用一次，部分可以用无限次。

根据物品类型选择遍历顺序。

### 5. 二维费用背包

每件物品有两种费用，背包有两种容量限制。

```javascript
for (let i = 0; i < n; i++) {
    for (let j = capacity1; j >= cost1[i]; j--) {
        for (let k = capacity2; k >= cost2[i]; k--) {
            dp[j][k] = Math.max(dp[j][k], dp[j-cost1[i]][k-cost2[i]] + value[i]);
        }
    }
}
```

### 6. 分组背包

物品分组，每组最多选一个。

```javascript
for (let g = 0; g < groups.length; g++) {
    for (let j = capacity; j >= 0; j--) {  // 先遍历容量
        for (const item of groups[g]) {     // 再遍历组内物品
            if (j >= item.weight) {
                dp[j] = Math.max(dp[j], dp[j - item.weight] + item.value);
            }
        }
    }
}
```

### 7. 有依赖的背包

选某物品必须先选另一物品。

通常用树形DP解决。

### 8. 背包问题求方案数

求达到最优解的方案数。

```javascript
const dpValue = Array(capacity + 1).fill(0);
const dpCount = Array(capacity + 1).fill(1);

for (let i = 0; i < n; i++) {
    for (let j = capacity; j >= weight[i]; j--) {
        const newValue = dpValue[j - weight[i]] + value[i];
        if (newValue > dpValue[j]) {
            dpValue[j] = newValue;
            dpCount[j] = dpCount[j - weight[i]];
        } else if (newValue === dpValue[j]) {
            dpCount[j] += dpCount[j - weight[i]];
        }
    }
}
```

### 9. 背包问题求具体方案

输出选了哪些物品。

```javascript
// 记录选择
const path = Array.from({length: n + 1}, () => Array(capacity + 1).fill(false));

for (let i = n - 1; i >= 0; i--) {
    for (let j = capacity; j >= weight[i]; j--) {
        if (dp[j - weight[i]] + value[i] > dp[j]) {
            dp[j] = dp[j - weight[i]] + value[i];
            path[i][j] = true;
        }
    }
}

// 回溯输出
const selected = [];
let j = capacity;
for (let i = 0; i < n; i++) {
    if (path[i][j]) {
        selected.push(i);
        j -= weight[i];
    }
}
```

## 背包问题的关键点

### 遍历顺序

| 类型 | 容量遍历顺序 | 原因 |
|-----|-------------|------|
| 01背包 | 倒序 | 每件物品只用一次 |
| 完全背包 | 正序 | 每件物品可用多次 |

### 初始化

| 目标 | 初始化 |
|-----|-------|
| 求最大值（可不装满） | dp[j] = 0 |
| 求最大值（必须装满） | dp[0] = 0, 其他 = -∞ |
| 求最小值（必须装满） | dp[0] = 0, 其他 = +∞ |
| 求方案数 | dp[0] = 1 |

### 组合 vs 排列

| 类型 | 遍历顺序 |
|-----|---------|
| 组合（顺序无关） | 先物品，后容量 |
| 排列（顺序有关） | 先容量，后物品 |

## 常见应用

- **分割等和子集**：01背包，能否恰好装满
- **目标和**：01背包，求方案数
- **零钱兑换**：完全背包，求最小物品数
- **零钱兑换II**：完全背包，求组合数
- **一和零**：二维费用01背包

## 小结

背包问题是DP的核心专题：

1. 识别问题类型
2. 确定状态定义
3. 选择正确的遍历顺序
4. 处理好初始化

掌握这九种类型，几乎所有背包变体都能解决。
