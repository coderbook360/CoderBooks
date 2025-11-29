# 实战：回文串判断

回文串是对撞指针的经典应用场景。字符串从两端看是"对称"的，用两个指针从两端向中间检查是自然的想法。

## 问题描述

给定一个字符串`s`，判断它是否是回文串。只考虑字母和数字字符，可以忽略字母的大小写。

**示例**：
```
输入：s = "A man, a plan, a canal: Panama"
输出：true
解释：忽略标点和空格后是"amanaplanacanalpanama"，是回文

输入：s = "race a car"
输出：false
解释："raceacar"不是回文
```

## 思路分析

基本思路很简单：
1. 两个指针分别从头和尾出发
2. 跳过非字母数字字符
3. 比较字符（忽略大小写）
4. 相等则继续，不等则返回false

## 解法一：对撞指针（推荐）

```javascript
/**
 * @param {string} s
 * @return {boolean}
 */
function isPalindrome(s) {
    let left = 0;
    let right = s.length - 1;
    
    while (left < right) {
        // 跳过非字母数字字符
        while (left < right && !isAlphanumeric(s[left])) {
            left++;
        }
        while (left < right && !isAlphanumeric(s[right])) {
            right--;
        }
        
        // 比较字符（忽略大小写）
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

## 解法二：预处理 + 反转比较

```javascript
function isPalindrome(s) {
    // 预处理：只保留字母数字，转小写
    const cleaned = s.toLowerCase().replace(/[^a-z0-9]/g, '');
    
    // 反转后比较
    return cleaned === cleaned.split('').reverse().join('');
}
```

这种方法更简洁，但需要O(n)额外空间。

## 执行过程

```
s = "A man, a plan, a canal: Panama"

left=0('A'), right=29('a')
  都是字母，比较：'a' === 'a' ✓
  
left=1(' '), right=28('m')
  left不是字母，跳过
left=2('m'), right=28('m')
  比较：'m' === 'm' ✓

...继续比较...

最终 left >= right，返回 true
```

## 边界情况

| 情况 | 处理 |
|------|------|
| 空字符串 | 是回文（true） |
| 只有非字母数字 | 是回文（true） |
| 单个字符 | 是回文（true） |

## 复杂度分析

**时间复杂度**：O(n)
- 每个字符最多访问一次

**空间复杂度**：O(1)
- 只用了两个指针（解法一）
- 解法二需要O(n)

## 变体：回文串验证II

如果允许**最多删除一个字符**，能否成为回文？

```javascript
function validPalindrome(s) {
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

function isPalindromeRange(s, left, right) {
    while (left < right) {
        if (s[left] !== s[right]) return false;
        left++;
        right--;
    }
    return true;
}
```

## 小结

回文串判断的核心：

1. **对撞指针**：从两端向中间检查
2. **预处理**：跳过无关字符，统一大小写
3. **提前返回**：发现不匹配立即返回false

这道题是对撞指针的入门级应用，理解它有助于解决更复杂的回文问题。
