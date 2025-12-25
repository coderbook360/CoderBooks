# 实战：编辑距离

## 题目描述

给你两个单词 `word1` 和 `word2`，请返回将 `word1` 转换成 `word2` 所使用的最少操作数。

你可以对一个单词进行如下三种操作：
- 插入一个字符
- 删除一个字符
- 替换一个字符

📎 [LeetCode 72. 编辑距离](https://leetcode.cn/problems/edit-distance/)

**示例**：

```
输入：word1 = "horse", word2 = "ros"
输出：3
解释：
horse -> rorse (将 'h' 替换为 'r')
rorse -> rose (删除 'r')
rose -> ros (删除 'e')
```

## 思路分析

编辑距离是 LCS 的泛化版本，是衡量字符串相似度的经典问题。

**直觉**：如果两个字符串相同，编辑距离为 0；越不相似，距离越大。

## 状态定义

```
dp[i][j] = word1[0..i-1] 变成 word2[0..j-1] 的最小操作数
```

## 状态转移

```
如果 word1[i-1] === word2[j-1]:
    dp[i][j] = dp[i-1][j-1]  // 不需要操作

否则:
    dp[i][j] = min(
        dp[i-1][j] + 1,      // 删除 word1[i-1]
        dp[i][j-1] + 1,      // 在 word1 末尾插入 word2[j-1]
        dp[i-1][j-1] + 1     // 替换 word1[i-1] 为 word2[j-1]
    )
```

## 边界条件

```
dp[0][j] = j  // 空串变成长度为 j 的串，需要 j 次插入
dp[i][0] = i  // 长度为 i 的串变成空串，需要 i 次删除
```

## 代码实现

```typescript
/**
 * 编辑距离
 * 时间复杂度：O(m × n)
 * 空间复杂度：O(m × n)
 */
function minDistance(word1: string, word2: string): number {
  const m = word1.length, n = word2.length;
  
  // dp[i][j] = word1[0..i-1] 变成 word2[0..j-1] 的最小操作数
  const dp: number[][] = Array.from(
    { length: m + 1 },
    () => new Array(n + 1).fill(0)
  );
  
  // 边界初始化
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (word1[i - 1] === word2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,      // 删除
          dp[i][j - 1] + 1,      // 插入
          dp[i - 1][j - 1] + 1   // 替换
        );
      }
    }
  }
  
  return dp[m][n];
}
```

## 空间优化

```typescript
function minDistance(word1: string, word2: string): number {
  const m = word1.length, n = word2.length;
  const dp = new Array(n + 1).fill(0);
  
  // 初始化第一行
  for (let j = 0; j <= n; j++) dp[j] = j;
  
  for (let i = 1; i <= m; i++) {
    let prev = dp[0];  // dp[i-1][j-1]
    dp[0] = i;         // dp[i][0] = i
    
    for (let j = 1; j <= n; j++) {
      const temp = dp[j];  // 保存 dp[i-1][j]
      
      if (word1[i - 1] === word2[j - 1]) {
        dp[j] = prev;
      } else {
        dp[j] = Math.min(temp + 1, dp[j - 1] + 1, prev + 1);
      }
      
      prev = temp;
    }
  }
  
  return dp[n];
}
```

## 示例演算

以 `word1 = "horse"`, `word2 = "ros"` 为例：

|   | "" | r | o | s |
|---|---|---|---|---|
| "" | 0 | 1 | 2 | 3 |
| h | 1 | 1 | 2 | 3 |
| o | 2 | 2 | 1 | 2 |
| r | 3 | 2 | 2 | 2 |
| s | 4 | 3 | 3 | 2 |
| e | 5 | 4 | 4 | **3** |

最终答案：3

## 三种操作的理解

假设我们要把 `word1[0..i-1]` 变成 `word2[0..j-1]`：

1. **删除**：先把 `word1[0..i-2]` 变成 `word2[0..j-1]`，再删除 `word1[i-1]`
   - `dp[i][j] = dp[i-1][j] + 1`

2. **插入**：先把 `word1[0..i-1]` 变成 `word2[0..j-2]`，再插入 `word2[j-1]`
   - `dp[i][j] = dp[i][j-1] + 1`

3. **替换**：先把 `word1[0..i-2]` 变成 `word2[0..j-2]`，再把 `word1[i-1]` 替换成 `word2[j-1]`
   - `dp[i][j] = dp[i-1][j-1] + 1`

## 还原操作序列

```typescript
function findOperations(word1: string, word2: string): string[] {
  const m = word1.length, n = word2.length;
  
  const dp: number[][] = Array.from(
    { length: m + 1 },
    () => new Array(n + 1).fill(0)
  );
  
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (word1[i - 1] === word2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,
          dp[i][j - 1] + 1,
          dp[i - 1][j - 1] + 1
        );
      }
    }
  }
  
  // 回溯
  const ops: string[] = [];
  let i = m, j = n;
  
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && word1[i - 1] === word2[j - 1]) {
      i--;
      j--;
    } else if (i > 0 && dp[i][j] === dp[i - 1][j] + 1) {
      ops.push(`删除 '${word1[i - 1]}'`);
      i--;
    } else if (j > 0 && dp[i][j] === dp[i][j - 1] + 1) {
      ops.push(`插入 '${word2[j - 1]}'`);
      j--;
    } else {
      ops.push(`替换 '${word1[i - 1]}' -> '${word2[j - 1]}'`);
      i--;
      j--;
    }
  }
  
  return ops.reverse();
}
```

## 编辑距离与 LCS 的关系

如果只允许删除操作：
```
编辑距离 = m + n - 2 × LCS(word1, word2)
```

## 变种问题

### 只允许删除和插入

```typescript
// 等价于：删除 word1 中不属于 LCS 的，插入 word2 中不属于 LCS 的
minOps = m + n - 2 * lcs
```

### 不同操作有不同代价

```typescript
// 假设删除代价 del，插入代价 ins，替换代价 rep
dp[i][j] = min(
  dp[i-1][j] + del,
  dp[i][j-1] + ins,
  dp[i-1][j-1] + rep
)
```

## 复杂度分析

| 解法 | 时间复杂度 | 空间复杂度 |
|-----|-----------|-----------|
| 标准 DP | O(m × n) | O(m × n) |
| 空间优化 | O(m × n) | O(min(m, n)) |

## 应用场景

- **拼写检查**：找最相近的正确单词
- **DNA 比对**：计算基因序列相似度
- **模糊搜索**：允许一定编辑距离的匹配
- **版本对比**：diff 工具的基础

## 本章小结

1. **状态定义**：`dp[i][j]` = 两个前缀的最小编辑距离
2. **三种操作**：删除、插入、替换
3. **转移方程**：相同不操作，不同取三者最小
4. **与 LCS 关系**：只允许删除时，距离 = m + n - 2×LCS
