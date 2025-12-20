# 实战：移除链表元素

链表删除操作的核心是什么？是找到待删除节点的**前驱节点**，然后修改前驱的 `next` 指针跳过目标节点。

但问题来了：如果要删除的恰好是头节点呢？头节点没有前驱，需要特殊处理吗？

本章通过这道经典题目，引出链表操作中的重要技巧——**哨兵节点**。

---

## 问题描述

**LeetCode 203. Remove Linked List Elements**

给你一个链表的头节点 `head` 和一个整数 `val`，请你删除链表中所有满足 `Node.val == val` 的节点，并返回新的头节点。

**示例**：

```
输入：head = [1,2,6,3,4,5,6], val = 6
输出：[1,2,3,4,5]
```

```
输入：head = [7,7,7,7], val = 7
输出：[]
```

---

## 问题分析

首先要问一个问题：删除链表节点需要哪些条件？

答案是需要**前驱节点**。删除节点 `curr` 的标准操作是：

```javascript
prev.next = curr.next;  // 让前驱直接指向后继
```

现在问第二个问题：头节点有前驱吗？

没有！这就是链表删除的经典难点——头节点需要特殊处理。

---

## 解法一：分类处理头节点

思考一下，最直接的方法是什么？

先单独处理头节点，再处理后续节点。写出如下代码：

```javascript
function removeElements(head, val) {
  // 第一步：处理头节点
  while (head !== null && head.val === val) {
    head = head.next;
  }
  
  if (head === null) return null;
  
  // 第二步：处理后续节点
  let prev = head;
  while (prev.next !== null) {
    if (prev.next.val === val) {
      prev.next = prev.next.next;  // 删除
    } else {
      prev = prev.next;  // 前进
    }
  }
  
  return head;
}
```

代码能正确运行，但是有一个问题：头节点和后续节点的处理逻辑完全不同，代码结构不统一。

有没有办法让所有节点的处理方式一致呢？

---

## 解法二：哨兵节点（推荐）

答案是使用**哨兵节点**（Dummy Node），也叫虚拟头节点。

核心思想：在原链表头部添加一个虚拟节点，让原来的头节点变成"普通节点"。

```javascript
function removeElements(head, val) {
  // 创建哨兵节点，指向原头节点
  const dummy = new ListNode(0, head);
  
  let prev = dummy;
  while (prev.next !== null) {
    if (prev.next.val === val) {
      prev.next = prev.next.next;  // 删除
    } else {
      prev = prev.next;  // 前进
    }
  }
  
  return dummy.next;  // 返回真正的头节点
}
```

对比一下：

- **无哨兵**：头节点特殊处理 + 后续节点循环处理
- **有哨兵**：所有节点统一用循环处理

哨兵节点的作用就是**消除边界情况**，让代码更简洁、更不容易出错。

---

## 执行过程可视化

以 `head = [1,2,6,3,4,5,6], val = 6` 为例：

```
初始状态（添加哨兵）：
dummy → 1 → 2 → 6 → 3 → 4 → 5 → 6 → null
 ↑
prev

prev.next = 1, 1 ≠ 6, prev 前进
dummy → 1 → 2 → 6 → 3 → 4 → 5 → 6 → null
        ↑
       prev

prev.next = 2, 2 ≠ 6, prev 前进
dummy → 1 → 2 → 6 → 3 → 4 → 5 → 6 → null
             ↑
            prev

prev.next = 6, 6 = 6, 删除！
dummy → 1 → 2 → 3 → 4 → 5 → 6 → null
             ↑
            prev（不前进，继续检查新的 next）

prev.next = 3, 3 ≠ 6, prev 前进
... 继续遍历 ...

最终结果：
dummy → 1 → 2 → 3 → 4 → 5 → null

返回 dummy.next = [1,2,3,4,5]
```

---

## 关键细节：删除后不前进

这里有一个容易出错的细节：删除节点后，`prev` 不能前进。

为什么？因为 `prev.next` 已经指向了新节点，需要继续检查这个新节点是否也要删除。

```javascript
// ❌ 错误写法
if (prev.next.val === val) {
  prev.next = prev.next.next;
}
prev = prev.next;  // 每次都前进

// 问题：如果连续多个节点需要删除呢？
// [1, 6, 6, 2] 删除 6
// prev=1 时，删除第一个 6，prev.next 变成第二个 6
// 然后 prev 前进到第二个 6，跳过了检查！
```

```javascript
// ✅ 正确写法
if (prev.next.val === val) {
  prev.next = prev.next.next;  // 删除，prev 不动
} else {
  prev = prev.next;  // 不删除，prev 才前进
}
```

---

## 解法三：递归视角

除了迭代，还可以用递归的视角来理解这个问题。

递归的思路是：假设后面的链表已经处理好了，我只需要决定当前节点是否保留。

```javascript
function removeElements(head, val) {
  // 基准情况：空链表
  if (head === null) return null;
  
  // 递归处理剩余链表
  head.next = removeElements(head.next, val);
  
  // 处理当前节点：保留还是删除？
  return head.val === val ? head.next : head;
}
```

理解这个递归：

1. 先假设 `head.next` 后面的链表都处理好了
2. 把处理好的结果接到 `head.next`
3. 最后决定 `head` 自己是否保留

递归写法代码简洁，但空间复杂度是 O(n)（递归栈）。

---

## 复杂度分析

| 解法 | 时间复杂度 | 空间复杂度 |
|-----|-----------|-----------|
| 迭代（无哨兵） | O(n) | O(1) |
| 迭代（哨兵） | O(n) | O(1) |
| 递归 | O(n) | O(n) |

三种解法时间复杂度相同，都是遍历一次链表。空间上，迭代解法是常数空间，递归需要栈空间。

---

## 边界情况

- **空链表**：`[], val=1` → 返回 `[]`
- **删除头节点**：`[1,2], val=1` → 返回 `[2]`
- **全部删除**：`[7,7,7], val=7` → 返回 `[]`
- **无需删除**：`[1,2,3], val=4` → 返回 `[1,2,3]`
- **连续删除**：`[1,6,6,2], val=6` → 返回 `[1,2]`

---

## 常见错误

**错误1：忘记处理头节点**

```javascript
// ❌ 直接从 head 开始遍历
let prev = head;
while (prev.next !== null) { ... }
return head;  // 如果 head 本身需要删除呢？
```

**错误2：混淆 prev 和 curr**

```javascript
// ❌ 用 curr 遍历，无法删除
let curr = head;
if (curr.val === val) {
  // 没有前驱引用，无法删除！
}
```

删除操作需要**前驱节点**，所以必须用 `prev` 遍历，检查 `prev.next`。

---

## 技巧总结

哨兵节点是链表操作的重要技巧：

- **作用**：将头节点变成普通节点，统一处理逻辑
- **创建**：`const dummy = new ListNode(0, head);`
- **返回**：`return dummy.next;`
- **适用场景**：任何可能需要删除或修改头节点的操作

在后续的链表题目中，你会频繁看到哨兵节点的应用。记住这个技巧，它能让你的代码更简洁、更不容易出错。

---

## 关联题目

- **LeetCode 83**：删除排序链表中的重复元素
- **LeetCode 82**：删除排序链表中的重复元素 II
- **LeetCode 19**：删除链表的倒数第 N 个节点

这些题目都涉及链表删除操作，哨兵节点技巧同样适用。
