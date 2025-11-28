# 数组遍历与访问模式

遍历数组就像读一本书——你可以从头读到尾，也可以从尾翻到头，甚至可以跳着读。不同的阅读方式适合不同的目的，数组遍历也是如此。掌握各种遍历模式，你就拥有了处理数组问题的"瑞士军刀"。

## 基本遍历模式

### 正向遍历

最直观的遍历方式，从索引 0 开始，依次访问到最后一个元素：

```javascript
const arr = [1, 2, 3, 4, 5];

// 经典 for 循环
for (let i = 0; i < arr.length; i++) {
    console.log(arr[i]);
}

// for...of 循环（更简洁）
for (const item of arr) {
    console.log(item);
}

// forEach 方法
arr.forEach((item, index) => {
    console.log(index, item);
});
```

**适用场景**：
- 需要按顺序处理每个元素
- 需要比较当前元素与前一个元素
- 构建累加结果

**典型问题**：求数组元素之和、找最大值、检测递增序列。

### 反向遍历

从数组末尾开始，逐步向前访问：

```javascript
const arr = [1, 2, 3, 4, 5];

for (let i = arr.length - 1; i >= 0; i--) {
    console.log(arr[i]);
}
```

**为什么需要反向遍历**？

考虑这个问题：删除数组中所有等于某个值的元素。如果正向遍历并删除，索引会错乱：

```javascript
// 错误示范
const arr = [1, 2, 2, 3];
for (let i = 0; i < arr.length; i++) {
    if (arr[i] === 2) {
        arr.splice(i, 1);
        // 删除后，后面的元素前移
        // 原本索引 2 的元素变成了索引 1
        // 下一轮 i 变成 2，跳过了一个元素！
    }
}
console.log(arr); // [1, 2, 3]，漏删了一个 2
```

反向遍历可以解决这个问题：

```javascript
// 正确做法
const arr = [1, 2, 2, 3];
for (let i = arr.length - 1; i >= 0; i--) {
    if (arr[i] === 2) {
        arr.splice(i, 1);
        // 删除后，只有被删元素后面的索引变化
        // 但我们是往前遍历，不受影响
    }
}
console.log(arr); // [1, 3]
```

**适用场景**：
- 删除元素时避免索引错乱
- 需要从后往前处理（如字符串反转）
- 栈相关操作

### 双向遍历

使用两个指针，一个从头开始，一个从尾开始，向中间靠拢：

```javascript
const arr = [1, 2, 3, 4, 5];
let left = 0;
let right = arr.length - 1;

while (left < right) {
    console.log(`左: ${arr[left]}, 右: ${arr[right]}`);
    left++;
    right--;
}
```

这是著名的**双指针技巧**，在数组问题中极为常用。

**经典应用**：判断回文

```javascript
function isPalindrome(s) {
    let left = 0;
    let right = s.length - 1;
    
    while (left < right) {
        if (s[left] !== s[right]) {
            return false;
        }
        left++;
        right--;
    }
    return true;
}

console.log(isPalindrome('abcba')); // true
console.log(isPalindrome('abcd'));  // false
```

**适用场景**：
- 回文检测
- 有序数组的两数之和
- 反转数组/字符串
- 容器盛水问题

## 高级遍历模式

### 间隔遍历

以固定步长跳跃访问：

```javascript
const arr = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

// 访问偶数索引
for (let i = 0; i < arr.length; i += 2) {
    console.log(arr[i]); // 0, 2, 4, 6, 8
}

// 访问奇数索引
for (let i = 1; i < arr.length; i += 2) {
    console.log(arr[i]); // 1, 3, 5, 7, 9
}
```

**适用场景**：
- 奇偶位置分别处理
- 采样数据
- 棋盘类问题（黑白格交替）

### 滑动窗口遍历

维护一个固定大小的"窗口"，在数组上滑动：

```javascript
function maxSumSubarray(arr, k) {
    if (arr.length < k) return null;
    
    // 计算第一个窗口的和
    let windowSum = 0;
    for (let i = 0; i < k; i++) {
        windowSum += arr[i];
    }
    
    let maxSum = windowSum;
    
    // 滑动窗口
    for (let i = k; i < arr.length; i++) {
        // 加入新元素，移出旧元素
        windowSum = windowSum + arr[i] - arr[i - k];
        maxSum = Math.max(maxSum, windowSum);
    }
    
    return maxSum;
}

console.log(maxSumSubarray([1, 4, 2, 10, 2, 3, 1, 0, 20], 4)); // 24
```

滑动窗口的精髓在于**增量更新**：不是每次都重新计算窗口内的值，而是加入新元素、移出旧元素，保持 O(1) 的更新复杂度。

**适用场景**：
- 固定长度子数组的最大/最小/平均值
- 连续子数组问题
- 字符串子串匹配

### 分组遍历

将数组按固定大小分组处理：

```javascript
function chunkArray(arr, size) {
    const result = [];
    
    for (let i = 0; i < arr.length; i += size) {
        // slice 自动处理末尾不足一组的情况
        result.push(arr.slice(i, i + size));
    }
    
    return result;
}

console.log(chunkArray([1, 2, 3, 4, 5, 6, 7], 3));
// [[1, 2, 3], [4, 5, 6], [7]]
```

**适用场景**：
- 分页显示
- 批量处理数据
- 将一维数据转换为多维

## 二维数组遍历

二维数组就像一个表格，有行和列。遍历方式的选择会影响代码的简洁性，有时甚至影响性能。

### 行优先与列优先

**行优先遍历**：先遍历完一行，再进入下一行

```javascript
const matrix = [
    [1, 2, 3],
    [4, 5, 6],
    [7, 8, 9]
];

// 行优先：1, 2, 3, 4, 5, 6, 7, 8, 9
for (let i = 0; i < matrix.length; i++) {
    for (let j = 0; j < matrix[i].length; j++) {
        console.log(matrix[i][j]);
    }
}
```

**列优先遍历**：先遍历完一列，再进入下一列

```javascript
// 列优先：1, 4, 7, 2, 5, 8, 3, 6, 9
const rows = matrix.length;
const cols = matrix[0].length;

for (let j = 0; j < cols; j++) {
    for (let i = 0; i < rows; i++) {
        console.log(matrix[i][j]);
    }
}
```

在大多数编程语言中，**行优先遍历性能更好**。这涉及到内存布局和 CPU 缓存的工作原理，我们稍后会详细讨论。

### 对角线遍历

**主对角线**：从左上到右下

```javascript
const matrix = [
    [1, 2, 3],
    [4, 5, 6],
    [7, 8, 9]
];

// 主对角线：1, 5, 9
const n = Math.min(matrix.length, matrix[0].length);
for (let i = 0; i < n; i++) {
    console.log(matrix[i][i]);
}
```

**反对角线**：从右上到左下

```javascript
// 反对角线：3, 5, 7
const rows = matrix.length;
const cols = matrix[0].length;
const n = Math.min(rows, cols);

for (let i = 0; i < n; i++) {
    console.log(matrix[i][cols - 1 - i]);
}
```

**所有对角线**：这是一个常见的面试题

```javascript
// 遍历所有从左上到右下的对角线
function allDiagonals(matrix) {
    const rows = matrix.length;
    const cols = matrix[0].length;
    const result = [];
    
    // 从第一行的每个元素开始
    for (let j = 0; j < cols; j++) {
        const diagonal = [];
        let r = 0, c = j;
        while (r < rows && c < cols) {
            diagonal.push(matrix[r][c]);
            r++;
            c++;
        }
        result.push(diagonal);
    }
    
    // 从第一列的每个元素开始（跳过左上角）
    for (let i = 1; i < rows; i++) {
        const diagonal = [];
        let r = i, c = 0;
        while (r < rows && c < cols) {
            diagonal.push(matrix[r][c]);
            r++;
            c++;
        }
        result.push(diagonal);
    }
    
    return result;
}
```

### 螺旋遍历

像蜗牛壳的螺旋一样遍历矩阵，这是面试中的高频考题：

```javascript
function spiralOrder(matrix) {
    if (!matrix.length || !matrix[0].length) return [];
    
    const result = [];
    let top = 0;
    let bottom = matrix.length - 1;
    let left = 0;
    let right = matrix[0].length - 1;
    
    while (top <= bottom && left <= right) {
        // 向右：遍历上边界
        for (let i = left; i <= right; i++) {
            result.push(matrix[top][i]);
        }
        top++;
        
        // 向下：遍历右边界
        for (let i = top; i <= bottom; i++) {
            result.push(matrix[i][right]);
        }
        right--;
        
        // 向左：遍历下边界（注意检查是否还有下边界）
        if (top <= bottom) {
            for (let i = right; i >= left; i--) {
                result.push(matrix[bottom][i]);
            }
            bottom--;
        }
        
        // 向上：遍历左边界（注意检查是否还有左边界）
        if (left <= right) {
            for (let i = bottom; i >= top; i--) {
                result.push(matrix[i][left]);
            }
            left++;
        }
    }
    
    return result;
}

const matrix = [
    [1, 2, 3],
    [4, 5, 6],
    [7, 8, 9]
];
console.log(spiralOrder(matrix)); // [1,2,3,6,9,8,7,4,5]
```

**关键点**：
- 用四个边界变量控制螺旋范围
- 每走完一条边，收缩对应的边界
- 注意处理单行或单列的边界情况

## 遍历模式选择指南

面对一个数组问题，如何选择合适的遍历模式？这里有一份实用指南：

**按问题特征选择**：

- **需要比较相邻元素** → 正向遍历
- **需要从后往前处理** → 反向遍历
- **首尾需要同时处理** → 双向遍历
- **固定大小子数组** → 滑动窗口
- **需要分组处理** → 分组遍历
- **矩阵边界问题** → 螺旋遍历

**按数据结构选择**：

- **一维数组** → 基本遍历或滑动窗口
- **有序数组** → 双向遍历（双指针）
- **二维矩阵** → 根据问题选择行/列/对角线/螺旋

## 缓存友好的访问模式

这是一个进阶话题，但理解它能帮你写出更高效的代码。

**为什么行优先遍历更快**？

计算机内存是线性的。二维数组 `matrix[i][j]` 在内存中是按行连续存储的：

```
内存布局：[1][2][3][4][5][6][7][8][9]
          ↑第0行↑  ↑第1行↑  ↑第2行↑
```

CPU 读取内存时，不是一个一个字节读，而是按**缓存行**（通常 64 字节）批量读取。

当你按行遍历时：
1. 访问 `matrix[0][0]`，CPU 把 `[0][0]` 到 `[0][7]`（假设）都加载到缓存
2. 访问 `matrix[0][1]`，直接从缓存读取，极快
3. 连续访问都命中缓存

当你按列遍历时：
1. 访问 `matrix[0][0]`，CPU 加载一批数据
2. 访问 `matrix[1][0]`，这个数据不在刚才的缓存行里，需要重新加载
3. 每次访问都可能缓存未命中

**性能差距有多大**？

对于大矩阵，行优先遍历可以比列优先快 **数倍甚至数十倍**。

**实践建议**：

- 二维数组尽量按行遍历
- 避免大步长的跳跃访问
- 如果必须按列处理，考虑先转置矩阵
- 频繁访问的数据尽量放在一起

## 小结

数组遍历看似简单，实则蕴含着丰富的技巧：

**基本功**：
- 正向遍历：顺序处理的基础
- 反向遍历：删除元素的利器
- 双向遍历：双指针的起点

**进阶技巧**：
- 滑动窗口：子数组问题的高效解法
- 螺旋遍历：矩阵问题的必备技能
- 缓存友好：性能优化的底层认知

掌握这些遍历模式，你就有了解决大部分数组问题的工具箱。在后续的实战练习中，你会不断运用这些模式，直到它们成为你的本能反应。
