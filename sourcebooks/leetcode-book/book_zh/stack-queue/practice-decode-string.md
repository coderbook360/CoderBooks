# 实战：字符串解码

这道题展示了栈在处理嵌套结构中的强大能力。编码字符串中的方括号可以层层嵌套，栈天然适合处理这种"后进先出"的结构。

## 问题描述

给定一个经过编码的字符串，返回它解码后的字符串。

编码规则为：`k[encoded_string]`，表示其中方括号内的`encoded_string`正好重复`k`次。注意`k`保证为正整数。

输入字符串总是有效的，不会有额外的空格，方括号形式良好。

**示例**：
```
输入: s = "3[a]2[bc]"
输出: "aaabcbc"
解释: "a"重复3次，"bc"重复2次

输入: s = "3[a2[c]]"
输出: "accaccacc"
解释: 2[c] = "cc"，3[a + cc] = "accaccacc"

输入: s = "2[abc]3[cd]ef"
输出: "abcabccdcdcdef"
```

## 思路分析

### 难点：嵌套结构

考虑`3[a2[c]]`：
1. 先解码内层`2[c]` = "cc"
2. 再解码外层`3[acc]` = "accaccacc"

这是典型的括号嵌套问题，栈是处理它的利器。

### 栈的作用

遇到`[`时，当前状态需要暂存（类似"函数调用"）：
- 当前累积的字符串
- 当前的重复次数

遇到`]`时，恢复之前的状态，并把当前结果合并。

## 完整实现

```javascript
/**
 * @param {string} s
 * @return {string}
 */
function decodeString(s) {
    const stack = [];      // 存储[prevStr, repeatCount]
    let currentStr = '';   // 当前累积的字符串
    let currentNum = 0;    // 当前数字
    
    for (const char of s) {
        if (char >= '0' && char <= '9') {
            // 处理多位数字
            currentNum = currentNum * 10 + parseInt(char);
        } else if (char === '[') {
            // 保存当前状态，开始新的上下文
            stack.push([currentStr, currentNum]);
            currentStr = '';
            currentNum = 0;
        } else if (char === ']') {
            // 恢复之前的状态
            const [prevStr, repeatCount] = stack.pop();
            currentStr = prevStr + currentStr.repeat(repeatCount);
        } else {
            // 普通字母
            currentStr += char;
        }
    }
    
    return currentStr;
}
```

## 执行过程图解

以`3[a2[c]]`为例：

```
字符  操作                    currentStr  currentNum  stack
───────────────────────────────────────────────────────────
'3'   数字，更新num           ''          3          []
'['   入栈，重置              ''          0          [['', 3]]
'a'   字母，累加              'a'         0          [['', 3]]
'2'   数字，更新num           'a'         2          [['', 3]]
'['   入栈，重置              ''          0          [['', 3], ['a', 2]]
'c'   字母，累加              'c'         0          [['', 3], ['a', 2]]
']'   出栈，合并              'acc'       0          [['', 3]]
      (prevStr='a', count=2)
      'a' + 'c'.repeat(2) = 'acc'
']'   出栈，合并              'accaccacc' 0          []
      (prevStr='', count=3)
      '' + 'acc'.repeat(3) = 'accaccacc'

结果: 'accaccacc'
```

## 处理多位数字

题目中数字可能是多位的，如`100[leetcode]`：

```javascript
// 关键代码
if (char >= '0' && char <= '9') {
    currentNum = currentNum * 10 + parseInt(char);
}
```

示例：处理`123`
- 遇到`'1'`：currentNum = 0 × 10 + 1 = 1
- 遇到`'2'`：currentNum = 1 × 10 + 2 = 12
- 遇到`'3'`：currentNum = 12 × 10 + 3 = 123

## 另一种实现：两个栈

思路更清晰的双栈版本：

```javascript
function decodeString(s) {
    const strStack = [];   // 存储字符串
    const numStack = [];   // 存储数字
    let currentStr = '';
    let currentNum = 0;
    
    for (const char of s) {
        if (char >= '0' && char <= '9') {
            currentNum = currentNum * 10 + parseInt(char);
        } else if (char === '[') {
            strStack.push(currentStr);
            numStack.push(currentNum);
            currentStr = '';
            currentNum = 0;
        } else if (char === ']') {
            const prevStr = strStack.pop();
            const repeatCount = numStack.pop();
            currentStr = prevStr + currentStr.repeat(repeatCount);
        } else {
            currentStr += char;
        }
    }
    
    return currentStr;
}
```

## 递归解法

递归天然适合处理嵌套结构：

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
                index++;  // 跳过'['
                const inner = decode();  // 递归处理内层
                result += inner.repeat(num);
                num = 0;
            } else if (char === ']') {
                index++;  // 跳过']'
                return result;  // 返回当前层结果
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

递归版本更直观：每次遇到`[`就进入下一层，遇到`]`就返回当前层结果。

## 边界情况

| 输入 | 分析 | 结果 |
|------|------|------|
| `"abc"` | 无编码 | "abc" |
| `"3[a]"` | 简单编码 | "aaa" |
| `"10[a]"` | 多位数字 | "aaaaaaaaaa" |
| `"3[a2[c]]"` | 嵌套 | "accaccacc" |
| `"2[ab3[cd]]"` | 复杂嵌套 | "abcdcdcdabcdcdcd" |

## 复杂度分析

**时间复杂度：O(n × m)**
- n是解码后字符串长度
- m是嵌套深度

**空间复杂度：O(m)**
- 栈深度取决于嵌套层数

## 与括号匹配的对比

字符串解码和括号匹配都用栈，但处理方式不同：

| 特点 | 括号匹配 | 字符串解码 |
|------|----------|------------|
| 栈存储 | 括号/索引 | 状态(字符串+数字) |
| 入栈时机 | 遇到左括号 | 遇到`[` |
| 出栈时机 | 遇到右括号匹配 | 遇到`]` |
| 出栈操作 | 检查匹配 | 合并字符串 |

## 小结

字符串解码问题的核心：

1. **栈存储状态**：遇到`[`时保存当前上下文
2. **恢复与合并**：遇到`]`时恢复上下文并合并结果
3. **多位数字**：用`num * 10 + digit`累积

这道题的思想在编译器、解析器中非常常见——处理嵌套结构时，栈是不二之选。
