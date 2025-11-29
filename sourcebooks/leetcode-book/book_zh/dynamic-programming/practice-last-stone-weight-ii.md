# 实战：最后一块石头的重量II

背包问题的巧妙转化。

## 问题描述

有一堆石头，每块石头的重量在stones数组中给出。

每一回合，选出任意两块石头一起粉碎：
- 如果重量相等，两块都会被完全粉碎
- 如果重量不同，重量小的石头完全粉碎，大的石头剩余重量为差值

最后，最多只剩一块石头。返回此石头最小的可能重量，如果没有石头剩下就返回0。

## 转化思路

两块石头相撞，相当于给一块石头加正号，另一块加负号。

最终剩下的重量 = |正数和 - 负数和|

设正数和为P，负数和为N：
- P + N = sum
- 目标：最小化|P - N|

要使|P - N|最小，就要让P尽量接近sum/2。

问题转化为：从stones中选一些石头，使总重量尽量接近sum/2。

这是01背包！

## 解法

```javascript
function lastStoneWeightII(stones) {
    const sum = stones.reduce((a, b) => a + b, 0);
    const target = Math.floor(sum / 2);
    
    // dp[j] = 能否凑出重量j
    const dp = new Array(target + 1).fill(false);
    dp[0] = true;
    
    for (const stone of stones) {
        for (let j = target; j >= stone; j--) {
            dp[j] = dp[j] || dp[j - stone];
        }
    }
    
    // 找到最接近target的可达重量
    for (let j = target; j >= 0; j--) {
        if (dp[j]) {
            return sum - 2 * j;
        }
    }
    
    return sum;
}
```

## 也可以直接求最大重量

```javascript
function lastStoneWeightII(stones) {
    const sum = stones.reduce((a, b) => a + b, 0);
    const target = Math.floor(sum / 2);
    
    // dp[j] = 容量j能装的最大重量
    const dp = new Array(target + 1).fill(0);
    
    for (const stone of stones) {
        for (let j = target; j >= stone; j--) {
            dp[j] = Math.max(dp[j], dp[j - stone] + stone);
        }
    }
    
    return sum - 2 * dp[target];
}
```

## 为什么答案是sum - 2 * P

设选中的石头（正数组）重量和为P。
未选中的石头（负数组）重量和为N = sum - P。

最终剩余 = |P - N| = |P - (sum - P)| = |2P - sum| = sum - 2P（因为P ≤ sum/2）

## 复杂度分析

- **时间复杂度**：O(n × sum)
- **空间复杂度**：O(sum)

## 与分割等和子集的对比

| 分割等和子集 | 最后一块石头 |
|-------------|-------------|
| 能否恰好分成两半 | 分成两半后差最小 |
| dp表示能否达到 | dp表示能达到的最大值 |
| 返回boolean | 返回差值 |

## 小结

最后一块石头展示了：
- 问题转化的技巧（石头相撞 → 分组求差）
- 01背包的变体应用
- 最大化接近目标值

很多看似复杂的问题，转化后都是经典背包。
