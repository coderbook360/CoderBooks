# 实战：冒泡排序实现与优化

冒泡排序是最简单的排序算法，虽然效率不高，但理解它能帮助我们掌握排序的基本思想。

---

## 算法思想

**核心**：相邻元素比较，大的"冒泡"到后面。

**过程**：
1. 从头开始，比较相邻两个元素
2. 如果前面的大，就交换
3. 一轮下来，最大元素到达末尾
4. 重复 n-1 轮

**动画演示** (以 [5,3,8,4,2] 为例)：
```
第1轮：[5,3,8,4,2]
     → [3,5,8,4,2]  交换5和3
     → [3,5,8,4,2]  8不动
     → [3,5,4,8,2]  交换8和4
     → [3,5,4,2,8]  交换8和2  ← 8到位

第2轮：[3,5,4,2 | 8]
     → [3,5,4,2 | 8]  3不动
     → [3,4,5,2 | 8]  交换5和4
     → [3,4,2,5 | 8]  交换5和2  ← 5到位
     
第3轮：[3,4,2 | 5,8]
     → [3,4,2 | 5,8]  3不动
     → [3,2,4 | 5,8]  交换4和2  ← 4到位
     
第4轮：[3,2 | 4,5,8]
     → [2,3 | 4,5,8]  交换3和2  ← 完成
```

---

## 基础实现

```typescript
function bubbleSort(arr: number[]): void {
  const n = arr.length;
  
  for (let i = 0; i < n - 1; i++) {
    for (let j = 0; j < n - 1 - i; j++) {
      if (arr[j] > arr[j + 1]) {
        [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
      }
    }
  }
}
```

---

## 优化一：提前终止

如果某轮没有发生交换，说明已经有序。

```typescript
function bubbleSortOptimized(arr: number[]): void {
  const n = arr.length;
  
  for (let i = 0; i < n - 1; i++) {
    let swapped = false;
    
    for (let j = 0; j < n - 1 - i; j++) {
      if (arr[j] > arr[j + 1]) {
        [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
        swapped = true;
      }
    }
    
    if (!swapped) break;  // 优化：提前终止
  }
}
```

**效果**：
- 最好情况（已排序）：O(n)
- 平均/最坏情况：仍是 O(n²)

---

## 优化二：记录最后交换位置

```typescript
function bubbleSortOptimized2(arr: number[]): void {
  let n = arr.length;
  
  while (n > 1) {
    let lastSwap = 0;
    
    for (let j = 0; j < n - 1; j++) {
      if (arr[j] > arr[j + 1]) {
        [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
        lastSwap = j + 1;
      }
    }
    
    n = lastSwap;  // 优化：缩小范围
    if (n === 0) break;
  }
}
```

**思想**：最后一次交换的位置之后，肯定已经有序。

---

## 优化三：双向冒泡（鸡尾酒排序）

```typescript
function cocktailSort(arr: number[]): void {
  let left = 0;
  let right = arr.length - 1;
  
  while (left < right) {
    // 从左到右，大的向右冒泡
    let newRight = left;
    for (let i = left; i < right; i++) {
      if (arr[i] > arr[i + 1]) {
        [arr[i], arr[i + 1]] = [arr[i + 1], arr[i]];
        newRight = i;
      }
    }
    right = newRight;
    
    if (left >= right) break;
    
    // 从右到左，小的向左冒泡
    let newLeft = right;
    for (let i = right; i > left; i--) {
      if (arr[i] < arr[i - 1]) {
        [arr[i], arr[i - 1]] = [arr[i - 1], arr[i]];
        newLeft = i;
      }
    }
    left = newLeft;
  }
}
```

**优势**：处理"乌龟和兔子"问题（小元素在末尾移动慢）。

---

## 复杂度分析

| 实现 | 最好 | 平均 | 最坏 | 空间 |
|-----|------|------|------|------|
| **基础** | O(n²) | O(n²) | O(n²) | O(1) |
| **优化1** | O(n) | O(n²) | O(n²) | O(1) |
| **优化2** | O(n) | O(n²) | O(n²) | O(1) |
| **鸡尾酒** | O(n) | O(n²) | O(n²) | O(1) |

**稳定性**：**稳定**（相同元素不交换）

---

## 冒泡排序的实际价值

**为什么学习冒泡排序？**

1. **教学价值**：理解排序的基本思想
2. **面试必考**：展示编程基础
3. **启发思考**：优化技巧（提前终止、缩小范围）

**什么时候用？**

实话说，**几乎不用**。
- 数据量小 → 插入排序更快
- 数据量大 → 快排/归并更快

**唯一优势**：
- 实现极其简单
- 最好情况 O(n)（已排序数据）

---

## 相关 LeetCode 题目

虽然LeetCode没有直接考冒泡排序的题，但以下题目可以用冒泡思想：

1. **LeetCode 75. 颜色分类** — 只有3种元素，可以用类似冒泡的思想
2. **LeetCode 283. 移动零** — 将0"冒泡"到末尾

---

## 延伸：奇偶排序网络

冒泡排序的并行版本：

```typescript
function oddEvenSort(arr: number[]): void {
  const n = arr.length;
  let sorted = false;
  
  while (!sorted) {
    sorted = true;
    
    // 奇数位置比较
    for (let i = 1; i < n - 1; i += 2) {
      if (arr[i] > arr[i + 1]) {
        [arr[i], arr[i + 1]] = [arr[i + 1], arr[i]];
        sorted = false;
      }
    }
    
    // 偶数位置比较
    for (let i = 0; i < n - 1; i += 2) {
      if (arr[i] > arr[i + 1]) {
        [arr[i], arr[i + 1]] = [arr[i + 1], arr[i]];
        sorted = false;
      }
    }
  }
}
```

---

## 关键要点

1. **核心思想**：相邻比较，大的后移
2. **优化技巧**：
   - 提前终止（已排序）
   - 缩小范围（记录最后交换位置）
   - 双向冒泡（鸡尾酒排序）
3. **时间复杂度**：O(n²)，优化后最好O(n)
4. **稳定性**：稳定
5. **实际价值**：教学意义大于实用价值
