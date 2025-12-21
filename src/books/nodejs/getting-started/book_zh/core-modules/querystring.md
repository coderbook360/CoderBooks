# querystring 与现代替代方案

`querystring` 模块曾是 Node.js 处理查询字符串的标准方式，但现在已被标记为**遗留 API（Legacy）**。本章快速了解它的用法，更重要的是理解为什么应该迁移到 `URLSearchParams`。

> **关于本章的定位**：如果你正在阅读遗留代码或维护老项目，理解 querystring 是必要的。但对于新项目，请直接使用 URLSearchParams（已在 [url-parsing.md](url-parsing.md) 中详细介绍）。

## querystring 基础用法

### 解析查询字符串

```javascript
const querystring = require('querystring');

const parsed = querystring.parse('name=john&age=25&hobby=reading&hobby=coding');
console.log(parsed);
// {
//   name: 'john',
//   age: '25',
//   hobby: ['reading', 'coding']  // 同名参数自动转数组
// }
```

### 序列化为字符串

```javascript
const qs = querystring.stringify({
  name: 'john',
  age: 25,
  tags: ['a', 'b']
});
console.log(qs);
// 'name=john&age=25&tags=a&tags=b'
```

### 自定义分隔符

```javascript
// 使用分号作为分隔符，冒号作为键值分隔
querystring.parse('name:john;age:25', ';', ':');
// { name: 'john', age: '25' }

querystring.stringify({ name: 'john', age: '25' }, ';', ':');
// 'name:john;age:25'
```

## 为什么应该迁移

### 1. 已被官方标记为遗留

Node.js 官方文档明确指出 querystring 是遗留 API，推荐使用 URLSearchParams。

### 2. 编码行为不一致

```javascript
const querystring = require('querystring');

// querystring 使用 %20 编码空格
querystring.stringify({ q: 'hello world' });
// 'q=hello%20world'

// URLSearchParams 使用 + 编码空格（更符合标准）
new URLSearchParams({ q: 'hello world' }).toString();
// 'q=hello+world'
```

### 3. 类型处理

```javascript
// querystring 直接处理
querystring.stringify({ num: 123, bool: true });
// 'num=123&bool=true'

// URLSearchParams 更严格，所有值都是字符串
new URLSearchParams({ num: '123', bool: 'true' }).toString();
// 'num=123&bool=true'
```

### 4. 与浏览器不兼容

`querystring` 是 Node.js 特有模块，而 `URLSearchParams` 是标准 Web API，浏览器和 Node.js 都支持。

## 迁移指南

### 解析

```javascript
// 旧
const querystring = require('querystring');
const params = querystring.parse('name=john&age=25');
const name = params.name;

// 新
const params = new URLSearchParams('name=john&age=25');
const name = params.get('name');
```

### 序列化

```javascript
// 旧
const qs = querystring.stringify({ name: 'john', age: 25 });

// 新
const qs = new URLSearchParams({ name: 'john', age: '25' }).toString();
```

### 处理同名参数

```javascript
// 旧：自动返回数组
const params = querystring.parse('tag=a&tag=b');
params.tag;  // ['a', 'b']

// 新：需要使用 getAll
const params = new URLSearchParams('tag=a&tag=b');
params.getAll('tag');  // ['a', 'b']
params.get('tag');     // 'a'（只返回第一个）
```

### 转换为对象

```javascript
// 旧
const obj = querystring.parse('a=1&b=2');
// { a: '1', b: '2' }

// 新
const obj = Object.fromEntries(new URLSearchParams('a=1&b=2'));
// { a: '1', b: '2' }
```

## 何时仍需使用 querystring

### 自定义分隔符

如果查询字符串使用非标准分隔符，URLSearchParams 不支持：

```javascript
// 这种情况仍需 querystring
const data = querystring.parse('name:john;age:25', ';', ':');
```

### 完全兼容旧代码

如果你在维护旧代码，逐步迁移即可，不必立即全部替换。

## 通用替代方案

如果需要更复杂的功能，可以使用第三方库：

```javascript
// qs 库：支持嵌套对象和数组
const qs = require('qs');

qs.parse('user[name]=john&user[age]=25');
// { user: { name: 'john', age: '25' } }

qs.stringify({ user: { name: 'john', age: 25 } });
// 'user[name]=john&user[age]=25'
```

## 本章小结

- `querystring` 是遗留 API，新代码应使用 `URLSearchParams`
- `URLSearchParams` 是 WHATWG 标准，跨平台兼容
- 同名参数使用 `getAll()` 获取数组
- 需要自定义分隔符时可保留使用 `querystring`
- 复杂场景可使用 `qs` 等第三方库

下一章我们将学习事件驱动编程的核心：EventEmitter。
