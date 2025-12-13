# 数组遍历模式

上一章我们学习了数组的内存模型。这一章，我们来看数组最基本的操作——**遍历**。

遍历就是依次访问数组的每个元素。听起来简单，但 JavaScript 提供了多种遍历方式，各有各的适用场景。

掌握这些遍历模式，是写出简洁、高效代码的基础。

## 基础遍历方式

### for 循环

最经典的遍历方式，完全控制索引。

```javascript
const arr = [10, 20, 30, 40, 50];

// 正向遍历
for (let i = 0; i < arr.length; i++) {
    console.log(arr[i]);
}

// 反向遍历
for (let i = arr.length - 1; i >= 0; i--) {
    console.log(arr[i]);
}

// 步长遍历（每隔一个元素）
for (let i = 0; i < arr.length; i += 2) {
    console.log(arr[i]);  // 10, 30, 50
}
```

**优点**：
- 完全控制索引
- 可以随时 `break` 或 `continue`
- 可以修改循环变量

**适用场景**：
- 需要索引
- 需要提前退出
- 需要反向或跳跃遍历

### for...of 循环

ES6 引入的语法，更简洁。

```javascript
const arr = [10, 20, 30, 40, 50];

for (const value of arr) {
    console.log(value);
}
```

**优点**：
- 语法简洁
- 直接获取值，不用 `arr[i]`

**缺点**：
- 不能直接获取索引（需要用 `entries()` 配合）

```javascript
for (const [index, value] of arr.entries()) {
    console.log(`${index}: ${value}`);
}
```

**适用场景**：
- 只需要值，不需要索引
- 需要支持 `break` / `continue`

### forEach 方法

函数式风格的遍历。

```javascript
const arr = [10, 20, 30, 40, 50];

arr.forEach((value, index, array) => {
    console.log(`index: ${index}, value: ${value}`);
});
```

**优点**：
- 语法简洁
- 同时获取值、索引和原数组

**缺点**：
- **不能 `break`**：`forEach` 会遍历完整个数组
- **不能使用 `await`**：在 `forEach` 的回调中使用 `await` 不会按预期工作

**适用场景**：
- 简单遍历，无需提前退出
- 不涉及异步操作

## 函数式遍历方法

JavaScript 数组提供了一系列函数式方法，它们的共同特点是**不修改原数组**。

### map —— 映射

把每个元素转换成新的值，返回新数组。

```javascript
const arr = [1, 2, 3, 4, 5];

const doubled = arr.map(x => x * 2);
console.log(doubled);  // [2, 4, 6, 8, 10]
console.log(arr);      // [1, 2, 3, 4, 5]，原数组不变
```

**核心思想**：一一映射，输入 n 个元素，输出 n 个元素。

```javascript
// 常见用法：提取对象的某个属性
const users = [
    { name: 'Alice', age: 25 },
    { name: 'Bob', age: 30 }
];
const names = users.map(user => user.name);
// ['Alice', 'Bob']
```

### filter —— 过滤

筛选满足条件的元素，返回新数组。

```javascript
const arr = [1, 2, 3, 4, 5, 6];

const evens = arr.filter(x => x % 2 === 0);
console.log(evens);  // [2, 4, 6]
```

**核心思想**：只保留符合条件的元素。

```javascript
// 常见用法：过滤掉无效值
const data = [0, 1, null, 2, undefined, 3, false];
const valid = data.filter(Boolean);
// [1, 2, 3]
```

### reduce —— 归约

把数组"折叠"成一个值。这是最强大、也最难理解的数组方法。

```javascript
const arr = [1, 2, 3, 4, 5];

// 求和
const sum = arr.reduce((acc, curr) => acc + curr, 0);
console.log(sum);  // 15
```

`reduce` 接收两个参数：
- 回调函数 `(acc, curr) => newAcc`
- 初始值

`acc` 是累加器，保存中间结果；`curr` 是当前元素。

```javascript
// 求最大值
const max = arr.reduce((acc, curr) => Math.max(acc, curr), -Infinity);

// 统计元素出现次数
const nums = [1, 2, 3, 2, 1, 3, 3];
const count = nums.reduce((acc, curr) => {
    acc[curr] = (acc[curr] || 0) + 1;
    return acc;
}, {});
console.log(count);  // { '1': 2, '2': 2, '3': 3 }

// 数组扁平化
const nested = [[1, 2], [3, 4], [5]];
const flat = nested.reduce((acc, curr) => acc.concat(curr), []);
console.log(flat);  // [1, 2, 3, 4, 5]
```

**核心思想**：从多个值计算出一个值（或一个新的数据结构）。

### find / findIndex

查找第一个满足条件的元素。

```javascript
const arr = [1, 2, 3, 4, 5];

// 找到第一个大于 3 的元素
const found = arr.find(x => x > 3);
console.log(found);  // 4

// 找到第一个大于 3 的元素的索引
const index = arr.findIndex(x => x > 3);
console.log(index);  // 3

// 找不到时
const notFound = arr.find(x => x > 10);
console.log(notFound);  // undefined
```

**特点**：找到后立即返回，不会遍历完整数组。

### some / every

判断数组是否满足某个条件。

```javascript
const arr = [1, 2, 3, 4, 5];

// some：是否存在大于 3 的元素
const hasLarge = arr.some(x => x > 3);
console.log(hasLarge);  // true

// every：是否所有元素都大于 0
const allPositive = arr.every(x => x > 0);
console.log(allPositive);  // true
```

**特点**：
- `some`：遇到第一个满足条件的就返回 `true`
- `every`：遇到第一个不满足条件的就返回 `false`

这两个方法在**需要提前退出**时特别有用，可以替代 `forEach` 实现类似 `break` 的效果。

## 遍历方法对比

| 方法 | 返回值 | 能否 break | 能否获取索引 | 适用场景 |
|-----|--------|-----------|-------------|---------|
| `for` | - | ✅ | ✅ | 需要完全控制 |
| `for...of` | - | ✅ | ❌（需手动） | 简单遍历 |
| `forEach` | `undefined` | ❌ | ✅ | 简单遍历 |
| `map` | 新数组 | ❌ | ✅ | 元素转换 |
| `filter` | 新数组 | ❌ | ✅ | 元素筛选 |
| `reduce` | 单个值 | ❌ | ✅ | 归约计算 |
| `find` | 元素/`undefined` | 找到即停 | ✅ | 查找元素 |
| `some`/`every` | `boolean` | 条件满足即停 | ✅ | 条件判断 |

选择哪种方法，取决于你的具体需求：
- 需要 `break`？→ `for` 或 `for...of`
- 需要转换每个元素？→ `map`
- 需要筛选元素？→ `filter`
- 需要归约成单个值？→ `reduce`

## 常见遍历场景

### 统计元素出现次数

```javascript
function countOccurrences(arr) {
    const count = {};
    for (const item of arr) {
        count[item] = (count[item] || 0) + 1;
    }
    return count;
}

// 或者用 reduce
function countReduce(arr) {
    return arr.reduce((acc, item) => {
        acc[item] = (acc[item] || 0) + 1;
        return acc;
    }, {});
}
```

### 找最大/最小值

```javascript
// 方法 1：经典 for 循环
function findMax(arr) {
    let max = arr[0];
    for (let i = 1; i < arr.length; i++) {
        if (arr[i] > max) {
            max = arr[i];
        }
    }
    return max;
}

// 方法 2：Math.max + 展开运算符
const max = Math.max(...arr);

// 方法 3：reduce
const maxReduce = arr.reduce((a, b) => Math.max(a, b));
```

### 数组去重

```javascript
const arr = [1, 2, 2, 3, 3, 3, 4];

// 方法 1：Set（最简洁）
const unique = [...new Set(arr)];

// 方法 2：filter + indexOf
const uniqueFilter = arr.filter((item, index) => 
    arr.indexOf(item) === index
);
```

### 二维数组遍历

```javascript
const matrix = [
    [1, 2, 3],
    [4, 5, 6],
    [7, 8, 9]
];

// 按行遍历
for (let i = 0; i < matrix.length; i++) {
    for (let j = 0; j < matrix[i].length; j++) {
        console.log(`matrix[${i}][${j}] = ${matrix[i][j]}`);
    }
}

// 使用 flat 展平后遍历
for (const value of matrix.flat()) {
    console.log(value);
}
```

## 性能注意事项

### 避免多次遍历

链式调用很优雅，但每个方法都会遍历一次数组：

```javascript
// 三次遍历
const result = arr
    .filter(x => x > 0)     // 第一次遍历
    .map(x => x * 2)        // 第二次遍历
    .reduce((a, b) => a + b); // 第三次遍历
```

如果性能敏感，可以合并成一次遍历：

```javascript
// 一次遍历
const result = arr.reduce((acc, x) => {
    if (x > 0) {
        acc += x * 2;
    }
    return acc;
}, 0);
```

但不要过度优化。在大多数场景下，链式调用的可读性更重要。只有在处理大量数据、且性能确实是瓶颈时，才需要优化。

### 避免在循环中修改数组

```javascript
// 危险：在遍历中删除元素
const arr = [1, 2, 3, 4, 5];
for (let i = 0; i < arr.length; i++) {
    if (arr[i] % 2 === 0) {
        arr.splice(i, 1);  // 删除后，后面的元素前移，可能跳过元素
    }
}
```

更安全的做法是**反向遍历**或**使用 filter**：

```javascript
// 安全：反向遍历
for (let i = arr.length - 1; i >= 0; i--) {
    if (arr[i] % 2 === 0) {
        arr.splice(i, 1);
    }
}

// 更好：使用 filter
const odd = arr.filter(x => x % 2 !== 0);
```

## 本章小结

这一章我们学习了数组的各种遍历方式：

1. **基础遍历**：`for`、`for...of`、`forEach`
2. **函数式方法**：`map`、`filter`、`reduce`、`find`、`some`/`every`
3. **选择原则**：根据需求选择合适的方法

遍历是数组操作的基础。掌握这些模式，后面的算法学习会轻松很多。

从下一章开始，我们进入**实战环节**——用 LeetCode 真题来练习数组操作。第一道题是经典的「两数之和」。
