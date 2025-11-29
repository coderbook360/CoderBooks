# 实战：用栈实现队列

栈是LIFO（后进先出），队列是FIFO（先进先出），它们的特性完全相反。那么，能否用栈来模拟队列的行为呢？这道题就是要解决这个问题。

## 问题描述

请你仅使用两个栈实现先入先出队列。队列应当支持一般队列支持的所有操作：

- `push(x)` —— 将元素x推到队列末尾
- `pop()` —— 从队列开头移除并返回元素
- `peek()` —— 返回队列开头的元素
- `empty()` —— 如果队列为空，返回true；否则返回false

**说明**：
- 只能使用标准的栈操作（push to top, pop from top, peek, isEmpty）
- 假设所有操作都是有效的

## 思路分析

### 核心矛盾

栈：最后进入的元素最先出来
队列：最先进入的元素最先出来

如果我们把`[1, 2, 3]`依次放入栈，栈顶是3。但队列应该先出1。

### 关键洞察：两次颠倒等于原序

如果把一个栈的元素全部倒入另一个栈，顺序会**反转**：

```
栈A: [1, 2, 3]（3在顶）
    ↓ 全部倒入
栈B: [3, 2, 1]（1在顶）
```

这样栈B的出栈顺序就是`1, 2, 3`——正是队列的出队顺序！

### 双栈策略

使用两个栈：
- **输入栈（stackIn）**：负责push操作
- **输出栈（stackOut）**：负责pop和peek操作

**规则**：
1. push时，直接放入输入栈
2. pop/peek时，从输出栈取
3. 如果输出栈为空，把输入栈全部倒入输出栈

## 完整实现

```javascript
class MyQueue {
    constructor() {
        this.stackIn = [];   // 输入栈
        this.stackOut = [];  // 输出栈
    }
    
    /**
     * 入队：直接放入输入栈
     * @param {number} x
     */
    push(x) {
        this.stackIn.push(x);
    }
    
    /**
     * 出队：从输出栈取
     * @return {number}
     */
    pop() {
        this.transfer();  // 确保输出栈有元素
        return this.stackOut.pop();
    }
    
    /**
     * 查看队头
     * @return {number}
     */
    peek() {
        this.transfer();  // 确保输出栈有元素
        return this.stackOut[this.stackOut.length - 1];
    }
    
    /**
     * 判断队列是否为空
     * @return {boolean}
     */
    empty() {
        return this.stackIn.length === 0 && this.stackOut.length === 0;
    }
    
    /**
     * 转移：当输出栈为空时，把输入栈全部倒入
     */
    transfer() {
        if (this.stackOut.length === 0) {
            while (this.stackIn.length > 0) {
                this.stackOut.push(this.stackIn.pop());
            }
        }
    }
}
```

## 执行过程图解

以操作序列`push(1), push(2), peek(), pop(), push(3), pop()`为例：

**push(1)**：
```
stackIn:  [1]
stackOut: []
```

**push(2)**：
```
stackIn:  [1, 2]
stackOut: []
```

**peek()**：
输出栈为空，触发转移：
```
转移中:
stackIn:  [1, 2] → [] 
stackOut: [] → [2, 1]

转移后:
stackIn:  []
stackOut: [2, 1]（1在栈顶）

peek返回: 1
```

**pop()**：
输出栈不为空，直接pop：
```
stackIn:  []
stackOut: [2, 1] → [2]

pop返回: 1
```

**push(3)**：
```
stackIn:  [3]
stackOut: [2]
```

**pop()**：
输出栈不为空，直接pop：
```
stackIn:  [3]
stackOut: [2] → []

pop返回: 2
```

**再次pop()会触发转移**：
```
转移后:
stackIn:  []
stackOut: [3]

pop返回: 3
```

## 为什么输出栈不为空时不转移？

这是一个关键设计。考虑以下场景：

```
stackIn:  [3, 4]
stackOut: [2, 1]（队列顺序是1, 2, 3, 4）
```

如果现在把stackIn倒入stackOut：
```
stackOut变成: [2, 1, 4, 3]
```

出栈顺序会变成`3, 4, 1, 2`——顺序乱了！

正确做法：先把stackOut用完（1, 2出队），再转移（3, 4倒入）。

## 复杂度分析

**时间复杂度**：
- push：O(1)
- pop：均摊O(1)
- peek：均摊O(1)
- empty：O(1)

**为什么pop是"均摊O(1)"？**

单次pop可能触发O(n)的转移操作。但每个元素最多被转移一次：入栈一次（到stackIn），转移一次（到stackOut），出栈一次（从stackOut）。

n次操作的总时间是O(n)，均摊到每次操作就是O(1)。

**空间复杂度**：O(n)
- 两个栈共同存储n个元素

## 变体：每次pop都转移

一种更简单但效率较低的实现：

```javascript
class MyQueueSimple {
    constructor() {
        this.stack1 = [];
        this.stack2 = [];
    }
    
    push(x) {
        // 把stack1全部倒入stack2
        while (this.stack1.length) {
            this.stack2.push(this.stack1.pop());
        }
        // 新元素放入stack1底部
        this.stack1.push(x);
        // 把stack2倒回stack1
        while (this.stack2.length) {
            this.stack1.push(this.stack2.pop());
        }
    }
    
    pop() {
        return this.stack1.pop();
    }
    
    peek() {
        return this.stack1[this.stack1.length - 1];
    }
    
    empty() {
        return this.stack1.length === 0;
    }
}
```

这种方法push是O(n)，pop是O(1)。如果pop操作远多于push，这种实现反而更慢。

**最优解**（本文的双栈方法）在各种操作分布下都表现良好。

## 边界情况

| 操作序列 | 结果 |
|---------|------|
| `push(1), pop()` | 返回1，队列为空 |
| `push(1), push(2), pop(), pop()` | 依次返回1, 2 |
| `empty()`（空队列） | 返回true |
| 连续多次`push`后连续多次`pop` | 正常的FIFO顺序 |

## 实际应用

这种双栈实现队列的技巧在实际中并不常用（直接用队列更简单），但它的价值在于：

1. **理解数据结构的本质**：通过组合基础结构实现新功能
2. **均摊分析的典型案例**：单次操作可能慢，但平均很快
3. **面试高频题**：考察对栈和队列的理解

## 小结

用两个栈实现队列的核心思想：

1. **分工明确**：输入栈负责push，输出栈负责pop
2. **按需转移**：只有输出栈空了才转移
3. **顺序反转**：两次反转恢复原序

**记忆口诀**：入输入，出输出，空了才倒，不空不动。

这道题的精髓在于理解：**两次LIFO等于FIFO**。掌握这个思想，下一题"用队列实现栈"就迎刃而解了。
