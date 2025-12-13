# 实战：下一个更大元素

这道题在上一章"每日温度"的基础上增加了一个变化：我们需要处理两个数组之间的映射关系。

问题是这样的：给你两个数组 `nums1` 和 `nums2`，其中 `nums1` 是 `nums2` 的子集。对于 `nums1` 中的每个元素，找出它在 `nums2` 中对应位置右侧的第一个更大元素。

---

## 问题描述

**LeetCode 496. Next Greater Element I**

`nums1` 中数字 x 的**下一个更大元素**是指 x 在 `nums2` 中对应位置**右侧**的**第一个**比 x 大的元素。

给你两个**没有重复元素**的数组 `nums1` 和 `nums2`，其中 `nums1` 是 `nums2` 的子集。

对于每个 `nums1[i]`，找出它在 `nums2` 中的下一个更大元素。如果不存在，输出 -1。

**示例**：

```
输入：nums1 = [4,1,2], nums2 = [1,3,4,2]
输出：[-1,3,-1]
解释：
- 4 在 nums2 中的位置是索引 2，右侧没有更大的元素
- 1 在 nums2 中的位置是索引 0，右侧第一个更大的是 3
- 2 在 nums2 中的位置是索引 3，右侧没有更大的元素
```

---

## 问题分析

首先理清两个数组的关系：
- `nums2` 是主数组，我们要在这里找"下一个更大元素"
- `nums1` 是查询数组，问的是这些元素的答案

一个朴素的想法是：对于 `nums1` 中的每个元素，先在 `nums2` 中找到它的位置，然后向右遍历找更大的。但这样时间复杂度是 O(m × n)。

更好的方法是：先用单调栈预处理 `nums2`，把每个元素的"下一个更大元素"都算出来存在哈希表里，然后直接查询。

---

## 解法：单调栈 + 哈希表

```javascript
function nextGreaterElement(nums1, nums2) {
  const map = new Map();  // 存储 nums2 中每个元素的下一个更大元素
  const stack = [];       // 单调递减栈（存储值）
  
  // 预处理 nums2
  for (const num of nums2) {
    // 当前元素比栈顶大，栈顶找到了答案
    while (stack.length > 0 && num > stack[stack.length - 1]) {
      const smaller = stack.pop();
      map.set(smaller, num);
    }
    stack.push(num);
  }
  
  // 栈中剩余的元素没有更大的
  while (stack.length > 0) {
    map.set(stack.pop(), -1);
  }
  
  // 查询 nums1
  return nums1.map(num => map.get(num));
}
```

---

## 执行过程可视化

以 `nums1 = [4,1,2], nums2 = [1,3,4,2]` 为例：

```
预处理 nums2 = [1, 3, 4, 2]：

num = 1:
  栈空，入栈
  stack = [1]

num = 3:
  3 > 1，弹出 1，map[1] = 3
  栈空，入栈
  stack = [3]
  map = {1: 3}

num = 4:
  4 > 3，弹出 3，map[3] = 4
  栈空，入栈
  stack = [4]
  map = {1: 3, 3: 4}

num = 2:
  2 < 4，直接入栈
  stack = [4, 2]

遍历结束，处理栈中剩余元素：
  弹出 2，map[2] = -1
  弹出 4，map[4] = -1
  map = {1: 3, 3: 4, 2: -1, 4: -1}

查询 nums1 = [4, 1, 2]：
  map.get(4) = -1
  map.get(1) = 3
  map.get(2) = -1

结果：[-1, 3, -1]
```

---

## 为什么可以用哈希表？

题目有一个关键条件：**没有重复元素**。

这意味着每个值在 `nums2` 中只出现一次，所以可以用值作为键，不会冲突。如果有重复元素，就需要用索引来区分了。

---

## 与"每日温度"的对比

| 题目 | 存什么 | 需要索引？ | 额外结构 |
|-----|-------|----------|---------|
| 每日温度 | 索引 | 是（计算天数差）| 无 |
| 下一个更大元素 | 值 | 否（直接映射）| 哈希表 |

"每日温度"需要存索引是因为要计算距离，而这道题只需要知道"下一个更大的值是多少"，所以可以直接存值，然后用哈希表做映射。

---

## 复杂度分析

- **时间复杂度**：O(m + n)，其中 m 是 `nums1` 的长度，n 是 `nums2` 的长度。预处理 O(n)，查询 O(m)。
- **空间复杂度**：O(n)，哈希表和栈都最多存储 n 个元素。

---

## 边界情况

- **nums1 全在 nums2 末尾**：都没有更大元素，全返回 -1
- **nums2 递增**：每个元素的下一个更大就是右边那个
- **nums2 递减**：除了第一个元素，都有答案；第一个是 -1

---

## 常见错误

**错误1：预处理 nums1 而不是 nums2**

```javascript
// ❌ 错误：nums1 只是查询，不是数据来源
for (const num of nums1) { ... }

// ✅ 正确：nums2 才是要处理的数组
for (const num of nums2) { ... }
```

**错误2：忘记处理栈中剩余元素**

```javascript
// ❌ 栈中剩余的元素没有设置为 -1
// 查询时会返回 undefined

// ✅ 要处理剩余元素
while (stack.length > 0) {
  map.set(stack.pop(), -1);
}
```

或者查询时用默认值：

```javascript
return nums1.map(num => map.get(num) ?? -1);
```

---

## 简化版本

如果不提前处理剩余元素，可以在查询时用默认值：

```javascript
function nextGreaterElement(nums1, nums2) {
  const map = new Map();
  const stack = [];
  
  for (const num of nums2) {
    while (stack.length > 0 && num > stack[stack.length - 1]) {
      map.set(stack.pop(), num);
    }
    stack.push(num);
  }
  
  // 查询时提供默认值 -1
  return nums1.map(num => map.get(num) ?? -1);
}
```

---

## 技巧总结

这道题的核心模式：

- **预处理 + 查询**：先把所有答案算出来，然后 O(1) 查询
- **单调栈找更大**：维护单调递减栈
- **哈希表做映射**：用于不同数组之间的关联

这个模式在很多题目中都会用到。当问题涉及"预先计算所有可能的答案"时，哈希表是很好的选择。

---

## 关联题目

- **LeetCode 503**：下一个更大元素 II（循环数组）
- **LeetCode 739**：每日温度
- **LeetCode 556**：下一个更大元素 III（数字排列）
