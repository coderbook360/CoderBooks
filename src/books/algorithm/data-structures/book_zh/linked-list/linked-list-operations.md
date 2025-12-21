# 链表的基本操作

掌握链表的四个基本操作：遍历、查找、插入、删除。

## 链表遍历

从头节点开始，沿着 `next` 指针访问每个节点。

```javascript
function traverse(head) {
    let curr = head;
    while (curr !== null) {
        console.log(curr.val);
        curr = curr.next;
    }
}
```

### 常用遍历模式

**计算链表长度**：

```javascript
function getLength(head) {
    let length = 0;
    let curr = head;
    while (curr !== null) {
        length++;
        curr = curr.next;
    }
    return length;
}
```

**转换为数组**：

```javascript
function toArray(head) {
    const result = [];
    let curr = head;
    while (curr !== null) {
        result.push(curr.val);
        curr = curr.next;
    }
    return result;
}
```

时间复杂度都是 O(n)。

## 链表查找

### 按值查找

```javascript
function findNode(head, val) {
    let curr = head;
    while (curr !== null) {
        if (curr.val === val) {
            return curr;
        }
        curr = curr.next;
    }
    return null;
}
```

### 按索引查找

```javascript
function getNodeAt(head, index) {
    let curr = head;
    for (let i = 0; i < index && curr !== null; i++) {
        curr = curr.next;
    }
    return curr;
}
```

注意：链表没有下标，"第 i 个节点"需要从头遍历 i 次才能到达。时间 O(n)。

## 链表插入

### 头部插入

```javascript
function insertAtHead(head, val) {
    const newNode = new ListNode(val);
    newNode.next = head;
    return newNode;  // 新的头节点
}
```

过程图示：

```
原链表:      [1] → [2] → [3]
插入 0 后:   [0] → [1] → [2] → [3]
```

时间 O(1)。

### 尾部插入

```javascript
function insertAtTail(head, val) {
    const newNode = new ListNode(val);
    
    // 特殊情况：空链表
    if (head === null) {
        return newNode;
    }
    
    // 遍历到最后一个节点
    let curr = head;
    while (curr.next !== null) {
        curr = curr.next;
    }
    curr.next = newNode;
    
    return head;
}
```

时间 O(n)，因为需要遍历到尾部。

### 中间插入（在某节点后插入）

```javascript
function insertAfter(node, val) {
    if (node === null) return;
    
    const newNode = new ListNode(val);
    newNode.next = node.next;
    node.next = newNode;
}
```

过程图示：

```
在节点 2 后插入 9：
原链表:   [1] → [2] → [3]
插入后:   [1] → [2] → [9] → [3]

步骤：
1. newNode.next = node.next  // [9] → [3]
2. node.next = newNode       // [2] → [9]
```

**顺序很重要**！如果先执行 `node.next = newNode`，就丢失了对 `[3]` 的引用。

时间 O(1)（假设已知插入位置）。

## 链表删除

### 删除头节点

```javascript
function deleteHead(head) {
    if (head === null) return null;
    return head.next;
}
```

时间 O(1)。

### 删除指定节点的下一个节点

```javascript
function deleteNext(node) {
    if (node === null || node.next === null) return;
    node.next = node.next.next;
}
```

过程图示：

```
删除节点 2 后面的节点（即 3）：
原链表:   [1] → [2] → [3] → [4]
删除后:   [1] → [2] → [4]

步骤：
node.next = node.next.next  // [2] → [4]
```

时间 O(1)。

### 删除值为 val 的节点

```javascript
function deleteByValue(head, val) {
    // 使用虚拟头节点简化边界处理
    const dummy = new ListNode(0, head);
    let curr = dummy;
    
    while (curr.next !== null) {
        if (curr.next.val === val) {
            curr.next = curr.next.next;
        } else {
            curr = curr.next;
        }
    }
    
    return dummy.next;
}
```

这里用了**虚拟头节点**技巧：创建一个 dummy 节点指向 head，这样即使要删除 head，处理逻辑也是一致的。

时间 O(n)。

## 虚拟头节点技巧

很多链表问题中，头节点需要特殊处理。虚拟头节点（dummy node）可以统一处理逻辑：

```javascript
function someOperation(head) {
    const dummy = new ListNode(0);
    dummy.next = head;
    
    // 所有操作都从 dummy 开始
    // ...
    
    return dummy.next;  // 真正的头节点
}
```

**好处**：
1. 不需要单独处理"删除头节点"的情况
2. 不需要单独处理"在头部插入"的情况
3. 代码更简洁，不易出错

## 操作复杂度总结

| 操作 | 时间复杂度 | 说明 |
|-----|-----------|------|
| 遍历 | O(n) | 需要访问每个节点 |
| 头部插入 | O(1) | 直接修改头指针 |
| 尾部插入 | O(n) | 需要先遍历到尾部 |
| 指定位置插入 | O(1) | 已知位置后操作是 O(1) |
| 头部删除 | O(1) | 直接修改头指针 |
| 指定节点删除 | O(1) | 已知前驱后操作是 O(1) |
| 按值查找 | O(n) | 需要遍历查找 |

## 本章小结

链表的基本操作：

1. **遍历**：沿 next 指针依次访问
2. **查找**：遍历直到找到目标
3. **插入**：修改前驱的 next 指针
4. **删除**：让前驱直接指向后继

**关键技巧**：
- 操作指针时注意顺序，避免丢失引用
- 善用虚拟头节点简化边界处理
- 画图帮助理解指针变化

下一章开始实战：反转链表。
