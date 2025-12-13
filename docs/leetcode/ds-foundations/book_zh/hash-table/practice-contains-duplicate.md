# 实战：存在重复元素

这是 Set 最基础的应用——检测重复。

## 题目描述

> **LeetCode 217. 存在重复元素**
>
> 给你一个整数数组 nums。如果任一值在数组中出现至少两次，返回 true；如果数组中每个元素互不相同，返回 false。

**示例**：

```
输入：nums = [1,2,3,1]
输出：true

输入：nums = [1,2,3,4]
输出：false
```

## 解法一：暴力双重循环

最直接的想法：比较每一对元素。

```javascript
function containsDuplicate(nums) {
    const n = nums.length;
    for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
            if (nums[i] === nums[j]) {
                return true;
            }
        }
    }
    return false;
}
```

- **时间**：O(n²)
- **空间**：O(1)

## 解法二：排序后检查相邻

排序后，重复元素一定相邻。

```javascript
function containsDuplicate(nums) {
    nums.sort((a, b) => a - b);
    
    for (let i = 1; i < nums.length; i++) {
        if (nums[i] === nums[i - 1]) {
            return true;
        }
    }
    
    return false;
}
```

执行过程：

```
原数组：[1, 2, 3, 1]
排序后：[1, 1, 2, 3]
          ↑  ↑
          相邻相等，return true
```

- **时间**：O(n log n)
- **空间**：O(1)（原地排序）

## 解法三：哈希集合

核心思想：用 Set 记录已经出现的元素，如果新元素已在 Set 中，说明重复。

```javascript
function containsDuplicate(nums) {
    const seen = new Set();
    
    for (const num of nums) {
        if (seen.has(num)) {
            return true;
        }
        seen.add(num);
    }
    
    return false;
}
```

执行过程：

```
nums = [1, 2, 3, 1]

num=1: seen = {1}
num=2: seen = {1, 2}
num=3: seen = {1, 2, 3}
num=1: seen.has(1) = true → return true
```

- **时间**：O(n)
- **空间**：O(n)

### 更简洁的写法

利用 Set 的特性：重复元素不会增加 Set 的大小。

```javascript
function containsDuplicate(nums) {
    return new Set(nums).size !== nums.length;
}
```

一行代码搞定！

## 三种解法对比

| 解法 | 时间 | 空间 | 特点 |
|-----|------|------|------|
| 暴力 | O(n²) | O(1) | 简单但慢 |
| 排序 | O(n log n) | O(1) | 中等，修改原数组 |
| 哈希 | O(n) | O(n) | 最快，需要额外空间 |

实际应用中，哈希解法是最常用的，因为时间效率最高。

## 本章小结

存在重复元素是 Set 的入门级应用：

1. **Set 去重**：重复元素只会存储一次
2. **O(1) 查找**：快速判断元素是否存在
3. **空间换时间**：用 O(n) 空间换取 O(n) 时间

这道题虽然简单，但体现了哈希表解决问题的基本模式：**先查后存**。
