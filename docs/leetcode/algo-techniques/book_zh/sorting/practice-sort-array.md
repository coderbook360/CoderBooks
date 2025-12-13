# 实战：排序数组

> LeetCode 912. 排序数组 | 难度：中等

这道题是对排序算法的综合考察，要求实现一个时间复杂度为 O(n log n) 的排序。

---

## 题目要求

给定整数数组 `nums`，将其升序排列并返回。

**约束条件**：
- `1 <= nums.length <= 5 * 10^4`
- `-5 * 10^4 <= nums[i] <= 5 * 10^4`
- 要求时间复杂度 O(n log n)

**示例**：
```
输入：nums = [5,2,3,1]
输出：[1,2,3,5]

输入：nums = [5,1,1,2,0,0]
输出：[0,0,1,1,2,5]
```

---

## 解法选择分析

**为什么O(n²)算法不行？**

LeetCode测试用例包含大量数据（5万个元素），O(n²)算法会超时：
- 5万² = 25亿次操作
- 假设每秒1亿次操作，需要25秒

**可选的O(n log n)算法**：

1. **快速排序**：平均O(n log n)，但最坏O(n²)需要优化
2. **归并排序**：稳定O(n log n)，但需要O(n)额外空间
3. **堆排序**：稳定O(n log n)，O(1)空间，但常数较大
4. **计数/基数排序**：O(n)，但仅适用于特定数据范围

---

## 解法一：快速排序（随机化）

普通快排最坏O(n²)会超时（如全相同元素、已排序），必须优化：

```typescript
function sortArray(nums: number[]): number[] {
  quickSort(nums, 0, nums.length - 1);
  return nums;
}

function quickSort(arr: number[], left: number, right: number): void {
  if (left >= right) return;
  
  // 三路快排处理重复元素
  const [lt, gt] = partition3Way(arr, left, right);
  quickSort(arr, left, lt - 1);
  quickSort(arr, gt + 1, right);
}

function partition3Way(
  arr: number[], 
  left: number, 
  right: number
): [number, number] {
  // 随机选择pivot避免最坏情况
  const randIdx = left + Math.floor(Math.random() * (right - left + 1));
  [arr[left], arr[randIdx]] = [arr[randIdx], arr[left]];
  
  const pivot = arr[left];
  let lt = left;     // arr[left+1..lt] < pivot
  let gt = right + 1; // arr[gt..right] > pivot
  let i = left + 1;   // arr[lt+1..i) == pivot
  
  while (i < gt) {
    if (arr[i] < pivot) {
      lt++;
      [arr[lt], arr[i]] = [arr[i], arr[lt]];
      i++;
    } else if (arr[i] > pivot) {
      gt--;
      [arr[gt], arr[i]] = [arr[i], arr[gt]];
      // i不动，因为交换过来的元素还需要检查
    } else {
      i++;
    }
  }
  
  [arr[left], arr[lt]] = [arr[lt], arr[left]];
  
  return [lt, gt - 1];
}
```

### 为什么使用三路快排？

当数组有大量重复元素时，普通快排退化：

```
[1, 1, 1, 1, 1, 1, 1, 1]

普通快排每次分区只排除一个元素 → O(n²)

三路快排将所有等于pivot的元素一次性放到中间 → O(n)
```

### 执行过程示例

```
nums = [3, 1, 2, 3, 3, 5, 4]
随机选pivot = 3

三路分区后：
[1, 2] [3, 3, 3] [5, 4]
  < 3     = 3      > 3

递归左边 [1, 2]
递归右边 [5, 4]
中间 [3, 3, 3] 不用处理

最终：[1, 2, 3, 3, 3, 4, 5]
```
```

---

## 解法二：堆排序

堆排序是另一个O(n log n)且空间O(1)的选择：

```typescript
function sortArray(nums: number[]): number[] {
  heapSort(nums);
  return nums;
}

function heapSort(arr: number[]): void {
  const n = arr.length;
  
  // 建堆：从最后一个非叶节点开始下沉
  for (let i = Math.floor(n / 2) - 1; i >= 0; i--) {
    heapify(arr, n, i);
  }
  
  // 排序：依次取出堆顶（最大值）放到末尾
  for (let i = n - 1; i > 0; i--) {
    [arr[0], arr[i]] = [arr[i], arr[0]];  // 堆顶与末尾交换
    heapify(arr, i, 0);                    // 维护堆性质
  }
}

function heapify(arr: number[], heapSize: number, i: number): void {
  let largest = i;
  const left = 2 * i + 1;
  const right = 2 * i + 2;
  
  if (left < heapSize && arr[left] > arr[largest]) {
    largest = left;
  }
  if (right < heapSize && arr[right] > arr[largest]) {
    largest = right;
  }
  
  if (largest !== i) {
    [arr[i], arr[largest]] = [arr[largest], arr[i]];
    heapify(arr, heapSize, largest);
  }
}
```

### 堆排序的优缺点

**优点**：
- 最坏情况也是 O(n log n)
- 空间 O(1)，纯原地排序

**缺点**：
- 常数因子大（缓存不友好，频繁跳跃访问）
- 不稳定排序

---

## 解法三：归并排序

归并排序是稳定的 O(n log n) 算法：

```typescript
function sortArray(nums: number[]): number[] {
  const temp = new Array(nums.length);  // 预分配避免重复创建
  mergeSort(nums, temp, 0, nums.length - 1);
  return nums;
}

function mergeSort(
  arr: number[], 
  temp: number[], 
  left: number, 
  right: number
): void {
  if (left >= right) return;
  
  const mid = Math.floor((left + right) / 2);
  mergeSort(arr, temp, left, mid);
  mergeSort(arr, temp, mid + 1, right);
  merge(arr, temp, left, mid, right);
}

function merge(
  arr: number[], 
  temp: number[], 
  left: number, 
  mid: number, 
  right: number
): void {
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
  
  while (i <= mid) arr[k++] = temp[i++];
  while (j <= right) arr[k++] = temp[j++];
}
```

### 归并排序的优化

1. **小数组用插入排序**：
```typescript
if (right - left < 15) {
  insertionSort(arr, left, right);
  return;
}
```

2. **已有序跳过合并**：
```typescript
if (arr[mid] <= arr[mid + 1]) return;  // 左右已有序
```

---

## 解法四：计数排序（特定场景）

当值域有限时（如本题 -5万 到 5万），可以用计数排序：

```typescript
function sortArray(nums: number[]): number[] {
  const OFFSET = 50000;  // 将[-50000, 50000]映射到[0, 100000]
  const count = new Array(100001).fill(0);
  
  // 计数
  for (const num of nums) {
    count[num + OFFSET]++;
  }
  
  // 回填
  let idx = 0;
  for (let i = 0; i < count.length; i++) {
    while (count[i] > 0) {
      nums[idx++] = i - OFFSET;
      count[i]--;
    }
  }
  
  return nums;
}
```

**复杂度**：O(n + k)，其中 k 是值域大小

**适用场景**：值域远小于数组长度时效率最高

---

## 性能对比（LeetCode实测）

| 算法 | 时间 | 说明 |
|------|------|------|
| 计数排序 | ~40ms | 值域有限时最快 |
| 库函数 | ~50ms | 底层优化好 |
| 三路快排 | ~70ms | 处理重复元素佳 |
| 归并排序 | ~90ms | 稳定但空间大 |
| 堆排序 | ~120ms | 缓存不友好 |

---

## 常见错误

### 错误1：快排没有随机化

```typescript
// ❌ 固定选第一个或最后一个作为pivot
const pivot = arr[left];  // 或 arr[right]

// 遇到已排序/逆序数组会O(n²)超时

// ✅ 随机选择pivot
const randIdx = left + Math.floor(Math.random() * (right - left + 1));
```

### 错误2：快排没处理重复元素

```typescript
// ❌ 普通双路快排
// 遇到大量重复元素会O(n²)

// ✅ 使用三路快排
```

### 错误3：归并排序每次创建新数组

```typescript
// ❌ 性能差，大量内存分配
function merge(...) {
  const left = arr.slice(l, m + 1);  // 每次创建新数组
  const right = arr.slice(m + 1, r + 1);
}

// ✅ 预分配临时数组
const temp = new Array(n);
function merge(..., temp, ...) {
  // 复用temp
}
```

---

## 如何选择排序算法？

**面试建议**：

| 场景 | 推荐算法 | 理由 |
|------|---------|------|
| 展示算法功底 | 快排/堆排序 | 考察递归和数据结构 |
| 追求稳定性 | 归并排序 | O(n log n)稳定 |
| 值域有限 | 计数排序 | O(n)最快 |
| 实际工程 | 库函数 | 工业级优化 |

**库函数使用**：
```typescript
function sortArray(nums: number[]): number[] {
  return nums.sort((a, b) => a - b);
}
```

JavaScript的`sort`底层是Tim Sort（插入+归并），经过大量工程优化。

---

## 关键要点

1. **O(n log n)算法选择**：快排、归并、堆排序都可以
2. **快排必须优化**：随机化pivot + 三路快排处理重复
3. **归并排序**：稳定但需要O(n)额外空间
4. **堆排序**：空间O(1)但常数大
5. **计数排序**：值域有限时O(n)最优
6. **实际应用**：优先使用语言内置排序
