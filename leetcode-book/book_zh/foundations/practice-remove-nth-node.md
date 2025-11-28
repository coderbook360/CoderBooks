# 删除链表的倒数第N个节点

> LeetCode 19. Remove Nth Node From End of List

给你一个链表，删除链表的**倒数**第 n 个节点，并返回链表的头节点。

"倒数"意味着我们不知道链表长度，需要从末尾往前数。如何用一次遍历解决这个问题？快慢指针来帮忙。

## 问题描述

```javascript
输入：head = [1, 2, 3, 4, 5], n = 2
输出：[1, 2, 3, 5]
解释：删除倒数第2个节点（值为4）

输入：head = [1], n = 1
输出：[]
解释：删除唯一的节点

输入：head = [1, 2], n = 1
输出：[1]
解释：删除倒数第1个节点（值为2）
```

## 思路分析

### 为什么用快慢指针？

**倒数第 n 个**意味着：从末尾往前数 n 个位置。

如果用两次遍历：
1. 第一次遍历求链表长度 L
2. 第二次遍历到第 L-n 个位置

但题目要求一次遍历。怎么办？

**快慢指针的妙用**：
- 让快指针先走 n 步
- 然后两个指针同时走
- 当快指针到达末尾时，慢指针正好在倒数第 n 个位置

这就像两个人保持固定距离走路：第一个人到终点时，第二个人到达了终点前 n 步的位置。

### 为什么需要虚拟头节点？

如果要删除的是头节点（比如 `[1, 2]` 删除倒数第 2 个），没有"前一个节点"。

用虚拟头节点可以统一处理：慢指针停在待删除节点的**前一个**位置，即使是删除头节点也不例外。

## 解法详解

### 代码实现

```javascript
function removeNthFromEnd(head, n) {
    // 虚拟头节点
    const dummy = new ListNode(0);
    dummy.next = head;
    
    let fast = dummy;
    let slow = dummy;
    
    // fast 先走 n+1 步
    for (let i = 0; i <= n; i++) {
        fast = fast.next;
    }
    
    // 同时移动，直到 fast 到达末尾
    while (fast) {
        fast = fast.next;
        slow = slow.next;
    }
    
    // slow 指向待删除节点的前一个
    slow.next = slow.next.next;
    
    return dummy.next;
}
```

### 为什么 fast 先走 n+1 步？

我们需要让 slow 停在待删除节点的**前一个**位置，这样才能执行 `slow.next = slow.next.next` 来删除。

- 如果 fast 先走 n 步，当 fast = null 时，slow 会停在**待删除节点**上
- 如果 fast 先走 n+1 步，当 fast = null 时，slow 会停在**待删除节点的前一个**

### 执行过程图解

以 `1 → 2 → 3 → 4 → 5`，`n = 2` 为例：

```
初始状态:
dummy → 1 → 2 → 3 → 4 → 5 → null
  ↑
 s,f

========================================
第1步：fast 先走 n+1 = 3 步

i=0: fast → 1
i=1: fast → 2
i=2: fast → 3

dummy → 1 → 2 → 3 → 4 → 5 → null
  ↑              ↑
 slow           fast

========================================
第2步：同时移动，直到 fast = null

移动1次:
dummy → 1 → 2 → 3 → 4 → 5 → null
        ↑              ↑
       slow           fast

移动2次:
dummy → 1 → 2 → 3 → 4 → 5 → null
            ↑              ↑
           slow           fast

移动3次:
dummy → 1 → 2 → 3 → 4 → 5 → null
                ↑              ↑
               slow           fast (null)

========================================
第3步：删除 slow.next

slow 指向节点 3
slow.next 是节点 4（待删除）
slow.next.next 是节点 5

执行: slow.next = slow.next.next

dummy → 1 → 2 → 3 → 5 → null

返回 dummy.next = 1
```

### 边界情况：删除头节点

以 `1 → 2`，`n = 2` 为例（删除倒数第 2 个，即头节点）：

```
初始:
dummy → 1 → 2 → null
  ↑
 s,f

fast 先走 3 步 (n+1=3):
i=0: fast → 1
i=1: fast → 2
i=2: fast → null

dummy → 1 → 2 → null
  ↑              ↑
 slow           fast (null)

fast 已经是 null，不需要同时移动

删除 slow.next:
slow.next = slow.next.next = 2

dummy → 2 → null

返回 dummy.next = 2
```

如果没有虚拟头节点，这种情况需要特殊处理。

## 复杂度分析

**时间复杂度：O(n)**
- 只遍历链表一次

**空间复杂度：O(1)**
- 只用了几个指针变量

## 边界情况

```javascript
// 只有一个节点，删除它
removeNthFromEnd([1], 1)  // []

// 删除最后一个节点（倒数第1个）
removeNthFromEnd([1, 2], 1)  // [1]

// 删除头节点（倒数第n个，n=链表长度）
removeNthFromEnd([1, 2], 2)  // [2]
```

## 常见误区

**误区一：fast 先走 n 步而不是 n+1 步**

```javascript
// ❌ 错误
for (let i = 0; i < n; i++) {
    fast = fast.next;
}
// slow 会停在待删除节点上，而不是前一个
```

**误区二：忘记虚拟头节点**

```javascript
// ❌ 删除头节点时会出错
let fast = head;
let slow = head;
// ...
slow.next = slow.next.next;
// 如果要删除的是 head，slow 就是 head，没有"前一个节点"
```

## 小结

这道题的核心技巧：

1. **快慢指针保持 n+1 的距离**：让慢指针停在待删除节点的前一个位置
2. **虚拟头节点**：统一处理删除头节点的情况

快慢指针的精髓是**利用距离差**。两个指针保持固定距离，当一个到达终点，另一个就到达了目标位置。

这个技巧还可以用于：
- 找链表中点（快走两步，慢走一步）
- 找倒数第 k 个节点（快先走 k 步）
- 判断链表是否有环（快走两步追慢指针）
