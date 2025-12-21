# 实战：找到字符串中所有字母异位词

> LeetCode 438. 找到字符串中所有字母异位词 | 难度：中等

这道题是"字符串的排列"的变体，需要找出**所有**匹配的起始位置。

---

## 题目描述

给定两个字符串 `s` 和 `p`，找到 `s` 中所有 `p` 的**异位词**的子串，返回这些子串的起始索引。

**示例**：
```
输入：s = "cbaebabacd", p = "abc"
输出：[0, 6]
解释：
起始索引 0 的子串是 "cba"，是 "abc" 的异位词
起始索引 6 的子串是 "bac"，是 "abc" 的异位词
```

---

## 思路分析

与"字符串的排列"几乎相同：
- 固定窗口大小为 `p.length`
- 检查窗口内字符频率是否与 p 相同
- 不同点：收集所有满足条件的位置

---

## 代码实现

```typescript
function findAnagrams(s: string, p: string): number[] {
  const result: number[] = [];
  if (s.length < p.length) return result;
  
  const need = new Map<string, number>();
  const window = new Map<string, number>();
  
  for (const c of p) {
    need.set(c, (need.get(c) || 0) + 1);
  }
  
  let left = 0;
  let valid = 0;
  
  for (let right = 0; right < s.length; right++) {
    const c = s[right];
    
    if (need.has(c)) {
      window.set(c, (window.get(c) || 0) + 1);
      if (window.get(c) === need.get(c)) {
        valid++;
      }
    }
    
    // 窗口大小达到 p.length
    if (right - left + 1 === p.length) {
      if (valid === need.size) {
        result.push(left);  // 记录起始位置
      }
      
      const d = s[left];
      if (need.has(d)) {
        if (window.get(d) === need.get(d)) {
          valid--;
        }
        window.set(d, window.get(d)! - 1);
      }
      left++;
    }
  }
  
  return result;
}
```

---

## 数组优化版本

```typescript
function findAnagrams(s: string, p: string): number[] {
  const result: number[] = [];
  if (s.length < p.length) return result;
  
  const count = new Array(26).fill(0);
  const k = p.length;
  
  for (let i = 0; i < k; i++) {
    count[p.charCodeAt(i) - 97]++;
    count[s.charCodeAt(i) - 97]--;
  }
  
  let diff = count.filter(c => c !== 0).length;
  if (diff === 0) result.push(0);
  
  for (let i = k; i < s.length; i++) {
    const add = s.charCodeAt(i) - 97;
    const remove = s.charCodeAt(i - k) - 97;
    
    // 更新 diff
    if (count[add] === 0) diff++;
    count[add]--;
    if (count[add] === 0) diff--;
    
    if (count[remove] === 0) diff++;
    count[remove]++;
    if (count[remove] === 0) diff--;
    
    if (diff === 0) result.push(i - k + 1);
  }
  
  return result;
}
```

---

## 执行过程可视化

```
s = "cbaebabacd", p = "abc"

初始化：
  need: {a:1, b:1, c:1}
  k = 3

第一个窗口 [c,b,a]：
  window: {c:1, b:1, a:1}
  valid = 3 = need.size
  → result.push(0)，result = [0]

窗口滑动：
i=3: 加入 e，移除 c
  窗口 [b,a,e]
  valid = 2（e 不在 need 中，c 被移除后 valid--）
  
i=4: 加入 b，移除 b
  窗口 [a,e,b]
  valid = 2
  
i=5: 加入 a，移除 a
  窗口 [e,b,a]
  valid = 2
  
i=6: 加入 b，移除 e
  窗口 [b,a,b]
  valid = 2（b 的数量是 2，但 need 是 1）
  
i=7: 加入 a，移除 b
  窗口 [a,b,a]
  valid = 2（a 的数量是 2）
  
i=8: 加入 c，移除 a
  窗口 [b,a,c]
  valid = 3 ✓
  → result.push(6)，result = [0, 6]
  
i=9: 加入 d，移除 b
  窗口 [a,c,d]
  valid = 2

最终：result = [0, 6]
```

---

## 复杂度分析

- **时间复杂度**：O(n)
  - 每个字符进出窗口各一次
  
- **空间复杂度**：O(1)
  - 字符集固定（26个字母）

---

## 常见错误

### 错误1：valid 的更新时机

```typescript
// ❌ 错误：先减少再比较
window.set(c, window.get(c)! + 1);
if (window.get(c) === need.get(c)) {
  valid++;  // 正确
}

// 移除时
if (window.get(d) === need.get(d)) {
  valid--;  // 必须在减少之前比较
}
window.set(d, window.get(d)! - 1);  // 然后才减少
```

### 错误2：忘记检查字符是否在目标中

```typescript
// ❌ 错误：对所有字符操作
window.set(c, (window.get(c) || 0) + 1);
if (window.get(c) === need.get(c)) {
  valid++;
}

// ✓ 正确：只对目标中的字符操作
if (need.has(c)) {
  window.set(c, (window.get(c) || 0) + 1);
  if (window.get(c) === need.get(c)) {
    valid++;
  }
}
```

### 错误3：边界条件

```typescript
// s 比 p 短，不可能有异位词
if (s.length < p.length) return [];
```

---

## 与"字符串的排列"对比

| 问题 | 字符串的排列 (567) | 找所有异位词 (438) |
|-----|-------------------|-------------------|
| 返回值 | boolean（是否存在） | number[]（所有起始位置） |
| 找到后 | 立即返回 true | 记录位置，继续找 |
| 本质 | 完全相同 | 完全相同 |

---

## 相关题目

- **567. 字符串的排列**：判断是否存在一个异位词
- **242. 有效的字母异位词**：判断两个字符串是否互为异位词
- **49. 字母异位词分组**：将异位词分组

---

## 小结

固定窗口 + 字符频率匹配是一类常见题型，核心要点：

1. **窗口大小固定**：等于目标串长度
2. **频率统计**：用 Map 或数组统计字符出现次数
3. **优化判断**：用 valid/diff 变量避免每次重新比较
4. **滑动更新**：加入新字符，移除旧字符，增量更新
