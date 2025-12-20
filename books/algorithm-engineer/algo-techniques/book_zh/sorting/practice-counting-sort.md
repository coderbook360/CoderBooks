# 实战：计数排序实现

计数排序是一种非比较排序算法，通过统计每个值出现的次数来实现线性时间排序。

---

## 核心思想

计数排序的三个阶段：

1. **统计阶段**：统计每个值出现的次数
2. **累加阶段**：计算每个值的最终位置
3. **输出阶段**：按位置放置元素

### 可视化过程

```
原始数组: [4, 2, 2, 8, 3, 3, 1]
数据范围: 1-8

步骤1: 统计次数
index:  0  1  2  3  4  5  6  7  8
count: [0, 1, 2, 2, 1, 0, 0, 0, 1]
         ↑1个 ↑2个 ↑2个 ↑1个       ↑1个

步骤2: 累加（确定位置）
count: [0, 1, 3, 5, 6, 6, 6, 6, 7]
         ↑  ↑  ↑  ↑  ↑
         |  |  |  |  └ 4应该在位置5（索引5）
         |  |  |  └ 3应该在位置3-4
         |  |  └ 2应该在位置1-2
         |  └ 1应该在位置0
         └ 0没有

步骤3: 从后向前放置（保持稳定性）
输出: [1, 2, 2, 3, 3, 4, 8]
```

---

## 代码实现

### 基础版本

```typescript
function countingSort(arr: number[]): number[] {
  if (arr.length === 0) return [];
  
  const min = Math.min(...arr);
  const max = Math.max(...arr);
  const range = max - min + 1;
  
  // 1. 统计每个值的出现次数
  const count = new Array(range).fill(0);
  for (const num of arr) {
    count[num - min]++;
  }
  
  // 2. 累加次数（确定每个值的最终位置）
  for (let i = 1; i < range; i++) {
    count[i] += count[i - 1];
  }
  
  // 3. 从后向前遍历原数组，放置到正确位置
  const output = new Array(arr.length);
  for (let i = arr.length - 1; i >= 0; i--) {
    const num = arr[i];
    const index = count[num - min] - 1;
    output[index] = num;
    count[num - min]--;
  }
  
  return output;
}
```

### 简化版本（只需要排序结果）

```typescript
function countingSortSimple(arr: number[]): number[] {
  if (arr.length === 0) return [];
  
  const min = Math.min(...arr);
  const max = Math.max(...arr);
  
  // 统计次数
  const count = new Array(max - min + 1).fill(0);
  for (const num of arr) {
    count[num - min]++;
  }
  
  // 直接展开
  const result: number[] = [];
  for (let i = 0; i < count.length; i++) {
    for (let j = 0; j < count[i]; j++) {
      result.push(i + min);
    }
  }
  
  return result;
}
```

---

## 为什么要从后向前遍历？

从后向前遍历是保证**稳定性**的关键：

```
原数组: [(2,A), (2,B), (1,C)]  // 相同值带标记

统计后 count: [1, 3]  // 1有1个，2有2个
累加后 count: [1, 3]  // 1的位置是0，2的位置是1-2

从后向前放置:
1. (1,C) → 位置0, count[0]=0
2. (2,B) → 位置2, count[1]=2
3. (2,A) → 位置1, count[1]=1

结果: [(1,C), (2,A), (2,B)]
       ↑ 稳定：A在B前面，保持原序
```

如果从前向后：
```
从前向后放置:
1. (2,A) → 位置2, count[1]=2
2. (2,B) → 位置1, count[1]=1
3. (1,C) → 位置0, count[0]=0

结果: [(1,C), (2,B), (2,A)]
       ↑ 不稳定：B在A前面，顺序颠倒
```

---

## 复杂度分析

**时间复杂度**：O(n + k)
- 统计：O(n)
- 累加：O(k)
- 输出：O(n)
- k = 数据范围（max - min + 1）

**空间复杂度**：O(k)
- 计数数组的大小

**稳定性**：**稳定**（从后向前遍历时）

---

## 适用场景分析

### 适合使用计数排序

| 场景 | 原因 |
|------|------|
| 数据范围较小 | k ≈ n时，O(n+k) ≈ O(n) |
| 非负整数 | 天然适用 |
| 需要稳定排序 | 计数排序天然稳定 |
| 作为基数排序的子过程 | 每位数范围0-9 |

### 不适合使用

| 场景 | 原因 |
|------|------|
| 数据范围极大 | 如0到10^9，需要10^9空间 |
| 浮点数 | 无法直接计数 |
| 负数（需处理） | 需要偏移转换 |

---

## 处理负数

```typescript
function countingSortWithNegative(arr: number[]): number[] {
  if (arr.length === 0) return [];
  
  const min = Math.min(...arr);
  const max = Math.max(...arr);
  
  // 使用偏移量处理负数
  const offset = -min;  // 将最小值映射到0
  const range = max - min + 1;
  
  const count = new Array(range).fill(0);
  for (const num of arr) {
    count[num + offset]++;
  }
  
  const result: number[] = [];
  for (let i = 0; i < range; i++) {
    for (let j = 0; j < count[i]; j++) {
      result.push(i - offset);  // 还原真实值
    }
  }
  
  return result;
}
```

---

## 实际应用

### 1. 成绩排名

```typescript
function rankScores(scores: number[]): Map<number, number> {
  // 分数0-100，计数排序后确定排名
  const count = new Array(101).fill(0);
  for (const score of scores) {
    count[score]++;
  }
  
  // 累加确定排名（从高到低）
  const rank = new Map<number, number>();
  let currentRank = 1;
  for (let score = 100; score >= 0; score--) {
    if (count[score] > 0) {
      rank.set(score, currentRank);
      currentRank += count[score];
    }
  }
  
  return rank;
}
```

### 2. 字符频率统计

```typescript
function sortByFrequency(s: string): string {
  const count = new Array(128).fill(0);
  for (const c of s) {
    count[c.charCodeAt(0)]++;
  }
  
  // 按频率排序
  const chars: [string, number][] = [];
  for (let i = 0; i < 128; i++) {
    if (count[i] > 0) {
      chars.push([String.fromCharCode(i), count[i]]);
    }
  }
  
  chars.sort((a, b) => b[1] - a[1]);
  
  return chars.map(([c, n]) => c.repeat(n)).join('');
}
```

---

## 计数排序 vs 其他排序

| 对比项 | 计数排序 | 快速排序 | 归并排序 |
|-------|---------|---------|---------|
| 时间复杂度 | O(n+k) | O(n log n) | O(n log n) |
| 空间复杂度 | O(k) | O(log n) | O(n) |
| 稳定性 | 稳定 | 不稳定 | 稳定 |
| 适用数据 | 整数，范围小 | 通用 | 通用 |

---

## 常见错误

**错误1：忘记处理偏移量**
```typescript
// 错误：负数或非0起始会出问题
count[num]++;  // ❌ 如果num < 0，越界

// 正确
count[num - min]++;  // ✅
```

**错误2：遍历方向错误导致不稳定**
```typescript
// 错误：从前向后，不稳定
for (let i = 0; i < arr.length; i++) { ... }  // ❌

// 正确：从后向前，稳定
for (let i = arr.length - 1; i >= 0; i--) { ... }  // ✅
```

**错误3：输出位置计算错误**
```typescript
// 错误：先递减再使用
count[num - min]--;
const index = count[num - min];  // ❌ 位置偏移

// 正确：先计算位置再递减
const index = count[num - min] - 1;
count[num - min]--;  // ✅
```

---

## 总结

计数排序的核心要点：

1. **非比较排序**：通过统计次数实现O(n)排序
2. **适用条件**：整数，数据范围k ≈ n
3. **稳定性**：从后向前遍历保证稳定
4. **空间换时间**：需要O(k)额外空间
5. **关键应用**：作为基数排序的子过程

计数排序展示了"非比较排序"的核心思想：利用数据的特性（整数、范围有限）突破O(n log n)的下界。

## 关键要点

1. **非比较排序**：突破O(n log n)
2. **范围限制**：k不能太大
3. **稳定排序**：倒序遍历保证稳定性
4. **空间代价**：需要O(k)额外空间
