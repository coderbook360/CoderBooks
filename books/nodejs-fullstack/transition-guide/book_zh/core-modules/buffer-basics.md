# Buffer 基础：二进制数据处理入门

在浏览器中，你几乎不需要直接处理二进制数据。但在 Node.js 中，文件、网络、加密——一切都是二进制。Buffer 是 Node.js 处理二进制数据的核心。

## 为什么需要 Buffer

JavaScript 的字符串使用 UTF-16 编码，每个字符至少占 2 个字节。但二进制数据（图片、音频、网络数据包）是原始字节流，不能直接用字符串表示。

```javascript
// 字符串无法正确表示二进制数据
const binary = '\x00\x01\x02';  // 这不是真正的二进制处理

// Buffer 正确处理字节
const buffer = Buffer.from([0x00, 0x01, 0x02]);
console.log(buffer);  // <Buffer 00 01 02>
```

Node.js 的 Buffer 类专门用于处理这些原始二进制数据。

## 创建 Buffer

### 推荐方式

```javascript
// 1. 创建指定大小的 Buffer，用 0 填充
const buf1 = Buffer.alloc(10);
console.log(buf1);  // <Buffer 00 00 00 00 00 00 00 00 00 00>

// 2. 创建并填充指定值
const buf2 = Buffer.alloc(10, 1);
console.log(buf2);  // <Buffer 01 01 01 01 01 01 01 01 01 01>

// 3. 从字符串创建
const buf3 = Buffer.from('Hello');
console.log(buf3);  // <Buffer 48 65 6c 6c 6f>

// 4. 从数组创建
const buf4 = Buffer.from([72, 101, 108, 108, 111]);
console.log(buf4.toString());  // 'Hello'

// 5. 复制现有 Buffer
const buf5 = Buffer.from(buf3);
```

### 不安全方式（性能优先）

```javascript
// allocUnsafe 更快，但内存未清零，可能包含旧数据
const buf = Buffer.allocUnsafe(10);
// 必须立即写入数据，否则可能泄露敏感信息

// 正确使用
const buf = Buffer.allocUnsafe(1024);
buf.fill(0);  // 手动清零
```

### 废弃的方式

```javascript
// 不要使用 new Buffer()，已废弃
const buf = new Buffer(10);  // 警告！安全问题
```

## Buffer 与字符串转换

### 字符串到 Buffer

```javascript
// 默认 UTF-8 编码
const buf = Buffer.from('Hello');

// 指定编码
const buf2 = Buffer.from('你好', 'utf8');
const buf3 = Buffer.from('48656c6c6f', 'hex');
const buf4 = Buffer.from('SGVsbG8=', 'base64');
```

### Buffer 到字符串

```javascript
const buf = Buffer.from('Hello World');

buf.toString();           // 'Hello World'
buf.toString('utf8');     // 'Hello World'
buf.toString('hex');      // '48656c6c6f20576f726c64'
buf.toString('base64');   // 'SGVsbG8gV29ybGQ='

// 部分转换
buf.toString('utf8', 0, 5);  // 'Hello'
```

### 支持的编码

| 编码 | 说明 |
|------|------|
| `utf8` | 默认，多字节 Unicode |
| `ascii` | 7 位 ASCII |
| `latin1` | 单字节 Latin-1 |
| `base64` | Base64 编码 |
| `base64url` | URL 安全的 Base64 |
| `hex` | 十六进制 |
| `binary` | latin1 的别名 |

## Buffer 基本操作

### 读写字节

```javascript
const buf = Buffer.alloc(4);

// 写入
buf[0] = 0x48;
buf[1] = 0x69;
buf.writeUInt8(0x21, 2);

// 读取
console.log(buf[0]);         // 72 (0x48)
console.log(buf.readUInt8(2));  // 33 (0x21)
```

### 写入数字

```javascript
const buf = Buffer.alloc(8);

// 写入不同大小的整数
buf.writeUInt8(255, 0);           // 1 字节无符号
buf.writeUInt16BE(65535, 1);      // 2 字节大端
buf.writeUInt32LE(4294967295, 3); // 4 字节小端

// 写入浮点数
const floatBuf = Buffer.alloc(4);
floatBuf.writeFloatBE(3.14, 0);
```

### 填充

```javascript
const buf = Buffer.alloc(10);

buf.fill(0);          // 用 0 填充
buf.fill('a');        // 用 'a' 填充
buf.fill(0, 5);       // 从位置 5 开始填充
buf.fill(0, 2, 5);    // 填充位置 2-4
```

### 比较

```javascript
const buf1 = Buffer.from('abc');
const buf2 = Buffer.from('abc');
const buf3 = Buffer.from('abd');

buf1.equals(buf2);    // true
buf1.equals(buf3);    // false

Buffer.compare(buf1, buf3);  // -1 (buf1 < buf3)
```

### 复制

```javascript
const src = Buffer.from('Hello');
const dest = Buffer.alloc(10);

src.copy(dest);           // 复制全部
src.copy(dest, 5);        // 从目标位置 5 开始
src.copy(dest, 0, 0, 3);  // 只复制前 3 字节
```

### 切片

```javascript
const buf = Buffer.from('Hello World');

const slice = buf.slice(0, 5);
console.log(slice.toString());  // 'Hello'

// 注意：slice 共享内存！
slice[0] = 0x4a;  // 'J'
console.log(buf.toString());    // 'Jello World'

// 使用 subarray（推荐）也共享内存
const sub = buf.subarray(0, 5);
```

### 拼接

```javascript
const buf1 = Buffer.from('Hello ');
const buf2 = Buffer.from('World');

const combined = Buffer.concat([buf1, buf2]);
console.log(combined.toString());  // 'Hello World'

// 指定总长度
const limited = Buffer.concat([buf1, buf2], 8);
console.log(limited.toString());  // 'Hello Wo'
```

## Buffer 与 TypedArray

Buffer 继承自 Uint8Array：

```javascript
const buf = Buffer.from([1, 2, 3, 4]);

// Buffer 是 Uint8Array
console.log(buf instanceof Uint8Array);  // true

// 可以使用 TypedArray 方法
buf.forEach(byte => console.log(byte));
const mapped = buf.map(x => x * 2);

// 与 ArrayBuffer 的关系
const arrayBuffer = buf.buffer;
const view = new DataView(arrayBuffer);
```

### 从 ArrayBuffer 创建

```javascript
// 创建共享内存的 Buffer
const ab = new ArrayBuffer(10);
const buf = Buffer.from(ab);

// 创建副本
const bufCopy = Buffer.from(new Uint8Array(ab));
```

## 常见使用场景

### 读取二进制文件

```javascript
const fs = require('fs/promises');

async function readBinaryFile(path) {
  const buffer = await fs.readFile(path);
  
  // 检查文件类型（通过魔数）
  if (buffer[0] === 0x89 && buffer[1] === 0x50) {
    console.log('这是 PNG 图片');
  }
  
  return buffer;
}
```

### Base64 编解码

```javascript
// 编码
function toBase64(str) {
  return Buffer.from(str).toString('base64');
}

// 解码
function fromBase64(base64) {
  return Buffer.from(base64, 'base64').toString();
}

toBase64('Hello');        // 'SGVsbG8='
fromBase64('SGVsbG8=');   // 'Hello'
```

### 处理网络数据

```javascript
const net = require('net');

const server = net.createServer(socket => {
  const chunks = [];
  
  socket.on('data', chunk => {
    chunks.push(chunk);  // chunk 是 Buffer
  });
  
  socket.on('end', () => {
    const data = Buffer.concat(chunks);
    console.log('收到数据:', data.length, '字节');
  });
});
```

### 十六进制处理

```javascript
// 十六进制字符串 ↔ Buffer
const hexString = 'deadbeef';
const buf = Buffer.from(hexString, 'hex');
console.log(buf);  // <Buffer de ad be ef>

buf.toString('hex');  // 'deadbeef'
```

## 性能注意事项

### 避免频繁创建

```javascript
// 不好：每次都创建新 Buffer
function process(data) {
  const buf = Buffer.alloc(1024);
  // ...
}

// 好：重用 Buffer
const buf = Buffer.alloc(1024);
function process(data) {
  buf.fill(0);
  // ...
}
```

### 大文件使用流

```javascript
// 不好：一次性读取大文件
const huge = await fs.readFile('huge-file.bin');

// 好：使用流
const stream = fs.createReadStream('huge-file.bin');
for await (const chunk of stream) {
  // 处理每个 chunk
}
```

## 本章小结

- Buffer 是 Node.js 处理二进制数据的核心类
- 使用 `Buffer.alloc()` 和 `Buffer.from()` 创建 Buffer
- 通过编码参数实现 Buffer 与字符串的转换
- Buffer 继承自 Uint8Array，可以使用 TypedArray 方法
- `slice` 和 `subarray` 返回的是视图，共享内存
- 使用 `Buffer.concat()` 拼接多个 Buffer

下一章我们将学习 Stream，理解 Node.js 的流式数据处理思维。
