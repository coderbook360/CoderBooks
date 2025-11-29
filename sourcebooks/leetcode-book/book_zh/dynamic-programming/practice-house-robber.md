# 实战：打家劫舍

DP中的经典决策问题。

## 问题描述

你是一个专业的小偷，计划偷窃沿街的房屋。每间房内都藏有一定的现金。

相邻的房屋装有相互连通的防盗系统，如果两间相邻的房屋在同一晚上被小偷闯入，系统会自动报警。

给定一个代表每个房屋存放金额的非负整数数组，计算你不触动警报装置的情况下，一夜之内能够偷窃到的最高金额。

示例：
- 输入：`[1,2,3,1]`
- 输出：4（偷第1和第3间房：1 + 3 = 4）

## 思路分析

对于每个房子，有两个选择：
- **偷**：获得当前金额，但不能偷前一个
- **不偷**：金额不变，可以偷前一个

## 解法1：标准DP

```javascript
function rob(nums) {
    const n = nums.length;
    if (n === 0) return 0;
    if (n === 1) return nums[0];
    
    const dp = new Array(n);
    dp[0] = nums[0];
    dp[1] = Math.max(nums[0], nums[1]);
    
    for (let i = 2; i < n; i++) {
        // 偷第i间：dp[i-2] + nums[i]
        // 不偷第i间：dp[i-1]
        dp[i] = Math.max(dp[i - 1], dp[i - 2] + nums[i]);
    }
    
    return dp[n - 1];
}
```

## 状态定义的理解

`dp[i]` = 前i+1个房子能偷到的最大金额。

注意：`dp[i]`不一定偷了第i个房子，只表示"考虑前i+1个房子的最优解"。

## 解法2：空间优化

```javascript
function rob(nums) {
    const n = nums.length;
    if (n === 0) return 0;
    if (n === 1) return nums[0];
    
    let prev2 = nums[0];
    let prev1 = Math.max(nums[0], nums[1]);
    
    for (let i = 2; i < n; i++) {
        const curr = Math.max(prev1, prev2 + nums[i]);
        prev2 = prev1;
        prev1 = curr;
    }
    
    return prev1;
}
```

## 另一种状态定义

`dp[i][0]` = 不偷第i个房子的最大金额
`dp[i][1]` = 偷第i个房子的最大金额

```javascript
function rob(nums) {
    const n = nums.length;
    if (n === 0) return 0;
    
    let notRob = 0;     // 不偷当前房子
    let doRob = nums[0]; // 偷当前房子
    
    for (let i = 1; i < n; i++) {
        const newNotRob = Math.max(notRob, doRob);
        const newDoRob = notRob + nums[i];
        notRob = newNotRob;
        doRob = newDoRob;
    }
    
    return Math.max(notRob, doRob);
}
```

这种定义更清晰地表达了"偷与不偷"的决策。

## DP五步法

1. **状态**：`dp[i]` = 前i+1个房子的最大金额
2. **转移**：`dp[i] = max(dp[i-1], dp[i-2] + nums[i])`
3. **初始**：`dp[0] = nums[0], dp[1] = max(nums[0], nums[1])`
4. **顺序**：从小到大
5. **结果**：`dp[n-1]`

## 复杂度分析

- **时间复杂度**：O(n)
- **空间复杂度**：O(1)

## 小结

打家劫舍展示了DP中的决策问题：
- 每一步有多个选择
- 选择之间有约束
- 用状态转移表达这种约束

下一题是环形版本，更有挑战。
