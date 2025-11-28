# 实战：下一个更大元素II

这道题在"下一个更大元素I"的基础上引入了**循环数组**——数组的末尾可以"绕回"到开头继续查找。

## 问题描述

给定一个循环数组`nums`，返回每个元素的下一个更大元素。

数字x的下一个更大元素是按数组遍历顺序，在它之后第一个比它大的数。如果不存在，输出-1。

**示例**：
```
输入: nums = [1,2,1]
输出: [2,-1,2]

解释:
- 第一个1: 右边的2比它大 → 2
- 2: 右边没有更大的，绕回去也没有 → -1  
- 第二个1: 绕回到开头，2比它大 → 2
```

## 思路分析

### 循环数组的处理技巧

最常用的方法：**将数组"复制"一份拼接**，把循环问题转化为线性问题。

```
原数组:    [1, 2, 1]
逻辑拼接:  [1, 2, 1, 1, 2, 1]
```

实际上不需要真的复制数组，只需要遍历两遍，用**取模**访问元素。

### 单调栈处理

基本思路和第一版一样，用单调递减栈找下一个更大元素。

## 完整实现

```javascript
/**
 * @param {number[]} nums
 * @return {number[]}
 */
function nextGreaterElements(nums) {
    const n = nums.length;
    const result = new Array(n).fill(-1);
    const stack = [];  // 单调递减栈，存储索引
    
    // 遍历两遍
    for (let i = 0; i < 2 * n; i++) {
        const idx = i % n;  // 实际索引
        
        // 当前元素比栈顶大，栈顶找到了答案
        while (stack.length && nums[idx] > nums[stack[stack.length - 1]]) {
            result[stack.pop()] = nums[idx];
        }
        
        // 只在第一遍时入栈
        if (i < n) {
            stack.push(i);
        }
    }
    
    return result;
}
```

## 执行过程图解

以`nums = [1,2,1]`为例：

```
第一遍 (i = 0, 1, 2):
i=0, idx=0, nums[idx]=1:
  栈空，入栈
  stack: [0], result: [-1,-1,-1]

i=1, idx=1, nums[idx]=2:
  2 > 1，弹出0，result[0]=2
  入栈1
  stack: [1], result: [2,-1,-1]

i=2, idx=2, nums[idx]=1:
  1 < 2，不弹出
  入栈2
  stack: [1,2], result: [2,-1,-1]

第二遍 (i = 3, 4, 5):
i=3, idx=0, nums[idx]=1:
  1 < 1，不弹出
  不入栈（i >= n）
  stack: [1,2]

i=4, idx=1, nums[idx]=2:
  2 > 1，弹出2，result[2]=2
  不入栈
  stack: [1], result: [2,-1,2]

i=5, idx=2, nums[idx]=1:
  1 < 2，不弹出
  不入栈
  stack: [1]

最终结果: [2, -1, 2]
```

## 为什么只在第一遍入栈？

第二遍的目的是为第一遍中还未找到答案的元素"补全"答案。

如果第二遍也入栈：
1. 会产生重复计算
2. 可能出现`result[i]`被覆盖的情况

```
错误示范：如果第二遍也入栈
nums = [1,2,1]
i=3时入栈idx=0
i=4时，2>1弹出idx=0，result[0]被覆盖
但result[0]在第一遍已经正确计算了
```

## 另一种写法：从后往前遍历

```javascript
function nextGreaterElements(nums) {
    const n = nums.length;
    const result = new Array(n).fill(-1);
    const stack = [];
    
    // 从后往前遍历两遍
    for (let i = 2 * n - 1; i >= 0; i--) {
        const idx = i % n;
        
        // 弹出所有比当前小的
        while (stack.length && stack[stack.length - 1] <= nums[idx]) {
            stack.pop();
        }
        
        // 栈顶就是答案
        if (stack.length) {
            result[idx] = stack[stack.length - 1];
        }
        
        stack.push(nums[idx]);  // 存值而非索引
    }
    
    return result;
}
```

这种方法存储的是值而非索引，思路略有不同但结果一样。

## 复杂度分析

**时间复杂度：O(n)**
- 虽然遍历2n次，但每个元素最多入栈出栈各一次
- 实际操作次数不超过4n

**空间复杂度：O(n)**
- 栈最多存储n个元素
- 结果数组O(n)

## 循环数组的通用技巧

处理循环数组的三种方法：

1. **遍历两遍 + 取模**（本题使用）
   ```javascript
   for (let i = 0; i < 2 * n; i++) {
       const idx = i % n;
       // 处理nums[idx]
   }
   ```

2. **真实拼接数组**
   ```javascript
   const doubled = [...nums, ...nums];
   // 处理doubled
   ```

3. **从后往前遍历**
   - 适用于某些特定场景

## 与第一版的对比

| 特点 | 下一个更大元素I | 下一个更大元素II |
|------|-----------------|------------------|
| 数组类型 | 两个独立数组 | 单个循环数组 |
| 查询方式 | 建立Map查表 | 直接填充结果数组 |
| 循环处理 | 不需要 | 遍历两遍 |
| 栈存储 | 值 | 索引 |

## 小结

下一个更大元素II的核心：

1. **循环数组转线性**：遍历两遍，用取模访问
2. **第一遍入栈**：只在第一遍时将索引入栈
3. **第二遍补全**：为尚未找到答案的元素查找

掌握了循环数组的处理技巧，很多涉及"环形"的问题都能迎刃而解。
