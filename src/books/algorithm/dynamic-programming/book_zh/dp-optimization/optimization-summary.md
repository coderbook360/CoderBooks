# DP 优化总结

## 优化方法全景

| 优化类型 | 原复杂度 | 优化后 | 适用场景 |
|---------|---------|--------|---------|
| 滚动数组 | O(n) 空间 | O(1) 空间 | 只依赖前几个状态 |
| 一维化 | O(n²) 空间 | O(n) 空间 | 只依赖上一行 |
| 单调队列 | O(n×k) | O(n) | 滑动窗口最值 |
| 前缀和 | O(n²) | O(n) | 区间和计算 |
| 二分 | O(n²) | O(n log n) | LIS 等单调性问题 |
| 矩阵快速幂 | O(n) | O(log n) | 线性递推 |

## 空间优化总结

### 滚动数组

当 dp[i] 只依赖 dp[i-1] 时：

```typescript
// 变量滚动
let prev = init, curr;
for (let i = 1; i < n; i++) {
  curr = f(prev);
  prev = curr;
}

// 数组滚动（双数组）
let curr = Array(m), prev = Array(m);
for (let i = 1; i < n; i++) {
  for (let j = 0; j < m; j++) {
    curr[j] = f(prev[...]);
  }
  [prev, curr] = [curr, prev];
}
```

### 一维化

```typescript
// 0-1 背包：逆序遍历
for (let i = 0; i < n; i++) {
  for (let w = W; w >= weight[i]; w--) {
    dp[w] = Math.max(dp[w], dp[w - weight[i]] + value[i]);
  }
}

// 完全背包：正序遍历
for (let i = 0; i < n; i++) {
  for (let w = weight[i]; w <= W; w++) {
    dp[w] = Math.max(dp[w], dp[w - weight[i]] + value[i]);
  }
}

// LCS：需要额外变量
for (let i = 1; i <= m; i++) {
  let prev = 0;  // dp[i-1][j-1]
  for (let j = 1; j <= n; j++) {
    const temp = dp[j];
    if (s1[i-1] === s2[j-1]) {
      dp[j] = prev + 1;
    } else {
      dp[j] = Math.max(dp[j], dp[j-1]);
    }
    prev = temp;
  }
}
```

## 时间优化总结

### 单调队列

适用条件：转移来源在固定大小窗口内。

```typescript
// 模板：滑动窗口最大值
const deque: number[] = [];
for (let i = 0; i < n; i++) {
  // 1. 移除过期
  while (deque.length && deque[0] < i - k + 1) deque.shift();
  // 2. 维护单调性
  while (deque.length && arr[deque.at(-1)!] <= arr[i]) deque.pop();
  // 3. 入队
  deque.push(i);
  // 4. 队首为答案
  if (i >= k - 1) result.push(arr[deque[0]]);
}
```

### 前缀和

适用条件：需要计算区间和。

```typescript
// 构建
const prefix = [0];
for (const x of arr) prefix.push(prefix.at(-1)! + x);

// 查询 [l, r]
const sum = prefix[r + 1] - prefix[l];

// 结合哈希：统计和为 k 的子数组
const count = new Map([[0, 1]]);
let sum = 0, result = 0;
for (const x of arr) {
  sum += x;
  result += count.get(sum - k) || 0;
  count.set(sum, (count.get(sum) || 0) + 1);
}
```

### 二分优化

适用条件：决策点具有单调性。

```typescript
// LIS 模板
const tails: number[] = [];
for (const num of nums) {
  let l = 0, r = tails.length;
  while (l < r) {
    const m = (l + r) >> 1;
    if (tails[m] < num) l = m + 1;
    else r = m;
  }
  if (l === tails.length) tails.push(num);
  else tails[l] = num;
}
return tails.length;
```

## 优化决策树

```
开始
  │
  ├─ 空间太大？
  │    ├─ 只依赖前一行 → 一维化
  │    ├─ 只依赖前几个 → 滚动数组
  │    └─ 状态太多 → 状态压缩
  │
  └─ 时间太慢？
       │
       ├─ 转移是区间和？ → 前缀和
       │
       ├─ 转移是区间最值？
       │    ├─ 固定窗口 → 单调队列
       │    ├─ 动态区间 → 线段树
       │    └─ 离线处理 → ST 表
       │
       ├─ 决策单调？
       │    ├─ 单调增 → 二分
       │    └─ 分治/决策单调性优化
       │
       └─ 线性递推？ → 矩阵快速幂
```

## 常见错误与陷阱

### 空间优化

1. **遍历顺序错误**
   - 0-1 背包必须逆序
   - 完全背包必须正序

2. **忘记保存对角线值**
   - LCS 一维化需要 `prev` 变量

3. **边界初始化遗漏**
   - 滚动后仍需正确初始化

### 单调队列

1. **先移除过期再入队**
   - 顺序不能颠倒

2. **存下标而非值**
   - 方便判断过期

3. **注意窗口形成时机**
   - 前 k-1 个元素不能取结果

### 前缀和

1. **下标偏移**
   - `prefix[r+1] - prefix[l]` 而非 `prefix[r] - prefix[l-1]`

2. **负数取模**
   - `((x % k) + k) % k` 处理负数

3. **初始化 prefix[0] = 0**
   - 或 `count.set(0, 1)`

## 进阶优化技术

### 矩阵快速幂

线性递推：f(n) = a₁f(n-1) + a₂f(n-2) + ... + aₖf(n-k)

```typescript
// 矩阵乘法
function multiply(A: number[][], B: number[][]): number[][] {
  const n = A.length, m = B[0].length, k = B.length;
  const C = Array.from({length: n}, () => Array(m).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < m; j++) {
      for (let l = 0; l < k; l++) {
        C[i][j] += A[i][l] * B[l][j];
      }
    }
  }
  return C;
}

// 矩阵快速幂
function matrixPow(M: number[][], n: number): number[][] {
  const k = M.length;
  let result = Array.from({length: k}, (_, i) => 
    Array.from({length: k}, (_, j) => i === j ? 1 : 0)
  );
  while (n > 0) {
    if (n & 1) result = multiply(result, M);
    M = multiply(M, M);
    n >>= 1;
  }
  return result;
}
```

### 决策单调性优化

当决策点 opt(i) 满足单调性时，可以用分治或其他方法优化。

### 斜率优化（凸包优化）

转移方程形如 `dp[i] = min{dp[j] + f(i)g(j)}` 时，可以用凸包优化。

## 本章题目回顾

| 题目 | 优化方法 | 关键技巧 |
|------|---------|---------|
| 斐波那契 | 滚动数组 | 两个变量 |
| 0-1 背包 | 一维化 | 逆序遍历 |
| 完全背包 | 一维化 | 正序遍历 |
| 滑动窗口最大值 | 单调队列 | 递减队列 |
| 和为 K 的子数组 | 前缀和 + 哈希 | 差值计数 |
| LIS | 贪心 + 二分 | tails 数组 |

## 学习建议

1. **先写正确解法**：优化建立在正确性之上
2. **识别瓶颈**：时间还是空间？哪个循环慢？
3. **选择合适方法**：根据问题特征选择优化技术
4. **验证正确性**：优化后结果应该不变
5. **多做练习**：熟能生巧，培养直觉

## 总结

DP 优化的核心思想：

1. **减少冗余计算**：利用已计算的结果
2. **利用单调性**：淘汰无效状态或决策
3. **高效数据结构**：加速查询和更新
4. **数学变换**：简化计算形式

掌握这些技巧，可以将很多"看似无解"的 DP 问题变得可解。
