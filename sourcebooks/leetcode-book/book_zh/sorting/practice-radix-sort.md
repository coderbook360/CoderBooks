# 实战：基数排序实现

基数排序按"位"来排序，适合整数和定长字符串。

## 算法思想

从最低位到最高位（或反过来），依次对每一位进行稳定排序。

两种方式：
- **LSD**（Least Significant Digit）：从低位到高位
- **MSD**（Most Significant Digit）：从高位到低位

LSD更常用，我们主要介绍LSD。

## 代码实现

### 非负整数版本

```javascript
function radixSort(arr) {
    if (arr.length === 0) return arr;
    
    const max = Math.max(...arr);
    
    // 从个位开始，逐位排序
    for (let exp = 1; Math.floor(max / exp) > 0; exp *= 10) {
        countingSortByDigit(arr, exp);
    }
    
    return arr;
}

function countingSortByDigit(arr, exp) {
    const n = arr.length;
    const output = new Array(n);
    const count = new Array(10).fill(0);
    
    // 统计每个数字出现的次数
    for (const num of arr) {
        const digit = Math.floor(num / exp) % 10;
        count[digit]++;
    }
    
    // 累加
    for (let i = 1; i < 10; i++) {
        count[i] += count[i - 1];
    }
    
    // 从后往前放置（保证稳定性）
    for (let i = n - 1; i >= 0; i--) {
        const digit = Math.floor(arr[i] / exp) % 10;
        output[count[digit] - 1] = arr[i];
        count[digit]--;
    }
    
    // 复制回原数组
    for (let i = 0; i < n; i++) {
        arr[i] = output[i];
    }
}
```

### 支持负数版本

```javascript
function radixSortWithNegative(arr) {
    // 分离正数和负数
    const positives = arr.filter(x => x >= 0);
    const negatives = arr.filter(x => x < 0).map(x => -x);
    
    // 分别排序
    radixSort(positives);
    radixSort(negatives);
    
    // 合并：负数逆序 + 正数
    negatives.reverse();
    return negatives.map(x => -x).concat(positives);
}
```

## 图解

```
arr = [170, 45, 75, 90, 802, 24, 2, 66]

个位排序 (exp=1):
[170, 90, 802, 2, 24, 45, 75, 66]

十位排序 (exp=10):
[802, 2, 24, 45, 66, 170, 75, 90]

百位排序 (exp=100):
[2, 24, 45, 66, 75, 90, 170, 802]

完成！
```

## 为什么从低位到高位？

因为我们使用**稳定排序**（计数排序）。

当排序高位时，低位已经有序。如果高位相同，稳定排序会保持低位的相对顺序。

例如：
- 45和47，个位排序后45在47前面
- 十位排序时，两者十位都是4，稳定排序保持45在47前面

## 复杂度分析

**时间复杂度**：O(d × (n + k))
- d：位数（最大数的位数）
- n：元素个数
- k：每位的范围（十进制是10）

如果d和k都是常数，时间复杂度是O(n)。

**空间复杂度**：O(n + k)

**稳定性**：稳定

## 基数排序 vs 快排

| 特性 | 基数排序 | 快排 |
|-----|---------|------|
| 时间 | O(d × n) | O(n log n) |
| 空间 | O(n) | O(log n) |
| 稳定 | 是 | 否 |
| 比较 | 无 | 需要 |

当d < log n时，基数排序更快。例如：
- 100万个32位整数
- 快排：100万 × 20 = 2000万次操作
- 基数排序：100万 × 10 = 1000万次操作

## 字符串排序

基数排序也可以排序定长字符串：

```javascript
function radixSortStrings(arr) {
    if (arr.length === 0) return arr;
    
    const maxLen = Math.max(...arr.map(s => s.length));
    
    // 补齐长度
    arr = arr.map(s => s.padEnd(maxLen, '\0'));
    
    // 从最后一位开始排序
    for (let i = maxLen - 1; i >= 0; i--) {
        countingSortByChar(arr, i);
    }
    
    // 去除填充
    return arr.map(s => s.replace(/\0/g, ''));
}
```

## MSD基数排序

从高位到低位，递归处理：

```javascript
function msdRadixSort(arr, left = 0, right = arr.length - 1, digit = 0) {
    if (left >= right) return;
    if (digit >= maxDigits) return;
    
    // 按当前位分桶
    const buckets = Array.from({ length: 10 }, () => []);
    
    for (let i = left; i <= right; i++) {
        const d = getDigit(arr[i], digit);
        buckets[d].push(arr[i]);
    }
    
    // 写回原数组
    let index = left;
    for (let d = 0; d < 10; d++) {
        const start = index;
        for (const num of buckets[d]) {
            arr[index++] = num;
        }
        // 递归排序每个桶
        msdRadixSort(arr, start, index - 1, digit + 1);
    }
}
```

MSD适合变长字符串，可以提前终止。

## 应用场景

### 1. 整数排序

位数固定时效率高。

### 2. 字符串排序

定长字符串的高效排序。

### 3. 后缀数组

构建后缀数组的关键步骤。

## 小结

基数排序是强大的非比较排序：
- 按位排序，从低到高或从高到低
- O(d × n)时间，d是位数
- 稳定，适合整数和定长字符串
- 当位数少时比快排更快
