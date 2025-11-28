# 实战：两数相加

想象你在做一道竖式加法：把两个数从个位开始逐位相加，遇到进位就往高位进一。今天我们用链表来实现这个过程——两数相加。

## 问题描述

给你两个非空链表，表示两个非负整数。它们每位数字都是**逆序存储**的，并且每个节点只能存储一位数字。请你将两个数相加，并以相同形式返回一个表示和的链表。

**示例**：
```
输入:
  l1: 2 → 4 → 3  (表示 342)
  l2: 5 → 6 → 4  (表示 465)
输出:
  7 → 0 → 8  (表示 807)

计算过程:
  342
+ 465
-----
  807
```

**为什么是逆序存储？**

这是一个精心设计：逆序存储使得链表头就是个位，我们可以从头开始遍历，正好对应从个位开始相加。如果是正序存储，我们要么需要先反转链表，要么需要知道链表长度来对齐位数。

## 思路分析

这道题的核心就是**模拟竖式加法**：

1. 同时遍历两个链表，逐位相加
2. 处理进位
3. 把结果存入新链表

关键点：
- 两个链表可能长度不同
- 最后可能还有进位需要处理

## 完整实现

```javascript
/**
 * @param {ListNode} l1
 * @param {ListNode} l2
 * @return {ListNode}
 */
function addTwoNumbers(l1, l2) {
    const dummy = new ListNode(0);
    let current = dummy;
    let carry = 0;  // 进位
    
    // 只要还有数字或进位，就继续
    while (l1 || l2 || carry) {
        // 取当前位的值，如果链表已空则为0
        const val1 = l1 ? l1.val : 0;
        const val2 = l2 ? l2.val : 0;
        
        // 计算当前位的和
        const sum = val1 + val2 + carry;
        
        // 更新进位
        carry = Math.floor(sum / 10);
        
        // 创建新节点，值为sum的个位
        current.next = new ListNode(sum % 10);
        current = current.next;
        
        // 移动指针
        if (l1) l1 = l1.next;
        if (l2) l2 = l2.next;
    }
    
    return dummy.next;
}
```

## 执行过程图解

以`342 + 465 = 807`为例：

**初始状态**：
```
l1: 2 → 4 → 3
l2: 5 → 6 → 4
carry: 0
result: dummy →
```

**第一轮（个位）**：
```
val1 = 2, val2 = 5
sum = 2 + 5 + 0 = 7
carry = 7 / 10 = 0
新节点值 = 7 % 10 = 7

l1: 4 → 3
l2: 6 → 4
carry: 0
result: dummy → 7
```

**第二轮（十位）**：
```
val1 = 4, val2 = 6
sum = 4 + 6 + 0 = 10
carry = 10 / 10 = 1
新节点值 = 10 % 10 = 0

l1: 3
l2: 4
carry: 1
result: dummy → 7 → 0
```

**第三轮（百位）**：
```
val1 = 3, val2 = 4
sum = 3 + 4 + 1 = 8
carry = 8 / 10 = 0
新节点值 = 8 % 10 = 8

l1: null
l2: null
carry: 0
result: dummy → 7 → 0 → 8
```

**循环结束**：l1、l2都为null，carry为0

**最终结果**：`7 → 0 → 8`（表示807）

## 处理进位的边界情况

**例：99 + 1 = 100**
```
l1: 9 → 9  (99)
l2: 1       (1)

第一轮: 9 + 1 + 0 = 10, carry = 1, 节点值 = 0
第二轮: 9 + 0 + 1 = 10, carry = 1, 节点值 = 0
第三轮: 0 + 0 + 1 = 1,  carry = 0, 节点值 = 1

结果: 0 → 0 → 1 (100)
```

注意第三轮：两个链表都为空了，但carry还是1，所以循环继续执行，创建了最高位的1。

这就是为什么循环条件是`while (l1 || l2 || carry)`——不能漏掉最后的进位！

## 代码优化：使用可选链

JavaScript的可选链运算符可以让代码更简洁：

```javascript
function addTwoNumbers(l1, l2) {
    const dummy = new ListNode(0);
    let current = dummy;
    let carry = 0;
    
    while (l1 || l2 || carry) {
        const sum = (l1?.val || 0) + (l2?.val || 0) + carry;
        carry = Math.floor(sum / 10);
        current.next = new ListNode(sum % 10);
        current = current.next;
        
        l1 = l1?.next;
        l2 = l2?.next;
    }
    
    return dummy.next;
}
```

`l1?.val`在l1为null时返回undefined，`undefined || 0`得到0。

## 边界情况

| 输入 | 说明 | 结果 |
|------|------|------|
| `[0], [0]` | 0 + 0 | `[0]` |
| `[9,9,9], [1]` | 999 + 1 = 1000 | `[0,0,0,1]` |
| `[2,4,3], [5,6,4]` | 342 + 465 = 807 | `[7,0,8]` |
| `[1], [9,9,9]` | 长度不同 | `[0,0,0,1]` |

## 复杂度分析

**时间复杂度：O(max(m, n))**
- m和n分别是两个链表的长度
- 遍历较长的那个链表

**空间复杂度：O(max(m, n))**
- 结果链表的长度最多为max(m, n) + 1（考虑进位）

## 变体问题

**问题**：如果链表是正序存储（高位在前）怎么办？

**方案**：
1. 先反转两个链表，计算，再反转结果
2. 使用栈存储两个链表的值，然后从栈顶开始相加

```javascript
// 使用栈的方案
function addTwoNumbers(l1, l2) {
    const stack1 = [];
    const stack2 = [];
    
    // 入栈
    while (l1) {
        stack1.push(l1.val);
        l1 = l1.next;
    }
    while (l2) {
        stack2.push(l2.val);
        l2 = l2.next;
    }
    
    let carry = 0;
    let result = null;
    
    // 从栈顶（个位）开始相加
    while (stack1.length || stack2.length || carry) {
        const sum = (stack1.pop() || 0) + (stack2.pop() || 0) + carry;
        carry = Math.floor(sum / 10);
        
        // 头插法构建结果链表
        const node = new ListNode(sum % 10);
        node.next = result;
        result = node;
    }
    
    return result;
}
```

## 小结

两数相加是链表与数学运算结合的经典题目，核心技巧：

1. **虚拟头节点**：简化链表构建
2. **统一处理**：用`val || 0`处理链表长度不同的情况
3. **不忘进位**：循环条件包含carry，避免漏掉最高位进位

这道题的思路清晰，代码简洁，是面试中的高频题目。掌握它，你就掌握了链表和数值运算结合的基本模式。

下一章，我们来挑战链表排序——如何在O(n log n)时间和O(1)空间内对链表排序。
