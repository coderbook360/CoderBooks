# 实战：判断字符串是否为回文

回文串是正着读和反着读都一样的字符串，比如 "aba"、"abba"。

这道题在基本判断的基础上，增加了字符过滤的要求。

## 题目描述

> **LeetCode 125. 验证回文串**
>
> 如果在将所有大写字符转换为小写字符、并移除所有非字母数字字符之后，短语正着读和反着读都一样，则可以认为该短语是一个回文串。

**示例 1**：
```
输入：s = "A man, a plan, a canal: Panama"
输出：true
解释：过滤后为 "amanaplanacanalpanama"，是回文串
```

**示例 2**：
```
输入：s = "race a car"
输出：false
解释：过滤后为 "raceacar"，不是回文串
```

**示例 3**：
```
输入：s = " "
输出：true
解释：过滤后为空串，空串是回文
```

## 题目分析

核心问题：
1. 过滤掉非字母数字字符
2. 忽略大小写
3. 判断是否回文

两种思路：
- **预处理**：先过滤，再反转比较
- **双指针**：边遍历边过滤边比较

## 解法一：预处理 + 反转比较

最直观的方法：先把字符串处理干净，再判断。

```javascript
function isPalindrome(s) {
    // 1. 过滤非字母数字字符，转小写
    const cleaned = s.toLowerCase().replace(/[^a-z0-9]/g, '');
    
    // 2. 反转后比较
    const reversed = cleaned.split('').reverse().join('');
    
    return cleaned === reversed;
}
```

**执行过程**：
```
s = "A man, a plan, a canal: Panama"

Step 1: toLowerCase()
"a man, a plan, a canal: panama"

Step 2: replace(/[^a-z0-9]/g, '')
"amanaplanacanalpanama"

Step 3: 反转
"amanaplanacanalpanama"

Step 4: 比较
cleaned === reversed → true
```

**复杂度分析**：
- 时间复杂度：O(n)——遍历字符串
- 空间复杂度：O(n)——存储处理后的字符串

代码简洁，但需要额外空间。能不能 O(1) 空间？

## 解法二：双指针（最优）

用左右双指针，从两端向中间遍历。遇到非字母数字字符就跳过。

```javascript
function isPalindrome(s) {
    let left = 0;
    let right = s.length - 1;
    
    while (left < right) {
        // 跳过左边的非字母数字字符
        while (left < right && !isAlphanumeric(s[left])) {
            left++;
        }
        // 跳过右边的非字母数字字符
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

// 判断是否为字母或数字
function isAlphanumeric(char) {
    const code = char.charCodeAt(0);
    return (code >= 48 && code <= 57) ||   // 0-9
           (code >= 65 && code <= 90) ||   // A-Z
           (code >= 97 && code <= 122);    // a-z
}
```

### 执行过程

```
s = "A man, a plan, a canal: Panama"
     ↑                            ↑
    left=0                    right=29

Step 1: s[0]='A', s[29]='a'
        'A'.toLowerCase() === 'a' ✓
        left=1, right=28

Step 2: s[1]=' ', 跳过，left=2
        s[28]='m', isAlphanumeric ✓
        s[2]='m', 'm' === 'm' ✓
        left=3, right=27

...继续直到 left >= right
```

**复杂度分析**：
- 时间复杂度：O(n)——每个字符最多被访问两次
- 空间复杂度：O(1)——只用了两个指针

## 辅助函数的替代写法

判断字母数字也可以用正则：

```javascript
function isAlphanumeric(char) {
    return /[a-zA-Z0-9]/.test(char);
}
```

但每次调用正则会有一点开销，在性能敏感场景下用 charCode 判断更快。

## 两种解法对比

| 方法 | 时间复杂度 | 空间复杂度 | 特点 |
|-----|-----------|-----------|------|
| 预处理 + 反转 | O(n) | O(n) | 代码简洁 |
| 双指针 | O(n) | O(1) | 空间最优 |

面试中推荐用双指针解法，展示你对空间复杂度的优化意识。

## 边界情况

```javascript
// 空字符串 → true
isPalindrome('');  // true

// 只有标点 → true（过滤后为空）
isPalindrome('.,');  // true

// 单个字符 → true
isPalindrome('a');  // true
```

## 相关题目

- **9. 回文数**：判断数字是否回文
- **680. 验证回文串 II**：最多删除一个字符后判断回文
- **234. 回文链表**：链表版本

## 本章小结

这一章我们学习了**回文判断**的经典方法：

1. **首尾双指针**：从两端向中间收缩
2. **字符过滤**：跳过非目标字符
3. **大小写处理**：统一转换后比较

双指针判断回文是一个非常基础且重要的模式，会在很多题目中出现。

下一章，我们来看「反转字符串」。
