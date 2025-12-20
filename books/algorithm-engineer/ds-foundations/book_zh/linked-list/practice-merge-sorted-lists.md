# 实战：合并两个有序链表

把两个有序链表合并成一个有序链表，这是归并排序的核心操作。

## 题目描述

> **LeetCode 21. 合并两个有序链表**
>
> 将两个升序链表合并为一个新的升序链表并返回。新链表是通过拼接给定的两个链表的所有节点组成的。

**示例**：

```
输入：l1 = [1,2,4], l2 = [1,3,4]
输出：[1,1,2,3,4,4]
```

## 解法一：迭代

每次比较两个链表的头节点，取较小的那个接到结果链表上。

```javascript
function mergeTwoLists(l1, l2) {
    const dummy = new ListNode(0);
    let curr = dummy;
    
    while (l1 !== null && l2 !== null) {
        if (l1.val <= l2.val) {
            curr.next = l1;
            l1 = l1.next;
        } else {
            curr.next = l2;
            l2 = l2.next;
        }
        curr = curr.next;
    }
    
    // 连接剩余部分
    curr.next = l1 !== null ? l1 : l2;
    
    return dummy.next;
}
```

### 执行过程

```
l1: 1 → 2 → 4
l2: 1 → 3 → 4

比较 1 vs 1: 取 l1 的 1，结果：1
比较 2 vs 1: 取 l2 的 1，结果：1 → 1
比较 2 vs 3: 取 l1 的 2，结果：1 → 1 → 2
比较 4 vs 3: 取 l2 的 3，结果：1 → 1 → 2 → 3
比较 4 vs 4: 取 l1 的 4，结果：1 → 1 → 2 → 3 → 4
l1 为空，连接 l2 剩余：1 → 1 → 2 → 3 → 4 → 4
```

### 复杂度

- **时间**：O(m + n)，每个节点访问一次
- **空间**：O(1)，只用了几个指针

## 解法二：递归

递归的思路：比较两个头节点，取较小的那个，然后递归合并剩下的部分。

```javascript
function mergeTwoLists(l1, l2) {
    if (l1 === null) return l2;
    if (l2 === null) return l1;
    
    if (l1.val <= l2.val) {
        l1.next = mergeTwoLists(l1.next, l2);
        return l1;
    } else {
        l2.next = mergeTwoLists(l1, l2.next);
        return l2;
    }
}
```

### 执行过程

```
mergeTwoLists([1,2,4], [1,3,4])
  1 <= 1，取 l1 的 1
  1.next = mergeTwoLists([2,4], [1,3,4])
    2 > 1，取 l2 的 1
    1.next = mergeTwoLists([2,4], [3,4])
      2 < 3，取 l1 的 2
      2.next = mergeTwoLists([4], [3,4])
        4 > 3，取 l2 的 3
        3.next = mergeTwoLists([4], [4])
          4 <= 4，取 l1 的 4
          4.next = mergeTwoLists(null, [4])
            return [4]
          return 4 → 4
        return 3 → 4 → 4
      return 2 → 3 → 4 → 4
    return 1 → 2 → 3 → 4 → 4
  return 1 → 1 → 2 → 3 → 4 → 4
return 1 → 1 → 2 → 3 → 4 → 4
```

### 复杂度

- **时间**：O(m + n)
- **空间**：O(m + n)，递归调用栈

## 两种方法对比

| 方法 | 时间 | 空间 | 特点 |
|-----|------|------|------|
| 迭代 | O(m+n) | O(1) | 推荐，空间更优 |
| 递归 | O(m+n) | O(m+n) | 代码简洁 |

## 本章小结

合并两个有序链表是链表的基础操作：

1. **迭代法**：比较 + 接入 + 移动指针
2. **递归法**：比较 + 递归处理剩余
3. **虚拟头节点**：简化边界处理

这道题是"合并 K 个有序链表"的基础，也是归并排序的核心步骤。
