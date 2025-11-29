# 链表基础理论

如果说数组是住在公寓里的邻居——门牌号连续，敲邻居的门很方便；那链表就像散落在城市各处的朋友——各自住在不同的地方，但每个人都记着下一个朋友的地址。

## 什么是链表

### 链表的定义

**链表**是一种通过**指针**（或引用）连接起来的节点序列。每个节点包含两部分：
1. **数据域**：存储实际的值
2. **指针域**：指向下一个节点的地址

与数组不同，链表的节点在内存中**不需要连续存储**。

### 节点结构

在 JavaScript 中，链表节点通常这样定义：

```javascript
class ListNode {
    constructor(val) {
        this.val = val;      // 数据
        this.next = null;    // 指向下一个节点
    }
}
```

创建一个简单的链表：

```javascript
const node1 = new ListNode(1);
const node2 = new ListNode(2);
const node3 = new ListNode(3);

node1.next = node2;
node2.next = node3;
// node3.next 默认是 null，表示链表结束

// 逻辑视图: 1 → 2 → 3 → null
```

## 链表的内存模型

数组在内存中是连续存储的：

```
数组 [1, 2, 3] 的内存布局:
地址:   0x100  0x104  0x108
值:       1      2      3
         ↑连续存储↑
```

而链表的节点可以分散在内存的任何位置，通过指针"串"起来：

```
链表 1 → 2 → 3 的内存布局:

地址 0x1000: { val: 1, next: 0x2050 }  ←── head
...（中间可能有其他数据）
地址 0x2050: { val: 2, next: 0x1500 }
...
地址 0x1500: { val: 3, next: null }    ←── 链表结束
```

**逻辑视图**（我们关心的）：

```
head → [1] → [2] → [3] → null
```

虽然物理位置分散，但通过指针，我们可以从头到尾遍历整个链表。

## 链表的类型

### 单链表

最基本的链表类型，每个节点只有一个指针，指向下一个节点：

```
head → [1] → [2] → [3] → null
```

**特点**：
- 只能单向遍历（从头到尾）
- 无法直接访问前一个节点
- 最简单，最常用

### 双链表

每个节点有两个指针，分别指向前一个和后一个节点：

```
null ← [1] ⇄ [2] ⇄ [3] → null
```

节点结构：

```javascript
class DoublyListNode {
    constructor(val) {
        this.val = val;
        this.prev = null;  // 指向前一个节点
        this.next = null;  // 指向后一个节点
    }
}
```

**特点**：
- 可以双向遍历
- 删除当前节点时不需要知道前一个节点
- 占用更多内存（多一个指针）

### 循环链表

尾节点的 `next` 指向头节点，形成一个环：

```
单向循环链表:
head → [1] → [2] → [3] ─┐
        ↑               │
        └───────────────┘

双向循环链表:
    ┌─────────────────────────┐
    ↓                         │
   [1] ⇄ [2] ⇄ [3]
    │                         ↑
    └─────────────────────────┘
```

**特点**：
- 没有 `null` 结尾
- 可以从任意节点遍历整个链表
- 常用于实现循环队列、约瑟夫环等问题

## 链表的基本操作

### 创建链表

从数组创建链表：

```javascript
function createList(arr) {
    if (!arr.length) return null;
    
    const head = new ListNode(arr[0]);
    let current = head;
    
    for (let i = 1; i < arr.length; i++) {
        current.next = new ListNode(arr[i]);
        current = current.next;
    }
    
    return head;
}

// 使用
const list = createList([1, 2, 3, 4, 5]);
// 1 → 2 → 3 → 4 → 5 → null
```

链表转数组（便于调试）：

```javascript
function listToArray(head) {
    const result = [];
    while (head) {
        result.push(head.val);
        head = head.next;
    }
    return result;
}
```

### 插入节点

**在头部插入**：

```javascript
function insertAtHead(head, val) {
    const newNode = new ListNode(val);
    newNode.next = head;
    return newNode;  // 新节点成为新的头
}
```

**操作图解**：

```
原链表: head → [1] → [2] → null

插入 0:
1. 创建新节点 [0]
2. 新节点指向原头节点: [0] → [1] → [2] → null
3. 更新 head 指向新节点

结果: head → [0] → [1] → [2] → null
```

时间复杂度：**O(1)**

**在尾部插入**：

```javascript
function insertAtTail(head, val) {
    const newNode = new ListNode(val);
    
    if (!head) return newNode;
    
    let current = head;
    while (current.next) {
        current = current.next;
    }
    current.next = newNode;
    
    return head;
}
```

时间复杂度：**O(n)**（需要遍历到尾部）

### 删除节点

**删除头节点**：

```javascript
function deleteHead(head) {
    if (!head) return null;
    return head.next;
}
```

时间复杂度：**O(1)**

**删除指定值的节点**：

```javascript
function deleteNode(head, val) {
    // 使用虚拟头节点简化边界处理
    const dummy = new ListNode(0);
    dummy.next = head;
    
    let current = dummy;
    while (current.next) {
        if (current.next.val === val) {
            // 跳过要删除的节点
            current.next = current.next.next;
        } else {
            current = current.next;
        }
    }
    
    return dummy.next;
}
```

**删除操作图解**：

```
删除值为 2 的节点:

原链表: [1] → [2] → [3] → null
              ↑ 要删除

操作: 让 [1] 的 next 直接指向 [3]
      [1] → [3] → null

被删除的 [2] 会被垃圾回收
```

### 遍历链表

```javascript
function traverse(head) {
    let current = head;
    while (current) {
        console.log(current.val);
        current = current.next;
    }
}
```

## 链表 vs 数组

| 特性 | 数组 | 链表 |
|------|------|------|
| 内存布局 | 连续 | 分散 |
| 随机访问 | O(1) | O(n) |
| 头部插入 | O(n) | O(1) |
| 尾部插入 | O(1)* | O(n)** |
| 中间插入 | O(n) | O(n)*** |
| 查找元素 | O(n) | O(n) |
| 内存利用 | 可能浪费 | 按需分配 |
| 缓存友好 | 是 | 否 |

*数组尾部插入在预留空间足够时是 O(1)
**链表尾部插入如果维护尾指针也可以 O(1)
***链表中间插入本身是 O(1)，但定位需要 O(n)

**什么时候用链表**？
- 频繁在头部插入/删除
- 元素数量不确定，需要动态增长
- 不需要随机访问

**什么时候用数组**？
- 需要频繁随机访问
- 元素数量相对固定
- 需要利用 CPU 缓存加速

## 哨兵节点技巧

**哨兵节点**（也叫虚拟头节点、dummy node）是一个人为添加的"假"节点，放在链表真正的头节点之前。

**为什么要用哨兵节点**？

看这个删除头节点的代码：

```javascript
// 不用哨兵节点，需要特殊处理头节点
function deleteFirst(head, val) {
    // 特殊情况：删除的是头节点
    if (head && head.val === val) {
        return head.next;
    }
    
    // 一般情况
    let current = head;
    while (current && current.next) {
        if (current.next.val === val) {
            current.next = current.next.next;
            break;
        }
        current = current.next;
    }
    return head;
}
```

用哨兵节点后：

```javascript
// 用哨兵节点，统一处理
function deleteFirst(head, val) {
    const dummy = new ListNode(0);
    dummy.next = head;
    
    let current = dummy;
    while (current.next) {
        if (current.next.val === val) {
            current.next = current.next.next;
            break;
        }
        current = current.next;
    }
    
    return dummy.next;
}
```

**哨兵节点的好处**：
1. 统一了"删除头节点"和"删除其他节点"的逻辑
2. 避免了大量的空指针检查
3. 代码更简洁，不容易出错

**使用模式**：

```javascript
// 1. 创建虚拟头节点
const dummy = new ListNode(0);
dummy.next = head;

// 2. 进行各种操作...

// 3. 返回真正的头节点
return dummy.next;
```

## 链表的适用场景

**LRU 缓存**：
- 用双链表存储缓存项
- 最近使用的移到头部
- 淘汰时删除尾部
- 配合哈希表实现 O(1) 访问

**浏览器历史记录**：
- 双链表实现前进/后退
- 每个节点是一个页面

**撤销/重做功能**：
- 链表记录操作历史
- 可以向前/向后遍历

**多项式表示**：
- 每个节点存储一项（系数和指数）
- 方便进行多项式运算

## 小结

链表是一种基础而重要的数据结构：

**核心概念**：
- 节点通过指针连接
- 内存不连续，按需分配
- 头部操作效率高，随机访问效率低

**三种类型**：
- 单链表：最简单，单向遍历
- 双链表：双向遍历，删除更灵活
- 循环链表：首尾相连，无 null

**关键技巧**：
- **哨兵节点**：统一边界处理，简化代码
- **指针操作**：先连接新的，再断开旧的

链表问题在面试中非常常见，接下来的章节我们将学习各种链表操作技巧和经典问题的解法。
