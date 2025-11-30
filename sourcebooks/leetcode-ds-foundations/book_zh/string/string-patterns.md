# 字符串遍历与匹配模式

上一章我们学习了字符串的基本操作。这一章，我们来看字符串的**遍历模式**。

这些模式在 LeetCode 字符串题目中反复出现，掌握它们能让你快速解题。

## 基本遍历方式

### for 循环

最基础的遍历方式，可以直接访问索引：

```javascript
const str = 'hello';

for (let i = 0; i < str.length; i++) {
    console.log(i, str[i]);
}
```

**优点**：可以获取索引，可以从任意位置开始，可以反向遍历。

### for...of 循环

ES6 引入的语法，更简洁：

```javascript
const str = 'hello';

for (const char of str) {
    console.log(char);
}
```

**优点**：语法简洁，正确处理 Unicode（包括 emoji）。

**缺点**：不能直接获取索引。如果需要索引：

```javascript
for (const [index, char] of [...str].entries()) {
    console.log(index, char);
}
```

### 展开运算符 + forEach

```javascript
[...str].forEach((char, index) => {
    console.log(index, char);
});
```

**优点**：同时获取索引和字符，正确处理 Unicode。

**缺点**：需要先创建数组，有额外开销。

### 方法对比

| 方法 | 获取索引 | Unicode 支持 | 性能 |
|-----|---------|------------|------|
| for 循环 | ✅ | ⚠️ 可能拆分 emoji | 最快 |
| for...of | ❌ | ✅ | 快 |
| 展开 + forEach | ✅ | ✅ | 中等 |

**推荐**：
- 普通遍历用 `for...of`
- 需要索引用 `for` 循环
- 处理 emoji 用 `[...str]`

## 双指针遍历模式

双指针是字符串题目中最常用的技巧之一。

### 首尾双指针

用于从两端向中间遍历，常见于**回文判断**。

```javascript
function isPalindrome(s) {
    let left = 0;
    let right = s.length - 1;
    
    while (left < right) {
        if (s[left] !== s[right]) {
            return false;
        }
        left++;
        right--;
    }
    
    return true;
}
```

执行过程：

```
"racecar"
 ↑     ↑
left  right

比较 'r' === 'r' ✓，left++, right--

"racecar"
  ↑   ↑
 left right

比较 'a' === 'a' ✓，left++, right--

...直到 left >= right
```

时间复杂度 O(n)，空间复杂度 O(1)。

### 快慢双指针

用于**原地修改**字符串（通过数组实现）。

```javascript
// 删除字符串中的连续重复字符
function removeDuplicates(s) {
    const arr = [...s];
    let slow = 0;
    
    for (let fast = 0; fast < arr.length; fast++) {
        // 如果是第一个字符，或者与前一个不同
        if (fast === 0 || arr[fast] !== arr[fast - 1]) {
            arr[slow] = arr[fast];
            slow++;
        }
    }
    
    return arr.slice(0, slow).join('');
}

removeDuplicates('aabbcc');  // 'abc'
```

这和数组的"删除重复项"是同样的模式。

## 滑动窗口模式

滑动窗口是解决**子串问题**的利器。

基本思想：用两个指针 `left` 和 `right` 维护一个"窗口"，根据条件扩展或收缩窗口。

### 滑动窗口模板

```javascript
function slidingWindow(s) {
    const window = new Map();  // 窗口内的字符统计
    let left = 0;
    let result = /* 初始值 */;
    
    for (let right = 0; right < s.length; right++) {
        const c = s[right];
        // 1. 扩展窗口：将 c 加入窗口
        window.set(c, (window.get(c) || 0) + 1);
        
        // 2. 当窗口需要收缩时
        while (/* 收缩条件 */) {
            const d = s[left];
            // 3. 收缩窗口：将 d 移出窗口
            window.set(d, window.get(d) - 1);
            if (window.get(d) === 0) window.delete(d);
            left++;
        }
        
        // 4. 更新结果
        result = /* 更新逻辑 */;
    }
    
    return result;
}
```

### 例子：最长无重复子串

```javascript
function lengthOfLongestSubstring(s) {
    const window = new Set();
    let left = 0;
    let maxLen = 0;
    
    for (let right = 0; right < s.length; right++) {
        const c = s[right];
        
        // 如果窗口中已有 c，收缩左边界直到没有 c
        while (window.has(c)) {
            window.delete(s[left]);
            left++;
        }
        
        window.add(c);
        maxLen = Math.max(maxLen, right - left + 1);
    }
    
    return maxLen;
}

lengthOfLongestSubstring('abcabcbb');  // 3 ('abc')
```

滑动窗口的关键是：
1. **何时扩展**：通常是每次循环都扩展右边界
2. **何时收缩**：当窗口不满足条件时收缩左边界
3. **何时更新结果**：根据具体问题决定

## 字符频率统计模式

很多题目需要统计字符出现的次数。

### 使用 Map

适用于任意字符：

```javascript
function countChars(s) {
    const count = new Map();
    
    for (const char of s) {
        count.set(char, (count.get(char) || 0) + 1);
    }
    
    return count;
}

countChars('hello');  // Map { 'h' => 1, 'e' => 1, 'l' => 2, 'o' => 1 }
```

### 使用数组

如果只有小写字母（或固定字符集），用数组更快：

```javascript
function countLowercase(s) {
    const count = new Array(26).fill(0);
    
    for (const char of s) {
        count[char.charCodeAt(0) - 97]++;  // 'a' 的码是 97
    }
    
    return count;
}
```

数组下标 0-25 对应 a-z。

**什么时候用数组？**

- 字符集固定且较小（如 26 个字母）
- 需要比较两个字符串的字符分布（直接比较两个数组）

## 子串枚举模式

有时需要枚举字符串的所有子串：

```javascript
function allSubstrings(s) {
    const result = [];
    
    for (let i = 0; i < s.length; i++) {       // 起点
        for (let j = i + 1; j <= s.length; j++) { // 终点
            result.push(s.slice(i, j));
        }
    }
    
    return result;
}

allSubstrings('abc');
// ['a', 'ab', 'abc', 'b', 'bc', 'c']
```

长度为 n 的字符串有 n(n+1)/2 个子串，所以枚举子串的时间复杂度是 O(n²)。

## 常见陷阱

### 边界条件

```javascript
// 注意 left < right vs left <= right
while (left < right) { ... }   // 偶数长度
while (left <= right) { ... }  // 奇数长度中间元素
```

### Unicode 字符

```javascript
const str = '😀hello';

// ❌ for 循环可能出问题
for (let i = 0; i < str.length; i++) {
    console.log(str[i]);  // 第一个会打印乱码
}

// ✅ for...of 正确处理
for (const char of str) {
    console.log(char);  // 正确打印 😀
}
```

### 窗口收缩时机

```javascript
// while：收缩到条件不满足为止
while (/* 条件 */) { left++; }

// if：只收缩一次
if (/* 条件 */) { left++; }
```

大多数滑动窗口问题用 `while`，因为可能需要收缩多次。

## 本章小结

这一章我们学习了字符串的常见遍历模式：

1. **基本遍历**：`for` 循环或 `for...of`
2. **首尾双指针**：从两端向中间，用于回文判断
3. **快慢双指针**：原地修改，用于去重等
4. **滑动窗口**：子串问题的通用框架
5. **字符统计**：Map 或数组

这些模式会在后续的字符串题目中反复出现。

下一章开始，我们进入字符串的实战练习，第一道题是「判断回文」。
