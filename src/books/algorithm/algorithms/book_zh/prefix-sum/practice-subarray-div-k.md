# 实战：和可被 K 整除的子数组

> LeetCode 974. 和可被 K 整除的子数组 | 难度：中等

前缀和 + 同余定理的经典应用，需要注意负数余数的处理。

---

## 题目描述

给定一个整数数组 `nums` 和一个整数 `k`，返回其中和可被 `k` 整除的（非空）子数组的数目。

**示例**：
```
输入：nums = [4, 5, 0, -2, -3, 1], k = 5
输出：7
解释：
  [4, 5, 0, -2, -3, 1] 和=5 ✓
  [5] 和=5 ✓
  [5, 0] 和=5 ✓
  [5, 0, -2, -3] 和=0 ✓
  [0] 和=0 ✓
  [-2, -3] 和=-5 ✓
  [0, -2, -3] 和=-5 ✓

输入：nums = [5], k = 9
输出：0
```

---

## 思路分析

### 同余定理回顾

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

如果 `sum(i+1, j)` 可被 k 整除：
```
(prefix[j] - prefix[i]) % k === 0
⟹ prefix[j] % k === prefix[i] % k
```

### 问题转化

找有多少对 `(i, j)` 使得 `prefix[i] % k === prefix[j] % k`。

对于每个余数 r，如果出现了 n 次，那么可以形成 `C(n, 2) = n*(n-1)/2` 对。

或者用**边遍历边计数**的方式：遍历到 prefix[j] 时，查找之前有多少个 prefix[i] 余数相同。

---

## 代码实现

```typescript
function subarraysDivByK(nums: number[], k: number): number {
  const mod = new Map<number, number>();
  mod.set(0, 1);  // 余数为 0 出现 1 次（空前缀）
  
  let prefix = 0;
  let count = 0;
  
  for (const num of nums) {
    prefix += num;
    
    // 处理负数：JavaScript 的 % 可能返回负数
    let remainder = prefix % k;
    if (remainder < 0) remainder += k;
    
    // 相同余数的前缀和可以配对
    count += mod.get(remainder) || 0;
    mod.set(remainder, (mod.get(remainder) || 0) + 1);
  }
  
  return count;
}
```

---

## 负数余数的处理

**问题**：JavaScript 中负数取余可能返回负数。

```javascript
-1 % 5  // -1，而不是 4
-3 % 5  // -3，而不是 2
```

**解决方案**：

```typescript
// 方法1：条件判断
let remainder = prefix % k;
if (remainder < 0) remainder += k;

// 方法2：通用公式
let remainder = ((prefix % k) + k) % k;
```

**为什么 -3 和 2 应该被视为相同余数？**

```
-3 和 2 对 5 取余：
-3 = 5 × (-1) + 2
 2 = 5 × 0 + 2

它们的差 (-3) - 2 = -5 是 5 的倍数 ✓
```

---

## 执行过程可视化

```
nums = [4, 5, 0, -2, -3, 1], k = 5

初始：mod = {0: 1}, prefix = 0, count = 0

i=0, num=4:
  prefix = 4, remainder = 4 % 5 = 4
  count += mod.get(4) = 0
  mod = {0: 1, 4: 1}

i=1, num=5:
  prefix = 9, remainder = 9 % 5 = 4
  count += mod.get(4) = 1 → count = 1
  mod = {0: 1, 4: 2}

i=2, num=0:
  prefix = 9, remainder = 4
  count += mod.get(4) = 2 → count = 3
  mod = {0: 1, 4: 3}

i=3, num=-2:
  prefix = 7, remainder = 7 % 5 = 2
  count += mod.get(2) = 0 → count = 3
  mod = {0: 1, 4: 3, 2: 1}

i=4, num=-3:
  prefix = 4, remainder = 4
  count += mod.get(4) = 3 → count = 6
  mod = {0: 1, 4: 4, 2: 1}

i=5, num=1:
  prefix = 5, remainder = 0
  count += mod.get(0) = 1 → count = 7
  mod = {0: 2, 4: 4, 2: 1}

返回 count = 7 ✓
```

---

## 验证具体的子数组

7 个和可被 5 整除的子数组：

| 子数组 | 和 | 5 的倍数 |
|--------|-----|---------|
| [5] | 5 | ✓ |
| [5, 0] | 5 | ✓ |
| [0] | 0 | ✓ |
| [5, 0, -2, -3] | 0 | ✓ |
| [0, -2, -3] | -5 | ✓ |
| [-2, -3] | -5 | ✓ |
| [4, 5, 0, -2, -3, 1] | 5 | ✓ |

---

## 复杂度分析

**时间复杂度**：O(n)
- 遍历数组一次
- 哈希表操作 O(1)

**空间复杂度**：O(min(n, k))
- 最多有 k 个不同的余数（0 到 k-1）

---

## 常见错误

**错误1：忘记处理负数余数**
```typescript
// 错误：负数余数会导致错误的分组
let remainder = prefix % k;  // ❌ 可能是负数

// 正确
let remainder = ((prefix % k) + k) % k;  // ✅
```

**错误2：忘记初始化 mod.set(0, 1)**
```typescript
// 错误：漏掉从索引0开始的子数组
const mod = new Map();  // ❌

// 正确
const mod = new Map();
mod.set(0, 1);  // ✅
```

**错误3：先更新 map 再计数**
```typescript
// 错误顺序
mod.set(remainder, ...);  // ❌ 先更新
count += mod.get(remainder);  // 会多算一次

// 正确顺序
count += mod.get(remainder) || 0;  // ✅ 先计数
mod.set(remainder, ...);  // 再更新
```

---

## 与相关题目对比

| 题目 | 目标 | 记录什么 |
|-----|------|---------|
| 560. 和为 K | 计数 sum = k | 前缀和的出现次数 |
| 523. 连续子数组和 | 判断 sum % k = 0 | 余数第一次出现的索引 |
| 974. 本题 | 计数 sum % k = 0 | 余数的出现次数 |

---

## 相关题目

| 题目 | 难度 | 说明 |
|-----|------|------|
| [560. 和为 K 的子数组](https://leetcode.com/problems/subarray-sum-equals-k/) | 中等 | 等于 k |
| [523. 连续的子数组和](https://leetcode.com/problems/continuous-subarray-sum/) | 中等 | 长度 >= 2 |
| [1590. 使数组和能被 P 整除](https://leetcode.com/problems/make-sum-divisible-by-p/) | 中等 | 移除最短子数组 |

---

## 总结

和可被 K 整除的子数组核心要点：

1. **同余定理**：余数相同的前缀和之差可被 K 整除
2. **负数余数**：`((prefix % k) + k) % k` 确保非负
3. **计数配对**：遍历时统计相同余数的数量
4. **初始化**：`mod.set(0, 1)` 处理从头开始的子数组
5. **顺序**：先计数，再更新 map

## 复杂度分析

- **时间复杂度**：O(n)
- **空间复杂度**：O(k)，最多 k 种不同余数

---

## 与"和为 K"的区别

| 题目 | 条件 | 哈希表存储 |
|-----|-----|----------|
| 和为 K | prefix[j] - prefix[i] = k | 前缀和 |
| 可被 K 整除 | (prefix[j] - prefix[i]) % k = 0 | 前缀和的余数 |
