# 实战：桶排序实现

桶排序把元素分配到若干个"桶"中，每个桶单独排序后合并。

## 算法思想

1. 将元素分到若干个桶中
2. 对每个桶单独排序
3. 依次取出各桶的元素，得到有序数组

## 代码实现

### 整数版本

```javascript
function bucketSort(arr, bucketCount = 10) {
    if (arr.length === 0) return arr;
    
    const min = Math.min(...arr);
    const max = Math.max(...arr);
    
    // 计算桶的大小
    const bucketSize = Math.ceil((max - min + 1) / bucketCount);
    const buckets = Array.from({ length: bucketCount }, () => []);
    
    // 分配元素到桶
    for (const num of arr) {
        const bucketIndex = Math.floor((num - min) / bucketSize);
        buckets[bucketIndex].push(num);
    }
    
    // 对每个桶排序并合并
    let index = 0;
    for (const bucket of buckets) {
        bucket.sort((a, b) => a - b);  // 可以用插入排序
        for (const num of bucket) {
            arr[index++] = num;
        }
    }
    
    return arr;
}
```

### 浮点数版本

```javascript
function bucketSortFloat(arr, bucketCount = arr.length) {
    if (arr.length === 0) return arr;
    
    const min = Math.min(...arr);
    const max = Math.max(...arr);
    
    // 避免除以0
    if (min === max) return arr;
    
    const buckets = Array.from({ length: bucketCount }, () => []);
    
    // 分配元素到桶
    for (const num of arr) {
        // 映射到 [0, bucketCount)
        let bucketIndex = Math.floor((num - min) / (max - min) * (bucketCount - 1));
        buckets[bucketIndex].push(num);
    }
    
    // 对每个桶排序并合并
    let index = 0;
    for (const bucket of buckets) {
        insertionSort(bucket);
        for (const num of bucket) {
            arr[index++] = num;
        }
    }
    
    return arr;
}

function insertionSort(arr) {
    for (let i = 1; i < arr.length; i++) {
        const key = arr[i];
        let j = i - 1;
        while (j >= 0 && arr[j] > key) {
            arr[j + 1] = arr[j];
            j--;
        }
        arr[j + 1] = key;
    }
}
```

## 图解

```
arr = [0.42, 0.32, 0.23, 0.52, 0.25, 0.47, 0.51]
bucketCount = 5

分桶:
bucket[0]: []         (0-0.2)
bucket[1]: [0.23, 0.25] (0.2-0.4)
bucket[2]: [0.42, 0.32] (0.4-0.6)
bucket[3]: [0.52, 0.47, 0.51]
bucket[4]: []

各桶排序:
bucket[1]: [0.23, 0.25]
bucket[2]: [0.32, 0.42]
bucket[3]: [0.47, 0.51, 0.52]

合并:
[0.23, 0.25, 0.32, 0.42, 0.47, 0.51, 0.52]
```

## 复杂度分析

**时间复杂度**：
- 最好/平均：O(n + k)，数据均匀分布时
- 最坏：O(n²)，所有元素在同一个桶

**空间复杂度**：O(n + k)

**稳定性**：取决于内部排序算法

## 桶排序的关键

### 1. 桶的数量

- 太少：每个桶元素多，排序慢
- 太多：浪费空间，合并慢
- 经验值：桶数 ≈ 元素数

### 2. 数据分布

- **均匀分布**：效果最好，接近O(n)
- **不均匀**：可能退化到O(n²)

### 3. 桶内排序

- 元素少时用**插入排序**
- 元素多时用**快排**或递归桶排序

## 与计数排序的对比

| 特性 | 计数排序 | 桶排序 |
|-----|---------|-------|
| 适用类型 | 整数 | 任意（可映射） |
| 桶的含义 | 每个值一个桶 | 一个范围一个桶 |
| 空间 | O(范围) | O(桶数+n) |
| 最坏时间 | O(n+k) | O(n²) |

桶排序更灵活，但最坏情况更差。

## 适用场景

### 1. 均匀分布的浮点数

桶排序的最佳场景。

### 2. 已知数据分布

可以设计更好的映射函数。

### 3. 外部排序

数据量大时，可以把每个桶写入磁盘。

## 优化策略

### 自适应桶数

根据数据量和分布调整桶数：

```javascript
function adaptiveBucketSort(arr) {
    const n = arr.length;
    
    // 自适应选择桶数
    const bucketCount = Math.max(1, Math.floor(Math.sqrt(n)));
    
    return bucketSort(arr, bucketCount);
}
```

### 递归桶排序

桶内元素多时递归：

```javascript
function recursiveBucketSort(arr, depth = 0) {
    if (arr.length <= 10 || depth > 5) {
        return insertionSort(arr);
    }
    
    // 分桶
    // ...
    
    // 递归排序每个桶
    for (const bucket of buckets) {
        recursiveBucketSort(bucket, depth + 1);
    }
    
    // 合并
    // ...
}
```

## 小结

桶排序是灵活的非比较排序：
- 把元素分到桶中，各桶单独排序
- 平均O(n)，最坏O(n²)
- 适合均匀分布的数据
- 比计数排序更通用
