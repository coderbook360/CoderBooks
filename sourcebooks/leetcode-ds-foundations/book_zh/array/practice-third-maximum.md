# 实战：第三大的数

上一道题我们学习了原地标记技巧。这道题换个方向，来看一个经典问题：**如何高效找到数组中第 K 大的元素？**

今天的主角是"第三大的数"——一个看似简单，实则暗藏玄机的问题。

---

## 题目描述

**LeetCode 414. Third Maximum Number**

给你一个非空数组，返回此数组中**第三大的数**。如果不存在，则返回数组中最大的数。

**注意**："第三大的数"是指在所有**不同**数字中排第三大的数。

**示例 1**：

```
输入：[3, 2, 1]
输出：1
解释：第三大的数是 1
```

**示例 2**：

```
输入：[1, 2]
输出：2
解释：不存在第三大的数，返回最大的数 2
```

**示例 3**：

```
输入：[2, 2, 3, 1]
输出：1
解释：不同数字有 1, 2, 3，第三大的数是 1
```

**进阶**：你能设计一个时间复杂度 O(n) 的解决方案吗？

---

## 问题分析

首先要问一个问题：**"第三大"需要知道什么信息？**

答案是：只需要知道**最大、次大、第三大**这三个值。

不需要完整排序，也不需要知道第四大、第五大是什么。

再问第二个问题：**有什么陷阱？**

1. **"不同"数字**：重复的数只算一次
2. **不足三个**：如果不同数少于三个，返回最大值

---

## 解法一：排序去重（直观版）

最直接的思路：先去重，再排序，取第三个。

```javascript
function thirdMax(nums) {
  // 去重
  const unique = [...new Set(nums)];
  
  // 降序排序
  unique.sort((a, b) => b - a);
  
  // 第三大存在就返回它，否则返回最大值
  return unique.length >= 3 ? unique[2] : unique[0];
}
```

**复杂度分析**：
- 时间复杂度：O(n log n)（排序）
- 空间复杂度：O(n)（去重后的数组）

这个解法很清晰，但效率不够高。题目的进阶要求是 O(n) 时间复杂度。

现在我要问第三个问题：**只找前三大，真的需要排序吗？**

---

## 解法二：三变量维护（O(n) 版）

### 核心思想

维护三个变量：`first`（最大）、`second`（次大）、`third`（第三大）。

一次遍历，不断更新这三个变量。

### 关键设计决策

**用什么表示"还没有值"？**

你可能想用 `-Infinity`，但这有个坑：如果数组真的包含 `-Infinity` 怎么办？

更安全的做法：**用 `null` 表示"未设置"**。

### 代码实现

```javascript
function thirdMax(nums) {
  let first = null;
  let second = null;
  let third = null;
  
  for (const num of nums) {
    // 跳过重复值（去重）
    if (num === first || num === second || num === third) {
      continue;
    }
    
    // 级联更新
    if (first === null || num > first) {
      // num 比最大的还大，所有值都要"顺移"
      third = second;
      second = first;
      first = num;
    } else if (second === null || num > second) {
      // num 比次大的大，但比最大的小
      third = second;
      second = num;
    } else if (third === null || num > third) {
      // num 只比第三大的大
      third = num;
    }
  }
  
  // 如果第三大不存在，返回最大值
  return third !== null ? third : first;
}
```

**复杂度分析**：
- 时间复杂度：O(n)
- 空间复杂度：O(1)

---

## 执行过程可视化

让我们用 `[2, 2, 3, 1]` 走一遍：

```
初始状态：first=null, second=null, third=null

处理 num=2：
  2 不是重复值
  first=null，所以 2 > first
  更新：first=2, second=null, third=null

处理 num=2：
  2 === first，跳过（去重）

处理 num=3：
  3 不是重复值
  3 > first(2)
  级联更新：third=null, second=2, first=3

处理 num=1：
  1 不是重复值
  1 < first(3)，1 < second(2)
  1 > third(null) 或 third=null
  更新：third=1

最终状态：first=3, second=2, third=1
输出：1
```

---

## 关键细节解析

### 为什么更新顺序是从大到小？

观察这段代码：

```javascript
if (num > first) {
  third = second;
  second = first;
  first = num;
}
```

**必须先更新 third，再更新 second，最后更新 first。**

如果顺序反了：

```javascript
// ❌ 错误顺序
first = num;
second = first;  // first 已经被覆盖了！
third = second;
```

这样会导致所有变量都变成 `num`。

### 为什么要先检查重复？

```javascript
if (num === first || num === second || num === third) {
  continue;
}
```

如果不检查，重复值会被放入多个位置：

```javascript
// 假设 first=3, second=null, third=null
// 再次遇到 3
// 如果不跳过，3 会进入 second
```

---

## 边界情况

- **只有一个不同数**：如 `[1, 1, 1]`，返回 1（最大值）
- **只有两个不同数**：如 `[1, 2]`，返回 2（最大值）
- **包含负数**：如 `[-1, -2, -3]`，返回 -3（第三大）
- **包含 0**：0 是有效数字，正常处理

---

## 拓展思考

### 推广到 Top-K

这道题是 K=3 的特例。如果 K 更大怎么办？

- **K 很小**（如 3、5）：用多个变量维护
- **K 较大**：用**最小堆**，维护大小为 K 的堆
- **通用解法**：快速选择算法（QuickSelect）

这些都是后面"堆"章节会深入探讨的内容。

### 相关题目

- **LeetCode 215**：数组中的第 K 个最大元素
- **LeetCode 703**：数据流中的第 K 大元素

---

## 本章小结

这道题的核心思想是：**维护有限的状态变量**。

找第三大不需要完整排序，只需要维护三个变量。

关键技巧：
1. 用 `null` 表示"未设置"，避免和有效值冲突
2. 级联更新时注意顺序：从小到大赋值
3. 先检查重复再更新，实现去重

这种"只维护需要的信息"的思维方式，在算法优化中非常重要。
