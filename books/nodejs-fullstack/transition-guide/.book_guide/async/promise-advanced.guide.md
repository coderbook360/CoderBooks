# Promise 原理与高级模式

## 章节定位

本章深入讲解 Promise，不仅是语法层面，更要理解其设计原理和高级用法。

## 学习目标

读完本章，读者应该能够：

1. 理解 Promise 的三种状态和状态转换
2. 掌握 Promise 链式调用的原理
3. 理解 Promise 的错误传播机制
4. 掌握 Promise 的静态方法（all, race, allSettled, any）
5. 了解 Promise 的常见陷阱

## 核心知识点

### 1. Promise 状态

- pending → fulfilled（带有 value）
- pending → rejected（带有 reason）
- 状态不可逆

### 2. Promise 创建

```javascript
new Promise((resolve, reject) => {
  // 执行器立即执行
  if (success) {
    resolve(value);
  } else {
    reject(error);
  }
});
```

### 3. 链式调用

- then 返回新的 Promise
- 值的传递
- 错误的传播

### 4. 静态方法

- Promise.resolve / Promise.reject
- Promise.all / Promise.race
- Promise.allSettled / Promise.any

### 5. 常见陷阱

- 忘记 return
- 忘记 catch
- 在 then 中嵌套 Promise

## 写作要求

### 内容结构

1. **开篇**：以"Promise 解决了什么问题？"切入
2. **基础语法**：创建和使用
3. **状态机模型**：三种状态的转换
4. **链式调用**：原理和最佳实践
5. **静态方法**：各方法的使用场景
6. **错误处理**：catch 和错误传播
7. **常见陷阱**：避坑指南

## 章节长度

约 3000-3500 字，这是异步编程的核心章节。
