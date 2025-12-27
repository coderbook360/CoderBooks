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

从 n 个数中选 k 个，不考虑顺序。

```typescript
function combine(n: number, k: number): number[][] {
  const result: number[][] = [];
  
  function backtrack(start: number, path: number[]) {
    // 终止条件：收集够 k 个数
    if (path.length === k) {
      result.push([...path]);  // 深拷贝当前路径
      return;
    }
    
    // 从 start 开始遍历，避免重复选择之前的数
    // 为什么从 start 开始？[1,2] 和 [2,1] 是同一个组合，只需保留一个
    for (let i = start; i <= n; i++) {
      path.push(i);            // 做选择：选择数字 i
      backtrack(i + 1, path);  // 递归：下一个从 i+1 开始（每个数只能选一次）
      path.pop();              // 撤销选择：尝试其他可能
    }
  }
  
  backtrack(1, []);
  return result;
}
```

### 2. 排列模板

n 个数的全排列，考虑顺序。

```typescript
function permute(nums: number[]): number[][] {
  const result: number[][] = [];
  // used 数组标记哪些元素已被使用
  const used = new Array(nums.length).fill(false);
  
  function backtrack(path: number[]) {
    // 终止条件：路径长度等于数组长度，一个排列完成
    if (path.length === nums.length) {
      result.push([...path]);
      return;
    }
    
    // 排列需要从索引 0 开始遍历（每个位置都可以放任意未用元素）
    // 与组合不同：[1,2] 和 [2,1] 是不同的排列
    for (let i = 0; i < nums.length; i++) {
      if (used[i]) continue;  // 跳过已使用的元素
      
      path.push(nums[i]);     // 做选择
      used[i] = true;         // 标记为已使用
      backtrack(path);        // 递归
      used[i] = false;        // 撤销标记
      path.pop();             // 撤销选择
    }
  }
  
  backtrack([]);
  return result;
}
```

### 3. 子集模板

n 个数的所有子集（幂集）。

```typescript
function subsets(nums: number[]): number[][] {
  const result: number[][] = [];
  
  function backtrack(start: number, path: number[]) {
    // 子集的特殊之处：每个节点都是一个有效子集
    // 不需要终止条件判断，直接收集
    result.push([...path]);
    
    // 从 start 开始，避免重复（与组合相同）
    for (let i = start; i < nums.length; i++) {
      path.push(nums[i]);      // 做选择：包含 nums[i]
      backtrack(i + 1, path);  // 递归：继续选择后面的元素
      path.pop();              // 撤销选择：不包含 nums[i]
    }
    // 注意：没有 return，因为要遍历所有可能的子集
  }
  
  backtrack(0, []);
  return result;
}
```

### 4. 棋盘模板

以 N 皇后为例，在 n×n 棋盘上放置 n 个皇后。

```typescript
function solveNQueens(n: number): string[][] {
  const result: string[][] = [];
  // 初始化空棋盘
  const board = Array.from({ length: n }, () => '.'.repeat(n));
  
  function backtrack(row: number) {
    // 终止条件：所有行都放置了皇后
    if (row === n) {
      result.push([...board]);
      return;
    }
    
    // 尝试在当前行的每一列放置皇后
    for (let col = 0; col < n; col++) {
      // 剪枝：检查是否与已放置的皇后冲突
      if (!isValid(row, col)) continue;
      
      // 做选择：在 (row, col) 放置皇后
      board[row] = board[row].substring(0, col) + 'Q' + board[row].substring(col + 1);
      backtrack(row + 1);  // 递归：处理下一行
      // 撤销选择：移除皇后
      board[row] = board[row].substring(0, col) + '.' + board[row].substring(col + 1);
    }
  }
  
  function isValid(row: number, col: number): boolean {
    // 检查列、主对角线、副对角线是否有冲突
    // 具体实现见 N 皇后题解
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
