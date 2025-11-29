# 实战：132模式

这道题看似简单，实则精妙。它需要我们找一个特殊的三元组，而单调栈从一个独特的角度来解决它。

## 问题描述

给你一个整数数组`nums`，判断数组中是否存在`132`模式。

`132`模式是指：存在下标`i < j < k`，使得`nums[i] < nums[k] < nums[j]`。

简单说，就是找三个数，**中间最大，左边最小，右边居中**。

**示例**：
```
输入: nums = [1,2,3,4]
输出: false
解释: 没有132模式

输入: nums = [3,1,4,2]
输出: true
解释: nums[1]=1, nums[2]=4, nums[3]=2，满足 1 < 2 < 4

输入: nums = [-1,3,2,0]
输出: true
解释: nums[0]=-1, nums[1]=3, nums[2]=2，满足 -1 < 2 < 3
```

## 思路分析

### 暴力方法：O(n³)

三重循环枚举所有`i, j, k`组合，检查是否满足条件。

### 优化思考

132模式中：
- `nums[j]`是最大的（"3"的位置）
- `nums[i]`是最小的（"1"的位置）
- `nums[k]`在中间（"2"的位置）

**关键洞察**：如果我们能高效地维护"2"的候选值，问题就简化了。

### 从右往左 + 单调栈

从右往左遍历，维护：
- 单调递减栈（潜在的"3"）
- 变量`third`记录被弹出的最大值（潜在的"2"）

当遇到一个数比`third`小时，就找到了"1"！

## 完整实现

```javascript
/**
 * @param {number[]} nums
 * @return {boolean}
 */
function find132pattern(nums) {
    const n = nums.length;
    const stack = [];        // 单调递减栈
    let third = -Infinity;   // 132中的"2"
    
    // 从右往左遍历
    for (let i = n - 1; i >= 0; i--) {
        // 当前数比third小，找到了"1"
        if (nums[i] < third) {
            return true;
        }
        
        // 弹出比当前数小的，更新third
        while (stack.length && nums[i] > stack[stack.length - 1]) {
            third = stack.pop();  // third取被弹出的最大值
        }
        
        stack.push(nums[i]);
    }
    
    return false;
}
```

## 核心逻辑详解

```javascript
for (let i = n - 1; i >= 0; i--) {
    // 检查：nums[i] 能否作为 "1"？
    if (nums[i] < third) return true;
    
    // 维护栈和third
    while (stack.length && nums[i] > stack[stack.length - 1]) {
        third = stack.pop();
    }
    stack.push(nums[i]);
}
```

**为什么这样做是对的？**

- 栈中元素是"3"的候选（单调递减，大的在下面）
- 当`nums[i]`比栈顶大时，栈顶被弹出成为新的`third`
- `third`总是某个"3"后面的"2"的最大可能值
- 当`nums[i] < third`时，说明：
  - 存在一个"3"（把`third`弹出的那个数）比`third`大
  - `third`比`nums[i]`大
  - 而且顺序是`i < j < k`（因为是从右往左遍历）

## 执行过程图解

以`nums = [3,1,4,2]`为例：

```
从右往左遍历:

i=3, nums[3]=2:
  third=-∞, 2 > -∞，不返回
  栈空，入栈
  stack=[2], third=-∞

i=2, nums[2]=4:
  third=-∞, 4 > -∞，不返回
  4 > 2，弹出2，third=2
  stack=[], third=2
  入栈
  stack=[4], third=2

i=1, nums[1]=1:
  1 < third=2，找到了！
  return true

解释:
  "1" = nums[1] = 1
  "3" = nums[2] = 4（把2弹出的那个）
  "2" = third = 2
  满足 1 < 2 < 4，顺序是 i=1 < j=2 < k=3
```

## 为什么从右往左？

从右往左遍历时：
- 先处理的是"k"和"j"的候选
- 后处理的是"i"的候选
- 这样能保证`i < j < k`的顺序

如果从左往右，顺序就乱了。

## 为什么third取弹出的最大值？

被弹出的元素满足：
- 它比当前元素小（能作为"2"）
- 它有一个更大的"3"存在（就是把它弹出的那个数）

我们要让third尽可能大，这样更容易找到比它小的"1"。

## 另一种方法：维护左边最小值

```javascript
function find132pattern(nums) {
    const n = nums.length;
    const minLeft = new Array(n);  // minLeft[i] = min(nums[0..i])
    
    minLeft[0] = nums[0];
    for (let i = 1; i < n; i++) {
        minLeft[i] = Math.min(minLeft[i - 1], nums[i]);
    }
    
    const stack = [];  // 单调递减栈
    
    // 从右往左
    for (let i = n - 1; i >= 0; i--) {
        // 弹出所有小于等于minLeft[i]的（它们不能做"2"）
        while (stack.length && stack[stack.length - 1] <= minLeft[i]) {
            stack.pop();
        }
        
        // 如果栈不空且栈顶 < nums[i]，找到了
        // minLeft[i] < stack.top() < nums[i]
        if (stack.length && stack[stack.length - 1] < nums[i]) {
            return true;
        }
        
        stack.push(nums[i]);
    }
    
    return false;
}
```

这种方法的思路：
- `minLeft[i]`是"1"的候选
- `stack.top()`是"2"的候选
- `nums[i]`是"3"的候选

## 复杂度分析

**时间复杂度：O(n)**
- 每个元素最多入栈出栈各一次

**空间复杂度：O(n)**
- 栈最多存储n个元素

## 边界情况

| 输入 | 分析 | 结果 |
|------|------|------|
| `[1,2,3,4]` | 严格递增，没有132 | false |
| `[4,3,2,1]` | 严格递减，没有132 | false |
| `[1,0,1,-4,-3]` | 存在-4,-3,1 | true |
| `[3,5,0,3,4]` | 存在0,3,4或0,5,4 | true |

## 小结

132模式的单调栈解法核心：

1. **从右往左**：保证处理顺序正确
2. **单调递减栈**：存储"3"的候选
3. **third变量**：记录被弹出的最大值作为"2"
4. **检查"1"**：当前数小于third时找到答案

这道题展示了单调栈的一个高级应用——不只是找"下一个更大/更小"，还可以用来维护满足特定关系的元素组合。
