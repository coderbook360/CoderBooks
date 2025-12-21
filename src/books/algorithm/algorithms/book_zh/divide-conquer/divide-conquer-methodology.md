# 分治算法方法论

分治（Divide and Conquer）不是一个具体的算法，而是一种**解决问题的思想**：把大问题分解成小问题，解决小问题，再合并结果。

---

## 分治的三个步骤

**Divide**（分解）：将原问题分解为若干个规模较小的子问题  
**Conquer**（解决）：递归地解决这些子问题  
**Combine**（合并）：将子问题的解合并成原问题的解

```
function divideAndConquer(problem) {
  // 基本情况：问题足够小，直接解决
  if (problem.size <= threshold) {
    return solveDirect(problem);
  }
  
  // 分解：将问题分成子问题
  const subProblems = divide(problem);
  
  // 递归解决
  const subSolutions = subProblems.map(sub => divideAndConquer(sub));
  
  // 合并
  return combine(subSolutions);
}
```

---

## 经典案例：归并排序

以归并排序为例，看分治三步骤的具体应用：

```typescript
function mergeSort(arr: number[]): number[] {
  // 基本情况：数组长度 <= 1，已有序
  if (arr.length <= 1) return arr;
  
  // 分解：从中间分成两半
  const mid = Math.floor(arr.length / 2);
  const left = arr.slice(0, mid);
  const right = arr.slice(mid);
  
  // 递归解决：分别排序左右两半
  const sortedLeft = mergeSort(left);
  const sortedRight = mergeSort(right);
  
  // 合并：合并两个有序数组
  return merge(sortedLeft, sortedRight);
}

function merge(left: number[], right: number[]): number[] {
  const result: number[] = [];
  let i = 0, j = 0;
  
  while (i < left.length && j < right.length) {
    if (left[i] < right[j]) {
      result.push(left[i++]);
    } else {
      result.push(right[j++]);
    }
  }
  
  return result.concat(left.slice(i)).concat(right.slice(j));
}
```

- **分解**：从中间切分数组
- **解决**：递归排序左右两半
- **合并**：合并两个有序数组

---

## 分治的适用条件

并非所有问题都适合分治，需要满足：

1. **可分解性**：问题可以分解为规模较小的同类型子问题
2. **独立性**：子问题之间相互独立，互不影响
3. **可合并性**：子问题的解可以高效合并成原问题的解
4. **递归终止**：存在可直接求解的最小规模子问题

**反例**：斐波那契数列
```
fib(n) = fib(n-1) + fib(n-2)
```
虽然也是递归，但：
- 子问题不独立（fib(n-1) 和 fib(n-2) 都依赖 fib(n-3)）
- 有大量重叠计算
- 适合用动态规划，不是典型分治

---

## 分治 vs 其他范式

| 范式 | 子问题关系 | 解法 | 典型应用 |
|-----|-----------|------|---------|
| **分治** | 独立不重叠 | 递归分解 | 归并排序、快速排序 |
| **动态规划** | 有重叠 | 保存子问题解 | 背包、最长子序列 |
| **贪心** | 无需分解 | 局部最优 | 活动选择、哈夫曼编码 |
| **回溯** | 需要搜索 | 枚举+剪枝 | N皇后、子集生成 |

---

## 时间复杂度分析：主定理

分治算法的时间复杂度通常符合递归关系式：

```
T(n) = aT(n/b) + f(n)
```

- `a`：子问题个数
- `n/b`：每个子问题的规模
- `f(n)`：分解和合并的代价

**主定理（Master Theorem）**：

设 `c = log_b(a)`：

| 情况 | 条件 | 结果 |
|-----|------|------|
| 1 | `f(n) = O(n^d), d < c` | `T(n) = Θ(n^c)` |
| 2 | `f(n) = Θ(n^c log^k n)` | `T(n) = Θ(n^c log^(k+1) n)` |
| 3 | `f(n) = Ω(n^d), d > c` | `T(n) = Θ(f(n))` |

### 应用示例

#### 归并排序
```
T(n) = 2T(n/2) + O(n)
a=2, b=2, c=log_2(2)=1
f(n) = O(n) = O(n^1)
→ 情况2：T(n) = Θ(n log n)
```

#### 二分查找
```
T(n) = T(n/2) + O(1)
a=1, b=2, c=log_2(1)=0
f(n) = O(1) = O(n^0)
→ 情况2：T(n) = Θ(log n)
```

#### Karatsuba 乘法
```
T(n) = 3T(n/2) + O(n)
a=3, b=2, c=log_2(3)≈1.58
f(n) = O(n) = O(n^1), 1 < 1.58
→ 情况1：T(n) = Θ(n^1.58)
```

---

## 典型分治模式

### 模式一：二分（Binary Split）

每次分成两半：
- **归并排序**：分成两半，递归排序，合并
- **快速排序**：选pivot，分成小于和大于两部分
- **二分查找**：分成左右两半，只需递归一半

### 模式二：减治（Decrease and Conquer）

每次减少固定规模：
- **二分查找**：每次减半
- **欧几里得算法**：每次减去余数

### 模式三：多路分治

分成多个子问题：
- **线段树**：每次分成更小的区间
- **Strassen 矩阵乘法**：将矩阵分成 7 个子问题

---

## 分治的优势与局限

**优势**：
- **并行化**：子问题独立，天然适合并行计算
- **递归结构清晰**：代码简洁优雅
- **渐进最优**：很多分治算法达到理论下界

**局限**：
- **递归开销**：函数调用栈可能很深
- **难以调试**：递归逻辑不如迭代直观
- **缓存不友好**：递归可能导致cache miss

---

## 本章小结

分治算法的核心是"分而治之"：
1. **分解**：把大问题切成小问题
2. **解决**：递归解决小问题
3. **合并**：组合小问题的解

**适用条件**：子问题独立、可合并

**典型应用**：排序（归并、快排）、查找（二分）、矩阵运算、计算几何

下一章，我们将深入学习分治算法的时间复杂度分析方法。
