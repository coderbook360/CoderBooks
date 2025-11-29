# 实战：解码方法

隐藏的状态转移。

## 问题描述

一条包含字母`A-Z`的消息通过以下映射进行了编码：
- 'A' -> "1"
- 'B' -> "2"
- ...
- 'Z' -> "26"

给定一个只包含数字的非空字符串`s`，计算解码方法的总数。

示例：
- "12" → 2（"AB" 或 "L"）
- "226" → 3（"BZ", "VF", "BBF"）
- "06" → 0（无法解码）

## 思路分析

对于位置i，有两种解码方式：
1. 单独解码`s[i]`（如果`s[i] != '0'`）
2. 和前一位组合解码`s[i-1..i]`（如果组合在10-26之间）

## 解法

```javascript
function numDecodings(s) {
    const n = s.length;
    if (s[0] === '0') return 0;
    
    // dp[i] = s[0..i-1]的解码方法数
    const dp = new Array(n + 1).fill(0);
    dp[0] = 1;  // 空串
    dp[1] = 1;  // 第一个字符
    
    for (let i = 2; i <= n; i++) {
        const one = parseInt(s[i - 1]);       // 单独解码
        const two = parseInt(s.slice(i - 2, i)); // 组合解码
        
        if (one >= 1 && one <= 9) {
            dp[i] += dp[i - 1];
        }
        if (two >= 10 && two <= 26) {
            dp[i] += dp[i - 2];
        }
    }
    
    return dp[n];
}
```

## 空间优化

```javascript
function numDecodings(s) {
    const n = s.length;
    if (s[0] === '0') return 0;
    
    let prev2 = 1;  // dp[i-2]
    let prev1 = 1;  // dp[i-1]
    
    for (let i = 2; i <= n; i++) {
        let curr = 0;
        const one = parseInt(s[i - 1]);
        const two = parseInt(s.slice(i - 2, i));
        
        if (one >= 1) curr += prev1;
        if (two >= 10 && two <= 26) curr += prev2;
        
        prev2 = prev1;
        prev1 = curr;
    }
    
    return prev1;
}
```

## 边界情况

- `"0"` → 0（0无法单独解码）
- `"10"` → 1（只能解码为"J"）
- `"30"` → 0（30超出范围，0无法单独解码）
- `"101"` → 1（10→J, 1→A）

## 状态转移的细节

```javascript
// 单独解码：s[i-1]必须是1-9
if (one >= 1 && one <= 9) {
    dp[i] += dp[i - 1];
}

// 组合解码：s[i-2..i-1]必须是10-26
if (two >= 10 && two <= 26) {
    dp[i] += dp[i - 2];
}
```

注意：
- 单独解码不能是0
- 组合解码必须≥10（否则有前导0）

## 复杂度分析

- **时间复杂度**：O(n)
- **空间复杂度**：O(1)

## 与爬楼梯的对比

这道题本质上类似爬楼梯：
- 爬楼梯：每次爬1或2步
- 解码：每次解码1或2位

区别是解码有约束条件（有效数字范围）。

## 小结

解码方法展示了：
- 有条件的状态转移
- 需要仔细处理边界情况（前导0、无效组合）

DP的状态转移不总是简单的加法，需要考虑各种约束。
