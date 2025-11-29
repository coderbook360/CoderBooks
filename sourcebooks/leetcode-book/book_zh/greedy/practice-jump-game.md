# 实战：跳跃游戏

这道题展示了贪心在可达性问题中的应用。

## 问题描述

给你一个非负整数数组`nums`，你最初位于数组的第一个位置。数组中的每个元素代表你在该位置可以跳跃的最大长度。

判断你是否能够到达最后一个位置。

## 思路分析

### 核心问题

能否从位置0跳到位置n-1？

### 贪心洞察

维护一个"能到达的最远位置"。

遍历数组，如果当前位置可达（在最远位置范围内），更新最远位置。如果最远位置超过了终点，返回true。

### 为什么正确？

如果位置`i`可达，那么`i`能跳到的所有位置也可达。

所以我们只需要追踪"能到达的最远位置"。

## 代码实现

```javascript
function canJump(nums) {
    let maxReach = 0;
    
    for (let i = 0; i < nums.length; i++) {
        if (i > maxReach) {
            return false;  // 当前位置不可达
        }
        maxReach = Math.max(maxReach, i + nums[i]);
        if (maxReach >= nums.length - 1) {
            return true;
        }
    }
    
    return true;
}
```

## 图解

```
nums = [2, 3, 1, 1, 4]

位置 0: 能跳到 0+2=2, maxReach=2
位置 1: 能跳到 1+3=4, maxReach=4
位置 2: 能跳到 2+1=3, maxReach=4
位置 3: 能跳到 3+1=4, maxReach=4
位置 4: 是终点，可达！

返回 true
```

```
nums = [3, 2, 1, 0, 4]

位置 0: maxReach=3
位置 1: maxReach=3
位置 2: maxReach=3
位置 3: maxReach=3
位置 4: i=4 > maxReach=3, 不可达！

返回 false
```

## 另一种实现：从后向前

也可以从终点往回看，判断能否一步步回到起点。

```javascript
function canJump(nums) {
    let lastPos = nums.length - 1;
    
    for (let i = nums.length - 2; i >= 0; i--) {
        if (i + nums[i] >= lastPos) {
            lastPos = i;
        }
    }
    
    return lastPos === 0;
}
```

这个思路是：如果能从位置i跳到lastPos，那么目标变成能否跳到i。

## 贪心选择性质的证明

### 归纳证明

**基础**：位置0可达（起点）。

**归纳**：如果位置k可达，且`maxReach >= k`，那么对于任意`k <= j <= maxReach`，位置j也可达。

因此，我们只需要维护maxReach，不需要记录具体哪些位置可达。

## 特殊情况

### 数组长度为1

起点就是终点，返回true。

### 第一个元素为0

如果`nums[0] = 0`且`n > 1`，返回false。

上面的代码已经处理了这些情况。

## 复杂度分析

**时间复杂度**：O(n)

**空间复杂度**：O(1)

## 小结

跳跃游戏展示了贪心在可达性问题中的应用：
- 维护"能到达的最远位置"
- 遍历时更新，如果当前位置超出最远位置则失败
- 简洁高效的O(n)解法
