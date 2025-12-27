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
/**
 * 堆排序主函数 - 原地排序算法
 * 
 * 核心思想：
 * 1. 建堆阶段：将无序数组构建成最大堆，堆顶是最大元素
 * 2. 排序阶段：不断将堆顶（最大值）与末尾交换，缩小堆范围，重建堆
 * 
 * 为什么使用最大堆而不是最小堆？
 * - 最大堆可以快速找到最大值（堆顶）
 * - 将最大值放到数组末尾，然后缩小堆的范围
 * - 这样排序后数组是升序的，且是原地操作
 * 
 * 时间复杂度：O(n log n) - 建堆O(n) + n次下沉操作O(n log n)
 * 空间复杂度：O(1) - 原地排序，不需要额外空间
 */
function heapSort(arr: number[]): void {
  const n = arr.length;
  
  // ========================================
  // 阶段1：建堆（Build Max Heap）
  // ========================================
  // 从最后一个非叶子节点开始，自底向上建堆
  // 
  // 为什么从 n/2 - 1 开始？
  // - 完全二叉树中，叶子节点占一半（索引 n/2 到 n-1）
  // - 叶子节点天然满足堆性质（没有子节点）
  // - 所以只需要从最后一个非叶子节点开始调整
  // - 最后一个非叶子节点 = 最后一个叶子节点的父节点 = (n-1-1)/2 = n/2 - 1
  for (let i = Math.floor(n / 2) - 1; i >= 0; i--) {
    heapify(arr, n, i);
  }
  // 建堆完成后，arr[0] 是最大值
  
  // ========================================
  // 阶段2：排序（Sort by extracting max）
  // ========================================
  // 核心操作：每次将堆顶（最大值）与当前未排序部分的最后一个元素交换
  // 然后缩小堆的范围，对新的堆顶进行下沉调整
  for (let i = n - 1; i > 0; i--) {
    // 步骤A：交换堆顶和末尾
    // arr[0] 是当前堆中的最大值
    // 将它放到位置 i（当前未排序部分的末尾）
    // 这样最大值就"沉底"了，占据了它的最终位置
    [arr[0], arr[i]] = [arr[i], arr[0]];
    
    // 步骤B：重建堆
    // 交换后 arr[0] 可能不满足堆性质
    // 对 arr[0..i-1] 这个缩小后的堆执行下沉调整
    // 注意：i 既是交换位置，也是新堆的大小
    heapify(arr, i, 0);
  }
  // 排序完成，数组升序排列
}

/**
 * 下沉调整（Heapify Down / Sift Down）
 * 确保以索引 i 为根的子树满足最大堆性质
 * 
 * @param arr - 待调整的数组
 * @param n - 堆的有效大小（只考虑 arr[0..n-1]）
 * @param i - 需要下沉调整的节点索引
 * 
 * 工作原理：
 * 1. 比较当前节点与其左右子节点
 * 2. 如果某个子节点更大，与最大的子节点交换
 * 3. 递归调整被交换的子树
 * 4. 直到当前节点比所有子节点都大，或到达叶子节点
 */
function heapify(arr: number[], n: number, i: number): void {
  let largest = i;       // 假设当前节点最大，稍后会验证
  const left = 2 * i + 1;   // 左子节点索引（完全二叉树性质）
  const right = 2 * i + 2;  // 右子节点索引
  
  // 比较左子节点：
  // left < n 确保左子节点存在（在堆的有效范围内）
  // arr[left] > arr[largest] 检查左子节点是否更大
  if (left < n && arr[left] > arr[largest]) {
    largest = left;  // 更新最大值索引为左子节点
  }
  
  // 比较右子节点：
  // right < n 确保右子节点存在
  // arr[right] > arr[largest] 检查右子节点是否比当前最大值更大
  if (right < n && arr[right] > arr[largest]) {
    largest = right;  // 更新最大值索引为右子节点
  }
  
  // 如果最大值不是当前节点，需要交换并继续下沉
  if (largest !== i) {
    // 交换当前节点与最大子节点
    [arr[i], arr[largest]] = [arr[largest], arr[i]];
    
    // 递归调整被影响的子树
    // 因为我们把较小的值换到了 largest 位置
    // 这个位置可能不再满足堆性质，需要继续下沉
    heapify(arr, n, largest);
  }
  // 如果 largest === i，说明当前节点已经比所有子节点大，无需调整
}
```

### 迭代版本的heapify

```typescript
/**
 * 下沉调整的迭代实现
 * 
 * 与递归版本等价，但避免了函数调用开销
 * 对于大数据量或栈空间受限的场景更适用
 * 
 * 工作原理：
 * 用 while 循环代替递归，不断将当前节点与更大的子节点交换
 * 直到当前节点比所有子节点都大，或到达叶子节点
 */
function heapifyIterative(arr: number[], n: number, i: number): void {
  // 不断下沉，直到满足堆性质
  while (true) {
    let largest = i;  // 当前考察的节点
    const left = 2 * i + 1;   // 左子节点
    const right = 2 * i + 2;  // 右子节点
    
    // 找出当前节点、左子节点、右子节点中的最大值
    if (left < n && arr[left] > arr[largest]) {
      largest = left;
    }
    if (right < n && arr[right] > arr[largest]) {
      largest = right;
    }
    
    // 如果当前节点已经是最大的，堆性质满足，退出循环
    if (largest === i) break;
    
    // 否则，交换当前节点与最大子节点
    [arr[i], arr[largest]] = [arr[largest], arr[i]];
    
    // 更新 i 为被交换的子节点位置，继续检查
    // 这相当于递归调用 heapify(arr, n, largest)
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
