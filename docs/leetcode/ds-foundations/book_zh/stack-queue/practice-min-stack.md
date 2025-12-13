# 实战：最小栈

设计一个栈，能在 O(1) 时间内获取最小值。

## 题目描述

> **LeetCode 155. 最小栈**
>
> 设计一个支持 push，pop，top 操作，并能在**常数时间**内检索到最小元素的栈。
>
> - `push(val)` 将元素 val 推入堆栈
> - `pop()` 删除堆栈顶部的元素
> - `top()` 获取堆栈顶部的元素
> - `getMin()` 获取堆栈中的最小元素

**要求**：所有操作的时间复杂度必须是 O(1)。

## 问题分析

普通栈获取最小值需要 O(n) 遍历。如何做到 O(1)？

核心思想：用**辅助栈**同步记录当前的最小值。

## 解法：辅助栈

```javascript
class MinStack {
    constructor() {
        this.dataStack = [];
        this.minStack = [];  // minStack[i] 表示 dataStack[0..i] 的最小值
    }
    
    push(val) {
        this.dataStack.push(val);
        // 计算新的最小值
        const min = this.minStack.length === 0 
            ? val 
            : Math.min(val, this.minStack[this.minStack.length - 1]);
        this.minStack.push(min);
    }
    
    pop() {
        this.dataStack.pop();
        this.minStack.pop();
    }
    
    top() {
        return this.dataStack[this.dataStack.length - 1];
    }
    
    getMin() {
        return this.minStack[this.minStack.length - 1];
    }
}
```

### 执行过程

```
操作序列：push(-2), push(0), push(-3), getMin(), pop(), top(), getMin()

push(-2):
dataStack: [-2]
minStack:  [-2]

push(0):
dataStack: [-2, 0]
minStack:  [-2, -2]  // min(-2, 0) = -2

push(-3):
dataStack: [-2, 0, -3]
minStack:  [-2, -2, -3]  // min(-2, -3) = -3

getMin() → -3

pop():
dataStack: [-2, 0]
minStack:  [-2, -2]

top() → 0
getMin() → -2
```

### 为什么两个栈同步操作？

当元素出栈时，对应的最小值也要出栈。

比如 [-2, 0, -3] 弹出 -3 后：
- 如果 minStack 不同步弹出，getMin() 还是返回 -3，错了
- 同步弹出后，minStack 顶是 -2，正确

## 优化：空间节省版

只在新最小值出现时才入 minStack：

```javascript
class MinStack {
    constructor() {
        this.dataStack = [];
        this.minStack = [];
    }
    
    push(val) {
        this.dataStack.push(val);
        // 只有小于等于当前最小值才入栈
        if (this.minStack.length === 0 || val <= this.minStack[this.minStack.length - 1]) {
            this.minStack.push(val);
        }
    }
    
    pop() {
        const val = this.dataStack.pop();
        // 如果弹出的是当前最小值，minStack 也弹出
        if (val === this.minStack[this.minStack.length - 1]) {
            this.minStack.pop();
        }
    }
    
    top() {
        return this.dataStack[this.dataStack.length - 1];
    }
    
    getMin() {
        return this.minStack[this.minStack.length - 1];
    }
}
```

注意：这里用 `<=` 而不是 `<`，是为了处理重复最小值的情况。

## 复杂度

- **时间**：所有操作 O(1)
- **空间**：O(n)，需要额外的辅助栈

## 本章小结

最小栈展示了**辅助栈**的设计模式：

1. **数据栈**：正常存储元素
2. **辅助栈**：同步记录额外信息（这里是最小值）
3. **同步操作**：push/pop 时两个栈同步

这种"空间换时间"的思想很常见，类似的还有"最大栈"等变体。
