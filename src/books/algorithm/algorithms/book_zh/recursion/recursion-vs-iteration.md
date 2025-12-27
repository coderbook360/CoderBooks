# 递归与迭代的转换

递归优雅简洁，但有栈溢出的风险。迭代效率更高，但代码可能更复杂。理解递归与迭代的转换，能让你在两种方式之间灵活切换。

**本章核心问题：如何将递归改写为迭代？什么时候应该选择递归或迭代？**

---

## 递归 vs 迭代：优劣对比

### 递归的优势

1. **代码简洁**：问题的递归定义直接转化为代码
2. **易于理解**：符合数学归纳法的思维
3. **自然表达**：树、图等递归结构的遍历

**示例：计算阶乘**

```typescript
// 递归版本：简洁明了
function factorialRecursive(n: number): number {
  if (n <= 1) return 1;
  return n * factorialRecursive(n - 1);
}
```

### 递归的劣势

1. **栈空间开销**：每次调用占用栈空间，深度过大会栈溢出
2. **性能较低**：函数调用有额外开销
3. **重复计算**：朴素递归可能导致指数级重复计算

```typescript
// 问题：n 很大时栈溢出
factorialRecursive(100000);  // RangeError: Maximum call stack size exceeded
```

### 迭代的优势

1. **空间效率**：通常只用 O(1) 空间
2. **执行效率**：没有函数调用开销
3. **无栈溢出风险**：适合处理大规模数据

**示例：计算阶乘**

```typescript
// 迭代版本：空间 O(1)，无栈溢出风险
function factorialIterative(n: number): number {
  let result = 1;
  for (let i = 2; i <= n; i++) {
    result *= i;
  }
  return result;
}

factorialIterative(100000);  // 能正常执行（结果会溢出，但不会栈溢出）
```

### 迭代的劣势

1. **代码复杂**：需要显式管理状态
2. **不够直观**：某些问题的迭代解法不如递归清晰

---

## 转换方法一：尾递归优化

### 什么是尾递归

**尾递归**：递归调用是函数的最后一个操作，调用后不需要任何额外计算。

```typescript
// ❌ 非尾递归：调用后还要乘以 n
function factorial(n: number): number {
  if (n <= 1) return 1;
  return n * factorial(n - 1);  // 调用后还要 * n
}

// ✅ 尾递归：调用是最后一个操作
function factorialTail(n: number, acc: number = 1): number {
  if (n <= 1) return acc;
  return factorialTail(n - 1, n * acc);  // 调用后直接返回结果
}
```

**尾递归的优势**：编译器可以优化为迭代，不增加栈深度（但 JavaScript 引擎大多不支持）。

### 将普通递归改为尾递归

**关键技巧**：引入累加器参数，将中间结果作为参数传递。

**示例：斐波那契数列**

```typescript
// 非尾递归：有两个递归调用
function fib(n: number): number {
  if (n <= 1) return n;
  return fib(n - 1) + fib(n - 2);
}

// 尾递归：用两个累加器维护 F(n-2) 和 F(n-1)
function fibTail(n: number, prev: number = 0, curr: number = 1): number {
  if (n === 0) return prev;
  if (n === 1) return curr;
  return fibTail(n - 1, curr, prev + curr);
}

// 调用过程：
// fibTail(5, 0, 1)
// fibTail(4, 1, 1)  // prev=1, curr=1
// fibTail(3, 1, 2)  // prev=1, curr=2
// fibTail(2, 2, 3)  // prev=2, curr=3
// fibTail(1, 3, 5)  // prev=3, curr=5
// return 5
```

---

## 转换方法二：使用栈模拟递归

递归本质上是利用系统调用栈。我们可以用显式栈模拟这个过程。

### 步骤

1. 创建一个栈
2. 将初始状态入栈
3. 循环处理栈顶元素，将子问题入栈
4. 弹栈并组合结果

### 示例：阶乘

```typescript
// 递归版本
function factorialRecursive(n: number): number {
  if (n <= 1) return 1;
  return n * factorialRecursive(n - 1);
}

// 用栈模拟
function factorialStack(n: number): number {
  if (n <= 1) return 1;
  
  const stack: number[] = [];
  
  // 压栈阶段：模拟递归的下降过程
  while (n > 1) {
    stack.push(n);
    n--;
  }
  
  // 弹栈阶段：模拟递归的回溯过程
  let result = 1;
  while (stack.length > 0) {
    result *= stack.pop()!;
  }
  
  return result;
}

// 调用过程：
// factorialStack(5)
// 压栈：[5, 4, 3, 2]
// 弹栈：result = 1 * 2 * 3 * 4 * 5 = 120
```

### 示例：二叉树前序遍历

```typescript
/**
 * 递归版本 - 简洁但有栈溢出风险
 * 
 * 前序遍历顺序：根 → 左 → 右
 * 递归天然符合这个顺序
 */
function preorderRecursive(root: TreeNode | null): number[] {
  if (root === null) return [];
  return [
    root.val,                           // 1. 访问根
    ...preorderRecursive(root.left),    // 2. 遍历左子树
    ...preorderRecursive(root.right)    // 3. 遍历右子树
  ];
}

/**
 * 用栈模拟递归 - 避免栈溢出
 * 
 * 【核心思想】
 * 递归本质上是利用系统调用栈
 * 我们可以用自己的栈来模拟这个过程
 * 
 * 【为什么先压右子树，再压左子树？】
 * 因为栈是"后进先出"（LIFO）
 * 我们想让左子树先被访问，所以左子树要后入栈
 * 这样左子树会先被弹出处理
 * 
 * 时间复杂度：O(n)
 * 空间复杂度：O(h)，h 为树的高度
 */
function preorderStack(root: TreeNode | null): number[] {
  if (root === null) return [];
  
  const result: number[] = [];
  const stack: TreeNode[] = [root];  // 初始化栈，放入根节点
  
  while (stack.length > 0) {
    // 弹出栈顶节点并访问
    const node = stack.pop()!;
    result.push(node.val);
    
    // ★★★ 关键：先压右，再压左 ★★★
    // 这样弹出时顺序是：左先，右后
    // 符合前序遍历的 "根→左→右" 顺序
    if (node.right) stack.push(node.right);  // 右子树先入栈，后出
    if (node.left) stack.push(node.left);    // 左子树后入栈，先出
  }
  
  return result;
}
```

---

## 转换方法三：找到迭代公式

很多递归问题可以直接推导出迭代公式。

### 示例：斐波那契数列

**递归定义**：F(n) = F(n-1) + F(n-2)

**迭代实现**：从 F(0) 和 F(1) 开始向上计算

```typescript
// 递归版本：O(2^n) 时间，O(n) 空间
function fibRecursive(n: number): number {
  if (n <= 1) return n;
  return fibRecursive(n - 1) + fibRecursive(n - 2);
}

// 迭代版本：O(n) 时间，O(1) 空间
function fibIterative(n: number): number {
  if (n <= 1) return n;
  
  let prev = 0;   // F(0)
  let curr = 1;   // F(1)
  
  for (let i = 2; i <= n; i++) {
    const next = prev + curr;  // F(i) = F(i-1) + F(i-2)
    prev = curr;
    curr = next;
  }
  
  return curr;
}
```

### 示例：爬楼梯

**问题**：爬 n 级楼梯，每次可以爬 1 或 2 级，有多少种方法？

**递归定义**：ways(n) = ways(n-1) + ways(n-2)

```typescript
// 递归版本
function climbStairsRecursive(n: number): number {
  if (n === 1) return 1;
  if (n === 2) return 2;
  return climbStairsRecursive(n - 1) + climbStairsRecursive(n - 2);
}

// 迭代版本
function climbStairsIterative(n: number): number {
  if (n === 1) return 1;
  if (n === 2) return 2;
  
  let prev = 1;  // ways(1)
  let curr = 2;  // ways(2)
  
  for (let i = 3; i <= n; i++) {
    const next = prev + curr;
    prev = curr;
    curr = next;
  }
  
  return curr;
}
```

---

## 转换方法四：记忆化（介于递归和迭代之间）

记忆化是一种优化递归的技术，缓存计算结果避免重复。

```typescript
// 朴素递归：O(2^n)
function fibNaive(n: number): number {
  if (n <= 1) return n;
  return fibNaive(n - 1) + fibNaive(n - 2);
}

// 记忆化递归：O(n) 时间，O(n) 空间
function fibMemo(n: number, memo: Map<number, number> = new Map()): number {
  if (n <= 1) return n;
  
  if (memo.has(n)) {
    return memo.get(n)!;
  }
  
  const result = fibMemo(n - 1, memo) + fibMemo(n - 2, memo);
  memo.set(n, result);
  return result;
}

// 自底向上的动态规划：O(n) 时间，O(n) 空间
function fibDP(n: number): number {
  if (n <= 1) return n;
  
  const dp: number[] = [0, 1];
  for (let i = 2; i <= n; i++) {
    dp[i] = dp[i - 1] + dp[i - 2];
  }
  
  return dp[n];
}

// 空间优化的 DP：O(n) 时间，O(1) 空间
function fibDPOptimized(n: number): number {
  if (n <= 1) return n;
  
  let prev = 0, curr = 1;
  for (let i = 2; i <= n; i++) {
    const next = prev + curr;
    prev = curr;
    curr = next;
  }
  
  return curr;
}
```

---

## 何时选择递归或迭代

### 优先选择递归

1. **问题天然递归**：树、图的遍历，回溯搜索
2. **递归定义清晰**：数学归纳法、分治问题
3. **代码简洁性**：递归版本明显更简单
4. **问题规模小**：不会导致栈溢出

**示例**：二叉树遍历、组合生成、N 皇后

### 优先选择迭代

1. **问题规模大**：可能导致栈溢出
2. **性能敏感**：需要极致的时间和空间效率
3. **尾递归**：能轻松改为迭代
4. **简单循环**：阶乘、求和等

**示例**：大规模数组处理、斐波那契数列、阶乘

### 混合方案

1. **记忆化递归**：保留递归简洁性，优化性能
2. **递归 + 剪枝**：减少不必要的递归调用
3. **迭代 + 栈**：用栈模拟递归，避免栈溢出

---

## 转换练习

### 练习1：数组求和

```typescript
// 递归版本
function sumRecursive(arr: number[], index: number = 0): number {
  if (index >= arr.length) return 0;
  return arr[index] + sumRecursive(arr, index + 1);
}

// 改为迭代
function sumIterative(arr: number[]): number {
  let sum = 0;
  for (const num of arr) {
    sum += num;
  }
  return sum;
}
```

### 练习2：反转字符串

```typescript
// 递归版本
function reverseRecursive(s: string): string {
  if (s.length <= 1) return s;
  return reverseRecursive(s.slice(1)) + s[0];
}

// 改为迭代
function reverseIterative(s: string): string {
  let result = '';
  for (let i = s.length - 1; i >= 0; i--) {
    result += s[i];
  }
  return result;
}
```

### 练习3：链表反转

```typescript
// 递归版本
function reverseListRecursive(head: ListNode | null): ListNode | null {
  if (head === null || head.next === null) return head;
  const newHead = reverseListRecursive(head.next);
  head.next.next = head;
  head.next = null;
  return newHead;
}

// 改为迭代
function reverseListIterative(head: ListNode | null): ListNode | null {
  let prev: ListNode | null = null;
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

---

## 本章小结

**递归与迭代的转换方法**：

1. **尾递归优化**：引入累加器，将中间结果作为参数
2. **显式栈模拟**：用栈结构模拟递归的调用栈
3. **推导迭代公式**：从递归定义推导出循环实现
4. **记忆化**：缓存递归结果，兼顾简洁性和效率

**选择建议**：
- 问题天然递归 → 用递归
- 问题规模大 → 用迭代
- 需要优化递归 → 记忆化或改迭代

掌握转换技巧后，你就能在递归和迭代之间自由切换，选择最合适的实现方式。

---

## 练习

1. 将递归版本的"二叉树最大深度"改为迭代（用队列实现层序遍历）
2. 将递归版本的"计算 x^n"改为迭代
3. 比较递归和迭代版本的快速排序
