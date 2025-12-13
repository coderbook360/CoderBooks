# 实战：最小化最大值

> 通用问题模式

"最小化最大值"是二分答案最常见的题型之一。核心思想是通过二分答案空间，找到满足条件的最小上界。

---

## 问题模式

给定一个数组和约束条件，将数组分割或分配，使得某个"最大值"尽可能小。

典型例子：
- 分割数组，使每段和的最大值最小
- 分配任务，使最大完成时间最小
- 划分资源，使最大负载最小
- 安排工作，使最忙工人的工作量最小

---

## 二分答案的三要素

**为什么能用二分？**

1. **答案空间确定**：最大值的范围是 [minPossible, maxPossible]
2. **单调性**：允许的最大值越大，越容易满足约束
3. **可验证性**：给定一个最大值上界，可以贪心判断是否可行

```
最大值上界:   10  20  30  40  50  60  70  80  90  100
能否满足约束: ✗   ✗   ✗   ✓   ✓   ✓   ✓   ✓   ✓   ✓
                        ↑
                    第一个可行的值 = 答案
```

---

## 通用解法框架

```typescript
function minimizeMaxValue(arr: number[], constraint: number): number {
  // 1. 确定答案范围
  let left = getMinPossible(arr);   // 下界：单个元素的最大值
  let right = getMaxPossible(arr);  // 上界：所有元素之和
  
  // 2. 二分答案
  while (left < right) {
    const mid = left + Math.floor((right - left) / 2);
    
    // 3. 判断 mid 是否可行
    if (isFeasible(arr, mid, constraint)) {
      right = mid;  // 可行，尝试更小
    } else {
      left = mid + 1;  // 不可行，排除
    }
  }
  
  return left;
}

function isFeasible(arr: number[], maxAllowed: number, constraint: number): boolean {
  // 贪心验证：在"最大值不超过 maxAllowed"的约束下
  // 是否能满足 constraint
}
```

---

## 模板分析

### 1. 边界确定

```typescript
// 下界：必须能容纳最大的单个元素
let left = Math.max(...arr);

// 上界：所有元素都在一组
let right = arr.reduce((a, b) => a + b, 0);
```

### 2. 为什么用 `left < right` 而非 `left <= right`

配合 `right = mid`（而非 `right = mid - 1`），确保：
- mid 可行时保留 mid 作为候选
- 最终 left === right 就是答案

### 3. check 函数的贪心逻辑

```typescript
function isFeasible(arr: number[], maxAllowed: number, constraint: number): boolean {
  let groups = 1;
  let currentSum = 0;
  
  for (const num of arr) {
    if (currentSum + num > maxAllowed) {
      groups++;
      currentSum = num;
    } else {
      currentSum += num;
    }
  }
  
  return groups <= constraint;
}
```

**贪心策略**：尽可能把更多元素放在当前组，直到超过上界才开新组。

---

## 示例1：分割数组最大值最小（LeetCode 410）

```typescript
function splitArray(nums: number[], k: number): number {
  let left = Math.max(...nums);
  let right = nums.reduce((a, b) => a + b, 0);
  
  while (left < right) {
    const mid = left + Math.floor((right - left) / 2);
    
    if (canSplit(nums, mid, k)) {
      right = mid;
    } else {
      left = mid + 1;
    }
  }
  
  return left;
}

function canSplit(nums: number[], maxSum: number, k: number): boolean {
  let groups = 1;
  let currentSum = 0;
  
  for (const num of nums) {
    if (currentSum + num > maxSum) {
      groups++;
      currentSum = num;
    } else {
      currentSum += num;
    }
  }
  
  return groups <= k;
}
```

---

## 示例2：分配工作最小化最大工作时间（LeetCode 1723）

这是一个更复杂的场景，因为工作可以任意分配（不要求连续）：

```typescript
function minimumTimeRequired(jobs: number[], k: number): number {
  let left = Math.max(...jobs);
  let right = jobs.reduce((a, b) => a + b, 0);
  
  while (left < right) {
    const mid = left + Math.floor((right - left) / 2);
    
    if (canAssign(jobs, k, mid)) {
      right = mid;
    } else {
      left = mid + 1;
    }
  }
  
  return left;
}

function canAssign(jobs: number[], k: number, maxTime: number): boolean {
  const workers = new Array(k).fill(0);
  
  // 对工作降序排序，优先分配大任务
  const sortedJobs = [...jobs].sort((a, b) => b - a);
  
  return backtrack(sortedJobs, workers, 0, maxTime);
}

function backtrack(
  jobs: number[], 
  workers: number[], 
  idx: number, 
  maxTime: number
): boolean {
  if (idx === jobs.length) return true;
  
  // 用 Set 去重，避免重复尝试相同状态
  const tried = new Set<number>();
  
  for (let i = 0; i < workers.length; i++) {
    if (tried.has(workers[i])) continue;
    tried.add(workers[i]);
    
    if (workers[i] + jobs[idx] <= maxTime) {
      workers[i] += jobs[idx];
      if (backtrack(jobs, workers, idx + 1, maxTime)) {
        return true;
      }
      workers[i] -= jobs[idx];
    }
    
    // 剪枝：如果当前工人空闲都不行，后面的也不用试了
    if (workers[i] === 0) break;
  }
  
  return false;
}
```

---

## 执行过程可视化

```
nums = [7, 2, 5, 10, 8], k = 2

left = 10, right = 32

第1轮：mid = 21
       check(21): 7+2+5=14, 10+8=18, 需要2组 <= 2 ✓
       right = 21

第2轮：mid = 15
       check(15): 7+2+5=14, 10 > 15-14, 新组
                  10, 8 > 15-10, 新组
                  需要3组 > 2 ✗
       left = 16

第3轮：mid = 18
       check(18): 7+2+5=14, 10 > 18-14, 新组
                  10+8=18 <= 18
                  需要2组 <= 2 ✓
       right = 18

第4轮：mid = 17
       check(17): 7+2+5=14, 10 > 17-14, 新组
                  10, 8 > 17-10, 新组
                  需要3组 > 2 ✗
       left = 18

left === right === 18，返回 18 ✓
```

---

## 复杂度分析

| check 函数类型 | 时间复杂度 |
|---------------|-----------|
| 贪心验证（连续分割） | O(n) |
| 回溯验证（任意分配） | O(k^n)，但有剪枝优化 |

**总时间复杂度**：O(n log S)（S = sum(arr)），假设 check 是 O(n)

**空间复杂度**：O(1) 或 O(k)（取决于 check 函数）

---

## 与"最大化最小值"的对比

| 类型 | 目标 | 二分方向 | 更新规则 |
|-----|------|---------|---------|
| 最小化最大值 | 减小上界 | 找第一个可行 | right = mid |
| 最大化最小值 | 增大下界 | 找最后一个可行 | left = mid（需上取整） |

---

## 常见错误

**错误1：边界设置错误**
```typescript
// 错误：left 从 0 开始
let left = 0;  // ❌ 最大值至少是 max(arr)

// 正确
let left = Math.max(...arr);  // ✅
```

**错误2：check 函数贪心方向错误**
```typescript
// 应该是尽量往当前组加，直到超限才开新组
```

**错误3：混淆两种模板**
```typescript
// 最小化最大值用 right = mid
// 最大化最小值用 left = mid + 上取整
```

---

## 相关题目

| 题目 | 难度 | 说明 |
|-----|------|------|
| [410. 分割数组的最大值](https://leetcode.com/problems/split-array-largest-sum/) | 困难 | 连续分割 |
| [1011. 在 D 天内送达包裹](https://leetcode.com/problems/capacity-to-ship-packages-within-d-days/) | 中等 | 运载能力 |
| [1723. 完成所有工作的最短时间](https://leetcode.com/problems/find-minimum-time-to-finish-all-jobs/) | 困难 | 任意分配+回溯 |
| [2226. 每个小孩最多能分到多少糖果](https://leetcode.com/problems/maximum-candies-allocated-to-k-children/) | 中等 | 最大化最小值 |

---

## 总结

最小化最大值的核心要点：

1. **识别模式**："使最大值尽可能小"、"最大负载最小化"
2. **边界确定**：left = max(单个元素), right = sum(所有元素)
3. **二分模板**：`left < right` + `right = mid`
4. **贪心 check**：尽量往当前组加，超限才开新组
5. **对比记忆**：与"最大化最小值"的 mid 取整方向相反
