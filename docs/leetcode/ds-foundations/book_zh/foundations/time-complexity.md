# 时间复杂度分析

上一章我们认识了算法的基本概念。现在问一个问题：两个算法都能解决同一个问题，哪个更好？

直觉上，我们会说「更快的那个」。但这里有个问题——怎么定义「更快」？

## 为什么需要时间复杂度

看下面两种求 1 到 n 之和的方法：

```javascript
// 方法 1：循环累加
function sum1(n) {
    let total = 0;
    for (let i = 1; i <= n; i++) {
        total += i;
    }
    return total;
}

// 方法 2：公式计算
function sum2(n) {
    return n * (n + 1) / 2;
}
```

哪个更快？

你可能会说：「跑一下不就知道了？」

确实可以，但问题来了：
- 在你的电脑上快，在别人的电脑上也快吗？
- n = 100 时快，n = 1000000 时还快吗？
- 用 JavaScript 快，用 Python 会不会不一样？

用「运行时间」来比较算法，受太多因素影响：硬件配置、编程语言、编译器优化、输入数据……这些都不是算法本身的特性。

我们需要一种**独立于具体环境**的方式来衡量算法效率。这就是**时间复杂度**。

## 时间复杂度的定义

时间复杂度描述的是：**随着输入规模 n 的增长，算法执行的操作次数增长的趋势**。

注意，我们不关心具体执行了多少次，而是关心**增长趋势**。

### 如何计算操作次数

我们来数一数这段代码执行了多少次基本操作：

```javascript
function example(n) {
    let count = 0;                   // 1 次赋值
    for (let i = 0; i < n; i++) {    // n+1 次比较，n 次自增
        count++;                      // n 次自增
    }
    return count;                    // 1 次返回
}
```

总操作次数：T(n) = 1 + (n+1) + n + n + 1 = 3n + 3

当 n 很大时，比如 n = 1000000，那 3n + 3 ≈ 3000003。这时候，那个常数 3 根本无足轻重。

所以我们只关注**最主要的部分**——这里就是 n。我们说这个算法的时间复杂度是 **O(n)**。

## 大 O 表示法

**大 O 表示法**（Big O Notation）是描述时间复杂度的标准方式。

O(f(n)) 表示算法的运行时间**不会超过** f(n) 的某个常数倍。换句话说，它给出了一个**上界**。

### 简化规则

使用大 O 表示法时，遵循以下简化规则：

**规则 1：忽略常数系数**

O(2n) = O(n)
O(100n) = O(n)

常数系数在 n 很大时影响不大。一个算法跑 2n 次和跑 n 次，数量级是一样的。

**规则 2：只保留最高阶**

O(n² + n) = O(n²)
O(n² + 1000n + 999) = O(n²)

当 n 很大时，低阶项可以忽略不计。n = 10000 时，n² = 100000000，而 n 只有 10000，差了一万倍。

**规则 3：不同复杂度相加取最大**

O(n²) + O(n) = O(n²)

### 直观理解

可以把大 O 理解为「增长速度的类别」：

```
操作次数
   ^
   |                         O(2^n) 指数爆炸
   |                       /
   |                 O(n²)
   |              /
   |         O(n log n)
   |       /
   |    O(n)
   |  /
   | O(log n)
   |___O(1)_______________→ n（输入规模）
```

O(1) 是一条水平线——不管 n 多大，操作次数都是常数。
O(n) 是一条直线——n 变大几倍，操作次数也变大几倍。
O(n²) 是抛物线——n 变大 10 倍，操作次数变大 100 倍。
O(2^n) 是指数曲线——增长极其恐怖。

## 常见时间复杂度详解

接下来我们逐一认识最常见的时间复杂度。

### O(1) —— 常数时间

```javascript
function getFirst(arr) {
    return arr[0];
}

function swap(arr, i, j) {
    [arr[i], arr[j]] = [arr[j], arr[i]];
}
```

不管数组有 10 个元素还是 1000000 个元素，这些操作都只需要固定的几步。

**常见场景**：
- 数组通过下标访问元素
- 哈希表的查找（平均情况）
- 栈的 push/pop 操作

### O(log n) —— 对数时间

```javascript
function binarySearch(arr, target) {
    let left = 0;
    let right = arr.length - 1;
    
    while (left <= right) {
        const mid = Math.floor((left + right) / 2);
        
        if (arr[mid] === target) {
            return mid;
        } else if (arr[mid] < target) {
            left = mid + 1;
        } else {
            right = mid - 1;
        }
    }
    
    return -1;
}
```

每次循环，搜索范围减半。n 个元素最多需要 log₂n 次就能找到。

n = 1000000 时，log₂n ≈ 20。只需要 20 次比较！

**常见场景**：
- 二分查找
- 平衡二叉树的操作
- 某些分治算法

### O(n) —— 线性时间

```javascript
function sum(arr) {
    let total = 0;
    for (const num of arr) {
        total += num;
    }
    return total;
}

function linearSearch(arr, target) {
    for (let i = 0; i < arr.length; i++) {
        if (arr[i] === target) {
            return i;
        }
    }
    return -1;
}
```

需要遍历每个元素一次（或常数次）。数组变大 10 倍，时间也变大 10 倍。

**常见场景**：
- 遍历数组/链表
- 线性查找
- 计数统计

### O(n log n) —— 线性对数时间

```javascript
function mergeSort(arr) {
    if (arr.length <= 1) return arr;
    
    const mid = Math.floor(arr.length / 2);
    const left = mergeSort(arr.slice(0, mid));
    const right = mergeSort(arr.slice(mid));
    
    return merge(left, right);
}

function merge(left, right) {
    const result = [];
    let i = 0, j = 0;
    
    while (i < left.length && j < right.length) {
        if (left[i] <= right[j]) {
            result.push(left[i++]);
        } else {
            result.push(right[j++]);
        }
    }
    
    return result.concat(left.slice(i)).concat(right.slice(j));
}
```

归并排序把数组不断二分（log n 层），每层需要处理 n 个元素，所以是 O(n log n)。

**常见场景**：
- 高效排序算法（归并排序、快速排序、堆排序）
- 某些分治算法

### O(n²) —— 平方时间

```javascript
function bubbleSort(arr) {
    const n = arr.length;
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n - 1 - i; j++) {
            if (arr[j] > arr[j + 1]) {
                [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
            }
        }
    }
    return arr;
}
```

两层嵌套循环，每层都是 n 次，所以是 n × n = n²。

n = 10000 时，操作次数约为 10⁸，已经开始变慢了。

**常见场景**：
- 简单排序算法（冒泡、选择、插入）
- 暴力枚举所有数对

### O(2^n) —— 指数时间

```javascript
function fibonacci(n) {
    if (n <= 1) return n;
    return fibonacci(n - 1) + fibonacci(n - 2);
}
```

这是最「暴力」的斐波那契实现。每次调用会产生两次新调用，形成一棵巨大的递归树。

n = 40 时，这段代码就会明显卡顿。n = 50 时，可能要等好几分钟。

**常见场景**：
- 暴力递归（未优化）
- 枚举所有子集

## 复杂度对比

直观感受一下不同复杂度的差距：

| 复杂度 | n=10 | n=100 | n=1000 | n=10⁶ |
|--------|------|-------|--------|-------|
| O(1) | 1 | 1 | 1 | 1 |
| O(log n) | 3 | 7 | 10 | 20 |
| O(n) | 10 | 100 | 1,000 | 10⁶ |
| O(n log n) | 33 | 664 | 9,966 | 2×10⁷ |
| O(n²) | 100 | 10,000 | 10⁶ | 10¹² |
| O(2^n) | 1,024 | 10³⁰ | 💥 | 💥 |

当 n = 10⁶ 时：
- O(n) 算法执行 10⁶ 次操作，现代计算机瞬间完成
- O(n²) 算法执行 10¹² 次操作，可能需要几分钟甚至更久
- O(2^n) 算法……别想了，宇宙毁灭都跑不完

## 如何分析时间复杂度

掌握几个基本规则，你就能分析大多数代码的时间复杂度。

### 规则 1：循环次数决定复杂度

```javascript
// O(n)
for (let i = 0; i < n; i++) {
    // O(1) 操作
}

// O(log n) —— 每次翻倍
for (let i = 1; i < n; i *= 2) {
    // O(1) 操作
}
```

### 规则 2：嵌套循环相乘

```javascript
// O(n × m) = O(n²)（当 m = n 时）
for (let i = 0; i < n; i++) {
    for (let j = 0; j < m; j++) {
        // O(1) 操作
    }
}
```

### 规则 3：顺序执行取最大

```javascript
// O(n) + O(n²) = O(n²)
for (let i = 0; i < n; i++) { /* ... */ }       // O(n)
for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) { /* ... */ }   // O(n²)
}
```

### 规则 4：取最坏情况

```javascript
function search(arr, target) {
    for (let i = 0; i < arr.length; i++) {
        if (arr[i] === target) return i;  // 可能第一个就找到
    }
    return -1;
}
```

最好情况 O(1)（第一个就是），最坏情况 O(n)（最后一个或不存在）。

我们通常分析**最坏情况**，因为它给出了性能的保证。

### 练习

试着分析以下代码的时间复杂度：

```javascript
// 练习 1
for (let i = 0; i < n; i++) {
    for (let j = i; j < n; j++) {
        // 操作
    }
}
```

答案：外层循环 n 次，内层循环 n-i 次。总次数 = n + (n-1) + (n-2) + ... + 1 = n(n+1)/2 = **O(n²)**

```javascript
// 练习 2
for (let i = 1; i < n; i *= 2) {
    for (let j = 0; j < n; j++) {
        // 操作
    }
}
```

答案：外层循环 log n 次，内层循环 n 次。总复杂度 = **O(n log n)**

## 常见陷阱

### 陷阱 1：隐藏的循环

```javascript
// 看起来是 O(n)，实际是 O(n²)
for (let i = 0; i < n; i++) {
    if (arr.includes(target)) {  // includes 内部是 O(n) 的循环！
        // ...
    }
}
```

`Array.prototype.includes` 是 O(n) 的，套在循环里就变成 O(n²) 了。

### 陷阱 2：不是所有循环都是 O(n)

```javascript
// 这是 O(log n)，不是 O(n)
for (let i = 1; i < n; i *= 2) {
    // 操作
}
```

关键看循环变量的变化方式：每次加 1 是 O(n)，每次乘 2 是 O(log n)。

## 本章小结

本章我们学习了时间复杂度分析：

1. **时间复杂度**描述算法效率随输入规模增长的趋势
2. **大 O 表示法**忽略常数和低阶项，只保留最高阶
3. **常见复杂度**从优到劣：O(1) < O(log n) < O(n) < O(n log n) < O(n²) < O(2^n)
4. **分析技巧**：数循环次数、嵌套相乘、取最大、考虑最坏情况

除了时间，算法还会消耗另一种资源——内存。下一章，我们来讨论**空间复杂度**。
