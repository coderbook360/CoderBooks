# Buffer 基础：二进制数据处理入门

## 章节定位

本章是新增的关键章节。Buffer 是 Node.js 中处理二进制数据的核心类，前端开发者几乎不接触二进制数据，这是需要重点学习的内容。

## 学习目标

读完本章，读者应该能够：

1. 理解什么是 Buffer 以及为什么需要它
2. 掌握 Buffer 的创建和基本操作
3. 理解 Buffer 与字符串的编码转换
4. 了解 Buffer 与 TypedArray 的关系
5. 掌握常见的 Buffer 使用场景

## 核心知识点

### 1. 为什么需要 Buffer

- JavaScript 字符串是 UTF-16 编码，无法直接处理二进制
- 网络传输、文件读写都是二进制数据
- Buffer 是 Node.js 处理二进制的核心工具

### 2. Buffer 创建方式

```javascript
// 推荐方式
const buf1 = Buffer.alloc(10);           // 创建 10 字节，填充 0
const buf2 = Buffer.alloc(10, 1);        // 创建 10 字节，填充 1
const buf3 = Buffer.from('Hello');        // 从字符串创建
const buf4 = Buffer.from([1, 2, 3]);      // 从数组创建
const buf5 = Buffer.from(buf1);           // 复制 Buffer

// 不安全方式（可能包含旧数据）
const buf6 = Buffer.allocUnsafe(10);
```

### 3. Buffer 与字符串转换

```javascript
// 字符串 → Buffer
const buf = Buffer.from('你好', 'utf8');

// Buffer → 字符串
const str = buf.toString('utf8');

// 支持的编码
// utf8, ascii, base64, base64url, hex, latin1, binary
```

### 4. Buffer 基本操作

```javascript
// 读写单个字节
buf[0] = 0x48;
console.log(buf[0]);

// 切片（共享内存）
const slice = buf.slice(0, 5);

// 复制
const target = Buffer.alloc(10);
buf.copy(target, 0, 0, 5);

// 拼接
const combined = Buffer.concat([buf1, buf2]);

// 比较
buf1.equals(buf2);
buf1.compare(buf2);
```

### 5. Buffer 与 TypedArray

- Buffer 是 Uint8Array 的子类
- 可以共享 ArrayBuffer
- 可以使用 DataView 进行更精细的控制

```javascript
const buf = Buffer.from([1, 2, 3, 4]);
const arr = new Uint8Array(buf.buffer, buf.byteOffset, buf.length);
```

### 6. 常见使用场景

- 文件读写
- 网络数据传输
- 加密解密操作
- 图片/音视频处理
- 二进制协议解析

## 写作要求

### 内容结构

1. **开篇**：以"为什么要学习 Buffer？"切入，对比前端和 Node.js 的差异
2. **概念解释**：什么是二进制数据，为什么 JavaScript 原生不支持
3. **创建方式**：各种创建方法和适用场景
4. **编码转换**：字符串和 Buffer 的转换
5. **基本操作**：读写、切片、复制、拼接
6. **实战示例**：读取文件并处理

### 代码示例要求

- 简洁明了，每个示例演示一个概念
- 展示输出结果
- 标注关键点

### 避免的内容

- 不要深入内存分配策略
- 不要讲解 Buffer 源码
- 不要讲复杂的二进制协议

## 示例代码片段

```javascript
const fs = require('fs');

// 读取文件为 Buffer
const buffer = fs.readFileSync('image.png');
console.log('文件大小:', buffer.length, '字节');
console.log('前 4 字节:', buffer.slice(0, 4));

// PNG 文件头检测
const pngHeader = Buffer.from([0x89, 0x50, 0x4E, 0x47]);
const isPng = buffer.slice(0, 4).equals(pngHeader);
console.log('是否是 PNG:', isPng);
```

## 章节长度

约 2500-3000 字，入门级但概念要清晰。
