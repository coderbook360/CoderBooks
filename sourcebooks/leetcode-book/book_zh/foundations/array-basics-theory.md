# 数组基础理论

数组是最基本的数据结构，也是学习算法的起点。几乎所有编程语言都内置了数组，你可能每天都在用它。但你真的了解数组吗？

## 什么是数组

数组是一种**线性数据结构**，它用一组**连续的内存空间**，存储一组**相同类型**的数据。

```javascript
// 创建一个数组
const numbers = [1, 2, 3, 4, 5];
const names = ["Alice", "Bob", "Charlie"];
```

在 JavaScript 中，数组比较特殊——它可以存储不同类型的元素，长度也可以动态变化。但在大多数语言（如 C、Java）中，数组是固定类型、固定长度的。

## 数组的核心特性

### 1. 连续存储

数组的元素在内存中是**连续存放**的。假设数组的起始地址是 `base`，每个元素占用 `size` 字节，那么第 `i` 个元素的地址就是：

```
address(i) = base + i × size
```

### 2. 随机访问

正是因为连续存储，数组支持 **O(1) 时间**的随机访问。只要知道下标，就能立即计算出元素的内存地址。

```javascript
const arr = [10, 20, 30, 40, 50];

// O(1) 时间访问任意元素
console.log(arr[0]); // 10
console.log(arr[2]); // 30
console.log(arr[4]); // 50
```

这是数组最大的优势——**查询快**。

### 3. 下标从 0 开始

几乎所有编程语言的数组下标都从 0 开始。为什么？

因为下标其实是**偏移量**。第一个元素相对于起始位置的偏移是 0，所以下标是 0。

```
元素:  [a,  b,  c,  d,  e]
下标:   0   1   2   3   4
偏移:   0   1   2   3   4  (相对于起始位置)
```

## 数组的基本操作

### 访问元素：O(1)

```javascript
const arr = [1, 2, 3, 4, 5];
const value = arr[2]; // 直接访问，O(1)
```

### 修改元素：O(1)

```javascript
arr[2] = 100; // 直接修改，O(1)
```

### 查找元素：O(n)

如果不知道元素的位置，需要遍历数组查找：

```javascript
function indexOf(arr, target) {
    for (let i = 0; i < arr.length; i++) {
        if (arr[i] === target) {
            return i;
        }
    }
    return -1;
}
```

最坏情况需要检查所有元素，时间复杂度 O(n)。

### 插入元素：O(n)

在数组中间插入元素，需要移动后面的所有元素：

```javascript
function insertAt(arr, index, value) {
    // 从后往前移动元素
    for (let i = arr.length; i > index; i--) {
        arr[i] = arr[i - 1];
    }
    arr[index] = value;
}
```

最坏情况（在开头插入）需要移动 n 个元素，时间复杂度 O(n)。

### 删除元素：O(n)

同样，删除元素后需要移动后面的元素填补空缺：

```javascript
function removeAt(arr, index) {
    const value = arr[index];
    // 从前往后移动元素
    for (let i = index; i < arr.length - 1; i++) {
        arr[i] = arr[i + 1];
    }
    arr.length--;
    return value;
}
```

时间复杂度 O(n)。

## 数组操作复杂度总结

| 操作 | 时间复杂度 | 说明 |
|-----|-----------|------|
| 访问 | O(1) | 通过下标直接访问 |
| 修改 | O(1) | 通过下标直接修改 |
| 查找 | O(n) | 需要遍历（无序数组） |
| 插入 | O(n) | 需要移动元素 |
| 删除 | O(n) | 需要移动元素 |
| 末尾添加 | O(1) | 不需要移动元素 |
| 末尾删除 | O(1) | 不需要移动元素 |

## JavaScript 数组的特殊性

JavaScript 的数组比传统数组更灵活：

```javascript
// 1. 可以存储不同类型
const mixed = [1, "hello", true, { name: "Alice" }];

// 2. 长度可变
const arr = [1, 2, 3];
arr.push(4); // [1, 2, 3, 4]
arr.pop();   // [1, 2, 3]

// 3. 有很多内置方法
arr.map(x => x * 2);
arr.filter(x => x > 1);
arr.reduce((sum, x) => sum + x, 0);
```

但要注意，这些便利是有代价的：
- JavaScript 数组在底层可能是哈希表实现，而非真正的连续内存
- 稀疏数组（有大量空洞的数组）性能会很差
- 频繁使用 `push`/`pop` 可能触发内存重新分配

在算法题中，我们通常把 JavaScript 数组当作传统数组来分析复杂度。

## 数组 vs 链表

数组和链表是两种最基本的线性数据结构，它们各有优劣：

| 特性 | 数组 | 链表 |
|-----|------|-----|
| 内存布局 | 连续 | 分散 |
| 随机访问 | O(1) ✓ | O(n) ✗ |
| 插入/删除 | O(n) ✗ | O(1) ✓ |
| 空间利用 | 可能有浪费 | 更灵活 |
| 缓存友好 | 是 | 否 |

选择哪种数据结构，取决于具体场景：
- 频繁随机访问 → 数组
- 频繁插入删除 → 链表

## 常见的数组技巧

在后面的实战章节中，你会频繁用到这些技巧：

### 1. 双指针

用两个指针从不同方向或不同速度遍历数组：

```javascript
// 快慢指针
let slow = 0, fast = 0;

// 对撞指针
let left = 0, right = arr.length - 1;
```

### 2. 原地修改

在不使用额外空间的情况下修改数组：

```javascript
// 把数组中的 0 都移到末尾
function moveZeroes(nums) {
    let insertPos = 0;
    for (const num of nums) {
        if (num !== 0) {
            nums[insertPos++] = num;
        }
    }
    while (insertPos < nums.length) {
        nums[insertPos++] = 0;
    }
}
```

### 3. 预处理

提前计算一些信息，加速后续查询：

```javascript
// 前缀和
const prefix = [0];
for (const num of nums) {
    prefix.push(prefix[prefix.length - 1] + num);
}
```

## 小结

这一章我们学习了数组的核心概念：

1. **定义**：连续内存空间存储的相同类型元素
2. **优势**：O(1) 随机访问
3. **劣势**：插入/删除需要移动元素
4. **常用技巧**：双指针、原地修改、预处理

数组看似简单，但很多算法题的核心就是如何高效地操作数组。下一章，我们将学习数组的各种遍历和访问模式。
