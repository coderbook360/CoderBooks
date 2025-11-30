# 字符串的存储与基本操作

字符串是编程中最常用的数据类型之一。在 LeetCode 中，大约有 20% 的题目涉及字符串操作。

这一章，我们来系统学习字符串的基础知识和常用方法。

## 字符串的本质

字符串是**字符的有序序列**。

在 JavaScript 中，字符串使用 UTF-16 编码存储，每个字符占 2 个字节（但某些特殊字符会占 4 个字节）。

```
字符串 "hello" 的存储：

索引 | 字符 | Unicode
----|------|--------
 0  |  'h' | 0x0068
 1  |  'e' | 0x0065
 2  |  'l' | 0x006C
 3  |  'l' | 0x006C
 4  |  'o' | 0x006F
```

### 不可变性

JavaScript 字符串有一个重要特性：**不可变（Immutable）**。

一旦字符串被创建，就无法修改它的内容。

```javascript
let str = 'hello';
str[0] = 'H';  // 无效！不会报错，但也不会修改
console.log(str);  // 'hello'

// 只能通过创建新字符串来"修改"
str = 'H' + str.slice(1);  // 'Hello'
```

这和数组不同。数组是可变的，可以直接修改元素：

```javascript
const arr = [1, 2, 3];
arr[0] = 100;  // 有效
console.log(arr);  // [100, 2, 3]
```

**为什么要不可变？**

不可变性让字符串更安全、更易于优化。但也意味着频繁修改字符串的操作会有性能问题（每次都创建新字符串）。

## 字符串的创建与访问

### 创建字符串

```javascript
// 字面量（最常用）
const str1 = 'hello';
const str2 = "hello";  // 单引号和双引号等价
const str3 = `hello`;  // 模板字符串（ES6）

// String 函数
const str4 = String(123);  // '123'

// String 对象（不推荐）
const str5 = new String('hello');  // String 对象，不是原始值
```

### 访问字符

```javascript
const str = 'hello';

// 通过索引
str[0];           // 'h'
str[str.length - 1];  // 'o'

// charAt 方法（等价）
str.charAt(0);    // 'h'

// 获取字符的 Unicode 码
str.charCodeAt(0);  // 104

// 获取长度
str.length;       // 5
```

## 常用字符串方法

### 查找方法

```javascript
const str = 'hello world';

// indexOf：找第一次出现的位置
str.indexOf('o');       // 4
str.indexOf('x');       // -1（未找到）

// lastIndexOf：找最后一次出现的位置
str.lastIndexOf('o');   // 7

// includes：是否包含（ES6）
str.includes('world');  // true

// startsWith / endsWith（ES6）
str.startsWith('hello'); // true
str.endsWith('world');   // true
```

### 截取方法

```javascript
const str = 'hello world';

// slice(start, end) —— 推荐
str.slice(0, 5);    // 'hello'（不包含 end）
str.slice(6);       // 'world'（省略 end 表示到结尾）
str.slice(-5);      // 'world'（负数表示从末尾数）

// substring(start, end) —— 也可以用
str.substring(0, 5);  // 'hello'
// 不支持负数索引，负数会被当作 0

// substr(start, length) —— 已废弃，不推荐
```

**选择哪个？**

推荐用 `slice`：
- 语法最灵活
- 支持负数索引
- 与数组的 `slice` 行为一致

### 转换方法

```javascript
// 大小写
'Hello'.toLowerCase();  // 'hello'
'Hello'.toUpperCase();  // 'HELLO'

// 去空格
'  hello  '.trim();       // 'hello'
'  hello  '.trimStart();  // 'hello  '
'  hello  '.trimEnd();    // '  hello'

// 重复
'ab'.repeat(3);  // 'ababab'

// 填充（ES2017）
'5'.padStart(3, '0');  // '005'
'5'.padEnd(3, '0');    // '500'
```

### 分割与连接

```javascript
// split：字符串 → 数组
'a,b,c'.split(',');     // ['a', 'b', 'c']
'hello'.split('');      // ['h', 'e', 'l', 'l', 'o']

// join：数组 → 字符串
['a', 'b', 'c'].join('-');  // 'a-b-c'
['h', 'e', 'l', 'l', 'o'].join('');  // 'hello'
```

### 替换方法

```javascript
// replace：替换第一个匹配
'hello'.replace('l', 'L');  // 'heLlo'

// replaceAll：替换所有（ES2021）
'hello'.replaceAll('l', 'L');  // 'heLLo'

// 使用正则全局替换（兼容老浏览器）
'hello'.replace(/l/g, 'L');  // 'heLLo'
```

## 字符串与数组的转换

由于字符串是不可变的，很多操作需要：
1. 转成数组
2. 操作数组
3. 转回字符串

这是 LeetCode 字符串题的常见模式。

```javascript
// 字符串 → 数组
const str = 'hello';
const arr1 = str.split('');      // ['h', 'e', 'l', 'l', 'o']
const arr2 = [...str];           // ['h', 'e', 'l', 'l', 'o']
const arr3 = Array.from(str);    // ['h', 'e', 'l', 'l', 'o']

// 数组 → 字符串
arr1.join('');  // 'hello'

// 例子：反转字符串
function reverseString(s) {
    return s.split('').reverse().join('');
}
reverseString('hello');  // 'olleh'
```

## Unicode 与特殊字符

```javascript
// 获取字符的 Unicode 码点
'A'.charCodeAt(0);      // 65
'中'.charCodeAt(0);     // 20013

// 从码点创建字符
String.fromCharCode(65);     // 'A'
String.fromCharCode(20013);  // '中'
```

### emoji 的坑

emoji 和一些特殊字符在 JavaScript 中是"代理对"，占两个 UTF-16 编码单元：

```javascript
'😀'.length;           // 2（不是 1！）
'😀'[0];               // '\uD83D'（乱码）
'😀'.charCodeAt(0);    // 55357（代理对的前半部分）

// 正确处理：使用展开运算符或 codePointAt
[...'😀'].length;      // 1（正确）
'😀'.codePointAt(0);   // 128512（完整码点）
```

在 LeetCode 题目中，通常不会遇到 emoji，但了解这个坑是有益的。

## 性能注意事项

由于字符串不可变，频繁拼接会有性能问题：

```javascript
// ❌ 不好：每次 += 都创建新字符串
let result = '';
for (let i = 0; i < 10000; i++) {
    result += 'x';
}

// ✅ 好：用数组收集，最后 join
const parts = [];
for (let i = 0; i < 10000; i++) {
    parts.push('x');
}
const result = parts.join('');
```

现代 JavaScript 引擎对字符串拼接有优化，小规模操作差别不大。但在处理大量数据时，使用数组是更稳妥的选择。

## 本章小结

这一章我们学习了字符串的基础知识：

1. **不可变性**：字符串一旦创建就不能修改
2. **常用方法**：
   - 查找：`indexOf`, `includes`, `startsWith`
   - 截取：`slice`（推荐）
   - 转换：`toLowerCase`, `toUpperCase`, `trim`
   - 分割连接：`split`, `join`
3. **与数组的转换**：`split('')` 和 `join('')`
4. **特殊字符**：注意 emoji 的长度问题

掌握这些基础，你就具备了处理字符串题目的能力。

下一章，我们来看字符串的各种**遍历与匹配模式**。
