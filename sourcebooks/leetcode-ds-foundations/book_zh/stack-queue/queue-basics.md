# 队列的原理与实现

队列是一种**先进先出**（First In First Out，FIFO）的数据结构。

## 队列的基本概念

想象排队买票：
- 新来的人排在队尾
- 买到票的人从队头离开
- 先来的人先服务

这就是队列的特性。

```
队头                     队尾
front                    rear
  ↓                       ↓
┌───┬───┬───┬───┬───┐
│ 1 │ 2 │ 3 │ 4 │ 5 │
└───┴───┴───┴───┴───┘
  ↑                       ↑
出队                     入队

enqueue(6):
┌───┬───┬───┬───┬───┬───┐
│ 1 │ 2 │ 3 │ 4 │ 5 │ 6 │
└───┴───┴───┴───┴───┴───┘

dequeue() → 返回 1:
┌───┬───┬───┬───┬───┐
│ 2 │ 3 │ 4 │ 5 │ 6 │
└───┴───┴───┴───┴───┘
```

## 核心操作

| 操作 | 描述 | 时间复杂度 |
|-----|------|-----------|
| `enqueue(element)` | 入队，添加元素到队尾 | O(1) |
| `dequeue()` | 出队，移除并返回队头元素 | O(1) |
| `front()` / `peek()` | 查看队头元素，不移除 | O(1) |
| `isEmpty()` | 判断队列是否为空 | O(1) |
| `size()` | 获取队列中元素个数 | O(1) |

## 数组实现（简单版）

```javascript
class SimpleQueue {
    constructor() {
        this.items = [];
    }
    
    enqueue(element) {
        this.items.push(element);
    }
    
    dequeue() {
        if (this.isEmpty()) {
            throw new Error('Queue is empty');
        }
        return this.items.shift();  // O(n)
    }
    
    front() {
        if (this.isEmpty()) {
            throw new Error('Queue is empty');
        }
        return this.items[0];
    }
    
    isEmpty() {
        return this.items.length === 0;
    }
    
    size() {
        return this.items.length;
    }
}
```

**问题**：`shift()` 操作需要移动所有元素，时间复杂度 O(n)。

## 循环队列

为了实现 O(1) 的出队操作，可以使用循环队列：

```javascript
class CircularQueue {
    constructor(capacity) {
        this.capacity = capacity + 1;  // 多一个空位区分空和满
        this.items = new Array(this.capacity);
        this.front = 0;
        this.rear = 0;
    }
    
    enqueue(element) {
        if (this.isFull()) {
            throw new Error('Queue is full');
        }
        this.items[this.rear] = element;
        this.rear = (this.rear + 1) % this.capacity;
    }
    
    dequeue() {
        if (this.isEmpty()) {
            throw new Error('Queue is empty');
        }
        const val = this.items[this.front];
        this.front = (this.front + 1) % this.capacity;
        return val;
    }
    
    isEmpty() {
        return this.front === this.rear;
    }
    
    isFull() {
        return (this.rear + 1) % this.capacity === this.front;
    }
}
```

循环队列通过取模实现"循环"，避免了元素移动。

## 链表实现

用链表实现队列，维护头尾指针：

```javascript
class LinkedQueue {
    constructor() {
        this.head = null;
        this.tail = null;
        this.length = 0;
    }
    
    enqueue(element) {
        const node = new ListNode(element);
        if (this.isEmpty()) {
            this.head = node;
            this.tail = node;
        } else {
            this.tail.next = node;
            this.tail = node;
        }
        this.length++;
    }
    
    dequeue() {
        if (this.isEmpty()) {
            throw new Error('Queue is empty');
        }
        const val = this.head.val;
        this.head = this.head.next;
        this.length--;
        if (this.isEmpty()) {
            this.tail = null;
        }
        return val;
    }
    
    isEmpty() {
        return this.head === null;
    }
}
```

## 双端队列

双端队列（Deque）允许在两端进行插入和删除：

```javascript
class Deque {
    constructor() {
        this.items = [];
    }
    
    addFront(element) {
        this.items.unshift(element);
    }
    
    addRear(element) {
        this.items.push(element);
    }
    
    removeFront() {
        return this.items.shift();
    }
    
    removeRear() {
        return this.items.pop();
    }
}
```

JavaScript 的 `push`、`pop`、`shift`、`unshift` 让数组天然支持双端队列操作。

## 队列的应用场景

1. **BFS（广度优先搜索）**：层序遍历二叉树、图的遍历
2. **消息队列**：任务调度、事件处理
3. **缓存**：LRU 缓存（结合双向链表）
4. **滑动窗口**：用双端队列维护窗口内的最值

## 本章小结

队列是先进先出（FIFO）的数据结构：

1. **核心操作**：enqueue、dequeue、front
2. **实现方式**：数组（简单但出队慢）、循环队列（高效）、链表
3. **双端队列**：两端都可操作
4. **典型应用**：BFS、滑动窗口

在算法题中，队列常用于"层序处理"和"缓冲"的场景。
