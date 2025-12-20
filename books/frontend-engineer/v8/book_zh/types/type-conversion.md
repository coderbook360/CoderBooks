# 类型转换与运算符：ToPrimitive 与隐式转换机制

在前面的章节中，我们了解了 JavaScript 基本类型的存储方式。但在实际编程中，类型之间经常需要相互转换。看看这些有趣的现象：

```javascript
console.log(1 + "2");       // "12"（数字变字符串）
console.log("5" - 2);       // 3（字符串变数字）
console.log([] + []);       // ""（数组变字符串）
console.log({} + {});       // "[object Object][object Object]"
console.log(!![]);          // true（数组变布尔值）
```

这些看似"诡异"的行为背后，有着明确的规则和底层机制。理解类型转换（Type Conversion）是掌握 JavaScript 的关键，也是避免 bug 的基础。

本章将深入探讨 V8 如何实现类型转换，特别是 **ToPrimitive** 这个核心抽象操作。

## 显式转换 vs 隐式转换

JavaScript 的类型转换分为两类：

### 显式转换（Explicit Conversion）

程序员主动调用转换函数：

```javascript
let num = Number("42");     // 字符串 → 数字
let str = String(123);      // 数字 → 字符串
let bool = Boolean(0);      // 数字 → 布尔值
```

### 隐式转换（Implicit Conversion / Type Coercion）

JavaScript 引擎在运算时自动执行的转换：

```javascript
let result = "5" * 2;       // 自动将 "5" 转为数字 5
if ("hello") {              // 自动将 "hello" 转为 true
  console.log("truthy");
}
```

隐式转换是 JavaScript "灵活性"的来源，但也是许多 bug 的根源。

## ECMAScript 规范中的转换抽象操作

ECMAScript 规范定义了一系列**抽象操作**（Abstract Operations），用于描述类型转换的规则。V8 的实现严格遵循这些规范。

主要的转换操作包括：

- **ToPrimitive**：将对象转换为原始值
- **ToNumber**：转换为数字
- **ToString**：转换为字符串
- **ToBoolean**：转换为布尔值

让我们逐一深入理解。

## ToPrimitive：对象转原始值

**ToPrimitive** 是最核心的抽象操作，用于将对象转换为原始值（数字、字符串、布尔值等）。

### ToPrimitive 的签名

```
ToPrimitive(input [, PreferredType])
```

- **input**：要转换的值
- **PreferredType**：可选参数，提示转换的目标类型（`"number"` 或 `"string"`）

### ToPrimitive 的执行流程

**1. 如果 input 已经是原始值，直接返回**

```javascript
ToPrimitive(42);       // 42（已经是数字）
ToPrimitive("hello");  // "hello"（已经是字符串）
```

**2. 如果 input 是对象，调用内部方法**

根据 PreferredType 的不同，按不同顺序调用对象的方法：

- **PreferredType 是 `"number"`**（或默认）：
  1. 调用 `valueOf()`
  2. 如果结果是原始值，返回
  3. 否则调用 `toString()`
  4. 如果结果是原始值，返回
  5. 否则抛出 `TypeError`

- **PreferredType 是 `"string"`**：
  1. 调用 `toString()`
  2. 如果结果是原始值，返回
  3. 否则调用 `valueOf()`
  4. 如果结果是原始值，返回
  5. 否则抛出 `TypeError`

### 示例：对象转数字

```javascript
let obj = {
  valueOf() {
    console.log("valueOf called");
    return 42;
  },
  toString() {
    console.log("toString called");
    return "hello";
  }
};

console.log(Number(obj));  // 输出：valueOf called → 42
```

**执行过程**：
1. `Number(obj)` 调用 `ToPrimitive(obj, "number")`
2. 首先调用 `obj.valueOf()`，返回 `42`（原始值）
3. 直接返回 `42`

### 示例：对象转字符串

```javascript
console.log(String(obj));  // 输出：toString called → "hello"
```

**执行过程**：
1. `String(obj)` 调用 `ToPrimitive(obj, "string")`
2. 首先调用 `obj.toString()`，返回 `"hello"`（原始值）
3. 直接返回 `"hello"`

### 示例：没有 valueOf 时

```javascript
let obj2 = {
  toString() {
    return "object2";
  }
};

console.log(Number(obj2));  // 输出：NaN
```

**执行过程**：
1. `Number(obj2)` 调用 `ToPrimitive(obj2, "number")`
2. 首先调用 `obj2.valueOf()`，返回 `obj2` 本身（不是原始值）
3. 然后调用 `obj2.toString()`，返回 `"object2"`（原始值）
4. 将 `"object2"` 转为数字，结果是 `NaN`

### Symbol.toPrimitive：自定义转换行为

ES6 引入了 **Symbol.toPrimitive**，允许对象完全控制 ToPrimitive 的行为：

```javascript
let obj = {
  [Symbol.toPrimitive](hint) {
    console.log(`hint: ${hint}`);
    if (hint === "number") {
      return 42;
    }
    if (hint === "string") {
      return "hello";
    }
    return true;  // default hint
  }
};

console.log(Number(obj));  // 输出：hint: number → 42
console.log(String(obj));  // 输出：hint: string → "hello"
console.log(obj + "");     // 输出：hint: default → true
```

如果对象定义了 `Symbol.toPrimitive`，会**优先调用**它，忽略 `valueOf` 和 `toString`。

## ToNumber：转换为数字

**ToNumber** 将值转换为数字类型。

### ToNumber 的规则

| 输入类型 | 结果 |
|:---|:---|
| `undefined` | `NaN` |
| `null` | `0` |
| `Boolean` | `true` → `1`，`false` → `0` |
| `Number` | 不变 |
| `String` | 解析字符串（见下文） |
| `Symbol` | 抛出 `TypeError` |
| `BigInt` | 抛出 `TypeError` |
| `Object` | `ToPrimitive(obj, "number")`，然后递归 `ToNumber` |

### 字符串转数字的规则

```javascript
console.log(Number("42"));       // 42
console.log(Number("3.14"));     // 3.14
console.log(Number("  42  "));   // 42（忽略首尾空格）
console.log(Number(""));         // 0（空字符串！）
console.log(Number("0x10"));     // 16（十六进制）
console.log(Number("1e3"));      // 1000（科学计数法）
console.log(Number("hello"));    // NaN
console.log(Number("12abc"));    // NaN（非法字符）
```

**V8 实现**：
- 使用专门的字符串解析器（类似 `strtod` 函数）
- 支持十进制、十六进制、科学计数法
- 性能经过高度优化

### 一元加号运算符

`+value` 是显式调用 `ToNumber` 的快捷方式：

```javascript
console.log(+"42");      // 42
console.log(+"3.14");    // 3.14
console.log(+true);      // 1
console.log(+"");        // 0
console.log(+"hello");   // NaN
```

在实际代码中，`+` 常用于快速将字符串转为数字：

```javascript
let str = "123";
let num = +str;  // 等价于 Number(str)
```

## ToString：转换为字符串

**ToString** 将值转换为字符串类型。

### ToString 的规则

| 输入类型 | 结果 |
|:---|:---|
| `undefined` | `"undefined"` |
| `null` | `"null"` |
| `Boolean` | `"true"` 或 `"false"` |
| `Number` | 数字的字符串表示（见下文） |
| `String` | 不变 |
| `Symbol` | 抛出 `TypeError`（显式调用）或返回描述（隐式） |
| `BigInt` | 不带 `n` 后缀的字符串 |
| `Object` | `ToPrimitive(obj, "string")`，然后递归 `ToString` |

### 数字转字符串的规则

```javascript
console.log(String(42));         // "42"
console.log(String(3.14));       // "3.14"
console.log(String(NaN));        // "NaN"
console.log(String(Infinity));   // "Infinity"
console.log(String(0));          // "0"
console.log(String(-0));         // "0"（注意：-0 转为 "0"）
```

**科学计数法**：

```javascript
console.log(String(1e21));       // "1e+21"
console.log(String(1e-7));       // "1e-7"
```

### 对象转字符串

```javascript
let obj = { x: 1, y: 2 };
console.log(String(obj));  // "[object Object]"

let arr = [1, 2, 3];
console.log(String(arr));  // "1,2,3"
```

**默认 toString 行为**：
- 普通对象：调用 `Object.prototype.toString()`，返回 `"[object Object]"`
- 数组：调用 `Array.prototype.toString()`，等价于 `arr.join(",")`

### 模板字符串中的隐式转换

```javascript
let name = "Alice";
let age = 30;
console.log(`Name: ${name}, Age: ${age}`);  
// 自动调用 ToString(age)
```

## ToBoolean：转换为布尔值

**ToBoolean** 是最简单的转换：将值转换为 `true` 或 `false`。

### ToBoolean 的规则

**Falsy 值**（转换为 `false`）：
- `undefined`
- `null`
- `false`
- `0`、`-0`、`0n`（BigInt 零）
- `NaN`
- `""`（空字符串）

**其他所有值都是 Truthy**（转换为 `true`），包括：
- 所有对象（包括空对象 `{}`、空数组 `[]`）
- 非零数字
- 非空字符串（包括 `"0"`、`"false"`）

示例：

```javascript
console.log(Boolean(0));           // false
console.log(Boolean(""));          // false
console.log(Boolean(null));        // false
console.log(Boolean(undefined));   // false
console.log(Boolean(NaN));         // false

console.log(Boolean({}));          // true（空对象！）
console.log(Boolean([]));          // true（空数组！）
console.log(Boolean("0"));         // true（字符串"0"！）
console.log(Boolean("false"));     // true（字符串"false"！）
```

### 条件判断中的隐式转换

```javascript
if (value) {
  // ToBoolean(value) === true
}

value ? true_branch : false_branch;  // 三元运算符

value || default_value;  // 逻辑或
value && do_something();  // 逻辑与
```

V8 在字节码层面对 ToBoolean 进行了高度优化，避免实际的类型转换开销。

## 运算符中的类型转换

不同运算符触发不同的类型转换。

### 加号运算符（+）

`+` 是最复杂的运算符，因为它既可以表示数学加法，也可以表示字符串拼接。

**规则**：
1. 将两边的值转换为原始值（`ToPrimitive`）
2. 如果任意一边是字符串，执行字符串拼接
3. 否则执行数学加法

示例：

```javascript
console.log(1 + 2);         // 3（数学加法）
console.log("1" + 2);       // "12"（字符串拼接）
console.log(1 + "2");       // "12"（字符串拼接）
console.log("1" + "2");     // "12"（字符串拼接）

console.log(true + 1);      // 2（true → 1）
console.log(false + 1);     // 1（false → 0）
console.log(null + 1);      // 1（null → 0）
console.log(undefined + 1); // NaN（undefined → NaN）

console.log([] + []);       // ""（[] → ""，字符串拼接）
console.log({} + {});       // "[object Object][object Object]"
console.log([1, 2] + [3, 4]);  // "1,23,4"
```

### 其他算术运算符（-, *, /, %）

这些运算符只执行数学运算，**总是将操作数转为数字**：

```javascript
console.log("5" - 2);       // 3（"5" → 5）
console.log("10" * "2");    // 20（都转为数字）
console.log("20" / "4");    // 5
console.log("10" % "3");    // 1

console.log("hello" - 1);   // NaN（"hello" → NaN）
console.log(true * 2);      // 2（true → 1）
console.log(null * 5);      // 0（null → 0）
```

### 比较运算符（<, >, <=, >=）

比较运算符的转换规则：

1. 将两边转换为原始值（`ToPrimitive`）
2. 如果两边都是字符串，按字典序比较
3. 否则转为数字后比较

```javascript
console.log(5 > 3);         // true（数字比较）
console.log("5" > "3");     // true（字符串字典序比较）
console.log("5" > 3);       // true（"5" → 5，数字比较）
console.log("10" > "9");    // false（字符串比较："1" < "9"）

console.log("a" < "b");     // true（字典序）
console.log("apple" < "banana");  // true
```

### 相等运算符（==）

`==`（宽松相等）会进行类型转换，规则复杂：

**核心规则**：
1. 类型相同，直接比较值
2. `null == undefined`（且只有这两个相等）
3. 数字与字符串比较：字符串转数字
4. 布尔值转数字
5. 对象与原始值比较：对象转原始值

示例：

```javascript
console.log(42 == "42");       // true（"42" → 42）
console.log(true == 1);        // true（true → 1）
console.log(false == 0);       // true（false → 0）
console.log(null == undefined);  // true
console.log("" == 0);          // true（"" → 0）
console.log("0" == 0);         // true（"0" → 0）

console.log({} == "[object Object]");  // true（对象转字符串）
console.log([] == "");         // true（[] → ""）
console.log([1] == 1);         // true（[1] → "1" → 1）
```

**性能建议**：优先使用 `===`（严格相等），因为它不进行类型转换，速度更快且语义更清晰。

## V8 中的类型转换优化

### 内联缓存（Inline Cache）

V8 使用内联缓存优化类型转换操作。如果类型稳定，转换代码会被内联：

```javascript
function add(a, b) {
  return a + b;
}

// 多次调用，参数都是数字
add(1, 2);
add(3, 4);
// V8 优化：假设参数总是数字，生成快速数字加法代码
```

### 类型反馈（Type Feedback）

V8 收集类型信息，生成针对特定类型的优化代码：

```javascript
function process(value) {
  return +value;  // ToNumber
}

// 如果 value 总是字符串，V8 生成优化的字符串转数字代码
```

## 本章小结

本章我们深入理解了 JavaScript 的类型转换机制。核心要点：

1. **ToPrimitive**：对象转原始值的核心算法，按 `valueOf` / `toString` 顺序调用
2. **ToNumber**：转换为数字，`null` → `0`，`undefined` → `NaN`，字符串解析
3. **ToString**：转换为字符串，对象默认转为 `"[object Object]"`
4. **ToBoolean**：只有 7 个 Falsy 值，其他都是 Truthy
5. **运算符**：`+` 可能拼接字符串，其他算术运算符总是转数字
6. **性能**：优先使用 `===`，避免不必要的隐式转换

理解类型转换是掌握 JavaScript 行为的关键，也是写出高性能代码的基础。在接下来的章节中，我们将探讨更复杂的类型：字符串的内部表示、对象的内存结构等。

---

**思考题**：

1. 为什么 `[] == ![]` 的结果是 `true`？
2. `Symbol.toPrimitive` 的优先级为什么高于 `valueOf` 和 `toString`？
3. 如果你设计一门动态类型语言，你会如何设计类型转换规则？
