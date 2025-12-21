# fs 模块：同步、异步与 Promise API 对比

文件操作是 Node.js 的核心能力。`fs` 模块提供了三种风格的 API，选择合适的风格至关重要。

## 三种 API 风格

Node.js 的 `fs` 模块经历了演进，目前提供三种风格：

| 风格 | 引入方式 | 特点 | 适用场景 |
|------|----------|------|----------|
| 同步 | `fs.*Sync()` | 阻塞主线程 | 启动时配置读取 |
| 回调 | `fs.*(callback)` | 非阻塞，回调风格 | 传统 Node.js 代码 |
| Promise | `fs.promises.*` | 非阻塞，Promise 风格 | 现代 async/await 代码 |

## 同步 API：简单但危险

```javascript
const fs = require('fs');

// 同步读取
const content = fs.readFileSync('./config.json', 'utf8');
const config = JSON.parse(content);

// 同步写入
fs.writeFileSync('./output.txt', 'Hello World');
```

### 何时使用同步 API

**适合**：
- 应用启动时读取配置文件
- CLI 工具中的文件操作
- 必须保证顺序的初始化流程

**避免**：
- 服务器运行时的请求处理中
- 任何需要高并发的场景

```javascript
// 服务器启动时可以用同步
const config = JSON.parse(
  fs.readFileSync('./config.json', 'utf8')
);

// 但请求处理中绝不能用同步！
app.get('/file/:name', (req, res) => {
  // 错误！会阻塞所有其他请求
  const content = fs.readFileSync(req.params.name);
  res.send(content);
});
```

### 错误处理

```javascript
try {
  const content = fs.readFileSync('./not-exist.txt', 'utf8');
} catch (err) {
  if (err.code === 'ENOENT') {
    console.log('文件不存在');
  } else {
    throw err;
  }
}
```

## 回调 API：Node.js 传统风格

```javascript
const fs = require('fs');

// 异步读取
fs.readFile('./config.json', 'utf8', (err, content) => {
  if (err) {
    console.error('读取失败:', err.message);
    return;
  }
  const config = JSON.parse(content);
  console.log(config);
});

// 异步写入
fs.writeFile('./output.txt', 'Hello World', err => {
  if (err) {
    console.error('写入失败:', err.message);
    return;
  }
  console.log('写入成功');
});
```

### 回调风格的问题

嵌套的回调导致代码难以维护：

```javascript
// 回调地狱
fs.readFile('./input.txt', 'utf8', (err, data) => {
  if (err) return handleError(err);
  
  const processed = process(data);
  
  fs.writeFile('./output.txt', processed, err => {
    if (err) return handleError(err);
    
    fs.readFile('./output.txt', 'utf8', (err, result) => {
      if (err) return handleError(err);
      console.log('完成:', result);
    });
  });
});
```

## Promise API：现代推荐方式

Node.js 10+ 引入了 `fs.promises`：

```javascript
const fs = require('fs').promises;
// 或
const { readFile, writeFile } = require('fs/promises');

async function processFile() {
  try {
    const content = await fs.readFile('./config.json', 'utf8');
    const config = JSON.parse(content);
    
    await fs.writeFile('./output.txt', 'Processed');
    console.log('完成');
  } catch (err) {
    console.error('操作失败:', err.message);
  }
}
```

### 链式操作变得清晰

```javascript
const fs = require('fs/promises');

async function copyAndTransform(src, dest) {
  const content = await fs.readFile(src, 'utf8');
  const transformed = content.toUpperCase();
  await fs.writeFile(dest, transformed);
  return fs.stat(dest);
}
```

### 并行操作

```javascript
async function readMultiple(files) {
  const contents = await Promise.all(
    files.map(file => fs.readFile(file, 'utf8'))
  );
  return contents;
}
```

## 常见错误码

文件操作经常失败，需要正确处理错误：

```javascript
async function safeRead(path) {
  try {
    return await fs.readFile(path, 'utf8');
  } catch (err) {
    switch (err.code) {
      case 'ENOENT':
        throw new Error(`文件不存在: ${path}`);
      case 'EACCES':
        throw new Error(`无权限访问: ${path}`);
      case 'EISDIR':
        throw new Error(`路径是目录: ${path}`);
      default:
        throw err;
    }
  }
}
```

常见错误码：

- `ENOENT`：文件或目录不存在
- `EACCES`：权限不足
- `EEXIST`：文件已存在（创建时）
- `EISDIR`：是目录而非文件
- `ENOTDIR`：不是目录
- `EMFILE`：打开文件过多
- `ENOSPC`：磁盘空间不足

## 文件读写进阶

### 指定编码

```javascript
// 读取为字符串
const text = await fs.readFile('./file.txt', 'utf8');

// 读取为 Buffer
const buffer = await fs.readFile('./image.png');

// 写入时指定编码
await fs.writeFile('./file.txt', content, 'utf8');
```

### 追加内容

```javascript
await fs.appendFile('./log.txt', '新的一行\n');
```

### 文件操作选项

```javascript
// 写入选项
await fs.writeFile('./file.txt', content, {
  encoding: 'utf8',
  mode: 0o644,  // 权限
  flag: 'w'     // 写入模式
});

// flag 选项：
// 'r'  - 读取（默认）
// 'w'  - 写入，不存在则创建，存在则清空
// 'a'  - 追加，不存在则创建
// 'wx' - 写入，文件必须不存在
// 'ax' - 追加，文件必须不存在
```

## 文件是否存在

### 旧方法（已废弃）

```javascript
// 不推荐：fs.exists 已废弃
fs.exists('./file.txt', exists => {
  console.log(exists);
});
```

### 现代方法

```javascript
const fs = require('fs/promises');

async function fileExists(path) {
  try {
    await fs.access(path);
    return true;
  } catch {
    return false;
  }
}
```

或者使用 `stat`：

```javascript
async function fileExists(path) {
  try {
    const stats = await fs.stat(path);
    return stats.isFile();
  } catch {
    return false;
  }
}
```

## 复制文件

```javascript
const fs = require('fs/promises');

// Node.js 16+ 推荐
await fs.copyFile('./src.txt', './dest.txt');

// 覆盖保护
await fs.copyFile(
  './src.txt', 
  './dest.txt', 
  fs.constants.COPYFILE_EXCL  // 目标存在则报错
);
```

## 删除文件

```javascript
// 删除文件
await fs.unlink('./file.txt');

// Node.js 14.14+ 推荐，更安全
await fs.rm('./file.txt');

// 删除文件或目录（递归）
await fs.rm('./directory', { recursive: true, force: true });
```

## 实战示例

### JSON 配置文件操作

```javascript
const fs = require('fs/promises');
const path = require('path');

class ConfigManager {
  constructor(configPath) {
    this.path = configPath;
  }
  
  async load() {
    try {
      const content = await fs.readFile(this.path, 'utf8');
      return JSON.parse(content);
    } catch (err) {
      if (err.code === 'ENOENT') {
        return {};  // 配置文件不存在，返回空对象
      }
      throw err;
    }
  }
  
  async save(config) {
    const content = JSON.stringify(config, null, 2);
    await fs.writeFile(this.path, content, 'utf8');
  }
  
  async update(updates) {
    const config = await this.load();
    const newConfig = { ...config, ...updates };
    await this.save(newConfig);
    return newConfig;
  }
}

// 使用
const config = new ConfigManager('./config.json');
await config.update({ debug: true });
```

### 安全的文件写入（原子操作）

```javascript
async function safeWrite(filePath, content) {
  const tempPath = filePath + '.tmp';
  
  try {
    // 先写入临时文件
    await fs.writeFile(tempPath, content, 'utf8');
    // 再重命名（原子操作）
    await fs.rename(tempPath, filePath);
  } catch (err) {
    // 清理临时文件
    try {
      await fs.unlink(tempPath);
    } catch {}
    throw err;
  }
}
```

## 本章小结

- 同步 API 阻塞主线程，仅用于启动时
- 回调 API 是传统风格，容易陷入回调地狱
- Promise API 是现代推荐方式，配合 async/await 使用
- 正确处理错误码，提供有意义的错误信息
- 使用原子操作保证数据一致性

下一章我们将学习文件监听和目录操作。
