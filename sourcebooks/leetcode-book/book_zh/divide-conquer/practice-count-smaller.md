# 实战：计算右侧小于当前元素的个数

这道题与逆序对类似，但需要返回每个位置的计数。

## 问题描述

给你一个整数数组`nums`，按要求返回一个新数组`counts`。

数组`counts`有该性质：`counts[i]`的值是`nums[i]`右侧小于`nums[i]`的元素的数量。

## 思路分析

### 与逆序对的区别

逆序对只要总数，这道题要每个位置的计数。

### 关键：保持索引

排序时不仅要排序元素，还要追踪每个元素的原始索引。

在合并时，当发现`left[i] > right[j]`，就给`left[i]`的原始索引位置加上计数。

## 代码实现

```javascript
function countSmaller(nums) {
    const n = nums.length;
    const counts = new Array(n).fill(0);
    
    // 创建索引数组，排序时移动索引
    const indices = nums.map((_, i) => i);
    const temp = new Array(n);
    
    mergeSort(nums, indices, 0, n - 1, temp, counts);
    
    return counts;
}

function mergeSort(nums, indices, left, right, temp, counts) {
    if (left >= right) return;
    
    const mid = Math.floor((left + right) / 2);
    
    mergeSort(nums, indices, left, mid, temp, counts);
    mergeSort(nums, indices, mid + 1, right, temp, counts);
    merge(nums, indices, left, mid, right, temp, counts);
}

function merge(nums, indices, left, mid, right, temp, counts) {
    // 复制索引到临时数组
    for (let i = left; i <= right; i++) {
        temp[i] = indices[i];
    }
    
    let i = left, j = mid + 1, k = left;
    
    while (i <= mid && j <= right) {
        if (nums[temp[i]] <= nums[temp[j]]) {
            // 右边已经移动了 j - (mid + 1) 个元素
            // 这些元素都小于 nums[temp[i]]
            counts[temp[i]] += j - mid - 1;
            indices[k++] = temp[i++];
        } else {
            indices[k++] = temp[j++];
        }
    }
    
    while (i <= mid) {
        counts[temp[i]] += j - mid - 1;
        indices[k++] = temp[i++];
    }
    
    while (j <= right) {
        indices[k++] = temp[j++];
    }
}
```

## 图解

```
nums = [5, 2, 6, 1]
indices = [0, 1, 2, 3]

分解:
indices [0, 1] | [2, 3]  (对应 [5, 2] | [6, 1])

左半部分:
[0] | [1]  (5 | 2)
合并: 5 > 2, 2先放入
      5放入时, j已移动1位, counts[0] += 1
结果 indices: [1, 0], counts: [1, 0, 0, 0]

右半部分:
[2] | [3]  (6 | 1)
合并: 6 > 1, 1先放入
      6放入时, j已移动1位, counts[2] += 1
结果 indices: [3, 2], counts: [1, 0, 1, 0]

跨越合并:
indices [1, 0] | [3, 2]
对应值 [2, 5] | [1, 6]

i=0, j=0: nums[1]=2 > nums[3]=1, j++
i=0, j=1: nums[1]=2 < nums[2]=6, counts[1] += 1, i++
i=1, j=1: nums[0]=5 < nums[2]=6, counts[0] += 1, i++
i结束, j移动

最终 counts: [2, 1, 1, 0]
```

## 为什么这样统计是对的？

### 关键观察

当我们将`left[i]`放入结果时，右边已经有`j - (mid + 1)`个元素被放入了。

这些元素都比`nums[temp[i]]`小（否则它们不会先被放入）。

而且这些元素原本都在`nums[temp[i]]`的右边（因为它们来自右半部分）。

### 索引追踪

我们排序的是索引，不是值。这样可以追踪每个元素的原始位置。

## 另一种方法：树状数组

可以从右向左遍历，用树状数组维护已访问元素的个数。

```javascript
function countSmaller(nums) {
    // 离散化
    const sorted = [...new Set(nums)].sort((a, b) => a - b);
    const rank = new Map(sorted.map((v, i) => [v, i + 1]));
    
    const n = nums.length;
    const counts = new Array(n).fill(0);
    const tree = new Array(sorted.length + 1).fill(0);
    
    // 从右向左遍历
    for (let i = n - 1; i >= 0; i--) {
        const r = rank.get(nums[i]);
        counts[i] = query(tree, r - 1);  // 查询比当前小的元素个数
        update(tree, r, 1);              // 将当前元素加入树状数组
    }
    
    return counts;
}

function update(tree, i, delta) {
    while (i < tree.length) {
        tree[i] += delta;
        i += i & (-i);
    }
}

function query(tree, i) {
    let sum = 0;
    while (i > 0) {
        sum += tree[i];
        i -= i & (-i);
    }
    return sum;
}
```

## 两种方法的对比

| 方法 | 时间复杂度 | 空间复杂度 | 特点 |
|-----|-----------|-----------|------|
| 归并排序 | O(n log n) | O(n) | 离线处理 |
| 树状数组 | O(n log n) | O(n) | 支持在线查询 |

## 复杂度分析

**时间复杂度**：O(n log n)

**空间复杂度**：O(n)

## 小结

这道题展示了归并排序统计的进阶应用：
1. 不仅要排序，还要追踪原始索引
2. 在合并时给每个元素累加计数
3. 关键是理解"右边已放入的元素都比当前小"
