# 实战：两数之和

这是 LeetCode 的第 1 题，也是最经典的算法面试题之一。它看似简单，却能很好地展示**暴力解法**到**优化解法**的演进过程。

## 题目描述

给定一个整数数组 `nums` 和一个整数目标值 `target`，请你在该数组中找出和为目标值 `target` 的那**两个**整数，并返回它们的数组下标。

你可以假设每种输入只会对应一个答案，并且你不能使用两次同一个元素。

你可以按任意顺序返回答案。

**示例**：

```
输入：nums = [2,7,11,15], target = 9
输出：[0,1]
解释：因为 nums[0] + nums[1] == 9，返回 [0, 1]

输入：nums = [3,2,4], target = 6
输出：[1,2]

输入：nums = [3,3], target = 6
输出：[0,1]
```

## 暴力解法

最直接的想法：检查每一对数字，看它们的和是否等于 target。

```javascript
function twoSum(nums, target) {
    for (let i = 0; i < nums.length; i++) {
        for (let j = i + 1; j < nums.length; j++) {
            if (nums[i] + nums[j] === target) {
                return [i, j];
            }
        }
    }
    return null;
}
```

这个方法简单直观，但效率如何？

假设数组有 n 个元素：
- 外层循环 n 次
- 内层循环平均 n/2 次
- 总共约 n × n/2 = n²/2 次操作

时间复杂度是 **O(n²)**。当 n = 100000 时，需要 50 亿次操作，可能超时。

能不能更快？

## 换个角度思考

暴力解法的问题在于：对于每个 `nums[i]`，我们都要遍历整个数组去找有没有 `target - nums[i]`。

如果能快速判断某个值是否存在，就能省去内层循环。

什么数据结构能 O(1) 时间判断元素是否存在？**哈希表**！

## 哈希表解法

**思路**：
1. 遍历数组，对于每个元素 `nums[i]`
2. 计算它需要的"搭档"：`complement = target - nums[i]`
3. 在哈希表中查找是否存在这个搭档
4. 如果存在，找到答案
5. 如果不存在，把当前元素加入哈希表

```javascript
function twoSum(nums, target) {
    const seen = new Map(); // 存储：值 -> 索引
    
    for (let i = 0; i < nums.length; i++) {
        const complement = target - nums[i];
        
        // 查找搭档
        if (seen.has(complement)) {
            return [seen.get(complement), i];
        }
        
        // 记录当前元素
        seen.set(nums[i], i);
    }
    
    return null;
}
```

## 图解执行过程

以 `nums = [2, 7, 11, 15], target = 9` 为例：

```
i = 0, nums[i] = 2
  complement = 9 - 2 = 7
  seen 中没有 7
  seen: {2 → 0}

i = 1, nums[i] = 7
  complement = 9 - 7 = 2
  seen 中有 2，索引是 0
  返回 [0, 1]
```

再看 `nums = [3, 2, 4], target = 6`：

```
i = 0, nums[i] = 3
  complement = 6 - 3 = 3
  seen 中没有 3
  seen: {3 → 0}

i = 1, nums[i] = 2
  complement = 6 - 2 = 4
  seen 中没有 4
  seen: {3 → 0, 2 → 1}

i = 2, nums[i] = 4
  complement = 6 - 4 = 2
  seen 中有 2，索引是 1
  返回 [1, 2]
```

## 为什么先查找再插入

注意代码中的顺序：**先查找，再把当前元素加入哈希表**。

```javascript
// 正确顺序
if (seen.has(complement)) { ... }
seen.set(nums[i], i);

// 错误顺序
seen.set(nums[i], i);
if (seen.has(complement)) { ... }
```

如果先插入再查找，当 `target = 6, nums[i] = 3` 时，会找到自己作为搭档，但题目要求不能使用同一元素两次。

那 `[3, 3], target = 6` 怎么办？

- i = 0: complement = 3，seen 中没有 3，插入 {3 → 0}
- i = 1: complement = 3，seen 中有 3（索引 0），返回 [0, 1]

两个不同位置的 3 能正确匹配。先查找再插入的顺序正好处理了这种情况。

## 复杂度分析

**时间复杂度**：O(n)
- 遍历数组一次
- 每次哈希表查找和插入都是 O(1)

**空间复杂度**：O(n)
- 最坏情况下，哈希表存储 n-1 个元素

## 与暴力解法的对比

| 方法 | 时间复杂度 | 空间复杂度 |
|-----|-----------|-----------|
| 暴力 | O(n²) | O(1) |
| 哈希表 | O(n) | O(n) |

这是一个典型的**空间换时间**的例子。牺牲 O(n) 的空间，把时间从 O(n²) 降到了 O(n)。

当 n = 100000 时：
- 暴力法：约 50 亿次操作
- 哈希表：约 10 万次操作

效率相差 5 万倍！

## 变体问题

**如果数组是排序的呢？**

可以用双指针技巧，空间复杂度降为 O(1)：

```javascript
function twoSumSorted(nums, target) {
    let left = 0;
    let right = nums.length - 1;
    
    while (left < right) {
        const sum = nums[left] + nums[right];
        
        if (sum === target) {
            return [left, right];
        } else if (sum < target) {
            left++;  // 需要更大的和
        } else {
            right--; // 需要更小的和
        }
    }
    
    return null;
}
```

但本题的数组不是排序的，如果先排序再用双指针，排序本身就需要 O(n log n)，还不如直接用哈希表的 O(n)。

## 小结

两数之和是学习算法优化的绝佳案例：

1. **暴力思路**：双重循环检查所有配对，O(n²)
2. **优化思路**：用哈希表加速查找，O(n)
3. **核心技巧**：把"查找配对"转化为"哈希表查询"

这种"用空间换时间"的思路在算法中非常常见。当你看到 O(n²) 的暴力解法时，可以想想能否用哈希表等数据结构优化。

下一章，我们来看链表的第一道题——"合并两个有序链表"。
