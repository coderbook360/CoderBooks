# LeetCode 困难题实战

本章通过 LeetCode 困难题来综合应用高级数据结构。每道题都展示问题分析、选型思路和完整解法。

---

## 题目 1：327. 区间和的个数

**问题**：给定整数数组和范围 [lower, upper]，返回和在此范围内的子数组个数。

**分析**：
- 前缀和 S[i]，问题转化为求满足 lower ≤ S[j] - S[i] ≤ upper 的 (i, j) 对数
- 等价于：对每个 j，统计 S[j] - upper ≤ S[i] ≤ S[j] - lower 的 i 数量
- 使用归并排序或树状数组

**解法：归并排序**

```python
from typing import List

class Solution:
    def countRangeSum(self, nums: List[int], lower: int, upper: int) -> int:
        # 计算前缀和
        prefix = [0]
        for num in nums:
            prefix.append(prefix[-1] + num)
        
        def merge_count(arr: List[int], l: int, r: int) -> int:
            if l >= r:
                return 0
            
            mid = (l + r) // 2
            count = merge_count(arr, l, mid) + merge_count(arr, mid + 1, r)
            
            # 统计跨区间的贡献
            # 对于右半部分的每个 j，找左半部分满足条件的 i 数量
            left_lo, left_hi = mid + 1, mid + 1
            for j in range(mid + 1, r + 1):
                while left_lo <= mid and arr[j] - arr[left_lo] > upper:
                    left_lo += 1
                while left_hi <= mid and arr[j] - arr[left_hi] >= lower:
                    left_hi += 1
                count += left_hi - left_lo
            
            # 归并排序
            arr[l:r+1] = sorted(arr[l:r+1])
            
            return count
        
        return merge_count(prefix, 0, len(prefix) - 1)
```

---

## 题目 2：315. 计算右侧小于当前元素的个数

**问题**：对于每个元素，统计其右侧有多少个元素比它小。

**分析**：
- 经典逆序对变体
- 从右往左扫描，用树状数组统计

**解法：树状数组 + 离散化**

```python
class Solution:
    def countSmaller(self, nums: List[int]) -> List[int]:
        # 离散化
        sorted_unique = sorted(set(nums))
        rank = {v: i + 1 for i, v in enumerate(sorted_unique)}
        
        n = len(nums)
        m = len(sorted_unique)
        
        # 树状数组
        bit = [0] * (m + 2)
        
        def update(i: int) -> None:
            while i <= m:
                bit[i] += 1
                i += i & (-i)
        
        def query(i: int) -> int:
            s = 0
            while i > 0:
                s += bit[i]
                i -= i & (-i)
            return s
        
        result = []
        for i in range(n - 1, -1, -1):
            r = rank[nums[i]]
            result.append(query(r - 1))  # 统计比当前元素小的
            update(r)
        
        return result[::-1]
```

---

## 题目 3：2213. 由单个字符重复的最长子字符串

**问题**：给定字符串和修改操作，每次操作后求最长的单字符重复子串。

**分析**：
- 需要支持单点修改 + 区间查询
- 使用线段树维护：最长前缀、最长后缀、区间最长

**解法：线段树**

```python
class Solution:
    def longestRepeating(self, s: str, queryCharacters: str, queryIndices: List[int]) -> List[int]:
        n = len(s)
        s = list(s)  # 方便修改
        
        # 线段树节点信息
        # left_len: 从左端开始的最长单字符长度
        # right_len: 从右端开始的最长单字符长度
        # max_len: 区间内最长单字符长度
        # left_char: 左端字符
        # right_char: 右端字符
        # length: 区间长度
        
        tree = [[0, 0, 0, '', '', 0] for _ in range(4 * n)]
        
        def build(node: int, l: int, r: int) -> None:
            if l == r:
                tree[node] = [1, 1, 1, s[l], s[l], 1]
                return
            
            mid = (l + r) // 2
            build(2 * node, l, mid)
            build(2 * node + 1, mid + 1, r)
            push_up(node, l, r)
        
        def push_up(node: int, l: int, r: int) -> None:
            left = tree[2 * node]
            right = tree[2 * node + 1]
            mid = (l + r) // 2
            
            length = r - l + 1
            left_len = left[0]
            right_len = right[1]
            max_len = max(left[2], right[2])
            left_char = left[3]
            right_char = right[4]
            
            # 如果左子树右端与右子树左端字符相同，可以合并
            if left[4] == right[3]:
                if left[0] == mid - l + 1:  # 左子树全部相同
                    left_len = left[0] + right[0]
                if right[1] == r - mid:  # 右子树全部相同
                    right_len = right[1] + left[1]
                max_len = max(max_len, left[1] + right[0])
            
            tree[node] = [left_len, right_len, max_len, left_char, right_char, length]
        
        def update(node: int, l: int, r: int, pos: int, char: str) -> None:
            if l == r:
                tree[node] = [1, 1, 1, char, char, 1]
                return
            
            mid = (l + r) // 2
            if pos <= mid:
                update(2 * node, l, mid, pos, char)
            else:
                update(2 * node + 1, mid + 1, r, pos, char)
            push_up(node, l, r)
        
        build(1, 0, n - 1)
        
        result = []
        for i in range(len(queryIndices)):
            pos = queryIndices[i]
            char = queryCharacters[i]
            s[pos] = char
            update(1, 0, n - 1, pos, char)
            result.append(tree[1][2])
        
        return result
```

---

## 题目 4：699. 掉落的方块

**问题**：方块依次掉落，求每次掉落后的最大高度。

**分析**：
- 区间最值查询 + 区间赋值
- 线段树 + 懒标记，或离散化 + 扫描线

**解法：线段树 + 离散化**

```python
class Solution:
    def fallingSquares(self, positions: List[List[int]]) -> List[int]:
        # 离散化坐标
        coords = set()
        for left, size in positions:
            coords.add(left)
            coords.add(left + size - 1)
            coords.add(left + size)
        
        sorted_coords = sorted(coords)
        coord_map = {c: i for i, c in enumerate(sorted_coords)}
        m = len(sorted_coords)
        
        # 线段树
        tree = [0] * (4 * m)
        lazy = [0] * (4 * m)
        
        def push_down(node: int) -> None:
            if lazy[node] > 0:
                tree[2 * node] = max(tree[2 * node], lazy[node])
                tree[2 * node + 1] = max(tree[2 * node + 1], lazy[node])
                lazy[2 * node] = max(lazy[2 * node], lazy[node])
                lazy[2 * node + 1] = max(lazy[2 * node + 1], lazy[node])
                lazy[node] = 0
        
        def query(node: int, l: int, r: int, ql: int, qr: int) -> int:
            if qr < l or ql > r:
                return 0
            if ql <= l and r <= qr:
                return tree[node]
            
            push_down(node)
            mid = (l + r) // 2
            return max(query(2 * node, l, mid, ql, qr),
                      query(2 * node + 1, mid + 1, r, ql, qr))
        
        def update(node: int, l: int, r: int, ql: int, qr: int, val: int) -> None:
            if qr < l or ql > r:
                return
            if ql <= l and r <= qr:
                tree[node] = max(tree[node], val)
                lazy[node] = max(lazy[node], val)
                return
            
            push_down(node)
            mid = (l + r) // 2
            update(2 * node, l, mid, ql, qr, val)
            update(2 * node + 1, mid + 1, r, ql, qr, val)
            tree[node] = max(tree[2 * node], tree[2 * node + 1])
        
        result = []
        max_height = 0
        
        for left, size in positions:
            l = coord_map[left]
            r = coord_map[left + size - 1]
            
            # 查询当前区间的最大高度
            cur_height = query(1, 0, m - 1, l, r)
            new_height = cur_height + size
            
            # 更新区间
            update(1, 0, m - 1, l, r, new_height)
            
            max_height = max(max_height, new_height)
            result.append(max_height)
        
        return result
```

---

## 题目 5：732. 我的日程安排表 III

**问题**：实现日程管理器，返回每次预订后的最大重叠数。

**分析**：
- 动态区间加法 + 全局最大值
- 使用动态开点线段树

**解法：动态开点线段树**

```python
class MyCalendarThree:
    def __init__(self):
        self.tree = {}  # node -> [max_val, lazy]
    
    def _get(self, node: int) -> list:
        if node not in self.tree:
            self.tree[node] = [0, 0]
        return self.tree[node]
    
    def _push_down(self, node: int) -> None:
        cur = self._get(node)
        if cur[1] > 0:
            left = self._get(2 * node)
            right = self._get(2 * node + 1)
            left[0] += cur[1]
            left[1] += cur[1]
            right[0] += cur[1]
            right[1] += cur[1]
            cur[1] = 0
    
    def _update(self, node: int, l: int, r: int, ql: int, qr: int) -> None:
        if qr < l or ql > r:
            return
        
        cur = self._get(node)
        if ql <= l and r <= qr:
            cur[0] += 1
            cur[1] += 1
            return
        
        self._push_down(node)
        mid = (l + r) // 2
        self._update(2 * node, l, mid, ql, qr)
        self._update(2 * node + 1, mid + 1, r, ql, qr)
        
        left = self._get(2 * node)
        right = self._get(2 * node + 1)
        cur[0] = max(left[0], right[0])
    
    def book(self, start: int, end: int) -> int:
        self._update(1, 0, 10**9, start, end - 1)
        return self._get(1)[0]
```

---

## 题目 6：850. 矩形面积 II

**问题**：计算多个矩形的面积并。

**分析**：
- 经典扫描线问题
- 线段树维护 y 方向覆盖长度

**解法：扫描线 + 线段树**

```python
class Solution:
    def rectangleArea(self, rectangles: List[List[int]]) -> int:
        MOD = 10**9 + 7
        
        # 收集所有 y 坐标
        y_coords = set()
        for x1, y1, x2, y2 in rectangles:
            y_coords.add(y1)
            y_coords.add(y2)
        
        y_sorted = sorted(y_coords)
        y_map = {y: i for i, y in enumerate(y_sorted)}
        m = len(y_sorted)
        
        # 线段树
        count = [0] * (4 * m)
        length = [0] * (4 * m)
        
        def update(node: int, l: int, r: int, ql: int, qr: int, delta: int) -> None:
            if qr < l or ql > r:
                return
            if ql <= l and r <= qr:
                count[node] += delta
            else:
                mid = (l + r) // 2
                update(2 * node, l, mid, ql, qr, delta)
                update(2 * node + 1, mid + 1, r, ql, qr, delta)
            
            if count[node] > 0:
                length[node] = y_sorted[r + 1] - y_sorted[l] if r + 1 < m else 0
            elif l == r:
                length[node] = 0
            else:
                length[node] = length[2 * node] + length[2 * node + 1]
        
        # 扫描线事件
        events = []
        for x1, y1, x2, y2 in rectangles:
            events.append((x1, 1, y_map[y1], y_map[y2]))
            events.append((x2, -1, y_map[y1], y_map[y2]))
        
        events.sort()
        
        area = 0
        prev_x = events[0][0]
        
        for x, delta, y1, y2 in events:
            area += length[1] * (x - prev_x)
            area %= MOD
            update(1, 0, m - 2, y1, y2 - 1, delta)
            prev_x = x
        
        return area
```

---

## 题型分类总结

| 题目类型 | 核心数据结构 | 技巧 |
|---------|-------------|------|
| 逆序对/偏序 | 树状数组/归并 | 离散化 |
| 动态区间修改 | 线段树 | 懒标记 |
| 矩形面积 | 扫描线+线段树 | 坐标压缩 |
| 区间计数 | 主席树/整体二分 | 可持久化 |
| 多维查询 | CDQ分治/K-D树 | 降维 |

---

## 本章小结

本章通过 LeetCode 困难题展示了高级数据结构的实战应用：

1. **归并排序**：区间和计数、逆序对
2. **线段树**：动态区间最值、区间赋值
3. **扫描线**：矩形面积并
4. **动态开点**：大值域区间操作

**解题思路**：
1. 分析问题本质（统计/查询/修改）
2. 选择合适的数据结构
3. 处理值域问题（离散化/动态开点）
4. 注意边界条件

下一章是全书总结。
