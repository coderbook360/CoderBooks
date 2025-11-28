# 实战：两数之和（哈希优化）

两数之和是LeetCode第一题，也是哈希表最经典的入门应用。它完美展示了哈希表如何将O(n²)暴力解法优化为O(n)。

## 问题描述

给定一个整数数组`nums`和一个目标值`target`，在数组中找出和为目标值的两个数的索引。

假设每种输入只有一个答案，且同一个元素不能使用两次。

**示例**：
```
输入: nums = [2,7,11,15], target = 9
输出: [0,1]
解释: nums[0] + nums[1] = 2 + 7 = 9
```

## 暴力解法：O(n²)

两重循环枚举所有组合：

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

当数组很大时，这个方法太慢了。

## 哈希表优化：O(n)

**核心思想**：我们需要的不是两个数，而是"配对"。

对于每个数`nums[i]`，我们需要找到`target - nums[i]`。

用哈希表存储已遍历的数和它们的索引，就能O(1)查找配对数是否存在。

```javascript
/**
 * @param {number[]} nums
 * @param {number} target
 * @return {number[]}
 */
function twoSum(nums, target) {
    const map = new Map();  // 值 → 索引
    
    for (let i = 0; i < nums.length; i++) {
        const complement = target - nums[i];
        
        // 检查配对数是否已存在
        if (map.has(complement)) {
            return [map.get(complement), i];
        }
        
        // 存储当前数和索引
        map.set(nums[i], i);
    }
    
    return [];
}
```

## 执行过程图解

以`nums = [2,7,11,15]`, `target = 9`为例：

```
i=0, nums[0]=2:
  complement = 9 - 2 = 7
  map 中没有 7
  存入 map: {2 → 0}

i=1, nums[1]=7:
  complement = 9 - 7 = 2
  map 中有 2！索引是 0
  返回 [0, 1]
```

## 为什么一次遍历就够了？

假设答案是`[i, j]`，其中`i < j`：
- 遍历到`i`时，把`nums[i]`存入map
- 遍历到`j`时，查找`target - nums[j]`，正好是`nums[i]`，存在！

不需要先把所有数都存入map，边遍历边存储即可。

## 两遍哈希表版本

先存储所有数，再查找：

```javascript
function twoSum(nums, target) {
    const map = new Map();
    
    // 第一遍：存储所有数
    for (let i = 0; i < nums.length; i++) {
        map.set(nums[i], i);
    }
    
    // 第二遍：查找配对
    for (let i = 0; i < nums.length; i++) {
        const complement = target - nums[i];
        // 注意：配对数不能是自己
        if (map.has(complement) && map.get(complement) !== i) {
            return [i, map.get(complement)];
        }
    }
    
    return [];
}
```

这个版本需要额外处理"配对数是自己"的情况。一遍哈希表不需要，因为还没存入自己时就已经返回了。

## 处理重复元素

如果有重复元素，map会存储最后一个的索引：

```
nums = [3, 3], target = 6
第一遍存储后：map = {3 → 1}
第二遍查找：
  i=0, complement=3, map.get(3)=1, 1≠0, 返回[0,1]
```

一遍哈希表自动处理了这种情况。

## 复杂度分析

**时间复杂度：O(n)**
- 遍历一次数组
- 每次map操作O(1)

**空间复杂度：O(n)**
- map最多存储n个元素

## 变体：返回值而非索引

如果题目要求返回两个数的值：

```javascript
function twoSumValues(nums, target) {
    const set = new Set();
    
    for (const num of nums) {
        const complement = target - num;
        if (set.has(complement)) {
            return [complement, num];
        }
        set.add(num);
    }
    
    return [];
}
```

不需要存索引，用Set更简洁。

## 变体：判断是否存在

```javascript
function hasTwoSum(nums, target) {
    const set = new Set();
    
    for (const num of nums) {
        if (set.has(target - num)) {
            return true;
        }
        set.add(num);
    }
    
    return false;
}
```

## 与双指针解法的对比

如果数组已排序，可以用双指针O(n)解决：

```javascript
function twoSumSorted(nums, target) {
    let left = 0, right = nums.length - 1;
    
    while (left < right) {
        const sum = nums[left] + nums[right];
        if (sum === target) return [left, right];
        if (sum < target) left++;
        else right--;
    }
    
    return [];
}
```

| 方法 | 时间 | 空间 | 要求 |
|------|------|------|------|
| 哈希表 | O(n) | O(n) | 无 |
| 双指针 | O(n) | O(1) | 数组已排序 |

如果数组未排序但需要O(1)空间，可以先排序O(n log n)再双指针。

## 小结

两数之和的哈希优化核心：

1. **问题转化**：找`a + b = target` → 对每个`a`，查找`target - a`是否存在
2. **一边遍历一边存储**：避免找到自己
3. **Map存值→索引**：方便返回索引

这道题是哈希表入门的经典，它的思想会在很多变体题中反复出现：三数之和、四数之和、字母异位词等。
