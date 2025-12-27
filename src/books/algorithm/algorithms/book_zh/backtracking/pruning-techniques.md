# 剪枝优化技巧

剪枝是提升回溯算法效率的关键。

---

## 什么是剪枝？

**定义**：提前排除不可能产生答案的分支，减少搜索空间。

**比喻**：砍掉决策树上的"枯枝"。

---

## 剪枝类型

### 1. 可行性剪枝

**示例**：组合总和
```typescript
/**
 * 组合总和 - 可行性剪枝示例
 * 
 * 问题：从 candidates 中选择若干数，使和等于 target
 * 
 * 【可行性剪枝的核心思想】
 * 如果当前路径已经不可能达到目标，就没必要继续探索了
 * 
 * 本例中的剪枝条件：sum + candidates[i] > target
 * 意思是：如果当前和加上最小可选元素已经超过目标，
 * 那么加上更大的元素更不可能达到目标，直接终止这一分支
 * 
 * 【为什么需要排序？】
 * 排序后，candidates[i] 是当前可选的最小值
 * 如果 sum + candidates[i] > target，那么 sum + candidates[i+1], candidates[i+2]... 也都 > target
 * 所以可以直接 break 终止循环，而不是 continue 跳过当前元素
 */
function combinationSum(candidates: number[], target: number) {
  // 排序是剪枝的前提条件！
  // 排序后可以在超出目标时直接 break，而不是遍历完所有元素
  candidates.sort((a, b) => a - b);
  
  function backtrack(start: number, sum: number, path: number[]) {
    // 找到一个有效组合
    if (sum === target) {
      result.push([...path]);
      return;
    }
    
    for (let i = start; i < candidates.length; i++) {
      // ★★★ 可行性剪枝 ★★★
      // 关键判断：如果当前和 + 当前元素 > 目标值
      // 由于数组已排序，后面的元素更大，不可能有解
      // 直接终止当前分支，而不是继续尝试
      if (sum + candidates[i] > target) break;
      
      // 做出选择
      path.push(candidates[i]);
      // 递归：注意这里传 i 而不是 i+1，允许重复选择同一元素
      backtrack(i, sum + candidates[i], path);
      // 撤销选择（回溯）
      path.pop();
    }
  }
}
```

### 2. 排除重复剪枝

**示例**：全排列 II
```typescript
/**
 * 全排列 II - 排除重复剪枝示例
 * 
 * 问题：给定一个可包含重复数字的序列，返回所有不重复的全排列
 * 
 * 【重复排列的来源】
 * 输入 [1, 1, 2]，如果不剪枝：
 * - 选第1个1，再选第2个1，再选2 → [1,1,2]
 * - 选第2个1，再选第1个1，再选2 → [1,1,2] ← 重复！
 * 
 * 【排除重复剪枝的核心思想】
 * 对于重复元素，我们规定一个选择顺序：
 * "相同元素必须按照它们在数组中的顺序被选择"
 * 即：第2个1只能在第1个1被使用后才能被选择
 * 
 * 剪枝条件：nums[i] === nums[i-1] && !used[i-1]
 * 意思是：如果当前元素和前一个元素相同，且前一个元素还没被使用
 * 那么跳过当前元素（否则会产生重复排列）
 * 
 * 【为什么 !used[i-1] 而不是 used[i-1]？】
 * !used[i-1]：表示前一个相同元素不在当前路径中
 *   → 说明我们正在同一层级尝试不同的起点，会产生重复
 *   → 需要跳过
 * 
 * used[i-1]：表示前一个相同元素在当前路径中
 *   → 说明我们是在不同层级选择，这是正常的递归
 *   → 不需要跳过
 */
function permuteUnique(nums: number[]): number[][] {
  // 排序是剪枝的前提！
  // 排序后相同元素相邻，方便判断重复
  nums.sort((a, b) => a - b);
  
  function backtrack(path: number[], used: boolean[]) {
    // ...（省略基础情况和结果收集）
    
    for (let i = 0; i < nums.length; i++) {
      // 跳过已使用的元素
      if (used[i]) continue;
      
      // ★★★ 排除重复剪枝 ★★★
      // 条件1：当前元素和前一个元素相同
      // 条件2：前一个元素没有被使用（说明我们在同一层尝试相同值）
      // 两个条件都满足时，跳过当前元素以避免重复
      if (i > 0 && nums[i] === nums[i-1] && !used[i-1]) {
        continue;
      }
      
      // 做出选择
      path.push(nums[i]);
      used[i] = true;
      
      // 递归到下一层
      backtrack(path, used);
      
      // 撤销选择
      used[i] = false;
      path.pop();
    }
  }
}
```

### 3. 最优性剪枝

**示例**：组合总和最小个数
```typescript
/**
 * 最优性剪枝示例 - 找到组合总和所需的最少元素个数
 * 
 * 【最优性剪枝的核心思想】
 * 如果当前路径已经不可能比已知最优解更好，就终止探索
 * 
 * 适用场景：
 * - 求最小值问题：当前路径长度 >= 已知最小值
 * - 求最大值问题：当前值 + 剩余最大可能值 <= 已知最大值
 * - 求最优解问题：当前解的代价 >= 已知最优代价
 * 
 * 本例中的剪枝条件：path.length >= minCount
 * 意思是：如果当前路径的元素个数已经 >= 已知的最少个数
 * 即使找到解也不会更优，直接终止
 */
let minCount = Infinity;  // 记录当前找到的最优解（最少元素个数）

function backtrack(start: number, sum: number, path: number[]) {
  // 找到一个有效组合，更新最优解
  if (sum === target) {
    minCount = Math.min(minCount, path.length);
    return;
  }
  
  // ★★★ 最优性剪枝 ★★★
  // 如果当前路径长度已经 >= 最优解，继续探索没有意义
  // 即使后面能找到解，元素个数也不会比现在少
  // 注意：这里用 >= 而不是 >，因为我们要找更少的
  if (path.length >= minCount) return;
  
  // 可选优化：如果加上剩余最小元素数量仍 >= minCount，也可剪枝
  // 例如：(target - sum) / maxCandidate 是还需要的最少元素数
  
  // ...（省略循环和递归逻辑）
}
```

---

## 剪枝技巧

**1. 排序**：
- 方便提前终止（break）
- 方便去重

**2. 提前计算**：
- 剩余元素数量
- 当前和/积

**3. 记忆化**：
- 记录已访问状态
- 避免重复搜索

---

## 效果对比

**无剪枝**（组合总和，target=7）：
- 搜索节点：~1000
- 时间：100ms

**有剪枝**：
- 搜索节点：~50
- 时间：5ms

**提升**：20倍！

---

## 关键要点

1. **排序助剪枝**：提前终止、去重
2. **三种剪枝**：可行性、重复、最优性
3. **权衡**：剪枝判断也有代价
4. **实践**：多练习识别剪枝机会
