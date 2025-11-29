# 实战：分割等和子集

01背包的经典应用。

## 问题描述

给定一个只包含正整数的非空数组，判断是否可以将这个数组分割成两个子集，使得两个子集的元素和相等。

示例：
- `[1,5,11,5]` → true（[1,5,5]和[11]）
- `[1,2,3,5]` → false

## 转化为背包问题

设数组总和为sum：
- 如果sum是奇数，不可能分成相等两份
- 如果sum是偶数，问题转化为：能否选出一些数，使它们的和等于sum/2

这就是01背包问题！
- 物品重量 = 物品价值 = nums[i]
- 背包容量 = sum/2
- 问题：能否恰好装满背包

## 解法

```javascript
function canPartition(nums) {
    const sum = nums.reduce((a, b) => a + b, 0);
    
    // 奇数无法分割
    if (sum % 2 !== 0) return false;
    
    const target = sum / 2;
    const dp = new Array(target + 1).fill(false);
    dp[0] = true;  // 和为0总是可以的
    
    for (const num of nums) {
        // 01背包：倒序遍历
        for (let j = target; j >= num; j--) {
            dp[j] = dp[j] || dp[j - num];
        }
    }
    
    return dp[target];
}
```

## 状态定义

`dp[j]` = 能否选出一些数，使和恰好等于j

## 状态转移

对于每个数num：
- 不选：`dp[j]`保持不变
- 选：`dp[j] = dp[j - num]`

合并：`dp[j] = dp[j] || dp[j - num]`

## 优化：提前终止

```javascript
function canPartition(nums) {
    const sum = nums.reduce((a, b) => a + b, 0);
    if (sum % 2 !== 0) return false;
    
    const target = sum / 2;
    
    // 如果最大数超过target，不可能
    if (Math.max(...nums) > target) return false;
    
    const dp = new Array(target + 1).fill(false);
    dp[0] = true;
    
    for (const num of nums) {
        // 提前终止
        if (dp[target]) return true;
        
        for (let j = target; j >= num; j--) {
            dp[j] = dp[j] || dp[j - num];
        }
    }
    
    return dp[target];
}
```

## 用Set优化

```javascript
function canPartition(nums) {
    const sum = nums.reduce((a, b) => a + b, 0);
    if (sum % 2 !== 0) return false;
    
    const target = sum / 2;
    let possible = new Set([0]);
    
    for (const num of nums) {
        const newPossible = new Set(possible);
        for (const s of possible) {
            if (s + num === target) return true;
            if (s + num < target) {
                newPossible.add(s + num);
            }
        }
        possible = newPossible;
    }
    
    return possible.has(target);
}
```

## 复杂度分析

- **时间复杂度**：O(n × target)
- **空间复杂度**：O(target)

## 问题变形

如果要求返回具体的分割方案，可以记录路径：

```javascript
function canPartition(nums) {
    // ... 省略前面的代码
    
    // 回溯找出选了哪些数
    const selected = [];
    let j = target;
    for (let i = nums.length - 1; i >= 0 && j > 0; i--) {
        // 如果dp[j - nums[i]]是true，说明选了nums[i]
        if (j >= nums[i] && dp[j - nums[i]]) {
            selected.push(nums[i]);
            j -= nums[i];
        }
    }
    return selected;
}
```

## 小结

分割等和子集展示了如何将问题转化为01背包：
- 分析问题本质
- 识别背包类型
- 应用背包模板

这种"能否恰好达到某个目标"的问题，常常可以用背包DP解决。
