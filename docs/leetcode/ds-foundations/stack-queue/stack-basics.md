# 栈的原理与实现

栈是一种**后进先出**（Last In First Out，LIFO）的数据结构。

## 栈的基本概念

想象一摞叠放的盘子：
- 放盘子只能放在最上面
- 取盘子也只能从最上面取
- 最后放的盘子，最先被取走

这就是栈的特性。

```
    │     │
    │  3  │ ← 栈顶（top）
    │  2  │
    │  1  │ ← 栈底
    └─────┘

push(4):
    │  4  │ ← 新的栈顶
    │  3  │
    │  2  │
    │  1  │
    └─────┘

pop() → 返回 4:
    │     │
    │  3  │ ← 栈顶
    │  2  │
    │  1  │
    └─────┘
```

## 核心操作

| 操作 | 描述 | 时间复杂度 |
|-----|------|-----------|
| `push(element)` | 入栈，添加元素到栈顶 | O(1) |
| `pop()` | 出栈，移除并返回栈顶元素 | O(1) |
| `peek()` / `top()` | 查看栈顶元素，不移除 | O(1) |
| `isEmpty()` | 判断栈是否为空 | O(1) |
| `size()` | 获取栈中元素个数 | O(1) |

所有操作都是 O(1)，这是栈的优势。

## 数组实现

JavaScript 数组天然支持栈操作：

```javascript
class ArrayStack {
    constructor() {
        this.items = [];
    }
    
    push(element) {
        this.items.push(element);
    }
    
    pop() {
        if (this.isEmpty()) {
            throw new Error('Stack is empty');
        }
        return this.items.pop();
    }
    
    peek() {
        if (this.isEmpty()) {
            throw new Error('Stack is empty');
        }
        return this.items[this.items.length - 1];
    }
    
    isEmpty() {
        return this.items.length === 0;
    }
    
    size() {
        return this.items.length;
    }
}
```

实际刷题时，直接用数组的 `push` 和 `pop` 方法即可，不需要封装类。

## 链表实现

也可以用链表实现栈，将链表头作为栈顶：

```javascript
class ListNode {
    constructor(val, next = null) {
        this.val = val;
        this.next = next;
    }
}

class LinkedStack {
    constructor() {
        this.top = null;
        this.length = 0;
    }
    
    push(element) {
        this.top = new ListNode(element, this.top);
        this.length++;
    }
    
    pop() {
        if (this.isEmpty()) {
            throw new Error('Stack is empty');
        }
        const val = this.top.val;
        this.top = this.top.next;
        this.length--;
        return val;
    }
    
    peek() {
        if (this.isEmpty()) {
            throw new Error('Stack is empty');
        }
        return this.top.val;
    }
    
    isEmpty() {
        return this.top === null;
    }
    
    size() {
        return this.length;
    }
}
```

## 栈的应用场景

1. **函数调用栈**：函数调用时压栈，返回时弹栈
2. **撤销操作**：每次操作压栈，撤销时弹栈
3. **浏览器后退**：访问页面压栈，后退时弹栈
4. **括号匹配**：左括号入栈，右括号匹配出栈
5. **表达式求值**：后缀表达式、中缀转后缀

## 本章小结

栈是后进先出（LIFO）的数据结构：

1. **核心操作**：push、pop、peek，都是 O(1)
2. **实现方式**：数组或链表
3. **典型应用**：括号匹配、表达式求值、DFS

在算法题中，栈常用于"匹配"和"逆序处理"的场景。
