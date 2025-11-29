# 实战：一和零

二维费用的01背包。

## 问题描述

给定一个二进制字符串数组strs，和两个整数m和n。

找出最多有m个0和n个1的strs的最大子集的大小。

示例：
- strs = ["10","0001","111001","1","0"], m = 5, n = 3 → 4
- 最大子集是{"10", "0001", "1", "0"}，含3个0和3个1

## 分析

每个字符串只能选一次 → 01背包

两种限制：0的个数和1的个数 → 二维费用背包

## 解法

```javascript
function findMaxForm(strs, m, n) {
    // dp[i][j] = 最多i个0和j个1时的最大子集大小
    const dp = Array.from({length: m + 1}, () => Array(n + 1).fill(0));
    
    for (const str of strs) {
        // 计算这个字符串的0和1个数
        let zeros = 0, ones = 0;
        for (const ch of str) {
            if (ch === '0') zeros++;
            else ones++;
        }
        
        // 01背包：倒序遍历
        for (let i = m; i >= zeros; i--) {
            for (let j = n; j >= ones; j--) {
                dp[i][j] = Math.max(dp[i][j], dp[i - zeros][j - ones] + 1);
            }
        }
    }
    
    return dp[m][n];
}
```

## 状态转移

`dp[i][j]` = 最多i个0和j个1时，能选的最大字符串数

对于每个字符串（zeros个0，ones个1）：
- 不选：`dp[i][j]`不变
- 选：`dp[i - zeros][j - ones] + 1`

## 为什么是01背包

每个字符串只能选一次，不能重复选。

所以遍历顺序是**倒序**。

## 与标准背包的对比

| 标准01背包 | 一和零 |
|-----------|-------|
| 一维费用（重量） | 二维费用（0的数量、1的数量） |
| dp[j] | dp[i][j] |
| j >= weight | i >= zeros && j >= ones |

## 复杂度分析

- **时间复杂度**：O(l × m × n)，l是字符串个数
- **空间复杂度**：O(m × n)

## 变体：三维及以上

如果有三种或更多约束，同理扩展到三维数组：

```javascript
// 假设有三种约束a, b, c
const dp = Array.from({length: A + 1}, () => 
    Array.from({length: B + 1}, () => Array(C + 1).fill(0)));

for (const item of items) {
    for (let a = A; a >= item.costA; a--) {
        for (let b = B; b >= item.costB; b--) {
            for (let c = C; c >= item.costC; c--) {
                dp[a][b][c] = Math.max(dp[a][b][c], 
                    dp[a - item.costA][b - item.costB][c - item.costC] + item.value);
            }
        }
    }
}
```

## 小结

一和零展示了二维费用背包：
- 两种不同的约束条件
- 状态变成二维
- 遍历时两个维度都要倒序

掌握这个模式，可以处理任意多维费用的背包问题。
