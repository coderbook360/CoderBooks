# 实战：分隔链表

把链表分成两部分：小于 x 的节点在前，大于等于 x 的节点在后。

## 题目描述

> **LeetCode 86. 分隔链表**
>
> 给你一个链表的头节点 head 和一个特定值 x，请你对链表进行分隔，使得所有小于 x 的节点都出现在大于或等于 x 的节点之前。
>
> 你应当保留两个分区中每个节点的**初始相对位置**。

**示例**：

```
输入：head = [1,4,3,2,5,2], x = 3
输出：[1,2,2,4,3,5]

输入：head = [2,1], x = 2
输出：[1,2]
```

## 解法：双链表 + 合并

核心思想：
1. 创建两个虚拟链表：small（存放 < x 的节点）和 large（存放 >= x 的节点）
2. 遍历原链表，将每个节点分配到对应链表
3. 最后将两个链表连接起来

```javascript
function partition(head, x) {
    // 创建两个虚拟头节点
    const smallDummy = new ListNode(0);
    const largeDummy = new ListNode(0);
    
    let small = smallDummy;  // 小于 x 的链表尾指针
    let large = largeDummy;  // 大于等于 x 的链表尾指针
    
    let curr = head;
    while (curr !== null) {
        if (curr.val < x) {
            small.next = curr;
            small = small.next;
        } else {
            large.next = curr;
            large = large.next;
        }
        curr = curr.next;
    }
    
    // 断开 large 链表的尾部，防止成环
    large.next = null;
    // 连接两个链表
    small.next = largeDummy.next;
    
    return smallDummy.next;
}
```

### 执行过程

```
原链表：1 → 4 → 3 → 2 → 5 → 2, x = 3

遍历过程：
节点 1 (< 3): → small 链表
节点 4 (>= 3): → large 链表
节点 3 (>= 3): → large 链表
节点 2 (< 3): → small 链表
节点 5 (>= 3): → large 链表
节点 2 (< 3): → small 链表

结果：
small: dummy → 1 → 2 → 2
large: dummy → 4 → 3 → 5

合并：1 → 2 → 2 → 4 → 3 → 5
```

### 为什么要断开 large 尾部？

原链表中，节点 2 的 next 可能还指向某个节点。如果不断开，会形成错误的连接甚至环。

## 复杂度

- **时间**：O(n)
- **空间**：O(1)，只使用了常数个指针

## 本章小结

分隔链表展示了"分离再合并"的策略：

1. **双虚拟头节点**：分别收集两类节点
2. **尾插法**：保持原有相对顺序
3. **合并**：small 链表接 large 链表
4. **断尾**：防止成环

这种思路在很多链表重组问题中都有应用。
