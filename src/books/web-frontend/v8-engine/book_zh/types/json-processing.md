# JSON 解析与序列化：高性能数据处理

JSON（JavaScript Object Notation）是 Web 开发中最常用的数据交换格式。无论是前后端通信、配置文件读取，还是数据存储，JSON 都无处不在。

```javascript
// 每天都在使用 JSON
const response = await fetch('/api/data');
const data = await response.json();  // JSON.parse

localStorage.setItem('config', JSON.stringify(config));  // JSON.stringify
```

但你是否思考过这些问题：

- `JSON.parse` 和 `JSON.stringify` 在 V8 中是如何实现的？
- 为什么 JSON 解析比自己写 `eval` 快得多？
- 大 JSON 数据的解析和序列化有什么优化技巧？

本章将深入 V8 的 JSON 处理机制，揭示高性能数据处理的秘密。

## JSON 的基本概念

### JSON 数据类型

JSON 支持 6 种数据类型：

1. **Object**：`{ "key": "value" }`
2. **Array**：`[1, 2, 3]`
3. **String**：`"hello"`
4. **Number**：`42`、`3.14`
5. **Boolean**：`true`、`false`
6. **Null**：`null`

注意 JSON **不支持**的类型：

- `undefined`
- `Symbol`
- `Function`
- `Date`（会被序列化为字符串）
- `RegExp`
- `Map`、`Set`
- 循环引用对象

```javascript
// 不支持的类型
JSON.stringify({
  a: undefined,      // 被忽略
  b: Symbol('x'),    // 被忽略
  c: function() {},  // 被忽略
  d: new Date(),     // 转为字符串 "2024-01-01T00:00:00.000Z"
});
// 结果：{"d":"2024-01-01T00:00:00.000Z"}
```

### JSON 规范与 JavaScript 对象的区别

虽然 JSON 源于 JavaScript，但有重要区别：

**1. 键必须是字符串**

```javascript
// JavaScript 对象：键可以不加引号
let obj = { name: "Alice", age: 30 };

// JSON：键必须是字符串（加引号）
let json = '{"name":"Alice","age":30}';
```

**2. 字符串必须用双引号**

```javascript
// JavaScript：单引号和双引号都可以
let obj = { name: 'Alice' };

// JSON：只能用双引号
let json = '{"name":"Alice"}';  // ✅ 正确
let json = "{'name':'Alice'}";  // ❌ 错误
```

**3. 不允许尾随逗号**

```javascript
// JavaScript：允许尾随逗号
let obj = { a: 1, b: 2, };

// JSON：不允许
let json = '{"a":1,"b":2,}';  // ❌ 语法错误
```

## JSON.parse：解析 JSON 字符串

### 基本用法

```javascript
let json = '{"name":"Alice","age":30}';
let obj = JSON.parse(json);

console.log(obj.name);  // "Alice"
console.log(obj.age);   // 30
```

### 语法错误处理

`JSON.parse` 会抛出 `SyntaxError`：

```javascript
try {
  JSON.parse('{"name": undefined}');  // undefined 不是有效的 JSON
} catch (e) {
  console.log(e instanceof SyntaxError);  // true
  console.log(e.message);  // "Unexpected token u in JSON at position 9"
}

try {
  JSON.parse("{'name':'Alice'}");  // 单引号不合法
} catch (e) {
  console.log(e.message);  // "Unexpected token ' in JSON at position 1"
}
```

### reviver 参数：自定义解析

`JSON.parse` 接受第二个参数 `reviver`，用于转换解析后的值：

```javascript
let json = '{"name":"Alice","birthday":"2000-01-01"}';

let obj = JSON.parse(json, (key, value) => {
  if (key === 'birthday') {
    return new Date(value);  // 将字符串转为 Date 对象
  }
  return value;
});

console.log(obj.birthday instanceof Date);  // true
console.log(obj.birthday.getFullYear());   // 2000
```

**reviver 的执行顺序**：

reviver 从**最深的嵌套**开始，逐层向上调用：

```javascript
let json = '{"a":{"b":1},"c":2}';

JSON.parse(json, (key, value) => {
  console.log(`key: "${key}", value:`, value);
  return value;
});

// 输出顺序：
// key: "b", value: 1
// key: "a", value: {b: 1}
// key: "c", value: 2
// key: "", value: {a: {b: 1}, c: 2}  // 最后处理根对象
```

最后一次调用的 `key` 是空字符串 `""`，`value` 是整个解析结果。

## JSON.stringify：序列化为 JSON 字符串

### 基本用法

```javascript
let obj = { name: "Alice", age: 30 };
let json = JSON.stringify(obj);

console.log(json);  // '{"name":"Alice","age":30}'
```

### replacer 参数：过滤和转换

**replacer 作为数组**：指定要序列化的属性

```javascript
let obj = { name: "Alice", age: 30, city: "NYC" };
let json = JSON.stringify(obj, ["name", "age"]);

console.log(json);  // '{"name":"Alice","age":30}'
```

**replacer 作为函数**：自定义转换逻辑

```javascript
let obj = { name: "Alice", password: "secret123" };

let json = JSON.stringify(obj, (key, value) => {
  if (key === 'password') {
    return undefined;  // 过滤掉 password
  }
  return value;
});

console.log(json);  // '{"name":"Alice"}'
```

### space 参数：格式化输出

```javascript
let obj = { name: "Alice", hobbies: ["reading", "coding"] };

// 使用数字：缩进空格数
console.log(JSON.stringify(obj, null, 2));
// {
//   "name": "Alice",
//   "hobbies": [
//     "reading",
//     "coding"
//   ]
// }

// 使用字符串：自定义缩进
console.log(JSON.stringify(obj, null, "→→"));
// {
// →→"name": "Alice",
// →→"hobbies": [
// →→→→"reading",
// →→→→"coding"
// →→]
// }
```

### toJSON 方法：自定义序列化

对象可以定义 `toJSON` 方法，控制自己的序列化：

```javascript
class Person {
  constructor(name, age) {
    this.name = name;
    this.age = age;
    this.password = "secret";
  }

  toJSON() {
    return {
      name: this.name,
      age: this.age
      // 不包含 password
    };
  }
}

let person = new Person("Alice", 30);
console.log(JSON.stringify(person));
// '{"name":"Alice","age":30}'
```

**内置类型的 toJSON**：

- `Date.prototype.toJSON`：返回 ISO 8601 格式字符串

```javascript
let date = new Date('2024-01-01');
console.log(JSON.stringify(date));  // '"2024-01-01T00:00:00.000Z"'
console.log(JSON.stringify({ d: date }));  // '{"d":"2024-01-01T00:00:00.000Z"}'
```

## V8 中的 JSON 解析实现

### 为什么不用 eval？

早期的 "JSON 解析" 可能会用 `eval`：

```javascript
// ❌ 危险！不要这样做
let obj = eval('(' + json + ')');
```

但这有严重问题：

**1. 安全风险**：`eval` 可以执行任意代码

```javascript
let malicious = '{"x": (function(){ alert("XSS!"); })() }';
eval('(' + malicious + ')');  // 执行了恶意代码
```

**2. 性能差**：`eval` 需要完整的 JavaScript 解析和编译

**3. 不符合 JSON 规范**：`eval` 接受的是 JavaScript 语法，不是 JSON

### V8 的专用 JSON 解析器

V8 实现了专门的 **JSON 解析器**，而不是复用 JavaScript 解析器。

**优势**：

1. **安全**：只解析 JSON 语法，不执行代码
2. **快速**：专门优化的解析算法
3. **符合规范**：严格遵循 JSON 标准

**实现概览**：

V8 的 JSON 解析器使用**递归下降**（Recursive Descent）算法：

```cpp
// V8 源码简化
class JsonParser {
  ParseValue() {
    switch (current_char) {
      case '{': return ParseObject();
      case '[': return ParseArray();
      case '"': return ParseString();
      case '0'...'9': return ParseNumber();
      case 't': return ParseTrue();
      case 'f': return ParseFalse();
      case 'n': return ParseNull();
      default: ThrowSyntaxError();
    }
  }

  ParseObject() {
    Map map = CreateMap();
    while (current_char != '}') {
      String key = ParseString();
      Expect(':');
      Value value = ParseValue();
      AddProperty(map, key, value);
      if (current_char == ',') Advance();
    }
    return CreateObject(map);
  }
}
```

### 快速路径优化

V8 对常见的 JSON 结构进行了优化：

**1. 内联小对象**

小对象（属性少于某个阈值）直接内联创建，避免多次内存分配。

**2. 预分配数组**

如果能预知数组长度，预分配合适大小的数组。

**3. 字符串常量池**

JSON 中的键（如 `"name"`、`"age"`）通常重复出现，使用字符串常量池共享。

## V8 中的 JSON 序列化实现

### 基本序列化流程

```cpp
// V8 源码简化
class JsonStringifier {
  SerializeValue(Value value) {
    if (IsSmi(value)) {
      AppendNumber(value);
    } else if (IsString(value)) {
      AppendString(value);
    } else if (IsJSObject(value)) {
      SerializeObject(value);
    } else if (IsJSArray(value)) {
      SerializeArray(value);
    }
    // ...
  }

  SerializeObject(JSObject object) {
    Append('{');
    bool first = true;
    for (Property prop : object.properties) {
      if (!first) Append(',');
      AppendString(prop.key);
      Append(':');
      SerializeValue(prop.value);
      first = false;
    }
    Append('}');
  }
}
```

### 循环引用检测

`JSON.stringify` 必须检测循环引用，否则会无限递归：

```javascript
let obj = { a: 1 };
obj.self = obj;  // 循环引用

try {
  JSON.stringify(obj);
} catch (e) {
  console.log(e.message);  // "Converting circular structure to JSON"
}
```

**V8 实现**：使用**栈**记录正在序列化的对象

```cpp
class JsonStringifier {
  std::vector<JSObject*> stack;

  SerializeObject(JSObject* object) {
    if (IsInStack(object)) {
      ThrowCircularError();
    }
    stack.push_back(object);
    // ... 序列化逻辑
    stack.pop_back();
  }
}
```

## JSON 的性能特征

### 解析性能

**性能测试**：

```javascript
let json = JSON.stringify({ data: new Array(10000).fill({ x: 1, y: 2 }) });

console.time("JSON.parse");
for (let i = 0; i < 1000; i++) {
  JSON.parse(json);
}
console.timeEnd("JSON.parse");
```

**影响因素**：

1. **JSON 大小**：解析时间与 JSON 字符串长度成正比
2. **嵌套深度**：深度嵌套影响递归调用开销
3. **数据类型**：对象和数组比原始值慢

### 序列化性能

```javascript
let obj = { data: new Array(10000).fill({ x: 1, y: 2 }) };

console.time("JSON.stringify");
for (let i = 0; i < 1000; i++) {
  JSON.stringify(obj);
}
console.timeEnd("JSON.stringify");
```

**影响因素**：

1. **对象大小**：属性数量越多，序列化越慢
2. **toJSON 方法**：自定义 `toJSON` 会增加开销
3. **replacer 函数**：函数调用有成本

## 性能优化建议

### 1. 避免不必要的序列化

```javascript
// ❌ 坏：每次都序列化
function saveConfig(config) {
  localStorage.setItem('config', JSON.stringify(config));
}
saveConfig(config);
saveConfig(config);  // 重复序列化

// ✅ 好：缓存序列化结果
let cachedJson = null;
function saveConfig(config) {
  if (!cachedJson) {
    cachedJson = JSON.stringify(config);
  }
  localStorage.setItem('config', cachedJson);
}
```

### 2. 分块处理大数据

```javascript
// ❌ 坏：一次性解析大 JSON
let hugeData = JSON.parse(hugeJsonString);

// ✅ 好：流式处理（如果可能）
// 或者分页加载
async function loadData() {
  let page = 0;
  while (true) {
    let response = await fetch(`/api/data?page=${page}`);
    let chunk = await response.json();
    if (chunk.length === 0) break;
    processChunk(chunk);
    page++;
  }
}
```

### 3. 使用 reviver/replacer 时避免过度处理

```javascript
// ❌ 坏：每个值都处理
JSON.parse(json, (key, value) => {
  // 对每个值都进行复杂计算
  return transform(value);
});

// ✅ 好：只处理特定键
JSON.parse(json, (key, value) => {
  if (key === 'date') {
    return new Date(value);
  }
  return value;
});
```

### 4. 预估 JSON 大小

```javascript
// 如果需要频繁序列化，可以预估大小
function estimateJsonSize(obj) {
  return JSON.stringify(obj).length;
}

// 如果太大，考虑压缩或分块
if (estimateJsonSize(data) > 1000000) {  // 1MB
  // 压缩或分块处理
}
```

### 5. 使用原生 JSON 而非手动构建

```javascript
// ❌ 坏：手动构建 JSON 字符串
let json = '{';
json += '"name":"' + obj.name + '",';
json += '"age":' + obj.age;
json += '}';

// ✅ 好：使用 JSON.stringify
let json = JSON.stringify({ name: obj.name, age: obj.age });
```

## 常见陷阱

### 1. undefined 和函数被忽略

```javascript
let obj = { a: 1, b: undefined, c: function() {} };
console.log(JSON.stringify(obj));
// '{"a":1}'（b 和 c 被忽略）

let arr = [1, undefined, function() {}];
console.log(JSON.stringify(arr));
// '[1,null,null]'（数组中的 undefined 和函数变成 null）
```

### 2. Date 自动转字符串

```javascript
let obj = { date: new Date('2024-01-01') };
let json = JSON.stringify(obj);
// '{"date":"2024-01-01T00:00:00.000Z"}'

let parsed = JSON.parse(json);
console.log(typeof parsed.date);  // "string"（不是 Date 对象！）
```

### 3. NaN 和 Infinity

```javascript
console.log(JSON.stringify({ a: NaN, b: Infinity }));
// '{"a":null,"b":null}'（转为 null）
```

### 4. 对象属性顺序

虽然 JSON 规范不保证对象属性顺序，但现代引擎（包括 V8）通常保持插入顺序：

```javascript
let obj = { b: 2, a: 1 };
console.log(JSON.stringify(obj));
// '{"b":2,"a":1}'（保持插入顺序）
```

但**不应依赖**属性顺序，因为规范不保证。

## 本章小结

本章我们深入理解了 V8 的 JSON 处理机制。核心要点：

1. **JSON 规范**：JSON 是 JavaScript 的子集，有严格的语法要求
2. **JSON.parse**：专用的 JSON 解析器，安全且快速，支持 reviver 自定义转换
3. **JSON.stringify**：序列化为 JSON 字符串，支持 replacer 过滤和 toJSON 自定义
4. **V8 优化**：专用解析器、快速路径优化、字符串常量池
5. **性能建议**：避免不必要的序列化、分块处理大数据、使用原生 API
6. **常见陷阱**：undefined/函数被忽略、Date 转字符串、循环引用错误

JSON 是 Web 开发的基础，理解其底层实现有助于写出更高效的代码。在接下来的章节中，我们将深入对象的内存结构，探讨 V8 如何优化对象存储。

---

**思考题**：

1. 为什么 V8 要实现专用的 JSON 解析器，而不是复用 JavaScript 解析器？
2. `JSON.stringify` 如何检测循环引用？时间复杂度是多少？
3. 如果你要设计一个 JSON 解析器，你会如何优化性能？
