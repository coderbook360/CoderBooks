# K-D 树

**K-D 树（K-Dimensional Tree）**是一种用于组织 k 维空间点的二叉搜索树。它在最近邻搜索、范围查询等多维问题中有广泛应用。

---

## 问题背景

### 多维空间查询

给定 n 个 k 维点，支持：
- **最近邻查询**：找到距离目标点最近的点
- **范围查询**：找到落在某个矩形区域内的所有点
- **K 近邻查询**：找到距离目标点最近的 k 个点

**朴素方法**：每次查询 O(n)。

**K-D 树**：平均 O(log n)，最坏 O(n)。

---

## 核心思想

K-D 树按**轮换的维度**划分空间：

1. 第 0 层按 x 坐标划分
2. 第 1 层按 y 坐标划分
3. 第 2 层按 z 坐标划分
4. ...循环往复

每个节点将空间分成两半，形成二叉树结构。

---

## 基本实现

### 节点定义与构建

```python
from typing import List, Optional, Tuple
import heapq

class KDNode:
    """K-D 树节点"""
    __slots__ = ['point', 'left', 'right', 'axis']
    
    def __init__(self, point: Tuple, axis: int):
        self.point = point
        self.left: Optional[KDNode] = None
        self.right: Optional[KDNode] = None
        self.axis = axis  # 划分维度

class KDTree:
    """K-D 树"""
    
    def __init__(self, points: List[Tuple], k: int = 2):
        """
        points: k 维点列表
        k: 维度数
        """
        self.k = k
        self.root = self._build(points, 0)
    
    def _build(self, points: List[Tuple], depth: int) -> Optional[KDNode]:
        """递归构建 K-D 树"""
        if not points:
            return None
        
        axis = depth % self.k
        
        # 按当前维度排序，选择中位数作为根
        points.sort(key=lambda p: p[axis])
        mid = len(points) // 2
        
        node = KDNode(points[mid], axis)
        node.left = self._build(points[:mid], depth + 1)
        node.right = self._build(points[mid + 1:], depth + 1)
        
        return node
    
    def _distance(self, p1: Tuple, p2: Tuple) -> float:
        """欧氏距离的平方"""
        return sum((a - b) ** 2 for a, b in zip(p1, p2))
```

### 最近邻查询

```python
def nearest_neighbor(self, target: Tuple) -> Tuple:
    """查找距离 target 最近的点"""
    self.best = None
    self.best_dist = float('inf')
    self._nn_search(self.root, target)
    return self.best

def _nn_search(self, node: Optional[KDNode], target: Tuple) -> None:
    """最近邻搜索"""
    if node is None:
        return
    
    # 计算当前节点到目标的距离
    dist = self._distance(node.point, target)
    if dist < self.best_dist:
        self.best_dist = dist
        self.best = node.point
    
    axis = node.axis
    diff = target[axis] - node.point[axis]
    
    # 先搜索目标所在的子树
    if diff <= 0:
        first, second = node.left, node.right
    else:
        first, second = node.right, node.left
    
    self._nn_search(first, target)
    
    # 如果超平面距离小于当前最优，需要搜索另一侧
    if diff ** 2 < self.best_dist:
        self._nn_search(second, target)
```

### 范围查询

```python
def range_query(self, rect: Tuple[Tuple, Tuple]) -> List[Tuple]:
    """
    查找落在矩形区域内的所有点
    rect: ((x_min, y_min, ...), (x_max, y_max, ...))
    """
    result = []
    self._range_search(self.root, rect, result)
    return result

def _range_search(self, node: Optional[KDNode], 
                  rect: Tuple[Tuple, Tuple], 
                  result: List[Tuple]) -> None:
    """范围搜索"""
    if node is None:
        return
    
    lo, hi = rect
    point = node.point
    
    # 检查当前点是否在范围内
    if all(lo[i] <= point[i] <= hi[i] for i in range(self.k)):
        result.append(point)
    
    axis = node.axis
    
    # 如果范围与左子树有交集，搜索左子树
    if lo[axis] <= point[axis]:
        self._range_search(node.left, rect, result)
    
    # 如果范围与右子树有交集，搜索右子树
    if hi[axis] >= point[axis]:
        self._range_search(node.right, rect, result)
```

### K 近邻查询

```python
def k_nearest(self, target: Tuple, k: int) -> List[Tuple]:
    """查找距离 target 最近的 k 个点"""
    # 使用最大堆，堆中保存 (-distance, point)
    self.heap = []
    self.k_val = k
    self._knn_search(self.root, target)
    return [p for _, p in sorted(self.heap)]

def _knn_search(self, node: Optional[KDNode], target: Tuple) -> None:
    """K 近邻搜索"""
    if node is None:
        return
    
    dist = self._distance(node.point, target)
    
    if len(self.heap) < self.k_val:
        heapq.heappush(self.heap, (-dist, node.point))
    elif dist < -self.heap[0][0]:
        heapq.heapreplace(self.heap, (-dist, node.point))
    
    axis = node.axis
    diff = target[axis] - node.point[axis]
    
    if diff <= 0:
        first, second = node.left, node.right
    else:
        first, second = node.right, node.left
    
    self._knn_search(first, target)
    
    # 只有当堆未满或超平面距离小于堆顶时，才搜索另一侧
    if len(self.heap) < self.k_val or diff ** 2 < -self.heap[0][0]:
        self._knn_search(second, target)
```

---

## 执行过程示例

点集：[(2,3), (5,4), (9,6), (4,7), (8,1), (7,2)]

构建过程（按 x-y 交替划分）：

1. **深度 0（按 x）**：中位数 (7,2)
   - 左：[(2,3), (5,4), (4,7)]
   - 右：[(9,6), (8,1)]

2. **深度 1（按 y）**：
   - 左子树中位数 (5,4)
   - 右子树中位数 (9,6)

树结构：
```
        (7,2)
       /     \
    (5,4)    (9,6)
    /   \       \
 (2,3) (4,7)   (8,1)
```

查询最近邻 (6, 3)：
1. 从 (7,2) 开始，距离 = 2
2. 搜索左子树，到达 (5,4)，距离 = 2
3. 检查超平面距离，继续搜索
4. 最终找到 (7,2) 或 (5,4)

---

## 动态 K-D 树

支持插入和删除的版本。

```python
class DynamicKDTree:
    """支持动态操作的 K-D 树"""
    
    def __init__(self, k: int = 2):
        self.k = k
        self.root = None
        self.size = 0
    
    def insert(self, point: Tuple) -> None:
        """插入点"""
        self.root = self._insert(self.root, point, 0)
        self.size += 1
    
    def _insert(self, node: Optional[KDNode], point: Tuple, depth: int) -> KDNode:
        if node is None:
            return KDNode(point, depth % self.k)
        
        axis = node.axis
        if point[axis] <= node.point[axis]:
            node.left = self._insert(node.left, point, depth + 1)
        else:
            node.right = self._insert(node.right, point, depth + 1)
        
        return node
    
    def delete(self, point: Tuple) -> bool:
        """删除点（懒删除或重建）"""
        # 简单实现：标记删除，定期重建
        pass
    
    def rebuild_if_needed(self) -> None:
        """如果树退化严重，重建整棵树"""
        if self._is_unbalanced():
            points = self._collect_all_points()
            self.root = self._build(points, 0)
```

---

## 应用实例

### 问题 1：二维最近点对

```python
def closest_pair_kdtree(points: List[Tuple[int, int]]) -> float:
    """使用 K-D 树求最近点对"""
    kdt = KDTree(points, k=2)
    
    min_dist = float('inf')
    for p in points:
        # 查询最近的 2 个点（包含自身）
        neighbors = kdt.k_nearest(p, 2)
        for q in neighbors:
            if q != p:
                d = kdt._distance(p, q)
                min_dist = min(min_dist, d)
    
    return min_dist ** 0.5
```

### 问题 2：矩形区域内点数

```python
def count_points_in_rect(kdt: KDTree, rect: Tuple[Tuple, Tuple]) -> int:
    """统计矩形区域内的点数"""
    return len(kdt.range_query(rect))
```

### 问题 3：高维最近邻（推荐系统）

```python
def find_similar_items(items: List[Tuple], target: Tuple, k: int) -> List[Tuple]:
    """
    在高维特征空间中找到最相似的 k 个物品
    items: 物品特征向量列表
    target: 目标特征向量
    k: 返回数量
    """
    dim = len(target)
    kdt = KDTree(items, k=dim)
    return kdt.k_nearest(target, k)
```

---

## 复杂度分析

| 操作 | 平均复杂度 | 最坏复杂度 |
|------|-----------|-----------|
| 构建 | O(n log n) | O(n log n) |
| 最近邻 | O(log n) | O(n) |
| 范围查询 | O(√n + m) | O(n) |
| 插入 | O(log n) | O(n) |

**注意**：
- 最坏情况发生在树严重不平衡时
- 高维度时（k > 10），K-D 树效率下降，接近暴力搜索

---

## 优化技巧

### 1. 使用方差选择划分维度

```python
def _select_axis(self, points: List[Tuple]) -> int:
    """选择方差最大的维度进行划分"""
    variances = []
    for axis in range(self.k):
        vals = [p[axis] for p in points]
        mean = sum(vals) / len(vals)
        var = sum((v - mean) ** 2 for v in vals) / len(vals)
        variances.append(var)
    return variances.index(max(variances))
```

### 2. 叶子节点存储多个点

```python
LEAF_SIZE = 10

def _build_with_leaf(self, points: List[Tuple], depth: int) -> KDNode:
    if len(points) <= LEAF_SIZE:
        # 叶子节点直接存储所有点
        node = KDNode(None, -1)
        node.points = points
        return node
    # ... 正常构建
```

---

## 常见错误

1. **维度计算错误**
   ```python
   # 错误：固定维度
   axis = 0
   
   # 正确：轮换维度
   axis = depth % self.k
   ```

2. **剪枝条件错误**
   ```python
   # 错误：使用欧氏距离
   if abs(target[axis] - node.point[axis]) < best_dist:
   
   # 正确：使用距离的平方
   if (target[axis] - node.point[axis]) ** 2 < best_dist:
   ```

3. **范围查询边界错误**
   ```python
   # 错误：严格不等号
   if lo[axis] < point[axis]:
   
   # 正确：包含边界
   if lo[axis] <= point[axis]:
   ```

---

## 本章小结

本章介绍了 K-D 树：

1. **核心思想**
   - 按维度轮换划分空间
   - 形成二叉搜索树结构

2. **基本操作**
   - 构建：O(n log n)
   - 最近邻：平均 O(log n)
   - 范围查询：O(√n + m)

3. **应用场景**
   - 最近点对
   - 范围统计
   - 高维最近邻

4. **局限性**
   - 高维效率下降
   - 动态操作可能导致不平衡

下一章我们将学习**矩形区域查询**的更多技巧。
