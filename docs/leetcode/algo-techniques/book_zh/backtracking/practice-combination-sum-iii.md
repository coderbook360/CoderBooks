# 实战：组合总和 III

> LeetCode 216. 组合总和 III | 难度：中等

找出k个数和为n的组合，只能使用1-9。这道题在组合总和的基础上增加了"个数限制"。

---

## 问题描述

找出所有相加之和为`n`的`k`个数的组合，满足以下条件：
- 只使用数字1到9
- 每个数字最多使用一次

**示例**：
```
输入：k = 3, n = 7
输出：[[1, 2, 4]]
解释：1 + 2 + 4 = 7，没有其他组合

输入：k = 3, n = 9
输出：[[1, 2, 6], [1, 3, 5], [2, 3, 4]]

输入：k = 4, n = 1
输出：[]
解释：不存在4个数和为1的组合
```

---

## 思路分析

### 与其他组合总和的区别

| 题目 | 数组 | 个数限制 | 元素使用 |
|-----|------|---------|---------|
| **39. 组合总和** | 给定数组 | 无 | 可重复 |
| **40. 组合总和 II** | 给定数组 | 无 | 不可重复 |
| **216. 组合总和 III** | 固定1-9 | **k个** | 不可重复 |

### 关键约束

1. **数组固定**：candidates = [1, 2, 3, 4, 5, 6, 7, 8, 9]
2. **个数限制**：必须恰好选k个数
3. **不可重复**：递归时传`i + 1`

---

## 解法一：基础回溯

```typescript
function combinationSum3(k: number, n: number): number[][] {
  const result: number[][] = [];
  
  function backtrack(start: number, sum: number, path: number[]) {
    // 终止条件：选够k个数
    if (path.length === k) {
      if (sum === n) {
        result.push([...path]);
      }
      return;
    }
    
    // 从start开始选择（1-9）
    for (let i = start; i <= 9; i++) {
      path.push(i);                  // 做选择
      backtrack(i + 1, sum + i, path); // 递归（i+1，不可重复）
      path.pop();                    // 撤销选择
    }
  }
  
  backtrack(1, 0, []);
  return result;
}
```

---

## 解法二：剪枝优化（推荐）

增加两个剪枝条件：
1. **和超过目标**：`sum + i > n`时直接终止
2. **剩余数不够**：剩余可选数量小于需要数量时终止

```typescript
function combinationSum3(k: number, n: number): number[][] {
  const result: number[][] = [];
  
  function backtrack(start: number, sum: number, path: number[]) {
    // 选够k个数
    if (path.length === k) {
      if (sum === n) {
        result.push([...path]);
      }
      return;
    }
    
    // 剪枝1：剩余可选数量不够
    const need = k - path.length;
    const remain = 9 - start + 1;
    if (remain < need) return;
    
    for (let i = start; i <= 9; i++) {
      // 剪枝2：当前和已超过目标
      if (sum + i > n) break;
      
      path.push(i);
      backtrack(i + 1, sum + i, path);
      path.pop();
    }
  }
  
  backtrack(1, 0, []);
  return result;
}
```

---

## 解法三：更紧凑的剪枝

将所有剪枝条件整合到循环边界：

```typescript
function combinationSum3(k: number, n: number): number[][] {
  const result: number[][] = [];
  
  function backtrack(start: number, sum: number, path: number[]) {
    if (path.length === k) {
      if (sum === n) result.push([...path]);
      return;
    }
    
    // 计算循环上界：
    // 1. 最多到9
    // 2. 留足剩余需要的个数
    const need = k - path.length;
    const maxStart = 9 - need + 1;
    
    for (let i = start; i <= maxStart && sum + i <= n; i++) {
      path.push(i);
      backtrack(i + 1, sum + i, path);
      path.pop();
    }
  }
  
  backtrack(1, 0, []);
  return result;
}
```

---

## 复杂度分析

**时间复杂度**：O(C(9, k) × k)
- 从9个数中选k个，最多C(9, k)种组合
- k最大为9，C(9, 4) = 126（最大）
- 每个组合需要O(k)拷贝

**空间复杂度**：O(k)
- 递归栈深度为k
- path数组长度为k

---

## 执行过程可视化

以`k = 3, n = 9`为例：

```
backtrack(1, 0, [])
├─ i=1, path=[1]
│  └─ backtrack(2, 1, [1])
│     ├─ i=2, path=[1,2]
│     │  └─ backtrack(3, 3, [1,2])
│     │     ├─ i=3, sum=6 ≠ 9
│     │     ├─ i=4, sum=7 ≠ 9
│     │     ├─ i=5, sum=8 ≠ 9
│     │     └─ i=6, sum=9 = 9 ✓ 收集 [1,2,6]
│     ├─ i=3, path=[1,3]
│     │  └─ backtrack(4, 4, [1,3])
│     │     ├─ i=4, sum=8 ≠ 9
│     │     └─ i=5, sum=9 = 9 ✓ 收集 [1,3,5]
│     └─ i=4, path=[1,4]
│        └─ backtrack(5, 5, [1,4])
│           ├─ i=5, sum=10 > 9 → break
│           └─ (剪枝)
├─ i=2, path=[2]
│  └─ backtrack(3, 2, [2])
│     └─ i=3, path=[2,3]
│        └─ backtrack(4, 5, [2,3])
│           └─ i=4, sum=9 = 9 ✓ 收集 [2,3,4]
└─ ...

结果：[[1,2,6], [1,3,5], [2,3,4]]
```

---

## 边界情况

```typescript
// k和n不匹配的情况
combinationSum3(4, 1);   // [] - 4个正整数最小和是1+2+3+4=10
combinationSum3(1, 10);  // [] - 1个数最大是9
combinationSum3(9, 45);  // [[1,2,3,4,5,6,7,8,9]] - 唯一解
combinationSum3(2, 3);   // [[1,2]]
```

---

## 常见错误

**错误1：忘记个数限制**
```typescript
// 错误：sum === n 就收集（忽略了k的限制）
if (sum === n) {  // ❌
  result.push([...path]);
  return;
}

// 正确：必须恰好k个数且和为n
if (path.length === k) {  // ✅
  if (sum === n) result.push([...path]);
  return;
}
```

**错误2：循环上界错误**
```typescript
// 错误：可能越界
for (let i = start; i <= 10; i++) {  // ❌ 最大应该是9

// 正确
for (let i = start; i <= 9; i++) {  // ✅
```

---

## 相关题目

| 题目 | 难度 | 说明 |
|-----|------|------|
| [39. 组合总和](https://leetcode.com/problems/combination-sum/) | 中等 | 可重复使用 |
| [40. 组合总和 II](https://leetcode.com/problems/combination-sum-ii/) | 中等 | 有重复元素 |
| [77. 组合](https://leetcode.com/problems/combinations/) | 中等 | 无和约束 |

---

## 组合总和系列总结

| 题目 | 候选数 | 元素使用 | 约束条件 |
|-----|--------|---------|---------|
| **39** | 给定数组 | 可重复 | sum = target |
| **40** | 给定数组（有重复） | 不可重复 | sum = target |
| **216** | 1-9固定 | 不可重复 | sum = n 且 count = k |

---

## 总结

组合总和III问题的核心要点：

1. **固定候选集**：1-9，共9个数
2. **双重约束**：和为n，个数为k
3. **不可重复**：递归时传`i + 1`
4. **剪枝优化**：
   - 和超过目标时break
   - 剩余数量不够时提前return

这道题相对简单，但展示了如何在基础回溯模板上增加"个数限制"约束。
```
