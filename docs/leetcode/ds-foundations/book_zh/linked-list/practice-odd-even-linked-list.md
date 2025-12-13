# 实战：奇偶链表

把奇数位置的节点放前面，偶数位置的节点放后面。

## 题目描述

> **LeetCode 328. 奇偶链表**
>
> 给定单链表的头节点 head，将所有索引为奇数的节点和索引为偶数的节点分别组合在一起，然后返回重新排序的列表。
>
> 第一个节点的索引被认为是奇数，第二个节点的索引为偶数，以此类推。

**示例**：

```
输入: head = [1,2,3,4,5]
输出: [1,3,5,2,4]

输入: head = [2,1,3,5,6,4,7]
输出: [2,3,6,7,1,5,4]
```

**要求**：O(1) 空间复杂度，O(n) 时间复杂度。

## 解法

维护两个指针 odd 和 even，分别指向奇数位和偶数位节点，交替连接。

```javascript
function oddEvenList(head) {
    if (head === null || head.next === null) {
        return head;
    }
    
    let odd = head;           // 奇数位指针
    let even = head.next;     // 偶数位指针
    let evenHead = even;      // 保存偶数链表头
    
    while (even !== null && even.next !== null) {
        odd.next = even.next;  // 奇数位连接下一个奇数位
        odd = odd.next;
        
        even.next = odd.next;  // 偶数位连接下一个偶数位
        even = even.next;
    }
    
    odd.next = evenHead;  // 奇数链表末尾连接偶数链表头
    
    return head;
}
```

### 执行过程

```
原链表：1 → 2 → 3 → 4 → 5 → null
位置：   1   2   3   4   5

初始状态：
odd = 1, even = 2, evenHead = 2

Step 1:
odd.next = 3 (跳过 2)
odd = 3
even.next = 4 (跳过 3)
even = 4

链表状态：
奇数链：1 → 3
偶数链：2 → 4

Step 2:
odd.next = 5 (跳过 4)
odd = 5
even.next = null (5 后面没有了)
even = null

链表状态：
奇数链：1 → 3 → 5
偶数链：2 → 4

连接：
odd.next = evenHead
1 → 3 → 5 → 2 → 4

结果：[1,3,5,2,4]
```

### 为什么循环条件是 `even !== null && even.next !== null`？

- `even !== null`：确保偶数链表还有节点
- `even.next !== null`：确保还有下一个奇数位节点

如果链表有偶数个节点，even 最后指向最后一个节点。
如果链表有奇数个节点，even 最后指向 null。

## 复杂度

- **时间**：O(n)
- **空间**：O(1)

## 本章小结

奇偶链表展示了**原地分离与合并**的技巧：

1. **双指针分离**：odd 和 even 分别处理奇偶位
2. **保存头节点**：evenHead 用于最后的连接
3. **交替推进**：每次循环处理一对奇偶节点

这道题和分隔链表类似，都是"分离再合并"的思路，但这里是原地操作，不需要额外链表。
