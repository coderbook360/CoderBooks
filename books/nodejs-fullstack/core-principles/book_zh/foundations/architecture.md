# Node.js架构概览

理解Node.js的架构是掌握其核心原理的基础。本章将从宏观视角分析Node.js的三层架构，为后续深入各个组件做好铺垫。

## 三层架构模型

Node.js的架构可以分为三个主要层次：

```
┌─────────────────────────────────────────────────────────────┐
│                     JavaScript代码层                          │
│         你的应用代码、npm包、Node.js标准库（JS部分）            │
├─────────────────────────────────────────────────────────────┤
│                     Node.js核心（C++）                        │
│         Node.js Bindings、内置模块的C++实现                    │
├─────────────────────────────────────────────────────────────┤
│                       底层依赖                                │
│         V8引擎 │ libuv │ c-ares │ OpenSSL │ zlib │ ...      │
└─────────────────────────────────────────────────────────────┘
```

### 第一层：JavaScript代码层

这是开发者直接接触的层次：

```javascript
// 你的应用代码
const http = require('http');
const fs = require('fs');

// 使用npm包
const express = require('express');

// Node.js标准库（JavaScript实现部分）
// 如：lib/fs.js、lib/http.js等
```

Node.js标准库大部分用JavaScript编写，这些文件位于源码的`lib/`目录。例如，当你`require('fs')`时，实际加载的是`lib/fs.js`。

### 第二层：Node.js核心（C++）

这一层是JavaScript与操作系统之间的桥梁：

```cpp
// 简化的C++ binding示例
// src/node_file.cc

void Open(const FunctionCallbackInfo<Value>& args) {
  // 从JavaScript获取参数
  String::Utf8Value path(isolate, args[0]);
  
  // 调用libuv进行实际的文件操作
  uv_fs_open(loop, req, *path, flags, mode, AfterOpen);
}
```

**核心职责**：
- **Bindings**：将C++功能暴露给JavaScript
- **内置模块**：性能关键的模块用C++实现
- **V8集成**：管理JavaScript执行环境

### 第三层：底层依赖

Node.js依赖多个成熟的C/C++库：

| 依赖 | 作用 | 重要性 |
|-----|------|-------|
| V8 | JavaScript执行引擎 | 核心 |
| libuv | 异步I/O、事件循环 | 核心 |
| c-ares | 异步DNS解析 | 网络 |
| OpenSSL | TLS/SSL加密 | 安全 |
| zlib | 数据压缩 | 性能 |
| llhttp | HTTP解析 | 网络 |
| ICU | 国际化支持 | 可选 |

## V8引擎的角色

V8是Google为Chrome开发的JavaScript引擎，负责：

### JavaScript执行

```
源代码 → 解析(Parser) → AST → 字节码(Ignition) → 机器码(TurboFan)
```

V8采用即时编译（JIT）策略：
1. **Ignition解释器**：快速启动，生成字节码
2. **TurboFan编译器**：热点代码优化为机器码

### 内存管理

V8管理JavaScript对象的内存：

```javascript
// V8负责这些对象的分配和回收
const obj = { name: 'John' };
const arr = [1, 2, 3];
const fn = () => console.log('hello');
```

**堆内存结构**：
- **新生代**：存放新创建的小对象
- **老生代**：存放长期存活或大对象

### V8 API

Node.js通过V8 API与JavaScript交互：

```cpp
// 创建JavaScript对象
Local<Object> obj = Object::New(isolate);

// 设置属性
obj->Set(context, 
  String::NewFromUtf8(isolate, "name").ToLocalChecked(),
  String::NewFromUtf8(isolate, "Node.js").ToLocalChecked()
);

// 调用JavaScript函数
Local<Function> fn = Local<Function>::Cast(args[0]);
fn->Call(context, Null(isolate), argc, argv);
```

## libuv的角色

libuv是Node.js异步能力的核心，提供：

### 跨平台抽象

libuv在不同操作系统上使用最优的异步机制：

| 操作系统 | I/O多路复用 | libuv封装 |
|---------|------------|----------|
| Linux | epoll | uv__io_poll |
| macOS | kqueue | uv__io_poll |
| Windows | IOCP | uv__io_poll |

### 事件循环

libuv实现了Node.js的事件循环：

```c
// 简化的事件循环
int uv_run(uv_loop_t* loop, uv_run_mode mode) {
  while (loop->active_handles > 0 || loop->active_reqs > 0) {
    uv__run_timers(loop);      // 定时器
    uv__io_poll(loop, timeout); // I/O轮询
    uv__run_check(loop);        // check阶段
    uv__run_closing_handles(loop); // 关闭回调
  }
  return 0;
}
```

### 线程池

文件I/O等操作在线程池中执行：

```
主线程                    线程池（默认4个线程）
   │                      ┌─────────────────┐
   │  fs.readFile() ──→   │  Worker 1       │
   │                      │  Worker 2       │
   │  ←── 完成回调 ───    │  Worker 3       │
   │                      │  Worker 4       │
                          └─────────────────┘
```

## 组件协作流程

以读取文件为例，展示三层架构如何协作：

```javascript
// 1. JavaScript层：调用API
const fs = require('fs');
fs.readFile('data.txt', 'utf8', (err, data) => {
  console.log(data);
});
```

### 完整调用链

```
1. JavaScript: fs.readFile()
      ↓
2. lib/fs.js: 参数处理、封装
      ↓
3. C++ Binding: FSReqCallback::Init()
      ↓
4. libuv: uv_fs_read() → 提交到线程池
      ↓
5. 线程池: 同步执行read()系统调用
      ↓
6. libuv: 完成后将回调放入队列
      ↓
7. 事件循环: poll阶段取出回调
      ↓
8. C++ Binding: 构造结果对象
      ↓
9. JavaScript: 执行用户回调
```

### 异步与同步路径

```javascript
// 异步路径（推荐）
fs.readFile('data.txt', callback);
// → libuv线程池 → 不阻塞主线程

// 同步路径（阻塞）
const data = fs.readFileSync('data.txt');
// → 直接系统调用 → 阻塞主线程
```

## 内存模型

Node.js进程的内存分为几个区域：

```
┌──────────────────────────────────────┐
│              V8 堆内存                │
│   (JavaScript对象、闭包、原型链等)     │
│   受 --max-old-space-size 限制       │
├──────────────────────────────────────┤
│              C++ 堆内存               │
│   (Buffer、原生模块分配的内存)         │
│   不受V8限制                          │
├──────────────────────────────────────┤
│              代码段                   │
│   (V8编译的机器码)                    │
├──────────────────────────────────────┤
│              栈                       │
│   (调用栈)                           │
└──────────────────────────────────────┘
```

### 内存限制

```javascript
// 查看V8堆内存限制
const v8 = require('v8');
console.log(v8.getHeapStatistics());
// {
//   heap_size_limit: 2197815296,  // 约2GB（64位系统）
//   ...
// }

// 调整限制
// node --max-old-space-size=4096 app.js  // 4GB
```

**关键点**：
- V8堆内存有上限（64位系统默认约1.4GB）
- Buffer使用C++堆内存，不受此限制
- 大文件处理应使用Stream，避免一次性加载到内存

## 单线程与多线程

### JavaScript是单线程的

```javascript
// 主线程执行所有JavaScript代码
while (true) {
  // 这会阻塞整个应用
}

// 但这不意味着Node.js只有一个线程
```

### Node.js的线程模型

```
Node.js进程
├── 主线程（V8、JavaScript、事件循环）
├── libuv线程池（默认4个）
│   ├── 文件I/O
│   ├── DNS查询（部分）
│   └── 压缩操作
├── V8后台线程
│   ├── 垃圾回收
│   └── 代码优化
└── Worker Threads（可选）
    └── 用户创建的工作线程
```

### 调整线程池大小

```javascript
// 在应用启动前设置
process.env.UV_THREADPOOL_SIZE = 8;

// 或通过命令行
// UV_THREADPOOL_SIZE=8 node app.js
```

**何时增加线程池**：
- 大量文件I/O操作
- 频繁的加密/压缩操作
- DNS密集型应用

## 架构设计哲学

### 1. 简单优于复杂

Node.js选择单线程事件循环而非多线程，避免了锁、竞态条件等复杂问题。

### 2. 非阻塞优于阻塞

几乎所有I/O操作都提供异步版本，阻塞版本仅用于启动阶段或CLI工具。

### 3. 小核心、大生态

Node.js核心保持精简，复杂功能交给npm生态。

### 4. 委托专业库

V8负责JavaScript、libuv负责I/O、OpenSSL负责加密——各司其职。

## 与其他运行时对比

| 特性 | Node.js | Deno | Bun |
|-----|---------|------|-----|
| JavaScript引擎 | V8 | V8 | JavaScriptCore |
| 异步运行时 | libuv | Tokio(Rust) | 自研(Zig) |
| 模块系统 | CJS + ESM | ESM only | CJS + ESM |
| 包管理 | npm | URL imports | bun |
| TypeScript | 需转译 | 原生支持 | 原生支持 |

Node.js的架构久经考验，生态最为成熟。

## 本章小结

- Node.js采用三层架构：JavaScript → C++ Bindings → 底层依赖
- V8负责JavaScript执行和内存管理
- libuv提供跨平台异步I/O和事件循环
- JavaScript单线程，但Node.js进程包含多个线程
- 架构设计遵循简单、非阻塞、小核心的哲学

理解这个架构模型，是深入学习后续章节（事件循环、V8、libuv）的基础。接下来，我们将详细探讨V8引擎在Node.js中的具体角色。
