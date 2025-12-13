# 空间复杂度分析

上一章我们学习了时间复杂度，知道了如何衡量算法的「快慢」。但算法消耗的资源不只是时间，还有**内存**。

内存是有限的。尤其在嵌入式设备、移动端应用、或者处理海量数据时，内存往往比时间更珍贵。

这就是为什么我们需要**空间复杂度**。

## 空间复杂度的概念

空间复杂度描述的是：**随着输入规模 n 的增长，算法所需的额外内存空间增长的趋势**。

和时间复杂度一样，我们也用大 O 表示法。

### 辅助空间 vs 总空间

有一个细节需要注意：输入本身也占用空间。

- **总空间**：输入占用的空间 + 算法额外使用的空间
- **辅助空间**：算法额外使用的空间（不包括输入）

通常我们更关注**辅助空间**，因为输入是问题给定的，我们无法控制。

```javascript
function sumArray(arr) {     // arr 占用 O(n) 空间（输入）
    let sum = 0;              // sum 占用 O(1) 空间（辅助）
    for (const num of arr) {
        sum += num;
    }
    return sum;
}
// 辅助空间复杂度：O(1)
// 总空间复杂度：O(n)
```

我们说这个算法的空间复杂度是 O(1)——指的是辅助空间。

## 常见空间复杂度

### O(1) —— 常数空间

```javascript
function swap(arr, i, j) {
    const temp = arr[i];
    arr[i] = arr[j];
    arr[j] = temp;
}

function findMax(arr) {
    let max = arr[0];
    for (let i = 1; i < arr.length; i++) {
        if (arr[i] > max) {
            max = arr[i];
        }
    }
    return max;
}
```

不管输入多大，只使用固定数量的变量。这是最理想的空间复杂度。

**常见场景**：
- 原地修改数组
- 双指针算法
- 只使用几个变量的循环

### O(n) —— 线性空间

```javascript
function copyArray(arr) {
    const result = [];
    for (const num of arr) {
        result.push(num);
    }
    return result;
}

function twoSum(nums, target) {
    const map = new Map();  // 最多存 n 个元素
    for (let i = 0; i < nums.length; i++) {
        const complement = target - nums[i];
        if (map.has(complement)) {
            return [map.get(complement), i];
        }
        map.set(nums[i], i);
    }
    return [];
}
```

额外空间随输入规模线性增长。

**常见场景**：
- 创建新数组/字符串
- 使用哈希表存储数据
- 需要保存中间结果

### O(n²) —— 平方空间

```javascript
function createMatrix(n) {
    const matrix = [];
    for (let i = 0; i < n; i++) {
        matrix[i] = new Array(n).fill(0);
    }
    return matrix;
}

// 二维 DP 数组
function longestCommonSubsequence(text1, text2) {
    const m = text1.length;
    const n = text2.length;
    const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
    // dp 是 (m+1) × (n+1) 的矩阵
    // ...
}
```

**常见场景**：
- n × n 矩阵
- 某些二维动态规划
- 图的邻接矩阵表示

### O(log n) —— 对数空间

这个比较特殊，通常出现在递归中。

```javascript
function binarySearch(arr, target, left = 0, right = arr.length - 1) {
    if (left > right) return -1;
    
    const mid = Math.floor((left + right) / 2);
    
    if (arr[mid] === target) return mid;
    if (arr[mid] < target) {
        return binarySearch(arr, target, mid + 1, right);
    }
    return binarySearch(arr, target, left, mid - 1);
}
```

每次递归，问题规模减半。递归深度是 O(log n)，每层只用常数空间，所以总空间是 O(log n)。

## 递归的空间复杂度

递归是空间复杂度分析中的「重灾区」。

每次函数调用，都会在**调用栈**上分配一块空间来保存：
- 函数的参数
- 局部变量
- 返回地址

这些空间会一直占用，直到函数返回。

### 例子：阶乘

```javascript
function factorial(n) {
    if (n <= 1) return 1;
    return n * factorial(n - 1);
}
```

调用 `factorial(5)` 时，调用栈是这样的：

```
| factorial(1) | ← 栈顶，最后调用
| factorial(2) |
| factorial(3) |
| factorial(4) |
| factorial(5) | ← 栈底，最先调用
```

递归深度是 n，每层用常数空间，所以空间复杂度是 **O(n)**。

### 例子：斐波那契（暴力递归）

```javascript
function fibonacci(n) {
    if (n <= 1) return n;
    return fibonacci(n - 1) + fibonacci(n - 2);
}
```

虽然这个递归会产生指数级的函数调用，但在任意时刻，调用栈的深度最多是 n。

为什么？因为我们是**深度优先**的——先算完 `fibonacci(n-1)` 的整个子树，再算 `fibonacci(n-2)`。

所以空间复杂度是 **O(n)**，不是 O(2^n)。

（但时间复杂度是 O(2^n)，非常慢。）

### 递归 vs 迭代

很多递归算法可以改写成迭代，从而节省栈空间。

```javascript
// 递归版本：O(n) 空间
function factorialRecursive(n) {
    if (n <= 1) return 1;
    return n * factorialRecursive(n - 1);
}

// 迭代版本：O(1) 空间
function factorialIterative(n) {
    let result = 1;
    for (let i = 2; i <= n; i++) {
        result *= i;
    }
    return result;
}
```

两者的时间复杂度都是 O(n)，但空间复杂度差了一个数量级。

## 时间与空间的权衡

在算法设计中，时间和空间往往不可兼得。这就是著名的 **Time-Space Trade-off**（时空权衡）。

### 空间换时间

用更多的内存来减少计算时间。这是更常见的选择，因为现代计算机的内存通常比较充裕。

**经典例子：两数之和**

```javascript
// 方法 A：暴力枚举
// 时间 O(n²)，空间 O(1)
function twoSumBrute(nums, target) {
    for (let i = 0; i < nums.length; i++) {
        for (let j = i + 1; j < nums.length; j++) {
            if (nums[i] + nums[j] === target) {
                return [i, j];
            }
        }
    }
    return [];
}

// 方法 B：哈希表
// 时间 O(n)，空间 O(n)
function twoSumHash(nums, target) {
    const map = new Map();
    for (let i = 0; i < nums.length; i++) {
        const complement = target - nums[i];
        if (map.has(complement)) {
            return [map.get(complement), i];
        }
        map.set(nums[i], i);
    }
    return [];
}
```

| 方法 | 时间复杂度 | 空间复杂度 | 特点 |
|-----|-----------|-----------|------|
| 暴力枚举 | O(n²) | O(1) | 慢但省内存 |
| 哈希表 | O(n) | O(n) | 快但费内存 |

绝大多数情况下，我们会选择方法 B——用 O(n) 的空间换取 O(n) 的时间。

### 时间换空间

用更多的计算来减少内存使用。在内存极其受限的场景下才会考虑。

比如，在嵌入式设备上处理数据，可能宁可多算几遍，也不愿意开辟大数组。

### 如何选择？

一般原则：
1. **优先考虑时间**——用户对「慢」比对「占内存」更敏感
2. **考虑实际约束**——内存确实不够时，必须优化空间
3. **LeetCode 刷题**——除非题目要求 O(1) 空间，否则优先优化时间

## 原地算法

**原地算法**（In-place Algorithm）是指只使用 O(1) 辅助空间的算法。

它直接在输入数据上进行修改，不创建额外的数据结构。

### 例子：原地反转数组

```javascript
function reverseInPlace(arr) {
    let left = 0;
    let right = arr.length - 1;
    
    while (left < right) {
        // 交换两个元素
        [arr[left], arr[right]] = [arr[right], arr[left]];
        left++;
        right--;
    }
    
    return arr;
}
```

双指针从两头向中间走，边走边交换。只用了两个指针变量，空间复杂度 O(1)。

### 原地算法的注意事项

原地操作会**修改原数据**。如果调用者还需要原数据，就会出问题。

```javascript
const arr = [1, 2, 3, 4, 5];
reverseInPlace(arr);
console.log(arr);  // [5, 4, 3, 2, 1] —— 原数组被改了！
```

如果需要保留原数组，要么先复制一份，要么使用非原地算法。这就是取舍。

## 常见陷阱

### 陷阱 1：忽略递归栈空间

```javascript
function sum(arr, i = 0) {
    if (i === arr.length) return 0;
    return arr[i] + sum(arr, i + 1);
}
```

看起来没有创建新数组，但递归深度是 n，空间复杂度是 O(n)。

### 陷阱 2：忽略内置方法的空间消耗

```javascript
function process(arr) {
    const copy = arr.slice();  // slice 创建了一个新数组，O(n) 空间
    // ...
}
```

JavaScript 的很多数组方法（`slice`、`concat`、`map`、`filter`）都会返回新数组。

### 陷阱 3：字符串拼接

```javascript
// 每次拼接都创建新字符串，总空间可能是 O(n²)
let result = '';
for (let i = 0; i < n; i++) {
    result += 'a';  // 字符串是不可变的
}
```

在 JavaScript 中，现代引擎对字符串拼接有优化，但在其他语言中这是经典的性能陷阱。

## 本章小结

本章我们学习了空间复杂度分析：

1. **空间复杂度**描述算法的内存消耗随输入规模增长的趋势
2. 通常关注**辅助空间**（不含输入）
3. **常见复杂度**：O(1) < O(log n) < O(n) < O(n²)
4. **递归**要考虑调用栈深度
5. **时空权衡**：通常空间换时间，特殊场景时间换空间
6. **原地算法**只用 O(1) 辅助空间，但会修改原数据

现在我们已经掌握了时间复杂度和空间复杂度这两个核心概念。下一章，我们来系统对比各种复杂度，帮助你在实际问题中做出正确的选择。
