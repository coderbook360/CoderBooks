# 实战：堆排序实现

堆排序利用堆数据结构实现排序，是唯一时间O(n log n)且空间O(1)的比较排序。

## 堆的基本概念

**堆**是一种完全二叉树，满足堆性质：
- **最大堆**：每个节点 >= 它的子节点
- **最小堆**：每个节点 <= 它的子节点

用数组表示堆：
- 父节点：`(i - 1) / 2`
- 左子节点：`2 * i + 1`
- 右子节点：`2 * i + 2`

## 算法思想

1. **建堆**：将数组转换为最大堆
2. **排序**：反复取出堆顶（最大值）放到末尾，然后调整堆

## 代码实现

```javascript
function heapSort(arr) {
    const n = arr.length;
    
    // 建堆：从最后一个非叶子节点开始下沉
    for (let i = Math.floor(n / 2) - 1; i >= 0; i--) {
        heapify(arr, n, i);
    }
    
    // 排序：逐个取出堆顶
    for (let i = n - 1; i > 0; i--) {
        // 堆顶（最大值）换到末尾
        [arr[0], arr[i]] = [arr[i], arr[0]];
        // 调整堆（堆大小减1）
        heapify(arr, i, 0);
    }
    
    return arr;
}

function heapify(arr, heapSize, i) {
    let largest = i;
    const left = 2 * i + 1;
    const right = 2 * i + 2;
    
    if (left < heapSize && arr[left] > arr[largest]) {
        largest = left;
    }
    
    if (right < heapSize && arr[right] > arr[largest]) {
        largest = right;
    }
    
    if (largest !== i) {
        [arr[i], arr[largest]] = [arr[largest], arr[i]];
        heapify(arr, heapSize, largest);
    }
}
```

## 图解

```
初始数组: [4, 10, 3, 5, 1]

建堆:
      4              10             10
     / \     →      / \     →      / \
    10  3          5   3          5   3
   / \            / \            / \
  5   1          4   1          4   1

堆: [10, 5, 3, 4, 1]

排序:
[10, 5, 3, 4, 1]
 交换10和1: [1, 5, 3, 4, 10]
 heapify: [5, 4, 3, 1, 10]

[5, 4, 3, 1, | 10]
 交换5和1: [1, 4, 3, 5, 10]
 heapify: [4, 1, 3, 5, 10]

... 继续

结果: [1, 3, 4, 5, 10]
```

## 建堆的时间复杂度

虽然heapify是O(log n)，建堆不是O(n log n)，而是**O(n)**。

证明：
- 高度为h的节点，heapify最多下沉h层
- 高度为h的节点数量约为n/2^(h+1)
- 总代价：Σ(n/2^(h+1)) × h = O(n)

## 迭代版heapify

```javascript
function heapifyIterative(arr, heapSize, i) {
    while (true) {
        let largest = i;
        const left = 2 * i + 1;
        const right = 2 * i + 2;
        
        if (left < heapSize && arr[left] > arr[largest]) {
            largest = left;
        }
        if (right < heapSize && arr[right] > arr[largest]) {
            largest = right;
        }
        
        if (largest === i) break;
        
        [arr[i], arr[largest]] = [arr[largest], arr[i]];
        i = largest;
    }
}
```

## 复杂度分析

**时间复杂度**：
- 建堆：O(n)
- 排序：O(n log n)
- 总计：O(n log n)

**空间复杂度**：O(1)，原地排序

**稳定性**：不稳定

## 堆排序的特点

### 优点

- **最坏O(n log n)**：无论输入如何
- **O(1)空间**：唯一同时满足的比较排序
- **适合TopK问题**：找前K大/小元素

### 缺点

- **不稳定**
- **缓存不友好**：访问模式跳跃
- **实际比快排慢**：常数因子大

## 与快排、归并的对比

| 特性 | 快排 | 归并 | 堆排序 |
|-----|------|------|-------|
| 平均时间 | O(n log n) | O(n log n) | O(n log n) |
| 最坏时间 | O(n²) | O(n log n) | O(n log n) |
| 空间 | O(log n) | O(n) | O(1) |
| 稳定 | 否 | 是 | 否 |
| 缓存友好 | 是 | 否 | 否 |

## 应用场景

### 1. TopK问题

找前K大元素：维护大小为K的最小堆。

### 2. 优先队列

堆是优先队列的经典实现。

### 3. 外部排序

当空间有限时，堆排序很有用。

## 小结

堆排序的核心是堆数据结构：
- 建堆O(n)，排序O(n log n)
- 唯一时间O(n log n)空间O(1)的比较排序
- 适合TopK和优先队列场景
