# Chrome DevTools 调试 Node.js

前端开发者熟悉的 Chrome DevTools 也可以调试 Node.js。这意味着你可以用同样的工具和技能来调试前后端代码，大大降低学习成本。

## 何时使用 Chrome DevTools

| 场景 | 推荐度 | 原因 |
|------|--------|------|
| 性能分析（CPU/内存） | ⭐⭐⭐ | Memory 和 Profiler 面板功能强大 |
| 复杂断点调试 | ⭐⭐⭐ | GUI 直观，支持条件断点 |
| 日常开发 | ⭐⭐ | VS Code 集成更好 |
| 远程服务器 | ⭐ | 需要端口转发，稍复杂 |

**核心优势**：Chrome DevTools 的 Memory 和 Profiler 面板是诊断 Node.js 性能问题的最佳工具。

## 启动调试模式

### --inspect

启动时添加 `--inspect` 标志，Node.js 会启动调试服务器：

```bash
node --inspect src/index.js
```

输出：

```
Debugger listening on ws://127.0.0.1:9229/abc123...
For help, see: https://nodejs.org/en/docs/inspector
```

程序正常启动运行，调试器在后台等待连接。

### --inspect-brk

如果问题发生在程序启动阶段，用 `--inspect-brk` 让程序在第一行代码处暂停：

```bash
node --inspect-brk src/index.js
```

**使用场景**：调试模块加载顺序问题、初始化错误、环境变量配置问题。

### 指定端口

默认端口 9229 被占用时，可以指定其他端口：

```bash
node --inspect=9230 src/index.js
```

## 连接 Chrome DevTools

### 方式一：chrome://inspect（推荐）

1. 打开 Chrome 浏览器
2. 地址栏输入 `chrome://inspect`
3. 在 "Remote Target" 下找到你的 Node.js 进程
4. 点击 "inspect"

**优点**：自动发现本地运行的 Node.js 进程，无需记忆 URL。

### 方式二：直接打开

如果 chrome://inspect 找不到你的进程，可以直接在地址栏输入（替换 xxx 为实际的 session ID）：

```
devtools://devtools/bundled/js_app.html?experiments=true&v8only=true&ws=127.0.0.1:9229/xxx
```

## DevTools 面板详解

### Sources 面板（代码调试）

**左侧**：文件树，显示已加载的模块（包括 node_modules）

**中间**：源代码区域，点击行号设置断点

**右侧**：
- Watch：监视表达式
- Breakpoints：断点列表
- Scope：当前作用域变量
- Call Stack：调用堆栈

### 设置断点

点击行号设置断点。

右键设置条件断点：

```javascript
i > 100  // 只在满足条件时暂停
```

### 调试控制

| 按钮 | 快捷键 | 功能 |
|------|--------|------|
| ▶ | F8 | 继续执行 |
| ⤵ | F10 | 单步跳过 |
| ↓ | F11 | 单步进入 |
| ↑ | Shift+F11 | 单步跳出 |

## Console 面板

与浏览器中的 Console 完全相同，可以执行任意 JavaScript 表达式并访问当前作用域的变量：

```javascript
> user
{ name: 'John', age: 30 }

> require('os').cpus().length  // 可以 require 模块
8

> process.memoryUsage()        // 访问 Node.js API
{ rss: 30000000, heapTotal: 5000000, heapUsed: 3000000 }
```

**技巧**：在断点暂停时，Console 可以访问当前函数的局部变量。

## Memory 面板

Memory 面板是诊断内存泄漏的核心工具。

### 堆快照（Heap Snapshot）

捕获某一时刻的内存状态，查看所有对象及其引用关系：

1. 点击 "Take heap snapshot"
2. 等待快照完成
3. 在 Summary 视图查看对象类型和数量
4. 查找异常大的对象或数量异常多的实例

**诊断内存泄漏的方法**：
1. 在操作前拍摄快照 A
2. 执行可能泄漏的操作
3. 拍摄快照 B
4. 在 B 中选择 "Comparison" 视图，对比增量

### 分配时间线（Allocation Timeline）

实时监控内存分配，适合找出"哪段代码在分配内存"：

1. 选择 "Allocation instrumentation on timeline"
2. 点击开始记录
3. 执行要分析的操作
4. 停止记录
5. 查看蓝色条（新分配）和灰色条（已释放）

**蓝色条持续增长**说明内存没有被释放，可能存在泄漏。

## Profiler 面板

### CPU 分析

找出 CPU 密集型代码，识别性能瓶颈：

1. 点击 "Start" 开始采样
2. 执行要分析的操作
3. 点击 "Stop" 停止采样
4. 查看火焰图（Flame Chart）

### 如何解读火焰图

火焰图从下往上看，底部是入口函数，向上是调用栈：

- **宽条**：函数执行时间长，可能是优化目标
- **深度**：调用层级深，可能存在递归或过度封装
- **颜色**：不同颜色区分 JavaScript/C++/系统调用

**优化技巧**：优先优化"又宽又浅"的函数，投入产出比最高。

## 调试远程服务器

在生产或测试服务器上调试需要端口转发。

### 服务器端

绑定到所有网卡（或指定 IP）：

```bash
node --inspect=0.0.0.0:9229 app.js
```

⚠️ **安全警告**：不要在生产环境暴露 9229 端口到公网！

### 本地端

通过 SSH 隧道转发端口到本地：

```bash
ssh -L 9229:localhost:9229 user@server
```

然后本地 chrome://inspect 连接。

## 调试 Docker 容器

**Dockerfile**

```dockerfile
FROM node:18
WORKDIR /app
COPY . .
RUN npm install
CMD ["node", "--inspect=0.0.0.0:9229", "src/index.js"]
```

**docker-compose.yml**

```yaml
services:
  app:
    build: .
    ports:
      - "3000:3000"
      - "9229:9229"
```

## 实用技巧

### 条件断点

```javascript
// 只在特定请求时暂停
req.url === '/api/users'
```

### 黑盒脚本

右键文件 → "Add script to ignore list"

忽略 node_modules 等第三方代码。

### 保存更改

在 Sources 面板可以直接编辑并保存文件（需要开启 Workspaces）。

## NDB

Google 的增强调试工具：

```bash
npm install -g ndb
ndb node src/index.js
```

提供更好的体验：
- 子进程自动调试
- 更好的断点管理
- 内存分析集成

## 本章小结

- `--inspect` 启动调试模式
- `--inspect-brk` 在启动时暂停
- chrome://inspect 连接调试器
- Sources 面板设置断点和调试
- Memory 面板分析内存
- Profiler 分析 CPU 性能

下一章我们将学习常见错误的解决方案。
