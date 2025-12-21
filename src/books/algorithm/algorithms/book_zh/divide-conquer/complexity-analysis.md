# 分治算法的时间复杂度分析

分治算法的性能如何？这个问题的答案藏在递归关系式里。掌握主定理（Master Theorem），就能快速判断分治算法的效率。

---

## 递归关系式

分治算法的时间复杂度通常表示为递归关系式：

```
T(n) = aT(n/b) + f(n)
```

参数含义：
- `a`：子问题个数（分成几份）
- `b`：子问题规模缩小的倍数（每份多大）
- `f(n)`：分解和合并的代价

---

## 主定理（Master Theorem）

对于 `T(n) = aT(n/b) + f(n)`，设 `c = log_b(a)`：

### 情况1：子问题主导

```
若 f(n) = O(n^d), d < c
则 T(n) = Θ(n^c)
```

**含义**：递归树的叶子节点计算量占主导

**示例**：Strassen 矩阵乘法
```
T(n) = 7T(n/2) + O(n²)
c = log_2(7) ≈ 2.81
d = 2 < 2.81
→ T(n) = Θ(n^2.81)
```

### 情况2：平衡

```
若 f(n) = Θ(n^c log^k n)
则 T(n) = Θ(n^c log^(k+1) n)
```

**含义**：每一层的计算量相当

**示例**：归并排序
```
T(n) = 2T(n/2) + Θ(n)
c = log_2(2) = 1
f(n) = Θ(n) = Θ(n^1 log^0 n)
→ T(n) = Θ(n log n)
```

### 情况3：合并主导

```
若 f(n) = Ω(n^d), d > c
且 af(n/b) ≤ kf(n) 对某个 k < 1 成立
则 T(n) = Θ(f(n))
```

**含义**：合并操作占主导

**示例**：构造问题
```
T(n) = 2T(n/2) + Θ(n²)
c = log_2(2) = 1
d = 2 > 1
→ T(n) = Θ(n²)
```

---

## 经典算法分析

### 二分查找

```
T(n) = T(n/2) + O(1)

a = 1, b = 2, c = log_2(1) = 0
f(n) = O(1) = O(n^0)

情况2：T(n) = Θ(log n)
```

### 归并排序

```
T(n) = 2T(n/2) + O(n)

a = 2, b = 2, c = log_2(2) = 1
f(n) = O(n) = O(n^1)

情况2：T(n) = Θ(n log n)
```

### 快速排序（平均情况）

```
T(n) = 2T(n/2) + O(n)

与归并排序相同：Θ(n log n)

最坏情况：T(n) = T(n-1) + O(n) = O(n²)
```

### 二叉树遍历

```
T(n) = 2T(n/2) + O(1)

a = 2, b = 2, c = log_2(2) = 1
f(n) = O(1) = O(n^0), 0 < 1

情况1：T(n) = Θ(n)
```

### Karatsuba 大数乘法

```
传统：O(n²)

Karatsuba：T(n) = 3T(n/2) + O(n)
a = 3, b = 2, c = log_2(3) ≈ 1.58
f(n) = O(n) = O(n^1), 1 < 1.58

情况1：T(n) = Θ(n^1.58)
```

---

## 递归树方法

当主定理不适用时，可以用递归树直接计算。

### 示例：快速幂

```
T(n) = T(n/2) + O(1)

递归树：
           T(n)              ← O(1)
            |
         T(n/2)             ← O(1)
            |
         T(n/4)             ← O(1)
            ...
            1               ← O(1)

层数：log n
每层：O(1)
总计：O(log n)
```

### 示例：归并排序

```
T(n) = 2T(n/2) + O(n)

递归树：
           T(n)                      ← O(n)
          /    \
      T(n/2)  T(n/2)                ← 2 × O(n/2) = O(n)
       / \      / \
    T(n/4) T(n/4) T(n/4) T(n/4)    ← 4 × O(n/4) = O(n)
            ...

层数：log n
每层：O(n)
总计：O(n log n)
```

---

## 替换法（Substitution Method）

猜测答案，然后用数学归纳法证明。

### 示例：证明 T(n) = 2T(n/2) + n 是 O(n log n)

**猜测**：T(n) ≤ cn log n

**证明**：
```
T(n) = 2T(n/2) + n
     ≤ 2 × c(n/2)log(n/2) + n
     = cn log(n/2) + n
     = cn(log n - 1) + n
     = cn log n - cn + n
     = cn log n - (c-1)n

若 c ≥ 1，则 (c-1)n ≥ 0
因此 T(n) ≤ cn log n
```

---

## 空间复杂度分析

分治算法的空间复杂度主要来自递归调用栈。

### 递归深度

```
T(n) = aT(n/b) + ...

递归深度 = log_b(n)
空间复杂度 = O(log_b(n))
```

**示例**：
- 归并排序：O(log n) 栈空间 + O(n) 临时数组
- 快速排序：O(log n) 栈空间（平均），O(n) 最坏
- 二分查找：O(log n) 栈空间

### 尾递归优化

可以改写成迭代，消除栈空间：

```typescript
// 递归版本：O(log n) 空间
function binarySearch(arr: number[], target: number): number {
  function search(left: number, right: number): number {
    if (left > right) return -1;
    const mid = Math.floor((left + right) / 2);
    if (arr[mid] === target) return mid;
    if (arr[mid] < target) return search(mid + 1, right);
    return search(left, mid - 1);
  }
  return search(0, arr.length - 1);
}

// 迭代版本：O(1) 空间
function binarySearchIterative(arr: number[], target: number): number {
  let left = 0, right = arr.length - 1;
  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    if (arr[mid] === target) return mid;
    if (arr[mid] < target) left = mid + 1;
    else right = mid - 1;
  }
  return -1;
}
```

---

## 本章小结

**主定理三种情况**：
1. 子问题主导：`T(n) = Θ(n^(log_b a))`
2. 平衡：`T(n) = Θ(n^c log n)`
3. 合并主导：`T(n) = Θ(f(n))`

**常见复杂度**：
- 二分查找：O(log n)
- 归并/快速排序：O(n log n)
- 二叉树遍历：O(n)

**分析方法**：
1. 主定理（最常用）
2. 递归树（直观）
3. 替换法（严格证明）

掌握这些方法，就能快速判断分治算法的效率。
