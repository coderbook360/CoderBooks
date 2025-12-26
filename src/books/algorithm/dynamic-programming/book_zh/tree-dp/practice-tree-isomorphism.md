# 树的同构判定

## 问题描述

> 判断两棵树是否同构。两棵树同构当且仅当存在一个节点的一一映射，使得对应的边保持连接关系。

**示例**：
```
树1:      树2:
  0         10
 / \       /  \
1   2     11  12
   / \        / \
  3   4      13 14

输出：true
解释：0→10, 1→11, 2→12, 3→13, 4→14
```

## 解法一：树哈希

```python
from collections import defaultdict

def tree_hash(n, edges, root):
    """
    计算树的哈希值
    """
    graph = [[] for _ in range(n)]
    for u, v in edges:
        graph[u].append(v)
        graph[v].append(u)
    
    # 计算每个子树的哈希
    def dfs(u, parent):
        children_hashes = []
        for v in graph[u]:
            if v != parent:
                children_hashes.append(dfs(v, u))
        
        # 排序保证唯一性
        children_hashes.sort()
        
        # 哈希值 = hash(子节点哈希列表)
        return hash(tuple(children_hashes))
    
    return dfs(root, -1)

def are_isomorphic(edges1, edges2, n1, n2):
    """
    判断两棵树是否同构
    """
    if n1 != n2:
        return False
    
    # 尝试所有可能的根
    hash1 = tree_hash(n1, edges1, 0)
    for root2 in range(n2):
        hash2 = tree_hash(n2, edges2, root2)
        if hash1 == hash2:
            return True
    
    return False

# 测试
edges1 = [[0,1], [0,2], [2,3], [2,4]]
edges2 = [[10,11], [10,12], [12,13], [12,14]]
print(are_isomorphic(edges1, edges2, 5, 5))  # True
```

## 解法二：树的中心 + 规范化

```python
def find_center(n, edges):
    """
    找树的中心（1 or 2 个节点）
    """
    graph = [[] for _ in range(n)]
    for u, v in edges:
        graph[u].append(v)
        graph[v].append(u)
    
    degree = [len(graph[i]) for i in range(n)]
    leaves = [i for i in range(n) if degree[i] == 1]
    
    remaining = n
    while remaining > 2:
        new_leaves = []
        for leaf in leaves:
            for neighbor in graph[leaf]:
                degree[neighbor] -= 1
                if degree[neighbor] == 1:
                    new_leaves.append(neighbor)
        
        remaining -= len(leaves)
        leaves = new_leaves
    
    return leaves

def canonical_form(n, edges, root):
    """
    以 root 为根的树的规范形式
    """
    graph = [[] for _ in range(n)]
    for u, v in edges:
        graph[u].append(v)
        graph[v].append(u)
    
    def dfs(u, parent):
        children = []
        for v in graph[u]:
            if v != parent:
                children.append(dfs(v, u))
        
        children.sort()
        return f"({','.join(children)})"
    
    return dfs(root, -1)

def are_isomorphic_v2(edges1, edges2, n1, n2):
    """
    基于中心的同构判定
    """
    if n1 != n2:
        return False
    
    centers1 = find_center(n1, edges1)
    centers2 = find_center(n2, edges2)
    
    if len(centers1) != len(centers2):
        return False
    
    # 尝试所有中心的组合
    for c1 in centers1:
        form1 = canonical_form(n1, edges1, c1)
        for c2 in centers2:
            form2 = canonical_form(n2, edges2, c2)
            if form1 == form2:
                return True
    
    return False

# 测试
edges1 = [[0,1], [0,2], [2,3], [2,4]]
edges2 = [[10,11], [10,12], [12,13], [12,14]]
print(are_isomorphic_v2(edges1, edges2, 5, 5))  # True
```

## 解法三：AHU 算法（无根树同构）

```python
def ahu_algorithm(n, edges):
    """
    AHU 算法：自底向上构建树的规范标签
    """
    graph = [[] for _ in range(n)]
    for u, v in edges:
        graph[u].append(v)
        graph[v].append(u)
    
    degree = [len(graph[i]) for i in range(n)]
    labels = [''] * n
    leaves = [i for i in range(n) if degree[i] == 1]
    
    while leaves:
        new_leaves = []
        leaf_labels = defaultdict(list)
        
        # 为每个叶子节点分配标签
        for leaf in leaves:
            for neighbor in graph[leaf]:
                if degree[neighbor] > 0:
                    # 收集子节点标签
                    child_labels = [labels[leaf]]
                    degree[neighbor] -= 1
                    
                    if degree[neighbor] == 1:
                        # 邻居成为新叶子
                        leaf_labels[neighbor].extend(child_labels)
                        new_leaves.append(neighbor)
        
        # 为新叶子分配标签
        for node in new_leaves:
            labels[node] = f"({','.join(sorted(leaf_labels[node]))})"
        
        leaves = new_leaves
    
    # 找到最后剩余的节点（中心）
    remaining = [i for i in range(n) if degree[i] >= 0]
    if len(remaining) == 1:
        return labels[remaining[0]]
    else:
        return f"[{labels[remaining[0]]},{labels[remaining[1]]}]"

def are_isomorphic_ahu(edges1, edges2, n1, n2):
    """
    使用 AHU 算法判断同构
    """
    if n1 != n2:
        return False
    
    label1 = ahu_algorithm(n1, edges1)
    label2 = ahu_algorithm(n2, edges2)
    
    return label1 == label2

# 测试
edges1 = [[0,1], [0,2], [2,3], [2,4]]
edges2 = [[10,11], [10,12], [12,13], [12,14]]
print(are_isomorphic_ahu(edges1, edges2, 5, 5))  # True
```

## 应用：LeetCode 问题

**例子：相同的树**（LeetCode 100）
```python
class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

def isSameTree(p, q):
    if not p and not q:
        return True
    if not p or not q:
        return False
    
    return (p.val == q.val and
            isSameTree(p.left, q.left) and
            isSameTree(p.right, q.right))
```

**对称树**（LeetCode 101）
```python
def isSymmetric(root):
    def mirror(t1, t2):
        if not t1 and not t2:
            return True
        if not t1 or not t2:
            return False
        
        return (t1.val == t2.val and
                mirror(t1.left, t2.right) and
                mirror(t1.right, t2.left))
    
    return mirror(root, root) if root else True
```

## 小结

- **树哈希**：O(n)，简单但可能冲突
- **规范化**：O(n log n)，基于中心和排序
- **AHU 算法**：O(n log n)，无根树同构的标准算法
- **应用**：树的比较、去重、模式匹配
