# 字符串的内部表示：编码方式与优化策略

在第7章中，我们简要介绍了字符串的存储方式。现在让我们深入探讨 V8 如何在内部表示字符串，特别是编码方式和各种优化策略。

字符串是 JavaScript 中最常用的类型之一，但也是最复杂的类型之一。看看这些场景：

```javascript
let ascii = "hello";             // 纯 ASCII
let chinese = "你好世界";         // 中文
let emoji = "😀👍🎉";            // Emoji
let mixed = "Hello世界😀";       // 混合
let long = "a".repeat(1000000);  // 超长字符串
let concat = "hello" + "world";  // 拼接
let substr = long.substring(0, 10);  // 切片
```

V8 如何高效地处理这些不同场景的字符串？答案在于**多种字符串表示类型**和**延迟复制策略**。

## JavaScript 字符串与 Unicode

### JavaScript 字符串的本质

JavaScript 字符串是 **UTF-16** 编码的字符序列。每个字符单元（Code Unit）是 16 位（2 字节）。

```javascript
let str = "A";
console.log(str.length);  // 1
console.log(str.charCodeAt(0));  // 65（'A' 的 Unicode 码点）
```

但 UTF-16 的复杂性在于，某些字符需要**两个 16 位单元**表示（代理对，Surrogate Pairs）：

```javascript
let emoji = "😀";
console.log(emoji.length);  // 2（不是 1！）
console.log(emoji.charCodeAt(0));  // 55357（高位代理）
console.log(emoji.charCodeAt(1));  // 56832（低位代理）
```

**代理对**：Unicode 码点范围 U+10000 ~ U+10FFFF 的字符（包括大部分 Emoji）需要用两个 16 位单元表示。

### ECMAScript 规范中的字符串

ECMAScript 规范定义字符串为"16 位无符号整数值的序列"。这意味着：

- `length` 属性返回的是 16 位单元的数量，而不是字符数量
- 字符串索引访问的是 16 位单元，而不是完整字符

```javascript
let str = "😀A";
console.log(str.length);    // 3（代理对 + 'A'）
console.log(str[0]);        // �（高位代理，无效字符）
console.log(str[1]);        // �（低位代理，无效字符）
console.log(str[2]);        // 'A'
```

要正确处理 Unicode 字符，应该使用：

```javascript
// 使用 Array.from 或展开运算符
console.log(Array.from("😀A").length);  // 2（正确的字符数）

// 使用 for...of 循环
for (let char of "😀A") {
  console.log(char);  // 依次输出 "😀" 和 "A"
}

// 使用 codePointAt 和 String.fromCodePoint
let codePoint = "😀".codePointAt(0);
console.log(codePoint);  // 128512（完整的 Unicode 码点）
console.log(String.fromCodePoint(codePoint));  // "😀"
```

## V8 中的字符串类型体系

V8 内部有多种字符串表示类型，根据不同场景选择最优的表示方式。

### 字符串类型层次结构

```
String（抽象基类）
├─ SeqString（顺序字符串）
│  ├─ SeqOneByteString（1 字节编码）
│  └─ SeqTwoByteString（2 字节编码）
├─ ConsString（拼接字符串）
├─ SlicedString（切片字符串）
└─ ExternalString（外部字符串）
```

### SeqString：顺序字符串

**SeqString**（Sequential String）是最基本的字符串类型，字符数据连续存储在内存中。

**SeqOneByteString**：每个字符 1 字节（Latin-1 编码）

```
SeqOneByteString 内存布局：

┌─────────────────────┐
│   Map Pointer       │  指向 SeqOneByteString Map
├─────────────────────┤
│   Hash Code         │  字符串哈希值（4 字节）
├─────────────────────┤
│   Length            │  字符串长度（4 字节）
├─────────────────────┤
│   Char Data         │  字符数据（length 字节）
│   'h' 'e' 'l' 'l' '│  每个字符 1 字节
│   'o' ...          │
└─────────────────────┘
```

**SeqTwoByteString**：每个字符 2 字节（UTF-16 编码）

```
SeqTwoByteString 内存布局：

┌─────────────────────┐
│   Map Pointer       │  指向 SeqTwoByteString Map
├─────────────────────┤
│   Hash Code         │
├─────────────────────┤
│   Length            │
├─────────────────────┤
│   Char Data         │  字符数据（length * 2 字节）
│   '你' '好' '世'   │  每个字符 2 字节
│   '界' ...          │
└─────────────────────┘
```

**V8 的选择策略**：

- 如果字符串只包含 Latin-1 字符（码点 0-255），使用 `SeqOneByteString`（节省 50% 内存）
- 否则使用 `SeqTwoByteString`

```javascript
let ascii = "hello";      // SeqOneByteString（5 字节）
let chinese = "你好";     // SeqTwoByteString（4 字节 = 2 字符 * 2）
let mixed = "hello你好";  // SeqTwoByteString（14 字节 = 7 字符 * 2）
```

注意：一旦字符串中包含任何非 Latin-1 字符，**整个字符串**都会使用 2 字节编码。

### ConsString：拼接字符串

当两个字符串拼接时，V8 不会立即复制数据，而是创建一个 **ConsString**（Concatenated String），存储两个子字符串的引用。

```javascript
let s1 = "hello";
let s2 = "world";
let s3 = s1 + s2;  // 创建 ConsString，不复制数据
```

**ConsString 内存布局**：

```
ConsString：

┌─────────────────────┐
│   Map Pointer       │  指向 ConsString Map
├─────────────────────┤
│   Hash Code         │
├─────────────────────┤
│   Length            │  总长度（10）
├─────────────────────┤
│   Left Pointer      │  指向 "hello"（SeqOneByteString）
├─────────────────────┤
│   Right Pointer     │  指向 "world"（SeqOneByteString）
└─────────────────────┘
```

**延迟复制**：只有在真正访问字符串内容时，V8 才会将 ConsString **扁平化**（Flatten）为 SeqString。

```javascript
let s = "hello" + "world";
// 此时是 ConsString

let char = s[5];  // 访问字符，触发扁平化
// 现在是 SeqOneByteString
```

**ConsString 的优势**：
- 拼接操作 O(1) 时间复杂度
- 避免大量字符串拷贝
- 延迟到真正需要时才扁平化

**缺点**：
- 访问字符需要遍历树结构（如果是嵌套 ConsString）
- 扁平化有一次性开销

### SlicedString：切片字符串

`substring` 和 `slice` 操作不会立即复制数据，而是创建一个 **SlicedString**，引用父字符串的一部分。

```javascript
let original = "hello world";
let part = original.substring(0, 5);  // 创建 SlicedString
```

**SlicedString 内存布局**：

```
SlicedString：

┌─────────────────────┐
│   Map Pointer       │  指向 SlicedString Map
├─────────────────────┤
│   Hash Code         │
├─────────────────────┤
│   Length            │  5
├─────────────────────┤
│   Parent Pointer    │  指向 "hello world"（SeqString）
├─────────────────────┤
│   Offset            │  起始偏移量（0）
└─────────────────────┘
```

**SlicedString 的优势**：
- 切片操作 O(1) 时间复杂度
- 避免数据复制
- 多个切片可以共享同一个父字符串

**注意**：SlicedString 会持有父字符串的引用，可能导致**内存泄漏**。

```javascript
let huge = "a".repeat(10000000);  // 10MB 字符串
let small = huge.substring(0, 10);  // 只需要 10 字节

// 但 small（SlicedString）持有 huge 的引用，
// huge 无法被垃圾回收！
```

**解决方法**：强制扁平化

```javascript
let small = (" " + huge.substring(0, 10)).trim();
// 拼接和 trim 会创建新的 SeqString，断开对 huge 的引用
```

### ExternalString：外部字符串

**ExternalString** 用于引用 V8 堆外的字符串数据（如 C++ 字符串）。

常用于：
- 嵌入 V8 的 C++ 程序传递字符串
- 读取大文件内容时避免复制

```
ExternalString 内存布局：

┌─────────────────────┐
│   Map Pointer       │
├─────────────────────┤
│   Hash Code         │
├─────────────────────┤
│   Length            │
├─────────────────────┤
│   External Pointer  │  指向堆外的字符数据
└─────────────────────┘
```

## 字符串的哈希与缓存

### 字符串哈希（Hash Code）

V8 为每个字符串计算哈希值，用于：
- 字符串作为对象属性键时的快速查找
- 字符串常量池的查找

哈希值在**第一次需要时**计算，然后缓存在字符串对象中。

```javascript
let obj = {};
obj["hello"] = 42;  // 计算 "hello" 的哈希值

// 后续访问直接使用缓存的哈希值
console.log(obj["hello"]);
```

### 字符串常量池（String Internning）

V8 维护一个**字符串表**（String Table），相同的字符串常量共享同一个对象。

```javascript
let s1 = "hello";
let s2 = "hello";
console.log(s1 === s2);  // true（指向同一个对象）
```

**字符串表实现**：
- 哈希表结构
- 键是字符串的哈希值
- 值是字符串对象的指针

**进入常量池的时机**：
- 字符串字面量（如 `"hello"`）
- 编译期可确定的表达式（如 `"hel" + "lo"`）

**不进入常量池的情况**：
- 运行时动态生成的字符串

```javascript
let s3 = "hel";
let s4 = s3 + "lo";
console.log(s4 === s1);  // false（动态生成，不同对象）
```

## 字符串操作的性能特征

### 字符串拼接

**最慢**：循环中的字符串拼接

```javascript
// ❌ 坏：每次迭代创建新 ConsString，可能需要多次扁平化
let result = "";
for (let i = 0; i < 10000; i++) {
  result += "a";  // 10000 次拼接
}
```

**更快**：使用数组join

```javascript
// ✅ 好：一次性分配内存，避免多次拼接
let arr = [];
for (let i = 0; i < 10000; i++) {
  arr.push("a");
}
let result = arr.join("");
```

**最快**：使用 `repeat`（如果适用）

```javascript
// ✅ 最好：V8 内部优化
let result = "a".repeat(10000);
```

### 字符串比较

**相同对象**：指针比较，极快

```javascript
let s1 = "hello";
let s2 = "hello";
console.log(s1 === s2);  // 指针比较，O(1)
```

**不同对象**：逐字符比较

```javascript
let s3 = "hel" + "lo";
let s4 = "hello";
console.log(s3 === s4);  // 逐字符比较，O(n)
```

### 字符串查找

V8 对字符串查找进行了优化：

```javascript
let str = "hello world";
console.log(str.indexOf("world"));  // 使用优化的搜索算法
```

- 短模式：Boyer-Moore-Horspool 算法
- 长模式：优化的暴力搜索

## 字符串的内存占用

### 内存开销计算

以64位系统为例：

**SeqOneByteString**：
- Map指针：8 字节
- Hash：4 字节
- Length：4 字节
- 字符数据：length 字节
- **总计**：16 + length 字节

**SeqTwoByteString**：
- **总计**：16 + length * 2 字节

**示例**：

```javascript
let s1 = "hello";         // 16 + 5 = 21 字节
let s2 = "你好";          // 16 + 2*2 = 20 字节
let s3 = "hello你好";     // 16 + 7*2 = 30 字节（全部用 2 字节）
```

### 内存优化建议

**1. 避免不必要的字符串创建**

```javascript
// ❌ 坏：每次迭代创建新字符串
for (let i = 0; i < 1000; i++) {
  console.log("Iteration: " + i);
}

// ✅ 好：使用模板字符串（性能相当，更清晰）
for (let i = 0; i < 1000; i++) {
  console.log(`Iteration: ${i}`);
}
```

**2. 重用字符串**

```javascript
// ❌ 坏
function log(level, message) {
  console.log(level + ": " + message);  // 每次调用创建新字符串
}

// ✅ 好
const LOG_PREFIX = {
  info: "INFO: ",
  error: "ERROR: "
};
function log(level, message) {
  console.log(LOG_PREFIX[level] + message);  // 重用前缀字符串
}
```

**3. 注意 SlicedString 的内存泄漏**

```javascript
// ❌ 坏：持有大字符串的引用
let huge = readHugeFile();
let small = huge.substring(0, 10);

// ✅ 好：强制创建新字符串
let small = (" " + huge.substring(0, 10)).trim();
```

## 本章小结

本章我们深入理解了 V8 如何表示和优化字符串。核心要点：

1. **JavaScript 字符串是 UTF-16 编码**，某些字符需要两个 16 位单元表示
2. **V8 有多种字符串类型**：SeqString（顺序）、ConsString（拼接）、SlicedString（切片）、ExternalString（外部）
3. **编码优化**：只包含 Latin-1 字符的字符串使用 1 字节编码，节省 50% 内存
4. **延迟复制**：拼接和切片操作延迟到真正需要时才复制数据
5. **字符串常量池**：相同的字符串字面量共享同一个对象
6. **性能优化**：避免循环拼接，注意 SlicedString 内存泄漏，重用字符串

理解字符串的内部表示，是优化 JavaScript 应用性能的重要基础。在接下来的章节中，我们将探讨 JSON 处理、对象内存结构等更复杂的主题。

---

**思考题**：

1. 为什么 V8 不对所有字符串都使用 2 字节编码，而是区分 1 字节和 2 字节？
2. ConsString 的树结构可能会很深，V8 如何避免栈溢出？
3. 如果你要设计一个字符串系统，你会如何权衡内存占用和访问速度？
