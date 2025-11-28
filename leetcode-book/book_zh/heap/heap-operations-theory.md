# 堆的插入与删除操作

上一章我们认识了堆的基本概念，现在让我们动手实现一个完整的堆。通过亲手编写代码，你会对堆的工作原理有更深刻的理解。

## 完整的最小堆实现

让我们从零构建一个最小堆类：

```javascript
class MinHeap {
    constructor() {
        this.heap = [];
    }
    
    // 获取父节点索引
    getParentIndex(i) {
        return Math.floor((i - 1) / 2);
    }
    
    // 获取左子节点索引
    getLeftChildIndex(i) {
        return 2 * i + 1;
    }
    
    // 获取右子节点索引
    getRightChildIndex(i) {
        return 2 * i + 2;
    }
    
    // 交换两个元素
    swap(i, j) {
        [this.heap[i], this.heap[j]] = [this.heap[j], this.heap[i]];
    }
    
    // 获取堆的大小
    size() {
        return this.heap.length;
    }
    
    // 判断堆是否为空
    isEmpty() {
        return this.heap.length === 0;
    }
    
    // 查看堆顶元素
    peek() {
        return this.heap[0];
    }
}
```

这是堆的骨架，接下来实现核心的插入和删除操作。

## 插入操作：上浮（Sift Up）

插入元素的策略很直观：
1. 将新元素添加到数组末尾（保持完全二叉树结构）
2. 新元素可能违反堆序性，需要"上浮"到正确位置

```javascript
// 上浮操作
siftUp(index) {
    while (index > 0) {
        const parentIndex = this.getParentIndex(index);
        
        // 如果当前节点 >= 父节点，满足最小堆性质，停止
        if (this.heap[index] >= this.heap[parentIndex]) {
            break;
        }
        
        // 否则交换，继续上浮
        this.swap(index, parentIndex);
        index = parentIndex;
    }
}

// 插入元素
push(val) {
    this.heap.push(val);           // 添加到末尾
    this.siftUp(this.heap.length - 1);  // 上浮到正确位置
}
```

让我们追踪一个插入过程。假设当前堆是 `[1, 3, 2, 7, 4, 5, 6]`，插入元素 0：

```
初始状态：[1, 3, 2, 7, 4, 5, 6]

        1
       / \
      3   2
     / \ / \
    7  4 5  6

步骤1：添加到末尾 [1, 3, 2, 7, 4, 5, 6, 0]
        1
       / \
      3   2
     / \ / \
    7  4 5  6
   /
  0   <- 新元素在这里

步骤2：0 < 7，上浮 [1, 3, 2, 0, 4, 5, 6, 7]
        1
       / \
      3   2
     / \ / \
    0  4 5  6    <- 0和7交换了
   /
  7

步骤3：0 < 3，继续上浮 [1, 0, 2, 3, 4, 5, 6, 7]
        1
       / \
      0   2      <- 0和3交换了
     / \ / \
    3  4 5  6
   /
  7

步骤4：0 < 1，继续上浮 [0, 1, 2, 3, 4, 5, 6, 7]
        0        <- 0成为新的根节点
       / \
      1   2
     / \ / \
    3  4 5  6
   /
  7

完成！新元素0一路上浮到了根节点
```

## 删除堆顶：下沉（Sift Down）

删除堆顶的策略同样优雅：
1. 用数组最后一个元素替换堆顶
2. 移除最后一个元素（保持完全二叉树结构）
3. 新堆顶可能违反堆序性，需要"下沉"到正确位置

```javascript
// 下沉操作
siftDown(index) {
    const n = this.heap.length;
    
    while (true) {
        let smallest = index;
        const leftIndex = this.getLeftChildIndex(index);
        const rightIndex = this.getRightChildIndex(index);
        
        // 找出当前节点与其子节点中的最小值
        if (leftIndex < n && this.heap[leftIndex] < this.heap[smallest]) {
            smallest = leftIndex;
        }
        if (rightIndex < n && this.heap[rightIndex] < this.heap[smallest]) {
            smallest = rightIndex;
        }
        
        // 如果当前节点已经最小，停止
        if (smallest === index) {
            break;
        }
        
        // 与最小的子节点交换，继续下沉
        this.swap(index, smallest);
        index = smallest;
    }
}

// 弹出堆顶元素
pop() {
    if (this.isEmpty()) {
        return undefined;
    }
    
    const top = this.heap[0];
    const last = this.heap.pop();
    
    if (!this.isEmpty()) {
        this.heap[0] = last;  // 用最后元素替换堆顶
        this.siftDown(0);      // 下沉到正确位置
    }
    
    return top;
}
```

追踪删除过程。从 `[0, 1, 2, 3, 4, 5, 6, 7]` 删除堆顶：

```
初始状态：[0, 1, 2, 3, 4, 5, 6, 7]

        0
       / \
      1   2
     / \ / \
    3  4 5  6
   /
  7

步骤1：用最后元素7替换堆顶 [7, 1, 2, 3, 4, 5, 6]

        7        <- 7现在在堆顶
       / \
      1   2
     / \ / \
    3  4 5  6

步骤2：7与子节点1、2比较，1最小，交换 [1, 7, 2, 3, 4, 5, 6]

        1
       / \
      7   2      <- 7下沉了一层
     / \ / \
    3  4 5  6

步骤3：7与子节点3、4比较，3最小，交换 [1, 3, 2, 7, 4, 5, 6]

        1
       / \
      3   2
     / \ / \
    7  4 5  6    <- 7继续下沉

步骤4：7没有子节点了，停止

最终结果：[1, 3, 2, 7, 4, 5, 6]
```

## 高效建堆：Heapify

如果我们有一个无序数组，如何将它转换成堆？

**朴素方法**：逐个插入，时间复杂度 O(n log n)。

**高效方法**（Heapify）：从最后一个非叶子节点开始，依次对每个节点执行下沉操作。

```javascript
// 从数组构建堆
static heapify(arr) {
    const heap = new MinHeap();
    heap.heap = [...arr];
    
    // 从最后一个非叶子节点开始，向前遍历
    const lastNonLeaf = Math.floor((arr.length - 2) / 2);
    
    for (let i = lastNonLeaf; i >= 0; i--) {
        heap.siftDown(i);
    }
    
    return heap;
}
```

为什么从后往前？因为下沉操作要求子树已经是堆，从后往前能保证这一点。

为什么时间复杂度是 O(n)？这是一个有趣的数学分析：
- 最底层节点不需要下沉
- 倒数第二层最多下沉 1 次
- 倒数第三层最多下沉 2 次
- ...

总操作次数约为 n/2×0 + n/4×1 + n/8×2 + ... = O(n)。

## 带比较器的堆

在实际应用中，我们经常需要对复杂对象排序。通过传入比较器，可以让堆支持任意排序规则：

```javascript
class HeapWithComparator {
    constructor(comparator = (a, b) => a - b) {
        this.heap = [];
        this.comparator = comparator;
    }
    
    // 判断是否需要交换（返回true表示a应该在b之前）
    shouldSwap(parentIndex, childIndex) {
        return this.comparator(this.heap[childIndex], this.heap[parentIndex]) < 0;
    }
    
    siftUp(index) {
        while (index > 0) {
            const parentIndex = Math.floor((index - 1) / 2);
            if (!this.shouldSwap(parentIndex, index)) break;
            this.swap(index, parentIndex);
            index = parentIndex;
        }
    }
    
    siftDown(index) {
        const n = this.heap.length;
        
        while (true) {
            let target = index;
            const left = 2 * index + 1;
            const right = 2 * index + 2;
            
            if (left < n && this.shouldSwap(target, left)) {
                target = left;
            }
            if (right < n && this.shouldSwap(target, right)) {
                target = right;
            }
            
            if (target === index) break;
            this.swap(index, target);
            index = target;
        }
    }
    
    swap(i, j) {
        [this.heap[i], this.heap[j]] = [this.heap[j], this.heap[i]];
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
}
```

使用示例：

```javascript
// 最大堆
const maxHeap = new HeapWithComparator((a, b) => b - a);

// 按对象属性排序的堆
const taskHeap = new HeapWithComparator((a, b) => a.priority - b.priority);
taskHeap.push({ name: 'task1', priority: 3 });
taskHeap.push({ name: 'task2', priority: 1 });
taskHeap.push({ name: 'task3', priority: 2 });

console.log(taskHeap.pop()); // { name: 'task2', priority: 1 }
```

## 堆排序

利用堆可以实现一个 O(n log n) 的排序算法：

```javascript
function heapSort(arr) {
    // 1. 建堆 O(n)
    const heap = MinHeap.heapify(arr);
    
    // 2. 依次取出堆顶 O(n log n)
    const sorted = [];
    while (!heap.isEmpty()) {
        sorted.push(heap.pop());
    }
    
    return sorted;
}
```

堆排序的特点：
- 时间复杂度：O(n log n)，稳定
- 空间复杂度：O(1)（原地排序版本）
- 不稳定排序

## 完整代码汇总

```javascript
class MinHeap {
    constructor() {
        this.heap = [];
    }
    
    getParentIndex(i) {
        return Math.floor((i - 1) / 2);
    }
    
    getLeftChildIndex(i) {
        return 2 * i + 1;
    }
    
    getRightChildIndex(i) {
        return 2 * i + 2;
    }
    
    swap(i, j) {
        [this.heap[i], this.heap[j]] = [this.heap[j], this.heap[i]];
    }
    
    siftUp(index) {
        while (index > 0) {
            const parentIndex = this.getParentIndex(index);
            if (this.heap[index] >= this.heap[parentIndex]) break;
            this.swap(index, parentIndex);
            index = parentIndex;
        }
    }
    
    siftDown(index) {
        const n = this.heap.length;
        while (true) {
            let smallest = index;
            const left = this.getLeftChildIndex(index);
            const right = this.getRightChildIndex(index);
            
            if (left < n && this.heap[left] < this.heap[smallest]) {
                smallest = left;
            }
            if (right < n && this.heap[right] < this.heap[smallest]) {
                smallest = right;
            }
            
            if (smallest === index) break;
            this.swap(index, smallest);
            index = smallest;
        }
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
    
    isEmpty() {
        return this.heap.length === 0;
    }
    
    static heapify(arr) {
        const heap = new MinHeap();
        heap.heap = [...arr];
        const lastNonLeaf = Math.floor((arr.length - 2) / 2);
        for (let i = lastNonLeaf; i >= 0; i--) {
            heap.siftDown(i);
        }
        return heap;
    }
}
```

## 小结

这一章我们完整实现了堆的核心操作：

- **插入（push）**：添加到末尾 + 上浮，O(log n)
- **删除堆顶（pop）**：替换堆顶 + 下沉，O(log n)
- **建堆（heapify）**：从后往前下沉，O(n)
- **带比较器的堆**：支持自定义排序规则

掌握了堆的实现，接下来我们将通过一系列经典的 LeetCode 题目，学习堆在实战中的应用技巧。第一道题就是经典的 Top K 问题：数组中的第 K 个最大元素。
