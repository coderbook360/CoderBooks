# 数位 DP 概述

数位 DP 用于解决与数字的每一位相关的计数问题。

## 什么是数位 DP

数位 DP 是一种处理"计算某个范围内满足特定条件的数的个数"的技术。

典型问题形式：
- 计算 `[1, n]` 中满足条件的数的个数
- 计算 `[l, r]` 中满足条件的数的个数

## 为什么需要数位 DP

考虑问题：计算 `[1, 10^18]` 中不含数字 4 的数有多少个。

暴力枚举？10^18 个数，不可能。

数位 DP 的思路：
- 把数字看作数位的序列
- 按位考虑，利用 DP 统计

## 核心思想

### 数位分解

将数字 `n` 分解为各个数位：

```
n = 12345
数位：[1, 2, 3, 4, 5]
```

### 前缀统计

计算 `[0, n]` 中满足条件的数：

```
f(r) - f(l-1) = [l, r] 中满足条件的数
```

### 限制与自由

关键是处理"上界限制"：

- 如果当前位还没达到上界，后续位可以任意取值
- 如果当前位恰好等于上界，后续位有限制

## 状态设计

典型状态：

```
dp(pos, tight, 其他状态)
- pos: 当前处理到第几位
- tight: 是否受上界限制
- 其他状态: 问题相关的状态（如数位和、是否含某数字等）
```

### tight 标记

- `tight = true`：当前前缀等于上界前缀，后续位有限制
- `tight = false`：当前前缀小于上界前缀，后续位可任意

## 记忆化搜索模板

```typescript
function countNumbers(n: number): number {
  if (n < 0) return 0;
  
  const digits = String(n).split('').map(Number);
  const len = digits.length;
  
  // memo[pos][state] = 从 pos 开始，状态为 state 时的计数
  // 只在 tight = false 时记忆化
  const memo: Map<string, number> = new Map();
  
  function dfs(
    pos: number,
    tight: boolean,
    state: any,  // 问题相关状态
    leadingZero: boolean  // 是否有前导零
  ): number {
    // 终止条件
    if (pos === len) {
      return isValid(state) ? 1 : 0;
    }
    
    // 记忆化查找（只在非 tight 时）
    if (!tight && !leadingZero) {
      const key = `${pos},${state}`;
      if (memo.has(key)) return memo.get(key)!;
    }
    
    // 当前位的上界
    const limit = tight ? digits[pos] : 9;
    
    let count = 0;
    for (let d = 0; d <= limit; d++) {
      // 更新状态
      const newTight = tight && (d === limit);
      const newLeadingZero = leadingZero && (d === 0);
      const newState = updateState(state, d, newLeadingZero);
      
      count += dfs(pos + 1, newTight, newState, newLeadingZero);
    }
    
    // 记忆化存储
    if (!tight && !leadingZero) {
      memo.set(`${pos},${state}`, count);
    }
    
    return count;
  }
  
  return dfs(0, true, initialState, true);
}
```

## 前导零处理

前导零是数位 DP 的常见陷阱。

例如计算"数位和"时：
- 数字 `007` 应该看作 `7`，数位和为 7
- 不能把前导零也算进去

通过 `leadingZero` 标记处理：
- `leadingZero = true`：当前仍在前导零阶段
- 一旦填入非零数字，`leadingZero = false`

## 经典问题类型

### 1. 不含某数字

如：不含 4 和 62 的数。

### 2. 数位和

如：数位和等于 k 的数。

### 3. 回文数

如：回文数的个数。

### 4. 数位乘积

如：数位乘积整除某数的数。

### 5. 数位比较

如：相邻数位差不超过 1 的数。

## 复杂度分析

- **状态数**：O(位数 × 状态空间)
- **转移**：O(10)（0-9 十个数字）
- **总复杂度**：通常 O(位数 × 状态 × 10)

对于 10^18 级别的数，位数约 19，很高效。

## 本章内容

本章将介绍：

1. **基础问题**：数位和、不含某数字
2. **范围统计**：区间内满足条件的数
3. **高级问题**：回文数、复杂约束

## 总结

数位 DP 的核心：

1. **按位处理**：从高位到低位
2. **tight 限制**：区分是否受上界约束
3. **记忆化**：只在非 tight 时有效
4. **前导零**：特殊处理

掌握模板，大部分数位 DP 问题都能迎刃而解。
