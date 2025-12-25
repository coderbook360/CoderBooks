# 编辑距离

## 题目描述

**LeetCode 72. Edit Distance**

给你两个单词 word1 和 word2，请返回将 word1 转换成 word2 所使用的最少操作数。

你可以对一个单词进行如下三种操作：
- 插入一个字符
- 删除一个字符
- 替换一个字符

**示例 1**：
```
输入：word1 = "horse", word2 = "ros"
输出：3
解释：
horse → rorse (替换 'h' 为 'r')
rorse → rose (删除 'r')
rose → ros (删除 'e')
```

**示例 2**：
```
输入：word1 = "intention", word2 = "execution"
输出：5
解释：
intention → inention (删除 't')
inention → enention (替换 'i' 为 'e')
enention → exention (替换 'n' 为 'x')
exention → exection (替换 'n' 为 'c')
exection → execution (插入 'u')
```

**约束**：
- `0 <= word1.length, word2.length <= 500`
- word1 和 word2 由小写英文字母组成

## 思路分析

编辑距离（Levenshtein Distance）是经典的字符串 DP 问题。

### 状态定义

`dp[i][j]` = word1 的前 i 个字符转换成 word2 的前 j 个字符的最小操作数

### 状态转移

考虑 word1[i-1] 和 word2[j-1]：

1. **相等**：不需要操作
   ```
   dp[i][j] = dp[i-1][j-1]
   ```

2. **不相等**：三种操作选最优
   - **替换**：dp[i-1][j-1] + 1
   - **删除 word1[i-1]**：dp[i-1][j] + 1
   - **插入 word2[j-1]**：dp[i][j-1] + 1

### 边界条件

- `dp[0][j] = j`（word1 为空，需要插入 j 个字符）
- `dp[i][0] = i`（word2 为空，需要删除 i 个字符）

## 解法一：标准 DP

```typescript
function minDistance(word1: string, word2: string): number {
  const m = word1.length;
  const n = word2.length;
  
  // dp[i][j] = word1[0..i) 到 word2[0..j) 的编辑距离
  const dp = Array.from(
    { length: m + 1 },
    () => Array(n + 1).fill(0)
  );
  
  // 初始化
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  
  // 填表
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (word1[i - 1] === word2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(
          dp[i - 1][j - 1],  // 替换
          dp[i - 1][j],      // 删除
          dp[i][j - 1]       // 插入
        );
      }
    }
  }
  
  return dp[m][n];
}
```

**复杂度分析**：
- 时间：O(mn)
- 空间：O(mn)

## 解法二：空间优化

只依赖上一行和当前行，可以优化到 O(n)。

```typescript
function minDistance(word1: string, word2: string): number {
  const m = word1.length;
  const n = word2.length;
  
  // 一维数组
  const dp = Array.from({ length: n + 1 }, (_, j) => j);
  
  for (let i = 1; i <= m; i++) {
    let prev = dp[0];  // dp[i-1][j-1]
    dp[0] = i;         // dp[i][0] = i
    
    for (let j = 1; j <= n; j++) {
      const temp = dp[j];  // 保存 dp[i-1][j]
      
      if (word1[i - 1] === word2[j - 1]) {
        dp[j] = prev;
      } else {
        dp[j] = 1 + Math.min(
          prev,       // dp[i-1][j-1]，替换
          dp[j],      // dp[i-1][j]，删除
          dp[j - 1]   // dp[i][j-1]，插入
        );
      }
      
      prev = temp;
    }
  }
  
  return dp[n];
}
```

**复杂度分析**：
- 时间：O(mn)
- 空间：O(n)

## 图解

以 word1 = "horse", word2 = "ros" 为例：

```
    ""  r   o   s
""   0   1   2   3
h    1   1   2   3
o    2   2   1   2
r    3   2   2   2
s    4   3   3   2
e    5   4   4   3

读取路径（反向）：
dp[5][3] = 3 ← dp[4][3] = 2 ← dp[3][2] = 2 ← dp[2][1] = 2 ← dp[1][0] = 1 ← dp[0][0] = 0

操作序列：
h → r（替换）
o = o（匹配）
r → 删除
s = s（匹配）
e → 删除
```

## 操作路径回溯

如果需要输出具体操作：

```typescript
function minDistanceWithPath(word1: string, word2: string): [number, string[]] {
  const m = word1.length;
  const n = word2.length;
  
  const dp = Array.from(
    { length: m + 1 },
    () => Array(n + 1).fill(0)
  );
  
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (word1[i - 1] === word2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(
          dp[i - 1][j - 1],
          dp[i - 1][j],
          dp[i][j - 1]
        );
      }
    }
  }
  
  // 回溯路径
  const operations: string[] = [];
  let i = m, j = n;
  
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && word1[i - 1] === word2[j - 1]) {
      // 匹配
      i--; j--;
    } else if (i > 0 && j > 0 && dp[i][j] === dp[i - 1][j - 1] + 1) {
      // 替换
      operations.push(`Replace '${word1[i - 1]}' with '${word2[j - 1]}'`);
      i--; j--;
    } else if (i > 0 && dp[i][j] === dp[i - 1][j] + 1) {
      // 删除
      operations.push(`Delete '${word1[i - 1]}'`);
      i--;
    } else {
      // 插入
      operations.push(`Insert '${word2[j - 1]}'`);
      j--;
    }
  }
  
  return [dp[m][n], operations.reverse()];
}
```

## 变体问题

### 只允许插入和删除

此时编辑距离 = m + n - 2 × LCS(word1, word2)

### 不同操作代价不同

修改转移方程中的 +1 为对应代价。

### 最长公共子序列

LCS 是编辑距离的特例（只允许删除）：
```
LCS(s1, s2) = (m + n - editDistance(s1, s2)) / 2
```

## 相关题目

| 题目 | 难度 | 说明 |
|------|------|------|
| [583. 两个字符串的删除操作](https://leetcode.cn/problems/delete-operation-for-two-strings/) | 中等 | 只有删除 |
| [712. 两个字符串的最小ASCII删除和](https://leetcode.cn/problems/minimum-ascii-delete-sum-for-two-strings/) | 中等 | 带权重 |
| [1143. 最长公共子序列](https://leetcode.cn/problems/longest-common-subsequence/) | 中等 | 相关问题 |
| [115. 不同的子序列](https://leetcode.cn/problems/distinct-subsequences/) | 困难 | 变体 |

## 应用场景

编辑距离在实际中有广泛应用：

1. **拼写检查**：找最接近的正确单词
2. **DNA 序列比对**：生物信息学
3. **模糊搜索**：允许一定错误的匹配
4. **版本控制**：计算文件差异

## 总结

编辑距离是经典的字符串 DP：

1. **状态定义**：dp[i][j] = 前缀匹配的最小操作数
2. **三种操作**：替换、删除、插入
3. **转移方程**：根据字符是否相等分情况
4. **空间优化**：可以降到 O(n)

核心洞见：
- 考虑最后一个字符的匹配情况
- 三种操作对应三种子问题
- 取最优的操作
