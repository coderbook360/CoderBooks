# 实战：不同的二叉搜索树

卡特兰数的应用。

## 问题描述

给定一个整数n，求以1...n为节点组成的二叉搜索树有多少种不同的结构？

示例：
- n = 3 → 5种BST

## 思路分析

选择k作为根节点：
- 左子树：1到k-1，共k-1个节点
- 右子树：k+1到n，共n-k个节点

BST的数量 = 左子树数量 × 右子树数量

## 解法

```javascript
function numTrees(n) {
    // dp[i] = i个节点的BST数量
    const dp = new Array(n + 1).fill(0);
    dp[0] = 1;  // 空树
    dp[1] = 1;  // 一个节点
    
    for (let i = 2; i <= n; i++) {
        // 以j为根
        for (let j = 1; j <= i; j++) {
            dp[i] += dp[j - 1] * dp[i - j];
        }
    }
    
    return dp[n];
}
```

## 状态转移解释

`dp[i]` = i个节点能形成的BST数量

以j为根时：
- 左子树有j-1个节点：`dp[j-1]`种
- 右子树有i-j个节点：`dp[i-j]`种
- 组合：`dp[j-1] * dp[i-j]`

枚举所有可能的根，累加。

## 数学方法：卡特兰数

这个结果就是卡特兰数：

$$C_n = \frac{1}{n+1}\binom{2n}{n} = \frac{(2n)!}{(n+1)!n!}$$

```javascript
function numTrees(n) {
    // C(n) = C(2n, n) / (n + 1)
    let result = 1;
    for (let i = 0; i < n; i++) {
        result = result * (2 * n - i) / (i + 1);
    }
    return Math.round(result / (n + 1));
}
```

## 卡特兰数的递推公式

$$C_n = \sum_{i=0}^{n-1} C_i \cdot C_{n-1-i}$$

或者：

$$C_n = \frac{2(2n-1)}{n+1} C_{n-1}$$

```javascript
function numTrees(n) {
    let C = 1;
    for (let i = 1; i <= n; i++) {
        C = C * 2 * (2 * i - 1) / (i + 1);
    }
    return Math.round(C);
}
```

## 卡特兰数的其他应用

- 括号匹配数
- 出栈序列数
- 凸多边形三角剖分数
- 从(0,0)到(n,n)不越过对角线的路径数

## 复杂度分析

**DP解法**：
- 时间：O(n²)
- 空间：O(n)

**数学解法**：
- 时间：O(n)
- 空间：O(1)

## 小结

不同的BST数量是卡特兰数的经典应用：
- DP方法直观，适合面试
- 数学方法高效，但需要知道公式

理解这个问题有助于识别其他卡特兰数问题。
