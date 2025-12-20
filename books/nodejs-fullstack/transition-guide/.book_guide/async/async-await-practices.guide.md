# async/await 最佳实践与常见陷阱

## 章节定位

本章讲解 async/await 的使用技巧和常见错误，帮助读者写出优雅高效的异步代码。

## 学习目标

读完本章，读者应该能够：

1. 正确使用 async/await 语法
2. 理解 async 函数的返回值
3. 掌握错误处理最佳实践
4. 避免常见的性能陷阱
5. 在不同场景选择合适的异步模式

## 核心知识点

### 1. 基本语法

```javascript
async function getData() {
  const result = await fetchData();
  return result;
}
```

### 2. 错误处理

- try/catch 包裹
- 统一错误处理
- 不吞掉错误

### 3. 并行执行

```javascript
// 串行（慢）
const a = await taskA();
const b = await taskB();

// 并行（快）
const [a, b] = await Promise.all([taskA(), taskB()]);
```

### 4. 常见陷阱

- 不必要的 await
- 循环中的 await
- 忘记 await
- await 在 forEach 中不工作

### 5. 顶层 await

ES Modules 中的顶层 await

## 写作要求

### 内容结构

1. **开篇**：以"async/await 让异步代码像同步一样？"切入
2. **基本语法**：async 函数和 await 表达式
3. **错误处理**：try/catch 和错误边界
4. **并行优化**：避免不必要的串行
5. **循环中的异步**：for-of vs forEach
6. **常见陷阱**：实际案例分析
7. **最佳实践**：总结规则

## 章节长度

约 2500-3000 字。
