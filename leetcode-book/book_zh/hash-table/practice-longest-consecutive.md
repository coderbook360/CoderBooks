# 实战：最长连续序列

这道题要求O(n)时间复杂度，排序是O(n log n)所以不行。哈希表的O(1)查找能力在这里大显身手。

## 问题描述

给定一个未排序的整数数组`nums`，找出数字连续的最长序列的长度。

请你设计并实现时间复杂度为O(n)的算法。

**示例**：
```
输入: nums = [100, 4, 200, 1, 3, 2]
输出: 4
解释: 最长连续序列是 [1, 2, 3, 4]，长度为4

输入: nums = [0, 3, 7, 2, 5, 8, 4, 6, 0, 1]
输出: 9
解释: 最长连续序列是 [0, 1, 2, 3, 4, 5, 6, 7, 8]，长度为9
```

## 思路分析

### 暴力思路

对于每个数，检查它+1, +2, +3...是否存在。但这样查找每个数都要O(n)，总共O(n²)。

### 优化关键

1. **用Set存储**：查找是否存在变成O(1)
2. **只从序列起点开始**：避免重复计算

### 什么是序列起点？

如果`num - 1`不存在，那么`num`就是某个序列的起点。

例如`[100, 4, 200, 1, 3, 2]`中：
- 1是起点（0不存在）
- 100是起点（99不存在）
- 200是起点（199不存在）
- 2, 3, 4不是起点（它们前面的数存在）

## 完整实现

```javascript
/**
 * @param {number[]} nums
 * @return {number}
 */
function longestConsecutive(nums) {
    const set = new Set(nums);
    let maxLen = 0;
    
    for (const num of set) {
        // 只从序列起点开始计数
        if (!set.has(num - 1)) {
            let current = num;
            let len = 1;
            
            // 向后延伸
            while (set.has(current + 1)) {
                current++;
                len++;
            }
            
            maxLen = Math.max(maxLen, len);
        }
    }
    
    return maxLen;
}
```

## 执行过程图解

以`nums = [100, 4, 200, 1, 3, 2]`为例：

```
set = {100, 4, 200, 1, 3, 2}

遍历 100:
  99 不在 set 中 → 100 是起点
  检查 101: 不存在
  len = 1

遍历 4:
  3 在 set 中 → 4 不是起点，跳过

遍历 200:
  199 不在 set 中 → 200 是起点
  检查 201: 不存在
  len = 1

遍历 1:
  0 不在 set 中 → 1 是起点
  检查 2: 存在，len = 2
  检查 3: 存在，len = 3
  检查 4: 存在，len = 4
  检查 5: 不存在
  len = 4 ← 最长！

遍历 3:
  2 在 set 中 → 3 不是起点，跳过

遍历 2:
  1 在 set 中 → 2 不是起点，跳过

maxLen = 4
```

## 为什么是O(n)？

虽然有嵌套循环，但：
- 外层循环遍历n个数
- 内层while循环总共执行的次数等于**所有序列长度之和**
- 每个数最多被while循环访问一次

所以总操作数是O(n) + O(n) = O(n)。

## 为什么要判断起点？

如果不判断起点，从每个数都开始延伸：
- 从1延伸：1→2→3→4，访问4次
- 从2延伸：2→3→4，访问3次
- 从3延伸：3→4，访问2次
- 从4延伸：4，访问1次

同一个序列被重复遍历，时间复杂度退化为O(n²)。

## 另一种思路：并查集

虽然不如哈希表简洁，但并查集也能O(n)解决：

```javascript
function longestConsecutive(nums) {
    if (nums.length === 0) return 0;
    
    const parent = new Map();
    const size = new Map();
    
    // 初始化
    for (const num of nums) {
        parent.set(num, num);
        size.set(num, 1);
    }
    
    function find(x) {
        if (parent.get(x) !== x) {
            parent.set(x, find(parent.get(x)));
        }
        return parent.get(x);
    }
    
    function union(x, y) {
        const px = find(x), py = find(y);
        if (px === py) return;
        if (size.get(px) < size.get(py)) {
            parent.set(px, py);
            size.set(py, size.get(py) + size.get(px));
        } else {
            parent.set(py, px);
            size.set(px, size.get(px) + size.get(py));
        }
    }
    
    // 合并相邻的数
    for (const num of nums) {
        if (parent.has(num - 1)) union(num, num - 1);
        if (parent.has(num + 1)) union(num, num + 1);
    }
    
    return Math.max(...size.values());
}
```

## 处理重复元素

Set自动去重，所以`[1, 2, 2, 3]`和`[1, 2, 3]`处理结果相同。

## 复杂度分析

**时间复杂度：O(n)**
- 创建Set：O(n)
- 遍历Set：O(n)
- 每个数最多被while访问一次：O(n)

**空间复杂度：O(n)**
- Set存储n个数

## 边界情况

| 输入 | 分析 | 结果 |
|------|------|------|
| `[]` | 空数组 | 0 |
| `[1]` | 单元素 | 1 |
| `[1,1,1]` | 全相同 | 1 |
| `[1,3,5]` | 无连续 | 1 |

## 小结

最长连续序列的核心：

1. **Set查找**：O(1)判断数字是否存在
2. **起点优化**：只从`num-1`不存在的数开始延伸
3. **时间分析**：每个数最多被访问两次（一次起点判断，一次延伸）

这道题展示了哈希表在"连续性"问题中的应用——当需要快速判断相邻元素是否存在时，Set是最佳选择。
