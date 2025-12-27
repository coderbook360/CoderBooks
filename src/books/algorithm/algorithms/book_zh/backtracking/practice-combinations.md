# 实战：组合

> LeetCode 77. 组合 | 难度：中等

从n个数中选k个，是理解"组合"与"排列"区别的关键题目。

---

## 问题描述

给定两个整数`n`和`k`，返回范围`[1, n]`中所有可能的`k`个数的组合。

**示例**：
```
输入：n = 4, k = 2
输出：[[1, 2], [1, 3], [1, 4], [2, 3], [2, 4], [3, 4]]

输入：n = 1, k = 1
输出：[[1]]
```

**组合数量**：C(n, k) = n! / (k! × (n-k)!)

---

## 思路分析

### 组合 vs 排列

| 特性 | 排列 | 组合 |
|-----|------|------|
| 顺序 | 有序，[1,2] ≠ [2,1] | 无序，[1,2] = [2,1] |
| 数量 | A(n,k) = n!/(n-k)! | C(n,k) = n!/(k!(n-k)!) |
| 选择 | 从任意位置选 | 从start开始选 |

**核心区别**：组合不关心顺序，所以我们使用`start`变量确保只往后选，避免重复。

### 决策树模型（n=4, k=2）

```
                []
      /     |      \      \
    [1]    [2]    [3]    [4]
   /|\      |\      \
[1,2][1,3][1,4] [2,3][2,4] [3,4]

结果：[[1,2], [1,3], [1,4], [2,3], [2,4], [3,4]]
```

注意：选择了1之后，只能选2、3、4（不能选1之前的数）。

---

## 解法一：基础回溯

```typescript
/**
 * 组合问题 - 回溯算法基础模板
 * 
 * 【问题抽象】
 * 从 [1, n] 中选择 k 个数的所有组合
 * 组合不关心顺序：[1,2] 和 [2,1] 是同一个组合
 * 
 * 【组合 vs 排列的关键区别】
 * - 排列：每个位置可以选任意未使用的元素 → 用 used 数组
 * - 组合：只能往后选，不能回头 → 用 start 参数
 * 
 * 【为什么用 start 就能避免重复？】
 * 假设 n=4, k=2：
 * - 选了 1 之后，只能从 [2,3,4] 中选
 * - 选了 2 之后，只能从 [3,4] 中选
 * - 这样 [1,2] 和 [2,1] 只会以 [1,2] 的形式出现一次
 * 
 * 时间复杂度：O(C(n,k) × k) - 生成 C(n,k) 个组合，每个组合需要 O(k) 复制
 * 空间复杂度：O(k) - 递归深度和 path 的长度
 */
function combine(n: number, k: number): number[][] {
  const result: number[][] = [];
  
  /**
   * 回溯函数
   * @param start - 当前可选范围的起点（只能选 start 到 n）
   * @param path - 当前已选择的元素路径
   */
  function backtrack(start: number, path: number[]) {
    // ========================================
    // 终止条件：收集到 k 个数
    // ========================================
    if (path.length === k) {
      // 注意：必须用 [...path] 创建副本
      // 否则 result 中所有元素会指向同一个数组
      result.push([...path]);
      return;
    }
    
    // ========================================
    // 选择阶段：从 start 到 n 依次尝试
    // ========================================
    // 为什么从 start 开始？确保只往后选，避免重复组合
    for (let i = start; i <= n; i++) {
      // 做选择：把 i 加入当前路径
      path.push(i);
      
      // 递归：继续选择下一个数
      // 注意：传入 i + 1，确保下一个数比当前大
      // 这是组合问题避免重复的核心！
      backtrack(i + 1, path);
      
      // 撤销选择（回溯）：把 i 从路径中移除
      // 这样才能尝试其他选择
      path.pop();
    }
  }
  
  // 从 1 开始，初始路径为空
  backtrack(1, []);
  return result;
}
```

### 关键点

**为什么从`start`开始？**
- 排列：每个元素都可以选，用`used`数组标记
- 组合：只往后选，用`start`参数控制

**为什么是`i + 1`？**
- `backtrack(i + 1, path)`：下一个元素从`i+1`开始
- 确保每个元素只选一次，且按顺序选

---

## 解法二：剪枝优化

**优化思路**：如果剩余元素不够k个，提前终止。

```typescript
/**
 * 组合问题 - 剪枝优化版本
 * 
 * 【剪枝的核心思想】
 * 如果剩余可选的元素数量 < 还需要选择的数量，就没必要继续了
 * 
 * 【为什么这个剪枝有效？】
 * 例如 n=4, k=3，当 path=[3] 时：
 * - 还需要选 2 个数
 * - 剩余可选：[4]，只有 1 个
 * - 1 < 2，不可能凑够 3 个，直接返回
 * 
 * 【剪枝效果】
 * - n=10, k=5 时，剪枝可以减少约 50% 的搜索
 * - n 越大、k 越接近 n/2，剪枝效果越明显
 */
function combine(n: number, k: number): number[][] {
  const result: number[][] = [];
  
  function backtrack(start: number, path: number[]) {
    // 终止条件
    if (path.length === k) {
      result.push([...path]);
      return;
    }
    
    // ★★★ 剪枝优化 ★★★
    // need: 还需要选择的个数
    // remain: 从 start 到 n，剩余可选的个数
    const need = k - path.length;
    const remain = n - start + 1;
    
    // 如果剩余不够，提前终止这个分支
    if (remain < need) return;
    
    for (let i = start; i <= n; i++) {
      path.push(i);
      backtrack(i + 1, path);
      path.pop();
    }
  }
  
  backtrack(1, []);
  return result;
}
```

### 剪枝效果

以`n = 4, k = 3`为例：
- 不剪枝：会尝试`[4]`，然后发现后面没元素了
- 剪枝：在`start=4`时，`remain=1`，`need=3`，直接返回

**优化写法**（更简洁）：

```typescript
/**
 * 将剪枝条件融入循环边界
 * 
 * 循环上界 = n - (k - path.length) + 1
 * 
 * 推导过程：
 * - 还需要选 k - path.length 个数
 * - 从位置 i 开始选，可选范围是 [i, n]，共 n - i + 1 个
 * - 需要 n - i + 1 >= k - path.length
 * - 即 i <= n - (k - path.length) + 1
 */
for (let i = start; i <= n - (k - path.length) + 1; i++) {
  path.push(i);
  backtrack(i + 1, path);
  path.pop();
}
```

---

## 解法三：二进制枚举

组合问题可以用二进制位表示每个元素的选择状态：

```typescript
function combine(n: number, k: number): number[][] {
  const result: number[][] = [];
  
  // 枚举所有2^n种状态
  for (let mask = 0; mask < (1 << n); mask++) {
    // 检查是否恰好有k个1
    if (countBits(mask) === k) {
      const combination: number[] = [];
      for (let i = 0; i < n; i++) {
        if (mask & (1 << i)) {
          combination.push(i + 1);
        }
      }
      result.push(combination);
    }
  }
  
  return result;
}

function countBits(x: number): number {
  let count = 0;
  while (x) {
    count += x & 1;
    x >>= 1;
  }
  return count;
}
```

**适用场景**：n较小（≤20）时可用。

---

## 复杂度分析

**时间复杂度**：O(C(n,k) × k)
- C(n,k)个组合
- 每个组合需要O(k)拷贝

**空间复杂度**：O(k)
- 递归栈深度为k
- path数组长度为k

---

## 执行过程可视化

以`n = 4, k = 2`为例：

```
backtrack(1, [])
├─ i=1, path=[1]
│  └─ backtrack(2, [1])
│     ├─ i=2, path=[1,2] → 收集 ✓
│     ├─ i=3, path=[1,3] → 收集 ✓
│     └─ i=4, path=[1,4] → 收集 ✓
├─ i=2, path=[2]
│  └─ backtrack(3, [2])
│     ├─ i=3, path=[2,3] → 收集 ✓
│     └─ i=4, path=[2,4] → 收集 ✓
├─ i=3, path=[3]
│  └─ backtrack(4, [3])
│     └─ i=4, path=[3,4] → 收集 ✓
└─ i=4, path=[4]
   └─ backtrack(5, [4])
      └─ （剪枝：remain=0 < need=1）

结果：[[1,2], [1,3], [1,4], [2,3], [2,4], [3,4]]
```

---

## 常见错误

**错误1：忘记从start开始**
```typescript
// 错误：从0开始会产生重复
for (let i = 0; i < n; i++) {  // ❌
  // [1,2] 和 [2,1] 都会被生成
}

// 正确
for (let i = start; i <= n; i++) {  // ✅
  // 只会生成 [1,2]
}
```

**错误2：下一层start参数错误**
```typescript
// 错误：start不变，会重复选择
backtrack(start, path);  // ❌ 可能选择同一个元素

// 正确
backtrack(i + 1, path);  // ✅ 从下一个元素开始
```

---

## 组合问题模板

```typescript
function combinationTemplate(nums: number[], target: number): number[][] {
  const result: number[][] = [];
  
  function backtrack(start: number, path: number[]) {
    // 1. 终止条件
    if (path.length === target) {
      result.push([...path]);
      return;
    }
    
    // 2. 剪枝（可选）
    // if (剩余不够) return;
    
    // 3. 遍历选择
    for (let i = start; i < nums.length; i++) {
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

## 相关题目

| 题目 | 难度 | 说明 |
|-----|------|------|
| [39. 组合总和](https://leetcode.com/problems/combination-sum/) | 中等 | 可重复使用元素 |
| [40. 组合总和 II](https://leetcode.com/problems/combination-sum-ii/) | 中等 | 有重复元素 |
| [216. 组合总和 III](https://leetcode.com/problems/combination-sum-iii/) | 中等 | 限定1-9 |
| [78. 子集](https://leetcode.com/problems/subsets/) | 中等 | 收集所有节点 |

---

## 总结

组合问题的核心要点：

1. **使用start参数**：确保只往后选，避免重复
2. **递归时i+1**：每个元素只能选一次
3. **剪枝优化**：剩余元素不够时提前终止
4. **组合数学**：结果数量是C(n, k)

组合是回溯问题的基础模式之一，掌握后可以轻松扩展到组合总和、子集等变体问题。
