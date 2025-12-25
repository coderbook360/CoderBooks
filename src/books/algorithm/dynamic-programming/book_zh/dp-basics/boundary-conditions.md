# 边界条件与初始化

状态定义和转移方程确定后，很多人以为 DP 问题已经解决了。实际上，**边界条件和初始化**才是最容易出错的地方。一个错误的初始值可能导致整个结果错误，甚至程序崩溃。

本章将系统讲解如何正确处理边界条件。

## 为什么边界条件重要？

动态规划是递推过程：从已知的小问题推导未知的大问题。

```
边界条件（已知）→ 中间状态 → 最终答案
    ↑
 一切的起点
```

如果边界条件错误，整个递推链条都会出问题，就像多米诺骨牌的第一张牌放错了位置。

## 边界条件的类型

### 类型一：最小规模子问题

当问题规模缩小到无法再分时，就到达了边界。

**案例：爬楼梯**

```
dp[1] = 1  // 只有 1 种走法：跨 1 步
dp[2] = 2  // 有 2 种走法：1+1 或 2
```

**为什么 dp[0] 也要考虑？**

有些问题需要 `dp[0]` 作为哨兵值。比如零钱兑换：

```typescript
dp[0] = 0;  // 凑 0 元需要 0 枚硬币
```

这让转移方程 `dp[i] = min(dp[i-coin] + 1)` 在 `i = coin` 时能正确工作。

### 类型二：空输入/零输入

当输入为空或零时的处理。

**案例：最长公共子序列**

```typescript
// dp[i][j] = text1[0..i-1] 和 text2[0..j-1] 的 LCS 长度
// 边界：其中一个字符串为空，LCS 长度为 0
for (let i = 0; i <= m; i++) dp[i][0] = 0;
for (let j = 0; j <= n; j++) dp[0][j] = 0;
```

### 类型三：第一行/第一列

二维 DP 中，第一行和第一列通常需要特殊处理。

**案例：不同路径**

```typescript
// 第一行：只能从左边来，只有 1 种走法
for (let j = 0; j < n; j++) dp[0][j] = 1;
// 第一列：只能从上面来，只有 1 种走法  
for (let i = 0; i < m; i++) dp[i][0] = 1;
```

### 类型四：无解标记

用特殊值标记"不可达"或"无解"状态。

**案例：零钱兑换**

```typescript
// 用 Infinity 表示无法凑出
const dp = new Array(amount + 1).fill(Infinity);
dp[0] = 0;  // 只有 dp[0] 是可达的

// 最后检查是否有解
return dp[amount] === Infinity ? -1 : dp[amount];
```

## 初始化策略

### 策略一：全部初始化为默认值

根据问题类型选择默认值：

| 问题类型 | 默认值 | 示例 |
|---------|-------|------|
| 求最小值 | Infinity | 零钱兑换 |
| 求最大值 | -Infinity 或 0 | 最大子数组和 |
| 计数问题 | 0 | 不同路径 |
| 可行性问题 | false | 分割等和子集 |

**代码模板**：

```typescript
// 求最小值问题
const dp = new Array(n).fill(Infinity);
dp[0] = initialValue;

// 求最大值问题
const dp = new Array(n).fill(-Infinity);
dp[0] = initialValue;

// 计数问题
const dp = new Array(n).fill(0);
dp[0] = 1;  // 或根据具体问题确定

// 可行性问题
const dp = new Array(n).fill(false);
dp[0] = true;
```

### 策略二：显式初始化边界

手动设置边界状态的值。

```typescript
// 二维 DP 的显式初始化
const dp: number[][] = Array.from({ length: m + 1 }, () => 
  new Array(n + 1).fill(0)
);

// 初始化第一行
for (let j = 1; j <= n; j++) {
  dp[0][j] = j;  // 编辑距离：需要 j 次插入
}

// 初始化第一列
for (let i = 1; i <= m; i++) {
  dp[i][0] = i;  // 编辑距离：需要 i 次删除
}
```

### 策略三：哨兵技巧

添加额外的边界元素，简化代码逻辑。

**案例：戳气球**

原数组 `[3, 1, 5, 8]`，在两端加上虚拟气球 1：

```typescript
const arr = [1, ...nums, 1];  // [1, 3, 1, 5, 8, 1]
```

这样处理边界时不需要特判。

**案例：最大子数组和**

在数组前面加一个 0：

```typescript
// 原数组 nums = [-2, 1, -3, 4]
// 加哨兵后处理更简洁
let maxSum = nums[0];
let currentSum = 0;  // 哨兵作用

for (const num of nums) {
  currentSum = Math.max(num, currentSum + num);
  maxSum = Math.max(maxSum, currentSum);
}
```

## 常见问题的边界处理

### 案例一：打家劫舍

**状态**：`dp[i]` = 前 i 个房屋能偷到的最大金额

**边界分析**：
- `dp[0] = nums[0]`：只有一个房屋，必偷
- `dp[1] = max(nums[0], nums[1])`：两个房屋，选金额大的

```typescript
function rob(nums: number[]): number {
  const n = nums.length;
  
  // 边界处理
  if (n === 0) return 0;
  if (n === 1) return nums[0];
  
  const dp = new Array(n);
  dp[0] = nums[0];
  dp[1] = Math.max(nums[0], nums[1]);
  
  for (let i = 2; i < n; i++) {
    dp[i] = Math.max(dp[i - 1], dp[i - 2] + nums[i]);
  }
  
  return dp[n - 1];
}
```

### 案例二：最长递增子序列

**状态**：`dp[i]` = 以 nums[i] 结尾的 LIS 长度

**边界分析**：
- 每个元素自己就是长度为 1 的 LIS
- 初始值：全部设为 1

```typescript
function lengthOfLIS(nums: number[]): number {
  const n = nums.length;
  if (n === 0) return 0;
  
  // 所有位置初始化为 1（每个元素自成 LIS）
  const dp = new Array(n).fill(1);
  
  for (let i = 1; i < n; i++) {
    for (let j = 0; j < i; j++) {
      if (nums[j] < nums[i]) {
        dp[i] = Math.max(dp[i], dp[j] + 1);
      }
    }
  }
  
  return Math.max(...dp);
}
```

### 案例三：编辑距离

**状态**：`dp[i][j]` = word1[0..i-1] 转换为 word2[0..j-1] 的最小操作数

**边界分析**：
- `dp[i][0] = i`：word2 为空，需要删除 i 个字符
- `dp[0][j] = j`：word1 为空，需要插入 j 个字符

```typescript
function minDistance(word1: string, word2: string): number {
  const m = word1.length, n = word2.length;
  
  const dp: number[][] = Array.from({ length: m + 1 }, () => 
    new Array(n + 1).fill(0)
  );
  
  // 初始化边界
  for (let i = 0; i <= m; i++) dp[i][0] = i;  // 删除操作
  for (let j = 0; j <= n; j++) dp[0][j] = j;  // 插入操作
  
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (word1[i - 1] === word2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(
          dp[i - 1][j],      // 删除
          dp[i][j - 1],      // 插入
          dp[i - 1][j - 1]   // 替换
        );
      }
    }
  }
  
  return dp[m][n];
}
```

### 案例四：背包问题

**状态**：`dp[i][j]` = 前 i 个物品、容量 j 时的最大价值

**边界分析**：
- `dp[0][j] = 0`：没有物品可选，价值为 0
- `dp[i][0] = 0`：容量为 0，装不下任何东西

```typescript
function knapsack(weights: number[], values: number[], W: number): number {
  const n = weights.length;
  
  // 自动初始化为 0
  const dp: number[][] = Array.from({ length: n + 1 }, () => 
    new Array(W + 1).fill(0)
  );
  
  for (let i = 1; i <= n; i++) {
    for (let j = 0; j <= W; j++) {
      // 不选第 i 个物品
      dp[i][j] = dp[i - 1][j];
      
      // 选第 i 个物品（如果装得下）
      if (j >= weights[i - 1]) {
        dp[i][j] = Math.max(
          dp[i][j], 
          dp[i - 1][j - weights[i - 1]] + values[i - 1]
        );
      }
    }
  }
  
  return dp[n][W];
}
```

## 常见错误与修正

### 错误一：忘记处理空输入

```typescript
// ❌ 错误：没检查空数组
function rob(nums: number[]): number {
  const dp = new Array(nums.length);
  dp[0] = nums[0];  // nums 为空时报错！
  // ...
}

// ✅ 正确：先检查边界
function rob(nums: number[]): number {
  if (nums.length === 0) return 0;
  if (nums.length === 1) return nums[0];
  // ...
}
```

### 错误二：初始值与默认值混淆

```typescript
// ❌ 错误：把默认值当初始值
const dp = new Array(n).fill(0);
// 对于求最小值问题，0 可能被误认为是"最优解"

// ✅ 正确：用 Infinity 表示"尚未计算"
const dp = new Array(n).fill(Infinity);
dp[0] = 0;  // 只有真正的初始状态是 0
```

### 错误三：下标偏移错误

```typescript
// ❌ 错误：i 和 i-1 混淆
// 状态定义：dp[i] = 前 i 个元素的...
// 但代码中用 nums[i] 访问第 i+1 个元素

// ✅ 正确：明确下标含义
// 方案一：dp[i] 对应 nums[i-1]
for (let i = 1; i <= n; i++) {
  // 访问 nums[i-1]
}

// 方案二：dp[i] 对应 nums[i]
for (let i = 0; i < n; i++) {
  // 访问 nums[i]
}
```

### 错误四：循环边界不正确

```typescript
// ❌ 错误：循环范围错误
for (let i = 0; i < n; i++) {
  dp[i] = dp[i - 1] + dp[i - 2];  // i=0 或 i=1 时越界！
}

// ✅ 正确：从边界之后开始循环
dp[0] = 1;
dp[1] = 1;
for (let i = 2; i < n; i++) {
  dp[i] = dp[i - 1] + dp[i - 2];
}
```

## 边界处理的检查清单

写完 DP 代码后，用以下清单自检：

- [ ] 空输入是否正确处理？
- [ ] 数组大小是否正确（n 还是 n+1）？
- [ ] 初始值是否符合问题语义？
- [ ] 循环起始位置是否正确？
- [ ] 第一行/第一列是否特殊处理？
- [ ] 最终答案从哪里取？
- [ ] 无解情况如何返回？

## 本章小结

1. **边界条件是递推的起点**，错误的边界会导致整个结果错误
2. **四种边界类型**：最小规模子问题、空输入、第一行/列、无解标记
3. **三种初始化策略**：默认值初始化、显式初始化、哨兵技巧
4. **常见错误**：忘记空输入、初始值与默认值混淆、下标偏移、循环边界
5. **自检清单**：写完代码后逐项检查

下一章，我们将学习 DP 的最后一个环节——**计算顺序与空间优化**。
