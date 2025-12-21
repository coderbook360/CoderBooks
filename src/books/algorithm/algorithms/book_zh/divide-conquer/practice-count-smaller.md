# 实战：计算右侧小于当前元素的个数

> LeetCode 315. 计算右侧小于当前元素的个数 | 难度：困难

这道题展示了归并排序的强大扩展应用：在合并过程中统计逆序对。

---

## 问题描述

给定数组 `nums`，对于每个元素 `nums[i]`，计算其右侧有多少个元素小于它。

**示例**：
```
输入：[5, 2, 6, 1]
输出：[2, 1, 1, 0]

解释：
5 右侧有 2, 1 两个小于它  → 2个
2 右侧有 1 一个小于它    → 1个
6 右侧有 1 一个小于它    → 1个
1 右侧没有小于它的      → 0个
```

---

## 暴力思路

```typescript
function countSmaller(nums: number[]): number[] {
  const result: number[] = [];
  
  for (let i = 0; i < nums.length; i++) {
    let count = 0;
    for (let j = i + 1; j < nums.length; j++) {
      if (nums[j] < nums[i]) count++;
    }
    result.push(count);
  }
  
  return result;
}
```

**时间复杂度**：O(n²)，对于大数组会超时。

---

## 分治思路：归并排序计数

核心思想：在归并排序的**合并过程**中统计逆序对。

**关键观察**：
- 当我们合并左右两个有序数组时
- 如果右边元素被选中，说明它小于左边剩余的所有元素
- 此时可以统计逆序对数量

```
左: [2, 5]  右: [1, 6]  (已排序)
     ↓
合并时选择 1（右边），说明 1 小于左边剩余的 [2,5]
因此 2 和 5 各有1个逆序对
```

---

## 代码实现

```typescript
function countSmaller(nums: number[]): number[] {
  const n = nums.length;
  const result = new Array(n).fill(0);
  
  // 存储 (值, 原始索引) 对
  const pairs: [number, number][] = nums.map((val, idx) => [val, idx]);
  
  function mergeSort(left: number, right: number): void {
    if (left >= right) return;
    
    const mid = Math.floor((left + right) / 2);
    mergeSort(left, mid);
    mergeSort(mid + 1, right);
    merge(left, mid, right);
  }
  
  function merge(left: number, mid: number, right: number): void {
    const temp: [number, number][] = [];
    let i = left, j = mid + 1;
    
    while (i <= mid && j <= right) {
      if (pairs[i][0] <= pairs[j][0]) {
        // 右边有 j - (mid + 1) 个元素已经被选走
        // 它们都小于 pairs[i][0]
        result[pairs[i][1]] += j - (mid + 1);
        temp.push(pairs[i]);
        i++;
      } else {
        temp.push(pairs[j]);
        j++;
      }
    }
    
    // 左边剩余元素
    while (i <= mid) {
      result[pairs[i][1]] += j - (mid + 1);
      temp.push(pairs[i]);
      i++;
    }
    
    // 右边剩余元素
    while (j <= right) {
      temp.push(pairs[j]);
      j++;
    }
    
    // 复制回原数组
    for (let k = 0; k < temp.length; k++) {
      pairs[left + k] = temp[k];
    }
  }
  
  mergeSort(0, n - 1);
  return result;
}
```

---

## 执行过程详解

以 `[5, 2, 6, 1]` 为例：

**初始**：
```
pairs = [(5,0), (2,1), (6,2), (1,3)]
result = [0, 0, 0, 0]
```

**第一层分割**：
```
左: [(5,0), (2,1)]  右: [(6,2), (1,3)]
```

**左半递归**：
```
[(5,0)] [(2,1)]
  ↓ 合并
选(2,1): 无右边元素，result[1] += 0
选(5,0): 右边已选走1个(2), result[0] += 1
结果: [(2,1), (5,0)]
```

**右半递归**：
```
[(6,2)] [(1,3)]
  ↓ 合并
选(1,3): 无右边元素，result[3] += 0
选(6,2): 右边已选走1个(1), result[2] += 1
结果: [(1,3), (6,2)]
```

**最终合并**：
```
左: [(2,1), (5,0)]  右: [(1,3), (6,2)]
  ↓
选(1,3): result[3] += 0
选(2,1): 右边已选走1个(1), result[1] += 1
选(5,0): 右边已选走1个(1), result[0] += 1
选(6,2): 右边已选走0个, result[2] += 0
```

**最终结果**：
```
result = [2, 1, 1, 0]  ✓
```

---

## 为什么需要保存原始索引？

归并排序会改变元素的顺序，但我们需要按**原始位置**输出结果。

**没有索引的问题**：
```
原数组：[5, 2, 6, 1]
排序后：[1, 2, 5, 6]

问题：1 的计数是多少？5 的计数是多少？
无法对应回去！
```

**解决方案**：将 (值, 原索引) 绑定成一对，排序时携带索引：
```
[(5,0), (2,1), (6,2), (1,3)]
       ↓ 排序
[(1,3), (2,1), (5,0), (6,2)]

统计时使用值比较，记录时使用索引：
result[pairs[i][1]] += count;
```

---

## 计数逻辑的深入理解

**核心洞察**：当我们从左半部分选择一个元素时，右半部分已经被选走的元素都比它小。

```
左: [2, 5]  右: [1, 6]

合并过程：
1. 比较2和1，选1（右边）→ 右边选走1个
2. 比较2和6，选2（左边）→ result[2的原索引] += 1
3. 比较5和6，选5（左边）→ result[5的原索引] += 1
4. 选6（右边）→ 右边又选走1个，但左边已空

关键：每次选左边元素时，统计右边已选走的数量
```

**公式**：`result[原索引] += j - (mid + 1)`

- `j` 是右半部分当前指针位置
- `mid + 1` 是右半部分起始位置
- `j - (mid + 1)` 就是右边已选走的元素数量

---

## 复杂度分析

- **时间复杂度**：O(n log n)
  - 归并排序本身：O(n log n)
  - 每次合并的统计操作：O(n)，共 log n 层
  - 总计：O(n log n)

- **空间复杂度**：O(n)
  - `pairs` 数组：O(n)
  - 临时合并数组：O(n)
  - 递归调用栈：O(log n)

---

## 其他解法对比

### 解法二：树状数组（Binary Indexed Tree）

```typescript
function countSmaller(nums: number[]): number[] {
  // 离散化
  const sorted = [...new Set(nums)].sort((a, b) => a - b);
  const rank = new Map<number, number>();
  sorted.forEach((v, i) => rank.set(v, i + 1));
  
  const n = nums.length;
  const result = new Array(n);
  const tree = new Array(sorted.length + 1).fill(0);
  
  // 从右向左遍历
  for (let i = n - 1; i >= 0; i--) {
    const r = rank.get(nums[i])!;
    result[i] = query(tree, r - 1);  // 查询比当前小的数量
    update(tree, r);                  // 更新当前元素
  }
  
  return result;
}

function update(tree: number[], i: number): void {
  while (i < tree.length) {
    tree[i]++;
    i += i & (-i);
  }
}

function query(tree: number[], i: number): number {
  let sum = 0;
  while (i > 0) {
    sum += tree[i];
    i -= i & (-i);
  }
  return sum;
}
```

**复杂度**：时间 O(n log n)，空间 O(n)

### 解法对比

| 解法 | 时间 | 空间 | 优点 | 缺点 |
|-----|------|------|------|------|
| 归并排序 | O(n log n) | O(n) | 思路清晰 | 需理解归并计数 |
| 树状数组 | O(n log n) | O(n) | 在线处理 | 需要离散化 |
| 线段树 | O(n log n) | O(n) | 功能强大 | 实现复杂 |

---

## 常见错误

### 错误1：忘记处理左边剩余元素

```typescript
// ❌ 错误：左边剩余元素没有统计
while (i <= mid && j <= right) {
  // ...
}
// 忘记处理 i <= mid 的情况

// ✅ 正确：左边剩余元素也要统计
while (i <= mid) {
  result[pairs[i][1]] += j - (mid + 1);  // 右边全部选完了
  temp.push(pairs[i++]);
}
```

### 错误2：使用值而非索引

```typescript
// ❌ 错误：直接修改result数组
result[i] += count;  // i 是当前遍历位置，不是原始索引

// ✅ 正确：使用pairs中存储的原始索引
result[pairs[i][1]] += count;  // pairs[i][1] 是原始索引
```

### 错误3：归并时改变了pairs结构

```typescript
// ❌ 错误：只存值，丢失索引
temp.push(pairs[i][0]);  // 只存值

// ✅ 正确：存储完整的 (值, 索引) 对
temp.push(pairs[i]);  // 存整个对象
```

---

## 关键要点

1. **归并排序扩展**：在合并过程中收集额外信息
2. **保存原始索引**：排序会打乱顺序，需要记录原位置
3. **计数时机**：当左边元素被选中时，右边已选走的都比它小
4. **通用模式**：很多"逆序对"问题都可以用这个模式

---

## 相关题目

- **493. 翻转对**：统计 `nums[i] > 2 * nums[j]` 的对数
- **327. 区间和的个数**：前缀和 + 归并排序
- **剑指 Offer 51. 数组中的逆序对**：经典逆序对统计

这些题目的核心思想一致：**利用归并排序的有序性，在合并时高效统计信息**。
