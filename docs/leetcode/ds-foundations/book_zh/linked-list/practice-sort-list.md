# 实战：链表排序

对数组排序，我们有很多选择：快排、归并、堆排序...那对链表排序，该用哪种算法？

先思考一下链表的特性：**不支持随机访问**。这意味着快排的 partition 操作效率很低——找基准、交换元素都需要遍历。

而归并排序天然适合链表！因为归并的核心操作是**合并两个有序序列**，而链表的合并只需要调整指针，不需要额外空间。

---

## 问题描述

**LeetCode 148. Sort List**

给你链表的头结点 `head`，请将其按**升序**排列并返回排序后的链表。

**进阶**：你可以在 O(n log n) 时间复杂度和常数级空间复杂度下，对链表进行排序吗？

**示例**：

```
输入：head = [4,2,1,3]
输出：[1,2,3,4]
```

```
输入：head = [-1,5,3,4,0]
输出：[-1,0,3,4,5]
```

---

## 问题分析

首先要问一个问题：为什么归并排序最适合链表？

对比一下数组和链表的归并排序：

| 操作 | 数组 | 链表 |
|-----|-----|-----|
| 找中点 | O(1) 直接计算 | O(n) 快慢指针 |
| 分割 | O(1) 索引切分 | O(1) 断开指针 |
| 合并 | O(n) 需要额外数组 | O(n) 只需调整指针 |
| 总空间 | O(n) | O(1) |

关键在于**合并操作**：数组归并需要额外空间存放结果，而链表只需要改变指针，可以原地完成！

现在问第二个问题：归并排序的三个步骤是什么？

1. **分割**：找到中点，将链表分成两半
2. **递归**：分别对两半排序
3. **合并**：合并两个有序链表

---

## 解法一：归并排序（递归版）

经典的分治策略。先写出框架：

```javascript
function sortList(head) {
  // 基准情况：空链表或单节点，已经有序
  if (head === null || head.next === null) {
    return head;
  }
  
  // 1. 找中点，分割链表
  const mid = getMid(head);
  const rightHead = mid.next;
  mid.next = null;  // 断开！
  
  // 2. 递归排序两半
  const left = sortList(head);
  const right = sortList(rightHead);
  
  // 3. 合并两个有序链表
  return merge(left, right);
}
```

接下来实现两个辅助函数。

### 快慢指针找中点

```javascript
function getMid(head) {
  let slow = head;
  let fast = head.next;  // 注意：fast 先走一步
  
  while (fast !== null && fast.next !== null) {
    slow = slow.next;
    fast = fast.next.next;
  }
  
  return slow;
}
```

为什么 `fast = head.next` 而不是 `fast = head`？

看这个例子：链表 `[1, 2]`

- 如果 `fast = head`：slow 最终停在 2，mid = 2，右半为空，左半是整个链表 → 无限递归！
- 如果 `fast = head.next`：slow 停在 1，mid = 1，左半 `[1]`，右半 `[2]` → 正确分割

**规则**：让 `fast` 先走一步，中点会偏左，确保分割有效。

### 合并两个有序链表

这个我们在第 46 章已经学过：

```javascript
function merge(l1, l2) {
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
  
  curr.next = l1 !== null ? l1 : l2;
  return dummy.next;
}
```

复杂度分析：
- 时间：O(n log n)
- 空间：O(log n)，递归栈深度

---

## 递归过程可视化

以 `[4, 2, 1, 3]` 为例：

```
sortList([4, 2, 1, 3])
│
├── 分割：mid=2，断开
│   left = [4, 2]
│   right = [1, 3]
│
├── sortList([4, 2])
│   ├── 分割：mid=4
│   │   left = [4]
│   │   right = [2]
│   ├── sortList([4]) → [4]  // 单节点，直接返回
│   ├── sortList([2]) → [2]  // 单节点，直接返回
│   └── merge([4], [2]) → [2, 4]
│
├── sortList([1, 3])
│   ├── 分割：mid=1
│   │   left = [1]
│   │   right = [3]
│   ├── sortList([1]) → [1]
│   ├── sortList([3]) → [3]
│   └── merge([1], [3]) → [1, 3]
│
└── merge([2, 4], [1, 3]) → [1, 2, 3, 4]
```

---

## 解法二：归并排序（迭代版，O(1) 空间）

递归版的空间复杂度是 O(log n)（递归栈）。如果要实现真正的 O(1) 空间，需要用**自底向上**的迭代方法。

核心思想：从最小的单元开始，逐步合并成更大的有序段。

```javascript
function sortList(head) {
  if (head === null || head.next === null) return head;
  
  // 计算链表长度
  let len = 0;
  let curr = head;
  while (curr !== null) {
    len++;
    curr = curr.next;
  }
  
  const dummy = new ListNode(0, head);
  
  // 自底向上归并
  for (let size = 1; size < len; size *= 2) {
    let prev = dummy;
    let curr = dummy.next;
    
    while (curr !== null) {
      // 分割出两段，每段长度为 size
      const left = curr;
      const right = split(left, size);
      curr = split(right, size);  // curr 指向下一对的开始
      
      // 合并两段并连接到结果链表
      prev.next = merge(left, right);
      
      // prev 移动到合并后链表的末尾
      while (prev.next !== null) {
        prev = prev.next;
      }
    }
  }
  
  return dummy.next;
}

// 分割链表，返回第二段的头
function split(head, size) {
  for (let i = 1; i < size && head !== null; i++) {
    head = head.next;
  }
  if (head === null) return null;
  
  const second = head.next;
  head.next = null;  // 断开
  return second;
}
```

### 自底向上过程

以 `[4, 2, 1, 3]` 为例：

```
初始：4 → 2 → 1 → 3

size = 1（每段1个节点）:
  合并 [4] 和 [2] → [2, 4]
  合并 [1] 和 [3] → [1, 3]
  结果：2 → 4 → 1 → 3

size = 2（每段2个节点）:
  合并 [2, 4] 和 [1, 3] → [1, 2, 3, 4]

完成：1 → 2 → 3 → 4
```

复杂度分析：
- 时间：O(n log n)
- 空间：O(1)，真正的常数空间！

---

## 关键细节

### 1. 分割时必须断开

```javascript
const mid = getMid(head);
const rightHead = mid.next;
mid.next = null;  // 必须断开！
```

如果不断开，递归时左半和右半还是连在一起，会出现混乱。

### 2. 快慢指针的初始化

| 初始化方式 | 中点位置 | 适用场景 |
|-----------|---------|---------|
| `slow=head, fast=head` | 偏右 | 一般场景 |
| `slow=head, fast=head.next` | 偏左 | 分割场景 |

分割时用偏左的方式，避免 `[1, 2]` 这种情况下的死循环。

### 3. 归并排序是稳定的

相等元素的相对顺序不会改变。如果需要稳定排序，归并是好选择。

---

## 边界情况

- **空链表**：`[]` → 直接返回 `null`
- **单节点**：`[1]` → 直接返回，已经有序
- **两节点**：`[2, 1]` → 最小可分割情况
- **已排序**：`[1, 2, 3]` → 正常处理，不影响
- **逆序**：`[3, 2, 1]` → 正常处理
- **有重复**：`[1, 1, 2]` → 稳定排序，保持相对顺序

---

## 常见错误

**错误1：快慢指针导致死循环**

```javascript
// ❌ 对于 [1, 2]，mid=2，right=null，left=[1,2]，无限递归
let slow = head, fast = head;

// ✅ fast 先走一步
let slow = head, fast = head.next;
```

**错误2：忘记断开链表**

```javascript
// ❌ 不断开，后续操作会混乱
const mid = getMid(head);
const right = mid.next;
// 漏了 mid.next = null;
```

**错误3：迭代版 prev 位置错误**

```javascript
// ❌ 合并后没有把 prev 移到末尾
prev.next = merge(left, right);
// 漏了移动 prev 的循环
```

---

## 技巧总结

链表排序的核心要点：

- **选择归并排序**：链表不支持随机访问，归并排序最合适
- **快慢指针找中点**：分割链表的标准方法
- **分割时断开**：递归前必须断开链表
- **偏左中点**：`fast = head.next`，避免死循环
- **自底向上**：如果要 O(1) 空间，用迭代版本

这道题综合了链表的多个基础操作：找中点、反转（如果是快排需要）、合并有序链表。掌握了这道题，你对链表的理解会更上一层楼。

---

## 关联题目

- **LeetCode 21**：合并两个有序链表（归并的子问题）
- **LeetCode 23**：合并 K 个升序链表（归并的扩展）
- **LeetCode 147**：对链表进行插入排序（O(n²) 排序）
