# 实战：用队列实现栈

上一章我们用两个栈实现了队列，这一章反过来——用队列实现栈。

队列是先进先出（FIFO），栈是后进先出（LIFO）。如何让先进去的元素后出来？

有趣的是，这道题有两种思路，而且各有取舍。

---

## 问题描述

**LeetCode 225. Implement Stack using Queues**

请你仅使用两个队列实现一个后入先出（LIFO）的栈，并支持普通栈的全部四种操作：

- `push(x)`：元素 x 入栈
- `pop()`：移除并返回栈顶元素
- `top()`：返回栈顶元素
- `empty()`：如果栈是空的，返回 true

**进阶**：你能否仅用一个队列来实现栈？

---

## 问题分析

首先思考一下：为什么用队列模拟栈比用栈模拟队列更麻烦？

关键在于：栈需要访问**最后进入**的元素，但队列只能访问**最先进入**的元素。

用栈模拟队列时，我们可以把元素倒腾一次，最先进入的就到了栈顶。但用队列模拟栈时，我们需要让最后进入的元素到达队头，这需要把前面的元素全部移到后面去！

---

## 解法一：两个队列

**思路**：
- 保持一个队列为空，另一个存储元素
- push：直接入队
- pop：将 n-1 个元素移到另一个队列，最后一个就是栈顶

```javascript
class MyStack {
  constructor() {
    this.q1 = [];
    this.q2 = [];
  }
  
  push(x) {
    this.q1.push(x);
  }
  
  pop() {
    // 将 q1 的前 n-1 个元素移到 q2
    while (this.q1.length > 1) {
      this.q2.push(this.q1.shift());
    }
    // 最后一个就是栈顶
    const top = this.q1.shift();
    // 交换 q1 和 q2
    [this.q1, this.q2] = [this.q2, this.q1];
    return top;
  }
  
  top() {
    while (this.q1.length > 1) {
      this.q2.push(this.q1.shift());
    }
    const top = this.q1.shift();
    this.q2.push(top);  // 放回去，因为只是查看
    [this.q1, this.q2] = [this.q2, this.q1];
    return top;
  }
  
  empty() {
    return this.q1.length === 0;
  }
}
```

### 执行过程

操作序列：`push(1), push(2), push(3), pop()`

```
push(1): q1 = [1], q2 = []
push(2): q1 = [1, 2], q2 = []
push(3): q1 = [1, 2, 3], q2 = []

pop():
  将 1 移到 q2 → q1 = [2, 3], q2 = [1]
  将 2 移到 q2 → q1 = [3], q2 = [1, 2]
  弹出 3 → q1 = [], q2 = [1, 2]
  交换 → q1 = [1, 2], q2 = []
  返回 3
```

**复杂度**：push O(1)，pop O(n)，top O(n)

---

## 解法二：一个队列（推荐）

**思路更巧妙**：push 时，先入队新元素，然后将前面所有元素出队再入队，这样新元素就到了队头！

```javascript
class MyStack {
  constructor() {
    this.queue = [];
  }
  
  push(x) {
    this.queue.push(x);
    // 将前面所有元素移到后面
    const n = this.queue.length;
    for (let i = 0; i < n - 1; i++) {
      this.queue.push(this.queue.shift());
    }
  }
  
  pop() {
    return this.queue.shift();
  }
  
  top() {
    return this.queue[0];
  }
  
  empty() {
    return this.queue.length === 0;
  }
}
```

### 执行过程

操作序列：`push(1), push(2), push(3)`

```
push(1):
  入队 1 → queue = [1]
  无需旋转（只有一个元素）

push(2):
  入队 2 → queue = [1, 2]
  旋转 1 次：出队 1，入队 1 → queue = [2, 1]
  
push(3):
  入队 3 → queue = [2, 1, 3]
  旋转 2 次：
    出队 2，入队 2 → queue = [1, 3, 2]
    出队 1，入队 1 → queue = [3, 2, 1]

最终 queue = [3, 2, 1]
队头 3 就是栈顶！

pop() → 3
pop() → 2
pop() → 1
```

**复杂度**：push O(n)，pop O(1)，top O(1)

---

## 两种方法对比

| 操作 | 两个队列 | 一个队列 |
|-----|---------|---------|
| push | O(1) | O(n) |
| pop | O(n) | O(1) |
| top | O(n) | O(1) |
| 空间 | O(n) | O(n) |

**如何选择？**

- 如果 push 操作多：选两个队列（push O(1)）
- 如果 pop/top 操作多：选一个队列（pop/top O(1)）

在实际场景中，一个队列的方案通常更简洁，代码也更少。

---

## 边界情况

- **空栈 pop**：根据题目约定，保证操作合法
- **单元素**：push 后不需要旋转
- **连续 push**：每次都需要旋转

---

## 常见错误

**错误1：旋转次数错误**

```javascript
// ❌ 旋转 n 次，等于没旋转
for (let i = 0; i < this.queue.length; i++) {
  this.queue.push(this.queue.shift());
}

// ✅ 旋转 n-1 次
const n = this.queue.length;
for (let i = 0; i < n - 1; i++) {
  this.queue.push(this.queue.shift());
}
```

**错误2：两队列方案忘记交换**

```javascript
// ❌ 忘记交换
pop() {
  while (this.q1.length > 1) {
    this.q2.push(this.q1.shift());
  }
  return this.q1.shift();
  // q1 现在是空的，下次操作会出问题！
}

// ✅ 要交换
pop() {
  while (this.q1.length > 1) {
    this.q2.push(this.q1.shift());
  }
  const top = this.q1.shift();
  [this.q1, this.q2] = [this.q2, this.q1];
  return top;
}
```

---

## 与上一章的对比

| 问题 | 解法 | 核心思想 |
|-----|-----|---------|
| 用栈实现队列 | 双栈 | 两次逆序 = 正序 |
| 用队列实现栈 | 单队列旋转 | 新元素移到队头 |

用栈实现队列更优雅，因为可以实现均摊 O(1)。用队列实现栈则总有一个操作是 O(n) 的。

---

## 技巧总结

- **一个队列方案**：push 时旋转，让新元素到队头
- **两个队列方案**：pop 时移动，找到最后一个元素
- **权衡取舍**：根据操作频率选择方案

这两道题（用栈实现队列、用队列实现栈）经常成对出现在面试中，理解它们的思想差异很重要。

---

## 关联题目

- **LeetCode 232**：用栈实现队列
- **LeetCode 155**：最小栈
