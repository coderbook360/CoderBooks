# 实战：字符串的排列

> LeetCode 567. 字符串的排列 | 难度：中等

固定窗口 + 字符频率匹配的经典题。

---

## 题目描述

给你两个字符串 `s1` 和 `s2`，写一个函数来判断 `s2` 是否包含 `s1` 的排列。

换句话说，`s2` 的某个子串是否是 `s1` 的排列（异位词）。

**示例**：
```
输入：s1 = "ab", s2 = "eidbaooo"
输出：true
解释：s2 包含 s1 的排列之一 "ba"
```

---

## 思路分析

排列的特点：**字符种类和数量完全相同**，只是顺序不同。

关键洞察：**s1 的排列长度固定为 s1.length**。

所以这是一个**固定窗口**问题：在 s2 上滑动一个大小为 `s1.length` 的窗口，检查窗口内的字符频率是否与 s1 相同。

---

## 代码实现

```typescript
function checkInclusion(s1: string, s2: string): boolean {
  if (s1.length > s2.length) return false;
  
  const need = new Map<string, number>();
  const window = new Map<string, number>();
  
  // 统计 s1 的字符频率
  for (const c of s1) {
    need.set(c, (need.get(c) || 0) + 1);
  }
  
  let left = 0;
  let valid = 0;
  
  for (let right = 0; right < s2.length; right++) {
    const c = s2[right];
    
    // 扩展窗口
    if (need.has(c)) {
      window.set(c, (window.get(c) || 0) + 1);
      if (window.get(c) === need.get(c)) {
        valid++;
      }
    }
    
    // 窗口大小达到 s1.length 时
    if (right - left + 1 === s1.length) {
      // 检查是否满足条件
      if (valid === need.size) {
        return true;
      }
      
      // 收缩左边界，保持窗口大小
      const d = s2[left];
      if (need.has(d)) {
        if (window.get(d) === need.get(d)) {
          valid--;
        }
        window.set(d, window.get(d)! - 1);
      }
      left++;
    }
  }
  
  return false;
}
```

---

## 优化：数组代替 Map

由于只涉及小写字母，可以用数组提升性能：

```typescript
function checkInclusion(s1: string, s2: string): boolean {
  if (s1.length > s2.length) return false;
  
  const count = new Array(26).fill(0);
  const k = s1.length;
  
  // 初始化：s1 的字符 +1，s2 前 k 个字符 -1
  for (let i = 0; i < k; i++) {
    count[s1.charCodeAt(i) - 97]++;
    count[s2.charCodeAt(i) - 97]--;
  }
  
  if (count.every(c => c === 0)) return true;
  
  // 滑动窗口
  for (let i = k; i < s2.length; i++) {
    count[s2.charCodeAt(i) - 97]--;       // 右边进
    count[s2.charCodeAt(i - k) - 97]++;   // 左边出
    
    if (count.every(c => c === 0)) return true;
  }
  
  return false;
}
```

---

## 执行过程可视化

```
s1 = "ab", s2 = "eidbaooo"

初始化 need: {a: 1, b: 1}

滑动窗口（大小 = 2）：

窗口 [e,i]: window = {e:1, i:1}
  e 不在 need 中，i 不在 need 中
  valid = 0，不匹配

窗口 [i,d]: valid = 0，不匹配

窗口 [d,b]: 
  b 在 need 中，window = {b:1}
  valid = 1，不匹配

窗口 [b,a]:
  a 在 need 中，window = {b:1, a:1}
  valid = 2 = need.size ✓
  返回 true

找到 s1 的排列 "ba" 在 s2 中
```

---

## 复杂度分析

- **时间复杂度**：O(n)
  - n 是 s2 的长度
  - 每个字符进出窗口各一次
  
- **空间复杂度**：O(1)
  - 固定 26 个字母

---

## 常见错误

### 错误1：valid 更新逻辑错误

```typescript
// ❌ 错误：无论是否相等都更新 valid
if (need.has(c)) {
  window.set(c, (window.get(c) || 0) + 1);
  valid++;  // 错！只有刚好相等时才++
}

// ✓ 正确：只有当数量刚好匹配时才 valid++
if (window.get(c) === need.get(c)) {
  valid++;
}
```

### 错误2：收缩时 valid 更新顺序

```typescript
// ❌ 错误：先减少计数再判断
window.set(d, window.get(d)! - 1);
if (window.get(d) === need.get(d)) {  // 这时已经不相等了
  valid--;
}

// ✓ 正确：先判断再减少
if (window.get(d) === need.get(d)) {
  valid--;
}
window.set(d, window.get(d)! - 1);
```

### 错误3：窗口大小判断

```typescript
// ❌ 错误：用 >= 而不是 ===
if (right - left + 1 >= s1.length) {
  // 这样窗口会越来越大
}

// ✓ 正确：固定窗口大小
if (right - left + 1 === s1.length) {
  // 检查 + 收缩
}
```

---

## 与最小覆盖子串的区别

| 题目 | 窗口类型 | 条件 | 收缩时机 |
|-----|---------|-----|---------|
| 最小覆盖子串 | 可变 | 包含即可 | 满足条件时收缩 |
| 字符串的排列 | 固定 | 精确匹配 | 达到大小时收缩 |

**最小覆盖子串**：s2 包含 s1 所有字符即可，可以有多余字符

**字符串的排列**：必须精确匹配，不能有多余字符，所以窗口大小必须等于 s1.length

---

## 相关题目

- **438. 找到字符串中所有字母异位词**：找所有匹配位置
- **76. 最小覆盖子串**：可变窗口版本
- **242. 有效的字母异位词**：判断两字符串是否互为异位词

---

## 总结

固定窗口滑动的关键点：

1. **窗口大小固定**：等于目标串长度
2. **滑动方式**：右边进一个，左边出一个
3. **匹配条件**：所有字符的频率都匹配（valid === need.size）
4. **效率优化**：用数组代替 Map，用 valid 变量避免全量比较
