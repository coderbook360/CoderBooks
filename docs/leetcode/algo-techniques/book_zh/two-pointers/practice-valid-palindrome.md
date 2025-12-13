# 实战：回文串判断

> LeetCode 125. 验证回文串 | 难度：简单

回文串天然具有对称性，是对撞指针的经典应用。这道题在基础模式上增加了字符过滤的处理。

---

## 题目描述

给定一个字符串 `s`，判断它是否是回文串。只考虑字母和数字字符，忽略字母的大小写。

**示例 1**：
```
输入：s = "A man, a plan, a canal: Panama"
输出：true
解释：去掉非字母数字后是 "amanaplanacanalpanama"，是回文
```

**示例 2**：
```
输入：s = "race a car"
输出：false
解释：去掉非字母数字后是 "raceacar"，不是回文
```

---

## 思路分析

回文串的定义：**正读和反读都一样**。

判断回文的核心逻辑很简单：
1. 从两端向中间走
2. 每一步比较两端字符是否相同
3. 如果有不同，就不是回文

但这道题有额外要求：
- 只考虑字母和数字
- 忽略大小写

所以我们需要在移动指针时**跳过非法字符**，在比较时**统一大小写**。

---

## 代码实现

```typescript
function isPalindrome(s: string): boolean {
  let left = 0;
  let right = s.length - 1;
  
  while (left < right) {
    // 左指针跳过非字母数字字符
    while (left < right && !isAlphanumeric(s[left])) {
      left++;
    }
    
    // 右指针跳过非字母数字字符
    while (left < right && !isAlphanumeric(s[right])) {
      right--;
    }
    
    // 比较（转换为小写后比较）
    if (s[left].toLowerCase() !== s[right].toLowerCase()) {
      return false;
    }
    
    left++;
    right--;
  }
  
  return true;
}

function isAlphanumeric(c: string): boolean {
  return /[a-zA-Z0-9]/.test(c);
}
```

---

## 图示过程

以 `"A man, a plan, a canal: Panama"` 为例：

```
"A man, a plan, a canal: Panama"
 ↑                            ↑
left=0                     right=29

步骤详解：

1. left=0 ('A')，right=29 ('a')
   都是字母，'A' vs 'a' → 相等（忽略大小写）
   left++, right--

2. left=1 (' ')，跳过空格，left=2
   left=2 ('m')，right=28 ('m')
   'm' vs 'm' → 相等
   left++, right--

3. left=3 ('a')，right=27 ('a')
   'a' vs 'a' → 相等

4. left=4 ('n')，right=26 ('n')
   'n' vs 'n' → 相等

5. left=5 (',')，跳过，left=6 (' ')，跳过，left=7
   right=25 ('a')
   left=7 ('a')
   'a' vs 'a' → 相等

... 继续直到 left >= right，返回 true
```

---

## 边界情况

```typescript
// 空字符串 → 是回文
isPalindrome("")  // true

// 单个字符 → 是回文
isPalindrome("a")  // true

// 全是非字母数字 → 相当于空串，是回文
isPalindrome(".,")  // true
```

---

## 复杂度分析

- **时间复杂度**：O(n)，每个字符最多被访问一次
- **空间复杂度**：O(1)，只使用常数额外空间

---

## 代码优化

可以用 `charCodeAt` 代替正则，性能更好：

```typescript
function isAlphanumeric(c: string): boolean {
  const code = c.charCodeAt(0);
  return (code >= 48 && code <= 57) ||  // 0-9
         (code >= 65 && code <= 90) ||  // A-Z
         (code >= 97 && code <= 122);   // a-z
}
```

---

## 常见错误

### 错误1：忘记跳过非法字符

```typescript
// ❌ 错误：直接比较，不跳过非字母数字
while (left < right) {
  if (s[left].toLowerCase() !== s[right].toLowerCase()) {
    return false;
  }
  left++;
  right--;
}
// 输入 "a,b" 会返回 false，但实际 "ab" 不是回文应该返回 false
// 输入 "a,a" 会返回 false，但实际 "aa" 是回文应该返回 true
```

### 错误2：跳过字符时边界检查不完整

```typescript
// ❌ 错误：跳过时没有检查 left < right
while (!isAlphanumeric(s[left])) {
  left++;  // 可能导致 left > right 后继续比较
}
```

### 错误3：大小写转换遗漏

```typescript
// ❌ 错误：只转换一边
if (s[left].toLowerCase() !== s[right]) {
  return false;
}
// 应该两边都转换或统一比较方式
```

---

## 进阶：验证回文串 II

如果允许删除最多一个字符，如何判断？

```typescript
// LeetCode 680
function validPalindrome(s: string): boolean {
  let left = 0;
  let right = s.length - 1;
  
  while (left < right) {
    if (s[left] !== s[right]) {
      // 尝试删除左边或右边的字符
      return isPalindromeRange(s, left + 1, right) ||
             isPalindromeRange(s, left, right - 1);
    }
    left++;
    right--;
  }
  
  return true;
}

function isPalindromeRange(s: string, left: number, right: number): boolean {
  while (left < right) {
    if (s[left] !== s[right]) return false;
    left++;
    right--;
  }
  return true;
}
```

**思路**：当发现不匹配时，有两种选择：
1. 删除左边字符，检查 `[left+1, right]` 是否回文
2. 删除右边字符，检查 `[left, right-1]` 是否回文

---

## 相关题目

- **680. 验证回文串 II**：最多可以删除一个字符，判断能否成为回文
- **234. 回文链表**：链表版本的回文判断
- **9. 回文数**：判断整数是否是回文

---

## 总结

回文判断的核心模式：

1. **对撞指针**：从两端向中间移动
2. **字符过滤**：根据题目要求跳过无效字符
3. **大小写处理**：统一转换后比较
4. **边界处理**：空串、单字符、全无效字符都是回文
