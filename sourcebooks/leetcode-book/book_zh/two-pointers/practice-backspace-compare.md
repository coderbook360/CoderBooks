# 实战：比较含退格的字符串

这道题是快慢指针的巧妙应用。通过**从后往前遍历**，可以在O(1)空间内解决退格问题。

## 问题描述

给定两个字符串`s`和`t`，当它们分别被输入到空白的文本编辑器后，如果两者相等，返回true。`#`代表退格字符。

**示例**：
```
输入：s = "ab#c", t = "ad#c"
输出：true
解释：s 和 t 都变成 "ac"

输入：s = "ab##", t = "c#d#"
输出：true
解释：s 和 t 都变成 ""

输入：s = "a#c", t = "b"
输出：false
解释：s 变成 "c"，t 变成 "b"
```

## 思路分析

### 方法一：用栈模拟

最直观的方法，遇到字符入栈，遇到`#`出栈：

```javascript
function backspaceCompare(s, t) {
    return build(s) === build(t);
}

function build(str) {
    const stack = [];
    for (const c of str) {
        if (c === '#') {
            stack.pop();
        } else {
            stack.push(c);
        }
    }
    return stack.join('');
}
```

时间O(n)，空间O(n)。能做到O(1)空间吗？

### 方法二：双指针从后往前

关键洞察：**退格操作只影响前面的字符**。

从后往前遍历，遇到`#`就跳过相应数量的字符，然后比较有效字符是否相同。

## 完整实现

```javascript
/**
 * @param {string} s
 * @param {string} t
 * @return {boolean}
 */
function backspaceCompare(s, t) {
    let i = s.length - 1;
    let j = t.length - 1;
    let skipS = 0;  // s需要跳过的字符数
    let skipT = 0;  // t需要跳过的字符数
    
    while (i >= 0 || j >= 0) {
        // 找s中下一个有效字符
        while (i >= 0) {
            if (s[i] === '#') {
                skipS++;
                i--;
            } else if (skipS > 0) {
                skipS--;
                i--;
            } else {
                break;  // 找到有效字符
            }
        }
        
        // 找t中下一个有效字符
        while (j >= 0) {
            if (t[j] === '#') {
                skipT++;
                j--;
            } else if (skipT > 0) {
                skipT--;
                j--;
            } else {
                break;  // 找到有效字符
            }
        }
        
        // 比较有效字符
        if (i >= 0 && j >= 0) {
            if (s[i] !== t[j]) {
                return false;
            }
        } else if (i >= 0 || j >= 0) {
            // 一个到头了，另一个没有
            return false;
        }
        
        i--;
        j--;
    }
    
    return true;
}
```

## 执行过程

```
s = "ab#c", t = "ad#c"

初始：i = 3, j = 3, skipS = 0, skipT = 0

第一轮：
  s[3]='c' 有效字符
  t[3]='c' 有效字符
  'c' === 'c' ✓
  i = 2, j = 2

第二轮：
  s[2]='#', skipS = 1, i = 1
  s[1]='b', skipS > 0, skipS = 0, i = 0
  s[0]='a' 有效字符
  
  t[2]='#', skipT = 1, j = 1
  t[1]='d', skipT > 0, skipT = 0, j = 0
  t[0]='a' 有效字符
  
  'a' === 'a' ✓
  i = -1, j = -1

i < 0 && j < 0, 结束

结果：true
```

## 代码解析

### 跳过逻辑

```javascript
while (i >= 0) {
    if (s[i] === '#') {
        skipS++;  // 记录一个退格
        i--;
    } else if (skipS > 0) {
        skipS--;  // 消耗一个退格
        i--;
    } else {
        break;    // 找到有效字符
    }
}
```

三种情况：
1. 遇到`#`：增加跳过计数
2. 有跳过计数：跳过当前字符
3. 没有跳过计数：这是有效字符，停止

### 比较逻辑

```javascript
if (i >= 0 && j >= 0) {
    if (s[i] !== t[j]) return false;
} else if (i >= 0 || j >= 0) {
    return false;
}
```

两种失败情况：
1. 两个有效字符不同
2. 一边还有字符，另一边没有了

## 另一种写法

把找有效字符封装成函数：

```javascript
function backspaceCompare(s, t) {
    let i = s.length - 1;
    let j = t.length - 1;
    
    while (true) {
        i = findNextValid(s, i);
        j = findNextValid(t, j);
        
        if (i < 0 && j < 0) return true;
        if (i < 0 || j < 0) return false;
        if (s[i] !== t[j]) return false;
        
        i--;
        j--;
    }
}

function findNextValid(str, index) {
    let skip = 0;
    while (index >= 0) {
        if (str[index] === '#') {
            skip++;
            index--;
        } else if (skip > 0) {
            skip--;
            index--;
        } else {
            break;
        }
    }
    return index;
}
```

## 复杂度分析

**栈方法**：
- 时间复杂度：O(m + n)
- 空间复杂度：O(m + n)

**双指针方法**：
- 时间复杂度：O(m + n)
- 空间复杂度：O(1)

## 小结

比较含退格字符串的要点：

1. **从后往前遍历**：退格只影响前面的字符
2. **计数跳过**：遇到`#`增加计数，遇到普通字符消耗计数
3. **同步比较**：两个字符串的有效字符必须一一对应
4. **O(1)空间**：不需要构建实际的结果字符串

这道题展示了双指针的灵活性：有时候从后往前比从前往后更简单。
