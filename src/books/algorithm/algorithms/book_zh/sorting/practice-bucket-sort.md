# 实战：桶排序实现

桶排序是一种非比较排序算法，通过将元素分配到多个桶中实现高效排序。

---

## 核心思想

桶排序的三个阶段：

1. **分配阶段**：将数据分配到多个桶中
2. **排序阶段**：每个桶内部单独排序
3. **收集阶段**：合并所有桶得到有序结果

### 可视化过程

```
原始数据: [0.42, 0.32, 0.33, 0.52, 0.37, 0.47, 0.51]

分配到桶（按首位小数）:
桶0 (0.0-0.2): []
桶1 (0.2-0.4): [0.32, 0.33, 0.37]
桶2 (0.4-0.6): [0.42, 0.52, 0.47, 0.51]

桶内排序:
桶1: [0.32, 0.33, 0.37]
桶2: [0.42, 0.47, 0.51, 0.52]

合并结果: [0.32, 0.33, 0.37, 0.42, 0.47, 0.51, 0.52]
```

---

## 代码实现

### 基础版本

```typescript
function bucketSort(arr: number[], bucketSize: number = 5): number[] {
  if (arr.length === 0) return [];
  
  const min = Math.min(...arr);
  const max = Math.max(...arr);
  
  // 1. 创建桶
  const bucketCount = Math.floor((max - min) / bucketSize) + 1;
  const buckets: number[][] = Array.from(
    { length: bucketCount },
    () => []
  );
  
  // 2. 分配到桶
  for (const num of arr) {
    const bucketIndex = Math.floor((num - min) / bucketSize);
    buckets[bucketIndex].push(num);
  }
  
  // 3. 每个桶内部排序并合并
  const result: number[] = [];
  for (const bucket of buckets) {
    bucket.sort((a, b) => a - b);  // 可用插入排序优化
    result.push(...bucket);
  }
  
  return result;
}
```

### 浮点数版本（[0, 1)范围）

```typescript
function bucketSortFloat(arr: number[], bucketCount: number = 10): number[] {
  if (arr.length === 0) return [];
  
  // 创建bucketCount个桶
  const buckets: number[][] = Array.from(
    { length: bucketCount },
    () => []
  );
  
  // 分配到桶（假设数据在[0, 1)范围）
  for (const num of arr) {
    const index = Math.floor(num * bucketCount);
    // 处理边界情况（num === 1）
    buckets[Math.min(index, bucketCount - 1)].push(num);
  }
  
  // 桶内用插入排序（小数组高效）
  const result: number[] = [];
  for (const bucket of buckets) {
    insertionSort(bucket);
    result.push(...bucket);
  }
  
  return result;
}

function insertionSort(arr: number[]): void {
  for (let i = 1; i < arr.length; i++) {
    const key = arr[i];
    let j = i - 1;
    while (j >= 0 && arr[j] > key) {
      arr[j + 1] = arr[j];
      j--;
    }
    arr[j + 1] = key;
  }
}
```

---

## 桶数量的选择

桶数量对性能影响巨大：

| 桶数量 | 效果 | 适用场景 |
|-------|------|---------|
| **太少** | 每个桶元素多，桶内排序慢 | - |
| **太多** | 空间浪费，分配开销大 | - |
| **√n** | 理论最优 | 均匀分布数据 |
| **n** | 每个桶约1个元素 | 数据范围较小 |

```typescript
// 推荐的桶数量计算
const bucketCount = Math.ceil(Math.sqrt(arr.length));
```

---

## 复杂度分析

**时间复杂度**：
- **最好**：O(n)（数据均匀分布，每个桶O(1)个元素）
- **平均**：O(n + n²/k + k) ≈ O(n)（k个桶）
- **最坏**：O(n²)（所有元素都在一个桶）

**空间复杂度**：O(n + k)
- n个元素的额外存储
- k个桶的空间

**稳定性**：**稳定**（如果桶内排序使用稳定算法）

---

## 适用场景

### 适合使用桶排序

1. **数据分布均匀**
   ```
   例：[0.23, 0.45, 0.67, 0.12, 0.89]
   每个桶分配均匀
   ```

2. **浮点数排序**
   - 计数排序不适用
   - 桶排序是首选

3. **外部排序**
   - 数据量大，无法全部载入内存
   - 分成多个桶，分批处理

### 不适合使用

1. **数据分布极不均匀**
   ```
   例：[1, 2, 3, 1000000]
   大部分桶为空，一个桶包含大量元素
   ```

2. **整数且范围较小**
   - 计数排序更高效

---

## 桶排序 vs 其他排序

| 对比项 | 桶排序 | 计数排序 | 基数排序 |
|-------|--------|---------|---------|
| 数据类型 | 任意 | 整数 | 整数/字符串 |
| 时间复杂度 | O(n+k) | O(n+k) | O(d×(n+k)) |
| 数据分布 | 需均匀 | 范围要小 | 无要求 |
| 稳定性 | 稳定 | 稳定 | 稳定 |

---

## 实际应用

### 1. 成绩分段统计

```typescript
function gradeDistribution(scores: number[]): Map<string, number[]> {
  const buckets = new Map<string, number[]>([
    ['A (90-100)', []],
    ['B (80-89)', []],
    ['C (70-79)', []],
    ['D (60-69)', []],
    ['F (0-59)', []]
  ]);
  
  for (const score of scores) {
    if (score >= 90) buckets.get('A (90-100)')!.push(score);
    else if (score >= 80) buckets.get('B (80-89)')!.push(score);
    else if (score >= 70) buckets.get('C (70-79)')!.push(score);
    else if (score >= 60) buckets.get('D (60-69)')!.push(score);
    else buckets.get('F (0-59)')!.push(score);
  }
  
  return buckets;
}
```

### 2. Top K 问题优化

```typescript
function topKElements(arr: number[], k: number): number[] {
  // 使用桶排序找前K大元素
  const sorted = bucketSort(arr);
  return sorted.slice(-k).reverse();
}
```

---

## 常见错误

**错误1：桶索引越界**
```typescript
// 错误：没有处理边界值
const index = Math.floor((num - min) / bucketSize);
// 当num === max时，可能越界

// 正确
const index = Math.min(
  Math.floor((num - min) / bucketSize),
  bucketCount - 1
);
```

**错误2：空桶处理**
```typescript
// 正确处理空桶
for (const bucket of buckets) {
  if (bucket.length > 0) {
    bucket.sort((a, b) => a - b);
    result.push(...bucket);
  }
}
```

---

## 总结

桶排序的核心要点：

1. **分而治之**：将问题分解为小规模子问题
2. **均匀分布是关键**：数据分布决定性能
3. **桶内排序**：可选用任何排序算法
4. **非比较排序**：突破O(n log n)下界
5. **最佳实践**：
   - 桶数量选择√n
   - 桶内用插入排序
   - 适用于浮点数和均匀分布数据

## 关键要点

1. **分治思想**：分桶后各自排序
2. **性能依赖分布**：均匀分布最优
3. **桶大小选择**：影响性能
4. **实际应用**：外部排序、分布式排序
