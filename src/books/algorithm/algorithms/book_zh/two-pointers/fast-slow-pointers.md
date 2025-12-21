# 快慢指针模式

对撞指针从两端出发，快慢指针则从同一位置出发，以不同速度前进。这种"龟兔赛跑"式的技巧，在链表问题中尤其强大。

---

## 为什么需要快慢指针

链表有一个特性：**只能单向遍历**。

这意味着：
- 你不知道链表有多长（除非遍历一遍）
- 你无法从后往前走
- 你无法随机访问某个位置

快慢指针正是为了在这些限制下解决问题而生。

---

## 场景一：找链表中点

**问题**：给定一个链表，找到它的中间节点。

如果没有快慢指针，你需要：
1. 第一遍遍历，计算链表长度 n
2. 第二遍遍历，走 n/2 步找到中点

用快慢指针，一遍就够了：

```typescript
function findMiddle(head: ListNode | null): ListNode | null {
  let slow = head;
  let fast = head;
  
  while (fast !== null && fast.next !== null) {
    slow = slow!.next;        // 慢指针走一步
    fast = fast.next.next;    // 快指针走两步
  }
  
  return slow;  // 慢指针就是中点
}
```

**为什么有效？**

```
链表：1 → 2 → 3 → 4 → 5 → null
      ↑
   slow/fast

步骤1: slow=2, fast=3
步骤2: slow=3, fast=5
步骤3: fast.next=null, 停止

slow 指向 3，正好是中点
```

快指针每次走两步，慢指针每次走一步。当快指针到达终点时，慢指针正好走了一半的路程。

**注意**：对于偶数长度的链表，这个实现返回的是中间偏右的节点。如果需要偏左，可以调整循环条件为 `fast.next !== null && fast.next.next !== null`。

---

## 场景二：检测链表是否有环

**问题**：给定一个链表，判断它是否有环。

```
有环链表：1 → 2 → 3 → 4 → 5
                    ↑       ↓
                    ← ← ← ← ←
```

如果有环，遍历永远不会结束。如何检测？

**Floyd 环检测算法**（龟兔算法）：

```typescript
function hasCycle(head: ListNode | null): boolean {
  let slow = head;
  let fast = head;
  
  while (fast !== null && fast.next !== null) {
    slow = slow!.next;        // 慢指针走一步
    fast = fast.next.next;    // 快指针走两步
    
    if (slow === fast) {
      return true;  // 相遇了，说明有环
    }
  }
  
  return false;  // 快指针到达终点，无环
}
```

**为什么快慢指针能检测环？**

想象一个环形跑道，两个人以不同速度跑步：
- 如果没有环，快的人会先到达终点
- 如果有环，快的人会绕回来，最终与慢的人相遇

```
有环链表：1 → 2 → 3 → 4
               ↑       ↓
               ← ← ← ← 5

假设 slow 刚进入环时，fast 在环内某处
设 slow 和 fast 的距离为 d

每走一步：
- slow 前进 1
- fast 前进 2
- 距离减少 1

所以 d 步后，fast 会追上 slow
```

---

## 场景三：找环的入口

**问题**：不仅要判断是否有环，还要找到环的起点。

这需要 Floyd 算法的第二阶段：

```typescript
function detectCycle(head: ListNode | null): ListNode | null {
  let slow = head;
  let fast = head;
  
  // 第一阶段：检测环并找到相遇点
  while (fast !== null && fast.next !== null) {
    slow = slow!.next;
    fast = fast.next.next;
    
    if (slow === fast) {
      // 第二阶段：从头节点和相遇点同时出发
      let ptr = head;
      while (ptr !== slow) {
        ptr = ptr!.next;
        slow = slow!.next;
      }
      return ptr;  // 相遇点就是环的入口
    }
  }
  
  return null;
}
```

**为什么这样能找到入口？**

这需要一点数学推导。设：
- `a` = 链表头到环入口的距离
- `b` = 环入口到相遇点的距离
- `c` = 相遇点回到环入口的距离（环长 = b + c）

```
链表头 ----a---- 环入口 ----b---- 相遇点
                    ↑              ↓
                    ← ← ← c ← ← ← ←
```

相遇时：
- 慢指针走了 `a + b` 步
- 快指针走了 `a + b + k(b + c)` 步（k 是快指针绕环的圈数）

因为快指针速度是慢指针的 2 倍：

```
2(a + b) = a + b + k(b + c)
a + b = k(b + c)
a = k(b + c) - b
a = (k-1)(b + c) + c
```

这意味着：**从链表头走 a 步，等于从相遇点走 c 步再绕 (k-1) 圈**。

所以，让一个指针从头节点出发，另一个从相遇点出发，两者同速前进，一定会在环入口相遇！

---

## 场景四：找倒数第 k 个节点

**问题**：给定一个链表，返回倒数第 k 个节点。

如果知道链表长度 n，答案就是正数第 n-k+1 个。但链表不知道长度怎么办？

**技巧**：让快指针先走 k 步，然后两个指针同速前进。

```typescript
function getKthFromEnd(head: ListNode | null, k: number): ListNode | null {
  let fast = head;
  let slow = head;
  
  // 快指针先走 k 步
  for (let i = 0; i < k; i++) {
    if (fast === null) return null;  // k 大于链表长度
    fast = fast.next;
  }
  
  // 同速前进，直到快指针到达终点
  while (fast !== null) {
    slow = slow!.next;
    fast = fast.next;
  }
  
  return slow;  // 此时 slow 就是倒数第 k 个
}
```

**为什么有效？**

```
k = 2
链表：1 → 2 → 3 → 4 → 5 → null

初始：fast 先走 2 步
      slow=1, fast=3

同步前进：
      slow=2, fast=4
      slow=3, fast=5
      slow=4, fast=null

slow 指向 4，是倒数第 2 个
```

快指针到达终点时，它走了 n 步。此时慢指针走了 n-k 步，正好指向倒数第 k 个节点。

---

## 快慢指针的适用条件

| 场景 | 速度配置 | 例题 |
|-----|---------|------|
| **找中点** | 慢1步，快2步 | 链表中点、归并排序 |
| **检测环** | 慢1步，快2步 | 环形链表、快乐数 |
| **找环入口** | Floyd 两阶段 | 环形链表 II |
| **倒数第 k 个** | 快指针先走 k 步 | 删除倒数第 k 个节点 |

---

## 快慢指针在数组中的应用

快慢指针不仅适用于链表，在数组中也有用武之地。

**原地删除元素**：

```typescript
function removeElement(nums: number[], val: number): number {
  let slow = 0;  // 慢指针指向下一个要填入的位置
  
  for (let fast = 0; fast < nums.length; fast++) {
    if (nums[fast] !== val) {
      nums[slow] = nums[fast];
      slow++;
    }
  }
  
  return slow;  // 新数组的长度
}
```

这里快指针负责遍历，慢指针负责记录有效元素的位置。

---

## 本章小结

快慢指针的核心是**利用速度差**解决问题：

- **找中点**：快指针走两步，慢指针走一步
- **检测环**：如果有环，快指针终会追上慢指针
- **找环入口**：数学推导，两点同速出发在入口相遇
- **倒数第 k 个**：快指针先走 k 步，保持固定距离

**Floyd 环检测算法**是快慢指针的经典应用，理解它的数学原理对解决变体问题很有帮助。

下一章，我们开始双指针的实战练习。
