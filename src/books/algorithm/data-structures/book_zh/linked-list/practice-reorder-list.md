# 实战：重排链表

这道题乍看有点复杂，但如果你仔细观察重排后的规律，会发现它其实是三个基础操作的组合。

看这个例子：`[1, 2, 3, 4, 5]` 重排后变成 `[1, 5, 2, 4, 3]`

- 第 1 个来自前半开头：1
- 第 2 个来自后半末尾：5
- 第 3 个来自前半第 2 个：2
- 第 4 个来自后半倒数第 2 个：4
- ...

发现规律了吗？这就是**前半正序**和**后半逆序**的交替合并！

---

## 问题描述

**LeetCode 143. Reorder List**

给定一个单链表 L 的头节点 head，单链表 L 表示为：

`L0 → L1 → … → Ln-1 → Ln`

请将其重新排列后变为：

`L0 → Ln → L1 → Ln-1 → L2 → Ln-2 → …`

不能只是单纯地改变节点内部的值，而是需要实际进行节点交换。

**示例**：

```
输入：head = [1,2,3,4]
输出：[1,4,2,3]
```

```
输入：head = [1,2,3,4,5]
输出：[1,5,2,4,3]
```

---

## 问题分析

首先要问一个问题：如何得到"后半逆序"？

分两步：
1. 先分割出后半部分
2. 再反转后半部分

这样问题就变成了三个子问题的组合：

1. **找中点，分割链表**
2. **反转后半部分**
3. **交替合并两个链表**

每一步我们都在前面的章节学过！这就是**分解思维**——把复杂问题拆解成已知的简单问题。

---

## 解法一：存入数组（简单但费空间）

如果不追求 O(1) 空间，最直接的方法是把节点存入数组，然后用双指针交替取：

```javascript
function reorderList(head) {
  if (head === null || head.next === null) return;
  
  // 存入数组
  const nodes = [];
  let curr = head;
  while (curr !== null) {
    nodes.push(curr);
    curr = curr.next;
  }
  
  // 双指针交替连接
  let left = 0, right = nodes.length - 1;
  while (left < right) {
    nodes[left].next = nodes[right];
    left++;
    if (left === right) break;  // 避免偶数长度时出问题
    nodes[right].next = nodes[left];
    right--;
  }
  nodes[left].next = null;  // 断开末尾
}
```

复杂度：
- 时间：O(n)
- 空间：O(n)

---

## 解法二：原地操作（推荐）

如果要 O(1) 空间，就需要用链表操作来实现。分三步：

### 第一步：找中点，分割链表

```javascript
function getMid(head) {
  let slow = head;
  let fast = head;
  while (fast.next !== null && fast.next.next !== null) {
    slow = slow.next;
    fast = fast.next.next;
  }
  return slow;
}
```

### 第二步：反转后半部分

```javascript
function reverse(head) {
  let prev = null;
  let curr = head;
  while (curr !== null) {
    const next = curr.next;
    curr.next = prev;
    prev = curr;
    curr = next;
  }
  return prev;
}
```

### 第三步：交替合并

```javascript
function mergeAlternately(l1, l2) {
  while (l2 !== null) {
    const next1 = l1.next;  // 保存下一个
    const next2 = l2.next;
    
    l1.next = l2;     // l1 指向 l2
    l2.next = next1;  // l2 指向原来的 l1.next
    
    l1 = next1;  // 移动指针
    l2 = next2;
  }
}
```

### 组合成完整解法

```javascript
function reorderList(head) {
  if (head === null || head.next === null) return;
  
  // 1. 找中点，分割
  const mid = getMid(head);
  const head2 = mid.next;
  mid.next = null;  // 断开
  
  // 2. 反转后半部分
  const reversedHead2 = reverse(head2);
  
  // 3. 交替合并
  mergeAlternately(head, reversedHead2);
}
```

复杂度：
- 时间：O(n)
- 空间：O(1)

---

## 执行过程可视化

以 `[1, 2, 3, 4, 5]` 为例：

```
原始链表：
1 → 2 → 3 → 4 → 5

Step 1: 找中点，分割
  slow=3, fast=5
  mid = 3
  断开后：
  前半：1 → 2 → 3
  后半：4 → 5

Step 2: 反转后半
  后半变成：5 → 4

Step 3: 交替合并
  l1=1, l2=5:
    1.next = 5
    5.next = 2（原来的 1.next）
    → 1 → 5 → 2 → 3
  
  l1=2, l2=4:
    2.next = 4
    4.next = 3（原来的 2.next）
    → 1 → 5 → 2 → 4 → 3
  
  l2=null, 结束

最终结果：1 → 5 → 2 → 4 → 3
```

图示：

```
原始：  1 → 2 → 3 → 4 → 5
        |_____|   |_____|
         前半       后半

反转后半：
        1 → 2 → 3   5 → 4

交替合并：
        1 → 5 → 2 → 4 → 3
```

---

## 关键细节

### 1. 中点选择

对于偶数长度 `[1, 2, 3, 4]`：
- 中点选 2，前半 `[1, 2]`，后半 `[3, 4]`

对于奇数长度 `[1, 2, 3, 4, 5]`：
- 中点选 3，前半 `[1, 2, 3]`，后半 `[4, 5]`

**原则**：前半长度 >= 后半长度。这样交替合并时，前半不会先用完。

### 2. 交替合并的指针操作顺序

```javascript
// ❌ 错误顺序
l1.next = l2;
l2.next = l1.next;  // l1.next 已经是 l2 了！

// ✅ 正确顺序：先保存，再修改
const next1 = l1.next;
const next2 = l2.next;
l1.next = l2;
l2.next = next1;
```

### 3. 为什么以 l2 为循环条件？

```javascript
while (l2 !== null)
```

因为后半长度 <= 前半长度，当 l2 用完时，合并自然结束。如果用 l1 做条件，可能会访问空指针。

---

## 边界情况

- **空链表**：`[]` → 直接返回
- **单节点**：`[1]` → 无需重排
- **两节点**：`[1, 2]` → 结果就是 `[1, 2]`
- **三节点**：`[1, 2, 3]` → 结果是 `[1, 3, 2]`
- **偶数个**：`[1, 2, 3, 4]` → 结果是 `[1, 4, 2, 3]`

---

## 常见错误

**错误1：忘记断开链表**

```javascript
// ❌ 不断开，反转后半时会影响前半
const mid = getMid(head);
const head2 = mid.next;
// 漏了 mid.next = null;
```

**错误2：指针操作顺序错误**

```javascript
// ❌ 先修改再保存
l1.next = l2;
const next1 = l1.next;  // 已经变成 l2 了！
```

**错误3：循环条件用错**

```javascript
// ❌ 如果前半比后半长，l2 会先空，但循环继续
while (l1 !== null && l2 !== null) {
  ...
  l1 = next1;
  l2 = next2;
}
// l1 还有剩余，需要额外处理

// ✅ 只用 l2 做条件更简洁
while (l2 !== null)
```

---

## 技巧总结

这道题的精髓在于**分解思维**：

1. **识别子问题**：找中点、反转、合并——都是学过的基础操作
2. **组合解决**：把基础操作串联起来
3. **注意细节**：断开链表、保存指针、选择合适的循环条件

这种"分解-组合"的思路，在很多复杂链表问题中都能用到。遇到看起来复杂的题目，不妨先想想能不能拆成简单的子问题。

---

## 拓展思考

- 如果要求按 `L0 → Ln → Ln-1 → L1 → ...` 的顺序呢？（只需调整合并顺序）
- **LeetCode 25**：K 个一组翻转链表（更复杂的分组操作）
- **LeetCode 234**：回文链表（也用到找中点 + 反转）

---

## 关联题目

- **LeetCode 876**：链表的中间结点
- **LeetCode 206**：反转链表
- **LeetCode 21**：合并两个有序链表
