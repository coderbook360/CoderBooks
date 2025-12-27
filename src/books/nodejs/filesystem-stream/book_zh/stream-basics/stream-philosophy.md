# Stream 设计理念与优势

> 为什么要用 Stream？一个简单的答案：因为内存是有限的，而数据可能是无限的。

## 从一个问题开始

假设你需要处理一个 10GB 的日志文件：

```javascript
import { readFile } from 'fs/promises';

// 方式1：一次性读取
const content = await readFile('huge.log', 'utf8');
// ❌ Node.js 默认最大堆内存约 4GB
// ❌ 即使内存够用，读取完才能开始处理
// ❌ 内存占用峰值 = 文件大小
```

```javascript
import { createReadStream } from 'fs';

// 方式2：使用 Stream
const stream = createReadStream('huge.log', 'utf8');
// ✅ 内存占用恒定（默认约 64KB 缓冲区）
// ✅ 读取一块，处理一块
// ✅ 可以处理任意大的文件
```

这就是 Stream 的核心价值：**用时间换空间**。

## Stream 是什么

Stream（流）是对**连续数据**的抽象。就像水流一样，数据从一个地方流向另一个地方：

```
数据源  →  处理  →  处理  →  目标
(Source)   (Transform)      (Destination)

文件    →  解压  →  解析  →  数据库
网络    →  解密  →  转换  →  文件
用户输入 →  验证  →  格式化 → 响应
```

## 核心理念

### 1. 小块处理

不是"全部读取 → 全部处理 → 全部写入"，而是：

```
传统方式：
[==========完整数据==========] → 处理 → 输出

Stream 方式：
[块1] → 处理 → 输出
[块2] → 处理 → 输出
[块3] → 处理 → 输出
...
```

### 2. 生产者-消费者模型

```
生产者（Readable）    消费者（Writable）
    ↓ 产生数据           ↑ 消费数据
    ↓                   ↑
    └───── 缓冲区 ─────┘
           (Buffer)
```

生产速度和消费速度可能不同。缓冲区起到"蓄水池"的作用。

### 3. 背压（Backpressure）

当消费者处理不过来时，需要告诉生产者"慢一点"：

```javascript
const readable = createReadStream('huge.log');
const writable = createWriteStream('output.txt');

readable.on('data', (chunk) => {
  // write 返回 false 表示"我满了，先别发"
  const canContinue = writable.write(chunk);
  
  if (!canContinue) {
    readable.pause();  // 暂停读取
    writable.once('drain', () => {
      readable.resume();  // 缓冲区清空后继续
    });
  }
});
```

这就是背压机制，防止内存溢出。

## 与缓冲对比

| 方面 | 缓冲（Buffer） | 流（Stream） |
|-----|--------------|-------------|
| 内存占用 | 完整数据大小 | 固定缓冲区大小 |
| 处理延迟 | 必须等全部读取 | 读到就处理 |
| 适合场景 | 小文件、需要随机访问 | 大文件、实时处理 |
| 复杂度 | 简单 | 较复杂 |

```javascript
// 缓冲方式：100MB 文件需要 100MB+ 内存
const data = await readFile('100mb.bin');
const processed = transform(data);
await writeFile('output.bin', processed);

// 流方式：100MB 文件只需要约 64KB 内存
pipeline(
  createReadStream('100mb.bin'),
  createTransformStream(),
  createWriteStream('output.bin')
);
```

## 流的类型

Node.js 有四种流类型：

```
Readable   → 数据源（文件读取、HTTP 请求体、stdin）
Writable   → 数据目标（文件写入、HTTP 响应、stdout）
Duplex     → 双向流（TCP Socket、WebSocket）
Transform  → 转换流（压缩、加密、解析）
```

```
           ┌─────────────┐
           │   Readable   │  产生数据
           └──────┬──────┘
                  ↓
           ┌─────────────┐
           │  Transform   │  转换数据
           └──────┬──────┘
                  ↓
           ┌─────────────┐
           │   Writable   │  消费数据
           └─────────────┘
```

## 流在 Node.js 中的应用

流无处不在：

```javascript
// HTTP
http.createServer((req, res) => {
  // req 是 Readable Stream
  // res 是 Writable Stream
});

// 文件
createReadStream('file.txt');   // Readable
createWriteStream('file.txt');  // Writable

// 进程
process.stdin;   // Readable
process.stdout;  // Writable
process.stderr;  // Writable

// 网络
net.createConnection();  // Duplex

// 压缩
zlib.createGzip();       // Transform
zlib.createGunzip();     // Transform

// 加密
crypto.createCipheriv(); // Transform
```

## 管道（Pipe）

管道是连接流的最简洁方式：

```javascript
import { createReadStream, createWriteStream } from 'fs';
import { createGzip } from 'zlib';

// 读取 → 压缩 → 写入
createReadStream('input.txt')
  .pipe(createGzip())
  .pipe(createWriteStream('output.txt.gz'));
```

管道自动处理：
- 数据传递
- 背压控制
- 错误传播（部分）
- 流的结束

## 实际优势

### 1. 内存效率

```javascript
// 处理 10GB 文件
// 缓冲方式：需要 10GB+ 内存
// 流方式：只需 ~64KB 内存
```

### 2. 时间效率

```javascript
// 文件复制
// 缓冲：读完 → 写入（串行）
// 流：边读边写（并行）

// 假设读写各需 5 秒
// 缓冲方式：5 + 5 = 10 秒
// 流方式：约 5 秒（读写重叠）
```

### 3. 可组合性

```javascript
// 像乐高一样组合功能
source
  .pipe(decrypt())      // 解密
  .pipe(decompress())   // 解压
  .pipe(parse())        // 解析
  .pipe(validate())     // 验证
  .pipe(transform())    // 转换
  .pipe(destination);   // 写入
```

### 4. 实时处理

```javascript
// 实时日志处理
const tail = spawn('tail', ['-f', '/var/log/app.log']);

tail.stdout
  .pipe(filterErrors())
  .pipe(alerter());  // 实时告警
```

## 何时使用流

**适合使用流的场景**：
- 大文件处理（> 100MB）
- 实时数据处理（日志、监控）
- 网络数据传输
- 需要组合多个处理步骤
- 内存敏感的环境

**可以不用流的场景**：
- 小文件（< 10MB）
- 需要随机访问
- 简单的一次性操作
- 代码简洁性优先

## 本章小结

- Stream 的核心是**小块处理**，用时间换空间
- 背压机制防止快生产者压垮慢消费者
- 四种流类型：Readable、Writable、Duplex、Transform
- 管道（pipe）是连接流的标准方式
- 流在 Node.js 中无处不在：文件、网络、进程

下一章我们将学习 Node.js 的四种流类型及其特点。