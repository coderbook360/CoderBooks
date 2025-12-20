# 实战：快速排序

> LeetCode 912. 排序数组（快速排序解法）| 难度：中等

快速排序是另一个分治经典，通过选择枢轴（pivot）将数组分区，递归排序。它是实践中最常用的排序算法之一。

📎 [LeetCode 912. 排序数组](https://leetcode.cn/problems/sort-an-array/)

---

## 算法核心思想

**分治三步骤**：

1. **选择枢轴（Pivot）**：从数组中选一个元素作为基准
2. **分区（Partition）**：将小于 pivot 的放左边，大于的放右边
3. **递归**：对左右两部分分别排序

**关键区别**（与归并排序对比）：
- 归并排序：先递归，后合并
- 快速排序：先分区，后递归

```
[3, 7, 8, 5, 2, 1, 9, 5, 4]  选择 pivot=5
           ↓ 分区
[3, 2, 1, 4] [5, 5] [7, 8, 9]
     ↓                  ↓
递归排序左边         递归排序右边
     ↓                  ↓
  [1,2,3,4]          [7,8,9]
           ↓ 合并（不需要额外操作）
[1, 2, 3, 4, 5, 5, 7, 8, 9]
```

---

## 代码实现：简洁版

```typescript
function quickSort(arr: number[]): number[] {
  if (arr.length <= 1) return arr;
  
  // 选择中间元素作为 pivot（避免已排序数组的最坏情况）
  const pivot = arr[Math.floor(arr.length / 2)];
  
  // 三路分区
  const left = arr.filter(x => x < pivot);
  const middle = arr.filter(x => x === pivot);
  const right = arr.filter(x => x > pivot);
  
  return [...quickSort(left), ...middle, ...quickSort(right)];
}
```

**优点**：代码清晰易懂
**缺点**：创建新数组，空间复杂度 O(n log n)

---

## 代码实现：原地排序版（Lomuto 分区）

```typescript
function quickSortInPlace(arr: number[]): void {
  function sort(left: number, right: number): void {
    if (left >= right) return;
    
    const pivotIndex = partition(left, right);
    sort(left, pivotIndex - 1);
    sort(pivotIndex + 1, right);
  }
  
  // Lomuto 分区方案
  function partition(left: number, right: number): number {
    const pivot = arr[right];  // 选择最后一个元素作为 pivot
    let i = left;  // i 指向"小于 pivot 区域"的下一个位置
    
    for (let j = left; j < right; j++) {
      if (arr[j] < pivot) {
        [arr[i], arr[j]] = [arr[j], arr[i]];
        i++;
      }
    }
    
    // 将 pivot 放到正确位置
    [arr[i], arr[right]] = [arr[right], arr[i]];
    return i;
  }
  
  sort(0, arr.length - 1);
}
```

### 分区过程详解

```
arr = [3, 7, 8, 5, 2, 1, 9, 5, 4], pivot = 4

初始: i=0, j=0
[3, 7, 8, 5, 2, 1, 9, 5, 4]
 i                       ^pivot

j=0: 3<4, 交换arr[0]和arr[0], i=1
[3, 7, 8, 5, 2, 1, 9, 5, 4]
    i

j=1: 7>4, 不交换
j=2: 8>4, 不交换
j=3: 5>4, 不交换
j=4: 2<4, 交换arr[1]和arr[4], i=2
[3, 2, 8, 5, 7, 1, 9, 5, 4]
       i

j=5: 1<4, 交换arr[2]和arr[5], i=3
[3, 2, 1, 5, 7, 8, 9, 5, 4]
          i

j=6,7: 不交换

最后：交换 arr[3] 和 arr[8]
[3, 2, 1, 4, 7, 8, 9, 5, 5]
          ^pivot 就位

返回 i=3
```

---

## 优化一：随机选择 Pivot

避免已排序数组导致的 O(n²) 最坏情况。

```typescript
function partitionRandom(left: number, right: number): number {
  // 随机选择 pivot，与最后一个元素交换
  const randomIndex = left + Math.floor(Math.random() * (right - left + 1));
  [arr[randomIndex], arr[right]] = [arr[right], arr[randomIndex]];
  
  // 继续使用 Lomuto 分区
  return partition(left, right);
}
```

---

## 优化二：三路快排（处理重复元素）

当数组中有大量重复元素时，标准快排效率下降。三路快排将数组分为三部分：小于、等于、大于 pivot。

```typescript
function quickSort3Way(arr: number[]): void {
  function sort(left: number, right: number): void {
    if (left >= right) return;
    
    const pivot = arr[left];
    let lt = left;      // arr[left..lt-1] < pivot
    let i = left + 1;   // arr[lt..i-1] == pivot (待处理区)
    let gt = right;     // arr[gt+1..right] > pivot
    
    while (i <= gt) {
      if (arr[i] < pivot) {
        [arr[lt], arr[i]] = [arr[i], arr[lt]];
        lt++;
        i++;
      } else if (arr[i] > pivot) {
        [arr[i], arr[gt]] = [arr[gt], arr[i]];
        gt--;
        // i 不动，因为交换来的元素还未检查
      } else {
        i++;
      }
    }
    
    // 现在 arr[left..lt-1] < pivot, arr[lt..gt] == pivot, arr[gt+1..right] > pivot
    sort(left, lt - 1);
    sort(gt + 1, right);
  }
  
  sort(0, arr.length - 1);
}
```

**三路分区的效果**：
- 所有等于 pivot 的元素一次性排好
- 递归只处理不等于 pivot 的部分

---

## 复杂度分析

### 时间复杂度

**平均情况**：O(n log n)
- 每次分区大致对半分，递归深度 O(log n)
- 每层分区工作量 O(n)

**最坏情况**：O(n²)
- 每次 pivot 选到最大或最小值
- 例如：已排序数组 + 总是选第一个元素

**最好情况**：O(n log n)
- 每次 pivot 恰好是中位数

### 空间复杂度

**平均**：O(log n)（递归栈）
**最坏**：O(n)（递归栈退化为线性）

---

## 快排 vs 归并

| 特性 | 快速排序 | 归并排序 |
|-----|---------|---------|
| **平均时间** | O(n log n) | O(n log n) |
| **最坏时间** | O(n²) | O(n log n) |
| **空间复杂度** | O(log n) | O(n) |
| **稳定性** | 不稳定 | 稳定 |
| **原地排序** | 是 | 否 |
| **缓存友好** | 更好 | 较差 |

**实践中快排更常用的原因**：
1. 原地排序，空间开销小
2. 缓存友好，内存访问局部性好
3. 随机化后，最坏情况极少发生

---

## 优化技巧汇总

1. **随机选择 pivot**：避免最坏情况
2. **三数取中**：选择首、中、尾三个元素的中位数作为 pivot
3. **小数组用插入排序**：n < 10 时切换到插入排序
4. **三路快排**：处理大量重复元素
5. **尾递归优化**：先递归较小的分区，减少栈深度

```typescript
// 尾递归优化示例
function sort(left: number, right: number): void {
  while (left < right) {
    const pivotIndex = partition(left, right);
    
    // 先处理较小的分区（尾递归优化）
    if (pivotIndex - left < right - pivotIndex) {
      sort(left, pivotIndex - 1);
      left = pivotIndex + 1;  // 迭代处理右边
    } else {
      sort(pivotIndex + 1, right);
      right = pivotIndex - 1;  // 迭代处理左边
    }
  }
}
```

---

## 常见错误

### 错误1：Pivot 选择不当

```typescript
// ❌ 总是选第一个元素，对已排序数组退化为 O(n²)
const pivot = arr[left];
```

### 错误2：分区边界错误

```typescript
// ❌ 递归边界错误
sort(left, pivotIndex);  // 应该是 pivotIndex - 1
sort(pivotIndex, right); // 应该是 pivotIndex + 1
```

### 错误3：忽略等于 pivot 的元素

```typescript
// ❌ 不处理等于的情况，可能死循环
if (arr[j] < pivot) { ... }
else { ... }  // 等于时应该如何处理？
```

---

## 相关题目

- LeetCode 215. 数组中的第K个最大元素（快速选择）
- LeetCode 347. 前 K 个高频元素
- LeetCode 75. 颜色分类（荷兰国旗问题）

---

## 总结

快速排序是分治思想的精髓体现：

1. **核心是分区**：通过 pivot 将问题分解
2. **随机化是关键**：避免最坏情况
3. **三路优化**：处理重复元素

理解快排不仅是学习排序算法，更是理解"分区"这一核心技巧。这个技巧在快速选择、Top-K 问题中都有重要应用。
