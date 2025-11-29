# 实战：快速排序

快速排序是实践中最常用的排序算法之一。

## 算法思想

1. **选择基准**（Pivot）：从数组中选一个元素作为基准
2. **分区**（Partition）：将数组分成两部分，小于基准的在左边，大于基准的在右边
3. **递归**：对左右两部分递归排序

## 代码实现

```javascript
function quickSort(arr, left = 0, right = arr.length - 1) {
    if (left >= right) return;
    
    const pivotIndex = partition(arr, left, right);
    
    quickSort(arr, left, pivotIndex - 1);
    quickSort(arr, pivotIndex + 1, right);
}

function partition(arr, left, right) {
    const pivot = arr[right];  // 选择最右边的元素作为基准
    let i = left;
    
    for (let j = left; j < right; j++) {
        if (arr[j] < pivot) {
            [arr[i], arr[j]] = [arr[j], arr[i]];
            i++;
        }
    }
    
    [arr[i], arr[right]] = [arr[right], arr[i]];
    return i;
}
```

## 图解

```
[3, 6, 8, 10, 1, 2, 1]

选择基准 pivot = 1 (最后一个)

分区过程:
i=0, j=0: arr[0]=3 >= 1, 不交换
i=0, j=1: arr[1]=6 >= 1, 不交换
...
分区结束: [1, 6, 8, 10, 1, 2, 3] (pivot=1在位置0)

递归左边: [] (空)
递归右边: [6, 8, 10, 1, 2, 3]
...
```

## 基准选择策略

### 1. 选择最右/最左

简单，但对已排序数组性能很差。

### 2. 随机选择

```javascript
function partition(arr, left, right) {
    const randomIndex = left + Math.floor(Math.random() * (right - left + 1));
    [arr[randomIndex], arr[right]] = [arr[right], arr[randomIndex]];
    // ... 后续逻辑相同
}
```

### 3. 三数取中

取首、中、尾三个元素的中位数作为基准。

```javascript
function medianOfThree(arr, left, right) {
    const mid = Math.floor((left + right) / 2);
    
    if (arr[left] > arr[mid]) [arr[left], arr[mid]] = [arr[mid], arr[left]];
    if (arr[left] > arr[right]) [arr[left], arr[right]] = [arr[right], arr[left]];
    if (arr[mid] > arr[right]) [arr[mid], arr[right]] = [arr[right], arr[mid]];
    
    return mid;
}
```

## 三向切分快排

处理大量重复元素的优化版本。

```javascript
function quickSort3Way(arr, left = 0, right = arr.length - 1) {
    if (left >= right) return;
    
    // 三向切分：< pivot, = pivot, > pivot
    let lt = left, gt = right;
    let i = left + 1;
    const pivot = arr[left];
    
    while (i <= gt) {
        if (arr[i] < pivot) {
            [arr[lt], arr[i]] = [arr[i], arr[lt]];
            lt++;
            i++;
        } else if (arr[i] > pivot) {
            [arr[i], arr[gt]] = [arr[gt], arr[i]];
            gt--;
        } else {
            i++;
        }
    }
    
    // arr[left..lt-1] < pivot = arr[lt..gt] < arr[gt+1..right]
    quickSort3Way(arr, left, lt - 1);
    quickSort3Way(arr, gt + 1, right);
}
```

## 快排 vs 归并

| 特性 | 快速排序 | 归并排序 |
|-----|---------|---------|
| 平均时间 | O(n log n) | O(n log n) |
| 最坏时间 | O(n²) | O(n log n) |
| 空间 | O(log n) | O(n) |
| 稳定性 | 不稳定 | 稳定 |
| 缓存友好 | 是 | 否 |

快排在实践中通常更快，因为：
- 原地排序，缓存友好
- 常数因子更小

## 尾递归优化

优先递归较小的分区，避免栈溢出：

```javascript
function quickSort(arr, left, right) {
    while (left < right) {
        const pivotIndex = partition(arr, left, right);
        
        if (pivotIndex - left < right - pivotIndex) {
            quickSort(arr, left, pivotIndex - 1);
            left = pivotIndex + 1;
        } else {
            quickSort(arr, pivotIndex + 1, right);
            right = pivotIndex - 1;
        }
    }
}
```

## 复杂度分析

**时间复杂度**：
- 平均：O(n log n)
- 最坏：O(n²)（已排序数组 + 选择首/尾作为基准）

**空间复杂度**：O(log n)，递归栈深度

## 小结

快速排序是分治的另一范例：
- 分区是核心操作
- 基准选择影响性能
- 三向切分处理重复元素
- 实践中最常用的排序算法
