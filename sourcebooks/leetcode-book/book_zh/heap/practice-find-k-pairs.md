# 实战：查找和最小的K对数字

## 题目描述

**LeetCode 373**：给定两个以**升序排列**的整数数组 `nums1` 和 `nums2`，以及一个整数 `k`。

定义一对值 `(u, v)`，其中第一个元素来自 `nums1`，第二个元素来自 `nums2`。

请找到和最小的 `k` 个数对 `(u1, v1), (u2, v2), ..., (uk, vk)`。

**示例**：

```
输入: nums1 = [1,7,11], nums2 = [2,4,6], k = 3
输出: [[1,2],[1,4],[1,6]]
解释: 返回序列中的前3对数:
     [1,2], [1,4], [1,6], [7,2], [7,4], [11,2], [7,6], [11,4], [11,6]

输入: nums1 = [1,1,2], nums2 = [1,2,3], k = 2
输出: [[1,1],[1,1]]
解释: 返回序列中的前2对数:
     [1,1], [1,1], [1,2], [2,1], [1,2], [2,2], [1,3], [1,3], [2,3]
```

## 思路分析

### 暴力思路

枚举所有 n×m 个数对，排序后取前 k 个。时间复杂度 O(nm log(nm))，太慢。

### 观察规律

关键洞察：两个数组都是**升序**的。

如果我们把所有可能的数对按和排列成一个矩阵：

```
nums1 = [1, 7, 11]
nums2 = [2, 4, 6]

        2    4    6
   1  | 3    5    7
   7  | 9   11   13
  11  |13   15   17
```

矩阵的特点：
- 每一行从左到右递增
- 每一列从上到下递增
- 最小的一定在左上角 (0, 0)

### 堆的思路

这类似于"合并 K 个有序链表"：
- 把矩阵的每一行看作一个有序链表
- 用堆进行多路归并

具体做法：
1. 初始化：把第一列的所有元素（每行的第一个候选）加入最小堆
2. 每次取出堆顶（当前最小的数对）
3. 把同一行的下一个元素加入堆
4. 重复 k 次

## 代码实现

```javascript
function kSmallestPairs(nums1, nums2, k) {
    if (nums1.length === 0 || nums2.length === 0) return [];
    
    const result = [];
    // 堆中存储 [和, nums1的索引, nums2的索引]
    const minHeap = new HeapWithComparator((a, b) => a[0] - b[0]);
    
    // 初始化：把 (nums1[i], nums2[0]) 加入堆
    // 注意：只需要加入前 k 个，因为最多取 k 个
    for (let i = 0; i < Math.min(nums1.length, k); i++) {
        minHeap.push([nums1[i] + nums2[0], i, 0]);
    }
    
    // 取 k 次
    while (k > 0 && minHeap.size() > 0) {
        const [sum, i, j] = minHeap.pop();
        result.push([nums1[i], nums2[j]]);
        k--;
        
        // 把同一行的下一个元素加入堆
        if (j + 1 < nums2.length) {
            minHeap.push([nums1[i] + nums2[j + 1], i, j + 1]);
        }
    }
    
    return result;
}
```

## 执行过程详解

以 `nums1 = [1,7,11], nums2 = [2,4,6], k = 3` 为例：

```
矩阵：
        j=0  j=1  j=2
        2    4    6
i=0  1 | 3    5    7
i=1  7 | 9   11   13
i=2 11 |13   15   17

初始化堆（第一列）：
heap = [(3,0,0), (9,1,0), (13,2,0)]

取第1个：弹出 (3,0,0) 即 [1,2]
         加入 (5,0,1) 即 nums1[0]+nums2[1]=5
         heap = [(5,0,1), (9,1,0), (13,2,0)]
         result = [[1,2]]

取第2个：弹出 (5,0,1) 即 [1,4]
         加入 (7,0,2) 即 nums1[0]+nums2[2]=7
         heap = [(7,0,2), (9,1,0), (13,2,0)]
         result = [[1,2], [1,4]]

取第3个：弹出 (7,0,2) 即 [1,6]
         j+1=3 超出范围，不加入新元素
         result = [[1,2], [1,4], [1,6]]

完成！返回 [[1,2], [1,4], [1,6]]
```

## 完整代码

```javascript
class HeapWithComparator {
    constructor(compareFn) {
        this.heap = [];
        this.compare = compareFn;
    }
    
    push(val) {
        this.heap.push(val);
        this.siftUp(this.heap.length - 1);
    }
    
    pop() {
        if (this.heap.length === 0) return undefined;
        const top = this.heap[0];
        const last = this.heap.pop();
        if (this.heap.length > 0) {
            this.heap[0] = last;
            this.siftDown(0);
        }
        return top;
    }
    
    peek() {
        return this.heap[0];
    }
    
    size() {
        return this.heap.length;
    }
    
    siftUp(i) {
        while (i > 0) {
            const parent = Math.floor((i - 1) / 2);
            if (this.compare(this.heap[i], this.heap[parent]) >= 0) break;
            [this.heap[i], this.heap[parent]] = [this.heap[parent], this.heap[i]];
            i = parent;
        }
    }
    
    siftDown(i) {
        const n = this.heap.length;
        while (true) {
            let smallest = i;
            const left = 2 * i + 1;
            const right = 2 * i + 2;
            if (left < n && this.compare(this.heap[left], this.heap[smallest]) < 0) {
                smallest = left;
            }
            if (right < n && this.compare(this.heap[right], this.heap[smallest]) < 0) {
                smallest = right;
            }
            if (smallest === i) break;
            [this.heap[i], this.heap[smallest]] = [this.heap[smallest], this.heap[i]];
            i = smallest;
        }
    }
}

function kSmallestPairs(nums1, nums2, k) {
    if (nums1.length === 0 || nums2.length === 0) return [];
    
    const result = [];
    const minHeap = new HeapWithComparator((a, b) => a[0] - b[0]);
    
    // 初始化第一列
    for (let i = 0; i < Math.min(nums1.length, k); i++) {
        minHeap.push([nums1[i] + nums2[0], i, 0]);
    }
    
    while (k > 0 && minHeap.size() > 0) {
        const [sum, i, j] = minHeap.pop();
        result.push([nums1[i], nums2[j]]);
        k--;
        
        if (j + 1 < nums2.length) {
            minHeap.push([nums1[i] + nums2[j + 1], i, j + 1]);
        }
    }
    
    return result;
}
```

## 为什么不需要去重？

与丑数问题不同，这里不会产生重复：
- 每个 (i, j) 只会从 (i, j-1) 产生
- 初始只有 (i, 0)，所以每个 (i, j) 最多被加入一次

## 复杂度分析

- **时间复杂度**：O(k log(min(k, n)))
  - 堆大小最多为 min(k, n)
  - 执行 k 次堆操作

- **空间复杂度**：O(min(k, n))
  - 堆的大小

## 推广：矩阵中最小的 K 个元素

如果给定一个按行按列都递增的矩阵，找最小的 K 个元素，思路完全一样：

```javascript
function kSmallest(matrix, k) {
    const n = matrix.length;
    const minHeap = new HeapWithComparator((a, b) => a[0] - b[0]);
    
    // 初始化第一列
    for (let i = 0; i < Math.min(n, k); i++) {
        minHeap.push([matrix[i][0], i, 0]);
    }
    
    const result = [];
    while (k > 0 && minHeap.size() > 0) {
        const [val, i, j] = minHeap.pop();
        result.push(val);
        k--;
        
        if (j + 1 < n) {
            minHeap.push([matrix[i][j + 1], i, j + 1]);
        }
    }
    
    return result;
}
```

## 小结

这道题展示了堆在**有序矩阵**问题中的应用：

**核心模式**：
- 矩阵每行/每列有序 → 类似多路归并
- 用堆维护每行的"当前候选"
- 每次取最小，补充同行下一个

**适用场景**：
- 查找和最小的 K 对数字
- 有序矩阵中第 K 小的元素
- 任何"二维有序结构"的 Top K 问题
