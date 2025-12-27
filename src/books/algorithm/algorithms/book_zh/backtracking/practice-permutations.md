# 实战：全排列

> LeetCode 46. 全排列 | 难度：中等

回溯算法的经典入门题，也是理解"选择-探索-撤销"三步模式的最佳案例。

---

## 问题描述

给定一个不含重复数字的数组`nums`，返回其所有可能的全排列。

**示例**：
```
输入：nums = [1, 2, 3]
输出：[
  [1, 2, 3], [1, 3, 2],
  [2, 1, 3], [2, 3, 1],
  [3, 1, 2], [3, 2, 1]
]

输入：nums = [0, 1]
输出：[[0, 1], [1, 0]]

输入：nums = [1]
输出：[[1]]
```

**排列数量**：n个不同元素的全排列有n!种。

---

## 思路分析

### 决策树模型

全排列可以看作一棵决策树：
- 每一层代表一个位置
- 每个节点的分支代表可选的元素
- 从根到叶子的路径就是一个排列

```
                    []
           /        |        \
        [1]       [2]        [3]
       /   \     /   \      /   \
    [1,2] [1,3] [2,1] [2,3] [3,1] [3,2]
      |     |     |     |     |     |
  [1,2,3][1,3,2][2,1,3][2,3,1][3,1,2][3,2,1]
```

**核心问题**：如何避免重复使用同一个元素？

**解决方案**：使用`used`数组标记哪些元素已经使用。

---

## 解法一：used数组标记（推荐）

```typescript
/**
 * 全排列 - 回溯算法经典模板
 * 
 * 【问题抽象】
 * 从 n 个不同元素中取 n 个元素的所有排列
 * 排列关心顺序：[1,2] 和 [2,1] 是不同的排列
 * 
 * 【与组合的区别】
 * - 排列：每个位置可以选任意未使用的元素 → 用 used 数组标记
 * - 组合：只能往后选，避免重复 → 用 start 参数
 * 
 * 【回溯三步模式】
 * 1. 做选择：把元素加入路径，标记为已使用
 * 2. 递归探索：继续构建下一个位置
 * 3. 撤销选择：把元素从路径移除，取消标记
 * 
 * 时间复杂度：O(n! × n) - 生成 n! 个排列，每个复制需要 O(n)
 * 空间复杂度：O(n) - 递归深度 + path + used 数组
 */
function permute(nums: number[]): number[][] {
  const result: number[][] = [];
  // used[i] 标记 nums[i] 是否已经在当前路径中
  const used = new Array(nums.length).fill(false);
  
  /**
   * 回溯函数
   * @param path - 当前已选择的元素序列
   */
  function backtrack(path: number[]) {
    // ========================================
    // 终止条件：路径长度等于数组长度，找到一个完整排列
    // ========================================
    if (path.length === nums.length) {
      // ★★★ 注意：必须用 [...path] 创建副本 ★★★
      // 如果直接 push(path)，result 中所有元素会指向同一个数组
      // 后续的修改会影响已保存的结果
      result.push([...path]);
      return;
    }
    
    // ========================================
    // 选择阶段：遍历所有可选元素
    // ========================================
    // 排列的关键：每个位置可以选择任意未使用的元素
    for (let i = 0; i < nums.length; i++) {
      // 跳过已使用的元素（避免同一元素使用多次）
      if (used[i]) continue;
      
      // -------- 1. 做选择 --------
      path.push(nums[i]);   // 把 nums[i] 加入路径
      used[i] = true;       // 标记为已使用
      
      // -------- 2. 递归探索 --------
      // 继续构建下一个位置
      backtrack(path);
      
      // -------- 3. 撤销选择（回溯）--------
      // 尝试其他选择之前，必须撤销当前选择
      used[i] = false;      // 取消标记
      path.pop();           // 从路径移除
    }
  }
  
  // 从空路径开始
  backtrack([]);
  return result;
}
```

### 代码详解

**状态变量**：
- `path`：当前已选择的元素序列
- `used[i]`：第i个元素是否已被使用

**三步模式**：
1. **做选择**：`path.push(nums[i])` + `used[i] = true`
2. **递归探索**：`backtrack(path)`
3. **撤销选择**：`used[i] = false` + `path.pop()`

**为什么要拷贝？**
```typescript
result.push([...path]);  // ✅ 拷贝path
result.push(path);       // ❌ 引用同一数组，后续修改会影响结果
```

---

## 解法二：交换元素法

另一种思路：通过交换元素来生成排列，不需要额外的`used`数组。

```typescript
/**
 * 全排列 - 交换元素法
 * 
 * 【核心思想】
 * 把"生成排列"看作"依次确定每个位置的元素"
 * 对于位置 start，尝试把 start 之后的每个元素放到 start 位置
 * 
 * 【为什么交换可以生成所有排列？】
 * 位置 0 有 n 种选择
 * 位置 1 有 n-1 种选择（排除已确定的）
 * ...
 * 总共 n! 种排列
 * 
 * 【与 used 数组法的区别】
 * - used 数组法：需要额外空间存储状态
 * - 交换法：原地操作，空间更优
 * 
 * 时间复杂度：O(n! × n)
 * 空间复杂度：O(n) - 只有递归栈
 */
function permute(nums: number[]): number[][] {
  const result: number[][] = [];
  
  /**
   * 回溯函数
   * @param start - 当前要确定的位置（0 到 start-1 已经确定）
   */
  function backtrack(start: number) {
    // 终止条件：所有位置都已确定
    if (start === nums.length) {
      // 当前 nums 就是一个完整的排列
      result.push([...nums]);
      return;
    }
    
    // 尝试将每个元素放到 start 位置
    // i 从 start 开始，因为 0 到 start-1 已经确定
    for (let i = start; i < nums.length; i++) {
      // -------- 1. 做选择：交换 --------
      // 把 nums[i] 放到 start 位置
      [nums[start], nums[i]] = [nums[i], nums[start]];
      
      // -------- 2. 递归：处理下一个位置 --------
      backtrack(start + 1);
      
      // -------- 3. 撤销选择：交换回来 --------
      // 恢复原状，尝试其他选择
      [nums[start], nums[i]] = [nums[i], nums[start]];
    }
  }
  
  // 从位置 0 开始确定
  backtrack(0);
  return result;
}
```

### 交换法的优势

- **空间优化**：不需要`used`数组和`path`数组
- **原地操作**：直接在原数组上操作

### 交换法的劣势

- **理解难度**：不如used数组直观
- **顺序问题**：生成的排列顺序与used法不同

---

## 解法三：插入法

从空开始，每次在不同位置插入新元素：

```typescript
function permute(nums: number[]): number[][] {
  let result: number[][] = [[]];
  
  for (const num of nums) {
    const newResult: number[][] = [];
    
    for (const perm of result) {
      // 在每个位置插入num
      for (let i = 0; i <= perm.length; i++) {
        const newPerm = [...perm.slice(0, i), num, ...perm.slice(i)];
        newResult.push(newPerm);
      }
    }
    
    result = newResult;
  }
  
  return result;
}
```

**过程演示**（nums = [1, 2, 3]）：
```
初始：[[]]
插入1：[[1]]
插入2：[[2,1], [1,2]]
插入3：[[3,2,1], [2,3,1], [2,1,3], [3,1,2], [1,3,2], [1,2,3]]
```

---

## 复杂度分析

**时间复杂度**：O(n! × n)
- 共有n!个排列
- 每个排列需要O(n)时间来拷贝

**空间复杂度**：O(n)
- 递归栈深度为n
- used数组长度为n
- 不计结果存储空间

---

## 执行过程可视化

以`nums = [1, 2, 3]`为例：

```
backtrack([])
├─ 选择1 → backtrack([1])
│  ├─ 选择2 → backtrack([1,2])
│  │  └─ 选择3 → backtrack([1,2,3]) ✓ 收集结果
│  └─ 选择3 → backtrack([1,3])
│     └─ 选择2 → backtrack([1,3,2]) ✓ 收集结果
├─ 选择2 → backtrack([2])
│  ├─ 选择1 → backtrack([2,1])
│  │  └─ 选择3 → backtrack([2,1,3]) ✓ 收集结果
│  └─ 选择3 → backtrack([2,3])
│     └─ 选择1 → backtrack([2,3,1]) ✓ 收集结果
└─ 选择3 → backtrack([3])
   ├─ 选择1 → backtrack([3,1])
   │  └─ 选择2 → backtrack([3,1,2]) ✓ 收集结果
   └─ 选择2 → backtrack([3,2])
      └─ 选择1 → backtrack([3,2,1]) ✓ 收集结果
```

---

## 常见错误

**错误1：忘记拷贝path**
```typescript
// 错误
result.push(path);  // ❌ 所有结果都指向同一个数组

// 正确
result.push([...path]);  // ✅ 创建新数组
```

**错误2：忘记撤销选择**
```typescript
// 错误
path.push(nums[i]);
used[i] = true;
backtrack(path);
// 忘记 used[i] = false; path.pop();  ❌

// 正确
path.push(nums[i]);
used[i] = true;
backtrack(path);
used[i] = false;  // ✅
path.pop();       // ✅
```

**错误3：终止条件位置错误**
```typescript
// 应该在循环之前检查终止条件
function backtrack(path: number[]) {
  if (path.length === nums.length) {  // ✅ 先检查
    result.push([...path]);
    return;
  }
  
  for (let i = 0; i < nums.length; i++) {
    // ...
  }
}
```

---

## 相关题目

| 题目 | 难度 | 说明 |
|-----|------|------|
| [47. 全排列 II](https://leetcode.com/problems/permutations-ii/) | 中等 | 含重复元素，需去重 |
| [31. 下一个排列](https://leetcode.com/problems/next-permutation/) | 中等 | 找字典序下一个 |
| [60. 排列序列](https://leetcode.com/problems/permutation-sequence/) | 困难 | 找第k个排列 |

---

## 总结

全排列问题是理解回溯算法的最佳入门题：

1. **决策树模型**：将问题抽象为树的遍历
2. **三步模式**：选择 → 探索 → 撤销
3. **used数组**：标记已使用元素，避免重复
4. **深拷贝**：收集结果时必须拷贝

掌握这个模板后，可以轻松解决组合、子集、棋盘等回溯问题。
