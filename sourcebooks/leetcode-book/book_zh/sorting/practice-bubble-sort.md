# 实战：冒泡排序实现

冒泡排序是最简单的排序算法，也是理解排序的起点。

## 算法思想

反复遍历数组，比较相邻元素，如果顺序错误就交换。

每一轮遍历会把当前最大的元素"冒泡"到末尾。

## 代码实现

### 基础版本

```javascript
function bubbleSort(arr) {
    const n = arr.length;
    
    for (let i = 0; i < n - 1; i++) {
        for (let j = 0; j < n - 1 - i; j++) {
            if (arr[j] > arr[j + 1]) {
                [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
            }
        }
    }
    
    return arr;
}
```

### 优化版本：提前终止

```javascript
function bubbleSort(arr) {
    const n = arr.length;
    
    for (let i = 0; i < n - 1; i++) {
        let swapped = false;
        
        for (let j = 0; j < n - 1 - i; j++) {
            if (arr[j] > arr[j + 1]) {
                [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
                swapped = true;
            }
        }
        
        // 如果没有交换，说明已经有序
        if (!swapped) break;
    }
    
    return arr;
}
```

### 进一步优化：记录最后交换位置

```javascript
function bubbleSort(arr) {
    const n = arr.length;
    let lastSwapIndex = n - 1;
    
    while (lastSwapIndex > 0) {
        let newLastSwap = 0;
        
        for (let j = 0; j < lastSwapIndex; j++) {
            if (arr[j] > arr[j + 1]) {
                [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
                newLastSwap = j;
            }
        }
        
        lastSwapIndex = newLastSwap;
    }
    
    return arr;
}
```

## 图解

```
初始: [5, 3, 8, 4, 2]

第1轮:
[5, 3, 8, 4, 2] → [3, 5, 8, 4, 2] (交换5,3)
[3, 5, 8, 4, 2] → [3, 5, 8, 4, 2] (5<8,不动)
[3, 5, 8, 4, 2] → [3, 5, 4, 8, 2] (交换8,4)
[3, 5, 4, 8, 2] → [3, 5, 4, 2, 8] (交换8,2)
8已就位

第2轮:
[3, 5, 4, 2, 8] → [3, 5, 4, 2, 8]
[3, 5, 4, 2, 8] → [3, 4, 5, 2, 8]
[3, 4, 5, 2, 8] → [3, 4, 2, 5, 8]
5已就位

...继续直到完成
```

## 为什么叫"冒泡"？

想象气泡在水中上升——较大的元素像气泡一样，逐渐"浮"到数组的末尾。

## 复杂度分析

**时间复杂度**：
- 最好：O(n)，数组已排序时（优化版本）
- 平均：O(n²)
- 最坏：O(n²)，数组逆序时

**空间复杂度**：O(1)，原地排序

**稳定性**：稳定（相等元素不交换）

## 优缺点

### 优点

- **简单直观**：最容易理解和实现
- **稳定**：保持相等元素的相对顺序
- **原地**：不需要额外空间
- **自适应**：对部分有序数组效率较高

### 缺点

- **效率低**：O(n²)时间复杂度
- **交换次数多**：即使只移动一个元素也需要多次交换

## 适用场景

- **教学目的**：理解排序的基本概念
- **小规模数据**：n很小时可以接受
- **几乎有序的数据**：优化后的冒泡排序表现不错

## 小结

冒泡排序是最简单的排序算法：
- 反复比较相邻元素，错序就交换
- 每轮把最大元素"冒泡"到末尾
- 优化后可以提前终止

虽然效率不高，但它是理解排序的第一步。
