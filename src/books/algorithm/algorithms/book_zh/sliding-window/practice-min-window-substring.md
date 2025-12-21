# 实战：最小覆盖子串

> LeetCode 76. 最小覆盖子串 | 难度：困难

滑动窗口的"终极挑战"，掌握它意味着你已经彻底理解滑动窗口。

---

## 题目描述

给你一个字符串 `s` 和一个字符串 `t`，返回 `s` 中涵盖 `t` 所有字符的最小子串。如果不存在，返回空字符串。

**示例**：
```
输入：s = "ADOBECODEBANC", t = "ABC"
输出："BANC"
解释：最小覆盖子串 "BANC" 包含了 t 中的 'A', 'B', 'C'
```

---

## 思路分析

这是典型的"求最短满足条件的子串"问题。

**条件**：窗口包含 t 中所有字符（含重复）

**策略**：
1. 扩展右边界，直到窗口满足条件
2. 满足后，收缩左边界，寻找更短的解
3. 重复直到遍历完成

---

## 代码实现

```typescript
function minWindow(s: string, t: string): string {
  // 统计 t 中每个字符的需求量
  const need = new Map<string, number>();
  for (const c of t) {
    need.set(c, (need.get(c) || 0) + 1);
  }
  
  // 窗口内各字符的数量
  const window = new Map<string, number>();
  
  let left = 0;
  let valid = 0;  // 满足需求的字符种类数
  let start = 0, minLen = Infinity;
  
  for (let right = 0; right < s.length; right++) {
    const c = s[right];
    
    // 扩展窗口
    if (need.has(c)) {
      window.set(c, (window.get(c) || 0) + 1);
      // 该字符刚好满足需求
      if (window.get(c) === need.get(c)) {
        valid++;
      }
    }
    
    // 当所有字符都满足时，尝试收缩
    while (valid === need.size) {
      // 更新最小覆盖子串
      if (right - left + 1 < minLen) {
        start = left;
        minLen = right - left + 1;
      }
      
      // 收缩左边界
      const d = s[left];
      if (need.has(d)) {
        if (window.get(d) === need.get(d)) {
          valid--;  // 收缩后该字符不再满足
        }
        window.set(d, window.get(d)! - 1);
      }
      left++;
    }
  }
  
  return minLen === Infinity ? "" : s.substring(start, start + minLen);
}
```

---

## 图示过程

```
s = "ADOBECODEBANC", t = "ABC"

right=5: 窗口 "ADOBEC" 包含 ABC
         收缩 left: "DOBEC" 不满足（缺 A）
         记录最小长度 6

right=10: 窗口 "ODEBANC" 再次满足
          收缩...
          记录 "BANC"，长度 4

最终返回 "BANC"
```

---

## 关键技巧：valid 变量

为什么用 `valid` 而不是每次都检查所有字符？

- 每次只更新变化的字符
- 判断 `valid === need.size` 是 O(1) 操作
- 避免了 O(字符集) 的重复计算

---

## 复杂度分析

- **时间复杂度**：O(|s| + |t|)
- **空间复杂度**：O(|t|)

---

## 变体题目

这个模板稍加修改可以解决：
- 字符串的排列
- 找所有字母异位词
- 最小窗口子串
