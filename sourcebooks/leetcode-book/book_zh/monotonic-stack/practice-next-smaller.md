# 实战：下一个更小元素

学习了"下一个更大元素"，现在让我们来看它的镜像问题——找下一个更小的元素。

## 问题描述

给定一个数组，对于每个元素，找出它右边第一个比它小的元素。如果不存在，返回-1。

**示例**：
```
输入: nums = [3, 1, 4, 1, 5, 9, 2, 6]
输出: [1, -1, 1, -1, 2, 2, -1, -1]

解释:
- 3: 右边第一个更小的是1
- 1: 右边没有更小的
- 4: 右边第一个更小的是1
- 1: 右边没有更小的
- 5: 右边第一个更小的是2
- 9: 右边第一个更小的是2
- 2: 右边没有更小的
- 6: 右边没有更小的
```

## 思路分析

和"下一个更大元素"正好相反：
- 找更大元素：用**单调递减栈**
- 找更小元素：用**单调递增栈**

**为什么是递增栈？**

递增栈中，小的元素在栈底，大的在栈顶。当遇到一个更小的元素时，栈顶的"大元素"就找到了它的答案——当前这个更小的元素。

## 完整实现

```javascript
/**
 * @param {number[]} nums
 * @return {number[]}
 */
function nextSmallerElement(nums) {
    const n = nums.length;
    const result = new Array(n).fill(-1);
    const stack = [];  // 单调递增栈，存储索引
    
    for (let i = 0; i < n; i++) {
        // 当前元素比栈顶小，栈顶找到了答案
        while (stack.length && nums[i] < nums[stack[stack.length - 1]]) {
            result[stack.pop()] = nums[i];
        }
        stack.push(i);
    }
    
    return result;
}
```

## 执行过程图解

以`nums = [3, 1, 4, 1, 5]`为例：

```
i=0, nums[0]=3:
  栈空，入栈
  stack: [0] -> [3]
  result: [-1,-1,-1,-1,-1]

i=1, nums[1]=1:
  1 < 3，弹出0，result[0]=1
  入栈1
  stack: [1] -> [1]
  result: [1,-1,-1,-1,-1]

i=2, nums[2]=4:
  4 > 1，不弹出
  入栈2
  stack: [1,2] -> [1,4]
  result: [1,-1,-1,-1,-1]

i=3, nums[3]=1:
  1 < 4，弹出2，result[2]=1
  1 = 1，不弹出（相等不算更小）
  入栈3
  stack: [1,3] -> [1,1]
  result: [1,-1,1,-1,-1]

i=4, nums[4]=5:
  5 > 1，不弹出
  入栈4
  stack: [1,3,4] -> [1,1,5]
  result: [1,-1,1,-1,-1]

最终结果: [1,-1,1,-1,-1]
```

## 返回索引版本

有时我们需要的是索引而非值：

```javascript
function nextSmallerIndex(nums) {
    const n = nums.length;
    const result = new Array(n).fill(-1);
    const stack = [];
    
    for (let i = 0; i < n; i++) {
        while (stack.length && nums[i] < nums[stack[stack.length - 1]]) {
            result[stack.pop()] = i;  // 记录索引
        }
        stack.push(i);
    }
    
    return result;
}

// [3, 1, 4, 1, 5] -> [1, -1, 3, -1, -1]
```

## 找上一个更小元素

同样的思路，但答案在入栈时确定：

```javascript
function previousSmallerElement(nums) {
    const n = nums.length;
    const result = new Array(n).fill(-1);
    const stack = [];  // 单调递增栈
    
    for (let i = 0; i < n; i++) {
        // 弹出所有大于等于当前的元素
        while (stack.length && nums[stack[stack.length - 1]] >= nums[i]) {
            stack.pop();
        }
        // 栈顶就是上一个更小的
        if (stack.length) {
            result[i] = nums[stack[stack.length - 1]];
        }
        stack.push(i);
    }
    
    return result;
}

// [3, 1, 4, 1, 5] -> [-1, -1, 1, -1, 1]
```

## 四种变体总结

| 目标 | 栈类型 | 答案确定时机 | 比较条件 |
|------|--------|--------------|----------|
| 下一个更大 | 递减栈 | 弹出时 | `nums[i] > stack.top()` |
| 下一个更小 | 递增栈 | 弹出时 | `nums[i] < stack.top()` |
| 上一个更大 | 递减栈 | 入栈时 | `stack.top() > nums[i]` |
| 上一个更小 | 递增栈 | 入栈时 | `stack.top() < nums[i]` |

## 循环数组版本

```javascript
function nextSmallerElementCircular(nums) {
    const n = nums.length;
    const result = new Array(n).fill(-1);
    const stack = [];
    
    for (let i = 0; i < 2 * n; i++) {
        const idx = i % n;
        
        while (stack.length && nums[idx] < nums[stack[stack.length - 1]]) {
            result[stack.pop()] = nums[idx];
        }
        
        if (i < n) {
            stack.push(i);
        }
    }
    
    return result;
}
```

## 应用场景

"下一个更小元素"在以下场景很有用：

1. **柱状图中最大矩形**：找每根柱子左右第一个更小的位置
2. **子数组最小值的贡献**：计算每个元素作为最小值的范围
3. **股票卖出时机**：找下一个价格下跌的日子

## 复杂度分析

**时间复杂度：O(n)**
- 每个元素最多入栈出栈各一次

**空间复杂度：O(n)**
- 栈最多存储n个元素

## 小结

下一个更小元素的核心：

1. **单调递增栈**：栈底小，栈顶大
2. **遇小则弹**：当前元素比栈顶小时，栈顶找到了答案
3. **对称思维**：和"更大元素"完全对称，只需调整比较方向

掌握了更大和更小的四种变体，单调栈的基础就算扎实了。
