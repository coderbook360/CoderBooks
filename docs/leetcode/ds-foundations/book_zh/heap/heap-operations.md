# 堆的插入、删除与建堆

本节实现堆的核心操作：插入、删除和从数组建堆。

---

## 插入操作

新元素加到数组末尾，然后向上调整（siftUp）：

```javascript
class MinHeap {
  // ... 基础方法
  
  insert(val) {
    this.heap.push(val);
    this.siftUp(this.heap.length - 1);
  }
  
  siftUp(i) {
    while (i > 0) {
      const p = this.parent(i);
      if (this.heap[p] <= this.heap[i]) break;
      this.swap(i, p);
      i = p;
    }
  }
}
```

过程演示：

```
插入 2 到最小堆 [3, 5, 4, 8, 7]

1. 加到末尾：[3, 5, 4, 8, 7, 2]
2. 2 < 4，交换：[3, 5, 2, 8, 7, 4]
3. 2 < 3，交换：[2, 5, 3, 8, 7, 4]
```

时间复杂度：O(log n)

---

## 删除堆顶

把最后一个元素移到堆顶，然后向下调整（siftDown）：

```javascript
class MinHeap {
  // ... 基础方法
  
  extract() {
    if (this.heap.length === 0) return undefined;
    if (this.heap.length === 1) return this.heap.pop();
    
    const min = this.heap[0];
    this.heap[0] = this.heap.pop();
    this.siftDown(0);
    return min;
  }
  
  siftDown(i) {
    const n = this.heap.length;
    
    while (this.left(i) < n) {
      let smallest = i;
      const l = this.left(i);
      const r = this.right(i);
      
      if (this.heap[l] < this.heap[smallest]) {
        smallest = l;
      }
      if (r < n && this.heap[r] < this.heap[smallest]) {
        smallest = r;
      }
      
      if (smallest === i) break;
      
      this.swap(i, smallest);
      i = smallest;
    }
  }
}
```

过程演示：

```
删除堆顶 [2, 5, 3, 8, 7, 4]

1. 用4替换2：[4, 5, 3, 8, 7]
2. 比较 4, 5, 3，3最小，交换：[3, 5, 4, 8, 7]
3. 4 已是叶子，结束
```

时间复杂度：O(log n)

---

## 建堆

从无序数组建堆，有两种方式：

### 方式一：逐个插入

```javascript
function buildHeap1(arr) {
  const heap = new MinHeap();
  for (const val of arr) {
    heap.insert(val);
  }
  return heap;
}
```

时间复杂度：O(n log n)

### 方式二：原地建堆（推荐）

从最后一个非叶子节点开始，依次向下调整：

```javascript
function buildHeap(arr) {
  const heap = new MinHeap();
  heap.heap = [...arr];
  
  // 从最后一个非叶子节点开始
  const start = Math.floor(arr.length / 2) - 1;
  for (let i = start; i >= 0; i--) {
    heap.siftDown(i);
  }
  
  return heap;
}
```

时间复杂度：O(n)

为什么是 O(n)？因为大部分节点在底层，调整距离很短。

---

## 完整实现

```javascript
class MinHeap {
  constructor(arr = []) {
    this.heap = [...arr];
    this.heapify();
  }
  
  heapify() {
    const start = Math.floor(this.heap.length / 2) - 1;
    for (let i = start; i >= 0; i--) {
      this.siftDown(i);
    }
  }
  
  parent(i) { return Math.floor((i - 1) / 2); }
  left(i) { return 2 * i + 1; }
  right(i) { return 2 * i + 2; }
  
  swap(i, j) {
    [this.heap[i], this.heap[j]] = [this.heap[j], this.heap[i]];
  }
  
  peek() { return this.heap[0]; }
  size() { return this.heap.length; }
  
  insert(val) {
    this.heap.push(val);
    this.siftUp(this.heap.length - 1);
  }
  
  siftUp(i) {
    while (i > 0 && this.heap[this.parent(i)] > this.heap[i]) {
      this.swap(i, this.parent(i));
      i = this.parent(i);
    }
  }
  
  extract() {
    if (this.size() === 0) return undefined;
    if (this.size() === 1) return this.heap.pop();
    
    const min = this.heap[0];
    this.heap[0] = this.heap.pop();
    this.siftDown(0);
    return min;
  }
  
  siftDown(i) {
    const n = this.size();
    while (this.left(i) < n) {
      let smallest = i;
      const l = this.left(i), r = this.right(i);
      
      if (this.heap[l] < this.heap[smallest]) smallest = l;
      if (r < n && this.heap[r] < this.heap[smallest]) smallest = r;
      if (smallest === i) break;
      
      this.swap(i, smallest);
      i = smallest;
    }
  }
}
```
