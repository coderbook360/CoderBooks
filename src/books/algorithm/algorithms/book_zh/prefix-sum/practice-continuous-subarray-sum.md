# 实战：连续的子数组和

> LeetCode 523. 连续的子数组和 | 难度：中等

前缀和 + 同余定理的经典应用，重点理解"为什么记录第一次出现"。

---

## 题目描述

给你一个整数数组 `nums` 和一个整数 `k`，判断是否存在一个长度至少为 2 的连续子数组，其元素总和为 `k` 的倍数。

**示例**：
```
输入：nums = [23, 2, 4, 6, 7], k = 6
输出：true
解释：[2, 4] 是一个大小为 2 的子数组，和为 6（是 6 的倍数）

输入：nums = [23, 2, 6, 4, 7], k = 6
输出：true
解释：[23, 2, 6, 4, 7] 和为 42，是 6 的倍数

输入：nums = [23, 2, 6, 4, 7], k = 13
输出：false
```

---

## 思路分析

### 同余定理

如果两个数 a 和 b 对 k 取余相同，那么它们的差一定是 k 的倍数：

```
a % k === b % k
⟹ (a - b) % k === 0
```

### 应用到前缀和

对于子数组 `[i+1, j]` 的和：
```
sum(i+1, j) = prefix[j] - prefix[i]
```

如果 `sum(i+1, j)` 是 k 的倍数：
```
(prefix[j] - prefix[i]) % k === 0
⟹ prefix[j] % k === prefix[i] % k
```

### 额外约束

题目要求**长度至少为 2**，即 `j - i >= 2`。

所以我们需要记录每个余数**第一次**出现的索引，这样才能使子数组尽可能长。

---

## 代码实现

```typescript
function checkSubarraySum(nums: number[], k: number): boolean {
  // 余数 -> 第一次出现的索引
  const map = new Map<number, number>();
  map.set(0, -1);  // 余数 0 对应虚拟索引 -1
  
  let prefix = 0;
  
  for (let i = 0; i < nums.length; i++) {
    prefix += nums[i];
    const remainder = prefix % k;
    
    if (map.has(remainder)) {
      // 检查长度是否 >= 2
      const prevIndex = map.get(remainder)!;
      if (i - prevIndex >= 2) {
        return true;
      }
      // 不更新！保留第一次出现的索引
    } else {
      map.set(remainder, i);
    }
  }
  
  return false;
}
```

---

## 执行过程可视化

```
nums = [23, 2, 4, 6, 7], k = 6

初始：map = {0: -1}

i=0: prefix=23, remainder=23%6=5
     map 没有 5，记录 map = {0: -1, 5: 0}

i=1: prefix=25, remainder=25%6=1
     map 没有 1，记录 map = {0: -1, 5: 0, 1: 1}

i=2: prefix=29, remainder=29%6=5
     map 有 5，索引=0
     长度 = 2 - 0 = 2 >= 2 ✓
     返回 true

验证：子数组 [2, 4]（索引1-2）的和 = 6，是 6 的倍数 ✓
```

---

## 为什么记录第一次出现？

**目的**：让子数组尽可能长，更容易满足 `长度 >= 2`。

```
反例：nums = [5, 0, 0], k = 5

prefix:    [5, 5, 5]
remainder: [0, 0, 0]

如果记录最新位置：
  i=2 时，map.get(0) = 1（最新）
  长度 = 2 - 1 = 1 < 2 ✗

如果记录第一次：
  i=2 时，map.get(0) = -1（虚拟索引）
  长度 = 2 - (-1) = 3 >= 2 ✓
```

---

## 为什么初始化 map.set(0, -1)？

处理**从索引 0 开始**的子数组。

```
例如 nums = [6, 6], k = 6
prefix = [6, 12]
remainder = [0, 0]

i=1 时，remainder = 0
如果有 map.set(0, -1)：
  长度 = 1 - (-1) = 2 >= 2 ✓
  子数组 [6, 6]，和 = 12，是 6 的倍数

如果没有初始化：
  i=0 时才记录 map.set(0, 0)
  i=1 时，长度 = 1 - 0 = 1 < 2 ✗
```

---

## 负余数处理（可选）

在某些语言中，负数取余可能得到负数。JavaScript/TypeScript 中也是如此：

```typescript
-1 % 6  // -1（JavaScript）
```

如果需要处理负数：
```typescript
const remainder = ((prefix % k) + k) % k;  // 保证非负
```

但本题约束 `0 <= nums[i]`，所以不需要特别处理。

---

## 复杂度分析

**时间复杂度**：O(n)
- 遍历数组一次
- 哈希表操作 O(1)

**空间复杂度**：O(min(n, k))
- 最多有 k 个不同的余数
- 但也不会超过 n

---

## 常见错误

**错误1：更新了已存在的索引**
```typescript
// 错误：总是更新
map.set(remainder, i);  // ❌ 覆盖了第一次出现的索引

// 正确：只记录第一次
if (!map.has(remainder)) {
  map.set(remainder, i);  // ✅
}
```

**错误2：忘记检查长度**
```typescript
// 错误：没有检查长度
if (map.has(remainder)) {
  return true;  // ❌ 长度可能 < 2
}
```

**错误3：忘记初始化虚拟索引**
```typescript
// 错误：没有 map.set(0, -1)
const map = new Map();  // ❌ 漏掉从头开始的子数组
```

---

## 与"和为 K 的子数组"对比

| 题目 | 目标 | 记录什么 |
|-----|------|---------|
| 560. 和为 K | 计数 | 每个前缀和的出现**次数** |
| 523. 连续子数组和 | 判断存在 | 每个余数**第一次**出现的索引 |

---

## 相关题目

| 题目 | 难度 | 说明 |
|-----|------|------|
| [560. 和为 K 的子数组](https://leetcode.com/problems/subarray-sum-equals-k/) | 中等 | 计数版本 |
| [974. 和可被 K 整除的子数组](https://leetcode.com/problems/subarray-sums-divisible-by-k/) | 中等 | 计数+取余 |
| [525. 连续数组](https://leetcode.com/problems/contiguous-array/) | 中等 | 0/1 转换 |

---

## 总结

连续的子数组和的核心要点：

1. **同余定理**：`prefix[j] % k === prefix[i] % k` ⟹ 差是 k 的倍数
2. **记录第一次**：为了让子数组尽可能长
3. **虚拟索引**：`map.set(0, -1)` 处理从头开始的情况
4. **长度检查**：`i - prevIndex >= 2`
5. **不更新已存在的索引**：保留第一次出现的位置
