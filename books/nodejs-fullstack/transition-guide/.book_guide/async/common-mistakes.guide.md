# 常见异步编程误区与纠正

## 章节定位

本章总结常见的异步编程错误，帮助读者避坑。这是第二部分的收尾章节。

## 学习目标

读完本章，读者应该能够：

1. 识别并避免常见的异步编程错误
2. 理解错误背后的原因
3. 掌握正确的写法
4. 建立异步编程的最佳实践意识

## 核心知识点

### 1. 循环中的 await

```javascript
// ❌ 串行执行
for (const item of items) {
  await processItem(item);
}

// ✅ 并行执行
await Promise.all(items.map(item => processItem(item)));
```

### 2. forEach 中的 await

```javascript
// ❌ 不会等待
items.forEach(async item => {
  await processItem(item);
});

// ✅ 使用 for...of
for (const item of items) {
  await processItem(item);
}
```

### 3. 忘记 await

```javascript
// ❌ 没有 await
async function getData() {
  return fetchData(); // 返回 Promise，不是数据
}

// ✅ 加上 await 或直接返回
async function getData() {
  return await fetchData();
}
```

### 4. Promise 构造器反模式

```javascript
// ❌ 不必要的包装
new Promise(resolve => resolve(existingPromise));

// ✅ 直接返回
return existingPromise;
```

### 5. 错误吞没

```javascript
// ❌ 吞掉错误
try {
  await riskyOperation();
} catch (e) {
  // 什么都不做
}

// ✅ 至少记录日志
try {
  await riskyOperation();
} catch (e) {
  console.error(e);
  throw e;
}
```

## 写作要求

### 内容结构

1. **开篇**：以"这些错误你犯过吗？"切入
2. **每个误区**：错误代码 → 问题分析 → 正确写法
3. **总结清单**：最佳实践速查表

## 章节长度

约 2500-3000 字。
