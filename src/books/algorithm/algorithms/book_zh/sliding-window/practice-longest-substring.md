# 实战：无重复字符的最长子串

> LeetCode 3. 无重复字符的最长子串 | 难度：中等

这是滑动窗口的入门经典题，掌握它就掌握了可变窗口的精髓。

---

## 题目描述

给定一个字符串 `s`，请你找出其中不含有重复字符的**最长子串**的长度。

**示例**：
```
输入：s = "abcabcbb"
输出：3
解释：最长无重复子串是 "abc"，长度为 3
```

---

## 思路分析

**暴力思路**：枚举所有子串，检查是否有重复 → O(n³)

**滑动窗口**：维护一个无重复的窗口
- 右边界扩展时，如果新字符与窗口内有重复，收缩左边界
- 每次扩展后记录最大长度

这是典型的"求最长满足条件的子串"问题。

---

## 代码实现

### 方法一：Set + 收缩

```typescript
function lengthOfLongestSubstring(s: string): number {
  const set = new Set<string>();
  let left = 0;
  let maxLen = 0;
  
  for (let right = 0; right < s.length; right++) {
    // 如果当前字符已在窗口中，收缩左边界
    while (set.has(s[right])) {
      set.delete(s[left]);
      left++;
    }
    
    // 将当前字符加入窗口
    set.add(s[right]);
    
    // 更新最大长度
    maxLen = Math.max(maxLen, right - left + 1);
  }
  
  return maxLen;
}
```

### 方法二：HashMap 记录位置（优化）

```typescript
function lengthOfLongestSubstring(s: string): number {
  const map = new Map<string, number>(); // 字符 -> 最近出现的索引
  let left = 0;
  let maxLen = 0;
  
  for (let right = 0; right < s.length; right++) {
    const c = s[right];
    
    // 如果字符已存在且在窗口内，直接跳过重复的部分
    if (map.has(c) && map.get(c)! >= left) {
      left = map.get(c)! + 1;
    }
    
    map.set(c, right);
    maxLen = Math.max(maxLen, right - left + 1);
  }
  
  return maxLen;
}
```

---

## 图示过程

以 `s = "abcabcbb"` 为例：

```
Step 1: right=0, s[0]='a'
  窗口: [a]，maxLen=1
  
Step 2: right=1, s[1]='b'
  窗口: [a,b]，maxLen=2
  
Step 3: right=2, s[2]='c'
  窗口: [a,b,c]，maxLen=3
  
Step 4: right=3, s[3]='a'
  'a' 在位置 0 出现过，且 0 >= left(0)
  left = 0 + 1 = 1
  窗口: [b,c,a]，maxLen=3
  
Step 5: right=4, s[4]='b'
  'b' 在位置 1 出现过，且 1 >= left(1)
  left = 1 + 1 = 2
  窗口: [c,a,b]，maxLen=3
  
Step 6: right=5, s[5]='c'
  'c' 在位置 2 出现过，且 2 >= left(2)
  left = 2 + 1 = 3
  窗口: [a,b,c]，maxLen=3
  
Step 7: right=6, s[6]='b'
  'b' 在位置 4 出现过，且 4 >= left(3)
  left = 4 + 1 = 5
  窗口: [c,b]，maxLen=3
  
Step 8: right=7, s[7]='b'
  'b' 在位置 6 出现过，且 6 >= left(5)
  left = 6 + 1 = 7
  窗口: [b]，maxLen=3

最终结果：maxLen = 3
```

---

## 两种方法对比

| 方法 | 时间复杂度 | 特点 |
|-----|-----------|-----|
| Set + while 收缩 | O(n) | 左边界逐个移动 |
| Map 记录位置 | O(n) | 左边界直接跳转 |

两种方法本质相同，Map 版本在遇到重复时可以"跳"得更快。

---

## 复杂度分析

- **时间复杂度**：O(n)
  - Set 版本：每个字符最多入集合一次，出集合一次
  - Map 版本：每个字符只访问一次
  
- **空间复杂度**：O(min(n, m))
  - m 是字符集大小（如 ASCII 128，Unicode 更大）

---

## 常见错误

### 错误1：Map 版本忘记检查是否在窗口内

```typescript
// ❌ 错误：没有检查 map.get(c) >= left
if (map.has(c)) {
  left = map.get(c)! + 1;  // 可能跳到窗口外面去了
}

// ✓ 正确：需要检查位置是否在当前窗口内
if (map.has(c) && map.get(c)! >= left) {
  left = map.get(c)! + 1;
}
```

**为什么需要检查？**

```
s = "abba"

处理到 right=3 ('a') 时：
  map: { a: 0, b: 2 }
  left: 2（因为处理 b 时跳过了）
  
  'a' 在位置 0，但 0 < left(2)
  说明那个 'a' 已经不在窗口内了，不构成冲突
```

### 错误2：Set 版本删除错误的字符

```typescript
// ❌ 错误：删除 right 指向的字符
while (set.has(s[right])) {
  set.delete(s[right]);  // 应该删除 left 位置的
  left++;
}
```

### 错误3：边界情况遗漏

```typescript
// 空字符串
lengthOfLongestSubstring("")  // 应返回 0

// 单字符
lengthOfLongestSubstring("a")  // 应返回 1

// 全相同字符
lengthOfLongestSubstring("bbbb")  // 应返回 1
```

---

## 变体问题

### 变体1：最多包含两个不同字符的最长子串

```typescript
// LeetCode 159
function lengthOfLongestSubstringTwoDistinct(s: string): number {
  const map = new Map<string, number>();
  let left = 0;
  let maxLen = 0;
  
  for (let right = 0; right < s.length; right++) {
    map.set(s[right], (map.get(s[right]) || 0) + 1);
    
    while (map.size > 2) {
      const leftChar = s[left];
      map.set(leftChar, map.get(leftChar)! - 1);
      if (map.get(leftChar) === 0) {
        map.delete(leftChar);
      }
      left++;
    }
    
    maxLen = Math.max(maxLen, right - left + 1);
  }
  
  return maxLen;
}
```

### 变体2：最多包含 k 个不同字符

```typescript
// LeetCode 340
// 只需将 while (map.size > 2) 改为 while (map.size > k)
```

---

## 相关题目

- **159. 至多包含两个不同字符的最长子串**
- **340. 至多包含 K 个不同字符的最长子串**
- **992. K 个不同整数的子数组**

---

## 要点

滑动窗口维护"无重复"的性质：

1. **Set 版本**：遇到重复时逐个删除左边字符，直到无重复
2. **Map 版本**：记录每个字符的最新位置，遇到重复直接跳转
3. **窗口始终有效**：每次扩展后都可以安全更新结果
4. **注意边界**：Map 版本需检查字符是否在当前窗口内
