# 实战：两个数组的交集

这道题展示了Set在处理"去重"和"集合运算"中的简洁优雅。

## 问题描述

给定两个数组`nums1`和`nums2`，返回它们的**交集**。输出结果中的每个元素一定是**唯一**的，可以不考虑输出结果的顺序。

**示例**：
```
输入: nums1 = [1,2,2,1], nums2 = [2,2]
输出: [2]

输入: nums1 = [4,9,5], nums2 = [9,4,9,8,4]
输出: [9,4] 或 [4,9]
```

## 思路分析

交集的定义：**同时出现在两个数组中**的元素。

关键点：
- 需要去重（每个元素只出现一次）
- 需要快速判断元素是否存在

Set完美满足这两个需求！

## 方法一：两个Set

```javascript
/**
 * @param {number[]} nums1
 * @param {number[]} nums2
 * @return {number[]}
 */
function intersection(nums1, nums2) {
    const set1 = new Set(nums1);
    const set2 = new Set(nums2);
    
    const result = [];
    for (const num of set1) {
        if (set2.has(num)) {
            result.push(num);
        }
    }
    
    return result;
}
```

## 方法二：一行代码

利用数组的`filter`方法和Set的`has`方法：

```javascript
function intersection(nums1, nums2) {
    const set1 = new Set(nums1);
    return [...new Set(nums2.filter(num => set1.has(num)))];
}
```

**解析**：
1. `new Set(nums1)`：去重后的nums1
2. `nums2.filter(num => set1.has(num))`：筛选出在set1中存在的nums2元素
3. `new Set(...)`：去除筛选结果中的重复
4. `[...set]`：转换回数组

## 执行过程图解

以`nums1 = [1,2,2,1]`, `nums2 = [2,2]`为例：

```
方法一:
set1 = {1, 2}
set2 = {2}

遍历 set1:
  1: set2.has(1)? 否
  2: set2.has(2)? 是, 加入结果

result = [2]

方法二:
set1 = {1, 2}
nums2.filter(num => set1.has(num)) = [2, 2]
new Set([2, 2]) = {2}
[...{2}] = [2]
```

## 优化：遍历较小的集合

```javascript
function intersection(nums1, nums2) {
    const set1 = new Set(nums1);
    const set2 = new Set(nums2);
    
    // 遍历较小的集合
    const [smaller, larger] = set1.size <= set2.size 
        ? [set1, set2] 
        : [set2, set1];
    
    const result = [];
    for (const num of smaller) {
        if (larger.has(num)) {
            result.push(num);
        }
    }
    
    return result;
}
```

## 方法三：排序 + 双指针

如果不使用额外空间（除了结果数组）：

```javascript
function intersection(nums1, nums2) {
    nums1.sort((a, b) => a - b);
    nums2.sort((a, b) => a - b);
    
    const result = [];
    let i = 0, j = 0;
    
    while (i < nums1.length && j < nums2.length) {
        if (nums1[i] === nums2[j]) {
            // 避免重复加入
            if (result.length === 0 || result[result.length - 1] !== nums1[i]) {
                result.push(nums1[i]);
            }
            i++;
            j++;
        } else if (nums1[i] < nums2[j]) {
            i++;
        } else {
            j++;
        }
    }
    
    return result;
}
```

## 三种方法对比

| 方法 | 时间复杂度 | 空间复杂度 | 特点 |
|------|------------|------------|------|
| 两Set | O(n+m) | O(n+m) | 最简洁 |
| 一行代码 | O(n+m) | O(n+m) | 最优雅 |
| 排序+双指针 | O(n log n + m log m) | O(1) | 空间最优 |

## 变体：交集II（保留重复）

LeetCode 350要求保留重复元素：

```
输入: nums1 = [1,2,2,1], nums2 = [2,2]
输出: [2,2]
```

解法：用Map记录计数

```javascript
function intersect(nums1, nums2) {
    const map = new Map();
    
    for (const num of nums1) {
        map.set(num, (map.get(num) || 0) + 1);
    }
    
    const result = [];
    for (const num of nums2) {
        if (map.get(num) > 0) {
            result.push(num);
            map.set(num, map.get(num) - 1);
        }
    }
    
    return result;
}
```

## 复杂度分析

**时间复杂度：O(n + m)**
- 创建两个Set：O(n) + O(m)
- 遍历较小Set：O(min(n, m))

**空间复杂度：O(n + m)**
- 两个Set的空间

## 集合运算扩展

除了交集，还可以实现其他集合运算：

```javascript
// 并集
function union(nums1, nums2) {
    return [...new Set([...nums1, ...nums2])];
}

// 差集（nums1 - nums2）
function difference(nums1, nums2) {
    const set2 = new Set(nums2);
    return [...new Set(nums1.filter(num => !set2.has(num)))];
}

// 对称差集（只在一个数组中出现）
function symmetricDifference(nums1, nums2) {
    const set1 = new Set(nums1);
    const set2 = new Set(nums2);
    return [
        ...nums1.filter(num => !set2.has(num)),
        ...nums2.filter(num => !set1.has(num))
    ];
}
```

## 小结

两个数组的交集核心：

1. **Set去重**：自动处理重复元素
2. **O(1)查找**：快速判断元素是否存在
3. **简洁代码**：一行代码搞定

这道题是Set应用的入门题，展示了Set在集合运算中的简洁和高效。
