# 实战：多数元素

这道题展示了分治在寻找特殊元素中的应用。

## 问题描述

给定一个大小为`n`的数组`nums`，返回其中的多数元素。多数元素是指在数组中出现次数**大于**`n/2`的元素。

你可以假设数组是非空的，并且给定的数组总是存在多数元素。

## 思路分析

### 方法1：哈希表计数

```javascript
function majorityElement(nums) {
    const count = {};
    const half = nums.length / 2;
    
    for (const num of nums) {
        count[num] = (count[num] || 0) + 1;
        if (count[num] > half) return num;
    }
}
```

O(n)时间，O(n)空间。

### 方法2：排序

```javascript
function majorityElement(nums) {
    nums.sort((a, b) => a - b);
    return nums[Math.floor(nums.length / 2)];
}
```

多数元素排序后必然占据中间位置。O(n log n)时间，O(log n)空间。

### 方法3：分治

接下来我们用分治方法解决这个问题。

## 分治思路

将数组分成两半，递归找出左右两半的多数元素。

如果左右多数元素相同，它就是整体的多数元素。

如果不同，数一下哪个在整体中出现次数更多。

### 关键性质

多数元素在整体中出现超过n/2次，所以它必然是左半部分或右半部分的多数元素（或两者都是）。

## 代码实现

```javascript
function majorityElement(nums) {
    return majority(nums, 0, nums.length - 1);
}

function majority(nums, left, right) {
    // 基准情况：只有一个元素
    if (left === right) {
        return nums[left];
    }
    
    const mid = Math.floor((left + right) / 2);
    
    // 递归找左右两半的多数元素
    const leftMajor = majority(nums, left, mid);
    const rightMajor = majority(nums, mid + 1, right);
    
    // 如果相同，直接返回
    if (leftMajor === rightMajor) {
        return leftMajor;
    }
    
    // 不同，数一下哪个出现更多
    const leftCount = countInRange(nums, leftMajor, left, right);
    const rightCount = countInRange(nums, rightMajor, left, right);
    
    return leftCount > rightCount ? leftMajor : rightMajor;
}

function countInRange(nums, target, left, right) {
    let count = 0;
    for (let i = left; i <= right; i++) {
        if (nums[i] === target) count++;
    }
    return count;
}
```

## 图解

```
nums = [2, 2, 1, 1, 1, 2, 2]

分解:
[2, 2, 1, 1] | [1, 2, 2]

左半部分:
[2, 2] | [1, 1]
左左: 2, 左右: 1
在[2,2,1,1]中数: 2出现2次, 1出现2次
取第一个: 2 (或1，取决于实现)

右半部分:
[1, 2] | [2]
左: ...最终是1或2, 右: 2
最终右半部分多数是2

合并:
leftMajor=2, rightMajor=2
相同，返回2

结果: 2
```

## 正确性证明

### 为什么多数元素一定是某一半的多数？

假设多数元素是x，出现次数 > n/2。

如果x不是左半部分的多数，x在左半部分的出现次数 ≤ n/4。
如果x也不是右半部分的多数，x在右半部分的出现次数 ≤ n/4。
那么x的总出现次数 ≤ n/4 + n/4 = n/2，矛盾。

所以x必然是左半部分或右半部分的多数元素。

## 方法4：Boyer-Moore投票算法

最优解法，O(n)时间，O(1)空间：

```javascript
function majorityElement(nums) {
    let candidate = null;
    let count = 0;
    
    for (const num of nums) {
        if (count === 0) {
            candidate = num;
        }
        count += (num === candidate) ? 1 : -1;
    }
    
    return candidate;
}
```

## 各方法对比

| 方法 | 时间复杂度 | 空间复杂度 | 特点 |
|-----|-----------|-----------|------|
| 哈希表 | O(n) | O(n) | 直观 |
| 排序 | O(n log n) | O(log n) | 简单 |
| 分治 | O(n log n) | O(log n) | 展示分治思想 |
| 投票 | O(n) | O(1) | 最优 |

## 复杂度分析

分治方法：

**时间复杂度**：O(n log n)
- T(n) = 2T(n/2) + O(n)
- 每层需要O(n)来计数

**空间复杂度**：O(log n)
- 递归栈深度

## 小结

多数元素的分治解法：
1. 递归找左右两半的多数元素
2. 如果相同直接返回
3. 如果不同，统计谁出现更多

虽然不是最优解法，但展示了分治的思想：子问题的解可以帮助解决原问题。
