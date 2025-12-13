# 实战：存在重复元素 II

上一章是"是否存在重复"，这一章加上**距离约束**。

## 题目描述

> **LeetCode 219. 存在重复元素 II**
>
> 给你一个整数数组 nums 和一个整数 k，判断数组中是否存在两个不同的索引 i 和 j，满足 nums[i] == nums[j] 且 abs(i - j) <= k。

**示例**：

```
输入：nums = [1,2,3,1], k = 3
输出：true
解释：nums[0] = nums[3] = 1，|0-3| = 3 <= 3 ✓

输入：nums = [1,0,1,1], k = 1
输出：true
解释：nums[2] = nums[3] = 1，|2-3| = 1 <= 1 ✓

输入：nums = [1,2,3,1,2,3], k = 2
输出：false
解释：索引差都大于 2
```

## 解法一：哈希表存储最近索引

核心思想：用哈希表记录每个元素**最近一次**出现的索引。

```javascript
function containsNearbyDuplicate(nums, k) {
    const indexMap = new Map();  // 元素 → 最近出现的索引
    
    for (let i = 0; i < nums.length; i++) {
        const num = nums[i];
        
        if (indexMap.has(num)) {
            const prevIndex = indexMap.get(num);
            if (i - prevIndex <= k) {
                return true;
            }
        }
        
        // 无论是否存在，都更新为当前索引
        indexMap.set(num, i);
    }
    
    return false;
}
```

### 执行过程

```
nums = [1, 2, 3, 1], k = 3

i=0, num=1: indexMap = {1: 0}
i=1, num=2: indexMap = {1: 0, 2: 1}
i=2, num=3: indexMap = {1: 0, 2: 1, 3: 2}
i=3, num=1: 
    indexMap.has(1) = true, prevIndex = 0
    i - prevIndex = 3 - 0 = 3 <= k=3 ✓
    return true
```

### 复杂度

- **时间**：O(n)
- **空间**：O(n)

## 解法二：滑动窗口 + 哈希集合

另一种思路：维护一个大小为 k 的滑动窗口，窗口内的元素用 Set 存储。

如果新元素在窗口的 Set 中，说明在距离 k 内存在重复。

```javascript
function containsNearbyDuplicate(nums, k) {
    const window = new Set();
    
    for (let i = 0; i < nums.length; i++) {
        // 如果窗口已满，移除最左边的元素
        if (i > k) {
            window.delete(nums[i - k - 1]);
        }
        
        // 检查当前元素是否在窗口中
        if (window.has(nums[i])) {
            return true;
        }
        
        // 加入窗口
        window.add(nums[i]);
    }
    
    return false;
}
```

### 执行过程

```
nums = [1, 0, 1, 1], k = 1

i=0: window = {1}
i=1: i(1) <= k(1), 不删除
     window.has(0)? No
     window = {1, 0}
i=2: i(2) > k(1), 删除 nums[0]=1
     window = {0}
     window.has(1)? No
     window = {0, 1}
i=3: i(3) > k(1), 删除 nums[1]=0
     window = {1}
     window.has(1)? Yes → return true
```

### 复杂度

- **时间**：O(n)
- **空间**：O(min(n, k))，窗口最多 k 个元素

## 两种方法对比

| 方法 | 空间 | 思路 |
|-----|------|------|
| 存储索引 | O(n) | 记录每个元素最后出现的位置 |
| 滑动窗口 | O(min(n,k)) | 只保留最近 k 个元素 |

当 k 很小时，滑动窗口更省空间。

## 本章小结

存在重复元素 II 展示了哈希表存储**索引**的用法：

1. **存储索引**：Map 不仅存值，还存位置信息
2. **滑动窗口**：用 Set 维护固定大小的窗口
3. **距离约束**：转化为"窗口内是否存在"的问题

这道题是上一章的进阶版，增加了距离约束，解法也相应地更复杂。
