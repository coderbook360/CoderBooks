# 数位 DP 总结

## 核心概念回顾

数位 DP 是解决"区间内满足条件的数的计数"问题的利器。

### 适用场景

- 统计 [1, n] 或 [l, r] 中满足条件的数
- 条件与数的各位数字相关
- n 很大（如 10^18），无法暴力枚举

### 核心思想

1. **按位处理**：从高位到低位逐位考虑
2. **状态转移**：根据当前位更新状态
3. **限制传递**：通过 tight 标记传递上界约束
4. **记忆化**：避免重复计算

## 标准模板

```typescript
function solve(n: number): number {
  const digits = String(n).split('').map(Number);
  const len = digits.length;
  
  const memo: Map<string, number> = new Map();
  
  function dfs(
    pos: number,      // 当前位置
    state: any,       // 问题相关状态
    tight: boolean,   // 是否受限
    lead: boolean     // 是否有前导零
  ): number {
    // 终止条件
    if (pos === len) {
      return isValid(state) ? 1 : 0;
    }
    
    // 记忆化
    const key = `${pos},${state}`;
    if (!tight && !lead && memo.has(key)) {
      return memo.get(key)!;
    }
    
    const limit = tight ? digits[pos] : 9;
    let result = 0;
    
    for (let d = 0; d <= limit; d++) {
      const newTight = tight && (d === limit);
      const newLead = lead && (d === 0);
      const newState = transition(state, d, newLead);
      
      result += dfs(pos + 1, newState, newTight, newLead);
    }
    
    if (!tight && !lead) {
      memo.set(key, result);
    }
    
    return result;
  }
  
  return dfs(0, initialState, true, true);
}
```

## 关键技巧

### 1. tight 标记

控制当前位的取值范围：

```typescript
const limit = tight ? digits[pos] : 9;
const newTight = tight && (d === limit);
```

- tight = true：当前位最多填 digits[pos]
- tight = false：当前位可填 0-9

### 2. 前导零处理

```typescript
const newLead = lead && (d === 0);
const newState = lead ? initialState : updateState(state, d);
```

前导零不影响实际状态，如 007 的数位和是 7，不是 0+0+7。

### 3. 记忆化条件

只在 `!tight && !lead` 时记忆化：

```typescript
if (!tight && !lead && memo.has(key)) {
  return memo.get(key);
}
```

tight 和 lead 会影响后续计算结果，不能混用。

### 4. 区间查询

```typescript
function countInRange(l: number, r: number): number {
  return solve(r) - solve(l - 1);
}
```

## 状态设计模式

### 模式 1：累加型

统计某个量的总和（如数字 1 的个数）：

```typescript
// 状态：已累计的 count
function dfs(pos, count, tight, lead) {
  if (pos === len) return count;
  // ...
  const newCount = count + (d === target ? 1 : 0);
  result += dfs(pos + 1, newCount, ...);
}
```

### 模式 2：集合型

需要记录已使用元素（如各位不重复）：

```typescript
// 状态：已使用数字的位掩码
function dfs(pos, mask, tight, lead) {
  if ((mask >> d) & 1) continue;  // 已使用
  const newMask = mask | (1 << d);
  // ...
}
```

### 模式 3：余数型

需要满足整除条件：

```typescript
// 状态：当前余数
function dfs(pos, mod, tight, lead) {
  if (pos === len) return mod === 0 ? 1 : 0;
  const newMod = (mod * 10 + d) % k;
  // ...
}
```

### 模式 4：相邻约束型

约束相邻数位的关系：

```typescript
// 状态：上一位数字
function dfs(pos, last, tight, lead) {
  if (last === 6 && d === 2) continue;  // 不能有 62
  // ...
}
```

## 本章题目回顾

| 题目 | 核心状态 | 关键点 |
|------|---------|-------|
| 数字 1 的个数 | 累计 count | 累加型，数学方法更优 |
| 最大为 N 的数字组合 | 是否开始 | 限定数字集合 |
| 统计特殊整数 | 已用数字掩码 | 排列计数优化 |
| 不含重复数字 | 无特殊状态 | 数学公式直接算 |
| 旋转数字 | 是否有变化位 | 分类：有效/无效/变化 |

## 复杂度分析

典型复杂度：

- **时间**：O(位数 × 状态空间 × 转移代价)
- **空间**：O(位数 × 状态空间)

常见状态空间：
- 数位和：O(位数 × 9)
- 数字集合：O(位数 × 2^10)
- 余数：O(位数 × 模数)
- 相邻约束：O(位数 × 10)

## 常见陷阱

### 1. 忘记处理前导零

```typescript
// 错误：前导零也计入状态
const newState = state + d;

// 正确：前导零不影响状态
const newState = (lead && d === 0) ? state : state + d;
```

### 2. 记忆化条件错误

```typescript
// 错误：tight = true 时也记忆化
if (memo.has(key)) return memo.get(key);

// 正确：只在非 tight 时记忆化
if (!tight && memo.has(key)) return memo.get(key);
```

### 3. 边界处理遗漏

```typescript
// 记得处理 n = 0 的情况
if (n <= 0) return 0;

// 区间查询时 l = 1 的处理
if (l === 1) return solve(r);
return solve(r) - solve(l - 1);
```

### 4. 大数溢出

```typescript
// JavaScript 大数问题
const MOD = 1e9 + 7;
result = (result + subResult) % MOD;
```

## 优化技巧

### 1. 预计算

```typescript
// 预计算阶乘、组合数
const fact = [1];
for (let i = 1; i <= 10; i++) {
  fact.push(fact[i - 1] * i);
}
```

### 2. 数学替代

某些问题有直接的数学公式，比 DP 更高效：

```typescript
// 数字 1 的个数可以用 O(log n) 数学方法
// 不含重复数字可以用排列公式
```

### 3. 状态压缩

用位运算压缩状态：

```typescript
// 10 个数字用 10 位二进制
const mask = 0;
mask |= (1 << d);  // 标记使用
(mask >> d) & 1;    // 检查使用
```

## 延伸话题

### 多维数位 DP

同时处理两个数的约束：

```typescript
// 统计 [l, r] 中满足条件的数对
function dfs(pos, tightL, tightR, state) {
  const lo = tightL ? L[pos] : 0;
  const hi = tightR ? R[pos] : 9;
  // ...
}
```

### 非十进制

二进制、十六进制等：

```typescript
const limit = tight ? bits[pos] : 1;  // 二进制
for (let d = 0; d <= limit; d++) {
  // ...
}
```

## 总结

数位 DP 的核心要素：

1. **模板化**：掌握标准模板，变化在于状态设计
2. **状态设计**：根据问题确定需要记录什么
3. **边界处理**：tight、前导零、特殊值
4. **优化意识**：数学方法可能更优

数位 DP 是一个固定套路很强的技术，一旦掌握模板，大部分题目都能迎刃而解。关键在于识别问题类型，设计合适的状态。
