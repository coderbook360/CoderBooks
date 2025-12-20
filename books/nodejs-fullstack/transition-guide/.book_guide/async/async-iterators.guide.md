# 异步迭代器与 for-await-of

## 章节定位

本章介绍异步迭代器这个相对较新的特性，它在处理流式数据时非常有用。

## 学习目标

读完本章，读者应该能够：

1. 理解迭代器和异步迭代器的区别
2. 掌握 for-await-of 语法
3. 理解异步生成器
4. 在 Stream 和分页数据中应用

## 核心知识点

### 1. 同步迭代器回顾

```javascript
const arr = [1, 2, 3];
for (const item of arr) {
  console.log(item);
}
```

### 2. 异步迭代器

```javascript
async function* asyncGenerator() {
  yield await fetchData(1);
  yield await fetchData(2);
}

for await (const item of asyncGenerator()) {
  console.log(item);
}
```

### 3. 可异步迭代对象

- Symbol.asyncIterator
- Stream 的异步迭代

### 4. 实际应用

- 读取大文件
- 分页数据获取
- WebSocket 消息处理

## 写作要求

### 内容结构

1. **开篇**：以"如何优雅地处理流式数据？"切入
2. **同步迭代器回顾**：Iterator 协议
3. **异步迭代器**：AsyncIterator 协议
4. **for-await-of**：语法和使用
5. **异步生成器**：async function*
6. **实战应用**：读取文件流、分页数据

## 章节长度

约 2000-2500 字。
