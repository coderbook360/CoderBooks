# WebAssembly在Node.js中的集成

JavaScript很快，但某些计算密集型任务仍然需要更接近原生的性能。WebAssembly（Wasm）为Node.js带来了接近C/C++/Rust的执行速度，同时保持了良好的可移植性和安全性。

## WebAssembly是什么？

WebAssembly是一种**低级二进制指令格式**，专为高效执行和紧凑表示而设计：

```
┌─────────────────────────────────────────────────────────────┐
│                    WebAssembly 定位                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  源语言                    编译目标            运行环境       │
│                                                             │
│  ┌────────┐                                                │
│  │  C/C++ │ ──┐                                            │
│  └────────┘   │                                            │
│  ┌────────┐   │        ┌──────────┐      ┌───────────┐    │
│  │  Rust  │ ──┼──────→ │   .wasm  │ ───→ │ V8/SpiderMonkey│
│  └────────┘   │        │ (二进制)  │      │ 浏览器/Node.js │
│  ┌────────┐   │        └──────────┘      └───────────┘    │
│  │   Go   │ ──┤                                            │
│  └────────┘   │                                            │
│  ┌────────┐   │                                            │
│  │AssemblyScript──┘                                        │
│  └────────┘                                                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 与JavaScript的关系

WebAssembly不是要取代JavaScript，而是**互补**：

| 场景 | 推荐方案 |
|-----|---------|
| DOM操作 | JavaScript |
| 业务逻辑 | JavaScript |
| 图像处理 | WebAssembly |
| 加密计算 | WebAssembly |
| 物理模拟 | WebAssembly |
| 视频编解码 | WebAssembly |

## Node.js中的Wasm支持

Node.js原生支持WebAssembly，使用V8的Wasm引擎：

### 基本用法

```javascript
const fs = require('fs');

// 加载 Wasm 文件
const wasmBuffer = fs.readFileSync('./add.wasm');

// 编译并实例化
async function loadWasm() {
  const module = await WebAssembly.compile(wasmBuffer);
  const instance = await WebAssembly.instantiate(module);
  
  // 调用导出的函数
  const result = instance.exports.add(1, 2);
  console.log(result);  // 3
}

loadWasm();
```

### 同步加载

```javascript
const fs = require('fs');
const wasmBuffer = fs.readFileSync('./add.wasm');

// 同步编译和实例化
const module = new WebAssembly.Module(wasmBuffer);
const instance = new WebAssembly.Instance(module);

console.log(instance.exports.add(1, 2));  // 3
```

### 带导入的模块

```javascript
const fs = require('fs');
const wasmBuffer = fs.readFileSync('./calculator.wasm');

// 提供给 Wasm 的导入
const imports = {
  env: {
    // JavaScript 函数，供 Wasm 调用
    consoleLog: (value) => console.log('From Wasm:', value),
    
    // 内存
    memory: new WebAssembly.Memory({ initial: 256 })
  }
};

async function loadWasm() {
  const { instance } = await WebAssembly.instantiate(wasmBuffer, imports);
  
  instance.exports.calculate(10, 20);
}

loadWasm();
```

## 使用AssemblyScript

AssemblyScript是TypeScript的子集，可以直接编译为WebAssembly：

### 项目设置

```bash
# 初始化项目
npm init -y
npm install --save-dev assemblyscript

# 初始化 AssemblyScript
npx asinit .
```

### 编写代码

```typescript
// assembly/index.ts

// 简单的加法函数
export function add(a: i32, b: i32): i32 {
  return a + b;
}

// 斐波那契数列
export function fibonacci(n: i32): i32 {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

// 数组求和
export function sumArray(arr: Int32Array): i32 {
  let sum: i32 = 0;
  for (let i = 0; i < arr.length; i++) {
    sum += arr[i];
  }
  return sum;
}

// 内存操作示例
export function fillBuffer(ptr: usize, length: i32, value: u8): void {
  for (let i: i32 = 0; i < length; i++) {
    store<u8>(ptr + i, value);
  }
}
```

### 编译

```bash
# 编译为 Wasm
npx asc assembly/index.ts --outFile build/index.wasm --optimize

# 生成 TypeScript 绑定
npx asc assembly/index.ts --outFile build/index.wasm \
  --textFile build/index.wat \
  --bindings esm
```

### 在Node.js中使用

```javascript
// index.js
const fs = require('fs');
const loader = require('@assemblyscript/loader');

async function main() {
  const wasmModule = await loader.instantiate(
    fs.readFileSync('./build/index.wasm'),
    { /* imports */ }
  );
  
  const { add, fibonacci, sumArray, __newArray, Int32Array_ID } = wasmModule.exports;
  
  // 调用简单函数
  console.log('add(1, 2):', add(1, 2));  // 3
  console.log('fibonacci(10):', fibonacci(10));  // 55
  
  // 数组操作
  const arr = __newArray(Int32Array_ID, [1, 2, 3, 4, 5]);
  console.log('sumArray:', sumArray(arr));  // 15
}

main();
```

## 使用Rust编写Wasm

Rust是编写WebAssembly的热门选择，提供出色的性能和安全性：

### 项目设置

```bash
# 安装 Rust（如果没有）
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# 添加 Wasm 目标
rustup target add wasm32-unknown-unknown

# 安装 wasm-pack
cargo install wasm-pack

# 创建项目
cargo new --lib wasm-example
cd wasm-example
```

### Cargo.toml配置

```toml
[package]
name = "wasm-example"
version = "0.1.0"
edition = "2021"

[lib]
crate-type = ["cdylib"]

[dependencies]
wasm-bindgen = "0.2"

[profile.release]
opt-level = "s"
lto = true
```

### 编写Rust代码

```rust
// src/lib.rs
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn add(a: i32, b: i32) -> i32 {
    a + b
}

#[wasm_bindgen]
pub fn fibonacci(n: u32) -> u32 {
    match n {
        0 => 0,
        1 => 1,
        _ => fibonacci(n - 1) + fibonacci(n - 2)
    }
}

// 更高效的斐波那契
#[wasm_bindgen]
pub fn fibonacci_fast(n: u32) -> u64 {
    let mut a: u64 = 0;
    let mut b: u64 = 1;
    
    for _ in 0..n {
        let temp = a;
        a = b;
        b = temp + b;
    }
    
    a
}

// 处理字符串
#[wasm_bindgen]
pub fn greet(name: &str) -> String {
    format!("Hello, {}!", name)
}

// 处理数组
#[wasm_bindgen]
pub fn sum_array(arr: &[i32]) -> i32 {
    arr.iter().sum()
}
```

### 构建

```bash
# 构建为 Node.js 包
wasm-pack build --target nodejs

# 输出到 pkg/ 目录
ls pkg/
# wasm_example.js
# wasm_example_bg.wasm
# package.json
```

### 在Node.js中使用

```javascript
const { add, fibonacci_fast, greet, sum_array } = require('./pkg');

console.log(add(1, 2));  // 3
console.log(fibonacci_fast(50));  // 12586269025n
console.log(greet('World'));  // "Hello, World!"
console.log(sum_array(new Int32Array([1, 2, 3, 4, 5])));  // 15
```

## 内存管理

WebAssembly有自己的线性内存，与JavaScript堆分离：

### 共享内存

```javascript
// 创建共享内存
const memory = new WebAssembly.Memory({
  initial: 256,  // 256 页 (16MB)
  maximum: 512   // 最大 512 页 (32MB)
});

// 作为 TypedArray 访问
const buffer = new Uint8Array(memory.buffer);

// 写入数据
buffer[0] = 42;
buffer[1] = 43;

// 传递给 Wasm
const imports = {
  env: { memory }
};

// Wasm 可以读写这块内存
```

### 传递复杂数据

```javascript
// 传递数组到 Wasm
function passArrayToWasm(wasmInstance, jsArray) {
  const memory = wasmInstance.exports.memory;
  const buffer = new Float64Array(memory.buffer);
  
  // 获取 Wasm 中的内存位置
  const ptr = wasmInstance.exports.allocate(jsArray.length * 8);
  
  // 复制数据
  const wasmArray = new Float64Array(memory.buffer, ptr, jsArray.length);
  wasmArray.set(jsArray);
  
  // 调用 Wasm 函数
  const result = wasmInstance.exports.processArray(ptr, jsArray.length);
  
  // 释放内存
  wasmInstance.exports.deallocate(ptr);
  
  return result;
}
```

### 字符串处理

```javascript
// 将字符串传递给 Wasm
function passStringToWasm(wasmInstance, str) {
  const encoder = new TextEncoder();
  const encoded = encoder.encode(str);
  
  const memory = wasmInstance.exports.memory;
  const ptr = wasmInstance.exports.allocate(encoded.length + 1);
  
  const buffer = new Uint8Array(memory.buffer, ptr, encoded.length + 1);
  buffer.set(encoded);
  buffer[encoded.length] = 0;  // null 终止符
  
  return ptr;
}

// 从 Wasm 读取字符串
function readStringFromWasm(wasmInstance, ptr) {
  const memory = wasmInstance.exports.memory;
  const buffer = new Uint8Array(memory.buffer);
  
  let end = ptr;
  while (buffer[end] !== 0) end++;
  
  const decoder = new TextDecoder();
  return decoder.decode(buffer.slice(ptr, end));
}
```

## 性能对比

### 计算密集型任务

```javascript
// 性能测试：计算素数
const wasmPrimes = require('./pkg').count_primes;

// JavaScript 版本
function countPrimesJS(n) {
  let count = 0;
  for (let i = 2; i <= n; i++) {
    if (isPrime(i)) count++;
  }
  return count;
}

function isPrime(n) {
  for (let i = 2; i * i <= n; i++) {
    if (n % i === 0) return false;
  }
  return true;
}

// 对比测试
const N = 1000000;

console.time('JavaScript');
console.log('JS result:', countPrimesJS(N));
console.timeEnd('JavaScript');

console.time('WebAssembly');
console.log('Wasm result:', wasmPrimes(N));
console.timeEnd('WebAssembly');

// 典型结果：
// JavaScript: ~800ms
// WebAssembly: ~200ms
```

### 何时Wasm更快

```
┌─────────────────────────────────────────────────────────────┐
│            Wasm vs JavaScript 性能特点                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Wasm 更快的场景：                                           │
│  ├── 数学计算（整数、浮点）                                   │
│  ├── 图像/音频处理                                          │
│  ├── 加密/哈希                                              │
│  ├── 物理模拟                                               │
│  └── 编解码                                                 │
│                                                             │
│  JavaScript 更快或相当的场景：                                │
│  ├── 字符串操作（需要频繁跨边界）                             │
│  ├── DOM 操作                                               │
│  ├── 对象操作（V8 优化后很快）                               │
│  ├── 简单函数调用                                           │
│  └── 已被 V8 高度优化的代码                                  │
│                                                             │
│  注意：Wasm 和 JS 之间的调用有开销                            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## 实际应用场景

### 场景1：图像处理

```javascript
// 使用 Wasm 进行图像处理
const sharp = require('sharp');  // sharp 内部使用原生代码

// 或使用纯 Wasm 方案
const wasmImage = require('./wasm-image');

async function processImage(inputPath, outputPath) {
  const imageData = await loadImage(inputPath);
  
  // 在 Wasm 中处理
  const processed = wasmImage.applyFilter(
    imageData.buffer,
    imageData.width,
    imageData.height,
    'gaussian_blur'
  );
  
  await saveImage(outputPath, processed);
}
```

### 场景2：加密计算

```javascript
// 使用 Wasm 实现的加密库
const wasmCrypto = require('./wasm-crypto');

// 比纯 JS 实现快 5-10 倍
const hash = wasmCrypto.sha256('hello world');
console.log(hash);

// 大数据加密
const encrypted = wasmCrypto.aesEncrypt(largeBuffer, key);
```

### 场景3：数据压缩

```javascript
// Wasm 版本的 zstd
const { compress, decompress } = require('./wasm-zstd');

const original = Buffer.from('...');
const compressed = compress(original, 3);  // 压缩级别 3
const restored = decompress(compressed);

console.log(`压缩率: ${(compressed.length / original.length * 100).toFixed(1)}%`);
```

## 调试Wasm

### 源码映射

```bash
# 编译时生成调试信息
wasm-pack build --dev --target nodejs

# AssemblyScript
npx asc assembly/index.ts --sourceMap --debug
```

### Node.js调试

```bash
# 启动调试器
node --inspect app.js

# Chrome DevTools 可以看到 Wasm 调用栈
```

### 日志输出

```rust
// Rust 中添加日志
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = console)]
    fn log(s: &str);
}

#[wasm_bindgen]
pub fn debug_function(x: i32) -> i32 {
    log(&format!("Input: {}", x));
    let result = x * 2;
    log(&format!("Output: {}", result));
    result
}
```

## 最佳实践

### 1. 最小化边界调用

```javascript
// ❌ 频繁跨边界调用
for (let i = 0; i < 1000000; i++) {
  wasmInstance.exports.process(i);  // 每次调用都有开销
}

// ✅ 批量处理
const data = new Int32Array(1000000);
for (let i = 0; i < data.length; i++) data[i] = i;
wasmInstance.exports.processBatch(data);  // 一次调用
```

### 2. 复用内存

```javascript
// ❌ 每次都分配内存
function processMany(items) {
  for (const item of items) {
    const ptr = wasmInstance.exports.allocate(item.length);
    // ... 处理
    wasmInstance.exports.deallocate(ptr);
  }
}

// ✅ 复用缓冲区
const bufferPtr = wasmInstance.exports.allocate(MAX_SIZE);

function processMany(items) {
  for (const item of items) {
    // 复用同一块内存
    copyToWasm(bufferPtr, item);
    wasmInstance.exports.process(bufferPtr, item.length);
  }
}
```

### 3. 选择合适的类型

```typescript
// AssemblyScript 中使用合适的类型
// ✅ 使用固定大小的整数
export function fast(a: i32, b: i32): i32 {
  return a + b;
}

// ❌ 避免不必要的大类型
export function slow(a: i64, b: i64): i64 {
  return a + b;  // 64位操作可能更慢
}
```

## 小结

WebAssembly为Node.js带来了新的性能边界：

| 方面 | 说明 |
|-----|-----|
| 性能 | 计算密集型任务可提速2-10倍 |
| 语言 | C/C++、Rust、Go、AssemblyScript |
| 集成 | V8原生支持，无需额外依赖 |
| 内存 | 独立线性内存，需要手动管理 |
| 调用开销 | 跨边界调用有成本，需批量处理 |

使用建议：
- 纯计算任务考虑使用Wasm
- 减少JS-Wasm边界调用
- AssemblyScript适合JS开发者入门
- Rust适合追求极致性能

下一章，我们将探讨V8的性能分析工具，学习如何定位和优化性能瓶颈。
