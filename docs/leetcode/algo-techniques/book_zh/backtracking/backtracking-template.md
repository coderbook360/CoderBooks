# 回溯算法模板

掌握通用模板，解决90%的回溯问题。

---

## 通用模板

```typescript
function backtrackTemplate(
  路径: any[],
  选择列表: any[],
  结果集: any[][]
): void {
  // 1. 终止条件
  if (满足条件) {
    结果集.push([...路径]);  // 注意深拷贝
    return;
  }
  
  // 2. 遍历选择列表
  for (const 选择 of 选择列表) {
    // 3. 剪枝（可选）
    if (不满足约束) continue;
    
    // 4. 做选择
    路径.push(选择);
    
    // 5. 递归
    backtrackTemplate(路径, 新选择列表, 结果集);
    
    // 6. 撤销选择
    路径.pop();
  }
}
```

---

## 三大核心要素

**1. 路径**：已经做出的选择
**2. 选择列表**：当前可以做的选择
**3. 结束条件**：到达决策树底层

---

## 四种典型模板

### 1. 组合模板

```typescript
function combine(n: number, k: number): number[][] {
  const result: number[][] = [];
  
  function backtrack(start: number, path: number[]) {
    if (path.length === k) {
      result.push([...path]);
      return;
    }
    
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

### 2. 排列模板

```typescript
function permute(nums: number[]): number[][] {
  const result: number[][] = [];
  const used = new Array(nums.length).fill(false);
  
  function backtrack(path: number[]) {
    if (path.length === nums.length) {
      result.push([...path]);
      return;
    }
    
    for (let i = 0; i < nums.length; i++) {
      if (used[i]) continue;
      
      path.push(nums[i]);
      used[i] = true;
      backtrack(path);
      used[i] = false;
      path.pop();
    }
  }
  
  backtrack([]);
  return result;
}
```

### 3. 子集模板

```typescript
function subsets(nums: number[]): number[][] {
  const result: number[][] = [];
  
  function backtrack(start: number, path: number[]) {
    result.push([...path]);  // 每个节点都是答案
    
    for (let i = start; i < nums.length; i++) {
      path.push(nums[i]);
      backtrack(i + 1, path);
      path.pop();
    }
  }
  
  backtrack(0, []);
  return result;
}
```

### 4. 棋盘模板

```typescript
function solveNQueens(n: number): string[][] {
  const result: string[][] = [];
  const board = Array.from({ length: n }, () => '.'.repeat(n));
  
  function backtrack(row: number) {
    if (row === n) {
      result.push([...board]);
      return;
    }
    
    for (let col = 0; col < n; col++) {
      if (!isValid(row, col)) continue;
      
      // 放置皇后
      board[row] = board[row].substring(0, col) + 'Q' + board[row].substring(col + 1);
      backtrack(row + 1);
      // 撤销
      board[row] = board[row].substring(0, col) + '.' + board[row].substring(col + 1);
    }
  }
  
  function isValid(row: number, col: number): boolean {
    // 检查列、对角线
    // ...
    return true;
  }
  
  backtrack(0);
  return result;
}
```

---

## 关键区别

| 类型 | 选择列表起点 | 是否需要used | 结果收集时机 |
|-----|------------|-------------|------------|
| **组合** | start（避免重复） | 否 | 叶子节点 |
| **排列** | 0（可重复访问） | 是 | 叶子节点 |
| **子集** | start | 否 | **所有节点** |
| **棋盘** | 当前行/列 | 隐式 | 叶子节点 |

---

## 常见陷阱

**1. 忘记深拷贝**
```typescript
result.push([...path]);  // ✓
result.push(path);        // ✗ 所有结果都指向同一个数组
```

**2. 忘记撤销**
```typescript
path.push(选择);
backtrack(...);
path.pop();  // 必须撤销！
```

**3. start参数错误**
```typescript
backtrack(i + 1, ...);  // 组合/子集
backtrack(0, ...);      // 排列
```

---

## 关键要点

1. **三要素**：路径、选择列表、结束条件
2. **四模板**：组合、排列、子集、棋盘
3. **两注意**：深拷贝、撤销操作
4. **一优化**：剪枝
