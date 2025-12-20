# 递归的本质与设计方法

递归是算法世界的基石。从二叉树遍历到动态规划，从回溯搜索到分治算法，几乎所有高级算法技巧都建立在递归思维之上。

**本章核心问题：什么是递归？如何设计一个正确的递归函数？**

---

## 什么是递归

递归的定义很简单：**函数调用自身**。

```typescript
function countdown(n: number): void {
  if (n === 0) {
    console.log("Done!");
    return;
  }
  console.log(n);
  countdown(n - 1);  // 调用自身
}
```

但这个定义并没有揭示递归的本质。递归的真正力量在于：**它把一个大问题分解成结构相同的小问题**。

### 递归的数学根基

递归与数学归纳法是同一概念的两面：

**数学归纳法**（自底向上证明）：
1. 证明 n=1 时命题成立（基础情况）
2. 假设 n=k 时成立，证明 n=k+1 也成立（归纳步骤）
3. 结论：对所有 n 都成立

**递归**（自顶向下计算）：
1. 定义 n=1 时的答案（基础情况）
2. 假设 n-1 的问题已解决，用它构造 n 的答案（递归步骤）
3. 计算过程：从 n 向下递推到 1，再回溯得到答案

以阶乘为例：

```
数学定义：
n! = 1           (n = 0)
n! = n × (n-1)!  (n > 0)

递归实现：
function factorial(n: number): number {
  if (n === 0) return 1;           // 基础情况
  return n * factorial(n - 1);     // 递归步骤
}
```

### 递归的执行模型：调用栈

理解递归的关键是理解**调用栈**。每次函数调用都会在栈上创建一个新的栈帧，保存局部变量和返回地址。

```
调用 factorial(4) 的栈变化：

调用阶段（压栈）：
┌─────────────────┐
│ factorial(4)    │  等待 factorial(3) 的结果
├─────────────────┤
│ factorial(3)    │  等待 factorial(2) 的结果
├─────────────────┤
│ factorial(2)    │  等待 factorial(1) 的结果
├─────────────────┤
│ factorial(1)    │  等待 factorial(0) 的结果
├─────────────────┤
│ factorial(0)    │  返回 1
└─────────────────┘

返回阶段（弹栈）：
factorial(0) = 1
factorial(1) = 1 × 1 = 1
factorial(2) = 2 × 1 = 2
factorial(3) = 3 × 2 = 6
factorial(4) = 4 × 6 = 24
```

**重要洞察**：递归的空间复杂度至少是 O(递归深度)，因为每层调用都占用栈空间。

---

## 递归的设计方法

设计递归函数时，遵循以下步骤：

### 第一步：定义函数的含义

明确函数接收什么参数、返回什么结果。这是递归设计的起点。

```typescript
/**
 * 计算 n 的阶乘
 * @param n - 非负整数
 * @returns n!
 */
function factorial(n: number): number
```

### 第二步：找到基础情况

基础情况是递归的终止条件，是不需要继续递归就能直接给出答案的情况。

**寻找基础情况的技巧**：
- 最简单的输入是什么？
- 空集合、空字符串、n=0 或 n=1 时的答案是什么？
- 问题规模无法再缩小时的答案是什么？

```typescript
// 阶乘的基础情况
if (n === 0) return 1;  // 0! = 1

// 链表遍历的基础情况
if (node === null) return;  // 空节点，无需处理

// 二叉树的基础情况
if (root === null) return 0;  // 空树的高度是 0
```

### 第三步：找到递归关系

递归关系描述的是：**假设小规模问题已经解决，如何用它构造当前问题的答案**。

这一步需要"递归的信仰跳跃"——相信递归调用会给出正确结果，不要尝试追踪每一层的执行细节。

```typescript
// 阶乘：n! = n × (n-1)!
return n * factorial(n - 1);

// 链表长度：当前链表长度 = 1 + 剩余链表长度
return 1 + getLength(node.next);

// 二叉树高度：树的高度 = 1 + max(左子树高度, 右子树高度)
return 1 + Math.max(height(root.left), height(root.right));
```

### 第四步：验证三个要素

检查递归函数是否满足：

1. **基础情况**：是否处理了所有终止条件？
2. **递归关系**：每次递归是否向基础情况靠近？
3. **返回值**：返回值类型是否正确？是否所有分支都有返回？

---

## 递归的思维模式

### 模式一：自顶向下分解

从原问题出发，分解成子问题，子问题再分解，直到触底反弹。

```
问题：计算 fibonacci(5)

分解过程：
           fib(5)
          /      \
       fib(4)   fib(3)
       /   \     /   \
    fib(3) fib(2) fib(2) fib(1)
    ...

回溯过程：
fib(1)=1, fib(2)=1
fib(3)=fib(2)+fib(1)=2
fib(4)=fib(3)+fib(2)=3
fib(5)=fib(4)+fib(3)=5
```

### 模式二：假设子问题已解决

这是递归设计的核心技巧。不要想"递归是如何展开的"，而是问：

> "如果我已经知道了子问题的答案，如何构造当前问题的答案？"

**例：反转链表**

```typescript
function reverseList(head: ListNode | null): ListNode | null {
  // 基础情况
  if (head === null || head.next === null) {
    return head;
  }
  
  // 假设 reverseList(head.next) 已经正确反转了后面的链表
  // 现在我只需要处理 head 节点
  const newHead = reverseList(head.next);
  
  // head.next 是反转后链表的尾节点
  // 把 head 接到尾部
  head.next.next = head;
  head.next = null;
  
  return newHead;
}
```

```
原链表：1 → 2 → 3 → 4 → null

假设 reverseList(2→3→4) 已完成：
newHead → 4 → 3 → 2 → null
               ↑
          head.next（反转后的尾节点）

现在处理 head（节点1）：
head.next.next = head  →  2.next = 1
head.next = null       →  1.next = null

结果：4 → 3 → 2 → 1 → null
```

---

## 递归的陷阱与注意事项

### 陷阱一：栈溢出

递归深度过大会导致栈溢出。JavaScript 的默认栈大小约为 10,000 层。

```typescript
// 危险：n 很大时会栈溢出
function sum(n: number): number {
  if (n === 0) return 0;
  return n + sum(n - 1);
}

sum(100000);  // RangeError: Maximum call stack size exceeded
```

**解决方案**：
- 转换为迭代
- 使用尾递归优化（需要引擎支持）
- 使用显式栈模拟递归

### 陷阱二：重复计算

朴素递归可能导致大量重复计算。

```typescript
// 低效：存在大量重复计算
function fib(n: number): number {
  if (n <= 1) return n;
  return fib(n - 1) + fib(n - 2);
}
```

```
fib(5) 的计算过程：
fib(5) = fib(4) + fib(3)
fib(4) = fib(3) + fib(2)    // fib(3) 被计算了 2 次
fib(3) = fib(2) + fib(1)    // fib(2) 被计算了 3 次
...

时间复杂度：O(2^n)
```

**解决方案**：记忆化（Memoization）

```typescript
function fib(n: number, memo: Map<number, number> = new Map()): number {
  if (n <= 1) return n;
  if (memo.has(n)) return memo.get(n)!;
  
  const result = fib(n - 1, memo) + fib(n - 2, memo);
  memo.set(n, result);
  return result;
}
```

### 陷阱三：遗漏基础情况

基础情况不完整会导致无限递归。

```typescript
// 错误：遗漏了 n < 0 的情况
function factorial(n: number): number {
  if (n === 0) return 1;
  return n * factorial(n - 1);
}

factorial(-1);  // 无限递归，栈溢出
```

---

## 本章小结

1. **递归的本质**：把大问题分解成结构相同的小问题
2. **设计递归的步骤**：定义函数含义 → 确定基础情况 → 找到递归关系
3. **递归思维的关键**：相信子问题已经解决，专注于如何用子问题的答案构造当前答案

递归是后续所有高级算法的基础。掌握递归思维后，回溯、分治、动态规划都将变得自然而然。

---

## 练习

1. 用递归实现：计算数组所有元素的和
2. 用递归实现：判断一个字符串是否是回文串
3. 用递归实现：计算 x 的 n 次幂（考虑 n 为负数的情况）
