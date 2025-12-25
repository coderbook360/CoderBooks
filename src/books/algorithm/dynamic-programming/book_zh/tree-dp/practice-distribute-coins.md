# 在二叉树中分配硬币

## 题目描述

**LeetCode 979. Distribute Coins in Binary Tree**

给定一个有 n 个节点的二叉树的根节点 root，树中的每个节点都有 node.val 枚硬币。

整个树有 n 枚硬币，你需要移动硬币使得每个节点上恰好有一枚硬币。

你可以在相邻的两个节点之间移动硬币（即沿边移动）。

返回使得每个节点上恰好有一枚硬币所需的最少移动次数。

**示例 1**：
```
输入：root = [3,0,0]
输出：2
解释：
     3
    / \
   0   0

从根移动一枚到左子节点，移动一枚到右子节点。
```

**示例 2**：
```
输入：root = [0,3,0]
输出：3
解释：
     0
    / \
   3   0

左子节点移动 2 枚到根，根移动 1 枚到右子节点。
```

**约束**：
- 树中节点的数目为 n
- `1 <= n <= 100`
- `0 <= Node.val <= n`
- 所有 Node.val 之和为 n

## 思路分析

每个节点最终需要恰好 1 枚硬币。

对于每个节点，定义"过剩量"：
- 过剩量 = 拥有的硬币 - 需要的硬币 = node.val - 1
- 正数：需要移出
- 负数：需要移入

关键观察：经过每条边的移动次数 = |该边一侧的总过剩量|

## 解法：树形 DP

```typescript
function distributeCoins(root: TreeNode | null): number {
  let moves = 0;
  
  // 返回以 node 为根的子树的"过剩量"
  // 过剩量 = 子树总硬币 - 子树节点数
  function dfs(node: TreeNode | null): number {
    if (!node) return 0;
    
    const leftExcess = dfs(node.left);
    const rightExcess = dfs(node.right);
    
    // 左边的过剩量需要经过左边，右边同理
    moves += Math.abs(leftExcess) + Math.abs(rightExcess);
    
    // 当前子树的总过剩量
    return node.val - 1 + leftExcess + rightExcess;
  }
  
  dfs(root);
  return moves;
}
```

**代码解析**：

1. **过剩量定义**：
   - `dfs(node)` 返回以 node 为根的子树的总过剩量
   - 过剩量 = 子树总硬币 - 子树节点数

2. **移动计数**：
   - 左子树的过剩量要经过 node-left 这条边
   - 移动次数 = |leftExcess|
   - 无论是移入还是移出，都需要移动

3. **递归计算**：
   - 当前子树过剩量 = (node.val - 1) + 左过剩 + 右过剩

**图解**：
```
     3
    / \
   0   0

dfs(左0): 返回 0 - 1 = -1（缺 1 枚）
dfs(右0): 返回 0 - 1 = -1（缺 1 枚）
dfs(3):
  moves += |-1| + |-1| = 2
  返回 3 - 1 + (-1) + (-1) = 0（平衡）

答案：2
```

另一个例子：
```
     0
    / \
   3   0

dfs(3): 返回 3 - 1 = 2（多 2 枚）
dfs(右0): 返回 -1
dfs(0):
  moves += |2| + |-1| = 3
  返回 0 - 1 + 2 + (-1) = 0

答案：3
```

**复杂度分析**：
- 时间：O(n)
- 空间：O(h)

## 为什么这样计算是对的？

每条边的移动次数 = 该边一侧子树的净流量

如果子树有 k 枚多余硬币（过剩量 = k > 0），这些硬币都需要从这条边流出，移动 k 次。

如果子树缺 k 枚硬币（过剩量 = -k），需要从外面流入 k 枚，也是移动 k 次。

所以移动次数 = |过剩量|。

## 思路扩展

### 如果硬币可以跨越多条边一次性移动？

那就是另一个问题了。本题要求沿边移动，每次移动只能跨越一条边。

### 如果是 N 叉树？

```typescript
function distributeCoins(root: NaryTreeNode | null): number {
  let moves = 0;
  
  function dfs(node: NaryTreeNode | null): number {
    if (!node) return 0;
    
    let excess = node.val - 1;
    
    for (const child of node.children) {
      const childExcess = dfs(child);
      moves += Math.abs(childExcess);
      excess += childExcess;
    }
    
    return excess;
  }
  
  dfs(root);
  return moves;
}
```

## 相关题目

| 题目 | 难度 | 说明 |
|------|------|------|
| [834. 树中距离之和](https://leetcode.cn/problems/sum-of-distances-in-tree/) | 困难 | 换根 DP |
| [968. 监控二叉树](https://leetcode.cn/problems/binary-tree-cameras/) | 困难 | 树形贪心 |
| [1443. 收集树上所有苹果的最少时间](https://leetcode.cn/problems/minimum-time-to-collect-all-apples-in-a-tree/) | 中等 | 树形 DP |

## 总结

这道题展示了"流量"思想在树形 DP 中的应用：

1. **过剩量/缺口**：
   - 每个节点有"需求"和"供给"
   - 过剩量 = 供给 - 需求

2. **边的流量**：
   - 每条边的流量 = 一侧子树的净过剩量
   - 移动次数 = 流量绝对值

3. **自底向上汇总**：
   - 叶子的过剩量向上传递
   - 每条边累计流量

核心洞见：
- 把硬币移动问题转化为流量问题
- 每条边统计其上的流量
- 流量 = |子树过剩量|
