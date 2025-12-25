# 实战：编辑距离

编辑距离是双序列 DP 的经典问题，也是字符串处理的核心算法之一。

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
horse → rorse (将 'h' 替换为 'r')
rorse → rose (删除 'r')
rose → ros (删除 'e')

输入：word1 = "intention", word2 = "execution"
输出：5
```

**约束**：
- `0 <= word1.length, word2.length <= 500`
- `word1` 和 `word2` 由小写英文字母组成

## 思路分析

### 问题建模

把 `word1` 变成 `word2`，每次操作：
- **插入**：在 `word1` 中插入一个字符
- **删除**：删除 `word1` 中的一个字符
- **替换**：将 `word1` 中的一个字符替换为另一个

### 状态定义

`dp[i][j]` = 将 `word1[0..i-1]` 转换为 `word2[0..j-1]` 的最少操作数

### 状态转移

比较 `word1[i-1]` 和 `word2[j-1]`：

**情况一：字符相等**
```
不需要操作
dp[i][j] = dp[i-1][j-1]
```

**情况二：字符不等**
```
三种操作取最小：
1. 替换：dp[i-1][j-1] + 1  (word1[i-1] 替换为 word2[j-1])
2. 删除：dp[i-1][j] + 1    (删除 word1[i-1])
3. 插入：dp[i][j-1] + 1    (在 word1 插入 word2[j-1])

dp[i][j] = min(dp[i-1][j-1], dp[i-1][j], dp[i][j-1]) + 1
```

### 边界条件

- `dp[0][j] = j`：空串变成长度为 j 的串，需要 j 次插入
- `dp[i][0] = i`：长度为 i 的串变成空串，需要 i 次删除

### 图示理解

```
    ""  r   o   s
""   0   1   2   3
h    1   1   2   3
o    2   2   1   2
r    3   2   2   2
s    4   3   3   2
e    5   4   4   3

word1 = "horse", word2 = "ros"
编辑距离 = 3
```

### 三种操作的理解

```
          word2[j-1]
             ↓
    ... ? ? r ? ? ?
        ↑
    word1[i-1]

dp[i-1][j-1] + 替换 → dp[i][j]  (把 word1[i-1] 换成 word2[j-1])
dp[i-1][j] + 删除   → dp[i][j]  (删掉 word1[i-1])
dp[i][j-1] + 插入   → dp[i][j]  (在 word1 后面插入 word2[j-1])
```

## 解法一：递推

```typescript
/**
 * 递推
 * 时间复杂度：O(m * n)
 * 空间复杂度：O(m * n)
 */
function minDistance(word1: string, word2: string): number {
  const m = word1.length;
  const n = word2.length;
  
  // dp[i][j] = word1 前 i 个字符变成 word2 前 j 个字符的最少操作数
  const dp: number[][] = Array.from(
    { length: m + 1 },
    () => new Array(n + 1).fill(0)
  );
  
  // 边界条件
  for (let i = 0; i <= m; i++) dp[i][0] = i;  // 删除 i 个字符
  for (let j = 0; j <= n; j++) dp[0][j] = j;  // 插入 j 个字符
  
  // 状态转移
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (word1[i - 1] === word2[j - 1]) {
        // 字符相等，无需操作
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        // 三种操作取最小
        dp[i][j] = Math.min(
          dp[i - 1][j - 1] + 1,  // 替换
          dp[i - 1][j] + 1,      // 删除
          dp[i][j - 1] + 1       // 插入
        );
      }
    }
  }
  
  return dp[m][n];
}
```

## 解法二：空间优化

```typescript
/**
 * 空间优化
 * 时间复杂度：O(m * n)
 * 空间复杂度：O(n)
 */
function minDistance(word1: string, word2: string): number {
  const m = word1.length;
  const n = word2.length;
  
  const dp = new Array(n + 1);
  for (let j = 0; j <= n; j++) dp[j] = j;
  
  for (let i = 1; i <= m; i++) {
    let prev = dp[0];  // dp[i-1][j-1]
    dp[0] = i;         // dp[i][0]
    
    for (let j = 1; j <= n; j++) {
      const temp = dp[j];  // 保存 dp[i-1][j]
      
      if (word1[i - 1] === word2[j - 1]) {
        dp[j] = prev;
      } else {
        dp[j] = Math.min(prev, dp[j], dp[j - 1]) + 1;
      }
      
      prev = temp;
    }
  }
  
  return dp[n];
}
```

## 解法三：记忆化搜索

```typescript
/**
 * 记忆化搜索
 * 时间复杂度：O(m * n)
 * 空间复杂度：O(m * n)
 */
function minDistance(word1: string, word2: string): number {
  const m = word1.length;
  const n = word2.length;
  const memo: number[][] = Array.from(
    { length: m },
    () => new Array(n).fill(-1)
  );
  
  function dp(i: number, j: number): number {
    // 边界条件
    if (i < 0) return j + 1;  // word1 用完，需要插入 j+1 个
    if (j < 0) return i + 1;  // word2 用完，需要删除 i+1 个
    
    // 查备忘录
    if (memo[i][j] !== -1) return memo[i][j];
    
    if (word1[i] === word2[j]) {
      memo[i][j] = dp(i - 1, j - 1);
    } else {
      memo[i][j] = Math.min(
        dp(i - 1, j - 1) + 1,  // 替换
        dp(i - 1, j) + 1,      // 删除
        dp(i, j - 1) + 1       // 插入
      );
    }
    
    return memo[i][j];
  }
  
  return dp(m - 1, n - 1);
}
```

## 输出具体操作序列

```typescript
function getEditOperations(word1: string, word2: string): string[] {
  const m = word1.length;
  const n = word2.length;
  
  // 先计算 dp 表
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
        dp[i][j] = Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]) + 1;
      }
    }
  }
  
  // 回溯获取操作序列
  const operations: string[] = [];
  let i = m, j = n;
  
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && word1[i - 1] === word2[j - 1]) {
      i--;
      j--;
    } else if (i > 0 && j > 0 && dp[i][j] === dp[i - 1][j - 1] + 1) {
      operations.unshift(`Replace '${word1[i - 1]}' with '${word2[j - 1]}'`);
      i--;
      j--;
    } else if (i > 0 && dp[i][j] === dp[i - 1][j] + 1) {
      operations.unshift(`Delete '${word1[i - 1]}'`);
      i--;
    } else {
      operations.unshift(`Insert '${word2[j - 1]}'`);
      j--;
    }
  }
  
  return operations;
}
```

## 变体问题

### 变体一：只允许删除操作

📎 [LeetCode 583. 两个字符串的删除操作](https://leetcode.cn/problems/delete-operation-for-two-strings/)

```typescript
function minDistance(word1: string, word2: string): number {
  // 删除操作数 = 两个字符串长度之和 - 2 * LCS 长度
  const lcs = longestCommonSubsequence(word1, word2);
  return word1.length + word2.length - 2 * lcs;
}
```

### 变体二：只允许插入和删除

```typescript
function minInsertDelete(word1: string, word2: string): number {
  const lcs = longestCommonSubsequence(word1, word2);
  const delete_ops = word1.length - lcs;
  const insert_ops = word2.length - lcs;
  return delete_ops + insert_ops;
}
```

### 变体三：不同操作有不同代价

```typescript
function minCostDistance(
  word1: string,
  word2: string,
  insertCost: number,
  deleteCost: number,
  replaceCost: number
): number {
  const m = word1.length;
  const n = word2.length;
  
  const dp: number[][] = Array.from(
    { length: m + 1 },
    () => new Array(n + 1).fill(0)
  );
  
  for (let i = 0; i <= m; i++) dp[i][0] = i * deleteCost;
  for (let j = 0; j <= n; j++) dp[0][j] = j * insertCost;
  
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (word1[i - 1] === word2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j - 1] + replaceCost,
          dp[i - 1][j] + deleteCost,
          dp[i][j - 1] + insertCost
        );
      }
    }
  }
  
  return dp[m][n];
}
```

### 变体四：一次编辑

📎 [LeetCode 1638. 统计只差一个字符的子串数目](https://leetcode.cn/problems/count-substrings-that-differ-by-one-character/)

## 编辑距离的应用

1. **拼写检查**：找到与输入单词编辑距离最小的词典单词
2. **DNA 序列比对**：计算基因序列的相似度
3. **抄袭检测**：判断两篇文章的相似程度
4. **模糊搜索**：允许一定误差的字符串匹配

## 复杂度分析

| 解法 | 时间复杂度 | 空间复杂度 |
|-----|-----------|-----------|
| 递推 | O(m × n) | O(m × n) |
| 空间优化 | O(m × n) | O(n) |
| 记忆化搜索 | O(m × n) | O(m × n) |

## 与 LCS 的关系

编辑距离和 LCS 有紧密联系：

```
edit_distance(s1, s2) = len(s1) + len(s2) - 2 * LCS(s1, s2)
```

（当只允许插入和删除时成立）

## 本章小结

1. **状态定义**：`dp[i][j]` = 前缀变换的最少操作数
2. **三种操作**：
   - 替换：`dp[i-1][j-1] + 1`
   - 删除：`dp[i-1][j] + 1`
   - 插入：`dp[i][j-1] + 1`
3. **边界条件**：空串需要全部插入或删除
4. **空间优化**：一维数组 + 额外变量

**解题技巧**：
- 理解三种操作在 dp 表中的含义
- 字符相等时无需操作
- 回溯 dp 表可输出具体操作序列
