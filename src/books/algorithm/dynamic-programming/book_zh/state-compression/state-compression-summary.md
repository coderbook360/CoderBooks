# 状态压缩 DP 总结

## 核心技巧回顾

### 位运算速查表

| 操作 | 代码 | 含义 |
|-----|------|------|
| 检查第 i 位 | `(mask >> i) & 1` | 是否选中 i |
| 设置第 i 位 | `mask \| (1 << i)` | 选中 i |
| 清除第 i 位 | `mask & ~(1 << i)` | 取消选中 i |
| 翻转第 i 位 | `mask ^ (1 << i)` | 切换状态 |
| 最低位 1 | `mask & -mask` | lowbit |
| 去最低位 1 | `mask & (mask - 1)` | popcount 辅助 |
| 全选 | `(1 << n) - 1` | n 个元素全选 |
| 枚举子集 | `sub = (sub - 1) & mask` | 遍历所有子集 |

### 子集枚举模板

```typescript
// 枚举 mask 的所有非空子集
for (let sub = mask; sub > 0; sub = (sub - 1) & mask) {
  // 处理子集 sub
}

// 包括空集
for (let sub = mask; ; sub = (sub - 1) & mask) {
  // 处理子集 sub
  if (sub === 0) break;
}
```

## 问题分类

### 1. 覆盖类问题

目标：选最少的元素覆盖所有需求。

**例题**：
- 最小的必要团队
- 贴纸拼词

**模板**：
```typescript
const dp = new Array(1 << n).fill(Infinity);
dp[0] = 0;

for (let mask = 0; mask < (1 << n); mask++) {
  if (dp[mask] === Infinity) continue;
  
  for (const item of items) {
    const newMask = mask | item.cover;
    dp[newMask] = Math.min(dp[newMask], dp[mask] + 1);
  }
}
```

### 2. 路径类问题

目标：访问所有节点的最短/最优路径。

**例题**：
- 最短路径访问所有节点
- 旅行商问题

**模板**：
```typescript
// dp[mask][i] = 访问了 mask，当前在 i 的最优值
const dp = Array.from(
  { length: 1 << n },
  () => new Array(n).fill(Infinity)
);

dp[1 << start][start] = 0;

for (let mask = 1; mask < (1 << n); mask++) {
  for (let u = 0; u < n; u++) {
    if (!(mask & (1 << u))) continue;
    
    for (let v = 0; v < n; v++) {
      if (mask & (1 << v)) continue;
      
      const newMask = mask | (1 << v);
      dp[newMask][v] = Math.min(dp[newMask][v], dp[mask][u] + dist[u][v]);
    }
  }
}
```

### 3. 划分类问题

目标：将集合划分为若干满足条件的子集。

**例题**：
- 划分为 K 个相等子集
- 火柴拼正方形

**模板**：
```typescript
// dp[mask] = 当前组已填充的值
const dp = new Array(1 << n).fill(-1);
dp[0] = 0;

for (let mask = 0; mask < (1 << n); mask++) {
  if (dp[mask] === -1) continue;
  
  for (let i = 0; i < n; i++) {
    if (mask & (1 << i)) continue;
    if (dp[mask] + nums[i] > target) continue;
    
    const newMask = mask | (1 << i);
    dp[newMask] = (dp[mask] + nums[i]) % target;
  }
}

return dp[(1 << n) - 1] === 0;
```

### 4. 棋盘类问题

目标：棋盘上的放置/覆盖问题。

**例题**：
- N 皇后
- 多米诺覆盖

**模板**：
```typescript
// 逐行处理，用位表示当前行的状态
function backtrack(row: number, cols: number, diag1: number, diag2: number) {
  if (row === n) {
    return 1;
  }
  
  let available = FULL & ~(cols | diag1 | diag2);
  let count = 0;
  
  while (available > 0) {
    const pos = available & -available;
    available &= available - 1;
    
    count += backtrack(
      row + 1,
      cols | pos,
      (diag1 | pos) << 1,
      (diag2 | pos) >> 1
    );
  }
  
  return count;
}
```

## 优化技巧

### 1. 预处理

预计算每个状态的属性：

```typescript
// 预计算每个 mask 的 popcount
const popcount = new Array(1 << n);
for (let i = 0; i < (1 << n); i++) {
  popcount[i] = popcount[i >> 1] + (i & 1);
}

// 预计算每个 mask 的元素和
const maskSum = new Array(1 << n);
for (let i = 0; i < (1 << n); i++) {
  let sum = 0;
  for (let j = 0; j < n; j++) {
    if (i & (1 << j)) sum += nums[j];
  }
  maskSum[i] = sum;
}
```

### 2. 剪枝

跳过无效状态：

```typescript
// 跳过不满足条件的状态
if (!isValid(mask)) continue;

// 利用对称性减半
if (mask > mirror(mask)) continue;
```

### 3. 按位计数排序

优先处理元素少的状态：

```typescript
const indices = [...Array(1 << n).keys()];
indices.sort((a, b) => popcount[a] - popcount[b]);

for (const mask of indices) {
  // 按 popcount 从小到大处理
}
```

## 复杂度总结

| 操作 | 复杂度 |
|-----|--------|
| 遍历所有状态 | O(2^n) |
| 每个状态转移 O(n) | O(n × 2^n) |
| 枚举所有子集 | O(3^n) |
| 枚举大小为 k 的子集 | O(C(n,k)) |

**适用范围**：通常 n ≤ 20

## 调试技巧

1. **打印二进制**：
```typescript
console.log(mask.toString(2).padStart(n, '0'));
```

2. **验证小规模**：
```typescript
// 先用 n = 3, 4 验证逻辑
```

3. **检查边界**：
```typescript
// mask = 0（空集）
// mask = (1 << n) - 1（全集）
```

## 面试建议

1. **解释清楚**：说明为什么用状态压缩，状态含义
2. **位运算熟练**：不要在位运算上出错
3. **复杂度分析**：说明状态数和转移复杂度
4. **考虑优化**：提及可能的剪枝和预处理

## 经典题目清单

| 难度 | 题目 | 类型 |
|-----|------|------|
| 中等 | 最短路径访问所有节点 | 路径 |
| 中等 | 划分为 K 个相等子集 | 划分 |
| 中等 | 火柴拼正方形 | 划分 |
| 困难 | 最小的必要团队 | 覆盖 |
| 困难 | 贴纸拼词 | 覆盖 |
| 困难 | N 皇后 | 棋盘 |
| 困难 | 旅行商问题 | 路径 |

## 本章小结

状态压缩 DP 的核心是：

1. **用整数表示集合**
2. **位运算操作集合**
3. **枚举状态转移**

掌握这些技巧，就能解决大部分状态压缩问题。
