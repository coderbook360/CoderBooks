# 时间复杂度与空间复杂度分析

上一章我们说过，评价算法好坏的一个重要维度是"效率"。但什么是"效率"？如何量化地衡量它？

如果我说"算法 A 在我的电脑上跑了 0.5 秒，算法 B 跑了 1 秒，所以 A 更快"——这个说法可靠吗？

不一定。换一台更快的电脑，可能两个算法都只需要 0.1 秒。换一种编程语言实现，结果可能完全不同。

我们需要一种**独立于硬件和编程语言的方法**来评价算法效率。这就是**复杂度分析**。

## 为什么需要复杂度分析

假设你写了一个在数组中查找元素的函数：

```javascript
function linearSearch(arr, target) {
    for (let i = 0; i < arr.length; i++) {
        if (arr[i] === target) {
            return i;
        }
    }
    return -1;
}
```

在不同规模的数组上运行，结果大概是这样的：

- 数组长度 100：约 0.01 毫秒
- 数组长度 10000：约 0.1 毫秒
- 数组长度 1000000：约 10 毫秒

观察这个规律：**当数组长度扩大 100 倍，运行时间也扩大约 100 倍**。

这说明运行时间和数组长度成**正比**。我们把这种关系记为 **O(n)**，读作"大 O n"。

这就是复杂度分析的核心：**不关心具体的时间数值，只关心时间随输入规模增长的趋势**。

## 大 O 表示法

### 基本概念

大 O 表示法（Big O Notation）是描述算法复杂度的标准方式。

当我们说一个算法的时间复杂度是 O(n) 时，意思是：**当输入规模 n 足够大时，算法的运行时间与 n 成正比**。

### 简化规则

大 O 表示法有三个重要的简化规则：

**规则 1：忽略常数系数**

```javascript
function example1(arr) {
    // 每次循环做 3 件事
    for (let i = 0; i < arr.length; i++) {
        console.log(arr[i]);     // 操作 1
        console.log(arr[i] * 2); // 操作 2
        console.log(arr[i] + 1); // 操作 3
    }
}
```

严格来说，这里执行了 3n 次操作。但我们记为 O(n)，因为当 n 很大时，系数 3 不影响增长趋势。

O(n) 和 O(3n) 是一样的，O(100n) 也是 O(n)。

**规则 2：保留最高阶项**

```javascript
function example2(arr) {
    // 第一部分：n 次操作
    for (let i = 0; i < arr.length; i++) {
        console.log(arr[i]);
    }
    
    // 第二部分：n² 次操作
    for (let i = 0; i < arr.length; i++) {
        for (let j = 0; j < arr.length; j++) {
            console.log(arr[i], arr[j]);
        }
    }
}
```

总操作次数是 n + n² = n² + n。但当 n = 1000 时，n² = 1000000，而 n 只是 1000，可以忽略不计。

所以这个算法的复杂度是 O(n²)，不是 O(n² + n)。

**规则 3：常数时间记为 O(1)**

```javascript
function getFirst(arr) {
    return arr[0];
}

function sumThree(a, b, c) {
    return a + b + c;
}
```

无论输入多大，这些操作都只需要固定的时间，我们记为 O(1)，表示"常数时间"。

### 常见复杂度等级

从快到慢排列：

```
O(1) < O(log n) < O(n) < O(n log n) < O(n²) < O(n³) < O(2ⁿ) < O(n!)
```

直观感受一下，当 n = 1000 时：

| 复杂度 | 大约操作次数 |
|--------|-------------|
| O(1) | 1 |
| O(log n) | 10 |
| O(n) | 1,000 |
| O(n log n) | 10,000 |
| O(n²) | 1,000,000 |
| O(n³) | 1,000,000,000 |
| O(2ⁿ) | 天文数字 |

一般来说，如果输入规模可能达到 10^5 或更大，O(n²) 的算法就会超时，需要优化到 O(n log n) 或 O(n)。

## 时间复杂度分析

### 顺序执行：复杂度相加

```javascript
function sequential(arr) {
    // 部分 1：O(n)
    for (let i = 0; i < arr.length; i++) {
        console.log(arr[i]);
    }
    
    // 部分 2：O(n)
    for (let j = 0; j < arr.length; j++) {
        console.log(arr[j] * 2);
    }
}
// 总复杂度：O(n) + O(n) = O(2n) = O(n)
```

### 嵌套执行：复杂度相乘

```javascript
function nested(arr) {
    // 外层循环：n 次
    for (let i = 0; i < arr.length; i++) {
        // 内层循环：n 次
        for (let j = 0; j < arr.length; j++) {
            console.log(arr[i], arr[j]);
        }
    }
}
// 总复杂度：O(n) × O(n) = O(n²)
```

### 对数复杂度 O(log n)

当每次操作都能**把问题规模减半**时，就会出现对数复杂度。

**经典例子：二分查找**

```javascript
function binarySearch(arr, target) {
    let left = 0;
    let right = arr.length - 1;
    
    while (left <= right) {
        const mid = Math.floor((left + right) / 2);
        
        if (arr[mid] === target) {
            return mid;
        } else if (arr[mid] < target) {
            left = mid + 1;  // 排除左半部分
        } else {
            right = mid - 1; // 排除右半部分
        }
    }
    
    return -1;
}
```

假设数组长度是 n = 16：
- 第 1 次比较后，剩余 8 个元素
- 第 2 次比较后，剩余 4 个元素
- 第 3 次比较后，剩余 2 个元素
- 第 4 次比较后，剩余 1 个元素

最多需要 4 次比较，而 log₂(16) = 4。

一般地，长度为 n 的数组最多需要 log₂(n) 次比较，所以时间复杂度是 O(log n)。

### 递归算法分析

递归算法的复杂度分析稍微复杂一些。

**例子 1：简单递归**

```javascript
function factorial(n) {
    if (n <= 1) return 1;
    return n * factorial(n - 1);
}
```

调用过程：factorial(5) → factorial(4) → factorial(3) → factorial(2) → factorial(1)

一共调用 n 次，每次做 O(1) 的操作，所以时间复杂度是 O(n)。

**例子 2：指数级递归（低效）**

```javascript
function fibonacci(n) {
    if (n <= 1) return n;
    return fibonacci(n - 1) + fibonacci(n - 2);
}
```

这个看似简单的递归，复杂度是 O(2ⁿ)！

原因是每次调用会产生两个子调用，形成一棵庞大的递归树：

```
                    fib(5)
                  /        \
              fib(4)      fib(3)
             /    \       /    \
         fib(3) fib(2) fib(2) fib(1)
         ...
```

递归树的节点数是指数级的，所以复杂度是 O(2ⁿ)。

**优化：记忆化**

```javascript
function fibonacciMemo(n, memo = new Map()) {
    if (n <= 1) return n;
    
    if (memo.has(n)) {
        return memo.get(n);
    }
    
    const result = fibonacciMemo(n - 1, memo) + fibonacciMemo(n - 2, memo);
    memo.set(n, result);
    return result;
}
```

通过缓存已计算的结果，每个 fib(k) 只计算一次，复杂度降为 O(n)。

## 空间复杂度分析

空间复杂度衡量算法运行过程中需要的**额外存储空间**（不包括输入数据本身）。

### O(1) 空间

只使用固定数量的变量：

```javascript
function swap(arr, i, j) {
    const temp = arr[i];
    arr[i] = arr[j];
    arr[j] = temp;
}
// 只用了一个临时变量，空间复杂度 O(1)
```

### O(n) 空间

创建了与输入规模成比例的数据结构：

```javascript
function double(arr) {
    const result = [];
    for (const num of arr) {
        result.push(num * 2);
    }
    return result;
}
// 创建了长度为 n 的新数组，空间复杂度 O(n)
```

### 递归栈空间

递归调用会占用调用栈空间：

```javascript
function factorial(n) {
    if (n <= 1) return 1;
    return n * factorial(n - 1);
}
```

调用栈最深时会有 n 层，所以空间复杂度是 O(n)。

## 时间与空间的权衡

很多时候，我们可以用空间换时间，或者用时间换空间。

**经典案例：两数之和**

**方法 1：暴力搜索**

```javascript
function twoSum(nums, target) {
    for (let i = 0; i < nums.length; i++) {
        for (let j = i + 1; j < nums.length; j++) {
            if (nums[i] + nums[j] === target) {
                return [i, j];
            }
        }
    }
    return null;
}
// 时间 O(n²)，空间 O(1)
```

**方法 2：哈希表**

```javascript
function twoSum(nums, target) {
    const seen = new Map();
    
    for (let i = 0; i < nums.length; i++) {
        const complement = target - nums[i];
        if (seen.has(complement)) {
            return [seen.get(complement), i];
        }
        seen.set(nums[i], i);
    }
    
    return null;
}
// 时间 O(n)，空间 O(n)
```

方法 2 牺牲了 O(n) 的空间，但把时间从 O(n²) 降到了 O(n)。这种权衡在实际开发中非常常见，通常**时间比空间更宝贵**。

## 常见复杂度示例总结

| 复杂度 | 典型算法 | 特征 |
|--------|---------|------|
| O(1) | 数组随机访问、哈希表查找 | 固定操作次数 |
| O(log n) | 二分查找 | 每次减半问题规模 |
| O(n) | 线性遍历 | 遍历一次 |
| O(n log n) | 归并排序、快速排序 | 分治策略 |
| O(n²) | 冒泡排序、选择排序 | 双重循环 |
| O(2ⁿ) | 不剪枝的递归 | 递归树指数增长 |

## 小结

这一章我们学习了复杂度分析的核心内容：

1. **为什么需要复杂度分析**：提供独立于硬件和语言的效率评价标准
2. **大 O 表示法**：忽略常数、保留最高阶项
3. **常见复杂度等级**：O(1) < O(log n) < O(n) < O(n log n) < O(n²) < O(2ⁿ)
4. **时间复杂度分析**：顺序相加、嵌套相乘、递归看树
5. **空间复杂度分析**：额外变量、新建数据结构、递归栈
6. **时空权衡**：通常用空间换时间

掌握复杂度分析，是算法学习的基础。在后面的章节中，我们会不断练习分析各种算法的复杂度。

下一章，我们将通过第一道实战题——"有效的括号"——开始真正的算法训练。
