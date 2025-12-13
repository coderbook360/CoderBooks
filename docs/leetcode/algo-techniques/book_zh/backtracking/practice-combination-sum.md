# 实战：组合总和

> LeetCode 39. 组合总和 | 难度：中等

找出所有和为target的组合，元素**可以重复使用**。这道题是回溯算法中"可重复选择"模式的经典案例。

---

## 问题描述

给定一个**无重复元素**的正整数数组`candidates`和一个目标整数`target`，找出`candidates`中所有可以使数字和为`target`的组合。

`candidates`中的**同一个数字可以无限制重复被选取**。

**示例**：
```
输入：candidates = [2, 3, 6, 7], target = 7
输出：[[2, 2, 3], [7]]
解释：
  2 + 2 + 3 = 7
  7 = 7

输入：candidates = [2, 3, 5], target = 8
输出：[[2, 2, 2, 2], [2, 3, 3], [3, 5]]

输入：candidates = [2], target = 1
输出：[]
```

---

## 思路分析

### 与"组合"的区别

| 问题 | 元素使用 | 递归参数 |
|-----|---------|---------|
| **组合** | 每个元素最多用一次 | `backtrack(i + 1, ...)` |
| **组合总和** | 每个元素可重复使用 | `backtrack(i, ...)` |

**核心区别**：递归时传`i`而不是`i + 1`，表示当前元素还可以继续选。

### 决策树模型（candidates=[2,3], target=5）

```
                    []
           /                  \
        [2]                  [3]
       /   \                   \
    [2,2]  [2,3]              [3,3] (和>5,剪枝)
    /        \
  [2,2,2]   [2,2,3] (和>5,剪枝)
    |
   (和>5,剪枝)

有效结果：[2,3] (和=5)
```

---

## 解法一：基础回溯

```typescript
function combinationSum(candidates: number[], target: number): number[][] {
  const result: number[][] = [];
  
  function backtrack(start: number, sum: number, path: number[]) {
    // 终止条件1：找到目标和
    if (sum === target) {
      result.push([...path]);
      return;
    }
    
    // 终止条件2：超过目标和（可选，有剪枝时不需要）
    if (sum > target) {
      return;
    }
    
    // 从start开始，避免重复组合如[2,3]和[3,2]
    for (let i = start; i < candidates.length; i++) {
      path.push(candidates[i]);            // 做选择
      backtrack(i, sum + candidates[i], path); // 注意是i，不是i+1
      path.pop();                          // 撤销选择
    }
  }
  
  backtrack(0, 0, []);
  return result;
}
```

### 关键点

**为什么是`backtrack(i, ...)`？**
- 传`i`表示当前元素可以继续被选择（重复使用）
- 如果传`i + 1`，每个元素只能用一次

**为什么需要`start`参数？**
- 避免产生重复的组合：[2, 3] 和 [3, 2]
- 只往后选，确保组合是唯一的

---

## 解法二：排序 + 剪枝（推荐）

通过排序，可以在`sum + candidates[i] > target`时直接`break`（后面的更大，都不行）。

```typescript
function combinationSum(candidates: number[], target: number): number[][] {
  const result: number[][] = [];
  
  // 排序：方便剪枝
  candidates.sort((a, b) => a - b);
  
  function backtrack(start: number, sum: number, path: number[]) {
    if (sum === target) {
      result.push([...path]);
      return;
    }
    
    for (let i = start; i < candidates.length; i++) {
      // 剪枝：排序后，如果当前元素已经超过剩余目标，后面的更不行
      if (sum + candidates[i] > target) {
        break;  // 注意是break，不是continue
      }
      
      path.push(candidates[i]);
      backtrack(i, sum + candidates[i], path);
      path.pop();
    }
  }
  
  backtrack(0, 0, []);
  return result;
}
```

### 剪枝效果

- **不剪枝**：会继续探索sum > target的分支
- **剪枝**：一旦发现sum + candidates[i] > target，直接终止当前层循环

---

## 复杂度分析

**时间复杂度**：O(n^(target/min))
- 最坏情况：所有元素都是1，target非常大
- n是candidates的长度，min是最小元素

**空间复杂度**：O(target/min)
- 递归栈深度最多为target/min（每次至少选最小元素）

---

## 执行过程可视化

以`candidates = [2, 3, 6, 7], target = 7`为例：

```
backtrack(0, 0, [])
├─ i=0, 选2
│  └─ backtrack(0, 2, [2])
│     ├─ i=0, 选2
│     │  └─ backtrack(0, 4, [2,2])
│     │     ├─ i=0, 选2
│     │     │  └─ backtrack(0, 6, [2,2,2])
│     │     │     ├─ i=0, 选2 → sum=8 > 7 → break
│     │     │     └─ (剪枝，后面的更大)
│     │     ├─ i=1, 选3
│     │     │  └─ backtrack(1, 7, [2,2,3]) ✓ 收集
│     │     └─ i=2, 选6 → sum=10 > 7 → break
│     ├─ i=1, 选3
│     │  └─ backtrack(1, 5, [2,3])
│     │     ├─ i=1, 选3 → sum=8 > 7 → break
│     │     └─ (剪枝)
│     └─ i=2, 选6 → sum=8 > 7 → break
├─ i=1, 选3
│  └─ backtrack(1, 3, [3])
│     ├─ i=1, 选3
│     │  └─ backtrack(1, 6, [3,3])
│     │     ├─ i=1, 选3 → sum=9 > 7 → break
│     │     └─ (剪枝)
│     └─ i=2, 选6 → sum=9 > 7 → break
├─ i=2, 选6
│  └─ backtrack(2, 6, [6])
│     ├─ i=2, 选6 → sum=12 > 7 → break
│     └─ (剪枝)
└─ i=3, 选7
   └─ backtrack(3, 7, [7]) ✓ 收集

结果：[[2,2,3], [7]]
```

---

## 常见错误

**错误1：递归时传i+1**
```typescript
// 错误：每个元素只能用一次
backtrack(i + 1, sum + candidates[i], path);  // ❌

// 正确：允许重复使用
backtrack(i, sum + candidates[i], path);  // ✅
```

**错误2：剪枝时用continue**
```typescript
// 错误：continue只跳过当前，后面可能更小
if (sum + candidates[i] > target) {
  continue;  // ❌ 应该break
}

// 正确：排序后，后面更大，直接break
if (sum + candidates[i] > target) {
  break;  // ✅
}
```

**错误3：忘记start参数**
```typescript
// 错误：从0开始会产生[2,3]和[3,2]的重复
for (let i = 0; i < candidates.length; i++) {  // ❌

// 正确
for (let i = start; i < candidates.length; i++) {  // ✅
```

---

## 相关题目

| 题目 | 难度 | 区别 |
|-----|------|------|
| [40. 组合总和 II](https://leetcode.com/problems/combination-sum-ii/) | 中等 | 元素不可重复，数组有重复 |
| [216. 组合总和 III](https://leetcode.com/problems/combination-sum-iii/) | 中等 | 只用1-9，限定k个数 |
| [377. 组合总和 IV](https://leetcode.com/problems/combination-sum-iv/) | 中等 | 考虑排列顺序（DP） |

---

## 组合总和系列对比

| 题目 | 数组特点 | 元素使用 | 递归参数 |
|-----|---------|---------|---------|
| **39. 组合总和** | 无重复 | 可重复使用 | `backtrack(i)` |
| **40. 组合总和 II** | 有重复 | 不可重复使用 | `backtrack(i+1)` + 去重 |
| **216. 组合总和 III** | 1-9固定 | 不可重复使用 | `backtrack(i+1)` + 个数限制 |

---

## 总结

组合总和问题的核心要点：

1. **可重复选择**：递归时传`i`而不是`i + 1`
2. **避免重复组合**：使用`start`参数，只往后选
3. **排序+剪枝**：`sum + candidates[i] > target`时`break`
4. **与组合的区别**：组合是`i + 1`，组合总和是`i`

这道题是理解"可重复选择"模式的关键，掌握后可以轻松解决组合总和系列的变体问题。
```
