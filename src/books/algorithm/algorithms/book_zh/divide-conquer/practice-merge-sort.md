# 实战：归并排序

> LeetCode 912. 排序数组（归并排序解法）| 难度：中等

归并排序是分治思想的经典应用，也是理解分治算法的最佳入门案例。它优雅地展示了"分解-解决-合并"的三步骤范式。

📎 [LeetCode 912. 排序数组](https://leetcode.cn/problems/sort-an-array/)

---

## 算法核心思想

**分治三步骤**：

1. **分解（Divide）**：将数组从中间分成两半
2. **解决（Conquer）**：递归地对两半分别排序
3. **合并（Combine）**：将两个有序数组合并成一个有序数组

**关键洞察**：合并两个有序数组的时间复杂度是 O(n)，这是归并排序高效的根本原因。

---

## 算法可视化

```
原始数组：[38, 27, 43, 3, 9, 82, 10]

====== 分解阶段 ======
                 [38, 27, 43, 3, 9, 82, 10]
                          ↓ 分解
            [38, 27, 43, 3]      [9, 82, 10]
                 ↓                    ↓
         [38, 27]  [43, 3]      [9, 82]  [10]
            ↓         ↓            ↓        ↓
        [38] [27]  [43] [3]    [9] [82]   [10]

====== 合并阶段 ======
        [38] [27]  [43] [3]    [9] [82]   [10]
            ↓         ↓            ↓        ↓
         [27, 38]  [3, 43]      [9, 82]  [10]
                 ↓                    ↓
            [3, 27, 38, 43]      [9, 10, 82]
                          ↓ 合并
                 [3, 9, 10, 27, 38, 43, 82]
```

---

## 代码实现：简洁版

```typescript
function mergeSort(arr: number[]): number[] {
  // 递归终止条件：数组长度为 0 或 1，已经有序
  if (arr.length <= 1) return arr;
  
  // 分解：找中点，分成两半
  const mid = Math.floor(arr.length / 2);
  const left = mergeSort(arr.slice(0, mid));   // 递归排序左半
  const right = mergeSort(arr.slice(mid));     // 递归排序右半
  
  // 合并：将两个有序数组合并
  return merge(left, right);
}

function merge(left: number[], right: number[]): number[] {
  const result: number[] = [];
  let i = 0, j = 0;
  
  // 双指针合并
  while (i < left.length && j < right.length) {
    if (left[i] <= right[j]) {
      result.push(left[i++]);
    } else {
      result.push(right[j++]);
    }
  }
  
  // 处理剩余元素
  return result.concat(left.slice(i), right.slice(j));
}
```

### 合并过程详解

```
合并 [27, 38] 和 [3, 43]：

初始: left = [27, 38], right = [3, 43]
      i = 0, j = 0

比较 left[0]=27 和 right[0]=3: 3 < 27
  → result = [3], j = 1

比较 left[0]=27 和 right[1]=43: 27 < 43
  → result = [3, 27], i = 1

比较 left[1]=38 和 right[1]=43: 38 < 43
  → result = [3, 27, 38], i = 2

左边用完，追加右边剩余
  → result = [3, 27, 38, 43]
```

---

## 代码实现：原地排序版

简洁版每次递归都创建新数组，空间开销大。原地版本使用一个临时数组，避免频繁分配。

```typescript
function mergeSortInPlace(arr: number[]): void {
  const temp = new Array(arr.length);  // 只分配一次
  
  function sort(left: number, right: number): void {
    if (left >= right) return;  // 只有一个元素或为空
    
    const mid = Math.floor((left + right) / 2);
    sort(left, mid);      // 排序左半部分
    sort(mid + 1, right); // 排序右半部分
    merge(left, mid, right);
  }
  
  function merge(left: number, mid: number, right: number): void {
    // 1. 将待合并区域复制到临时数组
    for (let i = left; i <= right; i++) {
      temp[i] = arr[i];
    }
    
    // 2. 双指针合并回原数组
    let i = left;     // 左半部分起点
    let j = mid + 1;  // 右半部分起点
    let k = left;     // 原数组写入位置
    
    while (i <= mid && j <= right) {
      if (temp[i] <= temp[j]) {
        arr[k++] = temp[i++];
      } else {
        arr[k++] = temp[j++];
      }
    }
    
    // 3. 处理剩余元素（只需处理左半部分，右半部分本就在原位）
    while (i <= mid) arr[k++] = temp[i++];
    while (j <= right) arr[k++] = temp[j++];
  }
  
  sort(0, arr.length - 1);
}
```

### 为什么只处理左半部分剩余？

当右半部分已经用完时，右边的元素本来就在原数组的正确位置。但左半部分的剩余元素在 `temp` 中，需要复制回来。

---

## 复杂度分析

### 时间复杂度：O(n log n)

**递推关系**：T(n) = 2T(n/2) + O(n)

- 每次分成两个子问题，规模减半
- 合并需要 O(n) 时间
- 递归深度 log n，每层总工作量 O(n)

```
         n           → O(n) 合并
       /   \
    n/2    n/2       → O(n/2) + O(n/2) = O(n) 合并
   / \     / \
 n/4 n/4 n/4 n/4     → O(n) 合并
  ...
```

总时间：log n 层 × O(n) = **O(n log n)**

### 空间复杂度：O(n)

- 临时数组：O(n)
- 递归栈：O(log n)
- 总计：O(n)

---

## 归并排序的特性

### 优点

1. **时间稳定**：最好、最坏、平均都是 O(n log n)
2. **稳定排序**：相等元素的相对顺序不变（因为用 `<=` 比较）
3. **适合链表**：不需要随机访问，合并链表是 O(1) 空间
4. **适合外部排序**：大数据量时，可以分块排序再合并

### 缺点

1. **需要额外空间**：O(n)，不是原地排序
2. **缓存不友好**：相比快速排序，数据访问局部性差

---

## 与快速排序的对比

| 特性 | 归并排序 | 快速排序 |
|-----|---------|---------|
| 时间复杂度 | 稳定 O(n log n) | 平均 O(n log n)，最坏 O(n²) |
| 空间复杂度 | O(n) | O(log n) |
| 稳定性 | 稳定 | 不稳定 |
| 工作顺序 | 先递归，后合并 | 先分区，后递归 |
| 适用场景 | 链表、外部排序 | 数组、内存排序 |

**有趣的观察**：
- 归并排序是"自底向上"的思想：先解决小问题，再合并
- 快速排序是"自顶向下"的思想：先分区，再递归处理

---

## 应用场景

### 1. 外部排序

当数据量超过内存时，归并排序是首选：
- 将数据分成多个可以放入内存的块
- 分别排序每个块
- 多路归并合并成最终结果

### 2. 链表排序

链表归并排序是 O(1) 额外空间（不需要临时数组）：

```typescript
function sortList(head: ListNode | null): ListNode | null {
  if (!head || !head.next) return head;
  
  // 快慢指针找中点
  let slow = head, fast = head.next;
  while (fast && fast.next) {
    slow = slow.next!;
    fast = fast.next.next;
  }
  
  const mid = slow.next;
  slow.next = null;  // 断开
  
  const left = sortList(head);
  const right = sortList(mid);
  
  return mergeLists(left, right);
}
```

### 3. 求逆序对

归并排序过程中可以顺便统计逆序对数量（LeetCode 剑指 Offer 51）。

---

## 常见错误

### 错误1：合并时忘记处理剩余元素

```typescript
// ❌ 错误：可能丢失元素
while (i < left.length && j < right.length) {
  // ...
}
// 忘记追加 left.slice(i) 和 right.slice(j)
```

### 错误2：原地版本边界错误

```typescript
// ❌ 错误：mid 应该属于左半部分
sort(left, mid - 1);  // 应该是 sort(left, mid)
sort(mid, right);     // 应该是 sort(mid + 1, right)
```

---

## 相关题目

- LeetCode 148. 排序链表（链表归并排序）
- LeetCode 剑指 Offer 51. 数组中的逆序对
- LeetCode 315. 计算右侧小于当前元素的个数
- LeetCode 493. 翻转对

---

## 总结

归并排序完美诠释了分治思想：

1. **分解**：将问题一分为二
2. **递归**：假设子问题已解决
3. **合并**：将子问题的解组合成原问题的解

它的稳定 O(n log n) 时间复杂度和稳定排序特性，使其在很多场景下成为首选。理解归并排序，是掌握分治算法的关键一步。
