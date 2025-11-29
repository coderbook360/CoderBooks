# 实战：希尔排序实现

希尔排序是插入排序的改进版，引入了"增量"的概念。

## 算法思想

插入排序每次只移动一位，效率低。

希尔排序的改进：先让数组"部分有序"，然后再用插入排序。

具体做法：
1. 选择一个增量序列：h₁ > h₂ > ... > hₖ = 1
2. 对于每个增量h，进行h-排序（间隔为h的元素排序）
3. 最后h=1时就是普通插入排序

## 代码实现

### 基础版本（希尔增量）

```javascript
function shellSort(arr) {
    const n = arr.length;
    
    // 希尔增量：n/2, n/4, ..., 1
    for (let gap = Math.floor(n / 2); gap > 0; gap = Math.floor(gap / 2)) {
        // 对每个间隔进行插入排序
        for (let i = gap; i < n; i++) {
            const key = arr[i];
            let j = i;
            
            while (j >= gap && arr[j - gap] > key) {
                arr[j] = arr[j - gap];
                j -= gap;
            }
            
            arr[j] = key;
        }
    }
    
    return arr;
}
```

### Hibbard增量

```javascript
function shellSortHibbard(arr) {
    const n = arr.length;
    
    // Hibbard增量：1, 3, 7, 15, ... (2^k - 1)
    let gap = 1;
    while (gap < n / 2) {
        gap = gap * 2 + 1;
    }
    
    while (gap >= 1) {
        for (let i = gap; i < n; i++) {
            const key = arr[i];
            let j = i;
            
            while (j >= gap && arr[j - gap] > key) {
                arr[j] = arr[j - gap];
                j -= gap;
            }
            
            arr[j] = key;
        }
        
        gap = Math.floor((gap - 1) / 2);
    }
    
    return arr;
}
```

### Sedgewick增量（更优）

```javascript
function shellSortSedgewick(arr) {
    const n = arr.length;
    
    // Sedgewick增量序列
    const gaps = [];
    let k = 0;
    while (true) {
        let gap;
        if (k % 2 === 0) {
            gap = 9 * (Math.pow(2, k) - Math.pow(2, k/2)) + 1;
        } else {
            gap = 8 * Math.pow(2, k) - 6 * Math.pow(2, (k+1)/2) + 1;
        }
        if (gap >= n) break;
        gaps.push(gap);
        k++;
    }
    
    // 从大到小使用增量
    for (let g = gaps.length - 1; g >= 0; g--) {
        const gap = gaps[g];
        
        for (let i = gap; i < n; i++) {
            const key = arr[i];
            let j = i;
            
            while (j >= gap && arr[j - gap] > key) {
                arr[j] = arr[j - gap];
                j -= gap;
            }
            
            arr[j] = key;
        }
    }
    
    return arr;
}
```

## 图解

```
初始: [8, 9, 1, 7, 2, 3, 5, 4, 6, 0]

gap=5:
  比较 [8,3], [9,5], [1,4], [7,6], [2,0]
  结果: [3, 5, 1, 6, 0, 8, 9, 4, 7, 2]

gap=2:
  比较 [3,1,0,9,7], [5,6,8,4,2]
  结果: [0, 2, 1, 4, 3, 5, 7, 6, 9, 8]

gap=1:
  普通插入排序
  结果: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
```

## 为什么希尔排序有效？

### 1. 减少数据移动

大的gap可以让元素快速移动到接近最终位置。

### 2. 逆序对减少

每次h-排序都会减少逆序对数量，让数组越来越有序。

### 3. 最后的1-排序很快

经过前面的排序，数组已经"基本有序"，最后的插入排序非常高效。

## 增量序列的选择

| 增量序列 | 最坏复杂度 | 说明 |
|---------|-----------|------|
| Shell | O(n²) | n/2, n/4, ... |
| Hibbard | O(n^1.5) | 2^k - 1 |
| Sedgewick | O(n^(4/3)) | 复杂公式 |
| Pratt | O(n log²n) | 2^p × 3^q |

增量序列的选择直接影响性能。

## 复杂度分析

**时间复杂度**：
- 取决于增量序列
- 希尔增量：O(n²)最坏
- Hibbard增量：O(n^1.5)
- 最优增量：约O(n log²n)

**空间复杂度**：O(1)

**稳定性**：不稳定（不同组可能交换相等元素的顺序）

## 与其他O(n²)算法的对比

希尔排序虽然最坏是O(n²)，但：
- 实际中通常比O(n²)快得多
- 对于中等规模数据很实用
- 实现简单，不需要额外空间

## 小结

希尔排序是插入排序的改进：
- 引入增量，先让数组部分有序
- 性能取决于增量序列
- 不稳定，但实现简单高效
- 适合中等规模数据
