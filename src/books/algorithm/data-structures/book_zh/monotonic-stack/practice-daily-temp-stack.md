# 实战：每日温度（单调栈解法）

这道题在"栈与队列"部分已经详细讲解过，这里作为单调栈专题的复习，重点强调单调栈的核心模式。

---

## 问题描述

**LeetCode 739. Daily Temperatures**

给定每日温度数组，返回每天需要等几天才能等到更高温度。如果不存在更高温度，返回 0。

**示例**：
```
输入：[73,74,75,71,69,72,76,73]
输出：[1,1,4,2,1,1,0,0]
```

---

## 单调栈解法

```javascript
function dailyTemperatures(temperatures) {
  const n = temperatures.length;
  const answer = new Array(n).fill(0);
  const stack = [];  // 单调递减栈，存索引
  
  for (let i = 0; i < n; i++) {
    while (stack.length > 0 && temperatures[i] > temperatures[stack[stack.length - 1]]) {
      const prevIndex = stack.pop();
      answer[prevIndex] = i - prevIndex;  // 计算天数差
    }
    stack.push(i);
  }
  
  return answer;
}
```

---

## 为什么存索引？

因为我们需要计算**天数差**，也就是位置的差距。如果只存温度值，就无法知道它是第几天的。

---

## 单调栈核心模式

```javascript
for (let i = 0; i < n; i++) {
  // 1. 弹出所有"不如当前"的元素
  while (stack.length > 0 && 当前元素更优) {
    const idx = stack.pop();
    // 被弹出的元素找到了答案
    result[idx] = 计算结果;
  }
  // 2. 当前元素入栈
  stack.push(i);
}
```

这是单调栈的标准模板，后续的很多题目都是这个模式的变体。

---

## 复杂度

- 时间：O(n)
- 空间：O(n)
