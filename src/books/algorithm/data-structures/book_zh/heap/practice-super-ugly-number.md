# 实战：超级丑数

超级丑数是丑数 II 的泛化版本，质因子由给定数组决定，而非固定的 2、3、5。

---

## 问题描述

**LeetCode 313. Super Ugly Number**

超级丑数是一个正整数，其所有质因数都是长度为 k 的质数列表 primes 中的数。

给你一个整数 n 和一个整数数组 primes，返回第 n 个超级丑数。

**示例 1**：
```
输入：n = 12, primes = [2,7,13,19]
输出：32
解释：[1,2,4,7,8,13,14,16,19,26,28,32] 是前 12 个超级丑数
```

**示例 2**：
```
输入：n = 1, primes = [2,3,5]
输出：1
```

**约束条件**：
- `1 <= n <= 10^5`
- `1 <= primes.length <= 100`
- `2 <= primes[i] <= 1000`
- primes 中的所有元素互不相同，且按升序排列

---

## 问题分析

这道题是"丑数 II"的推广：
- 丑数 II：质因子固定为 [2, 3, 5]
- 超级丑数：质因子由 primes 数组给定

解题思路保持不变，只需把固定的 3 个指针扩展为 k 个指针。

---

## 解法一：最小堆

与丑数 II 类似，使用最小堆 + Set 去重：

```javascript
function nthSuperUglyNumber(n, primes) {
  const heap = new MinHeap();
  const seen = new Set();
  
  heap.insert(1);
  seen.add(1);
  
  let ugly = 1;
  
  for (let i = 0; i < n; i++) {
    ugly = heap.extract();
    
    // 对每个质因子，生成新的候选丑数
    for (const prime of primes) {
      const next = ugly * prime;
      if (!seen.has(next)) {
        seen.add(next);
        heap.insert(next);
      }
    }
  }
  
  return ugly;
}
```

**执行过程**：

```
n = 6, primes = [2, 7, 13, 19]

i=0: 取出 1, 加入 2,7,13,19
     堆: [2,7,13,19], seen: {1,2,7,13,19}, ugly=1

i=1: 取出 2, 加入 4,14,26,38
     堆: [4,7,13,14,19,26,38], ugly=2

i=2: 取出 4, 加入 8,28,52,76
     堆: [7,8,13,14,19,26,28,...], ugly=4

i=3: 取出 7, 加入 14(已存在),49,91,133
     堆: [8,13,14,19,26,28,49,...], ugly=7

i=4: 取出 8, 加入 16,56,104,152
     堆: [13,14,16,19,26,28,49,...], ugly=8

i=5: 取出 13, ugly=13

返回 13
```

**复杂度分析**：
- 时间：O(nk log(nk))，每次提取最小值 O(log(堆大小))
- 空间：O(nk)，堆和 Set 最多存储 nk 个元素

---

## 解法二：多指针（动态规划）

扩展三指针为 k 个指针：

```javascript
function nthSuperUglyNumber(n, primes) {
  const k = primes.length;
  const dp = [1];
  
  // k 个指针，初始都指向 dp[0]
  const pointers = new Array(k).fill(0);
  
  for (let i = 1; i < n; i++) {
    // 计算所有候选值
    const candidates = pointers.map((p, j) => dp[p] * primes[j]);
    
    // 取最小值
    const minVal = Math.min(...candidates);
    dp.push(minVal);
    
    // 更新所有产生最小值的指针
    for (let j = 0; j < k; j++) {
      if (candidates[j] === minVal) {
        pointers[j]++;
      }
    }
  }
  
  return dp[n - 1];
}
```

---

## 多指针执行过程详解

```
primes = [2, 7, 13, 19]
pointers = [0, 0, 0, 0]
dp = [1]

i=1:
  candidates = [1×2, 1×7, 1×13, 1×19] = [2, 7, 13, 19]
  min = 2
  dp = [1, 2], pointers = [1, 0, 0, 0]

i=2:
  candidates = [2×2, 1×7, 1×13, 1×19] = [4, 7, 13, 19]
  min = 4
  dp = [1, 2, 4], pointers = [2, 0, 0, 0]

i=3:
  candidates = [4×2, 1×7, 1×13, 1×19] = [8, 7, 13, 19]
  min = 7
  dp = [1, 2, 4, 7], pointers = [2, 1, 0, 0]

i=4:
  candidates = [4×2, 2×7, 1×13, 1×19] = [8, 14, 13, 19]
  min = 8
  dp = [1, 2, 4, 7, 8], pointers = [3, 1, 0, 0]

i=5:
  candidates = [7×2, 2×7, 1×13, 1×19] = [14, 14, 13, 19]
  min = 13
  dp = [1, 2, 4, 7, 8, 13], pointers = [3, 1, 1, 0]

...
```

**可视化**：

```
dp:      1    2    4    7    8    13   14   ...
         ↑                   ↑    ↑    ↑
        p19                 p2   p13  p7

primes:  2    7    13   19
指针位置: p2=4 p7=3 p13=2 p19=0
下一个候选: 8×2=16, 7×7=49, 4×13=52, 1×19=19
```

**复杂度分析**：
- 时间：O(nk)
- 空间：O(n + k)

---

## 优化：用堆维护候选值

当 k 很大时，每次找 k 个候选值的最小值需要 O(k)。可以用堆优化：

```javascript
function nthSuperUglyNumber(n, primes) {
  const k = primes.length;
  const dp = [1];
  
  // 堆中存储 [候选值, 质因子索引, dp索引]
  const heap = new MinHeap((a, b) => a[0] - b[0]);
  
  // 初始化：每个质因子乘以 dp[0]
  for (let j = 0; j < k; j++) {
    heap.insert([primes[j], j, 0]);
  }
  
  for (let i = 1; i < n; i++) {
    const [minVal, primeIdx, dpIdx] = heap.extract();
    
    // 避免重复
    if (minVal !== dp[dp.length - 1]) {
      dp.push(minVal);
    } else {
      i--;  // 回退，重新处理
    }
    
    // 加入下一个候选
    if (dpIdx + 1 < dp.length) {
      heap.insert([primes[primeIdx] * dp[dpIdx + 1], primeIdx, dpIdx + 1]);
    }
  }
  
  return dp[n - 1];
}
```

实际上，更简洁的处理方式是允许重复，然后跳过：

```javascript
function nthSuperUglyNumber(n, primes) {
  const k = primes.length;
  const dp = new Array(n);
  dp[0] = 1;
  
  const pointers = new Array(k).fill(0);
  
  for (let i = 1; i < n; i++) {
    // 计算所有候选值并找最小
    let minVal = Infinity;
    for (let j = 0; j < k; j++) {
      const candidate = dp[pointers[j]] * primes[j];
      minVal = Math.min(minVal, candidate);
    }
    
    dp[i] = minVal;
    
    // 更新指针
    for (let j = 0; j < k; j++) {
      if (dp[pointers[j]] * primes[j] === minVal) {
        pointers[j]++;
      }
    }
  }
  
  return dp[n - 1];
}
```

---

## 方法对比

| 方法 | 时间 | 空间 | 特点 |
|------|------|------|------|
| 最小堆 + Set | O(nk log(nk)) | O(nk) | 简单直观，但空间大 |
| 多指针 | O(nk) | O(n + k) | 高效，推荐使用 |
| 堆优化多指针 | O(n log k) | O(n + k) | k 很大时更优 |

---

## 边界情况

```javascript
// 测试用例
nthSuperUglyNumber(1, [2,3,5]);     // → 1
nthSuperUglyNumber(12, [2,7,13,19]); // → 32
nthSuperUglyNumber(100000, [7,19,29,37,41,47,53,59,61,79,83,89,97,101,103,109,127,131,137,139,149,151,157,163,167,173,179,181,191,193,197,199,211]); // 大规模测试
```

---

## 常见错误

### 1. 忘记处理重复值

```javascript
// ❌ 错误：同一个值可能由多个质因子生成
if (candidates[j] === minVal) {
  pointers[j]++;
  break;  // 只更新一个指针
}

// ✅ 正确：所有生成该值的指针都要更新
for (let j = 0; j < k; j++) {
  if (candidates[j] === minVal) {
    pointers[j]++;
  }
}
```

### 2. 数值溢出

```javascript
// 当 n 很大时，丑数可能超过 Number.MAX_SAFE_INTEGER
// JavaScript 中需要注意大数问题
// 可以使用 BigInt 或检查溢出

// 在本题的约束下（n ≤ 10^5），不会溢出
```

### 3. 初始化错误

```javascript
// ❌ 错误：指针初始化为 1
const pointers = new Array(k).fill(1);

// ✅ 正确：指针初始化为 0（指向 dp[0] = 1）
const pointers = new Array(k).fill(0);
```

---

## 相关题目

| 题目 | 难度 | 关联点 |
|------|------|--------|
| [264. 丑数 II](https://leetcode.cn/problems/ugly-number-ii/) | 中等 | 固定质因子版本 |
| [263. 丑数](https://leetcode.cn/problems/ugly-number/) | 简单 | 判断是否为丑数 |
| [1201. 丑数 III](https://leetcode.cn/problems/ugly-number-iii/) | 中等 | 二分 + 容斥原理 |

---

## 小结

本题是丑数 II 的推广，核心思想相同：

1. **递推性质**：每个超级丑数 = 更小的超级丑数 × 某个质因子
2. **多指针技巧**：k 个指针分别追踪每个质因子的乘法进度
3. **去重机制**：同一个值可能由多个质因子组合生成，需要同时更新指针

**泛化能力**：
- 这种多指针生成有序序列的技巧是通用的
- 可以用于任何"合并 k 个有序序列"的场景
- 时间复杂度从 O(nk) 可以用堆优化到 O(n log k)
