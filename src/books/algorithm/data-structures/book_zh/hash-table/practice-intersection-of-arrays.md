# 实战：两个数组的交集

这是 Set 的经典应用场景——求交集。

## 题目描述

> **LeetCode 349. 两个数组的交集**
>
> 给定两个数组 nums1 和 nums2，返回它们的交集。
> 输出结果中的每个元素一定是唯一的。可以不考虑输出结果的顺序。

**示例**：

```
输入：nums1 = [1,2,2,1], nums2 = [2,2]
输出：[2]

输入：nums1 = [4,9,5], nums2 = [9,4,9,8,4]
输出：[9,4]
```

关键点：结果**不重复**。

## 暴力解法

最直接的想法：双重循环比较。

```javascript
function intersection(nums1, nums2) {
    const result = new Set();
    
    for (const num1 of nums1) {
        for (const num2 of nums2) {
            if (num1 === num2) {
                result.add(num1);
            }
        }
    }
    
    return [...result];
}
```

时间复杂度 O(m × n)，效率较低。

## 哈希集合解法

核心思想：
1. 将第一个数组的元素放入 Set（自动去重）
2. 遍历第二个数组，检查元素是否在 Set 中

```javascript
function intersection(nums1, nums2) {
    const set1 = new Set(nums1);
    const result = new Set();
    
    for (const num of nums2) {
        if (set1.has(num)) {
            result.add(num);
        }
    }
    
    return [...result];
}
```

### 执行过程

```
nums1 = [1, 2, 2, 1]
nums2 = [2, 2]

Step 1: 构建 set1
set1 = {1, 2}  // 自动去重

Step 2: 遍历 nums2
num = 2: set1.has(2) = true → result.add(2)
num = 2: set1.has(2) = true → result 已有 2，不变

结果：[2]
```

### 更简洁的写法

利用数组的 `filter` 方法：

```javascript
function intersection(nums1, nums2) {
    const set1 = new Set(nums1);
    const set2 = new Set(nums2);
    return [...set1].filter(num => set2.has(num));
}
```

## 复杂度分析

- **时间**：O(m + n)
  - 构建 set1：O(m)
  - 遍历 nums2 并查找：O(n)
- **空间**：O(m + n)，两个 Set

## 排序 + 双指针

如果不允许额外空间，可以用排序 + 双指针：

```javascript
function intersection(nums1, nums2) {
    nums1.sort((a, b) => a - b);
    nums2.sort((a, b) => a - b);
    
    const result = [];
    let i = 0, j = 0;
    
    while (i < nums1.length && j < nums2.length) {
        if (nums1[i] < nums2[j]) {
            i++;
        } else if (nums1[i] > nums2[j]) {
            j++;
        } else {
            // 相等，加入结果（去重）
            if (result.length === 0 || result[result.length - 1] !== nums1[i]) {
                result.push(nums1[i]);
            }
            i++;
            j++;
        }
    }
    
    return result;
}
```

时间 O((m + n) log(m + n))，空间 O(1)（不考虑排序的栈空间）。

## 本章小结

两个数组的交集是 Set 的基础应用：

1. **Set 去重**：构建 Set 自动去除重复元素
2. **O(1) 查找**：检查元素是否存在
3. **两种解法**：哈希集合更快，排序+双指针更省空间

这道题虽然简单，但展示了 Set 在集合运算中的价值。
