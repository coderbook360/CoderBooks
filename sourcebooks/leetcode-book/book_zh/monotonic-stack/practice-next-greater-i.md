# 实战：下一个更大元素I

这是单调栈最直接的应用——给定一个元素，找到它右边第一个比它大的元素。

## 问题描述

给你两个**没有重复元素**的数组`nums1`和`nums2`，其中`nums1`是`nums2`的子集。

请你找出`nums1`中每个元素在`nums2`中的下一个比其大的值。

如果不存在，输出-1。

**示例**：
```
输入: nums1 = [4,1,2], nums2 = [1,3,4,2]
输出: [-1,3,-1]

解释:
- 4: 在nums2中没有更大的元素 → -1
- 1: 在nums2中下一个更大的是3 → 3
- 2: 在nums2中没有更大的元素 → -1
```

## 思路分析

### 暴力方法：O(n×m)

对于nums1中的每个元素，在nums2中找到它的位置，然后向右扫描找第一个更大的。

```javascript
function nextGreaterElement(nums1, nums2) {
    const result = [];
    
    for (const num of nums1) {
        const idx = nums2.indexOf(num);
        let found = -1;
        for (let i = idx + 1; i < nums2.length; i++) {
            if (nums2[i] > num) {
                found = nums2[i];
                break;
            }
        }
        result.push(found);
    }
    
    return result;
}
```

### 单调栈优化：O(n+m)

先用单调栈预处理nums2，建立**元素→下一个更大元素**的映射，然后直接查表。

## 完整实现

```javascript
/**
 * @param {number[]} nums1
 * @param {number[]} nums2
 * @return {number[]}
 */
function nextGreaterElement(nums1, nums2) {
    const map = new Map();  // num -> 下一个更大元素
    const stack = [];       // 单调递减栈
    
    // 遍历nums2，预处理
    for (const num of nums2) {
        // 当前元素比栈顶大，栈顶找到了答案
        while (stack.length && num > stack[stack.length - 1]) {
            map.set(stack.pop(), num);
        }
        stack.push(num);
    }
    
    // 栈中剩余元素没有更大的
    while (stack.length) {
        map.set(stack.pop(), -1);
    }
    
    // 查表获取结果
    return nums1.map(num => map.get(num));
}
```

## 执行过程图解

以`nums2 = [1,3,4,2]`为例：

```
遍历过程:
num=1:
  栈空，入栈
  stack: [1]

num=3:
  3 > 1，弹出1，记录map[1]=3
  入栈3
  stack: [3]
  map: {1→3}

num=4:
  4 > 3，弹出3，记录map[3]=4
  入栈4
  stack: [4]
  map: {1→3, 3→4}

num=2:
  2 < 4，直接入栈
  stack: [4, 2]
  map: {1→3, 3→4}

处理剩余栈元素:
  弹出2，map[2]=-1
  弹出4，map[4]=-1
  map: {1→3, 3→4, 2→-1, 4→-1}

查询nums1 = [4,1,2]:
  4 → -1
  1 → 3
  2 → -1

结果: [-1, 3, -1]
```

## 为什么用Map？

题目说nums1是nums2的子集，且没有重复元素。用Map可以O(1)查找每个元素的答案。

如果允许重复元素，就不能用元素值作为key，而要用索引。

## 精简版本

不需要单独处理栈中剩余元素：

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
    
    // 直接用?? -1处理不存在的情况
    return nums1.map(num => map.get(num) ?? -1);
}
```

## 复杂度分析

**时间复杂度：O(n + m)**
- n是nums1的长度，m是nums2的长度
- 遍历nums2一次：O(m)
- 每个元素最多入栈出栈各一次：O(m)
- 构建结果：O(n)

**空间复杂度：O(m)**
- Map存储nums2中所有元素的映射
- 栈最多存储m个元素

## 变体：返回索引而非值

```javascript
function nextGreaterIndex(nums) {
    const n = nums.length;
    const result = new Array(n).fill(-1);
    const stack = [];  // 存储索引
    
    for (let i = 0; i < n; i++) {
        while (stack.length && nums[i] > nums[stack[stack.length - 1]]) {
            result[stack.pop()] = i;  // 记录索引
        }
        stack.push(i);
    }
    
    return result;
}

// [1,3,4,2] -> [1, 2, -1, -1]
```

## 小结

下一个更大元素I的核心：

1. **单调递减栈**：遇到更大元素时，弹出栈顶
2. **建立映射**：预处理nums2，构建元素→答案的Map
3. **查表返回**：nums1直接查Map获取结果

这道题是单调栈的入门题，掌握它后，可以解决一系列"下一个更大/更小"的变体问题。
