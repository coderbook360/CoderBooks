# 并发控制：Promise.all、race 与 allSettled

## 章节定位

本章讲解 Promise 的并发控制方法，帮助读者在实际项目中正确处理多个异步操作。

## 学习目标

读完本章，读者应该能够：

1. 理解 Promise.all 的使用场景和错误处理
2. 理解 Promise.race 的应用场景
3. 掌握 Promise.allSettled 和 Promise.any
4. 实现自定义的并发控制（如限制并发数）
5. 在实际场景中选择合适的方法

## 核心知识点

### 1. Promise.all

- 等待所有 Promise 完成
- 任一失败则整体失败
- 适用场景：所有结果都需要

### 2. Promise.race

- 返回最快完成的结果
- 适用场景：超时控制、竞速

### 3. Promise.allSettled

- 等待所有 Promise 完成（无论成功失败）
- 返回每个 Promise 的状态
- 适用场景：批量操作，部分失败可接受

### 4. Promise.any

- 返回第一个成功的结果
- 所有失败才失败
- 适用场景：冗余请求、降级策略

### 5. 并发数控制

```javascript
// 限制同时进行的请求数
async function limitConcurrency(tasks, limit) {
  // 实现
}
```

## 写作要求

### 内容结构

1. **开篇**：以"如何优雅地处理多个异步操作？"切入
2. **Promise.all**：详解语法、错误处理、实例
3. **Promise.race**：超时控制实例
4. **Promise.allSettled**：批量操作实例
5. **Promise.any**：降级策略实例
6. **并发限制**：实现限制并发数
7. **方法对比**：选择指南

## 章节长度

约 2500-3000 字。
