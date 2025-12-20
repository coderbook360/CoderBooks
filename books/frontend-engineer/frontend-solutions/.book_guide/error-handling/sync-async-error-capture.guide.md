# 章节写作指导：同步错误与异步错误的捕获策略

## 1. 章节信息

- **章节标题**: 同步错误与异步错误的捕获策略
- **文件名**: error-handling/sync-async-error-capture.md
- **所属部分**: 第二部分：错误处理与异常管理
- **章节序号**: 9
- **预计阅读时间**: 30 分钟
- **难度等级**: 高级

## 2. 学习目标

### 知识目标
- 理解 JavaScript 事件循环与错误传播的关系
- 掌握 try-catch 对同步与异步代码的捕获范围
- 理解 window.onerror 与 window.addEventListener('error') 的区别
- 了解 unhandledrejection 事件的触发机制

### 技能目标
- 能够为不同类型的代码选择正确的错误捕获方式
- 能够构建全局错误兜底机制
- 能够处理嵌套异步调用中的错误
- 能够设计完善的错误捕获体系

## 3. 内容要点

### 核心概念

| 概念 | 解释要求 |
|-----|---------|
| **同步错误** | 解释同步代码中的错误，在当前调用栈中抛出 |
| **异步错误** | 解释异步代码中的错误，在新的调用栈中抛出 |
| **window.onerror** | 解释全局错误处理器的作用、参数、返回值 |
| **error 事件** | 解释捕获阶段的 error 事件监听 |
| **unhandledrejection** | 解释未处理的 Promise 拒绝事件 |

### 关键知识点

1. **同步错误的捕获**
   - try-catch 的基本使用
   - try-catch-finally 的执行顺序
   - 嵌套 try-catch 的处理
   - throw 与 return 的区别

2. **异步错误的本质**
   - 事件循环与调用栈
   - 为什么 try-catch 无法捕获 setTimeout 中的错误
   - 回调函数中的错误传播
   - Node.js 的 error-first 回调模式

3. **全局错误处理**
   - window.onerror 的参数解析
   - onerror 返回 true 的作用
   - addEventListener('error') 的区别
   - 资源加载错误的特殊处理

4. **Promise 错误处理**
   - .catch() 的工作原理
   - unhandledrejection 事件
   - rejectionhandled 事件
   - Promise 链中的错误传播

5. **async/await 错误处理**
   - await 与 try-catch 的配合
   - 多个 await 的错误处理策略
   - 并发 Promise 的错误处理

6. **错误捕获体系设计**
   - 分层错误处理策略
   - 局部捕获 vs 全局兜底
   - 错误的重新抛出与包装

## 4. 写作要求

### 开篇方式
展示一个常见的错误捕获陷阱：try-catch 包裹 setTimeout，但错误仍然未被捕获。引出理解错误传播机制的必要性。

### 结构组织
```
1. 一个让人困惑的错误捕获问题 (问题引入)
2. 同步错误与 try-catch (基础回顾)
3. 异步错误为什么难以捕获 (原理解析)
4. 全局错误处理机制 (兜底方案)
5. Promise 错误的特殊处理 (Promise 专题)
6. async/await 的错误处理 (现代方案)
7. 构建完善的错误捕获体系 (架构设计)
8. 小结
```

### 代码示例要求
- **必须包含**：try-catch 无法捕获异步错误的示例
- **必须包含**：window.onerror 的完整配置
- **必须包含**：unhandledrejection 的监听示例
- **必须包含**：async/await 的多种错误处理模式
- **推荐包含**：完整的错误捕获体系代码模板

### 图表需求
- 事件循环与错误传播示意图
- 同步/异步错误捕获对比表
- 错误捕获体系架构图

## 5. 技术细节

### 规范参考
- ECMAScript Language Specification (try statement)
- HTML Living Standard (onerror handler)
- WHATWG (error events)

### 实现要点
- onerror 与 addEventListener('error') 的触发时机
- 跨域脚本错误的 Script Error 问题
- 错误捕获的性能影响

### 常见问题
- Script Error 问题的解决
- 第三方脚本错误的处理
- 框架内部错误的穿透

## 6. 风格指导

### 语气语调
从错误入手，层层深入，让读者理解"为什么"比"是什么"更重要。

### 类比方向
- 将事件循环比作"任务传送带"
- 调用栈比作"当前正在处理的任务卡片"

## 7. 章节检查清单

- [ ] 目标明确：本章输入/输出是否清晰
- [ ] 术语统一：是否给出标准引用与定义
- [ ] 最小实现：示例是否能运行且递进清晰
- [ ] 边界处理：跨域脚本等特殊情况是否覆盖
- [ ] 性能与权衡：不同捕获方式的优劣是否明确
- [ ] 替代方案：对比与适用场景是否给出
- [ ] 图示与代码：是否一一对应
- [ ] 总结与练习：是否提供复盘与实操建议
