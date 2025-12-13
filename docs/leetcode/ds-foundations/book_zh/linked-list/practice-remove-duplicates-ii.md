# 实战：删除排序链表中的重复元素 II

上一章是保留一个重复节点，这一章是**删除所有**重复节点。

## 题目描述

> **LeetCode 82. 删除排序链表中的重复元素 II**
>
> 给定一个已排序的链表的头 head，删除原始链表中**所有重复数字的节点**，只留下不同的数字。返回已排序的链表。

**示例**：

```
输入：head = [1,2,3,3,4,4,5]
输出：[1,2,5]

输入：head = [1,1,1,2,3]
输出：[2,3]
```

## 问题分析

与上一题的区别：
- 上一题：重复的保留一个 → [1,1,2] → [1,2]
- 本题：重复的全部删除 → [1,1,2] → [2]

因为头节点可能被删除，需要使用虚拟头节点。

## 解法

```javascript
function deleteDuplicates(head) {
    const dummy = new ListNode(0, head);
    let prev = dummy;
    
    while (prev.next !== null) {
        let curr = prev.next;
        
        // 检查 curr 是否有重复
        if (curr.next !== null && curr.val === curr.next.val) {
            // 找到所有重复值的最后一个
            while (curr.next !== null && curr.val === curr.next.val) {
                curr = curr.next;
            }
            // 跳过所有重复节点
            prev.next = curr.next;
        } else {
            // curr 没有重复，移动 prev
            prev = prev.next;
        }
    }
    
    return dummy.next;
}
```

### 执行过程

```
head = [1,2,3,3,4,4,5]

初始：
dummy → 1 → 2 → 3 → 3 → 4 → 4 → 5 → null
  ↑
 prev

Step 1: curr=1, 下一个是 2，不重复
        prev 移动到 1
        dummy → 1 → 2 → 3 → 3 → 4 → 4 → 5
                ↑
               prev

Step 2: curr=2, 下一个是 3，不重复
        prev 移动到 2
        dummy → 1 → 2 → 3 → 3 → 4 → 4 → 5
                    ↑
                   prev

Step 3: curr=3, 下一个也是 3，重复！
        找到所有 3：curr 移动到最后一个 3
        跳过所有 3：prev.next = curr.next = 4
        dummy → 1 → 2 → 4 → 4 → 5
                    ↑
                   prev

Step 4: curr=4, 下一个也是 4，重复！
        跳过所有 4：prev.next = 5
        dummy → 1 → 2 → 5
                    ↑
                   prev

Step 5: curr=5, 下一个是 null，不重复
        prev 移动到 5，循环结束

结果：[1,2,5]
```

### 关键点

1. **虚拟头节点**：因为头节点可能被删除
2. **prev 的作用**：指向最后一个确定保留的节点
3. **内层 while**：找到所有重复值的最后一个
4. **不移动 prev**：发现重复时只修改 prev.next，不移动 prev

## 复杂度

- **时间**：O(n)
- **空间**：O(1)

## 与上一题的对比

| 题目 | 重复处理 | 需要虚拟头节点 | 关键操作 |
|-----|---------|--------------|---------|
| 83 题 | 保留一个 | 不需要 | 跳过相邻重复 |
| 82 题 | 全部删除 | 需要 | 找到所有重复后跳过 |

## 本章小结

删除排序链表中的重复元素 II：

1. **虚拟头节点**：头节点可能被删除
2. **双层循环**：外层遍历，内层找所有重复
3. **prev 不动**：发现重复时只更新 prev.next

这道题比上一题复杂，主要在于"全部删除"需要更精细的指针控制。
