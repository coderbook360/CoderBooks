# 实战：最小栈

普通栈的push、pop、top都是O(1)，但如果我们想知道栈中的最小元素，就需要遍历整个栈，变成O(n)。能否设计一个栈，使得获取最小值也是O(1)？这就是最小栈问题。

## 问题描述

设计一个支持push、pop、top操作，并能在**常数时间**内检索到最小元素的栈。

实现`MinStack`类：
- `push(val)` —— 将元素val推入栈中
- `pop()` —— 删除栈顶的元素
- `top()` —— 获取栈顶元素
- `getMin()` —— 检索栈中的最小元素

**关键约束**：所有操作的时间复杂度都必须是O(1)。

## 思路分析

### 朴素想法：每次遍历

```javascript
// 每次getMin都遍历
getMin() {
    return Math.min(...this.items);  // O(n)
}
```

这不满足O(1)的要求。

### 问题的关键

难点在于：当pop操作移除当前最小值后，如何快速知道新的最小值？

例如：
```
栈: [3, 5, 2, 1]（1是最小值）
pop() → 移除1
现在最小值是2，但怎么快速知道？
```

如果只存一个`min`变量，pop掉最小值后就不知道次小值了。

### 核心洞察：同步维护最小值历史

**关键思想**：用一个辅助栈，同步记录每个状态下的最小值。

```
主栈:    [3, 5, 2, 1]
辅助栈:  [3, 3, 2, 1] ← 每个位置记录"到这里为止的最小值"
```

当主栈pop时，辅助栈也pop，最小值自然正确。

## 完整实现

```javascript
class MinStack {
    constructor() {
        this.stack = [];     // 主栈：存储实际元素
        this.minStack = [];  // 辅助栈：存储最小值历史
    }
    
    /**
     * 入栈：同时更新最小值栈
     * @param {number} val
     */
    push(val) {
        this.stack.push(val);
        
        // 计算新的最小值
        if (this.minStack.length === 0) {
            this.minStack.push(val);
        } else {
            const currentMin = this.minStack[this.minStack.length - 1];
            this.minStack.push(Math.min(val, currentMin));
        }
    }
    
    /**
     * 出栈：两个栈同步弹出
     */
    pop() {
        this.stack.pop();
        this.minStack.pop();
    }
    
    /**
     * 查看栈顶
     * @return {number}
     */
    top() {
        return this.stack[this.stack.length - 1];
    }
    
    /**
     * 获取最小值：直接返回辅助栈栈顶
     * @return {number}
     */
    getMin() {
        return this.minStack[this.minStack.length - 1];
    }
}
```

## 执行过程图解

以操作序列`push(-2), push(0), push(-3), getMin(), pop(), top(), getMin()`为例：

**push(-2)**：
```
stack:    [-2]
minStack: [-2] ← min(-2) = -2
```

**push(0)**：
```
stack:    [-2, 0]
minStack: [-2, -2] ← min(0, -2) = -2
```

**push(-3)**：
```
stack:    [-2, 0, -3]
minStack: [-2, -2, -3] ← min(-3, -2) = -3
```

**getMin()**：
```
返回 minStack栈顶 = -3 ✓
```

**pop()**：
```
stack:    [-2, 0]
minStack: [-2, -2]
```

**top()**：
```
返回 stack栈顶 = 0 ✓
```

**getMin()**：
```
返回 minStack栈顶 = -2 ✓
```

## 为什么这个方法有效？

**核心原理**：minStack[i]存储的是"当主栈有i+1个元素时的最小值"。

当主栈pop一个元素后，状态回退到之前，对应的最小值就是minStack的前一个值。

**状态对应关系**：
```
主栈状态:  [-2] → [-2, 0] → [-2, 0, -3] → [-2, 0] → [-2]
最小值:     -2  →    -2   →     -3      →   -2   →  -2
```

## 优化：减少辅助栈空间

如果连续push很多相同的最小值，辅助栈会有很多重复。可以只在最小值变化时才入栈：

```javascript
class MinStackOptimized {
    constructor() {
        this.stack = [];
        this.minStack = [];  // 只存储（值，计数）对
    }
    
    push(val) {
        this.stack.push(val);
        
        if (this.minStack.length === 0 || val < this.minStack[this.minStack.length - 1][0]) {
            this.minStack.push([val, 1]);
        } else if (val === this.minStack[this.minStack.length - 1][0]) {
            this.minStack[this.minStack.length - 1][1]++;
        }
    }
    
    pop() {
        const val = this.stack.pop();
        if (val === this.minStack[this.minStack.length - 1][0]) {
            this.minStack[this.minStack.length - 1][1]--;
            if (this.minStack[this.minStack.length - 1][1] === 0) {
                this.minStack.pop();
            }
        }
    }
    
    top() {
        return this.stack[this.stack.length - 1];
    }
    
    getMin() {
        return this.minStack[this.minStack.length - 1][0];
    }
}
```

这种优化在最坏情况下空间还是O(n)，但平均情况更好。

## 另一种思路：单栈存储差值

更巧妙的方法：只用一个栈，存储与当前最小值的差值。

```javascript
class MinStackSingleStack {
    constructor() {
        this.stack = [];  // 存储差值
        this.min = 0;
    }
    
    push(val) {
        if (this.stack.length === 0) {
            this.stack.push(0);
            this.min = val;
        } else {
            this.stack.push(val - this.min);
            if (val < this.min) {
                this.min = val;
            }
        }
    }
    
    pop() {
        const diff = this.stack.pop();
        if (diff < 0) {
            // 说明当前弹出的是最小值，需要恢复之前的min
            this.min = this.min - diff;
        }
    }
    
    top() {
        const diff = this.stack[this.stack.length - 1];
        if (diff < 0) {
            return this.min;  // 栈顶就是最小值
        } else {
            return this.min + diff;
        }
    }
    
    getMin() {
        return this.min;
    }
}
```

**原理**：
- 存储`val - min`作为差值
- 如果差值为负，说明val更新了min
- pop时如果差值为负，需要恢复之前的min

这种方法空间更优，但有整数溢出的风险，且代码较难理解。面试时推荐双栈解法。

## 复杂度分析

**时间复杂度**：
- push：O(1)
- pop：O(1)
- top：O(1)
- getMin：O(1)

**空间复杂度**：O(n)
- 辅助栈最多存储n个元素

## 边界情况

| 场景 | 处理 |
|------|------|
| 空栈调用getMin | 题目保证不会发生 |
| 只有一个元素 | 最小值就是这个元素 |
| 所有元素相同 | 辅助栈全是同一个值 |
| 元素可以是负数 | 正常处理，Math.min能处理负数 |

## 扩展：最大栈

同样的思路可以实现"最大栈"：

```javascript
class MaxStack {
    constructor() {
        this.stack = [];
        this.maxStack = [];
    }
    
    push(val) {
        this.stack.push(val);
        const currentMax = this.maxStack.length === 0 
            ? val 
            : Math.max(val, this.maxStack[this.maxStack.length - 1]);
        this.maxStack.push(currentMax);
    }
    
    // ... 其他方法类似
}
```

## 小结

最小栈的核心思想：**用空间换时间，同步维护状态历史**。

关键设计：
1. **辅助栈**：记录每个状态下的最小值
2. **同步操作**：push和pop时两个栈同步
3. **O(1)查询**：getMin直接返回辅助栈栈顶

这道题的技巧可以推广到其他场景：任何需要在O(1)时间内查询历史状态的问题，都可以考虑用"同步辅助结构"来解决。

下一题我们来看栈的经典应用——括号匹配的进阶版本。
