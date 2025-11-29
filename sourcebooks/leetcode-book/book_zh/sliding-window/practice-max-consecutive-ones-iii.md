# 实战：最大连续1的个数 III

这道题和"替换后的最长重复字符"思路相同，但更简单——只需要关注0的个数。

## 问题描述

给定一个二进制数组`nums`和一个整数`k`，如果可以翻转最多`k`个0，返回数组中连续1的最大个数。

**示例**：
```
输入：nums = [1,1,1,0,0,0,1,1,1,1,0], k = 2
输出：6
解释：翻转两个0（加粗部分），得到 [1,1,1,0,0,1,1,1,1,1,1]

输入：nums = [0,0,1,1,0,0,1,1,1,0,1,1,0,0,0,1,1,1,1], k = 3
输出：10
```

## 思路分析

### 核心洞察

- 翻转0就是把0变成1
- 最多翻转k个0
- 等价于：找一个最长的窗口，其中0的个数 ≤ k

### 窗口策略

- **窗口状态**：窗口内0的个数
- **收缩条件**：0的个数 > k
- **目标**：找最大的合法窗口

## 完整实现

```javascript
/**
 * @param {number[]} nums
 * @param {number} k
 * @return {number}
 */
function longestOnes(nums, k) {
    let zeros = 0;   // 窗口内0的个数
    let left = 0;
    let maxLen = 0;
    
    for (let right = 0; right < nums.length; right++) {
        // 扩展窗口
        if (nums[right] === 0) {
            zeros++;
        }
        
        // 0太多，收缩窗口
        while (zeros > k) {
            if (nums[left] === 0) {
                zeros--;
            }
            left++;
        }
        
        // 更新最大长度
        maxLen = Math.max(maxLen, right - left + 1);
    }
    
    return maxLen;
}
```

## 执行过程

```
nums = [1,1,1,0,0,0,1,1,1,1,0], k = 2

right=0: nums[0]=1, zeros=0, maxLen=1
right=1: nums[1]=1, zeros=0, maxLen=2
right=2: nums[2]=1, zeros=0, maxLen=3
right=3: nums[3]=0, zeros=1, maxLen=4
right=4: nums[4]=0, zeros=2, maxLen=5
right=5: nums[5]=0, zeros=3 > 2
  移出nums[0]=1, zeros=3, left=1
  移出nums[1]=1, zeros=3, left=2
  移出nums[2]=1, zeros=3, left=3
  移出nums[3]=0, zeros=2, left=4
  maxLen=5

right=6: nums[6]=1, zeros=2, maxLen=5
right=7: nums[7]=1, zeros=2, maxLen=5
right=8: nums[8]=1, zeros=2, maxLen=5
right=9: nums[9]=1, zeros=2, maxLen=6
right=10: nums[10]=0, zeros=3 > 2
  移出nums[4]=0, zeros=2, left=5
  maxLen=6

结果：6
```

## 与"替换后最长重复字符"的对比

| 问题 | 窗口状态 | 收缩条件 |
|-----|---------|---------|
| 替换后最长重复字符 | 各字符出现次数 | 窗口长度 - 最大出现次数 > k |
| 最大连续1的个数 | 0的个数 | 0的个数 > k |

本题更简单，因为只有0和1两种字符，只需要关注0的数量。

## 变体：最大连续1的个数 II

如果k=1，且只能翻转**恰好一个**0：

```javascript
function findMaxConsecutiveOnes(nums) {
    let maxLen = 0;
    let left = 0;
    let zeroPos = -1;  // 上一个0的位置
    
    for (let right = 0; right < nums.length; right++) {
        if (nums[right] === 0) {
            left = zeroPos + 1;  // 跳到上一个0的下一个位置
            zeroPos = right;
        }
        maxLen = Math.max(maxLen, right - left + 1);
    }
    
    return maxLen;
}
```

## 复杂度分析

**时间复杂度**：O(n)
- 每个元素最多访问两次

**空间复杂度**：O(1)
- 只用了几个变量

## 小结

最大连续1的个数III的要点：

1. **问题转化**：翻转k个0 → 窗口内最多k个0
2. **窗口状态**：只需记录0的个数
3. **标准模板**：求最大窗口，收缩条件是0的个数超限
4. **简化版本**：只有两种元素时，问题更简单

这是滑动窗口的经典入门题，掌握它就掌握了"求最大窗口"的基本套路。
