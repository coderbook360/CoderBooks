# 实战：归并排序

归并排序是分治算法的经典范例。

## 算法思想

1. **分解**：将数组分成两半
2. **解决**：递归地对两半进行排序
3. **合并**：将两个有序数组合并成一个有序数组

## 代码实现

```javascript
function mergeSort(arr) {
    if (arr.length <= 1) {
        return arr;
    }
    
    const mid = Math.floor(arr.length / 2);
    const left = mergeSort(arr.slice(0, mid));
    const right = mergeSort(arr.slice(mid));
    
    return merge(left, right);
}

function merge(left, right) {
    const result = [];
    let i = 0, j = 0;
    
    while (i < left.length && j < right.length) {
        if (left[i] <= right[j]) {
            result.push(left[i]);
            i++;
        } else {
            result.push(right[j]);
            j++;
        }
    }
    
    // 添加剩余元素
    while (i < left.length) {
        result.push(left[i]);
        i++;
    }
    while (j < right.length) {
        result.push(right[j]);
        j++;
    }
    
    return result;
}
```

## 图解

```
[38, 27, 43, 3, 9, 82, 10]

分解:
[38, 27, 43, 3] | [9, 82, 10]
[38, 27] | [43, 3] | [9, 82] | [10]
[38] | [27] | [43] | [3] | [9] | [82] | [10]

合并:
[27, 38] | [3, 43] | [9, 82] | [10]
[3, 27, 38, 43] | [9, 10, 82]
[3, 9, 10, 27, 38, 43, 82]
```

## 原地归并排序

上面的实现创建了很多临时数组，空间复杂度是O(n log n)。

可以优化为原地合并，空间复杂度O(n)：

```javascript
function mergeSort(arr, left = 0, right = arr.length - 1, temp = []) {
    if (left >= right) return;
    
    const mid = Math.floor((left + right) / 2);
    
    mergeSort(arr, left, mid, temp);
    mergeSort(arr, mid + 1, right, temp);
    merge(arr, left, mid, right, temp);
}

function merge(arr, left, mid, right, temp) {
    // 复制到临时数组
    for (let i = left; i <= right; i++) {
        temp[i] = arr[i];
    }
    
    let i = left, j = mid + 1, k = left;
    
    while (i <= mid && j <= right) {
        if (temp[i] <= temp[j]) {
            arr[k++] = temp[i++];
        } else {
            arr[k++] = temp[j++];
        }
    }
    
    while (i <= mid) {
        arr[k++] = temp[i++];
    }
    // j的剩余部分已经在正确位置
}
```

## 归并排序的优点

### 1. 稳定排序

相等的元素不会改变相对顺序。

在合并时用`<=`而不是`<`保证稳定性。

### 2. 时间复杂度稳定

无论输入如何，时间复杂度都是O(n log n)。

不像快速排序可能退化到O(n²)。

### 3. 适合外部排序

归并排序是顺序访问，适合磁盘等顺序存储设备。

### 4. 适合链表排序

链表的归并不需要额外空间。

## 归并排序的缺点

### 1. 需要额外空间

数组归并需要O(n)额外空间。

### 2. 小规模不如插入排序

对于小数组，插入排序更快（常数因子小）。

## 优化技巧

### 小规模用插入排序

```javascript
function mergeSort(arr, left, right) {
    if (right - left <= 15) {
        insertionSort(arr, left, right);
        return;
    }
    // ... 归并逻辑
}
```

### 跳过已排序部分

如果left部分的最大值 <= right部分的最小值，不需要合并。

```javascript
function mergeSort(arr, left, mid, right) {
    // ... 递归调用
    if (arr[mid] <= arr[mid + 1]) return;  // 已经有序
    merge(arr, left, mid, right);
}
```

## 复杂度分析

**时间复杂度**：O(n log n)
- 分解：O(1)
- 递归：T(n) = 2T(n/2)
- 合并：O(n)
- 总计：T(n) = 2T(n/2) + O(n) = O(n log n)

**空间复杂度**：O(n)，临时数组

## 小结

归并排序是分治的典范：
- 清晰的三步结构：分解、解决、合并
- 稳定的O(n log n)时间复杂度
- 牺牲空间换取稳定性和最坏情况保证
