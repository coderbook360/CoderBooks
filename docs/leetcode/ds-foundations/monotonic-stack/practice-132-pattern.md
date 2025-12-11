# 实战：132 模式

在数组中找到 `i < j < k` 且 `nums[i] < nums[k] < nums[j]` 的模式。这道题巧妙地使用单调栈从后往前遍历。

---

## 问题描述

**LeetCode 456. 132 Pattern**

给你一个整数数组 nums，判断数组中是否存在 132 模式。

132 模式是指满足以下条件的三元组 (i, j, k)：
- i < j < k
- nums[i] < nums[k] < nums[j]

**示例**：
```
输入：nums = [3,1,4,2]
输出：true
解释：存在 132 模式 (1, 4, 2)
```

---

## 思路分析

我们需要找三个数，满足"中间最大，左边最小，右边居中"。

从后往前遍历，用单调栈维护"可能的 nums[k]"（即中间值）：
- 遇到比栈顶大的数，它可以作为 nums[j]（最大值）
- 被弹出的数可以作为 nums[k]（中间值）
- 继续向前找 nums[i]（最小值）

---

## 解法

```javascript
function find132pattern(nums) {
  const n = nums.length;
  if (n < 3) return false;
  
  const stack = [];  // 单调递减栈
  let third = -Infinity;  // 记录 nums[k]（中间值）
  
  // 从后往前遍历
  for (let i = n - 1; i >= 0; i--) {
    // 如果当前值小于 third，说明找到了 132 模式
    if (nums[i] < third) return true;
    
    // 更新 third：弹出所有比当前值小的
    while (stack.length > 0 && nums[i] > stack[stack.length - 1]) {
      third = stack.pop();  // third 是次大的
    }
    
    stack.push(nums[i]);
  }
  
  return false;
}
```

---

## 执行过程

```
nums = [3, 1, 4, 2]

i=3, num=2: stack=[2], third=-Inf
i=2, num=4: 4>2, pop, third=2, stack=[4]
i=1, num=1: 1<third(2)? Yes! 返回 true

模式：nums[1]=1 < nums[3]=2 < nums[2]=4
```

---

## 为什么从后往前？

从后往前遍历让我们能够：
1. 用 `third` 记录"已经确定的 nums[k]"
2. 栈中保存的都是比 `third` 大的候选 nums[j]
3. 向前找比 `third` 小的 nums[i]

---

## 复杂度

- 时间：O(n)
- 空间：O(n)
