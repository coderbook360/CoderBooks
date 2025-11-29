# 实战：排序链表（分治版）

用分治法对链表进行归并排序。

## 问题描述

给你链表的头结点`head`，请将其按**升序**排列并返回排序后的链表。

要求在O(n log n)时间复杂度和O(1)空间复杂度下完成。

## 思路分析

### 为什么链表适合归并排序？

数组归并需要O(n)额外空间来合并，但链表可以原地合并（只需修改指针）。

### 分治步骤

1. **找中点**：用快慢指针找到链表中点
2. **分割**：从中点断开，分成两个链表
3. **递归排序**：分别排序两半
4. **合并**：合并两个有序链表

## 代码实现

```javascript
function sortList(head) {
    if (!head || !head.next) {
        return head;
    }
    
    // 找中点并分割
    const mid = findMiddle(head);
    const rightHead = mid.next;
    mid.next = null;  // 断开
    
    // 递归排序
    const left = sortList(head);
    const right = sortList(rightHead);
    
    // 合并
    return merge(left, right);
}

function findMiddle(head) {
    let slow = head, fast = head.next;
    
    while (fast && fast.next) {
        slow = slow.next;
        fast = fast.next.next;
    }
    
    return slow;
}

function merge(l1, l2) {
    const dummy = { next: null };
    let curr = dummy;
    
    while (l1 && l2) {
        if (l1.val <= l2.val) {
            curr.next = l1;
            l1 = l1.next;
        } else {
            curr.next = l2;
            l2 = l2.next;
        }
        curr = curr.next;
    }
    
    curr.next = l1 || l2;
    
    return dummy.next;
}
```

## 图解

```
链表: 4 -> 2 -> 1 -> 3

找中点: slow 停在 2
分割: 4 -> 2 | 1 -> 3

递归左边:
4 -> 2
找中点: 4
分割: 4 | 2
合并: 2 -> 4

递归右边:
1 -> 3
找中点: 1
分割: 1 | 3
合并: 1 -> 3

合并总结果:
2 -> 4 | 1 -> 3
结果: 1 -> 2 -> 3 -> 4
```

## 为什么`fast = head.next`？

```javascript
let slow = head, fast = head.next;
```

这确保了对于偶数长度的链表，`slow`停在前半部分的最后一个节点。

如果`fast = head`：
- 链表 [1, 2, 3, 4]
- slow会停在3，分割成 [1, 2, 3] 和 [4]，不均匀

用`fast = head.next`：
- slow停在2，分割成 [1, 2] 和 [3, 4]，均匀

## 空间复杂度分析

### 递归版本

递归深度为O(log n)，栈空间为O(log n)。

### 真正的O(1)空间

需要自底向上的迭代归并：

```javascript
function sortList(head) {
    if (!head || !head.next) return head;
    
    // 计算链表长度
    let length = 0;
    let node = head;
    while (node) {
        length++;
        node = node.next;
    }
    
    const dummy = { next: head };
    
    // 每次合并的子链表长度
    for (let size = 1; size < length; size *= 2) {
        let curr = dummy.next;
        let tail = dummy;
        
        while (curr) {
            const left = curr;
            const right = split(left, size);
            curr = split(right, size);
            
            const merged = merge(left, right);
            tail.next = merged[0];
            tail = merged[1];
        }
    }
    
    return dummy.next;
}

function split(head, n) {
    let prev = null;
    while (head && n > 0) {
        prev = head;
        head = head.next;
        n--;
    }
    if (prev) prev.next = null;
    return head;
}

function merge(l1, l2) {
    const dummy = { next: null };
    let curr = dummy;
    
    while (l1 && l2) {
        if (l1.val <= l2.val) {
            curr.next = l1;
            l1 = l1.next;
        } else {
            curr.next = l2;
            l2 = l2.next;
        }
        curr = curr.next;
    }
    
    curr.next = l1 || l2;
    while (curr.next) curr = curr.next;
    
    return [dummy.next, curr];  // 返回头和尾
}
```

## 复杂度分析

**递归版本**：
- 时间：O(n log n)
- 空间：O(log n)，递归栈

**迭代版本**：
- 时间：O(n log n)
- 空间：O(1)

## 小结

链表排序展示了分治在链表上的应用：
1. 快慢指针找中点
2. 断开链表分成两半
3. 递归排序后合并
4. 迭代版本可以达到O(1)空间
