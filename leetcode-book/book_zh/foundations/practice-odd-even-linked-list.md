# 实战：奇偶链表

假设你在组织一场活动，参与者按到场顺序排成一列。现在你想让奇数位置的人（第1、3、5...个）站到一起，偶数位置的人（第2、4、6...个）站到另一边，且保持各自的相对顺序不变。这就是奇偶链表问题的本质。

## 问题描述

给定单链表的头节点`head`，将所有索引为奇数的节点和索引为偶数的节点分别组合在一起，然后返回重新排序的列表。

**注意**：这里的奇偶是指节点的位置（从1开始计数），而不是节点的值。

**示例1**：
```
输入: 1 → 2 → 3 → 4 → 5
输出: 1 → 3 → 5 → 2 → 4
解释: 奇数位置(1,3,5) + 偶数位置(2,4)
```

**示例2**：
```
输入: 2 → 1 → 3 → 5 → 6 → 4 → 7
输出: 2 → 3 → 6 → 7 → 1 → 5 → 4
解释: 奇数位置(2,3,6,7) + 偶数位置(1,5,4)
```

**要求**：
- 使用O(1)额外空间
- 时间复杂度O(n)
- 保持奇数节点和偶数节点的相对顺序

## 思路分析

### 朴素想法：新建两个链表

最直观的想法是创建两个新链表，遍历原链表时把奇数位置节点放一个链表，偶数位置放另一个，最后连接。

```javascript
// 朴素解法（需要额外空间）
function oddEvenList(head) {
    const oddDummy = new ListNode(0);
    const evenDummy = new ListNode(0);
    let odd = oddDummy;
    let even = evenDummy;
    
    let current = head;
    let index = 1;
    
    while (current) {
        if (index % 2 === 1) {
            odd.next = new ListNode(current.val);
            odd = odd.next;
        } else {
            even.next = new ListNode(current.val);
            even = even.next;
        }
        current = current.next;
        index++;
    }
    
    odd.next = evenDummy.next;
    return oddDummy.next;
}
```

这个方法能工作，但创建了新节点，空间复杂度是O(n)。能否原地操作？

### 优化：原地分离与连接

关键洞察：我们不需要创建新节点，只需要**调整现有节点的指针**。

用两个指针分别维护奇数链表和偶数链表的尾部，遍历时交替"摘取"节点：

```
原链表: 1 → 2 → 3 → 4 → 5

步骤1: 
odd指向1，even指向2
奇链表: 1
偶链表: 2

步骤2:
odd.next = even.next (3)
odd移动到3
even.next = odd.next (4)
even移动到4
奇链表: 1 → 3
偶链表: 2 → 4

步骤3:
odd.next = even.next (5)
odd移动到5
even.next = odd.next (null)
奇链表: 1 → 3 → 5
偶链表: 2 → 4

最后连接:
1 → 3 → 5 → 2 → 4
```

## 完整实现

```javascript
/**
 * @param {ListNode} head
 * @return {ListNode}
 */
function oddEvenList(head) {
    // 边界情况：空链表或只有一个节点
    if (!head || !head.next) {
        return head;
    }
    
    // odd指向第一个奇数位置节点
    let odd = head;
    // even指向第一个偶数位置节点
    let even = head.next;
    // 保存偶数链表的头，最后需要连接
    const evenHead = even;
    
    // 交替连接奇偶节点
    while (even && even.next) {
        // 奇数节点连接到下一个奇数节点
        odd.next = even.next;
        odd = odd.next;
        
        // 偶数节点连接到下一个偶数节点
        even.next = odd.next;
        even = even.next;
    }
    
    // 将奇数链表尾部连接到偶数链表头部
    odd.next = evenHead;
    
    return head;
}
```

## 执行过程图解

以`1 → 2 → 3 → 4 → 5`为例，详细展示每一步：

**初始化**：
```
1 → 2 → 3 → 4 → 5 → null
↑   ↑
odd even
evenHead = 2
```

**第一轮循环**：
```
条件: even(2) && even.next(3) ✓

操作:
odd.next = even.next → 1.next = 3
odd = odd.next       → odd指向3

3 → 4 → 5
↑
odd

even.next = odd.next → 2.next = 4
even = even.next     → even指向4

当前状态:
奇链: 1 → 3 → 4 → 5
偶链: 2 → 4 → 5 (2和奇链共享后续节点，但会被覆盖)

实际指针:
1 → 3 → 4 → 5
    ↑
   odd
2 → 4 → 5
    ↑
   even
```

**第二轮循环**：
```
条件: even(4) && even.next(5) ✓

操作:
odd.next = even.next → 3.next = 5
odd = odd.next       → odd指向5

even.next = odd.next → 4.next = null
even = even.next     → even = null

当前状态:
奇链: 1 → 3 → 5 → null
          ↑
         odd
偶链: 2 → 4 → null
          ↑
         even(null)
```

**第三轮循环**：
```
条件: even(null) ✗ 退出循环
```

**连接奇偶链表**：
```
odd.next = evenHead → 5.next = 2

最终结果:
1 → 3 → 5 → 2 → 4 → null
```

## 为什么用`even && even.next`作为循环条件？

这是一个精妙的设计，确保我们能处理奇数和偶数长度的链表：

**偶数长度（6个节点）**：
```
1 → 2 → 3 → 4 → 5 → 6
最后一轮: odd=5, even=6
even.next = null，退出循环
odd.next = evenHead 完成连接
```

**奇数长度（5个节点）**：
```
1 → 2 → 3 → 4 → 5
最后一轮: odd=5, even=null (even移动到null后退出)
odd.next = evenHead 完成连接
```

如果只用`even`作为条件，会在处理奇数长度链表时出错；如果只用`even.next`，会在偶数长度时漏掉最后一对。

## 边界情况

| 输入 | 分析 | 结果 |
|------|------|------|
| `[]` | 空链表直接返回 | `[]` |
| `[1]` | 单节点直接返回 | `[1]` |
| `[1,2]` | 两节点，奇+偶 | `[1,2]` |
| `[1,2,3]` | 奇(1,3)+偶(2) | `[1,3,2]` |
| `[1,2,3,4]` | 奇(1,3)+偶(2,4) | `[1,3,2,4]` |

## 复杂度分析

**时间复杂度：O(n)**
- 遍历链表一次，每个节点只访问一次

**空间复杂度：O(1)**
- 只使用了几个指针变量
- 没有创建新节点，完全原地操作

## 常见错误

**错误1：忘记保存evenHead**
```javascript
// 错误：直接用even
odd.next = even;  // even已经移动了！
```

**错误2：循环条件错误**
```javascript
// 错误：可能空指针
while (even.next) {  // 如果even为null会报错
    ...
}
```

**错误3：指针移动顺序错误**
```javascript
// 错误顺序会断开链表
odd = odd.next;       // 先移动odd
odd.next = even.next; // odd已经变了，连接错误
```

## 小结

奇偶链表问题的核心技巧是**双指针分离**：

1. **同时维护两条链表**：奇数位置链表和偶数位置链表
2. **交替摘取节点**：轮流将节点添加到各自链表
3. **最后连接**：奇链表尾部接偶链表头部

这道题的关键在于理解指针操作的顺序和循环终止条件。记住要保存`evenHead`，因为`even`指针会在遍历过程中移动。

在链表问题中，"分离后合并"是一个常见的模式，后面的重排链表问题也会用到类似思路。下一章，我们来看一道"脑筋急转弯"式的链表题——如何在只能访问待删除节点的情况下删除它。
