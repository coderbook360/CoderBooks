# 反转链表

> LeetCode 206. Reverse Linked List

给你单链表的头节点，请你反转链表，并返回反转后的链表。

这是链表问题的基石——反转链表的操作几乎在所有中等以上难度的链表题目中都会用到。

## 问题描述

```javascript
输入：head = [1, 2, 3, 4, 5]
输出：[5, 4, 3, 2, 1]

输入：head = [1, 2]
输出：[2, 1]

输入：head = []
输出：[]
```

## 解法详解

### 解法一：迭代法（推荐）

#### 核心思想

遍历链表，把每个节点的 `next` 指针指向它的前一个节点。

需要三个指针：
- `prev`：前一个节点（初始为 null）
- `current`：当前节点
- `next`：下一个节点（临时保存）

#### 代码实现

```javascript
function reverseList(head) {
    let prev = null;
    let current = head;
    
    while (current) {
        const next = current.next;  // 1. 保存下一个节点
        current.next = prev;        // 2. 反转指针
        prev = current;             // 3. prev 前进
        current = next;             // 4. current 前进
    }
    
    return prev;
}
```

**为什么要先保存 `next`**？

因为第 2 步 `current.next = prev` 会改变 `current.next`，如果不先保存，就找不到下一个节点了。

#### 执行过程图解

以 `1 → 2 → 3 → null` 为例：

```
初始状态:
prev = null
curr = 1

null   1 → 2 → 3 → null
 ↑     ↑
prev  curr

========================================
第1轮:
1. next = curr.next = 2
2. curr.next = prev → 1 指向 null
3. prev = curr → prev = 1
4. curr = next → curr = 2

null ← 1   2 → 3 → null
       ↑   ↑
      prev curr

========================================
第2轮:
1. next = curr.next = 3
2. curr.next = prev → 2 指向 1
3. prev = curr → prev = 2
4. curr = next → curr = 3

null ← 1 ← 2   3 → null
           ↑   ↑
          prev curr

========================================
第3轮:
1. next = curr.next = null
2. curr.next = prev → 3 指向 2
3. prev = curr → prev = 3
4. curr = next → curr = null

null ← 1 ← 2 ← 3   null
               ↑    ↑
              prev  curr

========================================
循环结束 (curr = null)
返回 prev = 3

结果: 3 → 2 → 1 → null
```

### 解法二：递归法

#### 递归思想

把问题分解：
1. 先递归反转后面的链表
2. 再把当前节点接到反转后链表的末尾

**关键洞察**：反转后，原来的 `head.next` 变成了反转后链表的末尾。

#### 代码实现

```javascript
function reverseList(head) {
    // 递归终止条件：空链表或单节点
    if (!head || !head.next) return head;
    
    // 递归反转后面的链表
    const newHead = reverseList(head.next);
    
    // 关键：head.next 现在是反转后链表的末尾
    head.next.next = head;  // 让末尾节点指向 head
    head.next = null;       // head 变成新的末尾
    
    return newHead;
}
```

#### 递归过程图解

以 `1 → 2 → 3` 为例：

```
reverseList(1 → 2 → 3)
│
├─ reverseList(2 → 3)
│  │
│  ├─ reverseList(3)
│  │  │
│  │  └─ return 3  （单节点，直接返回）
│  │
│  │ 此时: newHead = 3
│  │       2.next = 3
│  │
│  │ 执行: 2.next.next = 2  →  3.next = 2
│  │       2.next = null
│  │
│  │ 链表变成: 3 → 2 → null
│  │
│  └─ return 3
│
│ 此时: newHead = 3
│       1.next = 2（但2已经指向null）
│
│ 执行: 1.next.next = 1  →  2.next = 1
│       1.next = null
│
│ 链表变成: 3 → 2 → 1 → null
│
└─ return 3

最终结果: 3 → 2 → 1 → null
```

## 复杂度对比

| 方法 | 时间复杂度 | 空间复杂度 |
|------|-----------|-----------|
| 迭代 | O(n) | O(1) |
| 递归 | O(n) | O(n) |

递归的空间复杂度是 O(n)，因为递归调用栈的深度等于链表长度。

**推荐使用迭代法**：空间效率更高，不会栈溢出。

## 边界情况

```javascript
// 空链表
reverseList(null)  // null

// 单节点
reverseList(1 → null)  // 1 → null（不变）

// 两个节点
reverseList(1 → 2 → null)  // 2 → 1 → null
```

## 常见错误

**错误一：忘记保存 next**

```javascript
// ❌ 错误
while (current) {
    current.next = prev;  // next 丢失了！
    prev = current;
    current = current.next;  // current.next 已经被改成 prev 了
}
```

**错误二：递归时忘记断开原连接**

```javascript
// ❌ 错误
function reverseList(head) {
    if (!head || !head.next) return head;
    
    const newHead = reverseList(head.next);
    head.next.next = head;
    // 忘了 head.next = null
    // 会形成环！1 → 2 → 1 → 2 → ...
    
    return newHead;
}
```

## 相关题目

掌握了基本反转，可以挑战：

- **LeetCode 92. 反转链表 II**：反转区间 [left, right]
- **LeetCode 25. K 个一组翻转链表**：每 k 个节点反转一次
- **LeetCode 234. 回文链表**：需要反转后半部分

## 小结

反转链表的核心要点：

**迭代法（推荐）**：
1. 保存 next
2. 反转指针
3. 移动 prev 和 current
4. 返回 prev

**递归法**：
1. 递归反转后面的部分
2. 把当前节点接到末尾
3. 记得断开原来的连接

**口诀**：先存后改，步步前移。

链表反转是链表问题的基本功，务必练到闭着眼睛都能写出来。
