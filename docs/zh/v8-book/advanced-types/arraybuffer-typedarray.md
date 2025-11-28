# ArrayBuffer 与 TypedArray：二进制数据处理

在处理图像、音频、视频或网络协议数据时，你是否遇到过JavaScript处理二进制数据效率低下的问题？传统的Array存储数字时，每个元素都是完整的JavaScript对象，内存开销巨大且访问速度慢。

```javascript
// 传统数组存储字节数据
const data = [0x48, 0x65, 0x6C, 0x6C, 0x6F];  // "Hello" 的 ASCII 码
// 问题：每个数字都是 Number 对象，占用大量内存
```

ES6引入的`ArrayBuffer`和`TypedArray`提供了高效的二进制数据处理能力，直接操作内存中的原始字节。它们广泛应用于WebGL、Canvas、WebAssembly、File API等场景。

本章将深入V8引擎，揭示`ArrayBuffer`的内存布局、`TypedArray`的视图机制、字节序问题、以及与WebAssembly的深度集成，帮助你掌握JavaScript中的底层数据操作。

## 二进制数据的需求场景

### 传统Array的局限性

JavaScript的普通数组是泛型容器，可存储任意类型：

```javascript
const arr = [1, 'hello', { x: 10 }, true, null];
```

这种灵活性带来严重的性能问题：

**内存开销大**：每个元素都是完整的JavaScript值（Number对象、字符串对象等），存储简单字节数据时浪费大量内存。

```javascript
// 存储256个字节（0-255）
const bytes = [];
for (let i = 0; i < 256; i++) {
  bytes.push(i);
}

// 内存占用：每个 Number 需要 8-16 字节（取决于是否是 Smi）
// 总计：约 2KB-4KB（仅存储 256 字节的数据！）
```

**访问速度慢**：需要通过属性查找访问元素，无法利用CPU的向量化指令（SIMD）。

**数据转换开销**：与C++库、WebAssembly、GPU交互时，需要昂贵的数据格式转换。

### ArrayBuffer与TypedArray的优势

`ArrayBuffer`提供固定长度的原始二进制数据缓冲区，`TypedArray`提供类型化视图访问：

```javascript
// 创建 256 字节的缓冲区
const buffer = new ArrayBuffer(256);

// 通过 Uint8Array 视图访问（每个元素 1 字节）
const bytes = new Uint8Array(buffer);
for (let i = 0; i < 256; i++) {
  bytes[i] = i;
}

// 内存占用：256 字节 + 少量元数据
// 访问速度：接近原生数组，可优化为 SIMD 操作
```

**核心优势**：
- **内存紧凑**：连续存储原始字节，无额外对象开销。
- **高性能访问**：直接内存访问，支持CPU向量化优化。
- **零拷贝共享**：多个TypedArray可共享同一ArrayBuffer，无需复制数据。
- **与底层互操作**：直接传递给WebAssembly、WebGL、Web Workers等。

## ArrayBuffer：原始二进制缓冲区

### ArrayBuffer 的内存结构

`ArrayBuffer`是固定长度的连续字节序列，本身不提供读写方法：

```javascript
const buffer = new ArrayBuffer(16);  // 分配 16 字节

console.log(buffer.byteLength);  // 16
console.log(buffer[0]);          // undefined（无法直接访问）
```

**V8内部结构**：

```
JSArrayBuffer 对象：
+------------------------+
| Map (Hidden Class)     |  ← 指向 JSArrayBuffer 的 Map
+------------------------+
| byte_length            |  ← 缓冲区字节长度（16）
+------------------------+
| backing_store          |  ← 指向实际内存缓冲区的指针
+------------------------+
| is_external            |  ← 是否外部分配（WebAssembly等）
+------------------------+
| is_detachable          |  ← 是否可分离（transferable）
+------------------------+

backing_store 指向的内存（堆外内存）：
+----+----+----+----+----+----+----+----+----+----+----+----+----+----+----+----+
| 00 | 00 | 00 | 00 | 00 | 00 | 00 | 00 | 00 | 00 | 00 | 00 | 00 | 00 | 00 | 00 |
+----+----+----+----+----+----+----+----+----+----+----+----+----+----+----+----+
  0    1    2    3    4    5    6    7    8    9   10   11   12   13   14   15
```

**关键特性**：

**堆外内存分配**：`backing_store`指向V8堆外分配的原始内存，不受V8垃圾回收器直接管理（但JSArrayBuffer对象本身在堆中）。

```cpp
// V8 内部分配逻辑（简化）
void* backing_store = malloc(byte_length);  // 使用系统 malloc
if (!backing_store) {
  throw RangeError("ArrayBuffer allocation failed");
}
```

**固定大小**：创建后无法改变大小，需要重新分配并复制数据。

**可转移（Transferable）**：通过`postMessage`传递给Web Worker时，可零拷贝转移所有权（原ArrayBuffer失效）。

### 创建ArrayBuffer

```javascript
// 方式1：指定字节长度
const buffer1 = new ArrayBuffer(1024);  // 1KB

// 方式2：从已有数据创建（通过 TypedArray）
const buffer2 = new Uint8Array([1, 2, 3, 4]).buffer;

// 检查大小
console.log(buffer1.byteLength);  // 1024
console.log(buffer2.byteLength);  // 4

// 分配失败时抛出异常
try {
  const huge = new ArrayBuffer(1e10);  // 10GB
} catch (e) {
  console.log(e);  // RangeError: Array buffer allocation failed
}
```

### ArrayBuffer 的分离（Detach）

ArrayBuffer可被"分离"（Detached），使其不再可用：

```javascript
const buffer = new ArrayBuffer(8);
const view = new Uint8Array(buffer);
view[0] = 42;

console.log(view[0]);  // 42
console.log(buffer.byteLength);  // 8

// 通过 postMessage 转移所有权后，buffer 被分离
// （实际场景中传递给 Worker）
// transfer(buffer);  

// 模拟分离后的状态
// console.log(buffer.byteLength);  // 0
// view[0] = 10;  // TypeError: Cannot perform %TypedArray%.prototype.set on a detached ArrayBuffer
```

分离后，`byteLength`变为0，所有关联的TypedArray视图都失效。这种机制用于零拷贝数据传输。

## TypedArray：类型化数组视图

### TypedArray 家族

`TypedArray`是一组构造函数的总称，提供不同数据类型的视图：

| 类型              | 字节/元素 | C类型等价     | 值范围                          |
|-------------------|-----------|---------------|--------------------------------|
| `Int8Array`       | 1         | `int8_t`      | -128 到 127                    |
| `Uint8Array`      | 1         | `uint8_t`     | 0 到 255                       |
| `Uint8ClampedArray` | 1       | `uint8_t`     | 0 到 255（溢出时截断）         |
| `Int16Array`      | 2         | `int16_t`     | -32768 到 32767                |
| `Uint16Array`     | 2         | `uint16_t`    | 0 到 65535                     |
| `Int32Array`      | 4         | `int32_t`     | -2147483648 到 2147483647      |
| `Uint32Array`     | 4         | `uint32_t`    | 0 到 4294967295                |
| `Float32Array`    | 4         | `float`       | IEEE 754 单精度                |
| `Float64Array`    | 8         | `double`      | IEEE 754 双精度                |
| `BigInt64Array`   | 8         | `int64_t`     | -2^63 到 2^63-1                |
| `BigUint64Array`  | 8         | `uint64_t`    | 0 到 2^64-1                    |

### 创建TypedArray

```javascript
// 方式1：指定长度（自动创建 ArrayBuffer）
const arr1 = new Uint8Array(10);  // 10个元素，共10字节
console.log(arr1.length);        // 10
console.log(arr1.byteLength);    // 10
console.log(arr1.buffer.byteLength);  // 10

// 方式2：从已有 ArrayBuffer 创建
const buffer = new ArrayBuffer(16);
const arr2 = new Uint8Array(buffer);  // 16个元素
const arr3 = new Uint32Array(buffer); // 4个元素（每个4字节）

console.log(arr2.length);  // 16
console.log(arr3.length);  // 4

// 方式3：从已有数组或类数组创建
const arr4 = new Uint8Array([1, 2, 3, 4, 5]);
console.log(arr4);  // Uint8Array(5) [1, 2, 3, 4, 5]

// 方式4：从另一个 TypedArray 创建（复制数据）
const arr5 = new Uint16Array(arr4);  // 复制并转换类型
console.log(arr5);  // Uint16Array(5) [1, 2, 3, 4, 5]
```

### 视图的偏移与长度

TypedArray可指定在ArrayBuffer中的偏移位置和长度：

```javascript
const buffer = new ArrayBuffer(16);

// 从偏移 4 字节开始，长度 8 字节
const view1 = new Uint8Array(buffer, 4, 8);
console.log(view1.byteOffset);  // 4
console.log(view1.byteLength);  // 8
console.log(view1.length);      // 8

// 从偏移 0 开始，读取整个 buffer
const view2 = new Uint32Array(buffer);
console.log(view2.length);  // 4（16字节 / 4字节每元素）

// 从偏移 8 开始，到末尾
const view3 = new Uint8Array(buffer, 8);
console.log(view3.length);  // 8
```

**内存布局**：

```
ArrayBuffer (16 字节)：
+----+----+----+----+----+----+----+----+----+----+----+----+----+----+----+----+
| 00 | 00 | 00 | 00 | 00 | 00 | 00 | 00 | 00 | 00 | 00 | 00 | 00 | 00 | 00 | 00 |
+----+----+----+----+----+----+----+----+----+----+----+----+----+----+----+----+
  0    1    2    3    4    5    6    7    8    9   10   11   12   13   14   15
                       |                       |
                    view1 (8字节)           view3 (8字节)
```

### 共享同一ArrayBuffer

多个TypedArray可共享同一ArrayBuffer，实现不同视角的数据访问：

```javascript
const buffer = new ArrayBuffer(8);

const int8View = new Int8Array(buffer);
const int32View = new Int32Array(buffer);
const float64View = new Float64Array(buffer);

// 通过 int32View 写入数据
int32View[0] = 0x12345678;

// 其他视图看到相同的内存
console.log(int8View[0].toString(16));  // 78（小端序，低字节在前）
console.log(int8View[1].toString(16));  // 56
console.log(int8View[2].toString(16));  // 34
console.log(int8View[3].toString(16));  // 12

// 通过 float64View 读取（将8字节解释为双精度浮点数）
console.log(float64View[0]);  // 5.447603722011605e-270（随机，取决于内存内容）
```

这种机制实现零拷贝的数据视图转换，常用于类型重解释（Type Punning）。

## DataView：灵活的多类型视图

### DataView vs TypedArray

`TypedArray`将整个buffer视为单一类型数组，而`DataView`提供逐字节的灵活读写，可混合访问不同类型：

```javascript
const buffer = new ArrayBuffer(16);
const dataView = new DataView(buffer);

// 在偏移0处写入32位整数
dataView.setInt32(0, 0x12345678);

// 在偏移4处写入64位浮点数
dataView.setFloat64(4, Math.PI);

// 在偏移12处写入16位无符号整数
dataView.setUint16(12, 65535);

// 读取数据
console.log(dataView.getInt32(0).toString(16));  // 12345678
console.log(dataView.getFloat64(4));             // 3.141592653589793
console.log(dataView.getUint16(12));             // 65535
```

### 字节序控制（Endianness）

`DataView`支持指定字节序（大端/小端）：

```javascript
const buffer = new ArrayBuffer(4);
const view = new DataView(buffer);

// 写入 0x12345678
view.setInt32(0, 0x12345678, false);  // false: 大端序（Big-Endian）

// 以字节查看
const bytes = new Uint8Array(buffer);
console.log([...bytes].map(b => b.toString(16)));  // ['12', '34', '56', '78']

// 小端序写入
view.setInt32(0, 0x12345678, true);  // true: 小端序（Little-Endian）
console.log([...bytes].map(b => b.toString(16)));  // ['78', '56', '34', '12']
```

**字节序说明**：
- **大端序（Big-Endian）**：高位字节在前，如`0x12345678`存储为`12 34 56 78`。网络协议常用。
- **小端序（Little-Endian）**：低位字节在前，如`0x12345678`存储为`78 56 34 12`。x86/x64 CPU使用。

V8在x86/x64平台默认使用小端序，`TypedArray`自动适配平台字节序，而`DataView`允许显式控制。

### DataView的应用场景

**解析二进制协议**：网络数据包、文件格式（PNG、MP3等）常混合多种数据类型。

```javascript
// 解析简化的图像头（假设格式：魔数4字节 + 宽度2字节 + 高度2字节）
function parseImageHeader(buffer) {
  const view = new DataView(buffer);
  
  const magic = view.getUint32(0, false);  // 大端序魔数
  const width = view.getUint16(4, false);
  const height = view.getUint16(6, false);
  
  return { magic, width, height };
}

const headerBuffer = new ArrayBuffer(8);
const headerView = new DataView(headerBuffer);
headerView.setUint32(0, 0x89504E47, false);  // PNG 魔数
headerView.setUint16(4, 1920, false);
headerView.setUint16(6, 1080, false);

console.log(parseImageHeader(headerBuffer));
// { magic: 2303741511, width: 1920, height: 1080 }
```

**跨平台数据序列化**：确保不同字节序系统间数据一致性。

## TypedArray 的操作与方法

### 元素访问

TypedArray提供类似普通数组的访问方式：

```javascript
const arr = new Uint8Array(5);

// 写入
arr[0] = 10;
arr[1] = 20;
arr[2] = 30;

// 读取
console.log(arr[0]);  // 10
console.log(arr[2]);  // 30

// 边界检查
arr[10] = 100;  // 超出范围，静默忽略（严格模式下也不报错）
console.log(arr[10]);  // undefined
console.log(arr.length);  // 5（长度不变）
```

**关键区别**：TypedArray的索引访问经过边界检查，超出范围时返回`undefined`而非扩展数组。

### 溢出行为

不同TypedArray对溢出值的处理不同：

```javascript
// Uint8Array：模运算（0-255循环）
const uint8 = new Uint8Array(1);
uint8[0] = 256;  // 256 % 256 = 0
console.log(uint8[0]);  // 0

uint8[0] = 257;  // 257 % 256 = 1
console.log(uint8[0]);  // 1

// Uint8ClampedArray：截断到范围（用于Canvas像素）
const clamped = new Uint8ClampedArray(1);
clamped[0] = 256;  // 截断到 255
console.log(clamped[0]);  // 255

clamped[0] = -10;  // 截断到 0
console.log(clamped[0]);  // 0

// Int8Array：有符号溢出
const int8 = new Int8Array(1);
int8[0] = 128;  // 128 对于 int8 溢出，变为 -128
console.log(int8[0]);  // -128

int8[0] = 127;
console.log(int8[0]);  // 127
```

### 常用方法

TypedArray继承大部分Array方法：

```javascript
const arr = new Uint8Array([5, 2, 8, 1, 9]);

// 迭代方法
arr.forEach((value, index) => {
  console.log(`arr[${index}] = ${value}`);
});

// 查找
console.log(arr.indexOf(8));  // 2
console.log(arr.includes(1));  // true

// 过滤
const filtered = arr.filter(x => x > 5);
console.log(filtered);  // Uint8Array(2) [8, 9]

// 映射
const doubled = arr.map(x => x * 2);
console.log(doubled);  // Uint8Array(5) [10, 4, 16, 2, 18]

// 排序
arr.sort();
console.log(arr);  // Uint8Array(5) [1, 2, 5, 8, 9]

// 反转
arr.reverse();
console.log(arr);  // Uint8Array(5) [9, 8, 5, 2, 1]

// 切片（创建新视图）
const sliced = arr.slice(1, 4);
console.log(sliced);  // Uint8Array(3) [8, 5, 2]

// 子数组（共享同一 buffer）
const sub = arr.subarray(1, 4);
sub[0] = 100;
console.log(arr);  // Uint8Array(5) [9, 100, 5, 2, 1]（原数组也改变）
```

**slice vs subarray**：
- `slice()`：复制数据到新ArrayBuffer，独立存储。
- `subarray()`：创建新视图共享原ArrayBuffer，修改会相互影响。

### 数据复制

```javascript
const src = new Uint8Array([1, 2, 3, 4, 5]);
const dst = new Uint8Array(10);

// set()：从另一个数组复制数据
dst.set(src, 2);  // 从偏移2开始复制
console.log(dst);  // Uint8Array(10) [0, 0, 1, 2, 3, 4, 5, 0, 0, 0]

// copyWithin()：在数组内复制（类似 memmove）
dst.copyWithin(0, 2, 7);  // 将 [2, 7) 复制到偏移0
console.log(dst);  // Uint8Array(10) [1, 2, 3, 4, 5, 4, 5, 0, 0, 0]
```

## 性能优化与最佳实践

### TypedArray vs Array：性能对比

```javascript
function testPerformance(size) {
  // 普通数组
  console.time('Array creation');
  const arr = new Array(size);
  for (let i = 0; i < size; i++) {
    arr[i] = i % 256;
  }
  console.timeEnd('Array creation');
  
  console.time('Array sum');
  let sum1 = 0;
  for (let i = 0; i < size; i++) {
    sum1 += arr[i];
  }
  console.timeEnd('Array sum');
  
  // TypedArray
  console.time('TypedArray creation');
  const typedArr = new Uint8Array(size);
  for (let i = 0; i < size; i++) {
    typedArr[i] = i % 256;
  }
  console.timeEnd('TypedArray creation');
  
  console.time('TypedArray sum');
  let sum2 = 0;
  for (let i = 0; i < size; i++) {
    sum2 += typedArr[i];
  }
  console.timeEnd('TypedArray sum');
}

testPerformance(10000000);
// Array creation: 150ms
// Array sum: 45ms
// TypedArray creation: 50ms（快3倍）
// TypedArray sum: 15ms（快3倍）
```

**性能优势**：
- **内存分配快**：连续内存块，无需逐个对象分配。
- **访问速度快**：无属性查找开销，可优化为SIMD指令。
- **内存占用小**：紧凑存储，无对象头开销。

### 选择合适的TypedArray类型

根据数据范围选择最小的类型：

```javascript
// 不好：使用过大的类型
const largeType = new Uint32Array(1000000);  // 4MB

// 好：数据范围 0-255，使用 Uint8Array
const smallType = new Uint8Array(1000000);   // 1MB（节省75%内存）
```

**选择指南**：
- **像素数据**：`Uint8ClampedArray`（Canvas ImageData）。
- **音频样本**：`Float32Array`或`Int16Array`。
- **索引数组**：`Uint16Array`或`Uint32Array`（取决于顶点数）。
- **通用字节数据**：`Uint8Array`。

### 避免频繁创建临时ArrayBuffer

```javascript
// 不好：循环内创建临时 buffer
function processData(dataList) {
  for (const data of dataList) {
    const buffer = new ArrayBuffer(1024);  // 频繁分配
    const view = new Uint8Array(buffer);
    // 处理 view...
  }
}

// 好：复用 buffer
function processDataOptimized(dataList) {
  const buffer = new ArrayBuffer(1024);    // 一次分配
  const view = new Uint8Array(buffer);
  
  for (const data of dataList) {
    view.fill(0);  // 清空重用
    // 处理 view...
  }
}
```

### 利用WebAssembly共享内存

TypedArray可直接映射WebAssembly的线性内存：

```javascript
// WebAssembly 模块导出内存
const wasmModule = new WebAssembly.Module(wasmBinary);
const wasmInstance = new WebAssembly.Instance(wasmModule);
const memory = wasmInstance.exports.memory;

// 直接访问 WASM 内存（零拷贝）
const buffer = memory.buffer;
const heapU8 = new Uint8Array(buffer);
const heapI32 = new Int32Array(buffer);

// JavaScript 和 WASM 共享数据
heapI32[0] = 42;
// WASM 函数可直接读取该值，无需数据拷贝
```

## 实际应用场景

### 图像处理

Canvas API使用`Uint8ClampedArray`存储像素数据：

```javascript
const canvas = document.createElement('canvas');
canvas.width = 256;
canvas.height = 256;
const ctx = canvas.getContext('2d');

// 获取像素数据（RGBA 格式，每像素4字节）
const imageData = ctx.getImageData(0, 0, 256, 256);
const pixels = imageData.data;  // Uint8ClampedArray

console.log(pixels.length);  // 262144（256 * 256 * 4）

// 图像处理：反转颜色
for (let i = 0; i < pixels.length; i += 4) {
  pixels[i] = 255 - pixels[i];       // Red
  pixels[i + 1] = 255 - pixels[i + 1]; // Green
  pixels[i + 2] = 255 - pixels[i + 2]; // Blue
  // pixels[i + 3] 是 Alpha 通道，不修改
}

// 写回 Canvas
ctx.putImageData(imageData, 0, 0);
```

### 音频处理

Web Audio API使用`Float32Array`存储音频样本：

```javascript
const audioContext = new AudioContext();
const sampleRate = audioContext.sampleRate;  // 48000 Hz
const duration = 1;  // 1秒

// 创建音频 buffer（单声道）
const buffer = audioContext.createBuffer(1, sampleRate * duration, sampleRate);
const channelData = buffer.getChannelData(0);  // Float32Array

// 生成440Hz正弦波（A音）
const frequency = 440;
for (let i = 0; i < channelData.length; i++) {
  const t = i / sampleRate;
  channelData[i] = Math.sin(2 * Math.PI * frequency * t);
}

// 播放
const source = audioContext.createBufferSource();
source.buffer = buffer;
source.connect(audioContext.destination);
source.start();
```

### 文件读取

File API返回`ArrayBuffer`：

```javascript
const fileInput = document.querySelector('input[type="file"]');
fileInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  
  // 读取为 ArrayBuffer
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  
  // 检查文件头（PNG 魔数）
  if (bytes[0] === 0x89 && bytes[1] === 0x50 &&
      bytes[2] === 0x4E && bytes[3] === 0x47) {
    console.log('这是一个 PNG 文件');
  }
  
  // 解析文件内容...
});
```

### 网络协议解析

WebSocket接收二进制数据：

```javascript
const ws = new WebSocket('ws://example.com');
ws.binaryType = 'arraybuffer';  // 接收 ArrayBuffer

ws.onmessage = (event) => {
  const buffer = event.data;  // ArrayBuffer
  const view = new DataView(buffer);
  
  // 解析自定义协议（假设：2字节消息类型 + 4字节长度 + 数据）
  const messageType = view.getUint16(0, false);
  const length = view.getUint32(2, false);
  const data = new Uint8Array(buffer, 6, length);
  
  console.log(`消息类型: ${messageType}, 数据长度: ${length}`);
  console.log('数据:', data);
};
```

## 本章小结

`ArrayBuffer`和`TypedArray`为JavaScript提供了高效的二进制数据处理能力，广泛应用于图形、音频、网络、文件处理等底层场景：

1. **ArrayBuffer核心机制**：固定长度的原始字节缓冲区，使用堆外内存（`backing_store`）存储，支持零拷贝转移（Transferable），可被分离（Detached）失效关联视图。

2. **TypedArray视图系统**：11种类型化数组提供不同数据类型的视图（Int8到BigUint64），共享同一ArrayBuffer实现零拷贝数据访问，支持偏移和长度控制，溢出行为因类型而异（模运算、截断、有符号溢出）。

3. **DataView灵活访问**：逐字节混合读写不同类型，支持显式字节序控制（大端/小端），适合解析二进制协议和跨平台数据序列化。

4. **性能优势**：相比普通Array，TypedArray内存占用小（紧凑存储）、创建速度快（连续分配）、访问速度快（无属性查找，可SIMD优化），与WebAssembly、WebGL等底层API零拷贝集成。

5. **实践应用**：Canvas像素处理（Uint8ClampedArray）、Web Audio音频处理（Float32Array）、文件解析（ArrayBuffer + DataView）、WebSocket二进制协议（DataView字节序控制）。

理解这些底层机制后，你可以在需要高性能二进制数据处理的场景中，充分利用TypedArray的能力，编写高效的底层数据操作代码。下一章我们将探讨迭代器与生成器，看V8如何实现Iterator协议与状态机。

### 思考题

1. 为什么V8将ArrayBuffer的数据存储在堆外内存（`backing_store`）而非V8堆中？这种设计有什么优势和限制？

2. 实现一个`BitArray`类，使用`Uint8Array`底层存储，但提供位级别的读写操作（每个元素是1位布尔值），支持`get(index)`、`set(index, value)`、`toggle(index)`方法。

3. 解释为什么`Uint8ClampedArray`专门用于Canvas像素数据？如果使用`Uint8Array`会有什么问题？
