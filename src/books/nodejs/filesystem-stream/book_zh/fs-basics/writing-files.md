# 文件写入：writeFile 与 write

> 写入文件看似简单，但一个错误的写入操作可能导致数据丢失。理解各种写入方式的特性和陷阱，对于构建可靠的应用至关重要。

## writeFile：简单写入

`writeFile` 是最常用的写入方式，它会**覆盖**整个文件：

```javascript
import { writeFile } from 'fs/promises';

// 写入字符串
await writeFile('output.txt', 'Hello, Node.js!');

// 写入 JSON
const config = { debug: true, port: 3000 };
await writeFile('config.json', JSON.stringify(config, null, 2));

// 写入 Buffer
const buffer = Buffer.from([0x48, 0x65, 0x6c, 0x6c, 0x6f]);
await writeFile('binary.bin', buffer);
```

### 配置选项

```javascript
await writeFile(path, data, {
  encoding: 'utf8',      // 编码（默认 'utf8'）
  mode: 0o666,           // 文件权限（默认可读写）
  flag: 'w',             // 打开模式
  signal: controller.signal  // 取消信号
});
```

### 常用 flag 值

| Flag | 含义 | 说明 |
|------|-----|------|
| `'w'` | 写入 | 不存在则创建，存在则**清空** |
| `'wx'` | 独占写入 | 文件已存在则失败 |
| `'a'` | 追加 | 不存在则创建，内容追加到末尾 |
| `'ax'` | 独占追加 | 文件已存在则失败 |

```javascript
// 防止覆盖已存在的文件
try {
  await writeFile('important.txt', data, { flag: 'wx' });
} catch (err) {
  if (err.code === 'EEXIST') {
    console.log('文件已存在，跳过写入');
  }
}
```

## 追加写入

使用 `appendFile` 或 flag `'a'` 追加内容：

```javascript
import { appendFile } from 'fs/promises';

// 追加日志
await appendFile('app.log', `[${new Date().toISOString()}] Server started\n`);

// 等价于
await writeFile('app.log', 'New content\n', { flag: 'a' });
```

### 注意：频繁追加的性能问题

```javascript
// ❌ 每次写入都打开/关闭文件，性能差
for (let i = 0; i < 10000; i++) {
  await appendFile('log.txt', `Line ${i}\n`);
}

// ✅ 使用 FileHandle 保持文件打开
import { open } from 'fs/promises';

const fh = await open('log.txt', 'a');
try {
  for (let i = 0; i < 10000; i++) {
    await fh.appendFile(`Line ${i}\n`);
  }
} finally {
  await fh.close();
}

// ✅✅ 更好：使用可写流
import { createWriteStream } from 'fs';

const stream = createWriteStream('log.txt', { flags: 'a' });
for (let i = 0; i < 10000; i++) {
  stream.write(`Line ${i}\n`);
}
stream.end();
```

## fs.write：底层写入

类似于 `fs.read`，`fs.write` 提供底层控制：

```javascript
import { open } from 'fs/promises';

const fh = await open('data.bin', 'w');

try {
  const buffer = Buffer.from('Hello');
  
  // 将 buffer 写入文件
  const { bytesWritten } = await fh.write(buffer);
  console.log(`写入了 ${bytesWritten} 字节`);
  
  // 在指定位置写入
  await fh.write(Buffer.from('World'), 0, 5, 6);
  
} finally {
  await fh.close();
}
```

### write 参数详解

```javascript
fh.write(buffer, offset, length, position);
// buffer: 要写入的数据
// offset: buffer 中开始读取的位置
// length: 要写入的字节数
// position: 文件中写入的位置（null 表示当前位置）
```

```
Buffer:    [H][e][l][l][o][ ][W][o][r][l][d]
              ↑ offset=0
              写入 length=5 字节
              ↓
文件:      [H][e][l][l][o][---][---][---]...
           ↑ position=0
```

## 原子写入

直接写入文件有风险：如果写入中途程序崩溃，文件可能损坏。

```javascript
// ❌ 危险：写入中途崩溃，文件损坏
await writeFile('config.json', JSON.stringify(config));

// ✅ 安全：先写临时文件，再原子重命名
import { writeFile, rename } from 'fs/promises';
import { randomBytes } from 'crypto';

async function atomicWriteFile(filePath, data) {
  // 生成临时文件名
  const tempPath = `${filePath}.${randomBytes(6).toString('hex')}.tmp`;
  
  try {
    // 写入临时文件
    await writeFile(tempPath, data);
    // 原子重命名（在同一文件系统上是原子操作）
    await rename(tempPath, filePath);
  } catch (err) {
    // 清理临时文件
    try { await unlink(tempPath); } catch {}
    throw err;
  }
}

// 使用原子写入
await atomicWriteFile('config.json', JSON.stringify(config, null, 2));
```

### 为什么 rename 是原子的？

操作系统的 rename 系统调用在同一文件系统上是原子操作。要么完全成功（新文件替换旧文件），要么完全失败（旧文件保持不变）。

## 同步写入

在某些场景（如进程退出前保存状态）需要同步写入：

```javascript
import { writeFileSync } from 'fs';

// 进程退出时保存状态
process.on('exit', () => {
  writeFileSync('state.json', JSON.stringify(appState));
  // 这里必须用同步，因为 exit 后不会执行异步回调
});

// ❌ 异步写入可能来不及完成
process.on('exit', async () => {
  await writeFile('state.json', JSON.stringify(appState));  // 不会执行！
});
```

## 带错误处理的写入

```javascript
async function safeWriteJSON(filePath, data) {
  const content = JSON.stringify(data, null, 2);
  
  try {
    await writeFile(filePath, content, 'utf8');
    return true;
  } catch (err) {
    switch (err.code) {
      case 'ENOENT':
        console.error('目录不存在:', path.dirname(filePath));
        break;
      case 'EACCES':
        console.error('没有写入权限:', filePath);
        break;
      case 'ENOSPC':
        console.error('磁盘空间不足');
        break;
      default:
        console.error('写入失败:', err.message);
    }
    return false;
  }
}
```

## 确保目录存在

写入前，确保父目录存在：

```javascript
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

async function writeFileEnsureDir(filePath, data) {
  const dir = path.dirname(filePath);
  
  // 递归创建目录（如果不存在）
  await mkdir(dir, { recursive: true });
  
  // 写入文件
  await writeFile(filePath, data);
}

// 即使 logs/2024/01 不存在也能成功
await writeFileEnsureDir('logs/2024/01/app.log', 'Log content');
```

## 写入方式对比

| 方法 | 特点 | 适用场景 |
|------|-----|---------|
| `writeFile` | 简单，覆盖整个文件 | 小文件、配置 |
| `appendFile` | 追加内容 | 日志（低频） |
| `fs.write` | 底层控制，精确写入 | 随机访问、二进制 |
| `createWriteStream` | 流式写入 | 大文件、高频写入 |
| 原子写入 | 安全，不会损坏 | 重要配置 |

## 本章小结

- `writeFile` 会完全覆盖文件，使用 flag 控制行为
- 频繁追加写入应使用 FileHandle 或 Stream
- `fs.write` 提供底层控制，可以随机写入
- 重要文件使用原子写入（临时文件 + rename）
- 写入前确保目录存在

下一章我们将学习如何获取和使用文件的元信息。