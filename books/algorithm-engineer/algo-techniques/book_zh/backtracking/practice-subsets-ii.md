# 实战：子集 II

> LeetCode 90. 子集 II | 难度：中等

含重复元素的子集问题，结合了"子集"与"去重"两个核心技巧。

---

## 问题描述

给定一个可能包含重复元素的整数数组`nums`，返回该数组所有可能的子集（幂集）。

**注意**：解集不能包含重复的子集。

**示例**：
```
输入：nums = [1, 2, 2]
输出：[[], [1], [1, 2], [1, 2, 2], [2], [2, 2]]

输入：nums = [0]
输出：[[], [0]]
```

**对比子集I**：
- 子集I：元素不重复
- 子集II：元素可重复，需要去重

---

## 思路分析

### 问题：为什么会产生重复？

以`[1, 2, 2]`为例，如果不去重：
```
选择第一个2 → [2], [1, 2], [2, 2], [1, 2, 2]
选择第二个2 → [2], [1, 2], [2, 2], [1, 2, 2]  ← 重复了！
```

**重复的根源**：在同一层（同一位置），相同的值被选择了多次。

### 去重策略

与"全排列II"相同的思路：
1. **排序**：让相同元素相邻
2. **剪枝**：在同一层，跳过重复元素

---

## 解法：排序 + 剪枝

```typescript
function subsetsWithDup(nums: number[]): number[][] {
  const result: number[][] = [];
  
  // 关键：排序让相同元素相邻
  nums.sort((a, b) => a - b);
  
  function backtrack(start: number, path: number[]) {
    // 每个节点都是答案
    result.push([...path]);
    
    for (let i = start; i < nums.length; i++) {
      // 去重：在同一层，跳过重复元素
      if (i > start && nums[i] === nums[i - 1]) {
        continue;
      }
      
      path.push(nums[i]);      // 做选择
      backtrack(i + 1, path);  // 递归
      path.pop();              // 撤销选择
    }
  }
  
  backtrack(0, []);
  return result;
}
```

---

## 去重条件解析

```typescript
if (i > start && nums[i] === nums[i - 1]) {
  continue;
}
```

### 为什么是`i > start`？

- `i > start`表示这不是当前层的第一个选择
- 如果当前元素与前一个相同，说明前一个相同元素已经在这一层被处理过了
- 选择当前元素会产生重复的子集

### 对比"全排列II"的去重

```typescript
// 全排列II
if (i > 0 && nums[i] === nums[i-1] && !used[i-1]) continue;

// 子集II
if (i > start && nums[i] === nums[i-1]) continue;
```

**区别**：
- 全排列用`used`数组标记已使用元素
- 子集用`start`参数控制选择范围
- 全排列的`!used[i-1]`对应子集的`i > start`

---

## 执行过程可视化

以`nums = [1, 2, 2]`为例（排序后仍为[1, 2, 2]）：

```
backtrack(0, [])
├─ result: [[]]
├─ i=0, nums[0]=1
│  └─ backtrack(1, [1])
│     ├─ result: [..., [1]]
│     ├─ i=1, nums[1]=2
│     │  └─ backtrack(2, [1,2])
│     │     ├─ result: [..., [1,2]]
│     │     └─ i=2, nums[2]=2
│     │        └─ backtrack(3, [1,2,2])
│     │           └─ result: [..., [1,2,2]]
│     └─ i=2, nums[2]=2, i > start && nums[2] === nums[1] → 跳过
├─ i=1, nums[1]=2
│  └─ backtrack(2, [2])
│     ├─ result: [..., [2]]
│     └─ i=2, nums[2]=2
│        └─ backtrack(3, [2,2])
│           └─ result: [..., [2,2]]
└─ i=2, nums[2]=2, i > start && nums[2] === nums[1] → 跳过

结果：[[], [1], [1,2], [1,2,2], [2], [2,2]]
```

---

## 复杂度分析

**时间复杂度**：O(n × 2^n)
- 最坏情况（无重复）：2^n个子集
- 有重复时会剪枝，实际更少
- 每个子集需要O(n)拷贝

**空间复杂度**：O(n)
- 递归栈深度为n
- path数组长度最多为n

---

## 对比：子集I vs 子集II

| 特性 | 子集I | 子集II |
|-----|-------|--------|
| 输入 | 无重复元素 | 可含重复 |
| 预处理 | 无 | 排序 |
| 去重 | 无 | `i > start`剪枝 |
| 结果数 | 2^n | ≤ 2^n |

---

## 变体：位运算解法

位运算也可以处理重复元素，但需要额外去重：

```typescript
function subsetsWithDup(nums: number[]): number[][] {
  nums.sort((a, b) => a - b);
  const result: number[][] = [];
  const seen = new Set<string>();
  const n = nums.length;
  
  for (let mask = 0; mask < (1 << n); mask++) {
    const subset: number[] = [];
    
    for (let i = 0; i < n; i++) {
      if (mask & (1 << i)) {
        subset.push(nums[i]);
      }
    }
    
    const key = subset.join(',');
    if (!seen.has(key)) {
      seen.add(key);
      result.push(subset);
    }
  }
  
  return result;
}
```

**缺点**：需要额外的Set存储，且字符串化有开销。回溯法更优雅。

---

## 常见错误

**错误1：忘记排序**
```typescript
// 错误：不排序无法正确去重
// nums.sort((a, b) => a - b);  ❌

// 正确
nums.sort((a, b) => a - b);  // ✅
```

**错误2：去重条件写错**
```typescript
// 错误：i > 0 应该是 i > start
if (i > 0 && nums[i] === nums[i - 1]) {  // ❌
  continue;
}

// 正确
if (i > start && nums[i] === nums[i - 1]) {  // ✅
  continue;
}
```

**解释**：
- `i > 0`会影响不同层的选择
- `i > start`只在同一层去重

---

## 相关题目

| 题目 | 难度 | 说明 |
|-----|------|------|
| [78. 子集](https://leetcode.com/problems/subsets/) | 中等 | 无重复版本 |
| [47. 全排列 II](https://leetcode.com/problems/permutations-ii/) | 中等 | 同样的去重思路 |
| [40. 组合总和 II](https://leetcode.com/problems/combination-sum-ii/) | 中等 | 同样的去重思路 |

---

## 回溯去重通用模式

```typescript
// 排序
nums.sort((a, b) => a - b);

function backtrack(start: number, path: number[]) {
  // 收集结果（根据具体问题调整位置）
  result.push([...path]);
  
  for (let i = start; i < nums.length; i++) {
    // 去重：同一层跳过重复
    if (i > start && nums[i] === nums[i - 1]) {
      continue;
    }
    
    path.push(nums[i]);
    backtrack(i + 1, path);  // 或 backtrack(i, path) 如果可重复使用
    path.pop();
  }
}
```

---

## 总结

子集II问题的核心要点：

1. **排序是前提**：让相同元素相邻
2. **`i > start`去重**：在同一层跳过重复元素
3. **与全排列II的区别**：子集用start控制范围，不需要used数组
4. **通用模式**：这个去重思路适用于组合总和II、全排列II等问题

记住口诀：**"排序 + 同一层跳过相同元素"**。
```
