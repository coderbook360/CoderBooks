# 实战：用栈实现队列

栈是后进先出（LIFO），队列是先进先出（FIFO）。

这两种数据结构看起来特性完全相反，那么问题来了：能不能用栈来模拟队列的行为？

答案是可以的。而且方法相当巧妙——用两个栈！

---

## 问题描述

**LeetCode 232. Implement Queue using Stacks**

请你仅使用两个栈实现先入先出队列。队列应当支持一般队列支持的所有操作：

- `push(x)`：将元素 x 推到队列的末尾
- `pop()`：从队列的开头移除并返回元素
- `peek()`：返回队列开头的元素
- `empty()`：如果队列为空，返回 true

**说明**：只能使用标准的栈操作（push to top, peek/pop from top, size, is empty）。

---

## 问题分析

首先要问一个问题：为什么一个栈不行？

假设我们依次入栈 1, 2, 3：

```
栈状态：[1, 2, 3]（3 在栈顶）
```

如果要模拟队列的出队，应该弹出 1（先入先出）。但栈只能弹出栈顶的 3！

现在问第二个问题：如果把栈里的元素全部弹出，再压入另一个栈，会发生什么？

```
栈 A：[1, 2, 3]（3 在栈顶）
弹出顺序：3, 2, 1

全部压入栈 B：
栈 B：[3, 2, 1]（1 在栈顶）
```

有没有发现？现在栈 B 的栈顶是 1，正好是最先入队的元素！

**关键洞察**：两次 LIFO = FIFO。

---

## 解法：双栈法

设计两个栈：
- `stackIn`：负责入队操作
- `stackOut`：负责出队操作

```javascript
class MyQueue {
  constructor() {
    this.stackIn = [];   // 入队栈
    this.stackOut = [];  // 出队栈
  }
  
  // 入队：直接压入 stackIn
  push(x) {
    this.stackIn.push(x);
  }
  
  // 出队：从 stackOut 弹出
  pop() {
    this._transfer();
    return this.stackOut.pop();
  }
  
  // 查看队头
  peek() {
    this._transfer();
    return this.stackOut[this.stackOut.length - 1];
  }
  
  // 判空
  empty() {
    return this.stackIn.length === 0 && this.stackOut.length === 0;
  }
  
  // 辅助方法：在 stackOut 为空时，将 stackIn 全部转移到 stackOut
  _transfer() {
    if (this.stackOut.length === 0) {
      while (this.stackIn.length > 0) {
        this.stackOut.push(this.stackIn.pop());
      }
    }
  }
}
```

---

## 执行过程可视化

操作序列：`push(1), push(2), pop(), push(3), pop()`

```
初始状态：
stackIn:  []
stackOut: []

push(1):
stackIn:  [1]
stackOut: []

push(2):
stackIn:  [1, 2]
stackOut: []

pop()：
  stackOut 为空，触发转移！
  stackIn 弹出 2 → stackOut 压入 2
  stackIn 弹出 1 → stackOut 压入 1
  
  stackIn:  []
  stackOut: [2, 1]  (1 在栈顶)
  
  弹出 stackOut 栈顶 → 返回 1

push(3):
stackIn:  [3]
stackOut: [2]

pop()：
  stackOut 不为空，无需转移
  弹出 stackOut 栈顶 → 返回 2

最终状态：
stackIn:  [3]
stackOut: []
```

---

## 关键细节：懒惰转移

注意我们的转移策略：**只在 stackOut 为空时才转移**。

为什么不每次 pop 都转移？

```javascript
// ❌ 低效做法：每次 pop 都转移
pop() {
  while (this.stackIn.length > 0) {
    this.stackOut.push(this.stackIn.pop());
  }
  const result = this.stackOut.pop();
  while (this.stackOut.length > 0) {
    this.stackIn.push(this.stackOut.pop());
  }
  return result;
}
// 每次 pop 都是 O(n)！
```

```javascript
// ✅ 高效做法：只在 stackOut 为空时转移
pop() {
  if (this.stackOut.length === 0) {
    while (this.stackIn.length > 0) {
      this.stackOut.push(this.stackIn.pop());
    }
  }
  return this.stackOut.pop();
}
// 均摊 O(1)！
```

懒惰转移的好处：每个元素最多被转移一次，均摊下来每次操作都是 O(1)。

---

## 复杂度分析

| 操作 | 时间复杂度 |
|-----|-----------|
| push | O(1) |
| pop | 均摊 O(1) |
| peek | 均摊 O(1) |
| empty | O(1) |

**为什么是均摊 O(1)？**

每个元素的生命周期：
1. 压入 `stackIn`：1 次
2. 弹出 `stackIn`：1 次
3. 压入 `stackOut`：1 次
4. 弹出 `stackOut`：1 次

总共 4 次操作。对于 n 个元素，总操作次数不超过 4n，均摊到每个元素就是 O(1)。

空间复杂度：O(n)，两个栈加起来存储 n 个元素。

---

## 边界情况

- **空队列 pop**：根据题目约定，保证操作合法
- **连续 push**：全部进入 stackIn
- **连续 pop**：第一次转移后，后续直接从 stackOut 弹出

---

## 常见错误

**错误1：每次都转移**

```javascript
// ❌ 每次 pop 都把两个栈来回倒腾
pop() {
  // 先倒到 stackOut
  // 弹出
  // 再倒回 stackIn
  // 效率极低！
}
```

**错误2：判空只检查一个栈**

```javascript
// ❌ 只检查 stackIn
empty() {
  return this.stackIn.length === 0;  // stackOut 可能还有元素！
}

// ✅ 两个都要检查
empty() {
  return this.stackIn.length === 0 && this.stackOut.length === 0;
}
```

---

## 技巧总结

双栈实现队列的核心思想：

- **两次逆序 = 正序**：LIFO + LIFO = FIFO
- **分工明确**：一个栈负责入，一个栈负责出
- **懒惰转移**：只在必要时才转移，保证均摊 O(1)

这种设计思想在很多场景都有应用，比如浏览器的前进后退、撤销重做等功能。

---

## 关联题目

- **LeetCode 225**：用队列实现栈
- **LeetCode 155**：最小栈
