# 实战：排序链表

> LeetCode 148. 排序链表 | 难度：中等

链表排序是归并排序的最佳应用场景，O(1) 空间复杂度！

---

## 问题分析

给定链表头节点 `head`，将其升序排列。

**要求**：
- 时间复杂度：O(n log n)
- 空间复杂度：O(1)

**为什么适合归并排序？**
- 链表不支持随机访问，不适合快排
- 归并排序只需要顺序访问，完美契合链表
- 合并两个有序链表只需 O(1) 额外空间

---

## 递归版本（O(log n) 空间）

```typescript
function sortList(head: ListNode | null): ListNode | null {
  if (!head || !head.next) return head;
  
  // 1. 找中点（快慢指针）
  let slow = head, fast = head, prev: ListNode | null = null;
  while (fast && fast.next) {
    prev = slow;
    slow = slow.next!;
    fast = fast.next.next!;
  }
  
  // 2. 断开链表
  prev!.next = null;
  
  // 3. 递归排序
  const left = sortList(head);
  const right = sortList(slow);
  
  // 4. 合并
  return merge(left, right);
}

function merge(l1: ListNode | null, l2: ListNode | null): ListNode | null {
  const dummy = new ListNode(0);
  let curr = dummy;
  
  while (l1 && l2) {
    if (l1.val < l2.val) {
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

---

## 迭代版本（O(1) 空间）

自底向上归并，避免递归栈：

```typescript
function sortList(head: ListNode | null): ListNode | null {
  if (!head || !head.next) return head;
  
  // 1. 计算链表长度
  let length = 0;
  let node = head;
  while (node) {
    length++;
    node = node.next;
  }
  
  const dummy = new ListNode(0, head);
  
  // 2. 自底向上归并
  for (let size = 1; size < length; size *= 2) {
    let prev = dummy;
    let curr = dummy.next;
    
    while (curr) {
      // 切分出两个长度为 size 的子链表
      const left = curr;
      const right = split(left, size);
      curr = split(right, size);
      
      // 合并并连接
      prev.next = merge(left, right);
      while (prev.next) {
        prev = prev.next;
      }
    }
  }
  
  return dummy.next;
}

// 切分链表：保留前 n 个节点，返回后续部分
function split(head: ListNode | null, n: number): ListNode | null {
  while (head && --n > 0) {
    head = head.next;
  }
  
  if (!head) return null;
  
  const next = head.next;
  head.next = null;
  return next;
}
```

---

## 执行过程示例

对于链表 `4 → 2 → 1 → 3`：

**size = 1**（每次合并相邻2个节点）：
```
[4] [2] [1] [3]
  ↓    ↓
[2,4] [1,3]
```

**size = 2**（每次合并相邻4个节点）：
```
[2,4] [1,3]
     ↓
[1,2,3,4]
```

**完成**。

---

## 关键技巧

**1. 快慢指针找中点**：
```typescript
let slow = head, fast = head;
while (fast.next && fast.next.next) {
  slow = slow.next;
  fast = fast.next.next;
}
// slow 指向中点
```

**2. 切分链表**：
```typescript
const mid = slow.next;
slow.next = null;  // 断开
```

**3. 自底向上避免递归**：
```typescript
for (let size = 1; size < length; size *= 2) {
  // 每轮合并 size 大小的相邻链表
}
```

---

## 复杂度分析

**递归版本**：
- 时间：O(n log n)
- 空间：O(log n)（递归栈）

**迭代版本**：
- 时间：O(n log n)
- 空间：O(1)

---

## 链表排序方案对比

| 方法 | 时间 | 空间 | 特点 |
|-----|------|------|-----|
| **归并排序** | O(n log n) | O(1) | 稳定，适合链表 |
| **快速排序** | O(n log n) | O(log n) | 不稳定，需要随机访问 |
| **插入排序** | O(n²) | O(1) | 稳定，数据量小时快 |

**结论**：归并排序是链表排序的最佳选择。

---

## 扩展思考

**为什么数组排序常用快排，链表排序常用归并？**

1. **随机访问**：
   - 快排需要频繁交换元素 → 数组O(1)，链表O(n)
   - 归并需要顺序访问 → 链表和数组都是O(1)

2. **空间复杂度**：
   - 快排原地排序 → O(log n)递归栈
   - 归并需要辅助数组 → 数组O(n)，链表O(1)

3. **稳定性**：
   - 归并稳定，快排不稳定
