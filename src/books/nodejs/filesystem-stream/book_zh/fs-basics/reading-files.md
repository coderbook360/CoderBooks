# 文件读取：readFile 与 read

> 读取文件是最基本的文件操作。但 Node.js 提供了多种方式，各有优缺点。选择正确的方式，关系到应用的性能和稳定性。

## readFile：一次性读取

最简单的方式是使用 `readFile`，它将**整个文件**读入内存：

```javascript
import { readFile } from 'fs/promises';

// 读取文本文件
const text = await readFile('document.txt', 'utf8');
console.log(text);

// 读取二进制文件
const buffer = await readFile('image.png');
console.log(buffer.length, 'bytes');
```

### 配置选项

```javascript
await readFile(path, {
  encoding: 'utf8',        // 编码：'utf8', 'ascii', 'base64', ...
  flag: 'r',               // 打开模式：'r'(读)
  signal: abortController.signal  // 取消信号（Node.js 16+）
});
```

### 注意事项

```javascript
// ⚠️ 大文件会占用大量内存
const bigFile = await readFile('1GB-file.bin');
// 这会将 1GB 数据加载到内存中！

// ✅ 大文件应该使用流
import { createReadStream } from 'fs';
const stream = createReadStream('1GB-file.bin');
```

**readFile 适合**：
- 配置文件（几 KB ~ 几 MB）
- 模板文件
- 小型数据文件

**readFile 不适合**：
- 大文件（> 100MB）
- 日志文件
- 视频、大型数据集

## fs.read：底层读取

`fs.read` 是更底层的 API，可以精确控制读取位置和大小：

```javascript
import { open } from 'fs/promises';

// 打开文件获取文件描述符
const fileHandle = await open('data.bin', 'r');

try {
  // 准备缓冲区
  const buffer = Buffer.alloc(1024);  // 1KB 缓冲区
  
  // 从文件偏移量 100 开始，读取 1024 字节
  const { bytesRead } = await fileHandle.read(buffer, 0, 1024, 100);
  
  console.log(`读取了 ${bytesRead} 字节`);
  console.log(buffer.subarray(0, bytesRead));
} finally {
  await fileHandle.close();  // 必须关闭！
}
```

### read 参数详解

```javascript
fileHandle.read(buffer, offset, length, position);
// buffer: 存放数据的 Buffer
// offset: Buffer 中开始写入的位置
// length: 要读取的字节数
// position: 文件中开始读取的位置（null 表示当前位置）
```

```
文件内容:  [0x00][0x01][0x02][0x03][0x04][0x05][0x06][0x07]...
                              ↑ position=3
                              读取 length=4 字节
                              ↓
Buffer:    [----][----][0x03][0x04][0x05][0x06][----][----]
                 ↑ offset=2
```

### 何时使用 fs.read

- **读取文件特定部分**：如读取文件头信息
- **大文件随机访问**：如数据库文件
- **自定义流实现**：构建自己的流处理
- **精确内存控制**：复用 Buffer 减少 GC

```javascript
// 示例：读取 PNG 文件头，验证是否为 PNG
import { open } from 'fs/promises';

async function isPNG(filePath) {
  const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  
  const fh = await open(filePath, 'r');
  try {
    const header = Buffer.alloc(8);
    await fh.read(header, 0, 8, 0);
    
    return header.equals(PNG_SIGNATURE);
  } finally {
    await fh.close();
  }
}

console.log(await isPNG('image.png'));  // true
console.log(await isPNG('image.jpg'));  // false
```

## 同步读取

在某些场景（如启动配置）可以使用同步版本：

```javascript
import { readFileSync } from 'fs';

// 启动时读取配置（阻塞是可接受的）
const config = JSON.parse(readFileSync('config.json', 'utf8'));

// ❌ 请求处理中使用同步读取
app.get('/data', (req, res) => {
  const data = readFileSync('data.json', 'utf8');  // 阻塞整个服务器！
  res.json(JSON.parse(data));
});

// ✅ 正确方式
app.get('/data', async (req, res) => {
  const data = await readFile('data.json', 'utf8');
  res.json(JSON.parse(data));
});
```

## 读取 JSON 文件

最常见的场景是读取 JSON 配置或数据：

```javascript
import { readFile } from 'fs/promises';

// 方式1：readFile + JSON.parse
async function readJSON(filePath) {
  const content = await readFile(filePath, 'utf8');
  return JSON.parse(content);
}

// 方式2：Node.js 18+ 直接 import（需要 .json 后缀）
import config from './config.json' assert { type: 'json' };

// 方式3：require（CommonJS，同步）
const config = require('./config.json');
```

### 带错误处理的 JSON 读取

```javascript
async function safeReadJSON(filePath, defaultValue = null) {
  try {
    const content = await readFile(filePath, 'utf8');
    return JSON.parse(content);
  } catch (err) {
    if (err.code === 'ENOENT') {
      // 文件不存在，返回默认值
      return defaultValue;
    }
    if (err instanceof SyntaxError) {
      // JSON 格式错误
      console.error('JSON 解析失败:', filePath);
      return defaultValue;
    }
    throw err;  // 其他错误继续抛出
  }
}

const config = await safeReadJSON('config.json', { debug: false });
```

## 逐行读取

处理大型文本文件时，逐行读取更高效：

```javascript
import { createReadStream } from 'fs';
import { createInterface } from 'readline';

async function* readLines(filePath) {
  const stream = createReadStream(filePath, { encoding: 'utf8' });
  const rl = createInterface({ input: stream, crlfDelay: Infinity });
  
  for await (const line of rl) {
    yield line;
  }
}

// 使用
for await (const line of readLines('large-log.txt')) {
  if (line.includes('ERROR')) {
    console.log(line);
  }
}
```

这种方式：
- ✅ 内存占用恒定（不随文件大小增长）
- ✅ 可以处理任意大的文件
- ✅ 支持提前终止

## 读取方式对比

| 方法 | 内存占用 | 适用文件大小 | 使用场景 |
|------|---------|------------|---------|
| `readFile` | 整个文件 | < 100MB | 配置、模板、小数据 |
| `fs.read` | 自定义 | 任意 | 随机访问、文件头 |
| `createReadStream` | 恒定 | 任意 | 大文件、流处理 |
| `readline` | 恒定 | 任意 | 逐行文本处理 |

## 本章小结

- `readFile` 简单易用，但会将整个文件加载到内存
- `fs.read` 提供底层控制，适合随机访问和精确读取
- 大文件必须使用流（Stream）处理
- JSON 文件读取要处理解析错误
- 逐行读取使用 readline 模块

下一章我们将学习文件写入的各种方式。
