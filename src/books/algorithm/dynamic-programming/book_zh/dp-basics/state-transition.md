# 状态转移方程的推导

有了状态定义，下一步就是推导**状态转移方程**——这是动态规划的核心。状态转移方程描述了大问题的解如何由小问题的解构成，它是 DP 解法的"灵魂"。

## 什么是状态转移方程？

状态转移方程是一个递推公式，表达了当前状态与之前状态的关系。

**一般形式**：

```
dp[i] = f(dp[j], dp[k], ...)  其中 j, k < i
```

以爬楼梯为例：
- 状态：`dp[i]` = 爬到第 i 级台阶的方法数
- 转移：`dp[i] = dp[i-1] + dp[i-2]`
- 含义：到第 i 级，要么从第 i-1 级跨 1 步，要么从第 i-2 级跨 2 步

## 推导状态转移的核心方法

### 方法一：最后一步分析法

**核心思想**：假设已经有了最优解，看"最后一步"是怎么到达当前状态的。

**步骤**：
1. 假设我们已经求出了 `dp[i]` 的最优解
2. 问：在达到这个最优解之前的最后一步是什么？
3. 枚举所有可能的"最后一步"，建立转移关系

**案例：零钱兑换**

> 凑成金额 amount 的最少硬币数

**分析最后一步**：
- 假设我们已经凑出了 amount 元，用了最少的硬币
- 最后一枚硬币是什么？可能是任意一种面额的硬币
- 如果最后一枚是 coin，那么之前的金额是 amount - coin

**转移方程**：
```
dp[i] = min(dp[i - coin] + 1)  对所有 coin ∈ coins
```

**代码实现**：
```typescript
function coinChange(coins: number[], amount: number): number {
  const dp = new Array(amount + 1).fill(Infinity);
  dp[0] = 0;  // 凑 0 元需要 0 个硬币
  
  for (let i = 1; i <= amount; i++) {
    for (const coin of coins) {
      if (i >= coin && dp[i - coin] !== Infinity) {
        // 最后一步用了面额为 coin 的硬币
        dp[i] = Math.min(dp[i], dp[i - coin] + 1);
      }
    }
  }
  
  return dp[amount] === Infinity ? -1 : dp[amount];
}
```

### 方法二：选择分析法

**核心思想**：对当前元素/位置，枚举所有可能的"选择"，每种选择对应一种转移。

**步骤**：
1. 对于状态 `dp[i]`，当前元素/位置有哪些选择？
2. 每种选择会带来什么结果？
3. 如何从这些选择中得到最优解？

**案例：打家劫舍**

> 相邻房屋不能同时偷，求最大金额

**分析选择**：
对于第 i 个房屋，有两种选择：
1. **偷**：获得 `nums[i]`，但第 i-1 个房屋不能偷 → `dp[i-2] + nums[i]`
2. **不偷**：不获得 `nums[i]`，前一个房屋可偷可不偷 → `dp[i-1]`

**转移方程**：
```
dp[i] = max(dp[i-1], dp[i-2] + nums[i])
```

**代码实现**：
```typescript
function rob(nums: number[]): number {
  const n = nums.length;
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

### 方法三：填表观察法

**核心思想**：先手动填几个状态，观察规律，归纳出转移方程。

**步骤**：
1. 画出 DP 表格
2. 手动计算几个状态的值
3. 观察每个格子是怎么从其他格子得到的
4. 总结规律

**案例：不同路径**

> m×n 网格，从左上角到右下角，每次只能向右或向下，有多少种路径？

**手动填表**：

```
    1   2   3   4   5
  ┌───┬───┬───┬───┬───┐
1 │ 1 │ 1 │ 1 │ 1 │ 1 │
  ├───┼───┼───┼───┼───┤
2 │ 1 │ 2 │ 3 │ 4 │ 5 │
  ├───┼───┼───┼───┼───┤
3 │ 1 │ 3 │ 6 │10 │15 │
  └───┴───┴───┴───┴───┘
```

**观察规律**：
- 第一行和第一列都是 1（只有一种走法）
- 其他格子 = 上方格子 + 左方格子

**转移方程**：
```
dp[i][j] = dp[i-1][j] + dp[i][j-1]
```

## 常见转移模式

### 模式一：线性转移

当前状态只依赖前面固定数量的状态。

```
dp[i] = f(dp[i-1], dp[i-2], ...)
```

**典型问题**：
- 爬楼梯：`dp[i] = dp[i-1] + dp[i-2]`
- 打家劫舍：`dp[i] = max(dp[i-1], dp[i-2] + nums[i])`
- 斐波那契：`dp[i] = dp[i-1] + dp[i-2]`

### 模式二：枚举前驱

当前状态需要枚举所有可能的前驱状态。

```
dp[i] = opt(dp[j] + cost(j, i))  对所有有效的 j < i
```

**典型问题**：
- 最长递增子序列：`dp[i] = max(dp[j] + 1)`，其中 j < i 且 nums[j] < nums[i]
- 零钱兑换：`dp[i] = min(dp[i-coin] + 1)`，对所有面额

**代码模板**：
```typescript
// 枚举所有前驱状态
for (let i = 0; i < n; i++) {
  for (let j = 0; j < i; j++) {
    if (canTransfer(j, i)) {  // 检查能否从 j 转移到 i
      dp[i] = Math.max(dp[i], dp[j] + cost(j, i));
    }
  }
}
```

### 模式三：双序列转移

两个序列比较时的转移模式。

```
dp[i][j] = f(dp[i-1][j], dp[i][j-1], dp[i-1][j-1])
```

**典型问题**：
- LCS：两个字符匹配时 `dp[i-1][j-1] + 1`，不匹配时 `max(dp[i-1][j], dp[i][j-1])`
- 编辑距离：三种操作对应三个前驱状态

**案例：编辑距离**

```typescript
// dp[i][j] = word1[0..i-1] 转换成 word2[0..j-1] 的最小操作数
function minDistance(word1: string, word2: string): number {
  const m = word1.length, n = word2.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => 
    new Array(n + 1).fill(0)
  );
  
  // 初始化：空串转换
  for (let i = 0; i <= m; i++) dp[i][0] = i;  // 删除 i 个字符
  for (let j = 0; j <= n; j++) dp[0][j] = j;  // 插入 j 个字符
  
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (word1[i - 1] === word2[j - 1]) {
        // 字符相同，不需要操作
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        // 三种操作取最小
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,      // 删除 word1[i-1]
          dp[i][j - 1] + 1,      // 插入 word2[j-1]
          dp[i - 1][j - 1] + 1   // 替换
        );
      }
    }
  }
  
  return dp[m][n];
}
```

### 模式四：区间转移

从小区间推大区间。

```
dp[i][j] = opt(dp[i][k] + dp[k+1][j] + cost)  对所有 i <= k < j
```

**典型问题**：
- 戳气球：区间分割点枚举
- 矩阵链乘法：分割位置枚举

**案例：戳气球**

```typescript
// dp[i][j] = 戳破 (i, j) 范围内所有气球能获得的最大硬币数
// 注意是开区间 (i, j)，即 i 和 j 位置的气球不戳
function maxCoins(nums: number[]): number {
  // 在两端加上虚拟气球 1
  const n = nums.length;
  const arr = [1, ...nums, 1];
  const dp: number[][] = Array.from({ length: n + 2 }, () => 
    new Array(n + 2).fill(0)
  );
  
  // 枚举区间长度
  for (let len = 1; len <= n; len++) {
    for (let i = 1; i + len <= n + 1; i++) {
      const j = i + len - 1;
      // 枚举最后一个戳破的气球
      for (let k = i; k <= j; k++) {
        const coins = arr[i - 1] * arr[k] * arr[j + 1];
        dp[i][j] = Math.max(dp[i][j], dp[i][k - 1] + coins + dp[k + 1][j]);
      }
    }
  }
  
  return dp[1][n];
}
```

## 转移方程的验证

推导出转移方程后，需要验证其正确性：

### 检查点一：覆盖所有情况

转移方程是否覆盖了所有可能的前驱状态？

**反例**：最长递增子序列

错误转移：`dp[i] = dp[i-1] + 1 if nums[i] > nums[i-1]`

问题：只考虑了相邻元素，没考虑不相邻的情况。

正确转移：`dp[i] = max(dp[j] + 1)`，对所有 j < i 且 nums[j] < nums[i]

### 检查点二：无遗漏无重复

确保每种情况只被计算一次。

**案例：不同路径 II（有障碍物）**

```typescript
function uniquePathsWithObstacles(grid: number[][]): number {
  const m = grid.length, n = grid[0].length;
  if (grid[0][0] === 1) return 0;  // 起点是障碍物
  
  const dp: number[][] = Array.from({ length: m }, () => 
    new Array(n).fill(0)
  );
  dp[0][0] = 1;
  
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      if (grid[i][j] === 1) {
        dp[i][j] = 0;  // 障碍物位置无法到达
        continue;
      }
      if (i > 0) dp[i][j] += dp[i - 1][j];  // 从上方来
      if (j > 0) dp[i][j] += dp[i][j - 1];  // 从左方来
    }
  }
  
  return dp[m - 1][n - 1];
}
```

### 检查点三：边界处理

初始条件和边界情况是否正确处理？

**常见边界**：
- `dp[0]` 或 `dp[0][0]` 的值
- 第一行/第一列的特殊处理
- 空输入的处理

## 从递归到转移方程

如果直接推导转移方程有困难，可以先写递归，再转换。

**步骤**：
1. 写出暴力递归解法
2. 识别递归函数的参数 → 这就是状态变量
3. 将递归关系改写为转移方程

**案例：零钱兑换**

**步骤一：暴力递归**
```typescript
function coinChangeRecursive(coins: number[], amount: number): number {
  if (amount === 0) return 0;
  if (amount < 0) return Infinity;
  
  let result = Infinity;
  for (const coin of coins) {
    const sub = coinChangeRecursive(coins, amount - coin);
    result = Math.min(result, sub + 1);
  }
  return result;
}
```

**步骤二：识别状态**
- 递归参数：`amount`
- 状态：`dp[i]` = 凑成金额 i 的最少硬币数

**步骤三：转换为转移方程**
```
dp[i] = min(dp[i - coin] + 1)  对所有 coin ∈ coins
```

## 常见陷阱

### 陷阱一：忘记处理无解情况

```typescript
// 错误：没处理凑不出的情况
function coinChange(coins: number[], amount: number): number {
  const dp = new Array(amount + 1).fill(0);  // ❌ 初始值错误
  // ...
}

// 正确：用 Infinity 表示无解
function coinChange(coins: number[], amount: number): number {
  const dp = new Array(amount + 1).fill(Infinity);
  dp[0] = 0;
  // ...
  return dp[amount] === Infinity ? -1 : dp[amount];
}
```

### 陷阱二：转移顺序错误

```typescript
// 01 背包：错误的遍历顺序
for (let j = 0; j <= W; j++) {  // ❌ 正序导致物品被多次使用
  if (j >= weight[i]) {
    dp[j] = Math.max(dp[j], dp[j - weight[i]] + value[i]);
  }
}

// 正确：倒序遍历
for (let j = W; j >= weight[i]; j--) {  // ✅ 倒序保证每个物品只用一次
  dp[j] = Math.max(dp[j], dp[j - weight[i]] + value[i]);
}
```

### 陷阱三：索引越界

```typescript
// 错误：没检查索引有效性
dp[i] = dp[i - 1] + dp[i - 2];  // ❌ 当 i < 2 时越界

// 正确：先处理边界
dp[0] = 1;
dp[1] = 1;
for (let i = 2; i <= n; i++) {
  dp[i] = dp[i - 1] + dp[i - 2];
}
```

## 本章小结

1. **状态转移方程是什么**：描述当前状态与之前状态关系的递推公式
2. **三种推导方法**：最后一步分析法、选择分析法、填表观察法
3. **常见转移模式**：线性转移、枚举前驱、双序列转移、区间转移
4. **验证要点**：覆盖所有情况、无遗漏无重复、正确处理边界
5. **实用技巧**：先写递归再转换为转移方程

下一章，我们将学习**边界条件与初始化**——DP 解法中容易出错的地方。
