# 实战：跳跃游戏II

跳跃游戏的进阶版：求最少跳跃次数。

## 问题描述

给你一个非负整数数组`nums`，你最初位于数组的第一个位置。数组中的每个元素代表你在该位置可以跳跃的最大长度。

假设你总是可以到达最后一个位置，返回到达最后一个位置的**最小跳跃次数**。

## 思路分析

### BFS思路

可以把这道题看成BFS：位置是节点，跳跃是边，求从起点到终点的最短路径。

但BFS需要O(n)空间，有没有更优的方法？

### 贪心思路

贪心的关键是：**在每一跳能到达的范围内，选择能跳得最远的位置作为下一跳的起点**。

但实际上，我们不需要真的"选择"哪个位置，只需要追踪：
- 当前跳能到达的最远位置（`curEnd`）
- 下一跳能到达的最远位置（`farthest`）

当遍历到`curEnd`时，说明必须再跳一次了。

## 代码实现

```javascript
function jump(nums) {
    const n = nums.length;
    if (n <= 1) return 0;
    
    let jumps = 0;
    let curEnd = 0;      // 当前跳能到达的最远位置
    let farthest = 0;    // 目前能跳到的最远位置
    
    for (let i = 0; i < n - 1; i++) {
        farthest = Math.max(farthest, i + nums[i]);
        
        if (i === curEnd) {
            jumps++;
            curEnd = farthest;
            
            if (curEnd >= n - 1) {
                break;
            }
        }
    }
    
    return jumps;
}
```

## 图解

```
nums = [2, 3, 1, 1, 4]

位置 0: farthest = max(0, 0+2) = 2
        i === curEnd(0), jumps=1, curEnd=2
        
位置 1: farthest = max(2, 1+3) = 4
        
位置 2: farthest = max(4, 2+1) = 4
        i === curEnd(2), jumps=2, curEnd=4
        curEnd >= n-1, 跳出

结果: 2次跳跃
```

## 为什么这样做是对的？

### 贪心选择性质

在每一跳能到达的范围内，选择能跳得最远的位置，这样可以让下一跳的选择范围最大。

### 直觉理解

把位置分成"层"：
- 第0层：位置0
- 第1层：从位置0能直接跳到的位置
- 第2层：从第1层能跳到的位置
- ...

每一层相当于BFS的一层，`curEnd`就是当前层的边界。

## 与BFS的对比

```javascript
// BFS解法（作为对比）
function jump(nums) {
    const n = nums.length;
    if (n <= 1) return 0;
    
    let jumps = 0;
    let curLevel = [0];
    const visited = new Set([0]);
    
    while (curLevel.length > 0) {
        jumps++;
        const nextLevel = [];
        
        for (const pos of curLevel) {
            for (let i = 1; i <= nums[pos]; i++) {
                const next = pos + i;
                if (next >= n - 1) return jumps;
                if (!visited.has(next)) {
                    visited.add(next);
                    nextLevel.push(next);
                }
            }
        }
        
        curLevel = nextLevel;
    }
    
    return -1;
}
```

BFS解法正确但效率不高。贪心解法本质上是优化的BFS，不需要真的存储每一层的所有节点。

## 特殊情况

### 已经在终点

如果`n = 1`，返回0。

### 第一步就能到终点

如果`nums[0] >= n - 1`，返回1。

## 复杂度分析

**时间复杂度**：O(n)

**空间复杂度**：O(1)

## 小结

跳跃游戏II展示了贪心如何优化BFS：
- 不需要存储每一层的所有节点
- 只需要追踪当前层的边界和下一层能到达的最远位置
- O(1)空间实现O(n)时间的最短路径
