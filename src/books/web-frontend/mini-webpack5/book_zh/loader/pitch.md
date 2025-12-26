---
sidebar_position: 64
title: "Pitch Loader 机制"
---

# Pitch Loader 机制

Pitch 是 Loader 的一个特殊阶段，在 normal 阶段之前执行。理解 Pitch 机制对于开发高级 Loader 至关重要。

## 执行顺序

```
配置：use: ['a-loader', 'b-loader', 'c-loader']

执行顺序：
1. a-loader.pitch
2. b-loader.pitch
3. c-loader.pitch
4. 读取资源
5. c-loader.normal
6. b-loader.normal
7. a-loader.normal
```

Pitch 从左到右，Normal 从右到左。

## Pitch 函数定义

```typescript
module.exports = function(source) {
  // Normal 阶段
  return source;
};

module.exports.pitch = function(
  remainingRequest: string,
  precedingRequest: string,
  data: object
): string | void {
  // Pitch 阶段
};
```

### 参数说明

```typescript
module.exports.pitch = function(remainingRequest, precedingRequest, data) {
  // remainingRequest：剩余的请求（当前 Loader 之后的所有 Loader 和资源）
  // 例如：/loaders/b.js!/loaders/c.js!/src/index.js
  
  // precedingRequest：之前的请求（当前 Loader 之前的所有 Loader）
  // 例如：/loaders/a.js
  
  // data：数据对象，可在 pitch 和 normal 之间传递数据
};
```

## Pitch 跳过机制

如果 pitch 返回值，则跳过后续 Loader：

```
正常执行：
a.pitch → b.pitch → c.pitch → 读取文件 → c.normal → b.normal → a.normal

b.pitch 返回值：
a.pitch → b.pitch(返回) → a.normal
（跳过 c.pitch、读取文件、c.normal、b.normal）
```

```typescript
// b-loader.js
module.exports = function(source) {
  return source;  // 不会执行
};

module.exports.pitch = function(remainingRequest) {
  // 返回值，跳过后续 Loader
  return 'export default "intercepted";';
};
```

## 实际应用

### style-loader 的 Pitch

style-loader 使用 pitch 实现 CSS 注入：

```typescript
// style-loader 简化实现
module.exports = function(source) {
  // 不会执行，因为 pitch 返回了值
};

module.exports.pitch = function(remainingRequest) {
  // remainingRequest 包含 css-loader 和资源路径
  // 例如：/loaders/css-loader.js!/src/style.css
  
  return `
    import content from ${JSON.stringify(
      '!!' + remainingRequest  // !! 禁用其他 Loader
    )};
    
    const style = document.createElement('style');
    style.textContent = content.toString();
    document.head.appendChild(style);
    
    export default content;
  `;
};
```

**为什么这样做**：
1. `remainingRequest` 包含 css-loader 和 CSS 文件
2. 生成的代码会 import 这个请求
3. Webpack 会处理这个新的 import，执行 css-loader
4. style-loader 的 pitch 返回的代码会处理 css-loader 的输出

### 数据传递

```typescript
// 在 pitch 中设置数据
module.exports.pitch = function(remainingRequest, precedingRequest, data) {
  data.startTime = Date.now();
  data.cacheKey = computeCacheKey(remainingRequest);
};

// 在 normal 中使用数据
module.exports = function(source) {
  const elapsed = Date.now() - this.data.startTime;
  console.log(`Processing took ${elapsed}ms`);
  
  // 使用缓存
  const cached = getFromCache(this.data.cacheKey);
  if (cached) return cached;
  
  const result = transform(source);
  setCache(this.data.cacheKey, result);
  
  return result;
};
```

### 条件跳过

```typescript
module.exports.pitch = function(remainingRequest, precedingRequest, data) {
  // 检查缓存
  const cacheKey = hashRequest(remainingRequest);
  const cached = getCache(cacheKey);
  
  if (cached) {
    // 有缓存，跳过后续 Loader
    return cached;
  }
  
  // 没有缓存，保存 key 供 normal 阶段使用
  data.cacheKey = cacheKey;
};

module.exports = function(source) {
  const result = transform(source);
  
  // 存入缓存
  setCache(this.data.cacheKey, result);
  
  return result;
};
```

## 内联 Loader 语法

Pitch 中经常使用的内联语法：

```typescript
module.exports.pitch = function(remainingRequest) {
  // ! 分隔 Loader
  // !! 禁用所有配置的 Loader，只用内联指定的
  // -! 禁用 preLoader 和 normalLoader
  
  // 使用 !! 确保只执行 remainingRequest 中的 Loader
  const request = '!!' + remainingRequest;
  
  return `
    import css from ${JSON.stringify(request)};
    export default css;
  `;
};
```

### 内联前缀说明

```typescript
// 完整语法
import '!style-loader!css-loader!./style.css';

// ! 分隔多个 Loader
// 从右到左执行：css-loader → style-loader

// !! 禁用所有配置的 Loader
import '!!raw-loader!./file.txt';
// 只执行 raw-loader，忽略配置中的规则

// -! 禁用 preLoader 和 normalLoader
import '-!css-loader!./style.css';
// 只执行内联 Loader，保留 postLoader
```

## Pitch 实现细节

```typescript
function iteratePitchingLoaders(
  loaderContext: LoaderContext,
  loaders: LoaderObject[],
  callback: Callback
): void {
  if (loaderContext.loaderIndex >= loaders.length) {
    // 所有 pitch 执行完毕，开始读取资源
    return processResource(loaderContext, callback);
  }
  
  const currentLoader = loaders[loaderContext.loaderIndex];
  
  // 加载 Loader 模块
  loadLoader(currentLoader, (err) => {
    if (err) return callback(err);
    
    const pitch = currentLoader.pitch;
    currentLoader.pitchExecuted = true;
    
    // 没有 pitch 函数
    if (!pitch) {
      loaderContext.loaderIndex++;
      return iteratePitchingLoaders(loaderContext, loaders, callback);
    }
    
    // 执行 pitch
    const result = pitch.call(
      loaderContext,
      loaderContext.remainingRequest,
      loaderContext.previousRequest,
      currentLoader.data
    );
    
    // pitch 返回值
    if (result !== undefined) {
      // 跳过后续 Loader，直接进入 normal 阶段
      loaderContext.loaderIndex--;
      return iterateNormalLoaders(
        loaderContext,
        loaders,
        [result],
        callback
      );
    }
    
    // 继续下一个 pitch
    loaderContext.loaderIndex++;
    iteratePitchingLoaders(loaderContext, loaders, callback);
  });
}
```

## 高级示例

### worker-loader 风格

```typescript
// worker-loader 使用 pitch 创建 Worker 包装
module.exports.pitch = function(remainingRequest) {
  return `
    export default function createWorker() {
      return new Worker(
        new URL(
          ${JSON.stringify('!!' + remainingRequest)},
          import.meta.url
        )
      );
    }
  `;
};
```

### 资源内联

```typescript
// inline-loader: 将小文件内联
module.exports.pitch = function(remainingRequest) {
  const fs = require('fs');
  const path = require('path');
  
  // 解析资源路径
  const resourcePath = this.resourcePath;
  const stats = fs.statSync(resourcePath);
  
  // 小于阈值时内联
  if (stats.size < 10240) {
    const content = fs.readFileSync(resourcePath);
    const base64 = content.toString('base64');
    const mimeType = getMimeType(resourcePath);
    
    return `export default "data:${mimeType};base64,${base64}";`;
  }
  
  // 大文件不处理，继续后续 Loader
};
```

### 条件编译

```typescript
// conditional-loader: 根据条件跳过处理
module.exports.pitch = function(remainingRequest, precedingRequest, data) {
  const options = this.getOptions();
  
  // 检查条件
  if (!options.conditions.every(c => evaluate(c))) {
    // 条件不满足，返回空模块
    return 'export default undefined;';
  }
  
  // 继续正常处理
};
```

## 调试 Pitch

```typescript
module.exports = function(source) {
  console.log('[normal] Processing:', this.resourcePath);
  return source;
};

module.exports.pitch = function(remainingRequest, precedingRequest, data) {
  console.log('[pitch] Loader:', this.loaders[this.loaderIndex].path);
  console.log('[pitch] Remaining:', remainingRequest);
  console.log('[pitch] Preceding:', precedingRequest);
  console.log('[pitch] Index:', this.loaderIndex);
  
  // 不返回值，继续执行
};
```

## 总结

Pitch 机制的核心要点：

**执行顺序**：
- Pitch：从左到右
- Normal：从右到左
- Pitch 返回值可跳过后续 Loader

**主要用途**：
- 实现 style-loader 等注入型 Loader
- 缓存和性能优化
- 条件编译和跳过

**数据传递**：
- 通过 data 参数在 pitch 和 normal 之间传递
- 每个 Loader 有独立的 data 对象

**下一章**：我们将学习如何编写自定义 Loader。
