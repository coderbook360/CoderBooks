# 实战：堆排序实现

堆排序是一种基于堆数据结构的排序算法，时间复杂度稳定O(n log n)，空间复杂度O(1)。

---

## 核心思想

堆排序分为两个阶段：

1. **建堆阶段**：将数组构建成最大堆
2. **排序阶段**：依次取出堆顶，重建堆

### 堆的性质

**最大堆**：每个节点的值 ≥ 子节点的值

```
         9
       /   \
      7     8
     / \   / \
    3   6 5   4

数组表示：[9, 7, 8, 3, 6, 5, 4]

索引关系：
- 父节点：(i - 1) / 2
- 左子节点：2i + 1
- 右子节点：2i + 2
```

---

## 代码实现

### 完整实现

```typescript
function heapSort(arr: number[]): void {
  const n = arr.length;
  
  // 阶段1：建堆（从最后一个非叶子节点开始）
  for (let i = Math.floor(n / 2) - 1; i >= 0; i--) {
    heapify(arr, n, i);
  }
  
  // 阶段2：排序
  for (let i = n - 1; i > 0; i--) {
    // 将堆顶（最大值）与末尾交换
    [arr[0], arr[i]] = [arr[i], arr[0]];
    // 对剩余元素重建堆
    heapify(arr, i, 0);
  }
}

// 下沉调整：确保以i为根的子树满足堆性质
function heapify(arr: number[], n: number, i: number): void {
  let largest = i;       // 假设当前节点最大
  const left = 2 * i + 1;
  const right = 2 * i + 2;
  
  // 左子节点更大
  if (left < n && arr[left] > arr[largest]) {
    largest = left;
  }
  
  // 右子节点更大
  if (right < n && arr[right] > arr[largest]) {
    largest = right;
  }
  
  // 如果最大值不是当前节点
  if (largest !== i) {
    [arr[i], arr[largest]] = [arr[largest], arr[i]];
    // 递归调整被影响的子树
    heapify(arr, n, largest);
  }
}
```

### 迭代版本的heapify

```typescript
function heapifyIterative(arr: number[], n: number, i: number): void {
  while (true) {
    let largest = i;
    const left = 2 * i + 1;
    const right = 2 * i + 2;
    
    if (left < n && arr[left] > arr[largest]) {
      largest = left;
    }
    if (right < n && arr[right] > arr[largest]) {
      largest = right;
    }
    
    if (largest === i) break;
    
    [arr[i], arr[largest]] = [arr[largest], arr[i]];
    i = largest;
  }
}
```

---

## 执行过程可视化

### 建堆过程

```
原始数组：[4, 10, 3, 5, 1]

    4
   / \
  10  3
 / \
5   1

从最后一个非叶子节点(索引1)开始下沉：

步骤1：处理索引1（值为10）
       10 > 5, 10 > 1，不需调整

步骤2：处理索引0（值为4）
       4 < 10，交换
    
       10
      / \
     4   3
    / \
   5   1
   
       继续下沉4
       4 < 5，交换
       
       10
      / \
     5   3
    / \
   4   1

建堆完成：[10, 5, 3, 4, 1]
```

### 排序过程

```
堆：[10, 5, 3, 4, 1]

步骤1：交换10和1，堆大小减1
       [1, 5, 3, 4 | 10]
       下沉1 → [5, 4, 3, 1 | 10]

步骤2：交换5和1，堆大小减1
       [1, 4, 3 | 5, 10]
       下沉1 → [4, 1, 3 | 5, 10]

步骤3：交换4和3，堆大小减1
       [3, 1 | 4, 5, 10]
       → [3, 1 | 4, 5, 10]（无需调整）

步骤4：交换3和1
       [1, 3, 4, 5, 10]

排序完成！
```

---

## 复杂度分析

**时间复杂度**：O(n log n)
- 建堆：O(n)
- 排序：O(n log n)

**为什么建堆是O(n)而不是O(n log n)？**

```
叶子节点（n/2个）：不需要下沉
倒数第2层（n/4个）：最多下沉1次
倒数第3层（n/8个）：最多下沉2次
...
根节点（1个）：最多下沉log n次

总操作 = n/4 × 1 + n/8 × 2 + n/16 × 3 + ...
       ≈ n × (1/4 + 2/8 + 3/16 + ...)
       = n × O(1)
       = O(n)
```

**空间复杂度**：O(1)（原地排序）

---

## 堆排序的特点

### 优点

| 优点 | 说明 |
|-----|------|
| **时间稳定** | 最好、最坏、平均都是O(n log n) |
| **原地排序** | 空间O(1) |
| **无递归版本** | 可避免栈溢出 |

### 缺点

| 缺点 | 说明 |
|-----|------|
| **不稳定** | 相等元素顺序可能改变 |
| **缓存不友好** | 访问不连续，缓存命中率低 |
| **实际性能** | 常数因子比快排大 |

---

## 堆排序 vs 快速排序

| 对比项 | 堆排序 | 快速排序 |
|-------|--------|---------|
| 平均时间 | O(n log n) | O(n log n) |
| 最坏时间 | O(n log n) | O(n²) |
| 空间 | O(1) | O(log n) |
| 稳定性 | 不稳定 | 不稳定 |
| 实际性能 | 较慢 | 更快（缓存友好）|
| 适用场景 | 需要最坏保证 | 一般情况 |

---

## 实际应用

### 1. Top K问题

```typescript
function topK(arr: number[], k: number): number[] {
  // 建立大小为k的最小堆
  const minHeap: number[] = arr.slice(0, k);
  buildMinHeap(minHeap);
  
  for (let i = k; i < arr.length; i++) {
    if (arr[i] > minHeap[0]) {
      minHeap[0] = arr[i];
      heapifyMin(minHeap, k, 0);
    }
  }
  
  return minHeap;
}
```

### 2. 优先队列

```typescript
class PriorityQueue {
  private heap: number[] = [];
  
  push(val: number): void {
    this.heap.push(val);
    this.bubbleUp(this.heap.length - 1);
  }
  
  pop(): number {
    const top = this.heap[0];
    const last = this.heap.pop()!;
    if (this.heap.length > 0) {
      this.heap[0] = last;
      this.bubbleDown(0);
    }
    return top;
  }
  
  private bubbleUp(i: number): void {
    while (i > 0) {
      const parent = Math.floor((i - 1) / 2);
      if (this.heap[parent] >= this.heap[i]) break;
      [this.heap[parent], this.heap[i]] = [this.heap[i], this.heap[parent]];
      i = parent;
    }
  }
  
  private bubbleDown(i: number): void {
    // 同heapify
  }
}
```

---

## 常见错误

**错误1：建堆起始位置错误**
```typescript
// 错误：从0开始
for (let i = 0; i < n / 2; i++) { ... }  // ❌

// 正确：从最后一个非叶子节点开始，向前遍历
for (let i = Math.floor(n / 2) - 1; i >= 0; i--) { ... }  // ✅
```

**错误2：heapify边界错误**
```typescript
// 错误：没有检查边界
if (arr[left] > arr[largest]) { ... }  // ❌ left可能越界

// 正确
if (left < n && arr[left] > arr[largest]) { ... }  // ✅
```

**错误3：排序时堆大小未更新**
```typescript
// 错误：每次都用n
heapify(arr, n, 0);  // ❌ 应该用i

// 正确：堆大小逐渐减小
heapify(arr, i, 0);  // ✅
```

---

## 相关题目

| 题目 | 难度 | 说明 |
|-----|------|------|
| [215. 数组中第K大元素](https://leetcode.com/problems/kth-largest-element/) | 中等 | 堆的经典应用 |
| [347. 前K个高频元素](https://leetcode.com/problems/top-k-frequent-elements/) | 中等 | 堆+哈希 |
| [295. 数据流的中位数](https://leetcode.com/problems/find-median-from-data-stream/) | 困难 | 双堆 |

---

## 总结

堆排序的核心要点：

1. **堆结构**：完全二叉树，数组表示
2. **两阶段**：建堆O(n) + 排序O(n log n)
3. **核心操作**：heapify下沉调整
4. **索引关系**：parent=(i-1)/2, left=2i+1, right=2i+2
5. **适用场景**：需要最坏时间保证，或用于优先队列
3. **原地排序**：空间O(1)
4. **不稳定**：长距离交换
