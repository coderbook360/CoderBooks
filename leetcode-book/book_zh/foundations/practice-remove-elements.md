# 实战：移除链表元素

想象你在整理一串珠子，需要把所有红色的珠子都摘下来，只保留其他颜色的。这就是今天我们要解决的问题——从链表中移除所有指定值的节点。

## 问题描述

给你一个链表的头节点`head`和一个整数`val`，请你删除链表中所有满足`Node.val == val`的节点，并返回新的头节点。

**示例1**：
```
输入: 1 → 2 → 6 → 3 → 4 → 5 → 6, val = 6
输出: 1 → 2 → 3 → 4 → 5
```

**示例2**：
```
输入: 7 → 7 → 7 → 7, val = 7
输出: []
```

**示例3**：
```
输入: [], val = 1
输出: []
```

这道题看起来简单，但有一个棘手的问题：如果要删除的是头节点怎么办？

## 思路分析

### 直接删除的困境

删除链表节点的标准操作是：让前一个节点的`next`指向被删除节点的下一个节点。

```
删除前: A → B → C
删除后: A → C (B被跳过)
```

但头节点没有"前一个节点"，这导致我们需要单独处理头节点的情况：

```javascript
// 需要特殊处理头节点的版本
function removeElements(head, val) {
    // 处理头节点是目标值的情况
    while (head && head.val === val) {
        head = head.next;
    }
    
    if (!head) return null;
    
    // 处理其余节点
    let current = head;
    while (current.next) {
        if (current.next.val === val) {
            current.next = current.next.next;
        } else {
            current = current.next;
        }
    }
    
    return head;
}
```

这个代码能工作，但有两段逻辑处理删除，不够优雅。有没有办法统一处理？

### 虚拟头节点的妙用

**虚拟头节点（Dummy Head）**是链表问题中的经典技巧：在原链表头部添加一个虚拟节点，这样原来的头节点就变成了"普通节点"，不再需要特殊处理。

```
原链表:     1 → 2 → 6 → 3
添加dummy:  dummy → 1 → 2 → 6 → 3
```

现在每个真实节点都有前驱节点了！

## 完整实现

```javascript
/**
 * @param {ListNode} head
 * @param {number} val
 * @return {ListNode}
 */
function removeElements(head, val) {
    // 创建虚拟头节点
    const dummy = new ListNode(0);
    dummy.next = head;
    
    // 从dummy开始遍历
    let current = dummy;
    
    while (current.next) {
        if (current.next.val === val) {
            // 跳过目标节点
            current.next = current.next.next;
        } else {
            // 移动到下一个节点
            current = current.next;
        }
    }
    
    // 返回真正的头节点
    return dummy.next;
}
```

**关键点**：
- `current`始终指向"当前检查节点的前一个节点"
- 删除时，`current`不移动，继续检查新的`current.next`
- 不删除时，`current`向后移动

## 执行过程图解

以`1 → 2 → 6 → 3 → 4 → 5 → 6`删除值为6的节点为例：

**初始状态**：
```
dummy → 1 → 2 → 6 → 3 → 4 → 5 → 6 → null
  ↑
current
```

**遍历到节点2**：
```
dummy → 1 → 2 → 6 → 3 → 4 → 5 → 6 → null
            ↑
          current
current.next.val = 6，需要删除
```

**删除第一个6**：
```
dummy → 1 → 2 → 3 → 4 → 5 → 6 → null
            ↑
          current (不移动，继续检查)
current.next.val = 3，不删除，向后移动
```

**继续遍历到节点5**：
```
dummy → 1 → 2 → 3 → 4 → 5 → 6 → null
                        ↑
                      current
current.next.val = 6，需要删除
```

**删除第二个6**：
```
dummy → 1 → 2 → 3 → 4 → 5 → null
                        ↑
                      current
current.next = null，遍历结束
```

**返回结果**：
```
1 → 2 → 3 → 4 → 5
```

## 为什么删除后不移动current？

这是一个容易忽略的细节。看下面的例子：

```
输入: 1 → 6 → 6 → 2, val = 6
```

如果删除第一个6后移动`current`：

```
步骤1: dummy → 1 → 6 → 6 → 2
               ↑
            current
删除6后: dummy → 1 → 6 → 2
               ↑
            current
如果移动current: 
             dummy → 1 → 6 → 2
                         ↑
                      current
跳过了第二个6！
```

正确做法是删除后不移动，让`current`继续检查新的`current.next`（第二个6）：

```
删除第一个6后: dummy → 1 → 6 → 2
                   ↑
                current (不移动)
current.next.val = 6，继续删除

删除第二个6后: dummy → 1 → 2
                   ↑
                current (继续不移动检查)
current.next.val = 2，不删除，移动

最终: dummy → 1 → 2
                   ↑
                current
结束
```

## 边界情况

| 输入 | 说明 | 结果 |
|------|------|------|
| `[], 1` | 空链表 | `[]` |
| `[7,7,7], 7` | 全部删除 | `[]` |
| `[1,2,3], 4` | 无需删除 | `[1,2,3]` |
| `[1], 1` | 删除唯一节点 | `[]` |
| `[1,1], 1` | 连续删除 | `[]` |

## 复杂度分析

**时间复杂度：O(n)**
- 遍历链表一次，每个节点最多访问两次（一次作为`current`，一次作为`current.next`）

**空间复杂度：O(1)**
- 只使用了一个虚拟头节点和一个指针变量

## 递归解法

链表问题天然适合递归。递归的思路是：先处理后面的链表，再决定当前节点的去留。

```javascript
function removeElements(head, val) {
    // 基准情况
    if (!head) return null;
    
    // 递归处理后续链表
    head.next = removeElements(head.next, val);
    
    // 决定当前节点的去留
    return head.val === val ? head.next : head;
}
```

这个解法代码更简洁，但使用了O(n)的递归栈空间。

**递归执行过程**（以`1 → 2 → 6 → 3, val = 6`为例）：
```
removeElements(1) 
  → 1.next = removeElements(2)
      → 2.next = removeElements(6)
          → 6.next = removeElements(3)
              → 3.next = removeElements(null) = null
              → 3.val ≠ 6，返回 3
          → 6.val = 6，返回 3（跳过6）
      → 2.next = 3，2.val ≠ 6，返回 2
  → 1.next = 2，1.val ≠ 6，返回 1
结果: 1 → 2 → 3
```

## 小结

移除链表元素这道题教会我们一个重要技巧：**虚拟头节点**。

使用虚拟头节点的好处：
1. **统一操作**：不再需要单独处理头节点
2. **简化逻辑**：所有删除操作都是"修改前驱节点的next"
3. **避免空指针**：始终有一个有效的起点

记住一个细节：**删除节点后不要移动当前指针**，因为可能有连续的待删除节点。

虚拟头节点是链表问题中最实用的技巧之一，在后续的很多题目中你都会看到它的身影。下一章，我们来学习如何把链表按奇偶位置重新排列。
