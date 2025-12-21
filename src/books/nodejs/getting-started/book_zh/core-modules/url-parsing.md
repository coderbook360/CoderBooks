# url 与 URLSearchParams：URL 解析全攻略

作为前端开发者，你对浏览器中的 URL API 一定不陌生。好消息是，Node.js 使用完全相同的 WHATWG URL 标准。

## URL 类：解析和构建 URL

### 基础用法

```javascript
const myUrl = new URL('https://example.com:8080/path/page?name=test#section');

console.log(myUrl.protocol);  // 'https:'
console.log(myUrl.hostname);  // 'example.com'
console.log(myUrl.port);      // '8080'
console.log(myUrl.host);      // 'example.com:8080'
console.log(myUrl.pathname);  // '/path/page'
console.log(myUrl.search);    // '?name=test'
console.log(myUrl.hash);      // '#section'
console.log(myUrl.origin);    // 'https://example.com:8080'
console.log(myUrl.href);      // 完整 URL
```

### 相对 URL 解析

```javascript
// 基于基础 URL 解析相对路径
const base = new URL('https://example.com/docs/guide/');

new URL('intro.html', base).href;
// 'https://example.com/docs/guide/intro.html'

new URL('../api/users', base).href;
// 'https://example.com/docs/api/users'

new URL('/absolute/path', base).href;
// 'https://example.com/absolute/path'
```

### 修改 URL 部分

```javascript
const url = new URL('https://example.com/path');

url.pathname = '/new-path';
url.port = '3000';
url.hash = 'section1';

console.log(url.href);
// 'https://example.com:3000/new-path#section1'
```

### 构建 URL

```javascript
const url = new URL('https://api.example.com');
url.pathname = '/v1/users';
url.searchParams.set('page', '1');
url.searchParams.set('limit', '20');

console.log(url.href);
// 'https://api.example.com/v1/users?page=1&limit=20'
```

## URLSearchParams：查询参数处理

### 创建和解析

```javascript
// 从字符串创建
const params1 = new URLSearchParams('name=john&age=25');

// 从对象创建
const params2 = new URLSearchParams({ name: 'john', age: '25' });

// 从数组创建
const params3 = new URLSearchParams([['name', 'john'], ['age', '25']]);

// 从 URL 获取
const url = new URL('https://example.com?name=john&age=25');
const params4 = url.searchParams;
```

### 读取参数

```javascript
const params = new URLSearchParams('name=john&tags=a&tags=b');

// 获取单个值
params.get('name');      // 'john'
params.get('notexist');  // null

// 获取所有值（同名参数）
params.getAll('tags');   // ['a', 'b']

// 检查是否存在
params.has('name');      // true
params.has('other');     // false
```

### 修改参数

```javascript
const params = new URLSearchParams();

// 设置（覆盖已有）
params.set('name', 'john');

// 追加（不覆盖）
params.append('tag', 'javascript');
params.append('tag', 'nodejs');

// 删除
params.delete('name');

// 排序
params.sort();
```

### 遍历参数

```javascript
const params = new URLSearchParams('a=1&b=2&c=3');

// for...of
for (const [key, value] of params) {
  console.log(`${key}: ${value}`);
}

// forEach
params.forEach((value, key) => {
  console.log(`${key}: ${value}`);
});

// 转换为对象
const obj = Object.fromEntries(params);
// { a: '1', b: '2', c: '3' }

// 转换为字符串
params.toString();  // 'a=1&b=2&c=3'
```

## 实战场景

### 构建 API 请求 URL

```javascript
function buildApiUrl(endpoint, params = {}) {
  const url = new URL(endpoint, 'https://api.example.com');
  
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      url.searchParams.set(key, String(value));
    }
  }
  
  return url.href;
}

buildApiUrl('/users', { page: 1, limit: 20, q: 'test' });
// 'https://api.example.com/users?page=1&limit=20&q=test'
```

### 解析请求 URL

```javascript
function parseRequest(requestUrl) {
  const url = new URL(requestUrl, 'http://localhost');
  
  return {
    path: url.pathname,
    query: Object.fromEntries(url.searchParams),
    hash: url.hash.slice(1) || null
  };
}

parseRequest('/api/users?page=1&limit=20#header');
// { path: '/api/users', query: { page: '1', limit: '20' }, hash: 'header' }
```

### 处理数组参数

```javascript
// 追加多个同名参数
function addArrayParams(url, key, values) {
  const urlObj = new URL(url);
  values.forEach(v => urlObj.searchParams.append(key, v));
  return urlObj.href;
}

addArrayParams('https://api.com/search', 'tag', ['js', 'node', 'ts']);
// 'https://api.com/search?tag=js&tag=node&tag=ts'

// 解析数组参数
function getArrayParam(url, key) {
  const urlObj = new URL(url);
  return urlObj.searchParams.getAll(key);
}
```

### URL 验证

```javascript
function isValidUrl(string) {
  try {
    new URL(string);
    return true;
  } catch {
    return false;
  }
}

isValidUrl('https://example.com');  // true
isValidUrl('not a url');            // false
isValidUrl('//example.com');        // false（需要协议）
```

### 安全地合并 URL

```javascript
function joinUrl(base, ...paths) {
  let url = new URL(base);
  
  for (const p of paths) {
    // 确保路径正确拼接
    if (!url.pathname.endsWith('/')) {
      url.pathname += '/';
    }
    url = new URL(p.replace(/^\//, ''), url);
  }
  
  return url.href;
}

joinUrl('https://api.com', 'v1', 'users', '123');
// 'https://api.com/v1/users/123'
```

## 编码处理

### 自动编码

URL 类会自动处理特殊字符编码：

```javascript
const url = new URL('https://example.com');
url.pathname = '/文档/指南';
url.searchParams.set('q', 'hello world');

console.log(url.href);
// 'https://example.com/%E6%96%87%E6%A1%A3/%E6%8C%87%E5%8D%97?q=hello+world'
```

### 手动编解码

```javascript
// 编码完整 URL
encodeURI('https://example.com/path with spaces');
// 'https://example.com/path%20with%20spaces'

// 编码 URL 组件（更激进）
encodeURIComponent('key=value&other');
// 'key%3Dvalue%26other'

// 解码
decodeURIComponent('%E4%B8%AD%E6%96%87');
// '中文'
```

## 旧版 url 模块

Node.js 还保留了旧版的 `url.parse`，但已不推荐使用：

```javascript
const url = require('url');

// 旧版（已废弃）
const parsed = url.parse('https://example.com/path?name=test');

// 新版（推荐）
const parsed = new URL('https://example.com/path?name=test');
```

旧版和新版的区别：

| 特性 | 旧版 url.parse | 新版 URL |
|------|--------------|----------|
| 标准 | Node.js 特有 | WHATWG 标准 |
| 返回值 | 普通对象 | URL 实例 |
| 查询参数 | 字符串 | URLSearchParams |
| 编码处理 | 手动 | 自动 |
| 与浏览器兼容 | 否 | 是 |

### 迁移指南

```javascript
// 旧版
const url = require('url');
const parsed = url.parse('https://example.com/path?name=test', true);
const name = parsed.query.name;

// 新版
const parsed = new URL('https://example.com/path?name=test');
const name = parsed.searchParams.get('name');
```

## fileURLToPath：处理 file:// URL

在 ES Modules 中，`import.meta.url` 返回的是 file:// URL：

```javascript
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// import.meta.url: 'file:///home/user/project/src/index.js'

const __filename = fileURLToPath(import.meta.url);
// '/home/user/project/src/index.js'

const __dirname = dirname(__filename);
// '/home/user/project/src'
```

反向操作：

```javascript
import { pathToFileURL } from 'url';

pathToFileURL('/home/user/file.txt').href;
// 'file:///home/user/file.txt'
```

## 本章小结

- URL 类遵循 WHATWG 标准，与浏览器完全兼容
- URLSearchParams 提供便捷的查询参数操作
- URL 类自动处理编码，避免手动 encode/decode
- 使用 `new URL(path, base)` 处理相对路径
- 旧版 `url.parse` 已废弃，请使用 `new URL()`
- ES Modules 中使用 `fileURLToPath` 获取文件路径

下一章我们将快速了解 querystring 模块及其替代方案。
