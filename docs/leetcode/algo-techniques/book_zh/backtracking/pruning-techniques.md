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
function combinationSum(candidates: number[], target: number) {
  candidates.sort((a, b) => a - b);
  
  function backtrack(start: number, sum: number, path: number[]) {
    if (sum === target) {
      result.push([...path]);
      return;
    }
    
    for (let i = start; i < candidates.length; i++) {
      // 剪枝：sum + candidates[i] > target
      if (sum + candidates[i] > target) break;
      
      path.push(candidates[i]);
      backtrack(i, sum + candidates[i], path);
      path.pop();
    }
  }
}
```

### 2. 排除重复剪枝

**示例**：全排列 II
```typescript
function permuteUnique(nums: number[]): number[][] {
  nums.sort((a, b) => a - b);
  
  function backtrack(path: number[], used: boolean[]) {
    // ...
    
    for (let i = 0; i < nums.length; i++) {
      if (used[i]) continue;
      
      // 剪枝：跳过重复元素
      if (i > 0 && nums[i] === nums[i-1] && !used[i-1]) {
        continue;
      }
      
      path.push(nums[i]);
      used[i] = true;
      backtrack(path, used);
      used[i] = false;
      path.pop();
    }
  }
}
```

### 3. 最优性剪枝

**示例**：组合总和最小个数
```typescript
let minCount = Infinity;

function backtrack(start: number, sum: number, path: number[]) {
  if (sum === target) {
    minCount = Math.min(minCount, path.length);
    return;
  }
  
  // 剪枝：当前路径已经不可能更优
  if (path.length >= minCount) return;
  
  // ...
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
