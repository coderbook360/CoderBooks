# 实战：计数排序实现

计数排序是一种非比较排序，通过统计元素出现次数来排序。

## 算法思想

1. 找出数组中的最大值和最小值
2. 创建计数数组，统计每个值出现的次数
3. 累加计数数组，计算每个值的最终位置
4. 从后往前遍历原数组，将元素放到正确位置

## 代码实现

### 基础版本

```javascript
function countingSort(arr) {
    if (arr.length === 0) return arr;
    
    const max = Math.max(...arr);
    const min = Math.min(...arr);
    const range = max - min + 1;
    
    // 计数数组
    const count = new Array(range).fill(0);
    
    // 统计每个值的出现次数
    for (const num of arr) {
        count[num - min]++;
    }
    
    // 重构排序后的数组
    let index = 0;
    for (let i = 0; i < range; i++) {
        while (count[i] > 0) {
            arr[index++] = i + min;
            count[i]--;
        }
    }
    
    return arr;
}
```

### 稳定版本

```javascript
function countingSortStable(arr) {
    if (arr.length === 0) return arr;
    
    const n = arr.length;
    const max = Math.max(...arr);
    const min = Math.min(...arr);
    const range = max - min + 1;
    
    // 计数数组
    const count = new Array(range).fill(0);
    
    // 统计次数
    for (const num of arr) {
        count[num - min]++;
    }
    
    // 累加，count[i]表示<=i的元素个数
    for (let i = 1; i < range; i++) {
        count[i] += count[i - 1];
    }
    
    // 从后往前遍历，保证稳定性
    const result = new Array(n);
    for (let i = n - 1; i >= 0; i--) {
        const val = arr[i];
        const pos = count[val - min] - 1;
        result[pos] = val;
        count[val - min]--;
    }
    
    return result;
}
```

## 图解

```
arr = [4, 2, 2, 8, 3, 3, 1]
min = 1, max = 8, range = 8

统计:
count = [1, 2, 2, 1, 0, 0, 0, 1]
        (1) (2) (3) (4) (5) (6) (7) (8)

累加:
count = [1, 3, 5, 6, 6, 6, 6, 7]

从后往前放置:
arr[6]=1, pos=count[0]-1=0, result[0]=1, count[0]=0
arr[5]=3, pos=count[2]-1=4, result[4]=3, count[2]=4
arr[4]=3, pos=count[2]-1=3, result[3]=3, count[2]=3
...

result = [1, 2, 2, 3, 3, 4, 8]
```

## 为什么从后往前遍历？

为了保证**稳定性**。

如果从前往后遍历，相同值的元素会被放在逆序位置。

从后往前遍历，可以保持相同值元素的原始相对顺序。

## 复杂度分析

**时间复杂度**：O(n + k)
- n是元素个数
- k是数值范围

**空间复杂度**：O(n + k)
- 计数数组O(k)
- 结果数组O(n)

**稳定性**：稳定（稳定版本）

## 适用条件

计数排序只适用于：
1. **整数**
2. **范围不太大**（k ≤ n时最优）

如果k >> n，计数排序反而很慢。

## 优缺点

### 优点

- **线性时间**：O(n + k)
- **稳定**
- **适合小范围整数**

### 缺点

- **只能用于整数**
- **空间消耗与范围成正比**
- **不适合稀疏数据**

## 应用场景

### 1. 成绩排序

成绩范围0-100，非常适合计数排序。

### 2. 年龄排序

年龄范围0-120，范围小。

### 3. 基数排序的子程序

基数排序每一位用计数排序。

## 处理负数

```javascript
function countingSortWithNegatives(arr) {
    const min = Math.min(...arr);
    // 把所有数平移到非负
    const shifted = arr.map(x => x - min);
    // 排序
    countingSort(shifted);
    // 平移回来
    return shifted.map(x => x + min);
}
```

## 小结

计数排序是简单高效的非比较排序：
- 统计每个值的出现次数
- O(n + k)时间复杂度
- 适合小范围整数排序
- 是基数排序的基础
