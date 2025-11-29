# 剪枝优化技巧

剪枝是回溯算法的核心优化手段。

## 什么是剪枝

回溯遍历决策树，剪枝就是**提前放弃**那些不可能产生有效解的分支。

就像园艺师修剪树枝，去掉不需要的部分。

## 剪枝的威力

假设一个问题有10层决策，每层2个选择：
- 不剪枝：2^10 = 1024个节点
- 每层剪掉一半：约32个节点

剪枝可以将指数级复杂度变得可行。

## 剪枝的类型

### 1. 可行性剪枝

当前状态已经不可能产生有效解，立即返回。

```javascript
function backtrack(path, sum, target) {
    // 剪枝：sum已经超过target
    if (sum > target) return;
    
    // ... 继续搜索
}
```

### 2. 最优性剪枝

当前状态不可能产生比已知解更优的解。

```javascript
let minCost = Infinity;

function backtrack(path, cost) {
    // 剪枝：当前成本已经超过最优解
    if (cost >= minCost) return;
    
    if (是完整解) {
        minCost = Math.min(minCost, cost);
        return;
    }
    // ... 继续搜索
}
```

### 3. 排序剪枝

先对数据排序，利用有序性剪枝。

```javascript
function combinationSum(candidates, target) {
    candidates.sort((a, b) => a - b);  // 排序
    
    function backtrack(start, path, sum) {
        if (sum === target) {
            result.push([...path]);
            return;
        }
        
        for (let i = start; i < candidates.length; i++) {
            // 剪枝：后面的数更大，sum只会更大
            if (sum + candidates[i] > target) break;
            
            path.push(candidates[i]);
            backtrack(i, path, sum + candidates[i]);
            path.pop();
        }
    }
}
```

### 4. 去重剪枝

避免产生重复的解。

```javascript
function permuteUnique(nums) {
    nums.sort((a, b) => a - b);
    
    function backtrack(path, used) {
        if (path.length === nums.length) {
            result.push([...path]);
            return;
        }
        
        for (let i = 0; i < nums.length; i++) {
            if (used[i]) continue;
            
            // 去重剪枝：跳过相同的数
            if (i > 0 && nums[i] === nums[i-1] && !used[i-1]) continue;
            
            used[i] = true;
            path.push(nums[i]);
            backtrack(path, used);
            path.pop();
            used[i] = false;
        }
    }
}
```

## 剪枝的位置

剪枝可以在两个位置：

### 1. 进入递归前（推荐）

```javascript
for (let i = start; i < n; i++) {
    if (不满足条件) continue;  // 剪枝
    
    backtrack(i + 1);
}
```

### 2. 进入递归后

```javascript
function backtrack(index) {
    if (不满足条件) return;  // 剪枝
    
    // ... 继续处理
}
```

进入递归前剪枝更高效，因为避免了函数调用开销。

## 实例：组合总和II的剪枝

```javascript
function combinationSum2(candidates, target) {
    const result = [];
    candidates.sort((a, b) => a - b);
    
    function backtrack(start, path, sum) {
        if (sum === target) {
            result.push([...path]);
            return;
        }
        
        for (let i = start; i < candidates.length; i++) {
            // 剪枝1：超过目标
            if (sum + candidates[i] > target) break;
            
            // 剪枝2：去重
            if (i > start && candidates[i] === candidates[i-1]) continue;
            
            path.push(candidates[i]);
            backtrack(i + 1, path, sum + candidates[i]);
            path.pop();
        }
    }
    
    backtrack(0, [], 0);
    return result;
}
```

## N皇后的剪枝

N皇后问题展示了高效剪枝的威力：

```javascript
function solveNQueens(n) {
    const result = [];
    const cols = new Set();      // 占用的列
    const diag1 = new Set();     // 占用的主对角线
    const diag2 = new Set();     // 占用的副对角线
    
    function backtrack(row, board) {
        if (row === n) {
            result.push(board.map(r => r.join('')));
            return;
        }
        
        for (let col = 0; col < n; col++) {
            // 剪枝：检查是否冲突
            if (cols.has(col)) continue;
            if (diag1.has(row - col)) continue;
            if (diag2.has(row + col)) continue;
            
            // 做选择
            cols.add(col);
            diag1.add(row - col);
            diag2.add(row + col);
            board[row][col] = 'Q';
            
            backtrack(row + 1, board);
            
            // 撤销选择
            cols.delete(col);
            diag1.delete(row - col);
            diag2.delete(row + col);
            board[row][col] = '.';
        }
    }
    
    const board = Array.from({length: n}, () => Array(n).fill('.'));
    backtrack(0, board);
    return result;
}
```

用Set记录占用状态，O(1)时间判断冲突。

## 剪枝的技巧

### 1. 分析问题的约束条件
约束条件就是剪枝的依据。

### 2. 排序优先
排序后往往能找到更多剪枝机会。

### 3. 用数据结构加速判断
Set、Map等可以O(1)判断状态。

### 4. 提前计算边界
预先计算什么情况不可能成功。

## 小结

剪枝是回溯的灵魂：
- **可行性剪枝**：放弃不可能成功的分支
- **最优性剪枝**：放弃不可能更优的分支
- **排序剪枝**：利用有序性提前终止
- **去重剪枝**：避免重复解

好的剪枝可以让指数级算法在实际中变得高效。

接下来的实战题目中，我们会反复应用这些剪枝技巧。
