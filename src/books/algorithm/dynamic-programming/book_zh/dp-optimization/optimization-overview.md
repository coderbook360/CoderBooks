# DP 优化技巧概述

当基础 DP 的时间或空间复杂度不够优秀时，需要运用优化技巧。

## 为什么需要优化

考虑一个 O(n²) 的 DP：
- n = 10³：10⁶ 次运算，可以接受
- n = 10⁴：10⁸ 次运算，勉强
- n = 10⁵：10¹⁰ 次运算，超时

优化目标：
- 降低时间复杂度
- 降低空间复杂度
- 或者两者兼顾

## 常见优化方向

### 1. 空间优化

**滚动数组**：当 dp[i] 只依赖于 dp[i-1] 时。

```typescript
// 原始：O(n) 空间
const dp = Array(n).fill(0);
for (let i = 1; i < n; i++) {
  dp[i] = dp[i-1] + ...;
}

// 优化：O(1) 空间
let prev = 0, curr = 0;
for (let i = 1; i < n; i++) {
  curr = prev + ...;
  prev = curr;
}
```

**一维化**：二维 DP 降为一维。

```typescript
// 原始：O(n×m) 空间
const dp = Array.from({length: n}, () => Array(m).fill(0));

// 优化：O(m) 空间（注意遍历顺序）
const dp = Array(m).fill(0);
```

### 2. 状态优化

**状态压缩**：用位掩码表示状态。

```typescript
// 原始：Set 或 Array 表示状态
const visited = new Set<number>();

// 优化：位掩码
let mask = 0;
mask |= (1 << i);  // 标记
(mask >> i) & 1    // 检查
```

**状态合并**：减少状态维度。

### 3. 转移优化

**单调队列**：O(n) 内找滑动窗口最值。

```typescript
// 原始：O(n×k)
for (let i = 0; i < n; i++) {
  for (let j = i-k; j < i; j++) {
    dp[i] = Math.max(dp[i], dp[j] + ...);
  }
}

// 优化：O(n)
const deque: number[] = [];
for (let i = 0; i < n; i++) {
  while (deque.length && i - deque[0] > k) deque.shift();
  dp[i] = dp[deque[0]] + ...;
  while (deque.length && dp[deque.at(-1)!] <= dp[i]) deque.pop();
  deque.push(i);
}
```

**单调栈**：处理"下一个更大/小元素"相关的转移。

**前缀和/差分**：O(1) 计算区间和。

```typescript
// 原始：O(n) 计算区间和
let sum = 0;
for (let i = l; i <= r; i++) sum += arr[i];

// 优化：O(1)
const prefix = [0];
for (let i = 0; i < n; i++) prefix.push(prefix[i] + arr[i]);
const sum = prefix[r+1] - prefix[l];
```

### 4. 数据结构优化

**线段树**：区间查询与更新。

**树状数组**：前缀和查询与单点更新。

**平衡树**：动态维护有序集合。

## 优化方法对照表

| 原复杂度 | 优化方法 | 新复杂度 | 适用场景 |
|---------|---------|---------|---------|
| O(n) 空间 | 滚动数组 | O(1) 空间 | 只依赖前一行 |
| O(n²) 空间 | 一维化 | O(n) 空间 | 只依赖上一行 |
| O(n×k) | 单调队列 | O(n) | 滑动窗口最值 |
| O(n²) | 前缀和 | O(n) | 区间和转移 |
| O(n²) | 二分 | O(n log n) | LIS 等 |
| O(n³) | 矩阵快速幂 | O(k³ log n) | 线性递推 |

## 本章内容

本章将介绍以下优化技巧：

1. **空间优化**：滚动数组、一维化
2. **单调队列优化**：滑动窗口最值
3. **单调栈优化**：利用单调性
4. **前缀和优化**：区间和计算
5. **二分优化**：LIS 及变体

## 学习建议

1. **先理解朴素解法**：优化建立在正确性之上
2. **识别优化点**：找到时间瓶颈
3. **验证正确性**：优化后结果不变
4. **实践积累**：多做题，培养敏感度

## 总结

DP 优化的核心思想：

1. **空间换时间**的逆向思考
2. **利用数据结构**加速查询
3. **利用单调性**减少无效状态
4. **利用数学性质**简化计算

掌握这些技巧，可以将很多"看似无解"的 DP 问题变得可解。
