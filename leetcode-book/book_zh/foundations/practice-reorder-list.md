# 实战：重排链表

这是链表部分的收官之战。这道题综合运用了我们学过的三大链表技巧：找中点、反转链表、合并链表。如果你能独立解决这道题，说明你已经完全掌握了链表的核心操作。

## 问题描述

给定一个单链表`L: L0 → L1 → … → Ln-1 → Ln`，将其重新排列为`L0 → Ln → L1 → Ln-1 → L2 → Ln-2 → …`

**注意**：不能只是单纯地改变节点内部的值，而是需要实际的节点交换。

**示例1**：
```
输入: 1 → 2 → 3 → 4
输出: 1 → 4 → 2 → 3
```

**示例2**：
```
输入: 1 → 2 → 3 → 4 → 5
输出: 1 → 5 → 2 → 4 → 3
```

观察规律：从头取一个，从尾取一个，交替进行。但链表不能从尾部访问，怎么办？

## 思路分析

### 方法一：用数组辅助

最直观的方法：把链表转成数组，双指针重建链表。

```javascript
function reorderList(head) {
    if (!head || !head.next) return;
    
    // 存入数组
    const nodes = [];
    let curr = head;
    while (curr) {
        nodes.push(curr);
        curr = curr.next;
    }
    
    // 双指针重建
    let left = 0, right = nodes.length - 1;
    while (left < right) {
        nodes[left].next = nodes[right];
        left++;
        if (left === right) break;
        nodes[right].next = nodes[left];
        right--;
    }
    nodes[left].next = null;
}
```

时间O(n)，空间O(n)。能否做到O(1)空间？

### 方法二：三步走策略

核心洞察：重排后的链表是**前半部分**和**反转后的后半部分**交替合并的结果。

```
原链表:    1 → 2 → 3 → 4 → 5
前半部分:  1 → 2 → 3
后半部分:  4 → 5
反转后:    5 → 4
交替合并:  1 → 5 → 2 → 4 → 3
```

**三步走**：
1. **找中点**：用快慢指针
2. **反转后半部分**：标准的链表反转
3. **交替合并**：两个链表穿插连接

## 完整实现

```javascript
/**
 * @param {ListNode} head
 * @return {void} Do not return anything, modify head in-place instead.
 */
function reorderList(head) {
    if (!head || !head.next) return;
    
    // 第一步：找中点
    let slow = head, fast = head;
    while (fast.next && fast.next.next) {
        slow = slow.next;
        fast = fast.next.next;
    }
    
    // 第二步：反转后半部分
    let second = reverseList(slow.next);
    slow.next = null;  // 断开前后两部分
    
    // 第三步：交替合并
    let first = head;
    while (second) {
        // 保存下一个节点
        const tmp1 = first.next;
        const tmp2 = second.next;
        
        // 交替连接
        first.next = second;
        second.next = tmp1;
        
        // 移动指针
        first = tmp1;
        second = tmp2;
    }
}

function reverseList(head) {
    let prev = null;
    while (head) {
        const next = head.next;
        head.next = prev;
        prev = head;
        head = next;
    }
    return prev;
}
```

## 执行过程图解

以`1 → 2 → 3 → 4 → 5`为例：

### 第一步：找中点

```
快慢指针移动:
初始: 1 → 2 → 3 → 4 → 5
      ↑
    s,f

一轮: 1 → 2 → 3 → 4 → 5
          ↑       ↑
          s       f

二轮: 1 → 2 → 3 → 4 → 5
              ↑           (f.next.next = null，停止)
              s

slow指向3（中点）
```

### 第二步：反转后半部分

```
后半部分: 4 → 5
反转过程:
  4 → 5 → null
  prev=null, curr=4
  
  null ← 4   5 → null
         ↑
       prev  curr=5
  
  null ← 4 ← 5
              ↑
            prev (返回)

反转后: 5 → 4

断开前后部分:
前半: 1 → 2 → 3 → null
后半: 5 → 4 → null
```

### 第三步：交替合并

```
first: 1 → 2 → 3
second: 5 → 4

第一轮:
  tmp1 = first.next = 2
  tmp2 = second.next = 4
  first.next = second → 1 → 5
  second.next = tmp1 → 5 → 2
  
  当前: 1 → 5 → 2 → 3
  first = 2, second = 4

第二轮:
  tmp1 = first.next = 3
  tmp2 = second.next = null
  first.next = second → 2 → 4
  second.next = tmp1 → 4 → 3
  
  当前: 1 → 5 → 2 → 4 → 3
  first = 3, second = null

循环结束(second = null)

最终: 1 → 5 → 2 → 4 → 3
```

## 偶数长度的情况

以`1 → 2 → 3 → 4`为例：

**找中点**：
```
1 → 2 → 3 → 4
    ↑       ↑
   slow    fast (fast.next = null，停止)

slow指向2
```

**反转后半部分**：
```
后半: 3 → 4
反转: 4 → 3

前半: 1 → 2 → null
后半: 4 → 3 → null
```

**交替合并**：
```
第一轮: 1 → 4 → 2
第二轮: 1 → 4 → 2 → 3

最终: 1 → 4 → 2 → 3
```

## 为什么这样做是正确的？

让我们验证一下规律：

**5个节点（奇数）**：
```
原: L0 → L1 → L2 → L3 → L4
前半: L0 → L1 → L2
后半反转: L4 → L3
交替: L0 → L4 → L1 → L3 → L2 ✓
```

**4个节点（偶数）**：
```
原: L0 → L1 → L2 → L3
前半: L0 → L1
后半反转: L3 → L2
交替: L0 → L3 → L1 → L2 ✓
```

完美符合题目要求！

## 边界情况

| 输入 | 说明 | 结果 |
|------|------|------|
| `[]` | 空链表 | 不变 |
| `[1]` | 单节点 | `[1]` |
| `[1,2]` | 两节点 | `[1,2]` |
| `[1,2,3]` | 三节点 | `[1,3,2]` |
| `[1,2,3,4]` | 四节点 | `[1,4,2,3]` |

## 复杂度分析

**时间复杂度：O(n)**
- 找中点：O(n)
- 反转：O(n/2)
- 合并：O(n/2)
- 总计：O(n)

**空间复杂度：O(1)**
- 只使用了几个指针变量
- 完全原地操作

## 技能清单

这道题用到了链表的所有核心技巧：

1. **快慢指针找中点**：精准分割链表
2. **链表反转**：让后半部分可以从"尾部"开始访问
3. **链表合并**：交替连接两个链表
4. **虚拟头节点思想**：虽然没显式使用，但断开操作体现了这种思维

## 常见错误

**错误1：忘记断开链表**
```javascript
// 错误：不断开会形成环
let second = reverseList(slow.next);
// 缺少: slow.next = null;
```

**错误2：合并时指针丢失**
```javascript
// 错误：没有提前保存next
first.next = second;
second.next = first.next;  // first.next已经变了！
```

## 小结

重排链表是链表技巧的大综合，三步走策略清晰明了：

1. **找中点**：快慢指针，老朋友了
2. **反转后半**：让"尾"变"头"
3. **交替合并**：按规则穿插连接

这道题的精髓在于：**通过反转后半部分，把从尾部取节点的操作变成了从头部取节点**。这是一种"化不可能为可能"的巧妙转换。

至此，我们完成了链表部分的所有内容。你已经掌握了：
- 链表的基本操作（插入、删除、遍历）
- 快慢指针技巧（找中点、检测环、找倒数第N个）
- 链表反转（迭代和递归）
- 虚拟头节点
- 链表合并与排序

这些技巧不仅在面试中频繁出现，在实际开发中也有广泛应用。下一部分，我们将进入栈与队列的世界，探索另一类重要的数据结构。
