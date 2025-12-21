# Node.js运行时启动流程

当你运行`node app.js`时，Node.js需要完成一系列复杂的初始化工作，然后才能执行你的JavaScript代码。本章深入分析这一启动流程。

## 启动流程全景图

```
node app.js
     │
     ▼
┌────────────────────────────────────┐
│  1. 操作系统加载可执行文件            │
│     - 解析ELF/PE/Mach-O格式         │
│     - 加载动态链接库                 │
│     - 设置进程地址空间               │
└────────────────────────────────────┘
     │
     ▼
┌────────────────────────────────────┐
│  2. Node.js C++入口 (main)          │
│     - 解析命令行参数                 │
│     - 初始化平台配置                 │
└────────────────────────────────────┘
     │
     ▼
┌────────────────────────────────────┐
│  3. V8引擎初始化                    │
│     - 创建Isolate                   │
│     - 创建Context                   │
│     - 编译内部JavaScript            │
└────────────────────────────────────┘
     │
     ▼
┌────────────────────────────────────┐
│  4. libuv初始化                     │
│     - 创建事件循环                   │
│     - 初始化线程池                   │
└────────────────────────────────────┘
     │
     ▼
┌────────────────────────────────────┐
│  5. Node.js环境初始化               │
│     - 注册内置模块                   │
│     - 设置全局对象                   │
│     - 加载引导脚本                   │
└────────────────────────────────────┘
     │
     ▼
┌────────────────────────────────────┐
│  6. 加载用户代码                    │
│     - 解析入口文件                   │
│     - 编译并执行                     │
└────────────────────────────────────┘
     │
     ▼
┌────────────────────────────────────┐
│  7. 进入事件循环                    │
│     - 处理异步操作                   │
│     - 直到无活跃事件                 │
└────────────────────────────────────┘
```

## 阶段1：C++入口点

Node.js的入口点在`src/node_main.cc`：

```cpp
// 简化的入口代码
int main(int argc, char* argv[]) {
  // 初始化平台
  node::InitializeOncePerProcess(&argc, &argv);
  
  // 创建Node.js实例并运行
  int exit_code = node::Start(&argc, &argv);
  
  // 清理资源
  node::TearDownOncePerProcess();
  
  return exit_code;
}
```

### 命令行参数解析

```cpp
// src/node_options.cc
void Initialize(...) {
  // V8选项
  // node --v8-options 查看所有可用选项
  
  // Node.js选项
  // --inspect：启用调试器
  // --require：预加载模块
  // --experimental-*：实验性功能
}
```

常用启动参数：

```bash
# 调试相关
node --inspect app.js           # 启用调试器
node --inspect-brk app.js       # 启动时暂停

# 内存相关
node --max-old-space-size=4096 app.js  # 堆内存上限4GB

# ES模块
node --experimental-loader ./loader.js app.js

# 权限模型（Node.js 20+）
node --experimental-permission --allow-fs-read=./data app.js
```

## 阶段2：V8引擎初始化

### V8平台创建

```cpp
// src/node.cc
void InitializeV8Platform(...) {
  // 创建V8平台
  // 平台负责：任务调度、线程管理、采样器
  v8::V8::InitializePlatform(platform);
  
  // 初始化V8
  v8::V8::Initialize();
}
```

### Isolate和Context创建

```cpp
// 创建Isolate（独立的V8实例）
v8::Isolate::CreateParams params;
params.array_buffer_allocator = allocator;
v8::Isolate* isolate = v8::Isolate::New(params);

// 创建Context（执行上下文）
v8::Local<v8::Context> context = v8::Context::New(isolate);
```

### 内置JavaScript编译

Node.js有大量内部JavaScript代码，在启动时需要编译：

```cpp
// lib/internal/bootstrap/node.js
// lib/internal/bootstrap/loader.js
// lib/internal/modules/cjs/loader.js
// ... 等等
```

这些代码被编译为V8快照以加速启动。

## 阶段3：libuv事件循环初始化

```cpp
// src/node.cc
void CreateEnvironment(...) {
  // 初始化事件循环
  uv_loop_t* event_loop = uv_default_loop();
  uv_loop_init(event_loop);
  
  // 事件循环现在准备好处理异步操作
}
```

### 线程池初始化

```cpp
// 线程池用于：
// - 文件系统操作
// - DNS查询
// - 加密操作
// - 压缩操作

// 默认4个线程，可通过UV_THREADPOOL_SIZE调整
// UV_THREADPOOL_SIZE=8 node app.js
```

## 阶段4：Node.js环境初始化

### 创建Environment对象

```cpp
// src/node.cc
Environment* env = new Environment(
  isolate_data,   // V8隔离区数据
  context,        // V8上下文
  args,           // 命令行参数
  exec_args,      // 执行参数
  flags           // 环境标志
);
```

Environment是Node.js的核心数据结构，保存了：
- V8 Isolate和Context引用
- 事件循环
- 内置模块
- 异步钩子状态
- 其他运行时状态

### 注册内置模块

```cpp
// 内置模块分为两类：

// 1. C++模块（src/node_*.cc）
// fs, crypto, http_parser, zlib等
node::RegisterBuiltinModules();

// 2. JavaScript模块（lib/*.js）
// http, url, path, stream等
// 这些在JavaScript层加载
```

内置模块查看：

```javascript
// 列出所有内置模块
console.log(require('module').builtinModules);
// ['assert', 'buffer', 'child_process', 'fs', ...]
```

### 设置全局对象

```cpp
// src/node_binding.cc
void SetupGlobalObject(...) {
  // global对象
  context->Global()->Set(...);
  
  // process对象
  Local<Object> process = CreateProcessObject(env);
  context->Global()->Set(
    String::NewFromUtf8(isolate, "process"),
    process
  );
  
  // Buffer、console等
}
```

## 阶段5：JavaScript引导

### 引导脚本执行顺序

```
1. internal/bootstrap/primordials.js
   └─ 冻结内置原型，防止篡改

2. internal/bootstrap/node.js
   └─ 设置全局变量和process对象

3. internal/bootstrap/loader.js
   └─ 设置模块加载系统

4. internal/main/*.js
   └─ 根据入口类型选择：
      - run_main_module.js  (普通文件)
      - eval_string.js      (-e 参数)
      - repl.js             (交互模式)
```

### primordials（原始值）

```javascript
// lib/internal/per_context/primordials.js
// 在任何用户代码运行前保存原始方法
primordials = {
  ArrayPrototypeMap: Array.prototype.map,
  ObjectFreeze: Object.freeze,
  PromiseResolve: Promise.resolve,
  // ...
};

// 这样即使用户修改Array.prototype.map
// Node.js内部代码仍可使用原始方法
```

### process对象初始化

```javascript
// lib/internal/bootstrap/node.js
function setupProcessObject() {
  // 基本属性
  process.version = 'v20.10.0';
  process.versions = { node: '20.10.0', v8: '11.8.172.17', ... };
  process.arch = 'x64';
  process.platform = 'win32';
  
  // PID和目录
  process.pid;      // 来自C++
  process.cwd();    // 来自C++
  
  // 环境变量
  process.env;      // 来自C++
  
  // 标准流
  process.stdin;    // 延迟初始化
  process.stdout;
  process.stderr;
}
```

### 模块系统初始化

```javascript
// lib/internal/bootstrap/loader.js
function initializeModuleLoader() {
  // CommonJS加载器
  const CJSModule = require('internal/modules/cjs/loader');
  
  // ES模块加载器
  const ESMLoader = require('internal/modules/esm/loader');
  
  // 设置require函数
  globalThis.require = CJSModule.createRequire(process.cwd());
}
```

## 阶段6：加载用户代码

### 入口文件解析

```javascript
// lib/internal/main/run_main_module.js
async function runMainEntry(main) {
  // 解析文件路径
  const resolvedMain = path.resolve(main);
  
  // 判断是ESM还是CJS
  if (shouldUseESM(resolvedMain)) {
    // ES模块
    await import(resolvedMain);
  } else {
    // CommonJS
    require(resolvedMain);
  }
}
```

### 模块类型判断

```javascript
function shouldUseESM(filename) {
  // 1. 检查文件扩展名
  if (filename.endsWith('.mjs')) return true;
  if (filename.endsWith('.cjs')) return false;
  
  // 2. 检查package.json的type字段
  const pkg = findPackageJson(filename);
  if (pkg?.type === 'module') return true;
  
  // 3. 默认CommonJS
  return false;
}
```

### 模块编译

```javascript
// CommonJS编译
function compileModule(filename, content) {
  // 包装成函数
  const wrapped = 
    '(function (exports, require, module, __filename, __dirname) { ' +
    content +
    '\n});';
  
  // V8编译并执行
  const fn = vm.runInThisContext(wrapped, { filename });
  fn.call(exports, exports, require, module, filename, dirname);
}
```

## 阶段7：进入事件循环

用户代码执行完同步部分后，进入事件循环：

```cpp
// src/node.cc
void Run() {
  // 执行用户代码
  LoadEnvironment(env);
  
  // 进入事件循环
  do {
    uv_run(env->event_loop(), UV_RUN_DEFAULT);
    
    // 检查是否有微任务
    platform->DrainTasks(isolate);
  } while (MoreTasksExist());
}
```

### 事件循环结束条件

```javascript
// 当以下条件都满足时，事件循环结束：
// 1. 没有活跃的定时器
// 2. 没有活跃的I/O操作
// 3. 没有活跃的子进程
// 4. 没有活跃的服务器监听
// 5. 微任务队列为空

// 保持进程运行的方法：
setInterval(() => {}, 1000);  // 定时器
http.createServer().listen(3000);  // 服务器
process.stdin.resume();  // 等待输入
```

## 启动优化技术

### V8快照

```bash
# Node.js使用V8快照加速启动
# 快照包含：
# - 内置对象（Array, Object, Promise等）
# - 内部JavaScript代码

# 自定义快照（实验性）
node --snapshot-blob=snapshot.blob --build-snapshot app.js
```

### 用户代码快照（Node.js 22+）

```javascript
// 生成快照
const { snapshot } = require('node:sea');
snapshot.createSync({ main: 'app.js' });

// 快照可以大幅减少启动时间
// 因为跳过了解析和编译阶段
```

## 启动时间测量

```javascript
// 内置性能API
const { performance, PerformanceObserver } = require('perf_hooks');

// 测量模块加载时间
const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    console.log(`${entry.name}: ${entry.duration}ms`);
  }
});
observer.observe({ entryTypes: ['node'] });

// 内置启动时间标记
console.log(process.uptime());  // 进程运行时间（秒）

// 更详细的启动标记
// node --trace-startup app.js
```

### 启动追踪

```bash
# 追踪启动过程
node --trace-event-categories=node.bootstrap app.js

# 生成chrome://tracing可打开的trace文件
```

## 启动顺序中的关键事件

```javascript
// 启动事件顺序
process.on('beforeExit', () => {
  // 事件循环即将退出（还可以添加新任务）
});

process.on('exit', (code) => {
  // 进程即将退出（只能同步操作）
});

// 模块初始化顺序
console.log('1. 模块顶层代码');

setImmediate(() => {
  console.log('4. setImmediate');
});

Promise.resolve().then(() => {
  console.log('3. 微任务');
});

process.nextTick(() => {
  console.log('2. nextTick');
});
```

输出：
```
1. 模块顶层代码
2. nextTick
3. 微任务
4. setImmediate
```

## 常见启动问题

### 启动慢的原因

```javascript
// 1. 加载太多模块
// 解决：延迟加载
let heavyModule;
function useHeavyModule() {
  if (!heavyModule) {
    heavyModule = require('heavy-module');
  }
  return heavyModule;
}

// 2. 同步I/O操作
// 错误
const config = fs.readFileSync('config.json');

// 正确（如果配置非必需）
let config;
async function getConfig() {
  if (!config) {
    config = JSON.parse(await fs.promises.readFile('config.json'));
  }
  return config;
}

// 3. 大量计算
// 考虑预计算或使用Worker
```

### 环境变量影响

```bash
# 线程池大小
UV_THREADPOOL_SIZE=16 node app.js

# 堆内存
NODE_OPTIONS="--max-old-space-size=4096" node app.js

# 模块解析
NODE_PATH=/custom/modules node app.js
```

## 本章小结

Node.js启动流程可以分为以下关键阶段：

1. **C++入口**：解析命令行参数，初始化平台
2. **V8初始化**：创建Isolate和Context
3. **libuv初始化**：创建事件循环和线程池
4. **环境初始化**：注册内置模块，设置全局对象
5. **JavaScript引导**：冻结原始值，初始化模块系统
6. **加载用户代码**：解析、编译、执行入口文件
7. **事件循环**：处理异步操作直到退出

理解启动流程有助于：
- 优化应用启动时间
- 理解模块加载顺序
- 调试启动相关问题
- 正确使用进程事件

下一章，我们将介绍如何搭建Node.js源码调试环境，让你能够亲自探索这些细节。
