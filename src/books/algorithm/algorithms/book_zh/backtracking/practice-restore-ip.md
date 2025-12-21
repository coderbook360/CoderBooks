# 实战：复原 IP 地址

> LeetCode 93. 复原 IP 地址 | 难度：中等

分割问题的变体：将字符串分割成4段有效的IP地址。

---

## 问题描述

给定一个只包含数字的字符串`s`，返回所有可能的有效IP地址。有效的IP地址恰好由四个整数（每个整数位于0到255之间组成，且不能含有前导0）组成，整数之间用'.'分隔。

**示例**：
```
输入：s = "25525511135"
输出：["255.255.11.135", "255.255.111.35"]

输入：s = "0000"
输出：["0.0.0.0"]

输入：s = "101023"
输出：["1.0.10.23","1.0.102.3","10.1.0.23","10.10.2.3","101.0.2.3"]
```

---

## 思路分析

### 问题建模

- **状态**：当前分割位置start，已分割的段数
- **选择**：从start开始，选择1-3位数字作为一段
- **约束**：
  - 恰好分割成4段
  - 每段是0-255的整数
  - 不能有前导0（除非是单独的"0"）
- **目标**：分割完整个字符串且恰好4段

### 决策树模型

以`s = "25525511135"`为例：

```
start=0, segments=[]
├─ 选"2"
│  └─ start=1, segments=["2"]
│     ├─ 选"5"...
│     └─ 选"55"...
├─ 选"25"
│  └─ start=2, segments=["25"]
│     └─ ...
└─ 选"255"
   └─ start=3, segments=["255"]
      ├─ 选"2"
      │  └─ start=4, segments=["255","2"]
      │     └─ ...
      └─ 选"25"
         └─ start=5, segments=["255","25"]
            └─ ...
      └─ 选"255"
         └─ start=6, segments=["255","255"]
            └─ ...继续分割
```

---

## 解法一：基础回溯

```typescript
function restoreIpAddresses(s: string): string[] {
  const result: string[] = [];
  
  function backtrack(start: number, path: string[]) {
    // 终止条件：已有4段
    if (path.length === 4) {
      // 必须用完所有字符
      if (start === s.length) {
        result.push(path.join('.'));
      }
      return;
    }
    
    // 剪枝：剩余字符太少或太多
    const remaining = s.length - start;
    const segmentsNeeded = 4 - path.length;
    if (remaining < segmentsNeeded || remaining > segmentsNeeded * 3) {
      return;
    }
    
    // 尝试1-3位数字
    for (let len = 1; len <= 3 && start + len <= s.length; len++) {
      const segment = s.slice(start, start + len);
      
      if (!isValid(segment)) continue;
      
      path.push(segment);
      backtrack(start + len, path);
      path.pop();
    }
  }
  
  function isValid(segment: string): boolean {
    // 前导0检查（"0"本身是有效的）
    if (segment.length > 1 && segment[0] === '0') return false;
    
    // 范围检查
    const num = parseInt(segment);
    return num >= 0 && num <= 255;
  }
  
  backtrack(0, []);
  return result;
}
```

---

## 解法二：三重循环枚举分割点

IP地址固定4段，可以直接枚举3个分割点：

```typescript
function restoreIpAddresses(s: string): string[] {
  const result: string[] = [];
  const n = s.length;
  
  // 第一段：s[0..i]
  for (let i = 0; i < Math.min(3, n - 3); i++) {
    const seg1 = s.slice(0, i + 1);
    if (!isValid(seg1)) continue;
    
    // 第二段：s[i+1..j]
    for (let j = i + 1; j < Math.min(i + 4, n - 2); j++) {
      const seg2 = s.slice(i + 1, j + 1);
      if (!isValid(seg2)) continue;
      
      // 第三段：s[j+1..k]
      for (let k = j + 1; k < Math.min(j + 4, n - 1); k++) {
        const seg3 = s.slice(j + 1, k + 1);
        const seg4 = s.slice(k + 1);  // 第四段
        
        if (!isValid(seg3) || !isValid(seg4)) continue;
        
        result.push(`${seg1}.${seg2}.${seg3}.${seg4}`);
      }
    }
  }
  
  return result;
}

function isValid(segment: string): boolean {
  if (segment.length === 0 || segment.length > 3) return false;
  if (segment.length > 1 && segment[0] === '0') return false;
  return parseInt(segment) <= 255;
}
```

---

## 解法三：递归+索引传递

使用索引而非切片，减少字符串操作：

```typescript
function restoreIpAddresses(s: string): string[] {
  const result: string[] = [];
  const segments: number[] = [];  // 存储每段的结束索引
  
  function backtrack(start: number) {
    if (segments.length === 4) {
      if (start === s.length) {
        result.push(buildIP(s, segments));
      }
      return;
    }
    
    const remaining = s.length - start;
    const need = 4 - segments.length;
    if (remaining < need || remaining > need * 3) return;
    
    for (let len = 1; len <= 3 && start + len <= s.length; len++) {
      if (isValidSegment(s, start, start + len - 1)) {
        segments.push(start + len - 1);
        backtrack(start + len);
        segments.pop();
      }
    }
  }
  
  function isValidSegment(s: string, start: number, end: number): boolean {
    const len = end - start + 1;
    if (len > 1 && s[start] === '0') return false;
    
    let num = 0;
    for (let i = start; i <= end; i++) {
      num = num * 10 + (s.charCodeAt(i) - 48);
    }
    return num <= 255;
  }
  
  function buildIP(s: string, segs: number[]): string {
    return [
      s.slice(0, segs[0] + 1),
      s.slice(segs[0] + 1, segs[1] + 1),
      s.slice(segs[1] + 1, segs[2] + 1),
      s.slice(segs[2] + 1)
    ].join('.');
  }
  
  backtrack(0);
  return result;
}
```

---

## 复杂度分析

**时间复杂度**：O(1)
- 虽然看起来是指数级，但IP地址的约束极强
- 最多只有3^4 = 81种可能的分割方式
- 实际有效的更少（每段最多3位，总共最多12个字符）

**空间复杂度**：O(1)
- 递归深度固定为4
- 结果空间不计入

---

## 有效性检查详解

### 前导0规则

```
"0" → 有效（单独的0）
"01" → 无效（前导0）
"00" → 无效（前导0）
"001" → 无效（前导0）
```

### 范围规则

```
"0" ~ "255" → 有效
"256" → 无效（超出范围）
"1234" → 无效（超过3位）
```

---

## 执行过程可视化

以`s = "0000"`为例：

```
backtrack(0, [])
└─ 选"0"
   └─ backtrack(1, ["0"])
      └─ 选"0"
         └─ backtrack(2, ["0","0"])
            └─ 选"0"
               └─ backtrack(3, ["0","0","0"])
                  └─ 选"0"
                     └─ backtrack(4, ["0","0","0","0"])
                        → 收集 "0.0.0.0" ✓

结果：["0.0.0.0"]
```

---

## 常见错误

**错误1：忘记检查前导0**
```typescript
// 错误：只检查范围
const num = parseInt(segment);
return num <= 255;  // ❌ "01"会被判为有效

// 正确
if (segment.length > 1 && segment[0] === '0') return false;
return parseInt(segment) <= 255;  // ✅
```

**错误2：忘记检查用完所有字符**
```typescript
// 错误：只检查段数
if (path.length === 4) {
  result.push(path.join('.'));  // ❌ 可能还有剩余字符
}

// 正确
if (path.length === 4 && start === s.length) {
  result.push(path.join('.'));  // ✅
}
```

**错误3：边界条件遗漏**
```typescript
// 错误：没有剪枝导致无效搜索
// 如果剩余字符不足以组成剩余段数，应该提前返回

// 正确：添加剪枝
const remaining = s.length - start;
const need = 4 - path.length;
if (remaining < need || remaining > need * 3) return;
```

---

## 相关题目

| 题目 | 难度 | 说明 |
|-----|------|------|
| [131. 分割回文串](https://leetcode.com/problems/palindrome-partitioning/) | 中等 | 类似的分割问题 |
| [468. 验证IP地址](https://leetcode.com/problems/validate-ip-address/) | 中等 | 验证而非生成 |
| [751. IP到CIDR](https://leetcode.com/problems/ip-to-cidr/) | 中等 | IP地址运算 |

---

## IP地址 vs 分割回文串

| 对比项 | IP地址 | 分割回文串 |
|-------|--------|-----------|
| 段数 | 固定4段 | 不固定 |
| 每段长度 | 1-3 | 1-n |
| 验证条件 | 0-255，无前导0 | 是否回文 |
| 复杂度 | O(1) | O(n×2^n) |

---

## 总结

复原IP地址的核心要点：

1. **固定段数**：必须恰好4段
2. **每段约束**：
   - 1-3位数字
   - 0-255范围
   - 无前导0（除非是"0"）
3. **剪枝优化**：
   - 剩余字符数与剩余段数的匹配
   - 及时终止无效分支
4. **两种思路**：
   - 回溯：通用的分割模板
   - 三重循环：利用固定段数特点

本题展示了如何将"分割问题"模板应用于有特定约束的场景。
```
