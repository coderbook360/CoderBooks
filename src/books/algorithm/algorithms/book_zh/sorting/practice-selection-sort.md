# 实战：选择排序实现

选择排序是最直观的排序算法之一：每轮从未排序部分选出最小元素，放到已排序部分的末尾。

---

## 算法思想

选择排序的核心思想可以用三步概括：

1. **选择**：从未排序部分找出最小（或最大）元素
2. **交换**：将其放到已排序部分的末尾
3. **重复**：对剩余未排序部分重复此过程

### 执行过程可视化

```
原数组：[64, 25, 12, 22, 11]

第1轮：从[64,25,12,22,11]中找最小=11
       交换11和64 → [11, 25, 12, 22, 64]
       已排序：[11] | 未排序：[25,12,22,64]

第2轮：从[25,12,22,64]中找最小=12
       交换12和25 → [11, 12, 25, 22, 64]
       已排序：[11,12] | 未排序：[25,22,64]

第3轮：从[25,22,64]中找最小=22
       交换22和25 → [11, 12, 22, 25, 64]
       已排序：[11,12,22] | 未排序：[25,64]

第4轮：从[25,64]中找最小=25
       25已在正确位置，无需交换
       已排序：[11,12,22,25] | 未排序：[64]

结果：[11, 12, 22, 25, 64] ✓
```

---

## 代码实现

```typescript
function selectionSort(arr: number[]): void {
  const n = arr.length;
  
  for (let i = 0; i < n - 1; i++) {
    // 假设当前位置就是最小值
    let minIndex = i;
    
    // 在未排序部分[i+1, n-1]找真正的最小值
    for (let j = i + 1; j < n; j++) {
      if (arr[j] < arr[minIndex]) {
        minIndex = j;
      }
    }
    
    // 只有找到更小的才交换
    if (minIndex !== i) {
      [arr[i], arr[minIndex]] = [arr[minIndex], arr[i]];
    }
  }
}
```

### 代码逻辑解析

**外层循环 `i`**：表示当前要确定的位置

- `i = 0`：确定最小的元素放在位置0
- `i = 1`：确定第2小的元素放在位置1
- ...以此类推

**内层循环 `j`**：在未排序部分`[i+1, n-1]`寻找最小值

**为什么 `i < n-1`**：最后一个元素不需要处理，因为前n-1个都排好后，最后一个自然就是最大的

---

## 为什么选择排序不稳定？

选择排序是**不稳定排序**。看这个反例：

```
原数组：[5a, 5b, 3]（5a和5b值相同，a和b表示原始顺序）

第1轮：找最小=3，交换3和5a
       → [3, 5b, 5a]
       
结果：5a原本在5b前面，现在5a跑到5b后面了！
      相等元素的相对顺序被破坏 → 不稳定
```

**不稳定的根因**：选择排序进行"长距离交换"，跨越了中间的元素。

---

## 交换次数分析：选择排序的隐藏优势

虽然选择排序时间复杂度固定O(n²)，但它有一个隐藏优势：**交换次数最少**。

**对比各排序算法的交换次数**：

- **选择排序**：最多n-1次交换（每轮最多1次）
- **冒泡排序**：最坏O(n²)次交换
- **插入排序**：最坏O(n²)次移动

**适用场景**：当交换代价远大于比较代价时

```typescript
// 场景：交换大对象（内存拷贝开销大）
interface HeavyObject {
  data: number[];  // 假设这是一个很大的数组
  key: number;
}

function selectionSortHeavy(arr: HeavyObject[]): void {
  const n = arr.length;
  
  for (let i = 0; i < n - 1; i++) {
    let minIndex = i;
    
    for (let j = i + 1; j < n; j++) {
      // 比较只访问key，代价小
      if (arr[j].key < arr[minIndex].key) {
        minIndex = j;
      }
    }
    
    // 交换整个对象，代价大，但次数少
    if (minIndex !== i) {
      [arr[i], arr[minIndex]] = [arr[minIndex], arr[i]];
    }
  }
}
```
```

---

## 优化：双向选择排序

普通选择排序每轮只选一个最小值。双向选择排序同时选出最小和最大，将迭代次数减半：

```typescript
function selectionSortBidirectional(arr: number[]): void {
  let left = 0;
  let right = arr.length - 1;
  
  while (left < right) {
    let minIndex = left;
    let maxIndex = left;
    
    // 同时找最小和最大
    for (let i = left; i <= right; i++) {
      if (arr[i] < arr[minIndex]) minIndex = i;
      if (arr[i] > arr[maxIndex]) maxIndex = i;
    }
    
    // 先交换最小值到left
    [arr[left], arr[minIndex]] = [arr[minIndex], arr[left]];
    
    // 注意：如果最大值恰好在left位置，交换后它跑到了minIndex
    if (maxIndex === left) {
      maxIndex = minIndex;
    }
    
    // 再交换最大值到right
    [arr[right], arr[maxIndex]] = [arr[maxIndex], arr[right]];
    
    left++;
    right--;
  }
}
```

### 双向选择的陷阱

上面代码中的 `if (maxIndex === left)` 判断是关键：

```
例：[4, 1, 2, 3]
第1轮：left=0, right=3
       找到 minIndex=1 (值1), maxIndex=0 (值4)
       
       先交换：arr[0] ↔ arr[1]
       → [1, 4, 2, 3]
       
       此时最大值4已经从位置0移动到位置1（即minIndex）
       所以需要更新 maxIndex = minIndex = 1
       
       再交换：arr[3] ↔ arr[1]
       → [1, 3, 2, 4]
```

**如果忘记这个判断**，会把错误的元素放到right位置！

---

## 复杂度分析

**时间复杂度**：

- **最好情况**：O(n²) — 即使数组已排序，仍需扫描所有元素
- **平均情况**：O(n²)
- **最坏情况**：O(n²)

选择排序的时间复杂度在所有情况下都是O(n²)，无法提前终止。

**空间复杂度**：O(1)，原地排序

**比较次数**：精确为 n(n-1)/2 次

**交换次数**：最多 n-1 次

---

## 与其他O(n²)排序的对比

| 特性 | 选择排序 | 冒泡排序 | 插入排序 |
|------|---------|---------|---------|
| 最好时间 | O(n²) | O(n) | O(n) |
| 最坏时间 | O(n²) | O(n²) | O(n²) |
| 交换次数 | O(n) | O(n²) | O(n²) |
| 稳定性 | ❌ | ✅ | ✅ |
| 适应性 | ❌ | ✅ | ✅ |

**选择排序的独特价值**：

1. **最少交换**：当写入代价高时（如Flash存储），选择排序是更好的选择
2. **实现简单**：代码短小，不易出错
3. **性能可预测**：无论输入如何，时间固定

---

## 常见错误

### 错误1：内层循环起点错误

```typescript
// ❌ 错误：重复比较已排序元素
for (let j = 0; j < n; j++) {
  if (arr[j] < arr[minIndex]) minIndex = j;
}

// ✅ 正确：只在未排序部分查找
for (let j = i + 1; j < n; j++) {
  if (arr[j] < arr[minIndex]) minIndex = j;
}
```

### 错误2：无条件交换

```typescript
// ❌ 无意义的自交换
[arr[i], arr[minIndex]] = [arr[minIndex], arr[i]];

// ✅ 只有发现更小的才交换
if (minIndex !== i) {
  [arr[i], arr[minIndex]] = [arr[minIndex], arr[i]];
}
```

### 错误3：双向选择时忘记更新maxIndex

如前文所述，必须处理最大值恰好在left位置的情况。

---

## 关键要点

1. **核心思想**：选择最小，放到前面
2. **交换最少**：每轮最多交换一次，适合写入代价高的场景
3. **不稳定**：长距离交换破坏相等元素的相对顺序
4. **无优化空间**：时间固定O(n²)，无法利用输入特性加速
5. **双向优化**：同时选最大最小，迭代次数减半（但比较次数不变）
