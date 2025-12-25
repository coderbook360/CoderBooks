# 树形 DP 总结

## 核心概念回顾

树形 DP 利用树的递归结构，自底向上或自顶向下地进行动态规划。

### 基本特点

- **子问题独立**：子树之间相互独立
- **递归计算**：从叶子到根，或从根到叶子
- **状态汇总**：父节点汇总子节点的信息

### 两种遍历方向

1. **自底向上（后序）**：先处理子节点，再处理父节点
2. **自顶向下（前序）**：先处理父节点，再处理子节点

## 常见模式总结

### 模式 1：单状态返回

每个节点返回一个值。

```typescript
function solve(root: TreeNode | null): number {
  function dfs(node: TreeNode | null): number {
    if (!node) return baseCase;
    
    const left = dfs(node.left);
    const right = dfs(node.right);
    
    return combine(left, right, node);
  }
  
  return dfs(root);
}
```

**典型题目**：
- 二叉树最大深度
- 二叉树节点数

### 模式 2：全局变量更新

递归计算过程中更新全局答案。

```typescript
function solve(root: TreeNode | null): number {
  let answer = initialValue;
  
  function dfs(node: TreeNode | null): number {
    if (!node) return baseCase;
    
    const left = dfs(node.left);
    const right = dfs(node.right);
    
    // 更新全局答案
    answer = Math.max(answer, combine(left, right));
    
    // 返回值给父节点使用
    return returnValue(left, right, node);
  }
  
  dfs(root);
  return answer;
}
```

**典型题目**：
- 二叉树的直径
- 最大路径和
- 最长同值路径

### 模式 3：双/多状态

每个节点返回多个值（元组）。

```typescript
function solve(root: TreeNode | null): number {
  // 返回 [状态1, 状态2]
  function dfs(node: TreeNode | null): [number, number] {
    if (!node) return [base1, base2];
    
    const [leftA, leftB] = dfs(node.left);
    const [rightA, rightB] = dfs(node.right);
    
    const stateA = computeA(leftA, leftB, rightA, rightB, node);
    const stateB = computeB(leftA, leftB, rightA, rightB, node);
    
    return [stateA, stateB];
  }
  
  const [a, b] = dfs(root);
  return finalResult(a, b);
}
```

**典型题目**：
- 打家劫舍 III（选/不选）
- 监控二叉树（三状态）

### 模式 4：换根 DP

计算以每个节点为根的答案。

```typescript
function solve(root: TreeNode): number[] {
  const answer: number[] = [];
  const subtreeInfo: Map<TreeNode, any> = new Map();
  
  // 第一次 DFS：计算子树信息
  function dfs1(node: TreeNode, parent: TreeNode | null): void {
    // 计算并存储子树信息
    for (const child of node.children) {
      dfs1(child, node);
    }
    subtreeInfo.set(node, computeSubtreeInfo(node));
  }
  
  // 第二次 DFS：换根计算
  function dfs2(node: TreeNode, parentInfo: any): void {
    answer[node.id] = computeAnswer(subtreeInfo.get(node), parentInfo);
    
    for (const child of node.children) {
      const newParentInfo = reroot(node, child, parentInfo);
      dfs2(child, newParentInfo);
    }
  }
  
  dfs1(root, null);
  dfs2(root, initialParentInfo);
  
  return answer;
}
```

**典型题目**：
- 树中距离之和
- 最小高度树

## 本章题目回顾

| 题目 | 模式 | 核心技巧 |
|------|------|---------|
| 二叉树的直径 | 全局更新 | 返回深度，更新直径 |
| 最大路径和 | 全局更新 | 负数取 0，单边返回 |
| 打家劫舍 III | 双状态 | 选/不选元组 |
| 监控二叉树 | 三状态 | 贪心 + 状态机 |
| 最长同值路径 | 全局更新 | 条件延伸 |
| 树中距离之和 | 换根 DP | 两次 DFS |
| 分配硬币 | 流量思想 | 过剩量累加 |
| 最深节点最小子树 | 多返回值 | 深度 + 节点 |

## 状态设计技巧

### 1. 从问题出发

问：每个节点需要从子节点获得什么信息？

- 深度？大小？最优值？
- 多种情况？选或不选？

### 2. 确定返回值

返回给父节点的信息：
- 可能与最终答案不同
- 服务于递归需要

### 3. 全局 vs 局部

- **全局变量**：答案需要综合多个子树信息时
- **返回值**：答案可以递归地计算时

## 复杂度分析

### 时间复杂度

- 大多数情况：O(n)
- 每个节点访问一次

### 空间复杂度

- 递归栈：O(h)
- 额外存储：视问题而定

### 优化方向

- 避免重复计算（记忆化）
- 减少状态数量
- 剪枝

## 常见错误

### 1. 返回值与答案混淆

```typescript
// 错误：直接返回经过当前节点的路径
function dfs(node) {
  return left + right + node.val;  // 应该返回单边
}

// 正确：全局更新经过当前节点的路径，返回单边
function dfs(node) {
  answer = Math.max(answer, left + right + node.val);
  return Math.max(left, right) + node.val;
}
```

### 2. 边界条件遗漏

```typescript
// 错误：没有处理空节点
function dfs(node) {
  // node 可能是 null！
  return dfs(node.left) + dfs(node.right);
}

// 正确：先检查空节点
function dfs(node) {
  if (!node) return 0;
  return dfs(node.left) + dfs(node.right);
}
```

### 3. 状态定义不清

确保清楚地定义：
- 状态的含义
- 状态的取值范围
- 状态之间的转移关系

## 进阶话题

### 树上背包

在树上进行背包 DP：

```typescript
// dp[node][j] = 在以 node 为根的子树中，选 j 个节点的最优值
function treeKnapsack(root, k) {
  const dp = new Map<TreeNode, number[]>();
  
  function dfs(node) {
    if (!node) return;
    
    dp.set(node, Array(k + 1).fill(0));
    
    for (const child of children(node)) {
      dfs(child);
      // 合并子树的 DP 数组
      merge(dp.get(node), dp.get(child));
    }
  }
}
```

### 点分治

处理树上路径问题的高效算法：

- 找重心
- 分治处理
- 合并答案

### LCA 与 DP 结合

利用 LCA 信息进行 DP：

- 预处理 LCA
- 路径查询优化

## 总结

树形 DP 的核心要点：

1. **递归思维**：树天然适合递归
2. **状态设计**：根据问题确定状态
3. **转移方向**：自底向上或自顶向下
4. **返回值设计**：服务于父节点或全局

掌握这些模式后，大部分树形 DP 问题都能找到解决思路。关键是识别问题属于哪种模式，然后套用相应的框架。
