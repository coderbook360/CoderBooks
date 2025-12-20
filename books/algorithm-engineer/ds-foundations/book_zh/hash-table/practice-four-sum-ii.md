# 实战：四数相加 II

这道题展示了一个重要的优化策略：**分组 + 哈希表**，把 O(n⁴) 降为 O(n²)。

## 题目描述

> **LeetCode 454. 四数相加 II**
>
> 给你四个整数数组 nums1、nums2、nums3 和 nums4，数组长度都是 n，请你计算有多少个元组 (i, j, k, l) 能满足：
> - 0 <= i, j, k, l < n
> - nums1[i] + nums2[j] + nums3[k] + nums4[l] == 0

**示例**：

```
输入：nums1 = [1,2], nums2 = [-2,-1], nums3 = [-1,2], nums4 = [0,2]
输出：2
解释：两个元组：
(0,0,0,1): 1 + (-2) + (-1) + 2 = 0
(1,1,0,0): 2 + (-1) + (-1) + 0 = 0
```

## 暴力解法

最直接的想法：四重循环枚举所有组合。

```javascript
function fourSumCount(nums1, nums2, nums3, nums4) {
    const n = nums1.length;
    let count = 0;
    
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            for (let k = 0; k < n; k++) {
                for (let l = 0; l < n; l++) {
                    if (nums1[i] + nums2[j] + nums3[k] + nums4[l] === 0) {
                        count++;
                    }
                }
            }
        }
    }
    
    return count;
}
```

时间复杂度 O(n⁴)。当 n = 200 时，计算量是 200⁴ = 16 亿，肯定超时。

## 分组优化

核心思想：把四个数组分成两组。

原问题：找 a + b + c + d = 0

转化为：找 a + b = -(c + d)

**步骤**：
1. 遍历 nums1 和 nums2，记录所有 a + b 的和及其出现次数
2. 遍历 nums3 和 nums4，对于每个 c + d，查找 -(c + d) 出现了多少次

```javascript
function fourSumCount(nums1, nums2, nums3, nums4) {
    const sumMap = new Map();  // 和 → 出现次数
    
    // 第一步：记录 nums1 + nums2 的所有和
    for (const a of nums1) {
        for (const b of nums2) {
            const sum = a + b;
            sumMap.set(sum, (sumMap.get(sum) || 0) + 1);
        }
    }
    
    // 第二步：查找 -(nums3 + nums4)
    let count = 0;
    for (const c of nums3) {
        for (const d of nums4) {
            const target = -(c + d);
            if (sumMap.has(target)) {
                count += sumMap.get(target);
            }
        }
    }
    
    return count;
}
```

### 执行过程

```
nums1 = [1,2], nums2 = [-2,-1]
nums3 = [-1,2], nums4 = [0,2]

第一步：构建 sumMap
a=1, b=-2: sum = -1, sumMap = {-1: 1}
a=1, b=-1: sum = 0,  sumMap = {-1: 1, 0: 1}
a=2, b=-2: sum = 0,  sumMap = {-1: 1, 0: 2}
a=2, b=-1: sum = 1,  sumMap = {-1: 1, 0: 2, 1: 1}

第二步：查找
c=-1, d=0: target = -(-1+0) = 1, sumMap.get(1) = 1, count = 1
c=-1, d=2: target = -(-1+2) = -1, sumMap.get(-1) = 1, count = 2
c=2, d=0: target = -(2+0) = -2, 不存在
c=2, d=2: target = -(2+2) = -4, 不存在

最终 count = 2
```

## 为什么分成两组？

思考一下：为什么是 2+2 分组，而不是 1+3 或其他方式？

**分析不同分组的复杂度**：

| 分组方式 | 第一阶段 | 第二阶段 | 总时间 |
|---------|---------|---------|-------|
| 1+3 | O(n) | O(n³) | O(n³) |
| 2+2 | O(n²) | O(n²) | O(n²) |
| 3+1 | O(n³) | O(n) | O(n³) |

2+2 分组是最均衡的，时间复杂度最优！

这是一个通用原则：**分组越均匀，效率越高**。

## 与其他 N 数之和的区别

LeetCode 上有多道"N 数之和"题目，解法不同：

| 题目 | 数组数量 | 特点 | 最优解法 |
|-----|---------|------|---------|
| 两数之和 | 1 个数组 | 找一组解 | 哈希表 |
| 三数之和 | 1 个数组 | 需去重 | 排序 + 双指针 |
| 四数之和 | 1 个数组 | 需去重 | 排序 + 双指针 |
| 四数相加 II | 4 个独立数组 | 只统计数量 | 分组 + 哈希 |

**关键区别**：本题来自**四个独立数组**，不需要去重，只需统计数量。

如果是同一个数组内找四个数，需要考虑去重和避免重复使用同一位置，解法完全不同。

## 复杂度分析

- **时间**：O(n²)
  - 第一阶段遍历 nums1 × nums2：O(n²)
  - 第二阶段遍历 nums3 × nums4：O(n²)
  - 哈希表操作：O(1)
- **空间**：O(n²)，存储最多 n² 个不同的和

## 本章小结

四数相加 II 展示了**分组 + 哈希表**的优化策略：

1. **问题转化**：a + b + c + d = 0 → a + b = -(c + d)
2. **分组统计**：记录一组的和及其出现次数
3. **查找互补**：在另一组中查找使总和为 0 的值

这种"分治"思想可以推广：把 O(n^k) 的问题分成两半，变成 O(n^(k/2))。

记住这个模式：**当问题涉及多个独立集合的组合时，考虑分组 + 哈希表**。
