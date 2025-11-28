# 链表操作技巧

掌握链表问题，核心是掌握几个通用技巧。这些技巧就像武功招式，学会了可以应对各种链表题目。本章介绍最重要的四个技巧：虚拟头节点、快慢指针、链表反转、合并与排序。

## 虚拟头节点

### 为什么需要

链表操作中，头节点往往需要特殊处理。比如删除节点：

```javascript
// 不用虚拟头节点
function removeElements(head, val) {
    // 特殊处理：删除头节点
    while (head && head.val === val) {
        head = head.next;
    }
    
    if (!head) return null;
    
    // 删除其他节点
    let current = head;
    while (current.next) {
        if (current.next.val === val) {
            current.next = current.next.next;
        } else {
            current = current.next;
        }
    }
    
    return head;
}
```

代码有两段逻辑，容易出错。加入虚拟头节点后：

```javascript
// 用虚拟头节点
function removeElements(head, val) {
    const dummy = new ListNode(0);
    dummy.next = head;
    
    let current = dummy;
    while (current.next) {
        if (current.next.val === val) {
            current.next = current.next.next;
        } else {
            current = current.next;
        }
    }
    
    return dummy.next;
}
```

一段逻辑搞定所有情况。

### 使用场景

- 可能删除头节点时
- 需要在头部插入节点时
- 链表可能为空时

### 代码模板

```javascript
// 1. 创建虚拟头节点
const dummy = new ListNode(0);
dummy.next = head;

// 2. 进行操作...

// 3. 返回真正的头节点
return dummy.next;
```

## 快慢指针

快慢指针是链表问题的瑞士军刀，用两个速度不同的指针遍历链表。

### 找中点

慢指针每次走一步，快指针每次走两步。当快指针到达末尾时，慢指针正好在中点。

```javascript
function findMiddle(head) {
    let slow = head;
    let fast = head;
    
    while (fast && fast.next) {
        slow = slow.next;        // 慢指针走一步
        fast = fast.next.next;   // 快指针走两步
    }
    
    return slow;
}
```

**图解**：

```
链表长度为奇数 (5):
初始:  1 → 2 → 3 → 4 → 5 → null
       ↑
      s,f

第1步: 1 → 2 → 3 → 4 → 5 → null
           ↑   ↑
           s   f

第2步: 1 → 2 → 3 → 4 → 5 → null
               ↑       ↑
               s       f

f.next = null，停止
s 指向中点 3

链表长度为偶数 (4):
初始:  1 → 2 → 3 → 4 → null
       ↑
      s,f

第1步: 1 → 2 → 3 → 4 → null
           ↑   ↑
           s   f

第2步: 1 → 2 → 3 → 4 → null
               ↑       ↑
               s       f

f.next = null，停止
s 指向中间偏右的 3
```

### 检测环

如果链表有环，快指针最终会"追上"慢指针。

```javascript
function hasCycle(head) {
    let slow = head;
    let fast = head;
    
    while (fast && fast.next) {
        slow = slow.next;
        fast = fast.next.next;
        
        if (slow === fast) {
            return true;  // 相遇，有环
        }
    }
    
    return false;  // 快指针到达末尾，无环
}
```

**为什么有环一定会相遇**？

想象跑步。快指针每次比慢指针多走一步，相当于每次"追近"一个位置。进入环后，快指针必然会追上慢指针。

### 找环入口

不仅要知道有没有环，还要找到环的入口。

```javascript
function detectCycle(head) {
    let slow = head;
    let fast = head;
    
    // 第一阶段：找到相遇点
    while (fast && fast.next) {
        slow = slow.next;
        fast = fast.next.next;
        
        if (slow === fast) break;
    }
    
    // 无环
    if (!fast || !fast.next) return null;
    
    // 第二阶段：从头和相遇点同时出发
    slow = head;
    while (slow !== fast) {
        slow = slow.next;
        fast = fast.next;
    }
    
    return slow;  // 相遇点就是环入口
}
```

**为什么第二阶段会在入口相遇**？

设：
- 头到环入口距离为 a
- 环入口到相遇点距离为 b
- 相遇点到环入口距离为 c

第一次相遇时：
- 慢指针走了：a + b
- 快指针走了：a + b + n(b + c)，n 是快指针多绕的圈数

因为快指针速度是慢指针的 2 倍：
```
2(a + b) = a + b + n(b + c)
a + b = n(b + c)
a = n(b + c) - b = (n-1)(b + c) + c
```

这意味着：**从头走 a 步 = 从相遇点走 c 步（可能绑几圈）**

所以两个指针（一个从头，一个从相遇点）同速前进，会在入口相遇。

## 链表反转

### 迭代实现（推荐）

```javascript
function reverseList(head) {
    let prev = null;
    let current = head;
    
    while (current) {
        const next = current.next;  // 1. 保存下一个
        current.next = prev;        // 2. 反转指针
        prev = current;             // 3. prev 前进
        current = next;             // 4. current 前进
    }
    
    return prev;
}
```

**图解**：

```
初始: null   1 → 2 → 3 → null
       ↑    ↑
      prev  curr

第1步: null ← 1   2 → 3 → null
             ↑   ↑
            prev curr

第2步: null ← 1 ← 2   3 → null
                  ↑   ↑
                 prev curr

第3步: null ← 1 ← 2 ← 3   null
                      ↑    ↑
                     prev  curr

curr = null，返回 prev
```

**关键**：先保存 `next`，否则断链后就找不到了。

### 递归实现

```javascript
function reverseList(head) {
    // 递归出口
    if (!head || !head.next) return head;
    
    // 递归反转剩余部分
    const newHead = reverseList(head.next);
    
    // 反转当前节点
    head.next.next = head;  // 让下一个节点指向自己
    head.next = null;       // 断开原来的连接
    
    return newHead;
}
```

递归的思路：假设后面的已经反转好了，只处理当前节点。

### 部分反转

反转链表的 [left, right] 区间：

```javascript
function reverseBetween(head, left, right) {
    const dummy = new ListNode(0);
    dummy.next = head;
    
    // 找到 left 前一个节点
    let prev = dummy;
    for (let i = 1; i < left; i++) {
        prev = prev.next;
    }
    
    // 反转 [left, right] 区间
    // 使用"头插法"
    let current = prev.next;
    for (let i = 0; i < right - left; i++) {
        const next = current.next;
        current.next = next.next;
        next.next = prev.next;
        prev.next = next;
    }
    
    return dummy.next;
}
```

## 合并与排序

### 合并两个有序链表

```javascript
function mergeTwoLists(l1, l2) {
    const dummy = new ListNode(0);
    let current = dummy;
    
    while (l1 && l2) {
        if (l1.val <= l2.val) {
            current.next = l1;
            l1 = l1.next;
        } else {
            current.next = l2;
            l2 = l2.next;
        }
        current = current.next;
    }
    
    // 接上剩余部分
    current.next = l1 || l2;
    
    return dummy.next;
}
```

### 链表的归并排序

归并排序特别适合链表（不需要额外空间存储合并结果）：

```javascript
function sortList(head) {
    // 递归出口
    if (!head || !head.next) return head;
    
    // 1. 找中点（用快慢指针）
    let slow = head;
    let fast = head.next;  // 注意：fast 从 head.next 开始
    while (fast && fast.next) {
        slow = slow.next;
        fast = fast.next.next;
    }
    
    // 2. 断开链表
    const mid = slow.next;
    slow.next = null;
    
    // 3. 递归排序两半
    const left = sortList(head);
    const right = sortList(mid);
    
    // 4. 合并
    return mergeTwoLists(left, right);
}
```

## 技巧选择指南

| 问题特征 | 推荐技巧 |
|---------|---------|
| 可能删除/修改头节点 | 虚拟头节点 |
| 找中点 | 快慢指针 |
| 找倒数第 k 个 | 快慢指针（快先走 k 步） |
| 检测环、找环入口 | 快慢指针 |
| 反转整个链表 | 迭代反转 |
| 反转部分链表 | 虚拟头 + 头插法 |
| 合并有序链表 | 归并技巧 |
| 链表排序 | 归并排序 |

## 小结

链表的四大核心技巧：

**虚拟头节点**：
- 统一处理头节点
- 避免空指针判断
- 简化边界情况

**快慢指针**：
- 找中点：慢走一步，快走两步
- 检测环：快追慢
- 找入口：数学推导，二次相遇

**链表反转**：
- 迭代：保存 next，反转指针，移动指针
- 递归：先反转后面，再处理当前

**合并与排序**：
- 归并排序最适合链表
- 空间复杂度 O(1)（不算递归栈）

掌握这些技巧，大部分链表问题都能迎刃而解。接下来的实战章节会反复运用这些技巧。
