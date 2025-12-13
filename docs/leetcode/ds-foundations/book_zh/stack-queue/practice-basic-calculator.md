# 实战：基本计算器

逆波兰表达式很好算，因为不需要处理括号和优先级。但我们平时写的是中缀表达式：`1 + 2`、`(1 + 2) * 3`、`1 - (2 + 3)`。

这道题要实现一个计算器，处理只包含 `+`、`-`、括号和空格的表达式。看起来简单，但括号的嵌套会让问题变得棘手。

---

## 问题描述

**LeetCode 224. Basic Calculator**

给你一个字符串表达式 `s`，请你实现一个基本计算器来计算并返回它的值。

**示例**：

```
输入：s = "1 + 1"
输出：2

输入：s = " 2-1 + 2 "
输出：3

输入：s = "(1+(4+5+2)-3)+(6+8)"
输出：23
```

**限制**：
- 只有 `+` 和 `-`，没有乘除
- 可能有括号，可能嵌套
- 有空格
- 数字可能是多位

---

## 问题分析

首先思考：这道题的难点在哪？

1. **括号嵌套**：`1-(2+3)` 中，括号前的减号会影响括号内部的符号
2. **符号翻转**：`-(a+b)` 等于 `-a-b`，减号会翻转后面的符号
3. **多位数字**：`123` 需要累积计算

关键洞察：括号的作用是**改变符号**。如果括号前是减号，括号内的所有加减号都要翻转。

---

## 解法：符号栈

用栈来记录"当前的符号状态"。栈顶表示当前括号层级的符号是正还是负。

```javascript
function calculate(s) {
  const stack = [1];  // 符号栈，1 表示正，-1 表示负
  let sign = 1;       // 当前符号
  let result = 0;
  let i = 0;
  
  while (i < s.length) {
    const char = s[i];
    
    if (char === ' ') {
      // 跳过空格
      i++;
    } else if (char === '+') {
      // 加号：符号 = 栈顶（不翻转）
      sign = stack[stack.length - 1];
      i++;
    } else if (char === '-') {
      // 减号：符号 = -栈顶（翻转）
      sign = -stack[stack.length - 1];
      i++;
    } else if (char === '(') {
      // 左括号：将当前符号入栈
      stack.push(sign);
      sign = 1;  // 重置，因为括号内从正号开始
      i++;
    } else if (char === ')') {
      // 右括号：出栈
      stack.pop();
      i++;
    } else {
      // 数字：可能是多位
      let num = 0;
      while (i < s.length && s[i] >= '0' && s[i] <= '9') {
        num = num * 10 + parseInt(s[i]);
        i++;
      }
      result += sign * num;
    }
  }
  
  return result;
}
```

---

## 执行过程可视化

以 `s = "1-(2+3)"` 为例：

```
i=0, '1': 
  num = 1
  result = 0 + 1*1 = 1
  sign = 1（默认）

i=1, '-': 
  sign = -stack[0] = -1

i=2, '(':
  push(sign=-1) → stack = [1, -1]
  sign = 1

i=3, '2':
  但是！这里的理解需要修正...

让我重新解释这个算法的思路：

实际上，更好理解的版本是：

i=0, '1': num=1, result=0+1*1=1
i=1, '-': sign=-1
i=2, '(': stack.push(-1), stack=[1,-1]
i=3, '2': 
  当前符号 = stack.top() * (括号内的符号)
  这里括号内是第一个数，默认正号
  实际符号 = -1 * 1 = -1
  result = 1 + (-1)*2 = -1
i=4, '+': 括号内的正号，实际符号 = -1 * 1 = -1
i=5, '3': result = -1 + (-1)*3 = -4
i=6, ')': stack.pop()

最终 result = -4

验证：1-(2+3) = 1-5 = -4 ✓
```

---

## 另一种理解方式

让我用更直观的方式重写：

```javascript
function calculate(s) {
  let result = 0;
  let num = 0;
  let sign = 1;           // 当前数字前的符号（1 或 -1）
  const stack = [];       // 存储遇到括号前的 result 和 sign
  
  for (const char of s) {
    if (char >= '0' && char <= '9') {
      num = num * 10 + parseInt(char);
    } else if (char === '+') {
      result += sign * num;
      num = 0;
      sign = 1;
    } else if (char === '-') {
      result += sign * num;
      num = 0;
      sign = -1;
    } else if (char === '(') {
      // 保存当前状态
      stack.push(result);
      stack.push(sign);
      // 重置，开始计算括号内部
      result = 0;
      sign = 1;
    } else if (char === ')') {
      // 先处理括号内最后一个数
      result += sign * num;
      num = 0;
      // 恢复状态
      const prevSign = stack.pop();  // 括号前的符号
      const prevResult = stack.pop();  // 括号前的结果
      result = prevResult + prevSign * result;
    }
  }
  
  // 处理最后一个数
  result += sign * num;
  
  return result;
}
```

### 执行过程（第二版）

以 `s = "1-(2+3)"` 为例：

```
遍历：

'1': num = 1

'-': 
  result = 0 + 1*1 = 1
  num = 0
  sign = -1

'(': 
  stack.push(1)    // 保存 result
  stack.push(-1)   // 保存 sign
  result = 0, sign = 1

'2': num = 2

'+':
  result = 0 + 1*2 = 2
  num = 0
  sign = 1

'3': num = 3

')':
  result = 2 + 1*3 = 5（括号内的结果）
  prevSign = -1, prevResult = 1
  result = 1 + (-1)*5 = -4

最终 result = -4 ✓
```

---

## 解法二：递归

递归的思路是：遇到 `(` 就递归处理括号内部，遇到 `)` 就返回。

```javascript
function calculate(s) {
  let index = 0;
  
  function calc() {
    let result = 0;
    let sign = 1;
    let num = 0;
    
    while (index < s.length) {
      const char = s[index];
      
      if (char >= '0' && char <= '9') {
        num = num * 10 + parseInt(char);
      } else if (char === '+') {
        result += sign * num;
        num = 0;
        sign = 1;
      } else if (char === '-') {
        result += sign * num;
        num = 0;
        sign = -1;
      } else if (char === '(') {
        index++;  // 跳过 '('
        num = calc();  // 递归计算括号内
      } else if (char === ')') {
        result += sign * num;
        return result;
      }
      index++;
    }
    
    return result + sign * num;
  }
  
  return calc();
}
```

---

## 复杂度分析

- **时间复杂度**：O(n)，遍历一次字符串
- **空间复杂度**：O(n)，栈的深度取决于括号嵌套层数

---

## 边界情况

- **无括号**：`"1+2-3"` → 正常计算
- **嵌套括号**：`"1-(2-(3+4))"` → 正确处理嵌套
- **有空格**：`" 2 - 1 "` → 跳过空格
- **多位数**：`"123+456"` → 累积计算

---

## 常见错误

**错误1：忘记处理最后一个数**

```javascript
// ❌ 表达式 "1+2" 在循环中只处理了 1
// 最后的 2 没有被加到 result

// ✅ 循环结束后要处理最后一个数
return result + sign * num;
```

**错误2：多位数字处理错误**

```javascript
// ❌ 只取一位
num = parseInt(char);

// ✅ 累积计算
num = num * 10 + parseInt(char);
```

**错误3：括号后符号丢失**

括号后面可能紧跟运算符或数字，需要正确处理状态恢复。

---

## 技巧总结

基本计算器的核心：

- **栈保存上下文**：括号前的 result 和 sign
- **符号翻转**：减号会影响后面的符号
- **多位数字**：累积计算
- **递归等价**：递归调用栈 = 手动维护的栈

这道题是表达式求值的基础，掌握后可以扩展到处理乘除、处理多层优先级等更复杂的场景。

---

## 关联题目

- **LeetCode 227**：基本计算器 II（加减乘除，无括号）
- **LeetCode 772**：基本计算器 III（加减乘除，有括号）
- **LeetCode 150**：逆波兰表达式求值
