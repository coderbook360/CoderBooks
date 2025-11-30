# 实战：删除排序链表中的重复元素

有序链表去重：保留每个值的第一个节点。

## 题目描述

> **LeetCode 83. 删除排序链表中的重复元素**
>
> 给定一个已排序的链表的头 head，删除所有重复的元素，使每个元素只出现一次。返回已排序的链表。

**示例**：

```
输入：head = [1,1,2]
输出：[1,2]

输入：head = [1,1,2,3,3]
输出：[1,2,3]
```

## 解法

因为链表有序，重复元素一定相邻。遍历时跳过所有与当前节点值相同的后续节点。

```javascript
function deleteDuplicates(head) {
    if (head === null) return null;
    
    let curr = head;
    while (curr.next !== null) {
        if (curr.val === curr.next.val) {
            // 跳过重复节点
            curr.next = curr.next.next;
        } else {
            // 移动到下一个不同的节点
            curr = curr.next;
        }
    }
    
    return head;
}
```

### 执行过程

```
head = [1,1,2,3,3]

Step 1: curr=1, curr.next=1, 相等
        跳过第二个 1
        1 → 2 → 3 → 3
        ↑
       curr

Step 2: curr=1, curr.next=2, 不相等
        移动 curr
        1 → 2 → 3 → 3
            ↑
           curr

Step 3: curr=2, curr.next=3, 不相等
        移动 curr
        1 → 2 → 3 → 3
                ↑
               curr

Step 4: curr=3, curr.next=3, 相等
        跳过第二个 3
        1 → 2 → 3 → null
                ↑
               curr

结束：[1,2,3]
```

### 为什么重复时不移动 curr？

因为跳过一个节点后，`curr.next` 变成了新节点，还需要继续比较。

比如 `[1,1,1,2]`：
- curr=1, curr.next=1, 跳过 → `[1,1,2]`
- curr=1, curr.next=1, 继续跳过 → `[1,2]`
- curr=1, curr.next=2, 不相等，移动

如果跳过后立即移动 curr，就会漏掉连续的重复值。

## 复杂度

- **时间**：O(n)
- **空间**：O(1)

## 递归解法

```javascript
function deleteDuplicates(head) {
    if (head === null || head.next === null) {
        return head;
    }
    
    head.next = deleteDuplicates(head.next);
    return head.val === head.next.val ? head.next : head;
}
```

递归的思路：先递归处理后面的链表，然后检查当前节点和下一个节点是否重复。

## 本章小结

删除排序链表中的重复元素：

1. **利用有序性**：重复元素一定相邻
2. **跳过重复**：`curr.next = curr.next.next`
3. **注意循环**：重复时不移动指针

下一章学习进阶版：删除**所有**重复的节点，而不是保留一个。
