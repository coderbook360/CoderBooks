# Stream 入门：流式处理思维

假设你需要处理一个 1GB 的日志文件。一次性读入内存？程序会直接崩溃。

Stream（流）是 Node.js 解决这类问题的核心方案——不是一次性加载全部数据，而是分成小块逐步处理。

## 为什么需要 Stream

### 内存问题

```javascript
const fs = require('fs');

// 错误做法：一次性读取
const data = fs.readFileSync('1gb-file.txt');
// 内存直接爆掉！

// 正确做法：流式读取
const stream = fs.createReadStream('1gb-file.txt');
stream.on('data', chunk => {
  // 每次只有 64KB 在内存中
  console.log(`处理 ${chunk.length} 字节`);
});
```

### Stream 的优势

1. **内存效率**：数据分块，不占用大量内存
2. **时间效率**：边读边处理，不用等待全部加载
3. **组合能力**：多个处理步骤可以串联（pipe）

想象水管：水流持续流动，你不需要先把所有水装到一个巨大的桶里，再倒到另一个桶。

## 四种 Stream 类型

| 类型 | 说明 | 例子 |
|------|------|------|
| Readable | 数据源，可读 | 文件读取流、HTTP 请求体 |
| Writable | 数据目标，可写 | 文件写入流、HTTP 响应体 |
| Duplex | 双向，可读可写 | TCP Socket |
| Transform | 转换，处理数据 | 压缩流、加密流 |

## Readable Stream：可读流

### 创建文件读取流

```javascript
const fs = require('fs');

const readable = fs.createReadStream('file.txt', {
  encoding: 'utf8',         // 字符编码
  highWaterMark: 64 * 1024  // 每次读取的字节数
});
```

### 事件驱动方式

```javascript
readable.on('data', chunk => {
  console.log(`收到 ${chunk.length} 字节`);
});

readable.on('end', () => {
  console.log('读取完成');
});

readable.on('error', err => {
  console.error('读取错误:', err);
});
```

### 暂停和恢复

```javascript
readable.on('data', chunk => {
  console.log(chunk);
  
  readable.pause();  // 暂停
  
  setTimeout(() => {
    readable.resume();  // 恢复
  }, 1000);
});
```

### 异步迭代器（推荐）

Node.js 的 Readable 流支持 for-await-of：

```javascript
async function processFile(path) {
  const stream = fs.createReadStream(path, { encoding: 'utf8' });
  
  for await (const chunk of stream) {
    console.log(`处理: ${chunk.length} 字符`);
  }
  
  console.log('完成');
}
```

## Writable Stream：可写流

### 创建文件写入流

```javascript
const fs = require('fs');

const writable = fs.createWriteStream('output.txt');
```

### 写入数据

```javascript
writable.write('第一行\n');
writable.write('第二行\n');
writable.write('第三行\n');
writable.end('最后一行');  // 结束并写入

// 事件
writable.on('finish', () => {
  console.log('写入完成');
});

writable.on('error', err => {
  console.error('写入错误:', err);
});
```

### 背压处理

当写入速度超过处理速度时，`write()` 返回 `false`：

```javascript
function writeData(writable, data) {
  for (const item of data) {
    const canContinue = writable.write(item);
    
    if (!canContinue) {
      // 缓冲区满，需要等待
      await new Promise(resolve => writable.once('drain', resolve));
    }
  }
  writable.end();
}
```

## pipe：连接流

`pipe` 是 Stream 的精髓——将数据从一个流导向另一个流：

```javascript
const fs = require('fs');

const readable = fs.createReadStream('input.txt');
const writable = fs.createWriteStream('output.txt');

// 简单复制文件
readable.pipe(writable);
```

### pipe 自动处理

- 背压：自动暂停/恢复
- 结束：源流结束时自动结束目标流
- 错误：需要手动处理

```javascript
readable
  .pipe(writable)
  .on('finish', () => console.log('完成'))
  .on('error', err => console.error('错误:', err));
```

### 链式 pipe

```javascript
const zlib = require('zlib');
const fs = require('fs');

// 读取 → 压缩 → 写入
fs.createReadStream('file.txt')
  .pipe(zlib.createGzip())
  .pipe(fs.createWriteStream('file.txt.gz'));
```

### pipeline（推荐）

`stream.pipeline` 是更安全的 pipe：

```javascript
const { pipeline } = require('stream/promises');
const fs = require('fs');
const zlib = require('zlib');

async function compress(input, output) {
  await pipeline(
    fs.createReadStream(input),
    zlib.createGzip(),
    fs.createWriteStream(output)
  );
  console.log('压缩完成');
}

compress('file.txt', 'file.txt.gz');
```

`pipeline` 的优势：
- 自动处理错误传播
- 自动清理资源
- 支持 Promise

## Transform Stream：转换流

Transform 流同时是可读和可写的，用于处理/转换数据：

```javascript
const { Transform } = require('stream');

const upperCase = new Transform({
  transform(chunk, encoding, callback) {
    this.push(chunk.toString().toUpperCase());
    callback();
  }
});

// 使用
process.stdin
  .pipe(upperCase)
  .pipe(process.stdout);
```

### 实际例子：行处理

```javascript
const { Transform } = require('stream');

class LineTransform extends Transform {
  constructor() {
    super();
    this.buffer = '';
  }
  
  _transform(chunk, encoding, callback) {
    this.buffer += chunk.toString();
    const lines = this.buffer.split('\n');
    this.buffer = lines.pop();  // 保留不完整的行
    
    for (const line of lines) {
      this.push(line + '\n');
    }
    callback();
  }
  
  _flush(callback) {
    if (this.buffer) {
      this.push(this.buffer);
    }
    callback();
  }
}
```

## 实战示例

### 大文件复制

```javascript
const fs = require('fs');
const { pipeline } = require('stream/promises');

async function copyFile(src, dest) {
  await pipeline(
    fs.createReadStream(src),
    fs.createWriteStream(dest)
  );
}
```

### 下载文件

```javascript
const https = require('https');
const fs = require('fs');

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    
    https.get(url, response => {
      response.pipe(file);
      
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', err => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}
```

### 日志处理

```javascript
const readline = require('readline');
const fs = require('fs');

async function countErrors(logPath) {
  const rl = readline.createInterface({
    input: fs.createReadStream(logPath),
    crlfDelay: Infinity
  });
  
  let errorCount = 0;
  
  for await (const line of rl) {
    if (line.includes('ERROR')) {
      errorCount++;
    }
  }
  
  return errorCount;
}
```

### 数据转换管道

```javascript
const { pipeline } = require('stream/promises');
const { createGzip } = require('zlib');
const { createCipheriv, randomBytes } = require('crypto');

async function compressAndEncrypt(input, output, key) {
  const iv = randomBytes(16);
  
  await pipeline(
    fs.createReadStream(input),
    createGzip(),
    createCipheriv('aes-256-cbc', key, iv),
    fs.createWriteStream(output)
  );
}
```

## Stream vs 一次性读取

| 场景 | 推荐方式 |
|------|----------|
| 小文件（< 10MB） | `fs.readFile` / `fs.writeFile` |
| 大文件 | Stream |
| 网络传输 | Stream |
| 实时处理 | Stream |
| 简单读取配置 | 一次性读取 |

## 本章小结

- Stream 将数据分成小块处理，解决内存问题
- 四种类型：Readable、Writable、Duplex、Transform
- `pipe` 连接流，`pipeline` 更安全
- 可读流支持 for-await-of 异步迭代
- 大文件和网络数据优先使用 Stream

下一章我们将学习 process 模块，了解环境变量和进程信息。
