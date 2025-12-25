# 实战：排序链表（分治法）

> LeetCode 148. 排序链表 | 难度：中等

使用分治法（归并排序）对链表进行排序。

---

## 题目描述

给你链表的头节点 `head`，请将其按**升序**排列并返回排序后的链表。

**进阶**：在 O(n log n) 时间复杂度和 O(1) 空间复杂度下，对链表进行排序。

**示例**：
```
输入：head = [4,2,1,3]
输出：[1,2,3,4]

输入：head = [-1,5,3,4,0]
输出：[-1,0,3,4,5]
```

---

## 思路分析

**分治策略**：使用归并排序。

1. **分**：找到链表中点，分成两半
2. **治**：递归排序两个子链表
3. **合**：合并两个有序链表

**为什么链表适合归并排序？**
- 快速排序需要随机访问，链表不支持
- 归并排序只需要顺序访问和合并操作
- 链表合并是 O(1) 空间（不需要额外数组）

---

## 代码实现

### 链表节点定义

```typescript
class ListNode {
  val: number;
  next: ListNode | null;
  
  constructor(val = 0, next: ListNode | null = null) {
    this.val = val;
    this.next = next;
  }
}
```

### 递归版本（O(log n) 栈空间）

```typescript
function sortList(head: ListNode | null): ListNode | null {
  // 基本情况：空链表或单节点
  if (!head || !head.next) {
    return head;
  }
  
  // 1. 找到中点，分割链表
  const mid = getMid(head);
  const left = head;
  const right = mid.next;
  mid.next = null;  // 断开链表
  
  // 2. 递归排序两半
  const sortedLeft = sortList(left);
  const sortedRight = sortList(right);
  
  // 3. 合并两个有序链表
  return merge(sortedLeft, sortedRight);
}

// 快慢指针找中点
function getMid(head: ListNode): ListNode {
  let slow = head;
  let fast = head.next;  // 注意：fast 从 head.next 开始
  
  while (fast && fast.next) {
    slow = slow.next!;
    fast = fast.next.next;
  }
  
  return slow;  // slow 停在中点（偶数时是左半部分的最后一个）
}

// 合并两个有序链表
function merge(l1: ListNode | null, l2: ListNode | null): ListNode | null {
  const dummy = new ListNode(0);
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

### 迭代版本（O(1) 空间）

```typescript
function sortListIterative(head: ListNode | null): ListNode | null {
  if (!head || !head.next) return head;
  
  // 计算链表长度
  let length = 0;
  let curr: ListNode | null = head;
  while (curr) {
    length++;
    curr = curr.next;
  }
  
  const dummy = new ListNode(0, head);
  
  // subLength: 当前要合并的子链表长度
  // 1, 2, 4, 8, ... 直到 >= length
  for (let subLength = 1; subLength < length; subLength *= 2) {
    let prev = dummy;
    curr = dummy.next;
    
    while (curr) {
      // 获取第一个子链表
      const head1 = curr;
      for (let i = 1; i < subLength && curr.next; i++) {
        curr = curr.next;
      }
      
      // 获取第二个子链表
      const head2 = curr.next;
      curr.next = null;  // 断开第一个子链表
      curr = head2;
      
      for (let i = 1; i < subLength && curr && curr.next; i++) {
        curr = curr.next;
      }
      
      // 保存下一轮的起点
      let next: ListNode | null = null;
      if (curr) {
        next = curr.next;
        curr.next = null;  // 断开第二个子链表
      }
      
      // 合并两个子链表
      const merged = merge(head1, head2);
      prev.next = merged;
      
      // 移动 prev 到合并后链表的末尾
      while (prev.next) {
        prev = prev.next;
      }
      
      curr = next;  // 继续处理剩余部分
    }
  }
  
  return dummy.next;
}
```

---

## 图示

```
输入：4 → 2 → 1 → 3

第一步：分割
        4 → 2 → 1 → 3
             ↓
      4 → 2     1 → 3
        ↓           ↓
     4    2      1    3

第二步：合并（从底向上）
     4    2      1    3
        ↓           ↓
      2 → 4       1 → 3
             ↓
        1 → 2 → 3 → 4

输出：1 → 2 → 3 → 4
```

---

## 执行过程详解

### 递归过程

```
sortList([4,2,1,3])
├── getMid → 返回节点2（值为2）
├── left = [4,2], right = [1,3]
├── sortList([4,2])
│   ├── getMid → 返回节点4
│   ├── left = [4], right = [2]
│   ├── sortList([4]) → [4]
│   ├── sortList([2]) → [2]
│   └── merge([4], [2]) → [2,4]
├── sortList([1,3])
│   ├── getMid → 返回节点1
│   ├── left = [1], right = [3]
│   ├── sortList([1]) → [1]
│   ├── sortList([3]) → [3]
│   └── merge([1], [3]) → [1,3]
└── merge([2,4], [1,3]) → [1,2,3,4]
```

### 合并过程

```
merge([2,4], [1,3])

dummy → ...
curr = dummy

比较 2 和 1：1 < 2
  curr.next = 1, curr = 1
  l2 = 3

比较 2 和 3：2 < 3
  curr.next = 2, curr = 2
  l1 = 4

比较 4 和 3：3 < 4
  curr.next = 3, curr = 3
  l2 = null

l2 为空，curr.next = l1 = 4

结果：1 → 2 → 3 → 4
```

---

## 找中点的细节

为什么 `fast` 从 `head.next` 开始？

```
链表：1 → 2 → 3 → 4

fast 从 head 开始：
  slow=1, fast=1
  slow=2, fast=3
  slow=3, fast=null ← slow 在位置3

fast 从 head.next 开始：
  slow=1, fast=2
  slow=2, fast=4
  slow=2, fast=null ← slow 在位置2

我们想要位置2（左半部分的末尾），以便分割为：
  [1,2] 和 [3,4]

如果 slow 在位置3，分割为：
  [1,2,3] 和 [4] ← 不均匀
```

---

## 复杂度分析

### 递归版本

- **时间复杂度**：O(n log n)
  - 分割：O(log n) 层
  - 每层合并：O(n)
  
- **空间复杂度**：O(log n)
  - 递归调用栈深度

### 迭代版本

- **时间复杂度**：O(n log n)
  - log n 轮合并
  - 每轮处理 n 个节点
  
- **空间复杂度**：O(1)
  - 只使用常数额外空间

---

## 与数组归并排序的对比

| 特性 | 数组归并排序 | 链表归并排序 |
|------|-------------|-------------|
| 找中点 | O(1) 直接计算 | O(n) 快慢指针 |
| 合并 | 需要 O(n) 空间 | O(1) 原地操作 |
| 总空间 | O(n) | O(1)（迭代版） |
| 随机访问 | 支持 | 不支持 |

---

## 延伸：自底向上归并

迭代版本是**自底向上**的归并排序：

```
长度1合并：
[4][2][1][3] → [2,4][1,3]

长度2合并：
[2,4][1,3] → [1,2,3,4]

长度4合并：
完成
```

这避免了递归，实现了 O(1) 空间复杂度。

---

## 小结

本题使用分治法（归并排序）：

1. **分**：快慢指针找中点
2. **治**：递归排序子链表
3. **合**：双指针合并有序链表

核心理解：
- 链表天然适合归并排序（顺序访问、O(1) 合并）
- 迭代版本可以实现 O(1) 空间
- 找中点时 `fast` 从 `head.next` 开始，确保均匀分割
