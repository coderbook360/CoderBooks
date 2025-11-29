# 实战：判断字符串是否为回文

这道题来自 LeetCode 第 125 题，是字符串处理和双指针技巧的入门题。

## 题目描述

如果在将所有大写字符转换为小写字符、并移除所有非字母数字字符之后，短语正着读和反着读都一样，则可以认为该短语是一个**回文串**。

字母和数字都属于字母数字字符。

给你一个字符串 `s`，如果它是回文串，返回 `true`；否则，返回 `false`。

**示例**：

```
输入：s = "A man, a plan, a canal: Panama"
输出：true
解释："amanaplanacanalpanama" 是回文串

输入：s = "race a car"
输出：false
解释："raceacar" 不是回文串

输入：s = " "
输出：true
解释：去掉空格后是空字符串 ""，空字符串被认为是回文串
```

## 什么是回文

回文（Palindrome）是指正读和反读都一样的序列。

比如：
- `"aba"` → 正读 "aba"，反读 "aba" ✓
- `"abba"` → 正读 "abba"，反读 "abba" ✓
- `"abc"` → 正读 "abc"，反读 "cba" ✗

## 方法一：反转字符串

最直观的想法是：去掉无关字符，转小写，然后反转字符串，比较是否相同。

```javascript
function isPalindrome(s) {
    // 只保留字母数字，转小写
    const cleaned = s
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');
    
    // 反转并比较
    const reversed = cleaned.split('').reverse().join('');
    
    return cleaned === reversed;
}
```

这个方法简洁易懂，但需要额外创建两个字符串。

## 方法二：双指针

更高效的做法是用双指针：一个从头开始，一个从尾开始，向中间靠拢。

```javascript
function isPalindrome(s) {
    let left = 0;
    let right = s.length - 1;
    
    while (left < right) {
        // 跳过左边非字母数字字符
        while (left < right && !isAlphanumeric(s[left])) {
            left++;
        }
        
        // 跳过右边非字母数字字符
        while (left < right && !isAlphanumeric(s[right])) {
            right--;
        }
        
        // 比较（忽略大小写）
        if (s[left].toLowerCase() !== s[right].toLowerCase()) {
            return false;
        }
        
        left++;
        right--;
    }
    
    return true;
}

function isAlphanumeric(char) {
    return /[a-zA-Z0-9]/.test(char);
}
```

## 图解执行过程

以 `"A man, a plan, a canal: Panama"` 为例：

```
原字符串：A man, a plan, a canal: Panama
         ↑                           ↑
        left                       right

步骤 1：'A' vs 'a' → 'a' == 'a' ✓
步骤 2：' ' 不是字母数字，left++
步骤 3：'m' vs 'm' ✓
步骤 4：'a' vs 'a' ✓
步骤 5：'n' vs 'n' ✓
... (继续比较)

所有字符都匹配，返回 true
```

以 `"race a car"` 为例：

```
清理后：raceacar
        ↑      ↑
       left  right

步骤 1：'r' vs 'r' ✓
步骤 2：'a' vs 'a' ✓
步骤 3：'c' vs 'c' ✓
步骤 4：'e' vs 'a' ✗

返回 false
```

## 复杂度分析

**方法一（反转）**：
- 时间复杂度：O(n)，遍历字符串一次
- 空间复杂度：O(n)，创建新字符串

**方法二（双指针）**：
- 时间复杂度：O(n)，最多遍历字符串一次
- 空间复杂度：O(1)，只用了两个指针

## 边界情况

1. **空字符串**：空字符串是回文
2. **只有一个字符**：单个字符是回文
3. **全是非字母数字**：清理后为空字符串，是回文
4. **大小写混合**：需要忽略大小写

## 优化：内联判断函数

如果追求极致性能，可以用字符码直接判断：

```javascript
function isPalindrome(s) {
    let left = 0;
    let right = s.length - 1;
    
    while (left < right) {
        // 跳过非字母数字
        while (left < right && !isAlphaNum(s.charCodeAt(left))) {
            left++;
        }
        while (left < right && !isAlphaNum(s.charCodeAt(right))) {
            right--;
        }
        
        // 比较（转小写）
        if (toLower(s.charCodeAt(left)) !== toLower(s.charCodeAt(right))) {
            return false;
        }
        
        left++;
        right--;
    }
    
    return true;
}

function isAlphaNum(code) {
    // 0-9: 48-57, A-Z: 65-90, a-z: 97-122
    return (code >= 48 && code <= 57) ||
           (code >= 65 && code <= 90) ||
           (code >= 97 && code <= 122);
}

function toLower(code) {
    // A-Z 转为 a-z
    if (code >= 65 && code <= 90) {
        return code + 32;
    }
    return code;
}
```

## 小结

回文判断是双指针技巧的典型应用：

1. 两个指针从两端向中间移动
2. 跳过不需要的字符
3. 比较对应位置的字符

这种"对撞指针"模式在很多问题中都会用到，比如：
- 有序数组两数之和
- 盛最多水的容器
- 三数之和

下一章，我们来看另一个字符串经典题——"实现 strStr()"。
