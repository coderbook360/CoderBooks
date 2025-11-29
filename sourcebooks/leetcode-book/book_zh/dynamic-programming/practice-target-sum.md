# 实战：目标和

01背包求方案数。

## 问题描述

给定一个非负整数数组nums和一个目标整数target，数组中的每个整数前添加`+`或`-`，然后串联起来，构造一个表达式。

返回可以构造出结果等于target的不同表达式的数目。

示例：
- nums = [1,1,1,1,1], target = 3 → 5种
- -1+1+1+1+1, +1-1+1+1+1, +1+1-1+1+1, +1+1+1-1+1, +1+1+1+1-1

## 转化为背包问题

设正数集合和为P，负数集合和为N：
- P + N = sum
- P - N = target

解得：P = (sum + target) / 2

问题转化为：从nums中选数，使和恰好为P的方案数。

这是01背包求方案数！

## 解法

```javascript
function findTargetSumWays(nums, target) {
    const sum = nums.reduce((a, b) => a + b, 0);
    
    // 检查可行性
    if ((sum + target) % 2 !== 0) return 0;
    if (Math.abs(target) > sum) return 0;
    
    const P = (sum + target) / 2;
    const dp = new Array(P + 1).fill(0);
    dp[0] = 1;  // 和为0有一种方案：什么都不选
    
    for (const num of nums) {
        // 01背包：倒序遍历
        for (let j = P; j >= num; j--) {
            dp[j] += dp[j - num];
        }
    }
    
    return dp[P];
}
```

## 为什么dp[0] = 1

和为0的方案数是1，即"一个数都不选"。

这是背包求方案数的标准初始化。

## 边界情况

```javascript
// (sum + target)必须是偶数
if ((sum + target) % 2 !== 0) return 0;

// target不能超过sum
if (Math.abs(target) > sum) return 0;
```

## 处理包含0的情况

如果数组包含0，每个0可以是+0或-0，会使方案数翻倍。

上面的代码已经正确处理了：
- num=0时，`dp[j] += dp[j - 0] = dp[j] += dp[j]`
- 相当于方案数翻倍

## 回溯解法（对比）

```javascript
function findTargetSumWays(nums, target) {
    let count = 0;
    
    function backtrack(index, sum) {
        if (index === nums.length) {
            if (sum === target) count++;
            return;
        }
        
        backtrack(index + 1, sum + nums[index]);
        backtrack(index + 1, sum - nums[index]);
    }
    
    backtrack(0, 0);
    return count;
}
```

回溯的时间复杂度是O(2^n)，DP是O(n × P)，大多数情况下DP更快。

## 复杂度分析

- **时间复杂度**：O(n × P)，其中P = (sum + target) / 2
- **空间复杂度**：O(P)

## 小结

目标和展示了：
- 数学转化将问题变成背包
- 01背包求方案数
- 初始化dp[0] = 1

"给数组元素添加正负号"这类问题，常可以转化为背包。
