# 递归的三要素

掌握了递归的本质后，我们需要一个实用的框架来指导递归函数的设计。**递归三要素**就是这样一个框架——它将递归设计拆解为三个明确的步骤。

本章将深入讲解递归三要素，并用大量示例展示如何运用这个框架设计正确的递归函数。

---

## 什么是递归三要素

递归三要素是设计递归函数必须明确的三个问题：

### 1. 递归函数的定义（功能）

**明确函数要做什么**，即函数的输入和输出。

```typescript
/**
 * 计算 n 的阶乘
 * @param n - 非负整数
 * @returns n! = n × (n-1) × ... × 1
 */
function factorial(n: number): number
```

这一步看似简单，却是最关键的。清晰的函数定义是后续推导的基础。

### 2. 递归终止条件（基础情况）

**什么时候停止递归**，即问题的最简单形式。

```typescript
// 阶乘的终止条件
if (n === 0 || n === 1) {
  return 1;  // 0! = 1, 1! = 1
}
```

终止条件必须能够直接给出答案，不需要继续递归。

### 3. 递归关系（递推公式）

**如何缩小问题规模**，即用子问题的解构造当前问题的解。

```typescript
// 阶乘的递归关系：n! = n × (n-1)!
return n * factorial(n - 1);
```

关键在于"递归的信仰跳跃"——相信 `factorial(n-1)` 会正确返回 `(n-1)!`，我们只需要用它来计算 `n!`。

---

## 三要素的应用：链表反转

让我们用递归三要素来设计"反转链表"的递归解法。

### 第一步：定义函数功能

```typescript
/**
 * 反转以 head 为起点的链表
 * @param head - 链表头节点
 * @returns 反转后的链表头节点
 */
function reverseList(head: ListNode | null): ListNode | null
```

**函数功能**：输入一个链表头，返回反转后的链表头。

```
输入: 1 → 2 → 3 → 4 → null
输出: 4 → 3 → 2 → 1 → null
```

### 第二步：确定终止条件

最简单的情况是什么？

- 空链表（`head === null`）：反转后还是空
- 单节点链表（`head.next === null`）：反转后还是自己

```typescript
if (head === null || head.next === null) {
  return head;
}
```

### 第三步：建立递归关系

**关键问题**：假设 `reverseList(head.next)` 已经正确反转了后面的链表，如何处理 `head` 节点？

```
原链表: 1 → 2 → 3 → 4 → null
              ↑
            head

假设 reverseList(head.next) 已完成:
newHead → 4 → 3 → 2 → null
                    ↑
               head.next (反转后的尾节点)

现在要做什么？
1. 让 head.next 指向 head: head.next.next = head
2. 断开 head 原本的 next: head.next = null

结果: 4 → 3 → 2 → 1 → null
```

**完整实现**：

```typescript
function reverseList(head: ListNode | null): ListNode | null {
  // 1. 定义函数功能：反转以 head 为起点的链表
  
  // 2. 终止条件：空链表或单节点链表
  if (head === null || head.next === null) {
    return head;
  }
  
  // 3. 递归关系：假设后面已反转，处理 head
  const newHead = reverseList(head.next);  // 反转后面的链表
  head.next.next = head;  // 让下一个节点指向 head
  head.next = null;       // 断开 head 的 next
  
  return newHead;
}
```

---

## 三要素的应用：二叉树最大深度

### 第一步：定义函数功能

```typescript
/**
 * 计算二叉树的最大深度
 * @param root - 二叉树根节点
 * @returns 树的最大深度（根到叶子的最长路径节点数）
 */
function maxDepth(root: TreeNode | null): number
```

### 第二步：确定终止条件

最简单的情况：空树的深度是 0。

```typescript
if (root === null) {
  return 0;
}
```

### 第三步：建立递归关系

**关键问题**：假设已知左右子树的深度，如何计算整棵树的深度？

```
      1          深度 = 1 + max(左子树深度, 右子树深度)
     / \
    2   3        左子树深度 = maxDepth(root.left)
   /             右子树深度 = maxDepth(root.right)
  4
```

**完整实现**：

```typescript
function maxDepth(root: TreeNode | null): number {
  // 1. 定义函数功能：计算以 root 为根的树的最大深度
  
  // 2. 终止条件：空树深度为 0
  if (root === null) {
    return 0;
  }
  
  // 3. 递归关系：树的深度 = 1 + max(左深度, 右深度)
  const leftDepth = maxDepth(root.left);
  const rightDepth = maxDepth(root.right);
  return 1 + Math.max(leftDepth, rightDepth);
}
```

---

## 三要素的应用：斐波那契数列

### 第一步：定义函数功能

```typescript
/**
 * 计算第 n 个斐波那契数
 * @param n - 非负整数，n >= 0
 * @returns F(n)
 */
function fib(n: number): number
```

### 第二步：确定终止条件

根据斐波那契的定义：
- F(0) = 0
- F(1) = 1

```typescript
if (n === 0) return 0;
if (n === 1) return 1;
```

### 第三步：建立递归关系

斐波那契的递推公式：F(n) = F(n-1) + F(n-2)

```typescript
return fib(n - 1) + fib(n - 2);
```

**完整实现**：

```typescript
function fib(n: number): number {
  // 1. 定义函数功能：计算第 n 个斐波那契数
  
  // 2. 终止条件
  if (n === 0) return 0;
  if (n === 1) return 1;
  
  // 3. 递归关系：F(n) = F(n-1) + F(n-2)
  return fib(n - 1) + fib(n - 2);
}
```

**优化版本（记忆化）**：

```typescript
function fib(n: number, memo: Map<number, number> = new Map()): number {
  // 终止条件
  if (n === 0) return 0;
  if (n === 1) return 1;
  
  // 查找缓存
  if (memo.has(n)) {
    return memo.get(n)!;
  }
  
  // 递归计算并缓存
  const result = fib(n - 1, memo) + fib(n - 2, memo);
  memo.set(n, result);
  return result;
}
```

---

## 三要素的应用：数组求和

### 第一步：定义函数功能

```typescript
/**
 * 计算数组所有元素的和
 * @param arr - 数字数组
 * @param index - 当前处理的索引（默认从 0 开始）
 * @returns 从 index 到末尾的元素和
 */
function arraySum(arr: number[], index: number = 0): number
```

### 第二步：确定终止条件

- 空数组或越界：和为 0

```typescript
if (index >= arr.length) {
  return 0;
}
```

### 第三步：建立递归关系

当前元素 + 剩余元素的和

```typescript
return arr[index] + arraySum(arr, index + 1);
```

**完整实现**：

```typescript
function arraySum(arr: number[], index: number = 0): number {
  // 1. 定义函数功能：计算从 index 到末尾的元素和
  
  // 2. 终止条件：越界时返回 0
  if (index >= arr.length) {
    return 0;
  }
  
  // 3. 递归关系：当前元素 + 剩余元素和
  return arr[index] + arraySum(arr, index + 1);
}
```

**调用过程**：

```
arraySum([1, 2, 3, 4], 0)
= 1 + arraySum([1,2,3,4], 1)
= 1 + (2 + arraySum([1,2,3,4], 2))
= 1 + (2 + (3 + arraySum([1,2,3,4], 3)))
= 1 + (2 + (3 + (4 + arraySum([1,2,3,4], 4))))
= 1 + (2 + (3 + (4 + 0)))
= 10
```

---

## 常见错误与调试技巧

### 错误1：终止条件不完整

```typescript
// ❌ 错误：遗漏了 n < 0 的情况
function factorial(n: number): number {
  if (n === 0) return 1;
  return n * factorial(n - 1);
}

factorial(-1);  // 无限递归！

// ✅ 正确：处理所有边界情况
function factorial(n: number): number {
  if (n < 0) throw new Error("n must be non-negative");
  if (n === 0 || n === 1) return 1;
  return n * factorial(n - 1);
}
```

### 错误2：递归关系不向终止条件靠近

```typescript
// ❌ 错误：n 没有变化，永远不会到达终止条件
function bad(n: number): number {
  if (n === 0) return 0;
  return 1 + bad(n);  // n 没有减小！
}

// ✅ 正确：每次递归都缩小问题规模
function good(n: number): number {
  if (n === 0) return 0;
  return 1 + good(n - 1);  // n 逐渐减小
}
```

### 调试技巧：打印调用栈

```typescript
function fib(n: number, depth: number = 0): number {
  const indent = "  ".repeat(depth);
  console.log(`${indent}fib(${n}) called`);
  
  if (n === 0) {
    console.log(`${indent}fib(${n}) returns 0`);
    return 0;
  }
  if (n === 1) {
    console.log(`${indent}fib(${n}) returns 1`);
    return 1;
  }
  
  const result = fib(n - 1, depth + 1) + fib(n - 2, depth + 1);
  console.log(`${indent}fib(${n}) returns ${result}`);
  return result;
}

fib(4);
```

**输出**：

```
fib(4) called
  fib(3) called
    fib(2) called
      fib(1) called
      fib(1) returns 1
      fib(0) called
      fib(0) returns 0
    fib(2) returns 1
    fib(1) called
    fib(1) returns 1
  fib(3) returns 2
  fib(2) called
    fib(1) called
    fib(1) returns 1
    fib(0) called
    fib(0) returns 0
  fib(2) returns 1
fib(4) returns 3
```

---

## 三要素检查清单

设计递归函数时，用这个清单自检：

**第一要素：函数定义**
- [ ] 函数的输入参数明确了吗？
- [ ] 函数的返回值类型明确了吗？
- [ ] 函数的功能用一句话能说清楚吗？

**第二要素：终止条件**
- [ ] 找到了最简单的输入情况吗？
- [ ] 终止条件能直接返回结果吗？
- [ ] 所有边界情况都处理了吗（空、负数、0、1 等）？

**第三要素：递归关系**
- [ ] 递归调用的问题规模比当前小吗？
- [ ] 每次递归都向终止条件靠近吗？
- [ ] 用子问题的解能构造当前问题的解吗？

---

## 本章小结

**递归三要素是递归设计的系统化方法**：

1. **定义函数功能**：明确输入和输出
2. **确定终止条件**：找到最简单的情况
3. **建立递归关系**：用子问题的解构造当前解

掌握三要素后，设计递归函数就有了明确的步骤。遇到递归问题时，不要试图追踪每一层的执行，而是：

> "定义清楚功能，找到终止条件，相信子问题已解决，专注于如何用子问题构造当前答案。"

---

## 练习

用递归三要素设计以下函数：

1. **判断回文串**：`isPalindrome(s: string): boolean`
2. **二叉树节点数**：`countNodes(root: TreeNode): number`
3. **数组最大值**：`findMax(arr: number[], index: number): number`
4. **字符串反转**：`reverseString(s: string): string`
5. **计算 x^n**：`power(x: number, n: number): number`（考虑 n 为负数）
