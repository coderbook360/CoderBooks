# 数位 DP 模板

掌握标准模板，解决 90% 的数位 DP 问题。

## 通用模板

```typescript
function solve(n: number): number {
  if (n < 0) return 0;
  
  // 1. 数位分解
  const digits: number[] = [];
  let temp = n;
  while (temp > 0) {
    digits.push(temp % 10);
    temp = Math.floor(temp / 10);
  }
  digits.reverse();  // 高位在前
  
  const len = digits.length;
  
  // 2. 记忆化数组（只在非 tight 时有效）
  const memo: number[][] = Array.from(
    { length: len },
    () => Array(STATE_SIZE).fill(-1)
  );
  
  // 3. 记忆化搜索
  function dfs(
    pos: number,      // 当前位置
    state: number,    // 问题相关状态
    tight: boolean,   // 是否受限
    lead: boolean     // 是否有前导零
  ): number {
    // 终止条件
    if (pos === len) {
      return isValid(state) ? 1 : 0;
    }
    
    // 查询记忆化（非 tight 且无前导零）
    if (!tight && !lead && memo[pos][state] !== -1) {
      return memo[pos][state];
    }
    
    // 确定当前位的取值范围
    const limit = tight ? digits[pos] : 9;
    
    let result = 0;
    for (let d = 0; d <= limit; d++) {
      const newTight = tight && (d === limit);
      const newLead = lead && (d === 0);
      const newState = transition(state, d, newLead);
      
      result += dfs(pos + 1, newState, newTight, newLead);
    }
    
    // 存储记忆化
    if (!tight && !lead) {
      memo[pos][state] = result;
    }
    
    return result;
  }
  
  return dfs(0, INITIAL_STATE, true, true);
}

// 区间查询
function countInRange(l: number, r: number): number {
  return solve(r) - solve(l - 1);
}
```

## 模板解析

### 1. 数位分解

```typescript
const digits: number[] = [];
let temp = n;
while (temp > 0) {
  digits.push(temp % 10);
  temp = Math.floor(temp / 10);
}
digits.reverse();
```

将数字转为数位数组，高位在前。

也可以用字符串：

```typescript
const digits = String(n).split('').map(Number);
```

### 2. 状态定义

根据问题定义状态：

| 问题类型 | 状态 | 示例 |
|---------|------|------|
| 数位和 | 当前累计和 | state = sum |
| 不含某数字 | 是否已出现 | state = hasDigit |
| 相邻约束 | 上一位数字 | state = lastDigit |
| 整除约束 | 当前余数 | state = mod |

### 3. tight 标记

`tight` 表示是否受上界限制：

```typescript
// 上界 n = 235，当前填到第 1 位
// 如果第 0 位填了 2，第 1 位最多填 3
// 如果第 0 位填了 1，第 1 位可以填 0-9

const limit = tight ? digits[pos] : 9;
const newTight = tight && (d === limit);
```

### 4. 前导零处理

`lead` 表示是否还在前导零阶段：

```typescript
// 对于数字 007，实际是 7
// 前两个 0 是前导零，不应该计入状态

const newLead = lead && (d === 0);
const newState = transition(state, d, newLead);

// 在 transition 中：
function transition(state: number, d: number, lead: boolean) {
  if (lead) return INITIAL_STATE;  // 前导零不影响状态
  return updateState(state, d);
}
```

### 5. 记忆化条件

只在 `!tight && !lead` 时记忆化：

```typescript
// tight = true 时，后续填法受限，结果不可复用
// lead = true 时，状态可能不准确

if (!tight && !lead && memo[pos][state] !== -1) {
  return memo[pos][state];
}
```

## 实战应用

### 示例 1：统计 1 的个数

统计 [1, n] 中数字 1 出现的次数。

```typescript
function countDigitOne(n: number): number {
  const digits = String(n).split('').map(Number);
  const len = digits.length;
  
  // memo[pos] = 从 pos 开始，1 出现的次数
  const memo: number[][] = Array.from(
    { length: len },
    () => Array(len + 1).fill(-1)
  );
  
  function dfs(
    pos: number,
    count: number,  // 当前累计的 1 的个数
    tight: boolean,
    lead: boolean
  ): number {
    if (pos === len) return count;
    
    if (!tight && !lead && memo[pos][count] !== -1) {
      return memo[pos][count];
    }
    
    const limit = tight ? digits[pos] : 9;
    let result = 0;
    
    for (let d = 0; d <= limit; d++) {
      const newTight = tight && (d === limit);
      const newLead = lead && (d === 0);
      const newCount = count + ((!newLead && d === 1) ? 1 : 0);
      
      result += dfs(pos + 1, newCount, newTight, newLead);
    }
    
    if (!tight && !lead) memo[pos][count] = result;
    return result;
  }
  
  return dfs(0, 0, true, true);
}
```

### 示例 2：不含 4 和 62 的数

统计 [1, n] 中不含 4 且不含相邻 62 的数。

```typescript
function count(n: number): number {
  const digits = String(n).split('').map(Number);
  const len = digits.length;
  
  // state = 上一位数字（用于检测 62）
  const memo: number[][] = Array.from(
    { length: len },
    () => Array(10).fill(-1)
  );
  
  function dfs(
    pos: number,
    last: number,   // 上一位数字
    tight: boolean,
    lead: boolean
  ): number {
    if (pos === len) return 1;
    
    if (!tight && !lead && memo[pos][last] !== -1) {
      return memo[pos][last];
    }
    
    const limit = tight ? digits[pos] : 9;
    let result = 0;
    
    for (let d = 0; d <= limit; d++) {
      // 跳过含 4 的情况
      if (d === 4) continue;
      // 跳过 62 的情况
      if (last === 6 && d === 2) continue;
      
      const newTight = tight && (d === limit);
      const newLead = lead && (d === 0);
      const newLast = newLead ? 0 : d;
      
      result += dfs(pos + 1, newLast, newTight, newLead);
    }
    
    if (!tight && !lead) memo[pos][last] = result;
    return result;
  }
  
  return dfs(0, 0, true, true);
}
```

### 示例 3：数位和整除 k

统计 [1, n] 中数位和能被 k 整除的数。

```typescript
function countDivisible(n: number, k: number): number {
  const digits = String(n).split('').map(Number);
  const len = digits.length;
  
  // state = 当前数位和 mod k
  const memo: number[][] = Array.from(
    { length: len },
    () => Array(k).fill(-1)
  );
  
  function dfs(
    pos: number,
    mod: number,    // 当前数位和 mod k
    tight: boolean,
    lead: boolean
  ): number {
    if (pos === len) {
      return mod === 0 ? 1 : 0;
    }
    
    if (!tight && !lead && memo[pos][mod] !== -1) {
      return memo[pos][mod];
    }
    
    const limit = tight ? digits[pos] : 9;
    let result = 0;
    
    for (let d = 0; d <= limit; d++) {
      const newTight = tight && (d === limit);
      const newLead = lead && (d === 0);
      const newMod = (mod + d) % k;
      
      result += dfs(pos + 1, newMod, newTight, newLead);
    }
    
    if (!tight && !lead) memo[pos][mod] = result;
    return result;
  }
  
  // 注意：结果需要减 1（排除 0）
  return dfs(0, 0, true, true) - 1;
}
```

## 常见变体

### 1. 区间问题

```typescript
// [l, r] 范围内满足条件的数
function countInRange(l: number, r: number): number {
  return solve(r) - solve(l - 1);
}
```

### 2. 带下界约束

有时需要同时处理上界和下界：

```typescript
function dfs(
  pos: number,
  state: number,
  tightLower: boolean,  // 是否受下界限制
  tightUpper: boolean,  // 是否受上界限制
  lead: boolean
): number {
  const lo = tightLower ? lower[pos] : 0;
  const hi = tightUpper ? upper[pos] : 9;
  
  for (let d = lo; d <= hi; d++) {
    // ...
  }
}
```

### 3. 大数处理

当数字超过 JavaScript 安全整数范围时，用字符串：

```typescript
function solve(s: string): number {
  const digits = s.split('').map(Number);
  // ... 正常处理
}
```

## 调试技巧

### 1. 小范围验证

```typescript
// 用暴力验证小范围
function bruteForce(n: number): number {
  let count = 0;
  for (let i = 1; i <= n; i++) {
    if (isValid(i)) count++;
  }
  return count;
}

// 对比测试
for (let n = 1; n <= 1000; n++) {
  console.assert(solve(n) === bruteForce(n));
}
```

### 2. 打印调试

```typescript
function dfs(pos, state, tight, lead) {
  console.log(`pos=${pos}, state=${state}, tight=${tight}, lead=${lead}`);
  // ...
}
```

## 总结

数位 DP 模板要点：

1. **数位分解**：高位在前
2. **状态设计**：根据问题确定
3. **tight 限制**：控制上界
4. **前导零处理**：特殊状态
5. **记忆化条件**：`!tight && !lead`

模板是骨架，状态转移是灵魂。理解模板后，关键在于根据问题设计合适的状态。
