# 实战：子数组和为 K

> LeetCode 560. 和为 K 的子数组 | 难度：中等

前缀和 + 哈希表的经典应用，是理解"前缀和优化暴力"的最佳案例。

---

## 题目描述

给你一个整数数组 `nums` 和一个整数 `k`，请你统计并返回该数组中和为 `k` 的子数组的个数。

**示例**：
```
输入：nums = [1, 1, 1], k = 2
输出：2
解释：子数组 [1,1]（索引0-1）和 [1,1]（索引1-2）

输入：nums = [1, 2, 3], k = 3
输出：2
解释：子数组 [1,2] 和 [3]
```

---

## 思路分析

### 暴力法回顾

枚举所有子数组 `[i, j]`，计算和：O(n²) 或 O(n³)

### 前缀和优化

子数组 `[i, j]` 的和可以表示为：
```
sum(i, j) = prefix[j+1] - prefix[i]
```

如果 `sum(i, j) = k`，则：
```
prefix[j+1] - prefix[i] = k
prefix[i] = prefix[j+1] - k
```

**关键洞察**：遍历时，对于每个 `prefix[j+1]`，我们需要知道之前有多少个 `prefix[i]` 等于 `prefix[j+1] - k`。

用哈希表记录每个前缀和出现的次数！

---

## 代码实现

```typescript
function subarraySum(nums: number[], k: number): number {
  const map = new Map<number, number>();
  map.set(0, 1);  // 前缀和为 0 出现 1 次（空前缀）
  
  let prefixSum = 0;
  let count = 0;
  
  for (const num of nums) {
    prefixSum += num;
    
    // 查找之前是否有前缀和等于 prefixSum - k
    if (map.has(prefixSum - k)) {
      count += map.get(prefixSum - k)!;
    }
    
    // 记录当前前缀和
    map.set(prefixSum, (map.get(prefixSum) || 0) + 1);
  }
  
  return count;
}
```

---

## 执行过程可视化

```
nums = [1, 2, 3], k = 3

初始：map = {0: 1}, prefixSum = 0, count = 0

i=0, num=1:
  prefixSum = 1
  查找 1-3 = -2 → 不存在
  map = {0: 1, 1: 1}

i=1, num=2:
  prefixSum = 3
  查找 3-3 = 0 → 存在，次数=1
  count = 1
  map = {0: 1, 1: 1, 3: 1}

i=2, num=3:
  prefixSum = 6
  查找 6-3 = 3 → 存在，次数=1
  count = 2
  map = {0: 1, 1: 1, 3: 1, 6: 1}

返回 count = 2

验证：
- 前缀和 0 到 3：sum = 3 → 子数组 [1,2]
- 前缀和 3 到 6：sum = 3 → 子数组 [3]
```

---

## 为什么初始化 map.set(0, 1)？

处理**从索引 0 开始**的子数组！

```
例如 nums = [3], k = 3:
- prefixSum = 3
- 查找 3 - 3 = 0
- 如果没有 map.set(0, 1)，就会漏掉整个数组和为 k 的情况！
```

**另一个理解角度**：
- `prefix[0] = 0` 代表"空前缀"
- `sum(0, j) = prefix[j+1] - prefix[0] = prefix[j+1] - 0`
- 所以"空前缀"出现 1 次

---

## 为什么不能用滑动窗口？

**滑动窗口要求**：窗口扩大/缩小时，目标函数（和）单调变化。

**本题违反这一条件**：数组中可能有负数！

```
nums = [1, -1, 2], k = 2

- 窗口 [1]：和=1，扩大
- 窗口 [1, -1]：和=0，缩小？继续扩大？
- 窗口 [1, -1, 2]：和=2 ✓

如果缩小：窗口 [-1, 2]：和=1 ✗

滑动窗口无法处理这种"先减后增"的情况
```

---

## 前缀和 + 哈希表的本质

```
问题转化:
  找 sum(i, j) = k
= 找 prefix[j+1] - prefix[i] = k
= 找 prefix[i] = prefix[j+1] - k

遍历时:
  当前前缀和 = prefixSum
  目标前缀和 = prefixSum - k
  在哈希表中查找目标前缀和的出现次数
```

这是一个**两数之和**的变体！

---

## 复杂度分析

**时间复杂度**：O(n)
- 一次遍历
- 哈希表操作 O(1)

**空间复杂度**：O(n)
- 哈希表最多存 n 个不同的前缀和

---

## 常见错误

**错误1：忘记初始化 map.set(0, 1)**
```typescript
const map = new Map();
// 没有 map.set(0, 1)  ❌
```

**错误2：先更新 map 再查询**
```typescript
// 错误：先存再查
map.set(prefixSum, ...);  // ❌
if (map.has(prefixSum - k)) { ... }

// 正确：先查再存
if (map.has(prefixSum - k)) { ... }
map.set(prefixSum, ...);  // ✅
```

**为什么顺序重要？**

考虑 `nums = [0], k = 0`：
- prefixSum = 0
- 如果先存：map = {0: 2}
- 查找 0 - 0 = 0，得到 2 次 → **错误**！
- 正确答案应该是 1 次

**错误3：使用滑动窗口**
```typescript
// 错误：负数情况下不适用
while (sum > k) {
  sum -= nums[left++];  // ❌ 可能导致错过答案
}
```

---

## 相关题目

| 题目 | 难度 | 说明 |
|-----|------|------|
| [1. 两数之和](https://leetcode.com/problems/two-sum/) | 简单 | 相同思想 |
| [523. 连续的子数组和](https://leetcode.com/problems/continuous-subarray-sum/) | 中等 | 和为 k 的倍数 |
| [974. 和可被 K 整除的子数组](https://leetcode.com/problems/subarray-sums-divisible-by-k/) | 中等 | 同余问题 |
| [930. 和相同的二元子数组](https://leetcode.com/problems/binary-subarrays-with-sum/) | 中等 | 0/1 数组 |

---

## 前缀和 + 哈希表模板

```typescript
function countSubarrayWithSum(nums: number[], target: number): number {
  const map = new Map<number, number>();
  map.set(0, 1);  // 关键初始化
  
  let prefix = 0;
  let count = 0;
  
  for (const num of nums) {
    prefix += num;  // 或其他累积操作
    
    const need = prefix - target;  // 或其他目标值
    if (map.has(need)) {
      count += map.get(need)!;
    }
    
    map.set(prefix, (map.get(prefix) || 0) + 1);
  }
  
  return count;
}
```

---

## 总结

子数组和为 K 的核心要点：

1. **公式转化**：`prefix[i] = prefix[j+1] - k`
2. **哈希表记录**：每个前缀和的出现次数
3. **初始化**：`map.set(0, 1)` 处理从头开始的子数组
4. **顺序**：先查询，再更新哈希表
5. **不能用滑动窗口**：因为可能有负数

---

## 复杂度分析

- **时间复杂度**：O(n)
- **空间复杂度**：O(n)
