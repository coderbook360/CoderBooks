# 栈与队列基础理论

如果说数组是一条直路，链表是一条单向小巷，那么栈和队列就是两种特殊的"交通规则"——它们规定了数据的进出方式。理解这两种数据结构，是解决很多算法问题的基础。

## 栈（Stack）

### 定义与特性

**栈**是一种只能在一端进行插入和删除操作的线性表。这一端被称为**栈顶（top）**，另一端称为**栈底（bottom）**。

栈的核心特性是**LIFO（Last In First Out）——后进先出**。就像堆叠的盘子，最后放上去的盘子必须先拿走。

```
    ┌───┐
    │ 3 │ ← 栈顶（最后进入，最先出去）
    ├───┤
    │ 2 │
    ├───┤
    │ 1 │ ← 栈底（最先进入，最后出去）
    └───┘
```

### 基本操作

| 操作 | 说明 | 时间复杂度 |
|------|------|-----------|
| push(x) | 将元素x压入栈顶 | O(1) |
| pop() | 弹出并返回栈顶元素 | O(1) |
| peek()/top() | 查看栈顶元素，不删除 | O(1) |
| isEmpty() | 判断栈是否为空 | O(1) |
| size() | 返回栈中元素个数 | O(1) |

**操作图解**：
```
初始栈: [1, 2]（2在栈顶）

push(3):
[1, 2, 3]  ← 3入栈

pop():
返回3，栈变为 [1, 2]

peek():
返回2，栈不变 [1, 2]
```

### 数组实现栈

JavaScript的数组天然支持栈操作：

```javascript
class Stack {
    constructor() {
        this.items = [];
    }
    
    // 入栈
    push(item) {
        this.items.push(item);
    }
    
    // 出栈
    pop() {
        return this.items.pop();
    }
    
    // 查看栈顶
    peek() {
        return this.items[this.items.length - 1];
    }
    
    // 判断是否为空
    isEmpty() {
        return this.items.length === 0;
    }
    
    // 获取大小
    size() {
        return this.items.length;
    }
}
```

**使用示例**：
```javascript
const stack = new Stack();
stack.push(1);
stack.push(2);
stack.push(3);

console.log(stack.peek());  // 3
console.log(stack.pop());   // 3
console.log(stack.pop());   // 2
console.log(stack.isEmpty()); // false
```

### 链表实现栈

用链表实现栈时，链表头作为栈顶：

```javascript
class LinkedStack {
    constructor() {
        this.top = null;  // 栈顶指针
        this.length = 0;
    }
    
    push(val) {
        // 新节点指向原栈顶
        const node = { val, next: this.top };
        this.top = node;  // 更新栈顶
        this.length++;
    }
    
    pop() {
        if (!this.top) return undefined;
        
        const val = this.top.val;
        this.top = this.top.next;  // 栈顶下移
        this.length--;
        return val;
    }
    
    peek() {
        return this.top?.val;
    }
    
    isEmpty() {
        return this.length === 0;
    }
}
```

**为什么用链表头作为栈顶？**

因为链表头部的插入和删除都是O(1)。如果用链表尾作为栈顶，删除操作需要遍历找到倒数第二个节点，变成O(n)。

## 队列（Queue）

### 定义与特性

**队列**是一种只能在一端（队尾）插入，另一端（队头）删除的线性表。

队列的核心特性是**FIFO（First In First Out）——先进先出**。就像排队买票，先排队的人先买到票。

```
出队 ←  ┌───┬───┬───┬───┐  ← 入队
        │ 1 │ 2 │ 3 │ 4 │
        └───┴───┴───┴───┘
        ↑               ↑
      队头(front)    队尾(rear)
```

### 基本操作

| 操作 | 说明 | 时间复杂度 |
|------|------|-----------|
| enqueue(x) | 将元素x加入队尾 | O(1) |
| dequeue() | 移除并返回队头元素 | O(1)* |
| front()/peek() | 查看队头元素，不删除 | O(1) |
| isEmpty() | 判断队列是否为空 | O(1) |

*注：数组实现的dequeue是O(n)，循环数组或链表实现才是O(1)。

### JavaScript数组作为队列的问题

```javascript
const queue = [];
queue.push(1);    // 入队 O(1)
queue.push(2);
queue.shift();    // 出队 O(n)！
```

`shift()`操作会移动所有剩余元素，时间复杂度是O(n)。对于频繁出队的场景，这是性能瓶颈。

### 循环数组实现队列

循环数组可以实现O(1)的出队操作：

```javascript
class CircularQueue {
    constructor(capacity) {
        this.items = new Array(capacity);
        this.capacity = capacity;
        this.front = 0;  // 队头指针
        this.rear = 0;   // 队尾指针
        this.size = 0;   // 当前元素个数
    }
    
    // 入队
    enqueue(item) {
        if (this.size === this.capacity) {
            return false;  // 队列满
        }
        this.items[this.rear] = item;
        this.rear = (this.rear + 1) % this.capacity;  // 循环移动
        this.size++;
        return true;
    }
    
    // 出队
    dequeue() {
        if (this.size === 0) {
            return undefined;  // 队列空
        }
        const item = this.items[this.front];
        this.front = (this.front + 1) % this.capacity;  // 循环移动
        this.size--;
        return item;
    }
    
    // 查看队头
    peek() {
        if (this.size === 0) return undefined;
        return this.items[this.front];
    }
    
    isEmpty() {
        return this.size === 0;
    }
    
    isFull() {
        return this.size === this.capacity;
    }
}
```

**循环数组图解**：
```
容量为5的循环队列：

初始状态（空队列）：
[ _, _, _, _, _ ]
  ↑
front=rear=0

入队1,2,3后：
[ 1, 2, 3, _, _ ]
  ↑        ↑
front=0  rear=3

出队一个元素后：
[ _, 2, 3, _, _ ]
     ↑     ↑
  front=1  rear=3

继续入队4,5,6：
[ 6, 2, 3, 4, 5 ]
  ↑  ↑
rear=1 front=1

rear绕回到了数组开头！
```

关键在于`% capacity`运算，让指针在到达数组末尾后回到开头。

### 链表实现队列

```javascript
class LinkedQueue {
    constructor() {
        this.head = null;  // 队头
        this.tail = null;  // 队尾
        this.size = 0;
    }
    
    enqueue(val) {
        const node = { val, next: null };
        
        if (!this.tail) {
            this.head = this.tail = node;
        } else {
            this.tail.next = node;
            this.tail = node;
        }
        this.size++;
    }
    
    dequeue() {
        if (!this.head) return undefined;
        
        const val = this.head.val;
        this.head = this.head.next;
        
        if (!this.head) {
            this.tail = null;  // 队列变空
        }
        this.size--;
        return val;
    }
    
    peek() {
        return this.head?.val;
    }
    
    isEmpty() {
        return this.size === 0;
    }
}
```

链表实现的优点是没有容量限制，缺点是每个节点需要额外存储指针。

## 双端队列（Deque）

**双端队列**是一种两端都可以进行插入和删除操作的数据结构，是栈和队列的综合体。

```
addFirst  removeLast
   ↓          ↑
   ┌──┬──┬──┬──┐
   │  │  │  │  │
   └──┴──┴──┴──┘
   ↑          ↓
removeFirst  addLast
```

### 基本操作

| 操作 | 说明 |
|------|------|
| addFirst(x) | 在队头添加元素 |
| addLast(x) | 在队尾添加元素 |
| removeFirst() | 移除并返回队头元素 |
| removeLast() | 移除并返回队尾元素 |
| peekFirst() | 查看队头元素 |
| peekLast() | 查看队尾元素 |

JavaScript数组可以作为双端队列使用：
```javascript
const deque = [];
deque.push(1);     // addLast
deque.unshift(0);  // addFirst
deque.pop();       // removeLast
deque.shift();     // removeFirst
```

但`unshift`和`shift`是O(n)操作，性能不佳。在需要高性能双端队列时，应该使用专门的实现。

## 栈与队列的选择

| 场景 | 推荐数据结构 | 原因 |
|------|-------------|------|
| 括号匹配 | 栈 | 最近的左括号匹配最近的右括号 |
| 递归转迭代 | 栈 | 模拟函数调用栈 |
| 撤销操作 | 栈 | 撤销最近的操作 |
| 层序遍历 | 队列 | 先访问的节点的子节点先处理 |
| BFS广度优先 | 队列 | 按距离递增的顺序访问 |
| 滑动窗口 | 双端队列 | 两端都需要操作 |

**记忆口诀**：
- **栈**：后来者优先（最近相关性）
- **队列**：先到者优先（公平调度）

## JavaScript中的最佳实践

**栈**：直接使用数组的`push`和`pop`

```javascript
const stack = [];
stack.push(1);  // O(1)
stack.pop();    // O(1)
```

**队列**：对于小规模数据，可以用数组；大规模或高频操作时，使用循环数组或链表实现。

```javascript
// 简单队列（小规模）
const queue = [];
queue.push(1);
queue.shift();  // O(n)，但数据量小时可接受

// 高性能队列
const efficientQueue = new CircularQueue(1000);
```

## 小结

栈和队列是两种受限的线性表：

**栈（Stack）**：
- LIFO后进先出
- 只在一端（栈顶）操作
- 核心操作：push、pop、peek
- 典型应用：括号匹配、表达式求值、DFS

**队列（Queue）**：
- FIFO先进先出
- 一端入队，另一端出队
- 核心操作：enqueue、dequeue、front
- 典型应用：BFS、任务调度、消息队列

**双端队列（Deque）**：
- 两端都可操作
- 是栈和队列的综合体
- 典型应用：滑动窗口

掌握这些基础概念和实现，你就为后续的实战题目打好了基础。下一章，我们将深入探讨栈与队列的具体应用场景。
