# 实战：最长连续序列

这道题要求 O(n) 时间复杂度，排序是 O(n log n)，不符合要求。怎么办？

哈希表的 O(1) 查找能力是关键。

## 题目描述

> **LeetCode 128. 最长连续序列**
>
> 给定一个未排序的整数数组 nums，找出数字连续的最长序列的长度。
>
> **请你设计并实现时间复杂度为 O(n) 的算法解决此问题。**

**示例**：

```
输入：nums = [100, 4, 200, 1, 3, 2]
输出：4
解释：最长连续序列是 [1, 2, 3, 4]，长度为 4
```

## 暴力思路

最直接的想法：排序后遍历，统计连续元素的长度。

```javascript
function longestConsecutive(nums) {
    if (nums.length === 0) return 0;
    
    nums.sort((a, b) => a - b);
    
    let maxLen = 1, currentLen = 1;
    for (let i = 1; i < nums.length; i++) {
        if (nums[i] === nums[i-1] + 1) {
            currentLen++;
            maxLen = Math.max(maxLen, currentLen);
        } else if (nums[i] !== nums[i-1]) {
            currentLen = 1;
        }
    }
    
    return maxLen;
}
```

时间复杂度 O(n log n)，不符合要求。

## 哈希表解法

核心思想：用 Set 存储所有数字，对于每个数字，只有当它是序列的**起点**时才开始计数。

怎么判断是不是起点？如果 `num - 1` 不存在，那 `num` 就是某个序列的起点。

```javascript
function longestConsecutive(nums) {
    if (nums.length === 0) return 0;
    
    const numSet = new Set(nums);
    let maxLength = 0;
    
    for (const num of numSet) {
        // 只从序列起点开始计数
        if (!numSet.has(num - 1)) {
            let currentNum = num;
            let currentLength = 1;
            
            // 向后查找连续数字
            while (numSet.has(currentNum + 1)) {
                currentNum++;
                currentLength++;
            }
            
            maxLength = Math.max(maxLength, currentLength);
        }
    }
    
    return maxLength;
}
```

### 执行过程

```
nums = [100, 4, 200, 1, 3, 2]
numSet = {100, 4, 200, 1, 3, 2}

遍历 numSet：

num = 100:
  99 不在 Set 中 → 100 是起点
  查找 101? 不存在
  序列 [100]，长度 1

num = 4:
  3 在 Set 中 → 4 不是起点，跳过

num = 200:
  199 不在 Set 中 → 200 是起点
  查找 201? 不存在
  序列 [200]，长度 1

num = 1:
  0 不在 Set 中 → 1 是起点
  查找 2? 存在 → currentNum = 2, length = 2
  查找 3? 存在 → currentNum = 3, length = 3
  查找 4? 存在 → currentNum = 4, length = 4
  查找 5? 不存在
  序列 [1,2,3,4]，长度 4

num = 3:
  2 在 Set 中 → 3 不是起点，跳过

num = 2:
  1 在 Set 中 → 2 不是起点，跳过

最大长度：4
```

## 为什么是 O(n)？

你可能会问：外层循环是 O(n)，内层 while 循环不也是遍历吗？总时间不是 O(n²)？

**关键洞察**：每个数字最多被访问两次。

1. 外层循环遍历时访问一次
2. while 循环中被访问一次（作为某个序列的一部分）

比如数字 3：
- 在外层遍历到 3 时，判断 2 存在，跳过
- 在 1 的 while 循环中，被访问一次

总操作次数 ≤ 2n，所以是 O(n)。

这是一种常见的复杂度分析技巧：**均摊分析**。

## 复杂度

- **时间**：O(n)
- **空间**：O(n)，存储所有数字的 Set

## 为什么一定要判断起点？

如果不判断起点会怎样？

```javascript
// 错误做法
for (const num of numSet) {
    let currentNum = num;
    let currentLength = 1;
    while (numSet.has(currentNum + 1)) {
        currentNum++;
        currentLength++;
    }
    maxLength = Math.max(maxLength, currentLength);
}
```

对于 `nums = [1, 2, 3, 4]`：
- 遍历到 1，计数 1→2→3→4，长度 4
- 遍历到 2，计数 2→3→4，长度 3（重复！）
- 遍历到 3，计数 3→4，长度 2（重复！）
- 遍历到 4，长度 1（重复！）

时间复杂度退化为 O(n²)！

判断起点的目的就是**避免重复计数**。

## 本章小结

最长连续序列展示了哈希表的一个重要用法——**O(1) 判断存在性**：

1. 用 Set 存储所有数字，查找 O(1)
2. 只从序列起点开始计数，避免重复
3. 均摊分析证明总时间 O(n)

这道题的精妙之处在于"起点判断"这个优化，它把看似 O(n²) 的算法降为 O(n)。
