# 三套 API 对比：回调、同步、Promise

> Node.js 的 `fs` 模块提供三种不同风格的 API。选择哪种不仅影响代码风格，更关系到应用的性能和可维护性。

## 为什么有三套 API？

这与 Node.js 的演进历史有关：

```
2009年 → 回调 API（最早，Node.js 核心风格）
2009年 → 同步 API（特殊场景需要）
2017年 → Promise API（Node.js 10+ 正式稳定）
```

三套 API 做的事情完全一样，只是**异步模型**不同。

## 回调风格（Callback）

这是 Node.js 最早的异步模式：

```javascript
import fs from 'fs';

// 回调函数：(error, result) => void
fs.readFile('config.json', 'utf8', (err, data) => {
  if (err) {
    console.error('读取失败:', err.message);
    return;
  }
  console.log('内容:', data);
});

console.log('这行先执行');  // 非阻塞！
```

### 回调地狱问题

```javascript
// ❌ 嵌套的回调，难以维护
fs.readFile('a.json', 'utf8', (err, a) => {
  if (err) return handleError(err);
  
  fs.readFile('b.json', 'utf8', (err, b) => {
    if (err) return handleError(err);
    
    fs.writeFile('c.json', a + b, (err) => {
      if (err) return handleError(err);
      
      console.log('完成');
    });
  });
});
```

### 错误处理

回调风格的错误必须在每个回调中处理：

```javascript
fs.readFile('file.txt', 'utf8', (err, data) => {
  if (err) {
    // 必须处理错误，否则程序可能继续执行
    // 使用未定义的 data
    console.error(err);
    return;
  }
  // 正常处理 data
});
```

## 同步风格（Sync）

同步 API 会**阻塞事件循环**：

```javascript
import { readFileSync, writeFileSync } from 'fs';

try {
  const data = readFileSync('config.json', 'utf8');
  console.log('内容:', data);
  
  writeFileSync('backup.json', data);
} catch (err) {
  console.error('操作失败:', err.message);
}
```

### 何时使用同步 API

```javascript
// ✅ 适合：程序启动时加载配置
const config = JSON.parse(readFileSync('config.json', 'utf8'));

// ✅ 适合：CLI 工具的简单文件操作
const template = readFileSync('template.html', 'utf8');
const output = template.replace('{{name}}', 'World');
writeFileSync('output.html', output);

// ❌ 不适合：HTTP 请求处理
app.get('/data', (req, res) => {
  // 这会阻塞所有其他请求！
  const data = readFileSync('data.json', 'utf8');
  res.json(JSON.parse(data));
});
```

### 阻塞的影响

```javascript
console.log('开始');

// 假设读取需要 100ms
const data = readFileSync('large-file.txt', 'utf8');

console.log('结束');  // 100ms 后才执行

// 在这 100ms 内：
// - 事件循环被阻塞
// - 无法处理其他请求
// - 定时器不会触发
// - 任何 I/O 都停止
```

## Promise 风格（推荐）

现代 Node.js 推荐使用 Promise API：

```javascript
import { readFile, writeFile } from 'fs/promises';

// async/await 语法
async function processFiles() {
  try {
    const data = await readFile('config.json', 'utf8');
    await writeFile('backup.json', data);
    console.log('完成');
  } catch (err) {
    console.error('操作失败:', err.message);
  }
}

// 链式调用
readFile('config.json', 'utf8')
  .then(data => writeFile('backup.json', data))
  .then(() => console.log('完成'))
  .catch(err => console.error(err));
```

### 并行操作

Promise 让并行操作变得简单：

```javascript
import { readFile } from 'fs/promises';

// 并行读取多个文件
const [config, users, data] = await Promise.all([
  readFile('config.json', 'utf8'),
  readFile('users.json', 'utf8'),
  readFile('data.json', 'utf8'),
]);

// 比顺序读取快 3 倍（假设每个文件读取时间相同）
```

### 错误处理

集中式错误处理，更简洁：

```javascript
async function main() {
  try {
    const a = await readFile('a.json', 'utf8');
    const b = await readFile('b.json', 'utf8');
    await writeFile('c.json', a + b);
    console.log('完成');
  } catch (err) {
    // 任何一步失败都会到这里
    console.error('处理失败:', err.message);
  }
}
```

## 将回调转换为 Promise

如果必须使用回调 API，可以转换：

```javascript
import { promisify } from 'util';
import fs from 'fs';

// 手动转换
const readFile = promisify(fs.readFile);

// 或者直接使用 fs/promises
import { readFile } from 'fs/promises';  // 推荐
```

## 三套 API 对比

| 特性 | 回调 | 同步 | Promise |
|------|-----|------|---------|
| 导入方式 | `import fs from 'fs'` | `import fs from 'fs'` | `import from 'fs/promises'` |
| 函数命名 | `fs.readFile` | `fs.readFileSync` | `fs.readFile` |
| 是否阻塞 | ❌ 不阻塞 | ✅ 阻塞 | ❌ 不阻塞 |
| 错误处理 | 每个回调中 | try/catch | try/catch 或 .catch() |
| 可读性 | 差（嵌套） | 好 | 好（async/await） |
| 并行操作 | 复杂 | 不可能 | Promise.all |
| 推荐程度 | 遗留代码 | 启动/CLI | **推荐** |

## 混合使用的注意事项

```javascript
// ⚠️ 同步和异步混合可能导致问题
let data;

readFile('config.json', 'utf8', (err, result) => {
  data = result;
});

console.log(data);  // undefined！回调还没执行

// ✅ 正确方式
const data = await readFile('config.json', 'utf8');
console.log(data);
```

## 迁移指南

从回调迁移到 Promise：

```javascript
// 旧代码（回调）
function loadConfig(callback) {
  fs.readFile('config.json', 'utf8', (err, data) => {
    if (err) return callback(err);
    try {
      callback(null, JSON.parse(data));
    } catch (e) {
      callback(e);
    }
  });
}

// 新代码（Promise）
async function loadConfig() {
  const data = await readFile('config.json', 'utf8');
  return JSON.parse(data);
}
```

## 本章小结

- **回调风格**：Node.js 早期 API，存在回调地狱问题
- **同步风格**：阻塞事件循环，仅用于启动和 CLI
- **Promise 风格**：现代推荐，配合 async/await 使用
- 选择 Promise API 可以获得更好的可读性和错误处理
- 使用 `Promise.all` 并行化 I/O 操作

下一章我们将深入了解文件描述符的概念。