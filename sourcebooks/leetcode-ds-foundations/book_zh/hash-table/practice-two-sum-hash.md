# 实战：两数之和（哈希解法）

"两数之和"是 LeetCode 的第一题，也是哈希表最经典的应用场景。我们在数组章节用暴力法解过，现在用哈希表来优化。

## 题目描述

> **LeetCode 1. 两数之和**
>
> 给定一个整数数组 nums 和一个整数目标值 target，请你在该数组中找出和为目标值 target 的那两个整数，并返回它们的数组下标。
>
> 你可以假设每种输入只会对应一个答案，且同一个元素不能用两次。

**示例**：

```
输入：nums = [2, 7, 11, 15], target = 9
输出：[0, 1]
解释：nums[0] + nums[1] = 2 + 7 = 9
```

## 暴力解法回顾

双重循环，O(n²)：

```javascript
function twoSum(nums, target) {
    for (let i = 0; i < nums.length; i++) {
        for (let j = i + 1; j < nums.length; j++) {
            if (nums[i] + nums[j] === target) {
                return [i, j];
            }
        }
    }
    return [];
}
```

问题：对于每个 nums[i]，我们要在剩余元素中找 target - nums[i]，这个查找是 O(n)。

能不能把查找优化到 O(1)？

## 哈希表解法

核心思想：用哈希表记录已经遍历过的数及其索引，查找变成 O(1)。

```javascript
function twoSum(nums, target) {
    const map = new Map();  // 值 → 索引
    
    for (let i = 0; i < nums.length; i++) {
        const complement = target - nums[i];
        
        // 检查补数是否已存在
        if (map.has(complement)) {
            return [map.get(complement), i];
        }
        
        // 当前数加入哈希表
        map.set(nums[i], i);
    }
    
    return [];
}
```

### 执行过程

以 `nums = [2, 7, 11, 15], target = 9` 为例：

```
i=0, num=2:
  complement = 9 - 2 = 7
  map.has(7) = false
  map.set(2, 0) → map = {2: 0}

i=1, num=7:
  complement = 9 - 7 = 2
  map.has(2) = true，索引是 0
  返回 [0, 1] ✓
```

只遍历了两个元素就找到了答案！

### 为什么先检查再插入？

注意代码中的顺序：**先检查** complement 是否存在，**再** 把当前数插入。

这样做是为了避免找到自己。比如 `nums = [3, 3], target = 6`：

```
i=0, num=3:
  complement = 6 - 3 = 3
  map.has(3) = false（此时 map 还是空的）
  map.set(3, 0) → map = {3: 0}

i=1, num=3:
  complement = 6 - 3 = 3
  map.has(3) = true，索引是 0
  返回 [0, 1] ✓
```

如果先插入再检查，i=0 时就会找到自己，返回 [0, 0]，错了！

## 复杂度分析

| 方法 | 时间复杂度 | 空间复杂度 |
|-----|-----------|-----------|
| 暴力法 | O(n²) | O(1) |
| 哈希表 | O(n) | O(n) |

哈希表解法是典型的**空间换时间**：用 O(n) 的额外空间，把时间从 O(n²) 降到 O(n)。

## 常见错误

1. **先插入再检查**：可能找到自己
2. **返回值是索引，不是值**：题目要求返回下标
3. **没有处理无解情况**：虽然题目说一定有解，但实际中应考虑

## 模式总结

这道题展示了哈希表最经典的应用模式：

**"两个数的关系"问题 → 哈希表**

- 两数之和：找 target - nums[i]
- 两数之差：找 nums[i] - k 或 nums[i] + k
- 两数配对：找满足某种关系的另一个数

核心技巧：**边遍历边构建哈希表**，一次遍历解决问题。

## 本章小结

哈希表在"两数之和"中的应用：

1. 用 Map 存储 **值→索引** 的映射
2. 对每个数，O(1) 查找其补数是否存在
3. 边遍历边构建，无需两次遍历
4. 注意先检查再插入，避免找到自己

这个模式在很多题目中都有变体，掌握它是用好哈希表的第一步。
