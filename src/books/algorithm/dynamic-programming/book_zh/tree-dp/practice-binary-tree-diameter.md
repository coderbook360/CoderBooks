# LeetCode 543: 二叉树的直径

## 问题描述

> 给定一棵二叉树，你需要计算它的直径长度。一棵二叉树的直径长度是任意两个节点路径长度中的最大值。这条路径可能穿过也可能不穿过根节点。

**示例**：
```
给定二叉树：
          1
         / \
        2   3
       / \     
      4   5    

返回 3，它的长度是路径 [4,2,1,3] 或者 [5,2,1,3]。
```

**注意**：两节点之间的路径长度是以它们之间边的数目表示。

**LeetCode链接**：[543. Diameter of Binary Tree](https://leetcode.com/problems/diameter-of-binary-tree/)

## 问题分析

首先要问一个问题：**直径可能穿过哪些节点？**

直径可能穿过任意节点，不一定经过根节点。关键观察：
- 对于每个节点 u，经过 u 的最长路径 = 左子树深度 + 右子树深度
- 直径 = 所有节点的"左子树深度 + 右子树深度"的最大值

现在我要问第二个问题：**如何用树形 DP 解决？**

**状态定义**：
- `dp[u]` = 从节点 u 向下的最大深度

**状态转移**：
- `dp[u] = max(dp[left], dp[right]) + 1`
- 经过 u 的最长路径 = `dp[left] + dp[right]`

## 解法一：DFS + 全局变量

### 思路

使用 DFS 计算每个节点的深度，同时更新全局最大直径。

### 代码实现

```python
class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

def diameterOfBinaryTree(root):
    """
    计算二叉树的直径
    """
    diameter = [0]  # 使用列表以便在递归中修改
    
    def dfs(node):
        """
        返回以 node 为根的子树的最大深度
        """
        if not node:
            return 0
        
        # 递归计算左右子树深度
        left_depth = dfs(node.left)
        right_depth = dfs(node.right)
        
        # 更新直径
        diameter[0] = max(diameter[0], left_depth + right_depth)
        
        # 返回当前节点的深度
        return max(left_depth, right_depth) + 1
    
    dfs(root)
    return diameter[0]

# 测试
root = TreeNode(1)
root.left = TreeNode(2)
root.right = TreeNode(3)
root.left.left = TreeNode(4)
root.left.right = TreeNode(5)

print(diameterOfBinaryTree(root))  # 3
```

**复杂度分析**：
- **时间**：O(n)（遍历每个节点一次）
- **空间**：O(h)（递归栈，h 是树的高度）

### 逐步推导

```
树结构：
          1
         / \
        2   3
       / \     
      4   5

DFS 过程：
dfs(4) → 返回 1（叶子节点）
dfs(5) → 返回 1（叶子节点）
dfs(2):
  left_depth = dfs(4) = 1
  right_depth = dfs(5) = 1
  diameter = max(0, 1 + 1) = 2
  返回 max(1, 1) + 1 = 2

dfs(3) → 返回 1（叶子节点）

dfs(1):
  left_depth = dfs(2) = 2
  right_depth = dfs(3) = 1
  diameter = max(2, 2 + 1) = 3
  返回 max(2, 1) + 1 = 3
```

## 解法二：动态规划（显式 DP 数组）

### 思路

使用显式的 DP 数组存储每个节点的深度。

### 代码实现

```python
def diameterOfBinaryTree_dp(root):
    """
    使用显式 DP 数组
    """
    if not root:
        return 0
    
    dp = {}  # dp[node] = 从 node 向下的最大深度
    diameter = [0]
    
    def dfs(node):
        if not node:
            dp[node] = 0
            return 0
        
        left_depth = dfs(node.left)
        right_depth = dfs(node.right)
        
        dp[node] = max(left_depth, right_depth) + 1
        diameter[0] = max(diameter[0], left_depth + right_depth)
        
        return dp[node]
    
    dfs(root)
    return diameter[0]
```

## 解法三：后序遍历（迭代版）

### 思路

使用迭代的后序遍历代替递归。

### 代码实现

```python
def diameterOfBinaryTree_iterative(root):
    """
    迭代版本
    """
    if not root:
        return 0
    
    stack = [(root, False)]
    depth = {None: 0}
    diameter = 0
    
    while stack:
        node, visited = stack.pop()
        
        if visited:
            # 处理节点
            left_depth = depth.get(node.left, 0)
            right_depth = depth.get(node.right, 0)
            
            depth[node] = max(left_depth, right_depth) + 1
            diameter = max(diameter, left_depth + right_depth)
        else:
            # 第一次访问，先访问子节点
            stack.append((node, True))
            if node.right:
                stack.append((node.right, False))
            if node.left:
                stack.append((node.left, False))
    
    return diameter
```

## 优化技巧

### 技巧 1：提前终止

如果某个子树的深度为 0（空树），可以跳过。

```python
def dfs(node):
    if not node:
        return 0
    
    left_depth = dfs(node.left)
    if left_depth == 0 and not node.left:
        # 左子树为空，跳过
        pass
    
    right_depth = dfs(node.right)
    # ...
```

### 技巧 2：记忆化

如果树中有重复子结构（虽然不常见），可以使用记忆化。

```python
from functools import lru_cache

@lru_cache(maxsize=None)
def dfs(node):
    # ...
```

### 技巧 3：返回多个值

直接返回 (深度, 直径)，避免全局变量。

```python
def diameterOfBinaryTree_tuple(root):
    """
    返回 (深度, 直径)
    """
    def dfs(node):
        if not node:
            return 0, 0  # (深度, 直径)
        
        left_depth, left_diameter = dfs(node.left)
        right_depth, right_diameter = dfs(node.right)
        
        depth = max(left_depth, right_depth) + 1
        diameter = max(left_diameter, right_diameter, left_depth + right_depth)
        
        return depth, diameter
    
    _, diameter = dfs(root)
    return diameter
```

## 常见错误

### 错误 1：混淆深度和直径

```python
# 错误：返回直径而不是深度
def dfs(node):
    # ...
    return left_depth + right_depth  # 错误！

# 正确
return max(left_depth, right_depth) + 1
```

### 错误 2：忘记更新全局直径

```python
# 错误：只计算深度，不更新直径
def dfs(node):
    left_depth = dfs(node.left)
    right_depth = dfs(node.right)
    return max(left_depth, right_depth) + 1  # 忘记更新 diameter

# 正确
diameter[0] = max(diameter[0], left_depth + right_depth)
```

### 错误 3：空节点处理

```python
# 错误：没有处理空节点
def dfs(node):
    left_depth = dfs(node.left)  # node.left 可能是 None

# 正确
if not node:
    return 0
```

## 扩展问题

### 扩展 1：返回直径路径

> 不仅返回直径长度，还返回直径路径上的所有节点。

```python
def diameterPath(root):
    """
    返回直径路径
    """
    diameter = [0]
    path = [[]]
    
    def dfs(node):
        if not node:
            return 0, []
        
        left_depth, left_path = dfs(node.left)
        right_depth, right_path = dfs(node.right)
        
        # 更新直径和路径
        if left_depth + right_depth > diameter[0]:
            diameter[0] = left_depth + right_depth
            path[0] = left_path[::-1] + [node.val] + right_path
        
        # 返回更深的那条路径
        if left_depth > right_depth:
            return left_depth + 1, left_path + [node.val]
        else:
            return right_depth + 1, right_path + [node.val]
    
    dfs(root)
    return diameter[0], path[0]
```

### 扩展 2：N叉树的直径

> 对于 N 叉树，计算直径。

```python
def diameterNaryTree(root):
    """
    N 叉树的直径
    """
    diameter = [0]
    
    def dfs(node):
        if not node or not node.children:
            return 0
        
        # 找到最深的两条路径
        depths = [dfs(child) for child in node.children]
        depths.sort(reverse=True)
        
        # 直径 = 最深 + 次深
        if len(depths) >= 2:
            diameter[0] = max(diameter[0], depths[0] + depths[1])
        elif len(depths) == 1:
            diameter[0] = max(diameter[0], depths[0])
        
        return (depths[0] if depths else 0) + 1
    
    dfs(root)
    return diameter[0]
```

### 扩展 3：带权边的直径

> 每条边有权重，计算带权直径。

```python
def weightedDiameter(root):
    """
    带权边的直径
    """
    diameter = [0]
    
    def dfs(node):
        if not node:
            return 0
        
        left_depth = dfs(node.left) + (node.left.weight if node.left else 0)
        right_depth = dfs(node.right) + (node.right.weight if node.right else 0)
        
        diameter[0] = max(diameter[0], left_depth + right_depth)
        
        return max(left_depth, right_depth)
    
    dfs(root)
    return diameter[0]
```

## 性能对比

| 方法 | 时间复杂度 | 空间复杂度 | 代码复杂度 |
|-----|-----------|-----------|-----------|
| DFS递归 | O(n) | O(h) | 简单 |
| 显式DP | O(n) | O(n) | 中等 |
| 迭代后序遍历 | O(n) | O(n) | 复杂 |

## 小结

### 核心思想
1. **树形DP**：每个节点的深度由子节点决定
2. **直径定义**：经过某节点的最长路径 = 左深度 + 右深度
3. **自底向上**：先计算子节点，再计算父节点

### 关键技巧
- DFS 返回深度：`max(left_depth, right_depth) + 1`
- 更新全局直径：`diameter = max(diameter, left_depth + right_depth)`
- 处理空节点：`if not node: return 0`

### 适用场景
- 树的直径问题
- 树的最长路径
- 树形结构的全局最优解

这道题是树形DP的经典入门题，掌握它是学习树形DP的基础！
