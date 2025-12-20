# 实战：下一个更大元素 II

这道题在上一题的基础上增加了一个挑战：数组是**循环**的。

什么是循环数组？就是最后一个元素的下一个是第一个元素。这意味着我们要在"环"上找下一个更大元素。

---

## 问题描述

**LeetCode 503. Next Greater Element II**

给定一个循环数组 `nums`，返回每个元素的下一个更大元素。

**示例**：
```
输入：nums = [1,2,1]
输出：[2,-1,2]
解释：第一个1的下一个更大是2；2没有更大的；最后一个1的下一个更大是第一个元素2（循环）
```

---

## 核心技巧：遍历两遍

循环数组的常用技巧：将数组"复制"一份拼接在后面，然后正常遍历。

实际上不需要真的复制，只需遍历 `2n` 次，用取模来获取真实索引。

```javascript
function nextGreaterElements(nums) {
  const n = nums.length;
  const result = new Array(n).fill(-1);
  const stack = [];  // 单调递减栈，存索引
  
  // 遍历两遍
  for (let i = 0; i < 2 * n; i++) {
    const index = i % n;  // 真实索引
    
    while (stack.length > 0 && nums[index] > nums[stack[stack.length - 1]]) {
      result[stack.pop()] = nums[index];
    }
    
    // 只在第一遍入栈
    if (i < n) {
      stack.push(i);
    }
  }
  
  return result;
}
```

---

## 执行过程

```
nums = [1, 2, 1]

第一遍（i=0,1,2）：
i=0: stack=[0]
i=1: 2>1, pop, result[0]=2, stack=[1]
i=2: 1<2, stack=[1,2]

第二遍（i=3,4,5）：
i=3 (index=0): 1<2, 不弹出
i=4 (index=1): 2>1, pop, result[2]=2, stack=[1]
i=5 (index=2): 1<2, 不入栈（第二遍）

result = [2, -1, 2]
```

---

## 为什么遍历两遍就够了？

因为第二遍遍历时，每个元素都有机会看到它"前面"（在环上是后面）的所有元素。如果两遍都找不到更大的，那就真的不存在了。

---

## 复杂度

- 时间：O(n)
- 空间：O(n)
