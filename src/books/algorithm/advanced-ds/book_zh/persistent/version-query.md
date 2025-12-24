# 历史版本查询

前面几章我们分别学习了主席树、可持久化字典树、可持久化并查集。本章将总结**可持久化数据结构的通用模式**，并探讨历史版本查询的设计思想。

---

## 可持久化的本质

可持久化数据结构的核心是：**保留历史版本，同时高效利用空间**。

### 两种实现策略

| 策略 | 描述 | 适用场景 |
|------|------|---------|
| 路径复制 | 只复制修改路径上的节点 | 树形结构 |
| Fat Node | 节点存储所有版本的值 | 简单结构 |

大多数可持久化数据结构使用**路径复制**。

---

## 通用版本管理框架

```python
from typing import Any, List, Optional

class VersionedStructure:
    """可持久化数据结构的通用框架"""
    
    def __init__(self):
        # 节点池
        self.nodes = []
        self.tot = 0
        
        # 版本管理
        self.versions = {}  # version_id -> root_node
        self.current_version = 0
        
        # 初始化空版本
        self.versions[0] = self._create_empty()
    
    def _create_empty(self) -> Any:
        """创建空结构的根"""
        raise NotImplementedError
    
    def _clone_node(self, node: Any) -> Any:
        """克隆节点"""
        raise NotImplementedError
    
    def update(self, version: int, *args) -> int:
        """
        在指定版本基础上更新，返回新版本号
        """
        old_root = self.versions[version]
        new_root = self._update_impl(old_root, *args)
        
        self.current_version += 1
        self.versions[self.current_version] = new_root
        
        return self.current_version
    
    def query(self, version: int, *args) -> Any:
        """在指定版本上查询"""
        root = self.versions[version]
        return self._query_impl(root, *args)
    
    def _update_impl(self, root: Any, *args) -> Any:
        """具体更新逻辑"""
        raise NotImplementedError
    
    def _query_impl(self, root: Any, *args) -> Any:
        """具体查询逻辑"""
        raise NotImplementedError
```

---

## 版本控制模式

### 模式 1：线性版本链

每个版本基于前一个版本：

```
v0 -> v1 -> v2 -> v3 -> ...
```

**应用**：前缀和风格的查询（主席树、可持久化字典树）

```python
class LinearVersions:
    def __init__(self):
        self.versions = [None]  # v0
    
    def add(self, value):
        """在最新版本基础上添加"""
        new_root = self._insert(self.versions[-1], value)
        self.versions.append(new_root)
        return len(self.versions) - 1
    
    def query_range(self, l: int, r: int):
        """区间查询 = v[r] - v[l-1]"""
        return self._diff(self.versions[r], self.versions[l - 1] if l > 0 else None)
```

### 模式 2：分支版本树

可以从任意版本分叉：

```
v0 -> v1 -> v2
       \-> v3 -> v4
```

**应用**：撤销/重做、多分支探索

```python
class BranchVersions:
    def __init__(self):
        self.versions = {0: None}  # v0
        self.next_id = 1
    
    def branch(self, base_version: int, value):
        """从指定版本分叉"""
        new_root = self._update(self.versions[base_version], value)
        version_id = self.next_id
        self.next_id += 1
        self.versions[version_id] = new_root
        return version_id
    
    def query(self, version: int):
        """查询指定版本"""
        return self._query(self.versions[version])
```

### 模式 3：时间戳版本

按时间戳组织版本，支持时间范围查询：

```python
class TimestampVersions:
    def __init__(self):
        self.versions = []  # (timestamp, root)
    
    def update(self, timestamp: int, value):
        """在指定时间戳更新"""
        # 找到最近的历史版本
        base = self._find_latest_before(timestamp)
        new_root = self._update(base, value)
        self.versions.append((timestamp, new_root))
    
    def query_at_time(self, timestamp: int):
        """查询指定时间的状态"""
        root = self._find_latest_before(timestamp)
        return self._query(root)
    
    def _find_latest_before(self, timestamp: int):
        """二分查找"""
        lo, hi = 0, len(self.versions)
        while lo < hi:
            mid = (lo + hi) // 2
            if self.versions[mid][0] <= timestamp:
                lo = mid + 1
            else:
                hi = mid
        return self.versions[lo - 1][1] if lo > 0 else None
```

---

## 实战：版本控制文本编辑器

```python
class VersionedTextEditor:
    """支持历史版本的文本编辑器"""
    
    def __init__(self):
        # 使用可持久化数组（简化版本）
        self.versions = [[]]  # 每个版本是字符列表
        self.current = 0
    
    def insert(self, pos: int, text: str) -> int:
        """插入文本，返回新版本号"""
        old = self.versions[self.current]
        new = old[:pos] + list(text) + old[pos:]
        self.versions.append(new)
        self.current = len(self.versions) - 1
        return self.current
    
    def delete(self, start: int, end: int) -> int:
        """删除文本，返回新版本号"""
        old = self.versions[self.current]
        new = old[:start] + old[end:]
        self.versions.append(new)
        self.current = len(self.versions) - 1
        return self.current
    
    def get_text(self, version: Optional[int] = None) -> str:
        """获取指定版本的文本"""
        v = version if version is not None else self.current
        return ''.join(self.versions[v])
    
    def switch_to(self, version: int) -> None:
        """切换到指定版本"""
        if 0 <= version < len(self.versions):
            self.current = version
    
    def diff(self, v1: int, v2: int) -> dict:
        """比较两个版本的差异"""
        text1 = self.versions[v1]
        text2 = self.versions[v2]
        
        # 简化的 diff 实现
        return {
            'v1_length': len(text1),
            'v2_length': len(text2),
            'same': text1 == text2
        }
```

---

## 高效版本存储

### 问题

如果简单复制每个版本，空间复杂度是 O(n × 版本数)。

### 解决方案：增量存储

只存储变化部分：

```python
class IncrementalVersions:
    """增量存储的版本管理"""
    
    def __init__(self, initial_data):
        self.base = initial_data[:]  # 基础版本
        self.deltas = []  # 每个版本的变化
    
    def update(self, changes: List[tuple]) -> int:
        """
        changes: [(index, old_value, new_value), ...]
        """
        self.deltas.append(changes)
        return len(self.deltas)
    
    def get_version(self, version: int) -> List:
        """重建指定版本"""
        result = self.base[:]
        for v in range(version):
            for idx, _, new_val in self.deltas[v]:
                result[idx] = new_val
        return result
    
    def rollback(self, from_version: int, to_version: int) -> List[tuple]:
        """计算回滚需要的操作"""
        rollback_ops = []
        for v in range(from_version - 1, to_version - 1, -1):
            for idx, old_val, new_val in reversed(self.deltas[v]):
                rollback_ops.append((idx, new_val, old_val))
        return rollback_ops
```

---

## 版本垃圾回收

当某些版本不再需要时，可以回收空间：

```python
class GCVersions:
    """支持垃圾回收的版本管理"""
    
    def __init__(self):
        self.versions = {}
        self.ref_count = {}  # 引用计数
    
    def create_version(self, base: int, data) -> int:
        """创建新版本"""
        new_id = self._allocate_id()
        self.versions[new_id] = data
        self.ref_count[new_id] = 1
        
        if base in self.ref_count:
            self.ref_count[base] += 1  # 依赖基础版本
        
        return new_id
    
    def release(self, version: int):
        """释放版本"""
        if version not in self.ref_count:
            return
        
        self.ref_count[version] -= 1
        
        if self.ref_count[version] == 0:
            # 回收该版本
            del self.versions[version]
            del self.ref_count[version]
            # 递归释放依赖
    
    def _allocate_id(self) -> int:
        return len(self.versions)
```

---

## 并发版本控制

在多线程环境下管理版本：

```python
import threading
from typing import Dict

class ConcurrentVersions:
    """线程安全的版本管理"""
    
    def __init__(self):
        self.versions: Dict[int, Any] = {}
        self.lock = threading.RLock()
        self.next_id = 0
    
    def create(self, base_version: int, updater) -> int:
        """
        原子性地创建新版本
        updater: 函数，接收基础数据，返回新数据
        """
        with self.lock:
            base_data = self.versions.get(base_version)
            new_data = updater(base_data)
            
            version_id = self.next_id
            self.next_id += 1
            self.versions[version_id] = new_data
            
            return version_id
    
    def read(self, version: int):
        """读取版本（无需加锁，因为版本不可变）"""
        return self.versions.get(version)
    
    def compare_and_create(self, expected_version: int, updater) -> Optional[int]:
        """
        乐观锁：只有当前版本匹配时才创建
        """
        with self.lock:
            current = self.next_id - 1
            if current != expected_version:
                return None  # 版本冲突
            return self.create(expected_version, updater)
```

---

## 应用场景总结

| 场景 | 版本模式 | 数据结构 |
|------|---------|---------|
| 区间第 K 小 | 线性版本 | 主席树 |
| 区间异或查询 | 线性版本 | 可持久化字典树 |
| 撤销/重做 | 分支版本 | 可持久化并查集/数组 |
| 数据库 MVCC | 时间戳版本 | 多版本 B+ 树 |
| Git | 分支 DAG | 快照 + Delta |

---

## 设计权衡

### 空间 vs 时间

| 策略 | 空间 | 查询时间 | 更新时间 |
|------|------|---------|---------|
| 完整复制 | O(n × v) | O(1) | O(n) |
| 路径复制 | O(v × log n) | O(log n) | O(log n) |
| 增量存储 | O(changes) | O(v) | O(1) |

### 查询 vs 更新

- 读多写少：优化查询，可以多用空间
- 写多读少：优化更新，使用增量存储

---

## 本章小结

本章总结了可持久化数据结构的通用模式：

1. **版本管理模式**
   - 线性版本：前缀和风格
   - 分支版本：撤销/多分支
   - 时间戳版本：时间范围查询

2. **存储策略**
   - 路径复制：高效的树形结构
   - 增量存储：节省空间
   - 垃圾回收：释放无用版本

3. **设计考量**
   - 空间与时间的权衡
   - 读写比例的优化
   - 并发安全性

下一章我们将学习本部分的最后一个主题：**可持久化平衡树**。
