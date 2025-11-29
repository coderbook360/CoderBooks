# 实战：长度最小的子数组（窗口）

这道题在双指针章节已经讲过，这里从滑动窗口的角度重新审视，展示"求最小窗口"模板的应用。

## 问题描述

给定一个含有`n`个正整数的数组和一个正整数`target`，找出该数组中满足其和`≥ target`的长度最小的**连续子数组**，并返回其长度。

**示例**：
```
输入：target = 7, nums = [2,3,1,2,4,3]
输出：2
解释：子数组 [4,3] 是最短的
```

## 滑动窗口视角

### 窗口定义

- **窗口内容**：连续子数组
- **窗口状态**：元素之和
- **满足条件**：和 ≥ target

### 求最小窗口模板

```
1. 扩展：一直扩展直到满足条件
2. 收缩：满足条件后尝试收缩，更新最小值
3. 重复：继续扩展寻找下一个可能的更小窗口
```

## 完整实现

```javascript
/**
 * @param {number} target
 * @param {number[]} nums
 * @return {number}
 */
function minSubArrayLen(target, nums) {
    let left = 0;
    let sum = 0;         // 窗口状态
    let minLen = Infinity;
    
    for (let right = 0; right < nums.length; right++) {
        // 扩展窗口
        sum += nums[right];
        
        // 满足条件时收缩
        while (sum >= target) {
            // 收缩前更新结果（关键！）
            minLen = Math.min(minLen, right - left + 1);
            
            // 收缩窗口
            sum -= nums[left];
            left++;
        }
    }
    
    return minLen === Infinity ? 0 : minLen;
}
```

## 求最小 vs 求最大

对比一下两种情况：

### 求最大（如最长无重复子串）

```javascript
for (let right = 0; right < n; right++) {
    // 扩展
    expand(right);
    
    // 不满足条件时收缩
    while (!valid()) {
        shrink(left);
        left++;
    }
    
    // 收缩后窗口一定合法，更新最大值
    maxLen = Math.max(maxLen, right - left + 1);
}
```

### 求最小（如本题）

```javascript
for (let right = 0; right < n; right++) {
    // 扩展
    expand(right);
    
    // 满足条件时收缩
    while (valid()) {
        // 收缩前更新最小值
        minLen = Math.min(minLen, right - left + 1);
        
        shrink(left);
        left++;
    }
}
```

### 关键区别

| 场景 | while条件 | 更新时机 |
|------|----------|---------|
| 求最大 | `!valid()` | while之后 |
| 求最小 | `valid()` | while之中 |

## 执行过程

```
target = 7, nums = [2, 3, 1, 2, 4, 3]

right=0: sum=2, sum<7
right=1: sum=5, sum<7
right=2: sum=6, sum<7
right=3: sum=8, sum>=7 ✓
  minLen=4, sum-=2, left=1, sum=6<7
  
right=4: sum=10, sum>=7 ✓
  minLen=4, sum-=3, left=2, sum=7>=7 ✓
  minLen=3, sum-=1, left=3, sum=6<7
  
right=5: sum=9, sum>=7 ✓
  minLen=3, sum-=2, left=4, sum=7>=7 ✓
  minLen=2, sum-=4, left=5, sum=3<7

结果：2
```

## 为什么正确？

因为数组元素都是**正整数**：
- 窗口扩大 → 和增大
- 窗口缩小 → 和减小

这个**单调性**保证了：
1. 一旦和 ≥ target，收缩一定会使和减小
2. 收缩到和 < target 后，继续扩展才可能再次满足条件
3. 不会错过更优解

## 复杂度分析

**时间复杂度**：O(n)
- 每个元素最多进入窗口一次、离开窗口一次

**空间复杂度**：O(1)

## 小结

从滑动窗口角度看这道题：

1. **窗口状态**：维护窗口内元素之和
2. **求最小模板**：满足条件时收缩，收缩时更新结果
3. **单调性保证**：正整数数组保证了窗口的单调性
4. **与双指针统一**：本质上是同一种方法

理解"求最大"和"求最小"的模板差异，是掌握滑动窗口的关键。
