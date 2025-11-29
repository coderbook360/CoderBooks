# 实战：合并两个有序链表

这道题来自 LeetCode 第 21 题，是链表操作的入门题，也是后续"合并 K 个有序链表"的基础。

## 题目描述

将两个升序链表合并为一个新的升序链表并返回。新链表是通过拼接给定的两个链表的所有节点组成的。

**示例**：

```
输入：l1 = [1,2,4], l2 = [1,3,4]
输出：[1,1,2,3,4,4]

输入：l1 = [], l2 = []
输出：[]

输入：l1 = [], l2 = [0]
输出：[0]
```

**链表节点定义**：

```javascript
function ListNode(val, next) {
    this.val = (val === undefined ? 0 : val);
    this.next = (next === undefined ? null : next);
}
```

## 分析问题

两个链表都是**有序**的，这意味着我们可以从头开始，每次比较两个链表的当前节点，选择较小的那个加入结果链表。

这就像两队人按身高排队，要合并成一队：
1. 比较两队最前面的人
2. 较矮的那个出列，加入新队伍
3. 重复直到某一队为空
4. 把另一队剩余的人全部加入新队伍

## 迭代解法

```javascript
function mergeTwoLists(list1, list2) {
    // 创建虚拟头节点，简化边界处理
    const dummy = new ListNode(-1);
    let current = dummy;
    
    // 同时遍历两个链表
    while (list1 !== null && list2 !== null) {
        if (list1.val <= list2.val) {
            current.next = list1;
            list1 = list1.next;
        } else {
            current.next = list2;
            list2 = list2.next;
        }
        current = current.next;
    }
    
    // 连接剩余部分
    current.next = list1 !== null ? list1 : list2;
    
    // 返回真正的头节点
    return dummy.next;
}
```

## 为什么用虚拟头节点

如果不用虚拟头节点，代码会变得复杂：

```javascript
// 不用虚拟头节点的写法（更复杂）
function mergeTwoListsNoD(list1, list2) {
    if (list1 === null) return list2;
    if (list2 === null) return list1;
    
    let head, current;
    
    // 先确定头节点
    if (list1.val <= list2.val) {
        head = list1;
        list1 = list1.next;
    } else {
        head = list2;
        list2 = list2.next;
    }
    current = head;
    
    // 然后合并剩余部分
    while (list1 !== null && list2 !== null) {
        // ...
    }
    
    return head;
}
```

虚拟头节点（dummy node）是链表操作中的常用技巧：
- 不需要特殊处理头节点
- 代码更简洁统一
- 最后返回 `dummy.next` 即可

## 图解执行过程

以 `list1 = [1,2,4]`, `list2 = [1,3,4]` 为例：

```
初始状态：
list1: 1 → 2 → 4 → null
list2: 1 → 3 → 4 → null
dummy: -1 → null

步骤 1：比较 1 和 1，选 list1 的 1
list1: 2 → 4 → null
list2: 1 → 3 → 4 → null
dummy: -1 → 1 → ...

步骤 2：比较 2 和 1，选 list2 的 1
list1: 2 → 4 → null
list2: 3 → 4 → null
dummy: -1 → 1 → 1 → ...

步骤 3：比较 2 和 3，选 2
list1: 4 → null
list2: 3 → 4 → null
dummy: -1 → 1 → 1 → 2 → ...

步骤 4：比较 4 和 3，选 3
list1: 4 → null
list2: 4 → null
dummy: -1 → 1 → 1 → 2 → 3 → ...

步骤 5：比较 4 和 4，选 list1 的 4
list1: null
list2: 4 → null
dummy: -1 → 1 → 1 → 2 → 3 → 4 → ...

步骤 6：list1 为空，连接 list2 剩余部分
dummy: -1 → 1 → 1 → 2 → 3 → 4 → 4 → null

返回 dummy.next: [1,1,2,3,4,4]
```

## 递归解法

合并问题也可以用递归来思考：

- 如果 list1 为空，返回 list2
- 如果 list2 为空，返回 list1
- 否则，比较两个头节点，选择较小的那个作为结果头节点，其 next 指向剩余部分的合并结果

```javascript
function mergeTwoLists(list1, list2) {
    // 基本情况
    if (list1 === null) return list2;
    if (list2 === null) return list1;
    
    // 递归情况
    if (list1.val <= list2.val) {
        list1.next = mergeTwoLists(list1.next, list2);
        return list1;
    } else {
        list2.next = mergeTwoLists(list1, list2.next);
        return list2;
    }
}
```

递归版本代码更简洁，但要注意：
- 时间复杂度相同，都是 O(n + m)
- 空间复杂度不同：递归是 O(n + m)（调用栈），迭代是 O(1)

## 复杂度分析

**迭代解法**：
- 时间复杂度：O(n + m)，每个节点访问一次
- 空间复杂度：O(1)，只用了几个指针

**递归解法**：
- 时间复杂度：O(n + m)
- 空间复杂度：O(n + m)，递归调用栈

## 边界情况

1. **两个链表都为空**：返回 null
2. **其中一个为空**：返回另一个
3. **长度不同**：较短的先遍历完，剩余部分直接连接
4. **有重复元素**：按顺序处理，不影响正确性

## 小结

这道题的核心是"归并"思想：
1. 两个有序序列从头开始比较
2. 每次取较小的元素
3. 直到某个序列为空
4. 连接剩余部分

虚拟头节点是链表操作的重要技巧，可以大大简化边界情况的处理。

下一章，我们来看字符串处理的基础题——"判断字符串是否为回文"。
