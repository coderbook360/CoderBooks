# 实战：组合总和 II

> LeetCode 40. 组合总和 II | 难度：中等

元素不可重复使用，但数组中包含重复元素。这道题结合了"不可重复选择"和"去重"两个技巧。

---

## 问题描述

给定一个候选人编号的集合`candidates`和一个目标数`target`，找出`candidates`中所有可以使数字和为`target`的组合。

`candidates`中的每个数字在**每个组合中只能使用一次**。

**注意**：解集不能包含重复的组合。

**示例**：
```
输入：candidates = [10, 1, 2, 7, 6, 1, 5], target = 8
输出：[[1, 1, 6], [1, 2, 5], [1, 7], [2, 6]]

输入：candidates = [2, 5, 2, 1, 2], target = 5
输出：[[1, 2, 2], [5]]
```

---

## 思路分析

### 与组合总和I的区别

| 特性 | 组合总和I | 组合总和II |
|-----|---------|----------|
| 数组特点 | 无重复元素 | **有重复元素** |
| 元素使用 | 可重复使用 | **只能用一次** |
| 递归参数 | `backtrack(i)` | `backtrack(i + 1)` |
| 去重 | 无需 | **需要** |

### 两个关键点

1. **不可重复使用**：递归时传`i + 1`
2. **去重**：排序 + 同层跳过重复元素

---

## 解法：排序 + 双重约束

```typescript
function combinationSum2(candidates: number[], target: number): number[][] {
  const result: number[][] = [];
  
  // 排序：方便剪枝和去重
  candidates.sort((a, b) => a - b);
  
  function backtrack(start: number, sum: number, path: number[]) {
    // 找到目标和
    if (sum === target) {
      result.push([...path]);
      return;
    }
    
    for (let i = start; i < candidates.length; i++) {
      // 剪枝1：超过目标和
      if (sum + candidates[i] > target) {
        break;
      }
      
      // 剪枝2：同层去重（关键！）
      if (i > start && candidates[i] === candidates[i - 1]) {
        continue;
      }
      
      path.push(candidates[i]);
      backtrack(i + 1, sum + candidates[i], path);  // i+1：不可重复
      path.pop();
    }
  }
  
  backtrack(0, 0, []);
  return result;
}
```

---

## 去重条件解析

```typescript
if (i > start && candidates[i] === candidates[i - 1]) {
  continue;
}
```

### 为什么是`i > start`？

以`[1, 1, 6]`为例，target = 8：

**如果用`i > 0`**：
- 在第一层选1（索引0）后，第二层无法再选1（索引1）
- 会漏掉`[1, 1, 6]`这个解

**正确用`i > start`**：
- 在同一层，跳过重复元素
- 在不同层，允许选择相同值的不同元素

```
第一层（start=0）：
├─ i=0, 选candidates[0]=1 ✓
│  第二层（start=1）：
│  ├─ i=1, 选candidates[1]=1 ✓ （i=1 = start=1，不跳过）
│  │  └─ [1, 1, ...]
│  └─ ...
├─ i=1, i > start && candidates[1] === candidates[0] → 跳过 ✓
└─ ...
```

---

## 执行过程可视化

以`candidates = [1, 1, 2, 5, 6, 7, 10], target = 8`为例：

```
排序后：[1, 1, 2, 5, 6, 7, 10]

backtrack(0, 0, [])
├─ i=0, 选1
│  └─ backtrack(1, 1, [1])
│     ├─ i=1, 选1
│     │  └─ backtrack(2, 2, [1,1])
│     │     ├─ i=2, 选2 → sum=4
│     │     │  └─ backtrack(3, 4, [1,1,2])
│     │     │     ├─ 选5 → sum=9 > 8 → break
│     │     ├─ i=3, 选5 → sum=7
│     │     │  └─ backtrack(4, 7, [1,1,5])
│     │     │     ├─ i=4, 选6 → sum=13 > 8 → break
│     │     └─ i=4, 选6
│     │        └─ backtrack(5, 8, [1,1,6]) ✓ 收集
│     ├─ i=2, 选2 → sum=3
│     │  └─ backtrack(3, 3, [1,2])
│     │     ├─ i=3, 选5
│     │     │  └─ backtrack(4, 8, [1,2,5]) ✓ 收集
│     │     └─ ...
│     └─ ...
├─ i=1, candidates[1] === candidates[0] && i > start → 跳过
└─ ...

结果：[[1,1,6], [1,2,5], [1,7], [2,6]]
```

---

## 复杂度分析

**时间复杂度**：O(2^n)
- 最坏情况：每个元素选或不选
- 去重和剪枝会减少实际计算量

**空间复杂度**：O(n)
- 递归栈深度最多为n
- path数组长度最多为n

---

## 对比三道组合总和

| 题目 | 数组 | 元素使用 | 递归 | 去重 |
|-----|------|---------|------|------|
| **39. 组合总和** | 无重复 | 可重复 | `i` | 无 |
| **40. 组合总和 II** | 有重复 | 不可重复 | `i+1` | `i > start` |
| **216. 组合总和 III** | 1-9固定 | 不可重复 | `i+1` | 无 |

---

## 常见错误

**错误1：去重条件写错**
```typescript
// 错误：i > 0 会影响不同层
if (i > 0 && candidates[i] === candidates[i - 1]) {  // ❌
  continue;
}

// 正确：i > start 只在同层去重
if (i > start && candidates[i] === candidates[i - 1]) {  // ✅
  continue;
}
```

**错误2：递归参数错误**
```typescript
// 错误：传i允许重复使用（这是组合总和I的做法）
backtrack(i, sum + candidates[i], path);  // ❌

// 正确：传i+1，每个元素只能用一次
backtrack(i + 1, sum + candidates[i], path);  // ✅
```

**错误3：忘记排序**
```typescript
// 错误：不排序无法正确去重和剪枝
// candidates.sort((a, b) => a - b);  ❌

// 正确
candidates.sort((a, b) => a - b);  // ✅
```

---

## 相关题目

| 题目 | 难度 | 说明 |
|-----|------|------|
| [39. 组合总和](https://leetcode.com/problems/combination-sum/) | 中等 | 可重复使用 |
| [216. 组合总和 III](https://leetcode.com/problems/combination-sum-iii/) | 中等 | 1-9，限定k个 |
| [90. 子集 II](https://leetcode.com/problems/subsets-ii/) | 中等 | 同样的去重思路 |

---

## 总结

组合总和II问题的核心要点：

1. **不可重复使用**：递归时传`i + 1`
2. **同层去重**：`i > start && candidates[i] === candidates[i-1]`
3. **排序是前提**：方便去重和剪枝
4. **双重剪枝**：超过target时break，重复元素时continue

这道题综合了"不可重复选择"和"去重"两个核心技巧，是组合类问题的经典练习。
```
