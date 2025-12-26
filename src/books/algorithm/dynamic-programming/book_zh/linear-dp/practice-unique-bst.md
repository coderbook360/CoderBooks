# 实战：不同的二叉搜索树

## 问题描述

**LeetCode 96: 不同的二叉搜索树**

给你一个整数 `n`，求恰由 `n` 个节点组成且节点值从 `1` 到 `n` 互不相同的**二叉搜索树**有多少种？

**示例1**：
```
输入：n = 3
输出：5
解释：共有 5 种不同的二叉搜索树：
   1         3     3      2      1
    \       /     /      / \      \
     3     2     1      1   3      2
    /     /       \                 \
   2     1         2                 3
```

**示例2**：
```
输入：n = 1
输出：1
```

**约束**：
- `1 <= n <= 19`

## 问题分析

### 二叉搜索树（BST）性质

**定义**：
- 左子树所有节点的值 < 根节点的值
- 右子树所有节点的值 > 根节点的值
- 左右子树也是二叉搜索树

### 关键观察

**选择根节点**：
- 选择 `i` 作为根节点（`1 <= i <= n`）
- 左子树：节点值 `1` 到 `i-1`，共 `i-1` 个节点
- 右子树：节点值 `i+1` 到 `n`，共 `n-i` 个节点

**组合数**：
- 左子树的 BST 数量：`G(i-1)`
- 右子树的 BST 数量：`G(n-i)`
- 以 `i` 为根的 BST 数量：`G(i-1) × G(n-i)`

**总数**：
```
G(n) = Σ[i=1 到 n] G(i-1) × G(n-i)
```

### 卡特兰数

这个递推式就是**卡特兰数**（Catalan Number）的定义！

```
C(0) = 1
C(n) = C(0)×C(n-1) + C(1)×C(n-2) + ... + C(n-1)×C(0)
```

**通项公式**：
```
C(n) = C(2n, n) / (n + 1)
     = (2n)! / [(n+1)! × n!]
```

## 解法一：动态规划

### 状态定义

```
dp[n] = n 个节点能组成的 BST 数量
```

### 状态转移

```python
dp[n] = Σ[i=1 到 n] dp[i-1] × dp[n-i]
```

**含义**：枚举根节点 `i`，左子树 `i-1` 个节点，右子树 `n-i` 个节点

### 边界条件

```python
dp[0] = 1  # 空树
dp[1] = 1  # 单节点
```

### 代码实现

```python
def numTrees(n):
    """
    不同的二叉搜索树（动态规划）
    """
    # 初始化
    dp = [0] * (n + 1)
    dp[0] = 1  # 空树
    dp[1] = 1  # 单节点
    
    # 状态转移
    for nodes in range(2, n + 1):
        for root in range(1, nodes + 1):
            left = root - 1      # 左子树节点数
            right = nodes - root  # 右子树节点数
            dp[nodes] += dp[left] * dp[right]
    
    return dp[n]
```

### 复杂度分析

- **时间复杂度**：O(n²)
- **空间复杂度**：O(n)

## 解法二：数学公式（卡特兰数）

### 通项公式

```
C(n) = C(2n, n) / (n + 1)
```

### 递推公式

```
C(n) = C(n-1) × 2(2n-1) / (n+1)
```

### 代码实现

```python
def numTrees_math(n):
    """
    卡特兰数公式
    """
    # 使用递推公式
    C = 1
    for i in range(n):
        C = C * 2 * (2 * i + 1) // (i + 2)
    return C
```

### 复杂度分析

- **时间复杂度**：O(n)
- **空间复杂度**：O(1)

## 完整示例

### 示例1：n = 3

```
dp[0] = 1
dp[1] = 1

dp[2]：
  根节点 = 1: 左子树 0 个，右子树 1 个
    dp[2] += dp[0] × dp[1] = 1 × 1 = 1
  根节点 = 2: 左子树 1 个，右子树 0 个
    dp[2] += dp[1] × dp[0] = 1 × 1 = 1
  dp[2] = 2

dp[3]：
  根节点 = 1: 左子树 0 个，右子树 2 个
    dp[3] += dp[0] × dp[2] = 1 × 2 = 2
  根节点 = 2: 左子树 1 个，右子树 1 个
    dp[3] += dp[1] × dp[1] = 1 × 1 = 1
  根节点 = 3: 左子树 2 个，右子树 0 个
    dp[3] += dp[2] × dp[0] = 2 × 1 = 2
  dp[3] = 5
```

**可视化**：
```
n = 3 的 5 种 BST：

根节点 = 1 (左 0, 右 2)：
   1              1
    \              \
     2              3
      \            /
       3          2

根节点 = 2 (左 1, 右 1)：
     2
    / \
   1   3

根节点 = 3 (左 2, 右 0)：
     3          3
    /          /
   1          2
    \        /
     2      1
```

### 示例2：n = 4

```
dp[4]：
  根 = 1: dp[0] × dp[3] = 1 × 5 = 5
  根 = 2: dp[1] × dp[2] = 1 × 2 = 2
  根 = 3: dp[2] × dp[1] = 2 × 1 = 2
  根 = 4: dp[3] × dp[0] = 5 × 1 = 5
  dp[4] = 14
```

## 卡特兰数序列

前几项：
```
n    0   1   2   3   4    5    6     7      8       9        10
C(n) 1   1   2   5   14   42   132   429    1430    4862     16796
```

**应用场景**：
1. 二叉搜索树数量
2. 括号匹配数量
3. 出栈序列数量
4. 凸多边形三角划分数量
5. 山脉序列数量

## 常见错误

### 错误1：边界条件错误

```python
# 错误：dp[0] = 0
dp = [0] * (n + 1)
dp[1] = 1
for nodes in range(2, n + 1):
    for root in range(1, nodes + 1):
        dp[nodes] += dp[root - 1] * dp[nodes - root]
return dp[n]

# 当 root = 1 时，dp[0] × dp[n-1]，如果 dp[0] = 0，结果错误

# 正确：dp[0] = 1（空树是一种合法情况）
```

### 错误2：理解错误

```python
# 错误：以为左右子树节点值是固定的
def wrong_solution(n):
    # 认为左子树必须是 [1, k]，右子树必须是 [k+1, n]
    # 实际上，只要节点数量对，值可以是任意的
    pass

# 正确理解：
# 左子树 i-1 个节点，不管值是什么，结构数量都是 dp[i-1]
# 右子树 n-i 个节点，结构数量都是 dp[n-i]
```

### 错误3：数学公式溢出

```python
# 错误：直接计算阶乘
from math import factorial
C_n = factorial(2 * n) // (factorial(n + 1) * factorial(n))

# 当 n = 19 时，factorial(38) 会溢出

# 正确：使用递推公式
C = 1
for i in range(n):
    C = C * 2 * (2 * i + 1) // (i + 2)
```

## 扩展问题

### 扩展1：生成所有 BST（LeetCode 95）

```python
def generateTrees(n):
    """
    生成所有不同的 BST
    """
    if n == 0:
        return []
    
    def generate(start, end):
        if start > end:
            return [None]
        
        all_trees = []
        
        # 枚举根节点
        for i in range(start, end + 1):
            # 生成所有左子树
            left_trees = generate(start, i - 1)
            
            # 生成所有右子树
            right_trees = generate(i + 1, end)
            
            # 组合左右子树
            for left in left_trees:
                for right in right_trees:
                    root = TreeNode(i)
                    root.left = left
                    root.right = right
                    all_trees.append(root)
        
        return all_trees
    
    return generate(1, n)
```

### 扩展2：验证 BST

```python
def isValidBST(root):
    """
    验证是否是有效的 BST
    """
    def validate(node, min_val, max_val):
        if not node:
            return True
        
        if node.val <= min_val or node.val >= max_val:
            return False
        
        return validate(node.left, min_val, node.val) and \
               validate(node.right, node.val, max_val)
    
    return validate(root, float('-inf'), float('inf'))
```

## 性能对比

| 方法 | 时间复杂度 | 空间复杂度 | 备注 |
|-----|----------|----------|------|
| 动态规划 | O(n²) | O(n) | 通用方法 |
| 数学公式 | O(n) | O(1) | **最优** |
| 递归（无记忆化） | O(4^n / n^1.5) | O(n) | 指数级，不推荐 |

## 小结

### 核心思想
- **状态定义**：`dp[n]` = n 个节点的 BST 数量
- **转移方程**：`dp[n] = Σ dp[i-1] × dp[n-i]`
- **数学本质**：卡特兰数

### 关键步骤
1. **枚举根节点**：`1` 到 `n`
2. **划分子树**：左子树 `i-1` 个，右子树 `n-i` 个
3. **组合计数**：`dp[left] × dp[right]`
4. **累加结果**：所有情况的和

### 易错点
- ✓ `dp[0] = 1`（空树是一种情况）
- ✓ 理解节点数量与结构的关系
- ✗ 忘记边界条件
- ✗ 数学公式溢出

### 优化建议
- **DP 方法**：O(n²) 时间，适合理解
- **数学公式**：O(n) 时间，适合优化
- **实际应用**：根据 n 的范围选择

### 卡特兰数应用
- 二叉搜索树数量
- 合法括号匹配
- 出栈序列
- 凸多边形三角划分

这道题是**组合数学**与**动态规划**结合的经典问题，展示了如何通过枚举决策点（根节点），将问题分解为子问题，并利用卡特兰数优化计算。
