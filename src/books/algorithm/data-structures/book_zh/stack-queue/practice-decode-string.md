# 实战：字符串解码

`3[a2[c]]` 这个字符串表示什么？

按照编码规则：`k[encoded_string]` 表示括号内的字符串重复 k 次。

所以 `2[c]` = `cc`，`a2[c]` = `acc`，`3[a2[c]]` = `accaccacc`。

这道题的难点在于**嵌套**——括号里面还有括号。如何正确处理这种嵌套结构？答案是用栈。

---

## 问题描述

**LeetCode 394. Decode String**

给定一个经过编码的字符串，返回它解码后的字符串。

编码规则为：`k[encoded_string]`，表示其中方括号内部的 `encoded_string` 正好重复 k 次。

**示例**：

```
输入：s = "3[a]2[bc]"
输出："aaabcbc"

输入：s = "3[a2[c]]"
输出："accaccacc"

输入：s = "2[abc]3[cd]ef"
输出："abcabccdcdcdef"
```

---

## 问题分析

首先要问一个问题：为什么这道题要用栈？

看这个例子：`3[a2[c]]`

遍历到 `[` 时，我们需要**保存当前的上下文**（之前累积的字符串和重复次数），然后开始处理括号内部。遍历到 `]` 时，我们需要**恢复上下文**，把结果组合起来。

这种"保存-恢复"的模式，正好符合栈的 LIFO 特性！

现在问第二个问题：需要保存什么信息？

两个东西：
1. 当前的重复次数
2. 括号前已经累积的字符串

---

## 解法：双栈法

用两个栈：一个存数字，一个存字符串。

```javascript
function decodeString(s) {
  const numStack = [];    // 存储重复次数
  const strStack = [];    // 存储之前的字符串
  let currentStr = '';    // 当前正在构建的字符串
  let num = 0;            // 当前数字
  
  for (const char of s) {
    if (char >= '0' && char <= '9') {
      // 数字可能是多位，如 12[a]
      num = num * 10 + parseInt(char);
    } else if (char === '[') {
      // 保存当前上下文
      numStack.push(num);
      strStack.push(currentStr);
      // 重置，开始处理括号内部
      num = 0;
      currentStr = '';
    } else if (char === ']') {
      // 恢复上下文，组合字符串
      const repeatTimes = numStack.pop();
      const prevStr = strStack.pop();
      currentStr = prevStr + currentStr.repeat(repeatTimes);
    } else {
      // 普通字母，直接追加
      currentStr += char;
    }
  }
  
  return currentStr;
}
```

---

## 执行过程可视化

以 `s = "3[a2[c]]"` 为例：

```
遍历字符：

'3': num = 3

'[': 保存上下文
     numStack = [3]
     strStack = ['']
     重置：num = 0, currentStr = ''

'a': currentStr = 'a'

'2': num = 2

'[': 保存上下文
     numStack = [3, 2]
     strStack = ['', 'a']
     重置：num = 0, currentStr = ''

'c': currentStr = 'c'

']': 恢复上下文
     repeatTimes = 2（从 numStack 弹出）
     prevStr = 'a'（从 strStack 弹出）
     currentStr = 'a' + 'c'.repeat(2) = 'acc'
     
     numStack = [3]
     strStack = ['']

']': 恢复上下文
     repeatTimes = 3（从 numStack 弹出）
     prevStr = ''（从 strStack 弹出）
     currentStr = '' + 'acc'.repeat(3) = 'accaccacc'
     
     numStack = []
     strStack = []

结果：'accaccacc'
```

---

## 解法二：递归

递归的思路是：遇到 `[` 就递归处理内部，遇到 `]` 就返回结果。

```javascript
function decodeString(s) {
  let index = 0;
  
  function decode() {
    let result = '';
    let num = 0;
    
    while (index < s.length) {
      const char = s[index];
      
      if (char >= '0' && char <= '9') {
        num = num * 10 + parseInt(char);
        index++;
      } else if (char === '[') {
        index++;  // 跳过 '['
        const inner = decode();  // 递归处理内部
        result += inner.repeat(num);
        num = 0;
      } else if (char === ']') {
        index++;  // 跳过 ']'
        return result;  // 返回当前层的结果
      } else {
        result += char;
        index++;
      }
    }
    
    return result;
  }
  
  return decode();
}
```

递归和栈本质上是一样的——递归调用栈就是我们手动维护的栈。

---

## 关键细节

### 1. 多位数字

数字可能不止一位，比如 `12[a]` 表示 12 个 a。

```javascript
// 累积计算多位数字
num = num * 10 + parseInt(char);
```

### 2. 括号前可能有字母

`abc3[d]` 的结果是 `abcddd`，不是 `dddabc`。

我们的做法是正确的：遇到 `[` 时保存 `currentStr`（此时是 `abc`），处理完括号后再拼接。

### 3. 括号可能连续

`2[a]3[b]` 的结果是 `aabbb`。这种情况我们的代码也能正确处理，因为两个括号是独立处理的。

---

## 复杂度分析

- **时间复杂度**：O(解码后字符串的长度)。每个字符最多被访问一次，但重复操作会产生新字符。
- **空间复杂度**：O(嵌套深度)。栈的深度取决于括号的嵌套层数。

---

## 边界情况

- **无括号**：`"abc"` → `"abc"`，直接累积字母
- **无嵌套**：`"3[a]2[b]"` → `"aaabb"`
- **深度嵌套**：`"2[a2[b2[c]]]"` → 需要正确处理多层
- **字母在括号外**：`"abc3[d]ef"` → `"abcdddef"`

---

## 常见错误

**错误1：忽略多位数字**

```javascript
// ❌ 只处理一位数字
if (char >= '0' && char <= '9') {
  num = parseInt(char);  // 12 会被当成 2
}

// ✅ 累积计算
if (char >= '0' && char <= '9') {
  num = num * 10 + parseInt(char);
}
```

**错误2：遇到 `]` 时忘记重置 num**

其实不需要在 `]` 时重置 num，因为下一个数字会覆盖它。但如果在 `[` 时忘记重置，就会出问题。

**错误3：递归时忘记推进 index**

```javascript
// ❌ 忘记 index++，会无限循环
if (char === '[') {
  const inner = decode();  // index 没变，一直读到同一个 '['
}
```

---

## 技巧总结

字符串解码的核心：

- **栈处理嵌套**：遇到 `[` 保存上下文，遇到 `]` 恢复上下文
- **两个栈分工**：一个存数字，一个存字符串
- **递归等价**：递归调用栈 = 手动维护的栈

这道题是栈处理嵌套结构的经典例题。类似的问题还有：括号匹配、计算器表达式求值等。

---

## 关联题目

- **LeetCode 20**：有效的括号
- **LeetCode 224**：基本计算器
- **LeetCode 726**：原子的数量（更复杂的解码）
