# 实战：用队列实现栈

上一题我们用栈实现了队列，这一题反过来：用队列实现栈。同样是颠倒数据结构的特性，但解决方案有所不同。

## 问题描述

请你仅使用队列实现一个后入先出（LIFO）的栈。实现的栈应该支持所有标准操作：

- `push(x)` —— 将元素x压入栈顶
- `pop()` —— 移除并返回栈顶元素
- `top()` —— 返回栈顶元素
- `empty()` —— 如果栈为空，返回true；否则返回false

**说明**：
- 只能使用队列的标准操作（push to back, pop from front, peek front, isEmpty）

## 思路分析

### 回顾：队列的特性

队列是FIFO（先进先出）：
- 入队在队尾
- 出队从队头

而栈需要LIFO（后进先出）：最后加入的元素要最先出来。

### 方法一：两个队列

类似上一题的思路，但操作方式不同：

- **push时**：先把新元素放入空队列，再把另一个队列的元素全部转移过来
- **pop时**：直接从非空队列出队

这样保证队头始终是最后入栈的元素。

```javascript
class MyStackTwoQueues {
    constructor() {
        this.queue1 = [];
        this.queue2 = [];
    }
    
    push(x) {
        // 新元素放入queue2
        this.queue2.push(x);
        // 把queue1的元素全部转移到queue2后面
        while (this.queue1.length) {
            this.queue2.push(this.queue1.shift());
        }
        // 交换queue1和queue2
        [this.queue1, this.queue2] = [this.queue2, this.queue1];
    }
    
    pop() {
        return this.queue1.shift();
    }
    
    top() {
        return this.queue1[0];
    }
    
    empty() {
        return this.queue1.length === 0;
    }
}
```

**执行过程**（push 1, 2, 3）：
```
push(1):
  queue2: [1]
  交换后 queue1: [1]

push(2):
  queue2: [2]
  转移: queue2: [2, 1]
  交换后 queue1: [2, 1]

push(3):
  queue2: [3]
  转移: queue2: [3, 2, 1]
  交换后 queue1: [3, 2, 1]

pop() → 返回3
pop() → 返回2
pop() → 返回1
```

### 方法二：一个队列（推荐）

更优雅的方法：每次push后，把队列前面的元素移到后面，让新元素到达队头。

```
push(1): [1]
push(2): [2, 1] ← 把1移到2后面
push(3): [3, 2, 1] ← 把2和1依次移到3后面
```

## 完整实现（一个队列）

```javascript
class MyStack {
    constructor() {
        this.queue = [];
    }
    
    /**
     * 入栈：放入队尾后，把前面的元素都移到后面
     * @param {number} x
     */
    push(x) {
        this.queue.push(x);
        
        // 把x前面的元素都移到x后面
        const size = this.queue.length;
        for (let i = 0; i < size - 1; i++) {
            this.queue.push(this.queue.shift());
        }
    }
    
    /**
     * 出栈：直接出队
     * @return {number}
     */
    pop() {
        return this.queue.shift();
    }
    
    /**
     * 查看栈顶
     * @return {number}
     */
    top() {
        return this.queue[0];
    }
    
    /**
     * 判断栈是否为空
     * @return {boolean}
     */
    empty() {
        return this.queue.length === 0;
    }
}
```

## 执行过程图解

以操作序列`push(1), push(2), push(3), pop(), top()`为例：

**push(1)**：
```
queue: [1]
只有一个元素，不需要移动
```

**push(2)**：
```
queue: [1, 2]（2入队）
移动1次: [2, 1]（1移到后面）
```

**push(3)**：
```
queue: [2, 1, 3]（3入队）
第1次移动: [1, 3, 2]（2移到后面）
第2次移动: [3, 2, 1]（1移到后面）

最终: [3, 2, 1]
队头3是最后入栈的，符合LIFO
```

**pop()**：
```
queue: [3, 2, 1]
shift() → 返回3
queue: [2, 1]
```

**top()**：
```
queue: [2, 1]
返回队头: 2
```

## 为什么这样能实现栈？

关键在于push操作后的"旋转"：

```
入栈顺序: 1, 2, 3
队列状态变化:
  push(1): [1]
  push(2): [2, 1]  ← 2在队头
  push(3): [3, 2, 1] ← 3在队头

出栈时从队头取:
  pop(): 3 (最后入栈的)
  pop(): 2
  pop(): 1 (最先入栈的)
```

**每次push后旋转，保证最新元素始终在队头**——这就是LIFO。

## 两种方法对比

| 方法 | push复杂度 | pop复杂度 | 空间复杂度 |
|------|-----------|-----------|-----------|
| 两个队列 | O(n) | O(1) | O(n) |
| 一个队列 | O(n) | O(1) | O(n) |

两种方法时间复杂度相同，但一个队列的实现更简洁，空间使用也更少。

## 与"栈实现队列"的对比

| 题目 | 策略 | push | pop |
|------|------|------|-----|
| 栈实现队列 | 双栈，按需转移 | O(1) | 均摊O(1) |
| 队列实现栈 | 单队列，旋转 | O(n) | O(1) |

**为什么差异这么大？**

- 栈的push和pop都在同一端，可以巧妙利用两个栈的"反转"特性
- 队列的两端不同，必须通过旋转来维护顺序，每次push都要动

## 边界情况

| 操作 | 结果 |
|------|------|
| `push(1), pop()` | 返回1，栈为空 |
| `push(1), push(2), top()` | 返回2（栈顶） |
| `empty()`（空栈） | 返回true |
| 连续push后连续pop | LIFO顺序 |

## 复杂度分析

**时间复杂度**：
- push：O(n)，需要旋转n-1个元素
- pop：O(1)，直接出队
- top：O(1)，查看队头
- empty：O(1)

**空间复杂度**：O(n)
- 只用了一个队列存储n个元素

## 思考：能否优化push？

如果我们在pop时旋转而不是push时旋转：

```javascript
// 反过来的实现
push(x) {
    this.queue.push(x);  // O(1)
}

pop() {
    const size = this.queue.length;
    // 把前n-1个元素移到后面
    for (let i = 0; i < size - 1; i++) {
        this.queue.push(this.queue.shift());
    }
    return this.queue.shift();  // O(n)
}
```

这样push是O(1)，pop是O(n)。如果push操作远多于pop，这种实现更好。

**选择策略**：根据实际使用场景中push和pop的频率比例来选择。

## 小结

用队列实现栈的核心思想：

1. **旋转队列**：每次push后把旧元素移到后面
2. **保持顺序**：队头始终是最新入栈的元素
3. **简化pop**：出栈时直接从队头取

**记忆口诀**：入队后旋转，新的到队头。

对比两道题：
- **栈实现队列**：利用双栈反转特性，均摊O(1)
- **队列实现栈**：必须旋转维护顺序，push或pop至少有一个是O(n)

下一题，我们来设计一个特殊的栈——能在O(1)时间内获取最小值的"最小栈"。
