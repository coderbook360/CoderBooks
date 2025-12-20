# 章节写作指导：Promise 异常处理的陷阱与最佳实践

## 1. 章节信息

- **章节标题**: Promise 异常处理的陷阱与最佳实践
- **文件名**: error-handling/promise-error-handling.md
- **所属部分**: 第二部分：错误处理与异常管理
- **章节序号**: 10
- **预计阅读时间**: 30 分钟
- **难度等级**: 高级

## 2. 学习目标

### 知识目标
- 理解 Promise 内部的错误处理机制
- 掌握 .catch() 与 try-catch 的本质区别
- 理解 Promise 链中的错误传播规则
- 了解 Promise.all/race/allSettled 的错误行为

### 技能目标
- 能够正确处理 Promise 链中的错误
- 能够避免常见的 Promise 错误处理陷阱
- 能够设计健壮的异步错误处理策略
- 能够利用 finally 进行资源清理

## 3. 内容要点

### 核心概念

| 概念 | 解释要求 |
|-----|---------|
| **Promise 状态** | 解释 pending, fulfilled, rejected 三种状态及转换 |
| **.catch() 方法** | 解释 .catch() 实际上是 .then(null, onRejected) 的语法糖 |
| **错误传播** | 解释 Promise 链中错误如何向下传播 |
| **错误恢复** | 解释 .catch() 后返回值如何影响后续链 |
| **unhandledrejection** | 解释何时触发未处理拒绝事件 |

### 关键知识点

1. **Promise 错误传播机制**
   - reject() vs throw
   - 隐式捕获 executor 中的错误
   - .then() 回调中的错误
   - 链式传播规则

2. **.catch() 的正确使用**
   - .catch() 的位置影响
   - .catch() 后的链继续
   - 在 .catch() 中再次抛出
   - .catch() vs .then(null, handler)

3. **常见陷阱**
   - 忘记返回 Promise
   - .then() 第二个参数 vs .catch()
   - Promise 构造函数中的异步错误
   - 静默失败的 Promise

4. **并发 Promise 的错误处理**
   - Promise.all 的快速失败
   - Promise.allSettled 的全量结果
   - Promise.race 的错误处理
   - Promise.any 的 AggregateError

5. **finally 的正确使用**
   - finally 的返回值处理
   - finally 中抛出错误
   - 资源清理的最佳位置

6. **最佳实践**
   - 总是返回 Promise
   - 总是添加 .catch()
   - 使用 async/await 简化处理
   - 错误包装与上下文添加

## 4. 写作要求

### 开篇方式
展示几个看似正确但实际存在问题的 Promise 错误处理代码，让读者尝试找出问题，引发思考。

### 结构组织
```
1. Promise 错误处理的常见误区 (问题暴露)
2. Promise 错误传播机制详解 (原理解析)
3. .catch() 的微妙之处 (方法精讲)
4. 并发 Promise 的错误策略 (并发场景)
5. finally 与资源清理 (完善处理)
6. 最佳实践与代码规范 (规范建立)
7. 小结
```

### 代码示例要求
- **必须包含**：Promise 链错误传播的完整示例
- **必须包含**：常见陷阱的错误代码与修正
- **必须包含**：Promise.all/allSettled 对比示例
- **必须包含**：错误包装与上下文添加示例
- **推荐包含**：企业级 Promise 工具函数

### 图表需求
- Promise 状态转换图
- Promise 链错误传播流程图
- .then() vs .catch() 对比表

## 5. 技术细节

### 规范参考
- ECMAScript Language Specification (Promise Objects)
- ECMAScript 2020 (Promise.allSettled)
- ECMAScript 2021 (Promise.any)

### 实现要点
- Promise 微任务调度与错误
- reject 时机与调用栈
- 引擎对未处理 rejection 的检测

### 常见问题
- 如何判断 Promise 是否被正确处理
- 嵌套 Promise 的错误冒泡
- 动态 Promise 链的错误处理

## 6. 风格指导

### 语气语调
警示与教导并重，通过反面案例加深印象，再给出正确做法。

### 类比方向
- 将 Promise 链比作"流水线"
- 错误传播比作"流水线上的红色警报"

## 7. 章节检查清单

- [ ] 目标明确：本章输入/输出是否清晰
- [ ] 术语统一：是否给出标准引用与定义
- [ ] 最小实现：示例是否能运行且递进清晰
- [ ] 边界处理：并发场景等是否覆盖
- [ ] 性能与权衡：不同处理方式的优劣是否明确
- [ ] 替代方案：对比与适用场景是否给出
- [ ] 图示与代码：是否一一对应
- [ ] 总结与练习：是否提供复盘与实操建议
