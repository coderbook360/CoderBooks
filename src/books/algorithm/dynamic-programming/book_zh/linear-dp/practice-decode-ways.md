# 实战：解码方法

解码方法是线性 DP 的经典题目，体现了"分类讨论"的思想。

## 题目描述

一条包含字母 A-Z 的消息通过以下映射进行了编码：

```
'A' -> "1"
'B' -> "2"
...
'Z' -> "26"
```

要解码已编码的消息，所有数字必须基于上述映射的方法，反向映射回字母（可能有多种方法）。

给你一个只含数字的非空字符串 `s`，请计算并返回解码方法的总数。

📎 [LeetCode 91. 解码方法](https://leetcode.cn/problems/decode-ways/)

**示例**：

```
输入：s = "12"
输出：2
解释：它可以解码为 "AB"(1 2) 或者 "L"(12)

输入：s = "226"
输出：3
解释："BZ"(2 26), "VF"(22 6), "BBF"(2 2 6)

输入：s = "06"
输出：0
解释："06" 无法映射到 "F"，因为 "6" 和 "06" 不同
```

**约束**：
- `1 <= s.length <= 100`
- `s` 只包含数字，可能包含前导零

## 思路分析

### 问题本质

这道题本质上是：将数字串划分成若干段，每段是 1-26 之间的数，求划分方案数。

### 与爬楼梯的联系

这题和爬楼梯很像：
- 爬楼梯：每次走 1 步或 2 步
- 解码：每次解码 1 位或 2 位

区别：解码有约束条件（0 不能单独解码，两位数必须 ≤ 26）。

### 状态定义

`dp[i]` = 字符串 `s[0..i-1]`（前 i 个字符）的解码方法数

### 状态转移

对于第 i 个字符，考虑两种情况：
1. **单独解码**：`s[i-1]` 作为一个字母（1-9 有效）
2. **和前一位组合**：`s[i-2..i-1]` 作为一个字母（10-26 有效）

```
dp[i] = 0
if s[i-1] != '0':           // 单独解码有效
    dp[i] += dp[i-1]
if 10 <= s[i-2..i-1] <= 26: // 组合解码有效
    dp[i] += dp[i-2]
```

### 图示理解

```
s = "226"

位置:  #  2  2  6
      dp[0] dp[1] dp[2] dp[3]

dp[0] = 1  // 空串，一种方案（什么都不选）
dp[1] = 1  // "2" → B
dp[2] = 2  // "2|2" → BB, "22" → V
dp[3] = 3  // "2|2|6" → BBF, "22|6" → VF, "2|26" → BZ
```

## 解法一：递推

```typescript
/**
 * 递推
 * 时间复杂度：O(n)
 * 空间复杂度：O(n)
 */
function numDecodings(s: string): number {
  const n = s.length;
  if (s[0] === '0') return 0;  // 前导零
  
  const dp = new Array(n + 1).fill(0);
  dp[0] = 1;  // 空串
  dp[1] = 1;  // 第一个字符（已排除前导零）
  
  for (let i = 2; i <= n; i++) {
    const oneDigit = parseInt(s[i - 1]);    // 当前一位
    const twoDigits = parseInt(s.slice(i - 2, i));  // 当前两位
    
    // 单独解码（1-9 有效）
    if (oneDigit >= 1 && oneDigit <= 9) {
      dp[i] += dp[i - 1];
    }
    
    // 组合解码（10-26 有效）
    if (twoDigits >= 10 && twoDigits <= 26) {
      dp[i] += dp[i - 2];
    }
  }
  
  return dp[n];
}
```

## 解法二：空间优化

```typescript
/**
 * 空间优化
 * 时间复杂度：O(n)
 * 空间复杂度：O(1)
 */
function numDecodings(s: string): number {
  if (s[0] === '0') return 0;
  
  let prev2 = 1;  // dp[i-2]
  let prev1 = 1;  // dp[i-1]
  
  for (let i = 2; i <= s.length; i++) {
    let curr = 0;
    
    const oneDigit = parseInt(s[i - 1]);
    const twoDigits = parseInt(s.slice(i - 2, i));
    
    if (oneDigit >= 1 && oneDigit <= 9) {
      curr += prev1;
    }
    
    if (twoDigits >= 10 && twoDigits <= 26) {
      curr += prev2;
    }
    
    prev2 = prev1;
    prev1 = curr;
  }
  
  return prev1;
}
```

## 解法三：记忆化搜索

```typescript
/**
 * 记忆化搜索
 * 时间复杂度：O(n)
 * 空间复杂度：O(n)
 */
function numDecodings(s: string): number {
  const memo = new Map<number, number>();
  
  function decode(index: number): number {
    // 成功到达末尾
    if (index === s.length) return 1;
    
    // 前导零无法解码
    if (s[index] === '0') return 0;
    
    // 查备忘录
    if (memo.has(index)) return memo.get(index)!;
    
    // 解码一位
    let result = decode(index + 1);
    
    // 解码两位
    if (index + 1 < s.length) {
      const twoDigits = parseInt(s.slice(index, index + 2));
      if (twoDigits <= 26) {
        result += decode(index + 2);
      }
    }
    
    memo.set(index, result);
    return result;
  }
  
  return decode(0);
}
```

## 边界情况处理

### 情况一：前导零

```
s = "0123"
输出：0（'0' 无法解码）
```

### 情况二：中间的零

```
s = "10"   → 1（只能解码为 "J"）
s = "20"   → 1（只能解码为 "T"）
s = "30"   → 0（"30" 无效，"0" 也无效）
s = "100"  → 0（"00" 无效，"10|0" 中 "0" 无效）
s = "101"  → 1（"10|1"）
```

### 情况三：连续零

```
s = "1001"  → 0
s = "1020"  → 1（"10|20"）
```

## 变体问题

### 变体一：解码方法 II（带 *）

📎 [LeetCode 639. 解码方法 II](https://leetcode.cn/problems/decode-ways-ii/)

`*` 可以代表 1-9 中的任意一个数字。

```typescript
const MOD = 1e9 + 7;

function numDecodings(s: string): number {
  const n = s.length;
  const dp = new Array(n + 1).fill(0);
  dp[0] = 1;
  
  // 第一个字符
  if (s[0] === '*') dp[1] = 9;
  else if (s[0] !== '0') dp[1] = 1;
  
  for (let i = 2; i <= n; i++) {
    const c1 = s[i - 1];  // 当前字符
    const c2 = s[i - 2];  // 前一个字符
    
    // 单独解码
    if (c1 === '*') {
      dp[i] = (dp[i - 1] * 9) % MOD;
    } else if (c1 !== '0') {
      dp[i] = dp[i - 1];
    }
    
    // 组合解码
    if (c2 === '*') {
      if (c1 === '*') {
        // ** → 11-19, 21-26 共 15 种
        dp[i] = (dp[i] + dp[i - 2] * 15) % MOD;
      } else if (c1 <= '6') {
        // *0-*6 → 10-16, 20-26 共 2 种
        dp[i] = (dp[i] + dp[i - 2] * 2) % MOD;
      } else {
        // *7-*9 → 17-19 共 1 种
        dp[i] = (dp[i] + dp[i - 2]) % MOD;
      }
    } else if (c2 === '1') {
      if (c1 === '*') {
        // 1* → 11-19 共 9 种
        dp[i] = (dp[i] + dp[i - 2] * 9) % MOD;
      } else {
        // 10-19
        dp[i] = (dp[i] + dp[i - 2]) % MOD;
      }
    } else if (c2 === '2') {
      if (c1 === '*') {
        // 2* → 21-26 共 6 种
        dp[i] = (dp[i] + dp[i - 2] * 6) % MOD;
      } else if (c1 <= '6') {
        // 20-26
        dp[i] = (dp[i] + dp[i - 2]) % MOD;
      }
    }
  }
  
  return dp[n];
}
```

### 变体二：恢复原始字符串

```typescript
function decodeString(s: string): string[] {
  const result: string[] = [];
  
  function backtrack(index: number, path: string) {
    if (index === s.length) {
      result.push(path);
      return;
    }
    
    if (s[index] === '0') return;
    
    // 解码一位
    const oneDigit = parseInt(s[index]);
    backtrack(index + 1, path + String.fromCharCode(64 + oneDigit));
    
    // 解码两位
    if (index + 1 < s.length) {
      const twoDigits = parseInt(s.slice(index, index + 2));
      if (twoDigits <= 26) {
        backtrack(index + 2, path + String.fromCharCode(64 + twoDigits));
      }
    }
  }
  
  backtrack(0, '');
  return result;
}
```

## 复杂度分析

| 解法 | 时间复杂度 | 空间复杂度 |
|-----|-----------|-----------|
| 递推 | O(n) | O(n) |
| 空间优化 | O(n) | O(1) |
| 记忆化搜索 | O(n) | O(n) |

## 易错点

1. **前导零**：`s[0] === '0'` 直接返回 0
2. **中间零的处理**：`"0"` 不能单独解码，但 `"10"` 和 `"20"` 可以
3. **两位数范围**：只有 `10-26` 有效，`01-09` 无效

## 本章小结

1. **与爬楼梯的联系**：每次走 1 步或 2 步，但有约束
2. **核心逻辑**：分类讨论单独解码和组合解码
3. **零的处理**：是这道题的难点和易错点
4. **空间优化**：只依赖前两个状态

**解题技巧**：
- 明确"有效解码"的条件
- 分类讨论每种情况
- 小心处理边界条件（零）
