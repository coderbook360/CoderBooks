# 递归与迭代的复杂度分析

在前几章中，我们已经学会了分析简单循环的复杂度。但很多算法——树的遍历、分治、回溯——都是用**递归**实现的。

递归的复杂度分析，和循环不太一样。这一章，我们来专门搞定它。

## 递归与迭代的概念

先明确两个概念：

- **递归（Recursion）**：函数调用自身来解决问题
- **迭代（Iteration）**：通过循环重复执行来解决问题

它们在理论上是等价的——任何递归都可以用迭代实现，反之亦然。但在实践中，各有优劣。

### 经典例子：阶乘

```javascript
// 递归实现
function factorialRecursive(n) {
    if (n <= 1) return 1;              // 基准情况（终止条件）
    return n * factorialRecursive(n - 1); // 递归调用
}

// 迭代实现
function factorialIterative(n) {
    let result = 1;
    for (let i = 2; i <= n; i++) {
        result *= i;
    }
    return result;
}
```

两者都能正确计算阶乘，但特点不同：

| 特性 | 递归 | 迭代 |
|-----|------|------|
| 代码简洁性 | 通常更简洁 | 可能更冗长 |
| 可读性 | 直观表达分治思想 | 需要跟踪循环状态 |
| 空间开销 | 有调用栈开销 | 通常更省空间 |
| 性能 | 有函数调用开销 | 通常更快 |
| 栈溢出风险 | 有 | 无 |

## 递归的时间复杂度分析

分析递归复杂度的关键是：**写出递推关系式**，然后求解。

### 线性递归

```javascript
function linearRecursion(n) {
    if (n <= 0) return;
    console.log(n);         // O(1) 操作
    linearRecursion(n - 1); // 递归调用
}
```

每次调用做 O(1) 的工作，然后递归调用一次，问题规模减 1。

递推式是：
```
T(n) = T(n-1) + O(1)
```

展开它：
```
T(n) = T(n-1) + 1
     = T(n-2) + 2
     = T(n-3) + 3
     = ...
     = T(0) + n
     = O(n)
```

**时间复杂度：O(n)**

### 二分递归

```javascript
function binaryRecursion(n) {
    if (n <= 1) return;
    console.log(n);            // O(1) 操作
    binaryRecursion(n / 2);    // 问题规模减半
}
```

递推式是：
```
T(n) = T(n/2) + O(1)
```

展开：
```
T(n) = T(n/2) + 1
     = T(n/4) + 2
     = T(n/8) + 3
     = ...
     = T(1) + log n
     = O(log n)
```

**时间复杂度：O(log n)**

### 双分支递归

```javascript
function fibonacci(n) {
    if (n <= 1) return n;
    return fibonacci(n - 1) + fibonacci(n - 2);
}
```

每次调用会产生两个子调用。递推式是：
```
T(n) = T(n-1) + T(n-2) + O(1)
```

这个式子不好直接展开，但可以估算：
```
T(n) ≈ 2·T(n-1)
     = 2·2·T(n-2)
     = 2^n · T(0)
     = O(2^n)
```

**时间复杂度：O(2^n)**

这就是朴素斐波那契递归如此慢的原因——指数级增长。

### 归并排序式递归

```javascript
function mergeSort(arr) {
    if (arr.length <= 1) return arr;
    
    const mid = Math.floor(arr.length / 2);
    const left = mergeSort(arr.slice(0, mid));   // T(n/2)
    const right = mergeSort(arr.slice(mid));     // T(n/2)
    
    return merge(left, right);                    // O(n)
}
```

两个规模减半的子问题，加上 O(n) 的合并操作。递推式是：
```
T(n) = 2T(n/2) + O(n)
```

**时间复杂度：O(n log n)**

这个结果怎么来的？接下来介绍一个快速求解递推式的工具。

## 主定理（Master Theorem）

主定理是一个**公式**，专门用于求解形如 `T(n) = aT(n/b) + f(n)` 的递推式。

这里：
- `a` 是子问题的个数
- `b` 是问题规模缩小的倍数
- `f(n)` 是每层除递归外的工作量

### 简化版本

对于 `T(n) = aT(n/b) + O(n^d)` 这种常见形式：

1. 如果 `a < b^d`，则 `T(n) = O(n^d)`
2. 如果 `a = b^d`，则 `T(n) = O(n^d · log n)`
3. 如果 `a > b^d`，则 `T(n) = O(n^(log_b a))`

### 应用示例

| 递推式 | a | b | d | 比较 | 结果 |
|-------|---|---|---|------|------|
| T(n) = 2T(n/2) + n | 2 | 2 | 1 | a = b^d | O(n log n) |
| T(n) = T(n/2) + 1 | 1 | 2 | 0 | a = b^d | O(log n) |
| T(n) = 2T(n/2) + 1 | 2 | 2 | 0 | a > b^d | O(n) |
| T(n) = 2T(n/2) + n² | 2 | 2 | 2 | a < b^d | O(n²) |

**例子：归并排序**

`T(n) = 2T(n/2) + O(n)`

- a = 2，b = 2，d = 1
- a = 2，b^d = 2^1 = 2
- a = b^d，属于情况 2
- 结果：O(n^1 · log n) = O(n log n)

**例子：二分查找**

`T(n) = T(n/2) + O(1)`

- a = 1，b = 2，d = 0
- a = 1，b^d = 2^0 = 1
- a = b^d，属于情况 2
- 结果：O(n^0 · log n) = O(log n)

主定理不是万能的——它只适用于特定形式的递推式。但对于大多数分治算法，它够用了。

## 递归的空间复杂度分析

递归的空间开销来自**调用栈**。

每次函数调用，都会在栈上分配空间保存：
- 函数参数
- 局部变量
- 返回地址

这些空间在函数返回前一直占用。所以递归的空间复杂度取决于：

**空间复杂度 = 递归深度 × 每层空间开销**

### 例子：斐波那契

```javascript
function fib(n) {
    if (n <= 1) return n;
    return fib(n-1) + fib(n-2);
}
```

虽然会产生 O(2^n) 次函数调用，但在任意时刻，调用栈的深度最多是 n。

为什么？因为我们是深度优先的——先算完 `fib(n-1)` 的整个子树，`fib(n-2)` 那一边还没开始。

```
fib(5) 的调用栈变化（只展示一条路径）：

| fib(1) | ← 最深处，然后返回
| fib(2) |
| fib(3) |
| fib(4) |
| fib(5) | ← 栈底

最大深度 = 5 = n
```

**空间复杂度：O(n)**

### 例子：归并排序

```javascript
function mergeSort(arr) {
    if (arr.length <= 1) return arr;
    
    const mid = Math.floor(arr.length / 2);
    const left = mergeSort(arr.slice(0, mid));  // 创建新数组
    const right = mergeSort(arr.slice(mid));
    
    return merge(left, right);
}
```

递归深度是 O(log n)。但这里有个陷阱：

每次 `slice` 都会创建新数组。虽然递归深度是 O(log n)，但每层创建的数组总大小是 O(n)。

**空间复杂度：O(n)**（主要来自数组复制，不是调用栈）

## 递归转迭代

很多时候，我们需要把递归改成迭代——要么是为了节省栈空间，要么是因为递归太深会栈溢出。

### 方法 1：尾递归优化

如果递归调用是函数的**最后一个操作**，这种递归叫**尾递归**。

```javascript
// 普通递归
function factorial(n) {
    if (n <= 1) return 1;
    return n * factorial(n - 1);  // 不是尾递归：返回后还要乘 n
}

// 尾递归
function factorialTail(n, acc = 1) {
    if (n <= 1) return acc;
    return factorialTail(n - 1, n * acc);  // 是尾递归：直接返回
}
```

尾递归可以很容易地改写成循环：

```javascript
function factorialIterative(n) {
    let acc = 1;
    while (n > 1) {
        acc = n * acc;
        n = n - 1;
    }
    return acc;
}
```

注意：JavaScript 引擎对尾递归优化的支持有限。在实际中，手动改成循环更可靠。

### 方法 2：显式栈模拟

当递归逻辑比较复杂时，可以用一个**栈数据结构**来模拟调用栈。

经典例子是树的遍历：

```javascript
// 递归版：前序遍历
function preorderRecursive(root) {
    if (!root) return [];
    return [
        root.val,
        ...preorderRecursive(root.left),
        ...preorderRecursive(root.right)
    ];
}

// 迭代版：用栈模拟
function preorderIterative(root) {
    const result = [];
    const stack = [root];
    
    while (stack.length > 0) {
        const node = stack.pop();
        if (!node) continue;
        
        result.push(node.val);
        
        // 先压右子树，后压左子树
        // 这样弹出时先处理左子树
        stack.push(node.right);
        stack.push(node.left);
    }
    
    return result;
}
```

迭代版的空间复杂度仍然是 O(n)（栈的最大深度），但避免了函数调用的开销。

## 何时使用递归 vs 迭代

没有绝对的好坏，要看具体场景：

| 场景 | 推荐方式 | 原因 |
|-----|---------|------|
| 树的遍历 | 递归 | 代码简洁，天然匹配树结构 |
| 简单循环计算 | 迭代 | 无栈开销，效率高 |
| 分治算法 | 递归 | 更直观地表达分治思想 |
| 递归深度可能很大 | 迭代 | 避免栈溢出 |
| 回溯算法 | 递归 | 状态管理更简单 |

### 实用建议

1. **先用递归**：通常更容易写对
2. **测试深度**：如果输入规模大，考虑递归深度会不会爆栈
3. **按需转换**：只有在确实有问题时才改成迭代

JavaScript 的默认调用栈大小大约是 10000 层。如果你的递归深度可能超过这个数，就需要用迭代了。

## 常见错误

### 错误 1：忘记基准情况

```javascript
// 错误：没有终止条件，无限递归
function badRecursion(n) {
    return badRecursion(n - 1);
}
```

永远记住：递归必须有**基准情况**（终止条件）。

### 错误 2：混淆调用次数和递归深度

斐波那契递归会产生 O(2^n) 次调用，但空间复杂度是 O(n)，不是 O(2^n)。

**空间复杂度取决于递归深度，不是调用次数**。

### 错误 3：忽略重复计算

```javascript
function fib(n) {
    if (n <= 1) return n;
    return fib(n-1) + fib(n-2);  // fib(n-2) 会被重复计算很多次
}
```

朴素斐波那契的时间复杂度是 O(2^n)。加上**记忆化**可以降到 O(n)：

```javascript
function fibMemo(n, memo = {}) {
    if (n <= 1) return n;
    if (memo[n]) return memo[n];
    memo[n] = fibMemo(n - 1, memo) + fibMemo(n - 2, memo);
    return memo[n];
}
```

## 本章小结

这一章我们学习了递归的复杂度分析：

1. **递推关系式**：写出 T(n) = ... 的形式
2. **展开求解**：手动展开，找规律
3. **主定理**：快速求解 T(n) = aT(n/b) + f(n) 形式
4. **空间复杂度**：取决于递归深度，不是调用次数
5. **递归转迭代**：尾递归优化、显式栈模拟

递归是很多高级算法的基础——分治、回溯、动态规划都离不开它。掌握递归的复杂度分析，是进阶算法学习的必备技能。

至此，第一部分「算法与复杂度基础」完结。你已经具备了分析算法效率的能力。

下一部分，我们进入具体的数据结构——从最基础的**数组**开始。
