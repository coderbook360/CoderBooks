# 实战：不同的二叉搜索树II

这道题展示了分治在树构建中的应用。

## 问题描述

给你一个整数`n`，请你生成并返回所有由`n`个节点组成且节点值从`1`到`n`互不相同的不同**二叉搜索树**。

## 思路分析

### BST的性质

在BST中，如果根节点的值是`i`：
- 左子树的所有值都小于`i`（即1到i-1）
- 右子树的所有值都大于`i`（即i+1到n）

### 分治思路

1. 选择根节点`i`（从1到n）
2. 递归生成所有可能的左子树（用1到i-1）
3. 递归生成所有可能的右子树（用i+1到n）
4. 组合所有左子树和右子树的可能

## 代码实现

```javascript
function generateTrees(n) {
    if (n === 0) return [];
    return generate(1, n);
}

function generate(start, end) {
    const trees = [];
    
    // 基准情况：空树
    if (start > end) {
        trees.push(null);
        return trees;
    }
    
    // 尝试每个值作为根
    for (let i = start; i <= end; i++) {
        // 生成所有可能的左子树
        const leftTrees = generate(start, i - 1);
        // 生成所有可能的右子树
        const rightTrees = generate(i + 1, end);
        
        // 组合所有可能
        for (const left of leftTrees) {
            for (const right of rightTrees) {
                const root = new TreeNode(i);
                root.left = left;
                root.right = right;
                trees.push(root);
            }
        }
    }
    
    return trees;
}
```

## 图解

```
n = 3

i=1为根:
  左子树: [] (空)
  右子树: generate(2, 3)
    i=2: 左=[], 右=[3]  → 2为根, 右孩子3
    i=3: 左=[2], 右=[]  → 3为根, 左孩子2
  
  组合:
      1           1
       \           \
        2           3
         \         /
          3       2

i=2为根:
  左子树: [1]
  右子树: [3]
  
  组合:
        2
       / \
      1   3

i=3为根:
  左子树: generate(1, 2)
    类似上面, 得到两棵树
  右子树: []
  
  组合:
      3           3
     /           /
    1           2
     \         /
      2       1

总共5棵树
```

## 卡特兰数

n个节点的BST数量是第n个卡特兰数：

C(n) = C(2n, n) / (n + 1)

前几项：1, 1, 2, 5, 14, 42, 132, ...

## 优化：记忆化

由于子问题可能重复计算，可以加缓存：

```javascript
function generateTrees(n) {
    if (n === 0) return [];
    const memo = new Map();
    return generate(1, n, memo);
}

function generate(start, end, memo) {
    const key = `${start}-${end}`;
    if (memo.has(key)) {
        return memo.get(key);
    }
    
    const trees = [];
    
    if (start > end) {
        trees.push(null);
        memo.set(key, trees);
        return trees;
    }
    
    for (let i = start; i <= end; i++) {
        const leftTrees = generate(start, i - 1, memo);
        const rightTrees = generate(i + 1, end, memo);
        
        for (const left of leftTrees) {
            for (const right of rightTrees) {
                const root = new TreeNode(i);
                root.left = left;
                root.right = right;
                trees.push(root);
            }
        }
    }
    
    memo.set(key, trees);
    return trees;
}
```

## 注意：子树共享

在记忆化版本中，相同范围的子树会被多个树共享。

如果需要修改树或树之间相互独立，需要深拷贝：

```javascript
function cloneTree(root) {
    if (!root) return null;
    const newRoot = new TreeNode(root.val);
    newRoot.left = cloneTree(root.left);
    newRoot.right = cloneTree(root.right);
    return newRoot;
}
```

## 复杂度分析

**时间复杂度**：O(4^n / √n)
- 卡特兰数的增长率

**空间复杂度**：O(4^n / √n)
- 存储所有树

## 相关问题

### 不同的BST（只求数量）

如果只求数量，用DP更高效：

```javascript
function numTrees(n) {
    const dp = new Array(n + 1).fill(0);
    dp[0] = 1;
    dp[1] = 1;
    
    for (let i = 2; i <= n; i++) {
        for (let j = 1; j <= i; j++) {
            dp[i] += dp[j - 1] * dp[i - j];
        }
    }
    
    return dp[n];
}
```

## 小结

生成BST展示了分治在树构建中的应用：
1. 枚举根节点的选择
2. 递归生成左右子树
3. 组合所有可能
4. 结果数量是卡特兰数
