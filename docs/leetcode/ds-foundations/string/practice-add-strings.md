# 实战：字符串相加

当两个整数大到超出语言的数值范围时，只能用字符串表示。如何对这样的"大数"进行加法运算？

首先要问一个问题：小学学的竖式加法还记得吗？

## 题目描述

> **LeetCode 415. 字符串相加**
>
> 给定两个字符串形式的非负整数 num1 和 num2，计算它们的和并同样以字符串形式返回。
>
> 你**不能**使用任何内建的大整数库，也**不能**直接将输入转换为整数。

**示例**：

```
输入：num1 = "11", num2 = "123"
输出："134"

输入：num1 = "456", num2 = "77"
输出："533"

输入：num1 = "0", num2 = "0"
输出："0"
```

## 竖式加法回顾

小学我们是这样做加法的：

```
    11
+ 123
-----
  134
```

从**右到左**（低位到高位），逐位相加，满十进一。

这就是我们的算法：**模拟竖式加法**。

## 解法：模拟竖式加法

```javascript
function addStrings(num1, num2) {
    let i = num1.length - 1;  // num1 的指针，从末尾开始
    let j = num2.length - 1;  // num2 的指针，从末尾开始
    let carry = 0;            // 进位
    const result = [];
    
    // 只要还有数字或者有进位，就继续
    while (i >= 0 || j >= 0 || carry) {
        // 获取当前位的数字，越界则为 0
        const n1 = i >= 0 ? parseInt(num1[i]) : 0;
        const n2 = j >= 0 ? parseInt(num2[j]) : 0;
        
        // 当前位相加
        const sum = n1 + n2 + carry;
        
        // 当前位结果
        result.push(sum % 10);
        // 进位
        carry = Math.floor(sum / 10);
        
        i--;
        j--;
    }
    
    // 结果是从低位到高位存的，需要反转
    return result.reverse().join('');
}
```

### 关键点解析

现在我要问一个问题：为什么 `while` 的条件是 `i >= 0 || j >= 0 || carry`？

三个条件分别处理三种情况：
- `i >= 0`：num1 还有未处理的位
- `j >= 0`：num2 还有未处理的位
- `carry`：最高位还有进位（比如 "1" + "9" = "10"）

用 `||` 连接表示：只要任一条件成立，就继续循环。这种写法的好处是**统一处理**，不需要循环后单独判断进位。

### 执行过程追踪

以 `num1 = "11", num2 = "123"` 为例：

```
初始：i=1, j=2, carry=0, result=[]

第1轮：
  n1 = num1[1] = '1' → 1
  n2 = num2[2] = '3' → 3
  sum = 1 + 3 + 0 = 4
  result.push(4), carry = 0
  i=0, j=1

第2轮：
  n1 = num1[0] = '1' → 1
  n2 = num2[1] = '2' → 2
  sum = 1 + 2 + 0 = 3
  result.push(3), carry = 0
  i=-1, j=0

第3轮：
  n1 = 0（i < 0，越界）
  n2 = num2[0] = '1' → 1
  sum = 0 + 1 + 0 = 1
  result.push(1), carry = 0
  i=-2, j=-1

退出循环（i < 0 且 j < 0 且 carry = 0）

result = [4, 3, 1]
反转后："134"
```

### 复杂度分析

- **时间复杂度**：O(max(m, n))，m 和 n 分别是两个字符串的长度
- **空间复杂度**：O(max(m, n))，存储结果

## 优化：避免 parseInt

`parseInt` 有一定的解析开销。对于纯数字字符，可以用字符码计算：

```javascript
function addStrings(num1, num2) {
    let i = num1.length - 1;
    let j = num2.length - 1;
    let carry = 0;
    const result = [];
    
    while (i >= 0 || j >= 0 || carry) {
        // 字符 '0' 的 ASCII 码是 48
        const n1 = i >= 0 ? num1.charCodeAt(i) - 48 : 0;
        const n2 = j >= 0 ? num2.charCodeAt(j) - 48 : 0;
        
        const sum = n1 + n2 + carry;
        result.push(sum % 10);
        carry = Math.floor(sum / 10);
        
        i--;
        j--;
    }
    
    return result.reverse().join('');
}
```

`charCodeAt(i) - 48` 等价于 `charCodeAt(i) - '0'.charCodeAt(0)`，将字符 '0'-'9' 转换为数字 0-9。

## 进一步优化：不反转

反转数组有额外开销。我们可以用 `unshift` 或者预先计算结果长度：

```javascript
function addStrings(num1, num2) {
    let i = num1.length - 1;
    let j = num2.length - 1;
    let carry = 0;
    let result = '';
    
    while (i >= 0 || j >= 0 || carry) {
        const n1 = i >= 0 ? num1.charCodeAt(i) - 48 : 0;
        const n2 = j >= 0 ? num2.charCodeAt(j) - 48 : 0;
        
        const sum = n1 + n2 + carry;
        result = (sum % 10) + result;  // 拼接到前面
        carry = Math.floor(sum / 10);
        
        i--;
        j--;
    }
    
    return result;
}
```

**注意**：字符串拼接 `result = x + result` 在 JavaScript 中效率不高（每次都创建新字符串）。对于性能敏感场景，用数组 + `reverse` 反而更快。

这是一个**权衡**：代码简洁性 vs 实际性能。在 LeetCode 的测试规模下，两者差异不大。

## 常见错误

1. **忘记最高位进位**：比如 "1" + "9" = "10"，不是 "0"。循环条件包含 `carry` 可以避免这个问题
2. **结果反转**：我们从低位算到高位，结果数组是反的，别忘了反转
3. **长度不同**：用 `||` 处理两个数长度不同的情况，短的那个用 0 补位

## 模式拓展

这个"竖式模拟"模式适用于很多场景：

- **二进制求和**（LeetCode 67）：把 10 改成 2
- **两数相加（链表版）**（LeetCode 2）：把字符串换成链表
- **字符串相乘**（LeetCode 43）：更复杂的竖式乘法

掌握了基本模式，这些变体都能轻松应对。

## 本章小结

字符串相加的核心是**模拟竖式加法**：

1. 双指针从末尾开始
2. 逐位相加，处理进位
3. 用 `i >= 0 || j >= 0 || carry` 统一处理长度不同和最高位进位

这道题虽然简单，但模式非常实用——是大数运算的基础。

下一章我们来看如何判断两个字符串是否是变位词。
