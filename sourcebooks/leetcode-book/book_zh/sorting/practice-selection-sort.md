# 实战：选择排序实现

选择排序的思想是每次选出最小的元素放到正确位置。

## 算法思想

1. 在未排序部分找到最小元素
2. 把它和未排序部分的第一个元素交换
3. 重复直到全部排序

## 代码实现

```javascript
function selectionSort(arr) {
    const n = arr.length;
    
    for (let i = 0; i < n - 1; i++) {
        // 找到未排序部分的最小元素
        let minIndex = i;
        for (let j = i + 1; j < n; j++) {
            if (arr[j] < arr[minIndex]) {
                minIndex = j;
            }
        }
        
        // 交换到正确位置
        if (minIndex !== i) {
            [arr[i], arr[minIndex]] = [arr[minIndex], arr[i]];
        }
    }
    
    return arr;
}
```

## 图解

```
初始: [64, 25, 12, 22, 11]

第1轮: 找最小(11)，与第1个交换
[11, 25, 12, 22, 64]
 ^已排序

第2轮: 在[25,12,22,64]中找最小(12)，与第2个交换
[11, 12, 25, 22, 64]
 ^^ 已排序

第3轮: 在[25,22,64]中找最小(22)，与第3个交换
[11, 12, 22, 25, 64]
 ^^^ 已排序

第4轮: 在[25,64]中找最小(25)，已在正确位置
[11, 12, 22, 25, 64]
 ^^^^ 已排序

完成: [11, 12, 22, 25, 64]
```

## 与冒泡排序的对比

| 特性 | 冒泡排序 | 选择排序 |
|-----|---------|---------|
| 比较次数 | O(n²) | O(n²) |
| 交换次数 | O(n²) | O(n) |
| 稳定性 | 稳定 | 不稳定 |

选择排序的**交换次数更少**（最多n-1次），但**不稳定**。

## 为什么不稳定？

```
[5, 5*, 3]

找最小(3)，与第1个(5)交换
[3, 5*, 5]

原来5在5*前面，现在5在5*后面，相对顺序改变了
```

## 双向选择排序

同时找最小和最大，从两端向中间排序：

```javascript
function bidirectionalSelectionSort(arr) {
    let left = 0;
    let right = arr.length - 1;
    
    while (left < right) {
        let minIndex = left;
        let maxIndex = left;
        
        for (let i = left; i <= right; i++) {
            if (arr[i] < arr[minIndex]) minIndex = i;
            if (arr[i] > arr[maxIndex]) maxIndex = i;
        }
        
        // 把最小放到左边
        [arr[left], arr[minIndex]] = [arr[minIndex], arr[left]];
        
        // 如果最大值在left位置，它已经被交换到minIndex了
        if (maxIndex === left) {
            maxIndex = minIndex;
        }
        
        // 把最大放到右边
        [arr[right], arr[maxIndex]] = [arr[maxIndex], arr[right]];
        
        left++;
        right--;
    }
    
    return arr;
}
```

## 复杂度分析

**时间复杂度**：
- 最好：O(n²)
- 平均：O(n²)
- 最坏：O(n²)

无论输入如何，都需要O(n²)次比较。

**空间复杂度**：O(1)

**稳定性**：不稳定

## 优缺点

### 优点

- **简单**：易于理解和实现
- **交换少**：只需O(n)次交换
- **原地**：不需要额外空间

### 缺点

- **效率低**：始终O(n²)，即使数组已排序
- **不稳定**：可能改变相等元素的相对顺序

## 适用场景

- 交换代价高时（如大型对象）
- 对稳定性没有要求
- 教学演示

## 小结

选择排序的核心是"选最小"：
- 每轮找未排序部分的最小值
- 交换到正确位置
- 交换次数少，但比较次数固定O(n²)
- 不稳定，但实现简单
