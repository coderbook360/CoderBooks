# 实战：下一个更大元素

上一题我们学习了单调栈的基本用法。这道题在此基础上增加了一个挑战：需要查询另一个数组中元素在原数组中的"下一个更大元素"。

## 问题描述

`nums1`是`nums2`的子集。对于`nums1`中的每个元素，找出该元素在`nums2`中的下一个更大元素。

数字x的下一个更大元素是：x在`nums2`中对应位置的右边，第一个比x大的元素。如果不存在，则输出-1。

**示例1**：
```
输入: nums1 = [4,1,2], nums2 = [1,3,4,2]
输出: [-1,3,-1]

解释:
4在nums2中右边没有更大元素 → -1
1在nums2中右边第一个更大的是3 → 3
2在nums2中右边没有更大元素 → -1
```

**示例2**：
```
输入: nums1 = [2,4], nums2 = [1,2,3,4]
输出: [3,-1]

解释:
2在nums2中右边第一个更大的是3 → 3
4在nums2中右边没有更大元素 → -1
```

## 思路分析

### 拆解问题

分两步：
1. 对`nums2`中的每个元素，找出它的"下一个更大元素"
2. 根据`nums1`的查询，返回对应结果

第一步就是上一题的单调栈问题，第二步用哈希表O(1)查询。

### 算法流程

1. 用单调栈处理`nums2`，预计算每个元素的下一个更大元素
2. 将结果存入哈希表：`{元素值: 下一个更大元素}`
3. 遍历`nums1`，从哈希表查询答案

## 完整实现

```javascript
/**
 * @param {number[]} nums1
 * @param {number[]} nums2
 * @return {number[]}
 */
function nextGreaterElement(nums1, nums2) {
    const map = new Map();  // 元素 → 下一个更大元素
    const stack = [];       // 单调递减栈
    
    // 第一步：预处理nums2
    for (const num of nums2) {
        // 当前元素比栈顶大，弹出并记录答案
        while (stack.length && num > stack[stack.length - 1]) {
            const smaller = stack.pop();
            map.set(smaller, num);
        }
        stack.push(num);
    }
    
    // 栈中剩余元素没有下一个更大元素
    while (stack.length) {
        map.set(stack.pop(), -1);
    }
    
    // 第二步：查询nums1
    return nums1.map(num => map.get(num));
}
```

## 执行过程图解

以`nums1 = [4,1,2]`, `nums2 = [1,3,4,2]`为例：

### 第一步：处理nums2

```
遍历nums2: [1, 3, 4, 2]

num=1:
  栈空，入栈
  stack: [1]

num=3:
  3 > 1，弹出1，map.set(1, 3)
  stack: [], 入栈3
  stack: [3]

num=4:
  4 > 3，弹出3，map.set(3, 4)
  stack: [], 入栈4
  stack: [4]

num=2:
  2 < 4，直接入栈
  stack: [4, 2]

遍历结束:
栈中剩余[4, 2]，它们没有下一个更大元素
map.set(4, -1)
map.set(2, -1)

map = {
  1: 3,
  3: 4,
  4: -1,
  2: -1
}
```

### 第二步：查询nums1

```
nums1 = [4, 1, 2]

查询4 → map.get(4) = -1
查询1 → map.get(1) = 3
查询2 → map.get(2) = -1

结果: [-1, 3, -1]
```

## 代码优化

可以在处理`nums2`时直接初始化为-1，省去后续处理栈中剩余元素：

```javascript
function nextGreaterElement(nums1, nums2) {
    const map = new Map();
    const stack = [];
    
    for (const num of nums2) {
        while (stack.length && num > stack[stack.length - 1]) {
            map.set(stack.pop(), num);
        }
        stack.push(num);
    }
    
    // 直接查询，不在map中的返回-1
    return nums1.map(num => map.get(num) ?? -1);
}
```

## 复杂度分析

**时间复杂度：O(m + n)**
- m是nums1的长度，n是nums2的长度
- 处理nums2：O(n)，每个元素最多入栈出栈各一次
- 查询nums1：O(m)，每次查询O(1)

**空间复杂度：O(n)**
- 哈希表存储nums2中所有元素的答案

## 与"每日温度"的对比

| 题目 | 输出 | 特点 |
|------|------|------|
| 每日温度 | 距离（天数差） | 存储索引 |
| 下一个更大元素 | 元素值 | 存储元素值 |

核心都是单调递减栈，区别在于：
- 每日温度：栈存索引，计算距离
- 下一个更大元素：栈存元素值，记录值本身

## 变体：下一个更大元素II（循环数组）

如果数组是循环的，即末尾元素的下一个是开头元素，怎么处理？

**思路**：将数组"复制"一份接在后面，然后用单调栈处理。

```javascript
function nextGreaterElements(nums) {
    const n = nums.length;
    const result = new Array(n).fill(-1);
    const stack = [];
    
    // 遍历两倍长度
    for (let i = 0; i < 2 * n; i++) {
        const num = nums[i % n];
        
        while (stack.length && num > nums[stack[stack.length - 1]]) {
            result[stack.pop()] = num;
        }
        
        // 只在第一轮入栈
        if (i < n) {
            stack.push(i);
        }
    }
    
    return result;
}
```

**示例**：
```
输入: [1,2,1]
输出: [2,-1,2]

1的下一个更大是2
2没有更大的
1的下一个更大是2（循环回到开头）
```

## 边界情况

| 输入 | 结果 |
|------|------|
| `nums1=[4], nums2=[4]` | `[-1]` |
| `nums1=[1,2,3], nums2=[3,2,1]` | `[-1,-1,-1]` |
| `nums1=[1], nums2=[1,2,3,4]` | `[2]` |

## 小结

"下一个更大元素"问题的解法模式：

1. **单调栈预处理**：O(n)时间计算所有元素的答案
2. **哈希表存储**：方便O(1)查询
3. **按需返回**：根据查询数组返回结果

**何时存索引，何时存值？**
- 需要计算距离/位置 → 存索引
- 需要值本身 → 存值

单调栈 + 哈希表的组合是解决"查询下一个更大/更小元素"问题的标准模板。下一题我们将学习单调栈的"兄弟"——单调队列，用于解决滑动窗口问题。
