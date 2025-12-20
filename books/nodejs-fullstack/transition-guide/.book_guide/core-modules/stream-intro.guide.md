# Stream 入门：流式处理思维

## 章节定位

本章是新增的关键章节。Stream 是 Node.js 最重要的概念之一，几乎所有 I/O 操作都基于 Stream。前端开发者对此概念较为陌生，需要建立全新的思维模型。

## 学习目标

读完本章，读者应该能够：

1. 理解为什么需要 Stream（内存效率）
2. 理解 Stream 的核心思想（数据分块处理）
3. 了解四种 Stream 类型
4. 掌握 Readable 和 Writable 的基本使用
5. 理解 pipe 的作用和用法

## 核心知识点

### 1. 为什么需要 Stream

**问题场景**：处理 1GB 文件
```javascript
// 错误做法：一次性读入内存
const data = fs.readFileSync('1gb-file.txt'); // 内存爆炸！

// 正确做法：流式处理
const stream = fs.createReadStream('1gb-file.txt');
stream.on('data', chunk => {
  // 每次只处理一小块数据
});
```

- 内存效率：不需要将整个数据加载到内存
- 时间效率：可以边读边处理，不用等待全部加载
- 组合能力：可以将多个处理步骤串联

### 2. Stream 核心思想

- 数据不是一次性获取，而是分成小块（chunk）
- 像流水一样，数据持续流动
- 生产者-消费者模型

### 3. 四种 Stream 类型

| 类型 | 描述 | 例子 |
|------|------|------|
| Readable | 可读流，数据源 | fs.createReadStream, http.IncomingMessage |
| Writable | 可写流，数据目标 | fs.createWriteStream, http.ServerResponse |
| Duplex | 双工流，可读可写 | net.Socket, TCP 连接 |
| Transform | 转换流，处理数据 | zlib.createGzip, 压缩流 |

### 4. Readable Stream 基本用法

```javascript
const fs = require('fs');

const readable = fs.createReadStream('file.txt', {
  encoding: 'utf8',
  highWaterMark: 64 * 1024 // 每次读取 64KB
});

readable.on('data', chunk => {
  console.log('收到数据:', chunk.length);
});

readable.on('end', () => {
  console.log('读取完成');
});

readable.on('error', err => {
  console.error('读取出错:', err);
});
```

### 5. Writable Stream 基本用法

```javascript
const fs = require('fs');

const writable = fs.createWriteStream('output.txt');

writable.write('Hello ');
writable.write('World!');
writable.end(); // 结束写入

writable.on('finish', () => {
  console.log('写入完成');
});
```

### 6. pipe 连接流

```javascript
const fs = require('fs');

// 复制文件的最佳方式
fs.createReadStream('input.txt')
  .pipe(fs.createWriteStream('output.txt'));

// 链式处理
fs.createReadStream('file.txt')
  .pipe(zlib.createGzip())
  .pipe(fs.createWriteStream('file.txt.gz'));
```

### 7. 实际应用场景

- 大文件处理
- HTTP 请求/响应
- 文件压缩/解压
- 数据转换处理
- 实时数据处理

## 写作要求

### 内容结构

1. **开篇**：以"如何处理 1GB 的文件？"切入
2. **问题引出**：一次性读取的问题
3. **核心思想**：Stream 的设计理念
4. **四种类型**：简要介绍
5. **基本使用**：Readable 和 Writable
6. **pipe 连接**：组合流的威力
7. **实战示例**：文件复制、压缩

### 代码示例要求

- 对比一次性读取和流式读取
- 展示事件监听模式
- 展示 pipe 的简洁性

### 避免的内容

- 不要深入 backpressure（背压）
- 不要讲自定义 Stream
- 不要讲 Stream 的内部实现
- 这些是 02-filesystem-stream 的内容

## 示例代码片段

```javascript
const fs = require('fs');
const zlib = require('zlib');

// 压缩文件的优雅方式
const source = fs.createReadStream('input.txt');
const gzip = zlib.createGzip();
const destination = fs.createWriteStream('input.txt.gz');

source.pipe(gzip).pipe(destination);

destination.on('finish', () => {
  console.log('压缩完成');
});
```

## 章节长度

约 2500-3000 字，建立正确的 Stream 思维即可，深入内容放在后续书籍。
