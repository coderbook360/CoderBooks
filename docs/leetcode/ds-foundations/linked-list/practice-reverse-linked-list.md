# 实战：反转链表

这是链表最经典的题目，也是面试高频题。

## 题目描述

> **LeetCode 206. 反转链表**
>
> 给你单链表的头节点 head，请你反转链表，并返回反转后的链表。

**示例**：

```
输入：head = [1,2,3,4,5]
输出：[5,4,3,2,1]

输入：head = []
输出：[]
```

## 解法一：迭代法

核心思想：用三个指针 prev、curr、next，逐个节点反转指向。

```javascript
function reverseList(head) {
    let prev = null;
    let curr = head;
    
    while (curr !== null) {
        // 1. 保存下一个节点
        const next = curr.next;
        // 2. 反转当前节点的指向
        curr.next = prev;
        // 3. 移动指针
        prev = curr;
        curr = next;
    }
    
    return prev;  // prev 指向新的头节点
}
```

### 执行过程

```
初始状态：
null   1 → 2 → 3 → 4 → null
prev  curr

Step 1: 反转节点 1
null ← 1    2 → 3 → 4 → null
      prev curr

Step 2: 反转节点 2
null ← 1 ← 2    3 → 4 → null
          prev curr

Step 3: 反转节点 3
null ← 1 ← 2 ← 3    4 → null
              prev curr

Step 4: 反转节点 4
null ← 1 ← 2 ← 3 ← 4    null
                  prev  curr

循环结束：curr = null，返回 prev
```

### 复杂度

- **时间**：O(n)，每个节点访问一次
- **空间**：O(1)，只用了几个指针

## 解法二：递归法

递归的思路：先递归反转后面的链表，再处理当前节点。

```javascript
function reverseList(head) {
    // 递归终止条件
    if (head === null || head.next === null) {
        return head;
    }
    
    // 递归反转后续链表
    const newHead = reverseList(head.next);
    
    // 反转当前节点
    head.next.next = head;
    head.next = null;
    
    return newHead;
}
```

### 执行过程

```
reverseList(1)
  → reverseList(2)
    → reverseList(3)
      → reverseList(4)
        → return 4（终止条件）
      ← 返回 4
      此时：4 → null，head=3
      3.next.next = 3 → 4.next = 3 → 4 → 3
      3.next = null → 4 → 3 → null
      返回 4
    ← 返回 4
    此时：4 → 3 → null，head=2
    2.next.next = 2 → 3.next = 2 → 4 → 3 → 2
    2.next = null → 4 → 3 → 2 → null
    返回 4
  ← 返回 4
  此时：4 → 3 → 2 → null，head=1
  1.next.next = 1 → 2.next = 1 → 4 → 3 → 2 → 1
  1.next = null → 4 → 3 → 2 → 1 → null
  返回 4
← 返回 4

最终结果：4 → 3 → 2 → 1 → null
```

关键理解：`head.next.next = head` 这句话。

假设 head = 3，head.next = 4：
- `head.next.next = head` 相当于 `4.next = 3`，让 4 指向 3
- `head.next = null` 断开 3 → 4 的原有连接

### 复杂度

- **时间**：O(n)
- **空间**：O(n)，递归调用栈

## 两种方法对比

| 方法 | 时间 | 空间 | 特点 |
|-----|------|------|------|
| 迭代 | O(n) | O(1) | 更省空间，推荐 |
| 递归 | O(n) | O(n) | 代码简洁，但有栈溢出风险 |

面试时优先用迭代法，因为空间复杂度更优。

## 本章小结

反转链表是链表操作的基础：

1. **迭代法**：三个指针 prev/curr/next，逐个反转
2. **递归法**：先递归到底，回溯时反转
3. **核心技巧**：保存 next 指针，避免断链

这道题的迭代解法是很多链表问题的基础，务必熟练掌握。
