# 单调栈原理与模板

在前面的"每日温度"和"下一个更大元素"题目中，我们已经初步接触了单调栈。现在让我们系统地学习这个强大的数据结构。

单调栈的核心能力是什么？它能在 O(n) 时间内，找出数组中每个元素的**下一个更大元素**或**下一个更小元素**。

---

## 什么是单调栈

单调栈是一种特殊的栈，它的特点是：**栈内元素始终保持单调递增或单调递减**。

普通栈对入栈元素没有限制，而单调栈在入栈前，会先弹出所有破坏单调性的元素。正是这个"弹出"的过程，让我们能够高效地解决问题。

---

## 单调递减栈 vs 单调递增栈

根据栈内元素的顺序，单调栈分为两种：

**单调递减栈**（从栈底到栈顶递减）：
- 栈底元素最大，栈顶元素最小
- 入栈时，弹出所有**比当前元素小**的元素
- 用于找**下一个更大元素**

**单调递增栈**（从栈底到栈顶递增）：
- 栈底元素最小，栈顶元素最大
- 入栈时，弹出所有**比当前元素大**的元素
- 用于找**下一个更小元素**

---

## 模板一：找下一个更大元素

以数组 `[2, 1, 5, 6, 2, 3]` 为例：

```javascript
function nextGreaterElements(nums) {
  const n = nums.length;
  const result = new Array(n).fill(-1);  // 默认 -1 表示不存在
  const stack = [];  // 单调递减栈，存储索引
  
  for (let i = 0; i < n; i++) {
    // 当前元素比栈顶大，栈顶找到了答案
    while (stack.length > 0 && nums[i] > nums[stack[stack.length - 1]]) {
      const index = stack.pop();
      result[index] = nums[i];
    }
    stack.push(i);
  }
  
  return result;
}
```

### 执行过程

```
nums = [2, 1, 5, 6, 2, 3]
索引     0  1  2  3  4  5

i=0, num=2:
  栈空，入栈
  stack = [0]

i=1, num=1:
  1 < 2，不弹出，入栈
  stack = [0, 1]

i=2, num=5:
  5 > 1（栈顶索引1对应的值），弹出1，result[1] = 5
  5 > 2（栈顶索引0对应的值），弹出0，result[0] = 5
  栈空，入栈
  stack = [2]
  result = [5, 5, -1, -1, -1, -1]

i=3, num=6:
  6 > 5，弹出2，result[2] = 6
  栈空，入栈
  stack = [3]
  result = [5, 5, 6, -1, -1, -1]

i=4, num=2:
  2 < 6，不弹出，入栈
  stack = [3, 4]

i=5, num=3:
  3 > 2，弹出4，result[4] = 3
  3 < 6，不弹出，入栈
  stack = [3, 5]
  result = [5, 5, 6, -1, 3, -1]

遍历结束，栈中剩余的元素没有更大的

最终结果：[5, 5, 6, -1, 3, -1]
```

---

## 模板二：找下一个更小元素

只需要改变比较方向：

```javascript
function nextSmallerElements(nums) {
  const n = nums.length;
  const result = new Array(n).fill(-1);
  const stack = [];  // 单调递增栈，存储索引
  
  for (let i = 0; i < n; i++) {
    // 当前元素比栈顶小，栈顶找到了答案
    while (stack.length > 0 && nums[i] < nums[stack[stack.length - 1]]) {
      const index = stack.pop();
      result[index] = nums[i];
    }
    stack.push(i);
  }
  
  return result;
}
```

---

## 为什么是 O(n) 时间复杂度

虽然代码中有嵌套循环，但时间复杂度仍然是 O(n)。

分析：每个元素**最多入栈一次、出栈一次**。

- 外层循环执行 n 次
- 内层 while 循环**总共**执行不超过 n 次（因为每个元素只能被弹出一次）
- 总操作次数 <= 2n，所以是 O(n)

这种分析方法叫做**均摊分析**。

---

## 变体：找上一个更大/更小元素

如果要找**上一个**更大元素，有两种方法：

**方法一：逆序遍历**

```javascript
function prevGreaterElements(nums) {
  const n = nums.length;
  const result = new Array(n).fill(-1);
  const stack = [];
  
  // 从右往左遍历
  for (let i = n - 1; i >= 0; i--) {
    while (stack.length > 0 && nums[i] > nums[stack[stack.length - 1]]) {
      const index = stack.pop();
      result[index] = nums[i];
    }
    stack.push(i);
  }
  
  return result;
}
```

**方法二：在弹出时记录栈顶**

```javascript
function prevGreaterElements(nums) {
  const n = nums.length;
  const result = new Array(n).fill(-1);
  const stack = [];
  
  for (let i = 0; i < n; i++) {
    while (stack.length > 0 && nums[i] >= nums[stack[stack.length - 1]]) {
      stack.pop();
    }
    // 栈顶就是当前元素的上一个更大元素
    if (stack.length > 0) {
      result[i] = nums[stack[stack.length - 1]];
    }
    stack.push(i);
  }
  
  return result;
}
```

---

## 变体：环形数组

如果数组是环形的（首尾相连），可以将数组"展开"成两倍长度遍历：

```javascript
function nextGreaterElementsCircular(nums) {
  const n = nums.length;
  const result = new Array(n).fill(-1);
  const stack = [];
  
  // 遍历两遍
  for (let i = 0; i < 2 * n; i++) {
    const index = i % n;
    while (stack.length > 0 && nums[index] > nums[stack[stack.length - 1]]) {
      result[stack.pop()] = nums[index];
    }
    if (i < n) {
      stack.push(i);  // 只在第一遍入栈
    }
  }
  
  return result;
}
```

---

## 单调栈解题套路总结

| 问题类型 | 栈类型 | 比较条件 | 弹出含义 |
|---------|--------|---------|---------|
| 下一个更大 | 单调递减栈 | nums[i] > 栈顶 | 栈顶找到答案 |
| 下一个更小 | 单调递增栈 | nums[i] < 栈顶 | 栈顶找到答案 |
| 上一个更大 | 单调递减栈 | 栈顶为答案 | 入栈前查看栈顶 |
| 上一个更小 | 单调递增栈 | 栈顶为答案 | 入栈前查看栈顶 |

---

## 技巧总结

单调栈的核心思想：

- **维护候选集**：栈中存储的是"还没找到答案"的元素
- **弹出即确定**：当新元素打破单调性时，被弹出的元素找到了答案
- **栈中存索引**：需要计算距离或定位时存索引
- **时间 O(n)**：每个元素最多入栈出栈各一次

在接下来的章节中，我们将用单调栈解决一系列经典问题：柱状图最大矩形、接雨水、移掉 K 位数字等。
