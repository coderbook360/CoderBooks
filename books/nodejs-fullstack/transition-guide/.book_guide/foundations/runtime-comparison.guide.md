# JavaScript 运行时对比：浏览器 vs Node.js

## 章节定位

本章是全书的开篇第一章，目标是帮助前端开发者快速建立服务端思维。通过系统对比浏览器和 Node.js 两个运行时环境的差异，让读者理解"同样是 JavaScript，为什么在服务端会有不同的思考方式"。

## 学习目标

读完本章，读者应该能够：

1. 清晰描述浏览器和 Node.js 运行时的核心差异
2. 理解 Node.js 中没有 DOM/BOM，有什么替代能力
3. 理解全局对象的差异（window vs global vs globalThis）
4. 了解两个环境中事件循环的区别
5. 明白为什么前端经验可以迁移，以及哪些思维需要调整

## 核心知识点

### 1. 运行时环境对比

- **宿主环境差异**：浏览器是面向用户的图形界面环境，Node.js 是服务端进程环境
- **JavaScript 引擎**：两者都使用 V8（Chrome/Node.js），但宿主 API 完全不同
- **API 层差异**：浏览器提供 DOM/BOM，Node.js 提供 fs/http/net 等系统级 API

### 2. 全局对象

- 浏览器：`window`、`document`、`navigator`
- Node.js：`global`、`process`、`Buffer`
- ES2020 统一：`globalThis`

### 3. 模块系统历史

- 浏览器历史：script 标签 → AMD/CMD → ES Modules
- Node.js 历史：CommonJS → ES Modules
- 两者现在都支持 ES Modules，但实现细节有差异

### 4. 事件循环差异

- 浏览器事件循环：宏任务 → 微任务 → 渲染
- Node.js 事件循环：六个阶段（timers, pending callbacks, idle/prepare, poll, check, close callbacks）
- 核心差异：Node.js 没有渲染阶段，有更细粒度的异步调度

### 5. 可迁移的能力

- JavaScript 语言特性 100% 通用
- Promise/async-await 通用
- 第三方工具库（lodash 等）通用
- 工程化思维（模块化、测试）通用

### 6. 需要重新学习的能力

- 系统级 API：文件操作、网络编程、进程管理
- 服务端思维：并发处理、资源管理、安全意识
- 部署运维：进程守护、日志管理、性能监控

## 写作要求

### 内容结构

1. **开篇问题驱动**：以"同样的 JavaScript，为什么服务端不一样？"切入
2. **对比表格**：用清晰的对比表展示两个环境的差异
3. **代码示例**：展示同样的概念在两个环境中的不同实现
4. **迁移清单**：明确列出"可直接迁移"和"需要重新学习"的内容

### 代码示例要求

- 简短精炼，每个示例不超过 15 行
- 并排展示浏览器和 Node.js 的代码
- 重点标注差异部分

### 避免的内容

- 不要深入讲解事件循环原理（后续章节会专门讲）
- 不要详细讲解模块系统（后续有专门章节）
- 不要讲解具体的 Node.js API 用法

## 示例代码片段

```javascript
// 浏览器中获取当前页面 URL
const currentUrl = window.location.href;

// Node.js 中获取当前工作目录
const currentDir = process.cwd();
```

```javascript
// 浏览器中的定时器
setTimeout(() => console.log('timeout'), 0);
requestAnimationFrame(() => console.log('raf'));

// Node.js 中的定时器
setTimeout(() => console.log('timeout'), 0);
setImmediate(() => console.log('immediate'));
```

## 章节长度

约 2500-3000 字，是入门级概览章节，不需要太深入。
