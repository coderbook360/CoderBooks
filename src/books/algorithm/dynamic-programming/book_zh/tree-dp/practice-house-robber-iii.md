# 打家劫舍 III

## 题目描述

**LeetCode 337. House Robber III**

小偷又发现了一个新的可行窃的地区。这个地区只有一个入口，我们称之为 root。

除了 root 之外，每栋房子有且只有一个"父"房子与之相连。一番侦察之后，聪明的小偷意识到"这个地方的所有房屋的排列类似于一棵二叉树"。

如果两个直接相连的房子在同一天晚上被打劫，房屋会自动报警。

给定二叉树的 root，返回在不触动警报的情况下，小偷能够盗取的最高金额。

**示例 1**：
```
输入：root = [3,2,3,null,3,null,1]
输出：7
解释：小偷偷窃 3 + 3 + 1 = 7
     3
    / \
   2   3
    \   \ 
     3   1
```

**示例 2**：
```
输入：root = [3,4,5,1,3,null,1]
输出：9
解释：小偷偷窃 4 + 5 = 9
     3
    / \
   4   5
  / \   \ 
 1   3   1
```

**约束**：
- 树的节点数在 `[1, 10^4]` 范围内
- `0 <= Node.val <= 10^4`

## 思路分析

这是"打家劫舍"系列的树形版本。

约束：不能同时偷相邻的两个节点（父子关系）。

对于每个节点，有两种选择：
1. **偷当前节点**：那么子节点都不能偷
2. **不偷当前节点**：子节点可以偷也可以不偷

这自然形成了"选或不选"的双状态 DP。

## 解法一：暴力递归（超时）

```typescript
function rob(root: TreeNode | null): number {
  if (!root) return 0;
  
  // 偷当前节点
  let robThis = root.val;
  if (root.left) {
    robThis += rob(root.left.left) + rob(root.left.right);
  }
  if (root.right) {
    robThis += rob(root.right.left) + rob(root.right.right);
  }
  
  // 不偷当前节点
  const notRobThis = rob(root.left) + rob(root.right);
  
  return Math.max(robThis, notRobThis);
}
```

问题：存在大量重复计算。

## 解法二：记忆化递归

用 Map 缓存每个节点的结果。

```typescript
function rob(root: TreeNode | null): number {
  const memo = new Map<TreeNode, number>();
  
  function helper(node: TreeNode | null): number {
    if (!node) return 0;
    
    if (memo.has(node)) return memo.get(node)!;
    
    // 偷当前节点
    let robThis = node.val;
    if (node.left) {
      robThis += helper(node.left.left) + helper(node.left.right);
    }
    if (node.right) {
      robThis += helper(node.right.left) + helper(node.right.right);
    }
    
    // 不偷当前节点
    const notRobThis = helper(node.left) + helper(node.right);
    
    const result = Math.max(robThis, notRobThis);
    memo.set(node, result);
    
    return result;
  }
  
  return helper(root);
}
```

## 解法三：双状态树形 DP（最优）

每个节点返回两个值：偷和不偷的最大收益。

```typescript
function rob(root: TreeNode | null): number {
  // 返回 [偷当前节点的最大收益, 不偷当前节点的最大收益]
  function dfs(node: TreeNode | null): [number, number] {
    if (!node) return [0, 0];
    
    const [leftRob, leftNot] = dfs(node.left);
    const [rightRob, rightNot] = dfs(node.right);
    
    // 偷当前节点：子节点都不能偷
    const robThis = node.val + leftNot + rightNot;
    
    // 不偷当前节点：子节点可偷可不偷，取最优
    const notRobThis = Math.max(leftRob, leftNot) 
                     + Math.max(rightRob, rightNot);
    
    return [robThis, notRobThis];
  }
  
  const [rob, notRob] = dfs(root);
  return Math.max(rob, notRob);
}
```

**代码解析**：

1. **状态定义**：
   - `[robThis, notRobThis]` 分别表示偷/不偷当前节点的最大收益

2. **状态转移**：
   - 偷当前：`node.val + leftNot + rightNot`
   - 不偷当前：`max(leftRob, leftNot) + max(rightRob, rightNot)`

3. **返回值**：
   - 最后取两种情况的较大值

**图解**：
```
     3
    / \
   4   5
  / \   \ 
 1   3   1

dfs(1) = [1, 0]  // 左下角的 1
dfs(3) = [3, 0]  // 4 的右子节点
dfs(4):
  leftRob=1, leftNot=0
  rightRob=3, rightNot=0
  robThis = 4 + 0 + 0 = 4
  notRobThis = max(1,0) + max(3,0) = 4
  返回 [4, 4]

dfs(1) = [1, 0]  // 右下角的 1
dfs(5):
  rightRob=1, rightNot=0
  robThis = 5 + 0 = 5
  notRobThis = max(1,0) = 1
  返回 [5, 1]

dfs(3):  // 根节点
  leftRob=4, leftNot=4
  rightRob=5, rightNot=1
  robThis = 3 + 4 + 1 = 8
  notRobThis = max(4,4) + max(5,1) = 9
  返回 [8, 9]

答案 = max(8, 9) = 9
```

**复杂度分析**：
- 时间：O(n)
- 空间：O(h)

## 解法对比

| 方法 | 时间 | 空间 | 说明 |
|------|------|------|------|
| 暴力递归 | O(2^n) | O(h) | 大量重复计算 |
| 记忆化 | O(n) | O(n) | Map 存储中间结果 |
| 双状态 DP | O(n) | O(h) | 最优，无额外存储 |

## 思路扩展

### 如果是 N 叉树？

```typescript
function rob(root: NaryTreeNode | null): number {
  function dfs(node: NaryTreeNode | null): [number, number] {
    if (!node) return [0, 0];
    
    let robThis = node.val;
    let notRobThis = 0;
    
    for (const child of node.children) {
      const [childRob, childNot] = dfs(child);
      robThis += childNot;  // 偷当前，子节点不能偷
      notRobThis += Math.max(childRob, childNot);  // 不偷当前，子节点任选
    }
    
    return [robThis, notRobThis];
  }
  
  const [rob, notRob] = dfs(root);
  return Math.max(rob, notRob);
}
```

### 如果是图（有环）？

需要用更复杂的状态压缩 DP 或转化为最大独立集问题。

## 相关题目

| 题目 | 难度 | 说明 |
|------|------|------|
| [198. 打家劫舍](https://leetcode.cn/problems/house-robber/) | 中等 | 线性版本 |
| [213. 打家劫舍 II](https://leetcode.cn/problems/house-robber-ii/) | 中等 | 环形版本 |
| [968. 监控二叉树](https://leetcode.cn/problems/binary-tree-cameras/) | 困难 | 三状态 DP |

## 总结

这道题展示了双状态树形 DP 的经典模式：

1. **状态设计**：每个节点维护多个状态
2. **返回元组**：`[状态1的值, 状态2的值]`
3. **状态转移**：根据子节点的状态组合计算当前状态

核心洞见：
- "选或不选"是树形 DP 的常见模式
- 用元组返回多个值，避免多次遍历
- 状态转移要考虑所有可能的组合
