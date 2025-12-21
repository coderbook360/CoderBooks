# util：工具函数最佳实践

`util` 模块提供了一系列实用工具函数，其中最重要的是 `promisify`——它让回调风格的 API 焕发新生。

## util.promisify：回调转 Promise

### 基础用法

```javascript
const util = require('util');
const fs = require('fs');

// 将回调风格的 fs.readFile 转换为 Promise 风格
const readFile = util.promisify(fs.readFile);

// 现在可以使用 async/await
const content = await readFile('./file.txt', 'utf8');
```

### 适用条件

`promisify` 只适用于遵循 Node.js 回调约定的函数：
- 回调作为最后一个参数
- 回调的第一个参数是错误

```javascript
// 符合约定
fs.readFile(path, options, (err, data) => {});

// 不符合约定，promisify 不适用
setTimeout((callback) => callback(), 1000);
```

### 批量转换

```javascript
const {
  readFile,
  writeFile,
  mkdir,
  stat
} = Object.fromEntries(
  ['readFile', 'writeFile', 'mkdir', 'stat'].map(
    name => [name, util.promisify(fs[name])]
  )
);
```

当然，Node.js 已经提供了 `fs/promises`：

```javascript
const { readFile, writeFile } = require('fs/promises');
```

### 自定义 promisify 行为

某些函数的回调有多个成功参数，可以用 `util.promisify.custom` 自定义：

```javascript
const dns = require('dns');

// dns.lookup 的回调有两个成功参数：(err, address, family)
// 默认 promisify 只返回第一个
const lookup = util.promisify(dns.lookup);
const { address, family } = await lookup('example.com');
// 实际上 dns 模块已经处理好了，返回对象

// 自定义示例
function customAsync(callback) {
  callback(null, 'result1', 'result2');
}

customAsync[util.promisify.custom] = () => {
  return new Promise((resolve) => {
    customAsync((err, r1, r2) => {
      resolve({ first: r1, second: r2 });
    });
  });
};

const promisified = util.promisify(customAsync);
const { first, second } = await promisified();
```

## util.callbackify：Promise 转回调

反向操作，将 async 函数转为回调风格：

```javascript
const util = require('util');

async function asyncFn() {
  const result = await doSomethingAsync();
  return result;
}

const callbackFn = util.callbackify(asyncFn);

// 现在可以用回调方式调用
callbackFn((err, result) => {
  if (err) {
    console.error(err);
    return;
  }
  console.log(result);
});
```

使用场景较少，主要用于需要兼容回调风格 API 的场景。

## util.inspect：对象调试输出

### 基础用法

```javascript
const util = require('util');

const obj = {
  name: 'test',
  nested: {
    deep: {
      value: [1, 2, 3]
    }
  }
};

console.log(util.inspect(obj, { depth: null, colors: true }));
```

### 常用选项

```javascript
util.inspect(obj, {
  depth: 2,           // 递归深度，null 表示无限
  colors: true,       // 启用颜色
  showHidden: false,  // 显示不可枚举属性
  compact: false,     // 不压缩输出
  maxArrayLength: 100,// 数组最大显示长度
  maxStringLength: 100,// 字符串最大显示长度
  breakLength: 80,    // 换行宽度
  sorted: true        // 对象键排序
});
```

### 自定义 inspect 行为

```javascript
class User {
  constructor(name, password) {
    this.name = name;
    this.password = password;
  }
  
  // 自定义 inspect 输出
  [util.inspect.custom](depth, options) {
    return `User { name: ${this.name}, password: [HIDDEN] }`;
  }
}

const user = new User('admin', 'secret123');
console.log(util.inspect(user));
// 输出: User { name: admin, password: [HIDDEN] }
```

### console.log 与 inspect

`console.log` 内部使用 `util.format`，而对象会用 `util.inspect`：

```javascript
// 这两个基本等价
console.log(obj);
console.log(util.inspect(obj, { colors: true }));
```

要自定义 console.log 的对象输出，实现 `[util.inspect.custom]` 即可。

## util.types：类型检查

```javascript
const util = require('util');

// 检查各种类型
util.types.isAsyncFunction(async () => {});  // true
util.types.isPromise(Promise.resolve());     // true
util.types.isDate(new Date());               // true
util.types.isRegExp(/test/);                 // true
util.types.isSet(new Set());                 // true
util.types.isMap(new Map());                 // true
util.types.isArrayBuffer(new ArrayBuffer(8));// true
util.types.isTypedArray(new Uint8Array(8));  // true

// 错误类型检查
util.types.isNativeError(new Error());       // true
util.types.isNativeError(new TypeError());   // true
util.types.isNativeError({ message: 'err' });// false
```

实用函数：

```javascript
function requireAsync(fn) {
  if (!util.types.isAsyncFunction(fn)) {
    throw new TypeError('Expected async function');
  }
  return fn;
}
```

## util.format：格式化字符串

```javascript
const util = require('util');

// 类似 printf 风格
util.format('%s is %d years old', 'Alice', 25);
// 'Alice is 25 years old'

// 格式说明符
// %s - 字符串
// %d - 数字
// %i - 整数
// %f - 浮点数
// %j - JSON
// %o - 对象（inspect）
// %O - 对象（inspect，无颜色）
// %% - 百分号

util.format('%s: %j', 'data', { a: 1 });
// 'data: {"a":1}'
```

`console.log` 内部使用 `util.format`：

```javascript
console.log('%s costs $%d', 'Coffee', 5);
// 'Coffee costs $5'
```

## util.deprecate：废弃警告

标记函数为已废弃：

```javascript
const util = require('util');

function oldMethod() {
  // ...
}

const deprecatedMethod = util.deprecate(
  oldMethod,
  'oldMethod() is deprecated. Use newMethod() instead.',
  'DEP0001'  // 废弃代码（可选）
);

deprecatedMethod();
// 警告: oldMethod() is deprecated. Use newMethod() instead.
```

警告只会在首次调用时显示。

## util.debuglog：条件日志

```javascript
const util = require('util');

const debug = util.debuglog('myapp');

debug('Starting application...');
debug('Config loaded: %j', config);
```

只有设置 `NODE_DEBUG=myapp` 时才会输出：

```bash
$ NODE_DEBUG=myapp node app.js
MYAPP 12345: Starting application...
MYAPP 12345: Config loaded: {...}
```

支持多个模块：

```bash
$ NODE_DEBUG=myapp,http node app.js
```

## util.isDeepStrictEqual：深度比较

```javascript
const util = require('util');

util.isDeepStrictEqual(
  { a: 1, b: { c: 2 } },
  { a: 1, b: { c: 2 } }
);
// true

util.isDeepStrictEqual([1, 2, 3], [1, 2, 3]);
// true

util.isDeepStrictEqual(
  new Map([['a', 1]]),
  new Map([['a', 1]])
);
// true
```

注意：这是严格比较，类型和值都必须相同。

## util.TextEncoder / TextDecoder

编码和解码文本：

```javascript
const encoder = new TextEncoder();
const decoder = new TextDecoder();

const encoded = encoder.encode('Hello');
// Uint8Array(5) [ 72, 101, 108, 108, 111 ]

const decoded = decoder.decode(encoded);
// 'Hello'

// 处理其他编码
const gbkDecoder = new TextDecoder('gbk');
```

Node.js 中这些是全局可用的，不需要从 `util` 导入。

## 实战示例

### 安全的 JSON 日志

```javascript
const util = require('util');

function safeStringify(obj) {
  try {
    return JSON.stringify(obj);
  } catch {
    return util.inspect(obj, { depth: 2, breakLength: Infinity });
  }
}

function logJSON(level, message, data = {}) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...data
  };
  console.log(safeStringify(entry));
}

logJSON('info', 'User logged in', { userId: 123 });
```

### 带超时的 promisify

```javascript
function promisifyWithTimeout(fn, timeout) {
  const promisified = util.promisify(fn);
  
  return (...args) => {
    return Promise.race([
      promisified(...args),
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout')), timeout);
      })
    ]);
  };
}

const readFileWithTimeout = promisifyWithTimeout(fs.readFile, 5000);
```

## 本章小结

- `util.promisify` 将回调函数转换为 Promise
- `util.inspect` 提供可定制的对象输出
- `util.types` 提供准确的类型检查
- `util.deprecate` 标记废弃函数
- `util.debuglog` 实现条件日志输出
- `util.isDeepStrictEqual` 进行深度比较

下一章我们将学习 os 模块获取系统信息。
