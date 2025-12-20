# 实战：不同的二叉搜索树 II

> LeetCode 95. 不同的二叉搜索树 II | 难度：中等

这道题展示了分治思想在树结构生成中的应用。

---

## 问题描述

给定整数 `n`，生成所有由 `1...n` 节点组成的不同二叉搜索树。

**示例**：
```
输入：n = 3
输出：[[1,null,2,null,3], [1,null,3,2], [2,1,3], [3,1,null,null,2], [3,2,null,1]]

       1         1         2         3       3
        \         \       / \       /       /
         2         3     1   3     1       2
          \       /               \       /
           3     2                 2     1
```

---

## 分治思路

对于 `1...n`，选择每个数字 `i` 作为根节点：
- 左子树：所有可能的 `1...(i-1)` 组成的BST
- 右子树：所有可能的 `(i+1)...n` 组成的BST
- 组合：左右子树的笛卡尔积

```
n=3, 选择 2 作为根：
  左子树：[1]       → 1种
  右子树：[3]       → 1种
  组合：1 * 1 = 1种
  
       2
      / \
     1   3
```

---

## 代码实现

```typescript
function generateTrees(n: number): Array<TreeNode | null> {
  if (n === 0) return [];
  
  return generate(1, n);
}

function generate(start: number, end: number): Array<TreeNode | null> {
  const result: Array<TreeNode | null> = [];
  
  // 基础情况
  if (start > end) {
    result.push(null);
    return result;
  }
  
  // 枚举每个数字作为根节点
  for (let i = start; i <= end; i++) {
    // 递归生成左右子树
    const leftTrees = generate(start, i - 1);
    const rightTrees = generate(i + 1, end);
    
    // 组合所有可能的左右子树
    for (const left of leftTrees) {
      for (const right of rightTrees) {
        const root = new TreeNode(i);
        root.left = left;
        root.right = right;
        result.push(root);
      }
    }
  }
  
  return result;
}
```

---

## 执行过程详解

以 `n = 3` 为例：

**根节点 = 1**：
```
左子树：generate(1, 0) → [null]
右子树：generate(2, 3)
  根=2: 左=[null], 右=[3]     → 1种
  根=3: 左=[2], 右=[null]     → 1种
  
       1          1
        \          \
         2          3
          \        /
           3      2
```

**根节点 = 2**：
```
左子树：generate(1, 1) → [1]
右子树：generate(3, 3) → [3]

       2
      / \
     1   3
```

**根节点 = 3**：
```
左子树：generate(1, 2)
  根=1: 左=[null], 右=[2]     → 1种
  根=2: 左=[1], 右=[null]     → 1种
右子树：generate(4, 3) → [null]

       3          3
      /          /
     1          2
      \        /
       2      1
```

总共 5 种。

---

## 记忆化优化

相同范围长度的子问题会重复计算：

```typescript
function generateTrees(n: number): Array<TreeNode | null> {
  if (n === 0) return [];
  
  const memo = new Map<string, Array<TreeNode | null>>();
  
  function generate(start: number, end: number): Array<TreeNode | null> {
    const key = `${start},${end}`;
    if (memo.has(key)) {
      // 需要深拷贝树节点
      return memo.get(key)!.map(tree => cloneTree(tree));
    }
    
    const result: Array<TreeNode | null> = [];
    
    if (start > end) {
      result.push(null);
      return result;
    }
    
    for (let i = start; i <= end; i++) {
      const leftTrees = generate(start, i - 1);
      const rightTrees = generate(i + 1, end);
      
      for (const left of leftTrees) {
        for (const right of rightTrees) {
          const root = new TreeNode(i);
          root.left = left;
          root.right = right;
          result.push(root);
        }
      }
    }
    
    memo.set(key, result);
    return result;
  }
  
  return generate(1, n);
}

function cloneTree(root: TreeNode | null): TreeNode | null {
  if (!root) return null;
  const newRoot = new TreeNode(root.val);
  newRoot.left = cloneTree(root.left);
  newRoot.right = cloneTree(root.right);
  return newRoot;
}
```

**为什么需要深拷贝？**

如果不拷贝，多个树会共享相同的子树节点。当我们修改一棵树时，会影响其他树。

```
// 假设有两棵树共享节点 [2]
树1:     3         树2:     3
        /                   /
       2 ← 同一个节点 →    2
      /                    /
     1                    1

修改树1的左子树会影响树2！
```

---

## 分治思想的本质

这道题的分治核心：**枚举根节点**

```
对于范围 [1, n]：
  - 选择 i 作为根
  - 左子树使用 [1, i-1]
  - 右子树使用 [i+1, n]
  - 组合所有可能的左右子树对

这恰好对应了BST的性质：
  - 左子树所有值 < 根
  - 右子树所有值 > 根
```

---

## 复杂度分析

**时间复杂度**：O(4ⁿ / √n)
- 这是第 n 个卡特兰数 C(n)
- C(n) = C(2n, n) / (n+1)
- 渐近行为：约 4ⁿ / (n^1.5 × √π)

**空间复杂度**：O(4ⁿ / √n)
- 存储所有树节点的空间
- 每棵树有 n 个节点，共 C(n) 棵树

**卡特兰数的增长**：

| n | BST数量 C(n) |
|---|-------------|
| 1 | 1 |
| 2 | 2 |
| 3 | 5 |
| 4 | 14 |
| 5 | 42 |
| 6 | 132 |
| 7 | 429 |
| 8 | 1430 |

---

## 相关问题对比

### LeetCode 96：不同的二叉搜索树（只计数）

只需要计算数量，不需要生成所有树，可以用 DP：

```typescript
function numTrees(n: number): number {
  const dp = new Array(n + 1).fill(0);
  dp[0] = dp[1] = 1;
  
  // dp[i] = sum(dp[j-1] * dp[i-j]) for j = 1 to i
  for (let i = 2; i <= n; i++) {
    for (let j = 1; j <= i; j++) {
      dp[i] += dp[j - 1] * dp[i - j];
    }
  }
  
  return dp[n];
}
```

**复杂度**：时间 O(n²)，空间 O(n)

### 两题对比

| 对比项 | 95题（生成所有树） | 96题（只计数） |
|-------|-------------------|---------------|
| 输出 | 所有树的列表 | 一个数字 |
| 方法 | 分治 + 递归 | 动态规划 |
| 时间 | O(4ⁿ/√n) | O(n²) |
| 空间 | O(4ⁿ/√n) | O(n) |

---

## 常见错误

### 错误1：忘记处理空子树

```typescript
// ❌ 错误：start > end 时返回空数组
if (start > end) {
  return [];  // 空数组会导致笛卡尔积为空
}

// ✅ 正确：返回包含 null 的数组
if (start > end) {
  return [null];  // null 表示空子树
}
```

### 错误2：记忆化时共享节点

```typescript
// ❌ 错误：直接返回缓存结果
if (memo.has(key)) {
  return memo.get(key)!;  // 多棵树共享节点
}

// ✅ 正确：深拷贝每棵树
if (memo.has(key)) {
  return memo.get(key)!.map(tree => cloneTree(tree));
}
```

### 错误3：根节点值错误

```typescript
// ❌ 错误：使用索引作为值
const root = new TreeNode(i - start);

// ✅ 正确：使用实际值
const root = new TreeNode(i);  // i 就是节点值
```

---

## 优化：避免深拷贝

可以利用 BST 结构的特性，通过偏移量生成树，避免深拷贝：

```typescript
function generateTrees(n: number): Array<TreeNode | null> {
  if (n === 0) return [];
  
  // 缓存按"长度"生成的树模板
  const memo = new Map<number, Array<TreeNode | null>>();
  
  function generate(length: number): Array<TreeNode | null> {
    if (memo.has(length)) {
      return memo.get(length)!;
    }
    
    if (length === 0) return [null];
    
    const result: Array<TreeNode | null> = [];
    
    for (let root = 1; root <= length; root++) {
      const leftTrees = generate(root - 1);
      const rightTrees = generate(length - root);
      
      for (const left of leftTrees) {
        for (const right of rightTrees) {
          const node = new TreeNode(root);
          node.left = left;
          node.right = cloneWithOffset(right, root);  // 偏移右子树
          result.push(node);
        }
      }
    }
    
    memo.set(length, result);
    return result;
  }
  
  return generate(n);
}

function cloneWithOffset(root: TreeNode | null, offset: number): TreeNode | null {
  if (!root) return null;
  const newNode = new TreeNode(root.val + offset);
  newNode.left = cloneWithOffset(root.left, offset);
  newNode.right = cloneWithOffset(root.right, offset);
  return newNode;
}
```

**思路**：
- 缓存的是"长度为 k 的 BST 模板"
- 生成时通过偏移量调整节点值
- 减少重复计算

---

## 关键要点

1. **分治核心**：选择每个数作为根，递归构造左右子树
2. **笛卡尔积**：左右子树的所有组合
3. **BST性质**：决定了左右子树的范围
4. **记忆化陷阱**：必须深拷贝树节点，避免共享
5. **卡特兰数**：BST数量的数学本质
6. **空子树处理**：用 `[null]` 而非 `[]`
