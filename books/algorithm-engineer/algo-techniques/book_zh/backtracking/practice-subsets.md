# 实战：子集

> LeetCode 78. 子集 | 难度：中等

返回所有可能的子集（幂集）。这道题揭示了"子集"与"组合"的本质区别。

---

## 问题描述

给定一个不含重复元素的整数数组`nums`，返回该数组所有可能的子集（幂集）。

**示例**：
```
输入：nums = [1, 2, 3]
输出：[[], [1], [2], [3], [1, 2], [1, 3], [2, 3], [1, 2, 3]]

输入：nums = [0]
输出：[[], [0]]
```

**子集数量**：n个元素的所有子集数量是2^n（包括空集）。

---

## 思路分析

### 子集 vs 组合 vs 排列

| 问题 | 描述 | 收集时机 |
|-----|------|---------|
| **排列** | 选k个，有序 | 只在叶子节点收集 |
| **组合** | 选k个，无序 | 只在path.length === k时收集 |
| **子集** | 选0到n个，无序 | **每个节点都收集** |

**核心区别**：子集问题收集决策树的**所有节点**，而不仅仅是叶子。

### 决策树模型

```
               []              ← 收集
        /      |       \
      [1]     [2]     [3]      ← 收集
     /   \     |
  [1,2] [1,3] [2,3]            ← 收集
    |
 [1,2,3]                       ← 收集

结果：[[], [1], [2], [3], [1,2], [1,3], [2,3], [1,2,3]]
```

每个节点（包括根节点的空集）都是一个有效的子集。

---

## 解法一：回溯（推荐）

```typescript
function subsets(nums: number[]): number[][] {
  const result: number[][] = [];
  
  function backtrack(start: number, path: number[]) {
    // 每个节点都是答案，不需要终止条件判断
    result.push([...path]);
    
    // 从start开始选择，避免重复
    for (let i = start; i < nums.length; i++) {
      path.push(nums[i]);      // 做选择
      backtrack(i + 1, path);  // 递归（从i+1开始）
      path.pop();              // 撤销选择
    }
  }
  
  backtrack(0, []);
  return result;
}
```

### 代码对比：组合 vs 子集

```typescript
// 组合：只收集叶子节点
function combine(n: number, k: number) {
  function backtrack(start: number, path: number[]) {
    if (path.length === k) {  // 达到k个才收集
      result.push([...path]);
      return;                 // 然后返回
    }
    // ...
  }
}

// 子集：收集所有节点
function subsets(nums: number[]) {
  function backtrack(start: number, path: number[]) {
    result.push([...path]);   // 每次都收集
    // 不需要return，继续探索
    // ...
  }
}
```

---

## 解法二：位运算（二进制枚举）

**核心思想**：每个元素有两种状态：选或不选。n个元素共有2^n种组合，用0到2^n-1的二进制数表示。

```typescript
function subsets(nums: number[]): number[][] {
  const result: number[][] = [];
  const n = nums.length;
  const total = 1 << n;  // 2^n
  
  for (let mask = 0; mask < total; mask++) {
    const subset: number[] = [];
    
    for (let i = 0; i < n; i++) {
      // 检查第i位是否为1
      if (mask & (1 << i)) {
        subset.push(nums[i]);
      }
    }
    
    result.push(subset);
  }
  
  return result;
}
```

### 位运算示例（nums = [1, 2, 3]）

```
mask = 0 (000): []
mask = 1 (001): [1]        ← 第0位是1
mask = 2 (010): [2]        ← 第1位是1
mask = 3 (011): [1, 2]     ← 第0、1位是1
mask = 4 (100): [3]        ← 第2位是1
mask = 5 (101): [1, 3]     ← 第0、2位是1
mask = 6 (110): [2, 3]     ← 第1、2位是1
mask = 7 (111): [1, 2, 3]  ← 第0、1、2位是1
```

---

## 解法三：迭代法

**思路**：从空集开始，每加入一个新元素，就在所有现有子集后面追加这个元素。

```typescript
function subsets(nums: number[]): number[][] {
  let result: number[][] = [[]];  // 从空集开始
  
  for (const num of nums) {
    const newSubsets: number[][] = [];
    
    for (const subset of result) {
      // 在每个现有子集后面追加新元素
      newSubsets.push([...subset, num]);
    }
    
    // 合并新子集
    result = [...result, ...newSubsets];
  }
  
  return result;
}
```

### 迭代过程演示（nums = [1, 2, 3]）

```
初始：[[]]
加入1：[[], [1]]
加入2：[[], [1], [2], [1, 2]]
加入3：[[], [1], [2], [1, 2], [3], [1, 3], [2, 3], [1, 2, 3]]
```

---

## 复杂度分析

**时间复杂度**：O(n × 2^n)
- 共有2^n个子集
- 每个子集平均长度为n/2，拷贝需要O(n)

**空间复杂度**：O(n)
- 递归栈深度为n
- 不计结果存储空间

---

## 三种解法对比

| 方法 | 优势 | 劣势 |
|-----|------|------|
| **回溯** | 通用性强，易扩展 | 递归开销 |
| **位运算** | 代码简洁，无递归 | n > 30时溢出 |
| **迭代** | 直观，无递归 | 额外空间 |

**推荐**：面试首选回溯法，因为它是最通用的模板，可以轻松扩展到子集II、组合等问题。

---

## 执行过程可视化

以`nums = [1, 2, 3]`为例：

```
backtrack(0, [])
├─ result: [[]]
├─ i=0, path=[1]
│  └─ backtrack(1, [1])
│     ├─ result: [[], [1]]
│     ├─ i=1, path=[1,2]
│     │  └─ backtrack(2, [1,2])
│     │     ├─ result: [[], [1], [1,2]]
│     │     └─ i=2, path=[1,2,3]
│     │        └─ backtrack(3, [1,2,3])
│     │           └─ result: [[], [1], [1,2], [1,2,3]]
│     └─ i=2, path=[1,3]
│        └─ backtrack(3, [1,3])
│           └─ result: [..., [1,3]]
├─ i=1, path=[2]
│  └─ backtrack(2, [2])
│     ├─ result: [..., [2]]
│     └─ i=2, path=[2,3]
│        └─ result: [..., [2,3]]
└─ i=2, path=[3]
   └─ backtrack(3, [3])
      └─ result: [..., [3]]

最终结果：[[], [1], [1,2], [1,2,3], [1,3], [2], [2,3], [3]]
```

---

## 常见错误

**错误1：只收集叶子节点**
```typescript
// 错误：只在"无法继续"时收集
if (start === nums.length) {  // ❌
  result.push([...path]);
  return;
}

// 正确：每次都收集
result.push([...path]);  // ✅ 先收集
// 然后继续探索
```

**错误2：忘记从start开始**
```typescript
// 错误：会产生重复
for (let i = 0; i < nums.length; i++) {  // ❌

// 正确
for (let i = start; i < nums.length; i++) {  // ✅
```

---

## 相关题目

| 题目 | 难度 | 说明 |
|-----|------|------|
| [90. 子集 II](https://leetcode.com/problems/subsets-ii/) | 中等 | 含重复元素 |
| [77. 组合](https://leetcode.com/problems/combinations/) | 中等 | 固定大小的子集 |
| [784. 字母大小写全排列](https://leetcode.com/problems/letter-case-permutation/) | 中等 | 字符串变体 |

---

## 总结

子集问题的核心要点：

1. **收集所有节点**：不仅是叶子，每个节点都是答案
2. **使用start参数**：确保子集无序，避免[1,2]和[2,1]重复
3. **三种解法**：回溯（通用）、位运算（简洁）、迭代（直观）
4. **与组合的区别**：组合只收集k个元素，子集收集0到n个

子集问题是回溯问题的基础模式之一，理解它有助于解决更复杂的变体问题。
```
