# 章节写作指导：Environment 环境适配

## 1. 章节信息

- **章节标题**: Environment 环境适配
- **文件名**: foundations/environment.md
- **所属部分**: 第一部分：架构概览与基础设施
- **章节序号**: 5
- **预计阅读时间**: 15分钟
- **难度等级**: 中级

## 2. 学习目标

### 知识目标
- 理解 PixiJS 如何实现跨环境（浏览器、Web Worker、Node.js）运行
- 掌握 Environment 接口的设计与实现
- 了解 DOM 抽象层的作用与实现方式
- 理解 adapter 模式在环境适配中的应用

### 技能目标
- 能够在非浏览器环境（如 Node.js）中运行 PixiJS
- 能够编写自定义环境适配器
- 能够调试环境相关的兼容性问题

## 3. 内容要点

### 核心概念（必须全部讲解）
- **DOMAdapter**: DOM API 的抽象适配器
- **BrowserAdapter**: 浏览器环境的默认适配器
- **WebWorkerAdapter**: Web Worker 环境适配器
- **settings**: 全局设置与环境配置

### 关键知识点（必须全部覆盖）
- 为什么需要环境适配（跨平台、SSR、Worker）
- DOMAdapter 接口定义与职责
- 如何检测当前运行环境
- Canvas 创建的抽象
- requestAnimationFrame 的跨环境实现
- 图像加载的环境适配
- Node.js 环境的特殊处理

### 前置知识
- 浏览器与 Node.js 的 API 差异
- Web Worker 的基本概念
- 适配器设计模式

## 4. 写作要求

### 开篇方式
以"PixiJS 能在 Node.js 中运行吗？"这个常见问题开篇，引出环境适配的需求和解决方案。

### 结构组织
1. **引言**：跨环境运行的挑战
2. **DOMAdapter 设计**：接口定义与职责划分
3. **浏览器适配器**：BrowserAdapter 实现分析
4. **Worker 适配器**：WebWorkerAdapter 的特殊处理
5. **自定义适配器**：如何创建 Node.js 适配器
6. **settings 全局配置**：环境相关的全局设置
7. **小结**：环境适配的最佳实践

### 代码示例
- DOMAdapter 接口定义
- 切换适配器的配置代码
- 自定义 Node.js 适配器的骨架代码
- 环境检测的实现

### 图表需求
- **可选**：环境适配器选择流程图
- **可选**：各环境 API 对比表

## 5. 技术细节

### 源码参考
- `packages/environment/src/adapter/adapter.ts` - DOMAdapter 接口
- `packages/environment/src/adapter/BrowserAdapter.ts` - 浏览器适配器
- `packages/environment/src/adapter/WebWorkerAdapter.ts` - Worker 适配器
- `packages/core/src/settings.ts` - 全局设置

### 实现要点
- 如何安全地访问 `window`、`document` 等全局对象
- OffscreenCanvas 在 Worker 中的使用
- 使用 `typeof` 进行环境检测的模式
- 图像解码的跨环境实现（ImageBitmap vs Image）

### 常见问题
- Q: 在 SSR（服务端渲染）中如何使用 PixiJS？
  A: 需要配置无 DOM 环境的适配器，或使用 node-canvas
- Q: Web Worker 中能使用全部 PixiJS 功能吗？
  A: 受限于 OffscreenCanvas 支持，部分功能可能不可用

## 6. 风格指导

### 语气语调
- 问题导向，从实际场景出发
- 清晰说明"能做什么"和"不能做什么"
- 提供可直接使用的配置代码

### 类比方向
- 将适配器类比为"翻译器"—— 将标准接口翻译为平台特定 API
- 将环境检测类比为"体检"—— 检测当前环境的能力

## 7. 章节检查清单

- [ ] 目标明确：本章输入/输出是否清晰
- [ ] 术语统一：是否给出标准引用与定义
- [ ] 最小实现：示例是否能运行且递进清晰
- [ ] 边界处理：异常/失败/限制是否覆盖
- [ ] 性能与权衡：优化思路与取舍是否明确
- [ ] 替代方案：对比与适用场景是否给出
- [ ] 图示与代码：是否一一对应
- [ ] 总结与练习：是否提供复盘与实操

## 8. 与其他章节的关系

### 前置章节
- 第2章：项目结构，了解 environment 包的位置
- 第4章：扩展系统，环境适配也是一种扩展

### 后续章节
- 第6章渲染器架构会使用环境适配来创建渲染上下文
- 第95章 Assets 系统会使用环境适配来加载资源
