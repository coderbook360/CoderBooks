---
sidebar_position: 65
title: "Pitching Loader 实现"
---

# Pitching Loader 实现

Pitching Loader 是 Webpack Loader 的高级特性，允许在 Normal Loader 执行前拦截处理流程。

## Pitch 函数基础

### 基本结构

```typescript
module.exports = function(source) {
  // Normal 阶段
  return transformedSource;
};

module.exports.pitch = function(
  remainingRequest: string,
  precedingRequest: string,
  data: object
) {
  // Pitch 阶段
};
```

### 参数说明

```typescript
// 假设配置：['a-loader', 'b-loader', 'c-loader']
// 当前在 b-loader 的 pitch

module.exports.pitch = function(remainingRequest, precedingRequest, data) {
  // remainingRequest: 剩余请求
  // "c-loader!./file.js"
  
  // precedingRequest: 之前的请求
  // "a-loader"
  
  // data: 在 pitch 和 normal 之间共享的数据对象
  data.value = 'shared';
};
```

## Pitch 执行流程

### 正常流程

```
Loader 配置: ['a-loader', 'b-loader', 'c-loader']

┌─────────────────────────────────────────┐
│              Pitch 阶段                  │
│  a.pitch() → b.pitch() → c.pitch()      │
│     ↓            ↓            ↓         │
│   (无返回)     (无返回)     (无返回)     │
└─────────────────────────────────────────┘
                    ↓
              读取源文件
                    ↓
┌─────────────────────────────────────────┐
│             Normal 阶段                  │
│  c.normal() → b.normal() → a.normal()   │
└─────────────────────────────────────────┘
```

### Pitch 返回值中断

```
Loader 配置: ['a-loader', 'b-loader', 'c-loader']

┌─────────────────────────────────────────┐
│              Pitch 阶段                  │
│  a.pitch() → b.pitch()                   │
│     ↓            ↓                       │
│   (无返回)   返回 "result"              │
│                  │                       │
│                  ↓                       │
│    跳过 c.pitch() 和所有 normal          │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│             Normal 阶段                  │
│  a.normal("result")                      │
│  (跳过 c.normal 和 b.normal)            │
└─────────────────────────────────────────┘
```

## 实现原理

### loader-runner 中的 pitch 处理

```typescript
function iteratePitchingLoaders(
  context: LoaderContext,
  callback: Callback
): void {
  // 所有 pitch 执行完毕
  if (context.loaderIndex >= context.loaders.length) {
    return processResource(context, callback);
  }

  const currentLoader = context.loaders[context.loaderIndex];

  // 加载 Loader 模块
  loadLoader(currentLoader, (err) => {
    if (err) return callback(err);

    const pitch = currentLoader.pitch;

    // 无 pitch，继续下一个
    if (!pitch) {
      context.loaderIndex++;
      return iteratePitchingLoaders(context, callback);
    }

    // 准备 pitch 参数
    const remainingRequest = makeRequest(
      context.loaders.slice(context.loaderIndex + 1),
      context.resource
    );
    const precedingRequest = makeRequest(
      context.loaders.slice(0, context.loaderIndex)
    );

    // 执行 pitch
    runSyncOrAsync(
      pitch,
      context,
      [remainingRequest, precedingRequest, currentLoader.data],
      (err, ...args) => {
        if (err) return callback(err);

        // 检查是否有返回值
        const hasResult = args.some(arg => arg !== undefined);

        if (hasResult) {
          // 有返回值，跳转到 Normal 阶段
          context.loaderIndex--;
          iterateNormalLoaders(context, args[0], callback);
        } else {
          // 无返回值，继续下一个 pitch
          context.loaderIndex++;
          iteratePitchingLoaders(context, callback);
        }
      }
    );
  });
}

function makeRequest(loaders: LoaderObject[], resource?: string): string {
  const parts = loaders.map(l => l.request);
  if (resource) parts.push(resource);
  return parts.join('!');
}
```

## 实际应用场景

### style-loader 的 pitch

style-loader 使用 pitch 来避免读取 CSS 文件：

```typescript
// style-loader/src/index.js
module.exports = function() {};

module.exports.pitch = function(remainingRequest) {
  // remainingRequest: "css-loader!./style.css"
  
  // 生成内联代码，使用 !! 前缀禁用其他 Loader
  const request = `!!${remainingRequest}`;
  
  return `
    import content from ${JSON.stringify(request)};
    import injectStyles from 'style-loader/runtime/injectStyles';
    
    const styleTag = injectStyles(content);
    
    if (module.hot) {
      module.hot.accept(${JSON.stringify(request)}, () => {
        const newContent = require(${JSON.stringify(request)});
        styleTag.update(newContent);
      });
    }
    
    export default content;
  `;
};
```

### 为什么 style-loader 用 pitch？

```
不用 pitch 的问题：
1. css-loader 返回 CSS 内容（字符串）
2. style-loader 需要生成注入代码
3. 但无法获取模块依赖关系

使用 pitch 的优势：
1. 在 pitch 中生成完整的 JS 模块
2. 使用 remainingRequest 作为新的导入路径
3. 让 Webpack 处理新模块的依赖
```

### cache-loader 的 pitch

```typescript
// cache-loader pitch
module.exports = function(source) {
  // Normal: 写入缓存
  const callback = this.async();
  const cacheKey = this.data.cacheKey;
  
  writeCache(cacheKey, {
    result: source,
    dependencies: this.getDependencies(),
  }).then(() => callback(null, source));
};

module.exports.pitch = function(remainingRequest, precedingRequest, data) {
  const callback = this.async();
  const cacheKey = getCacheKey(this, remainingRequest);
  
  data.cacheKey = cacheKey;
  
  readCache(cacheKey).then(cached => {
    if (!cached) {
      // 缓存未命中，继续执行后续 Loader
      return callback();
    }
    
    // 验证依赖
    return validateDependencies(cached.dependencies).then(valid => {
      if (!valid) {
        return callback();
      }
      
      // 缓存命中，返回缓存结果
      // 这会跳过后续所有 Loader
      cached.dependencies.forEach(dep => this.addDependency(dep));
      callback(null, cached.result);
    });
  });
};
```

### thread-loader 的 pitch

```typescript
// thread-loader pitch
module.exports = function() {};

module.exports.pitch = function(remainingRequest) {
  const callback = this.async();
  
  // 获取后续 Loader 配置
  const loaders = this.loaders.slice(this.loaderIndex + 1);
  
  // 发送到 Worker
  workerPool.run({
    loaders,
    resource: this.resource,
    resourcePath: this.resourcePath,
    resourceQuery: this.resourceQuery,
  }).then(result => {
    // 返回 Worker 处理结果
    callback(null, result.source, result.sourceMap);
  }).catch(err => {
    callback(err);
  });
};
```

## 实现一个带 Pitch 的 Loader

### 条件编译 Loader

```typescript
// conditional-loader.js
interface ConditionalLoaderOptions {
  condition: string;
}

module.exports = function(source) {
  // Normal: 不会执行到这里（pitch 返回了值）
  return source;
};

module.exports.pitch = function(remainingRequest, precedingRequest, data) {
  const options = this.getOptions() as ConditionalLoaderOptions;
  const { condition } = options;
  
  // 检查条件
  if (!evalCondition(condition)) {
    // 条件不满足，返回空模块
    return 'export default null;';
  }
  
  // 条件满足，继续执行后续 Loader
  return undefined;
};

function evalCondition(condition: string): boolean {
  // 简单的条件评估
  if (condition === 'production') {
    return process.env.NODE_ENV === 'production';
  }
  if (condition === 'development') {
    return process.env.NODE_ENV === 'development';
  }
  return true;
}
```

### 虚拟模块 Loader

```typescript
// virtual-loader.js
const virtualModules = new Map<string, string>();

export function registerVirtualModule(path: string, content: string) {
  virtualModules.set(path, content);
}

module.exports = function() {};

module.exports.pitch = function(remainingRequest) {
  const virtualContent = virtualModules.get(this.resourcePath);
  
  if (virtualContent) {
    // 返回虚拟模块内容，跳过文件读取
    return virtualContent;
  }
  
  // 继续正常流程
  return undefined;
};
```

### 请求重写 Loader

```typescript
// rewrite-loader.js
module.exports = function(source) {
  return source;
};

module.exports.pitch = function(remainingRequest, precedingRequest, data) {
  const options = this.getOptions();
  
  // 检查是否需要重写
  const newPath = options.rewrites?.[this.resourcePath];
  
  if (newPath) {
    // 重写请求
    const newRequest = remainingRequest.replace(
      this.resourcePath,
      newPath
    );
    
    // 返回新的导入语句
    return `export * from ${JSON.stringify(newRequest)};`;
  }
  
  return undefined;
};
```

## Pitch 与 Data 共享

### 在 Pitch 和 Normal 之间共享数据

```typescript
module.exports = function(source) {
  // 从 data 中获取 pitch 阶段存储的信息
  const { startTime, metadata } = this.data;
  
  console.log(`Processing took ${Date.now() - startTime}ms`);
  console.log('Metadata:', metadata);
  
  return transform(source, metadata);
};

module.exports.pitch = function(remainingRequest, precedingRequest, data) {
  // 在 pitch 阶段存储数据
  data.startTime = Date.now();
  data.metadata = {
    remainingLoaders: remainingRequest.split('!').length,
    resourcePath: this.resourcePath,
  };
  
  // 不返回值，继续执行
};
```

## 异步 Pitch

```typescript
module.exports.pitch = function(remainingRequest) {
  const callback = this.async();
  
  // 异步操作
  checkCache(this.resourcePath)
    .then(cached => {
      if (cached) {
        // 返回缓存，跳过后续 Loader
        callback(null, cached.content);
      } else {
        // 继续执行
        callback();
      }
    })
    .catch(err => callback(err));
};
```

## 常见陷阱

### 返回 undefined vs 不返回

```typescript
// 继续执行后续 Loader
module.exports.pitch = function() {
  // 不返回任何值，或显式返回 undefined
  return undefined;
};

// 会跳过后续 Loader！
module.exports.pitch = function() {
  return '';  // 空字符串也是返回值
};

module.exports.pitch = function() {
  return null;  // null 也是返回值
};
```

### 正确处理异步

```typescript
// 错误：异步但没使用 callback
module.exports.pitch = async function() {
  const result = await someAsyncOp();
  return result;  // 不会正确工作
};

// 正确：使用 callback
module.exports.pitch = function() {
  const callback = this.async();
  
  someAsyncOp()
    .then(result => callback(null, result))
    .catch(err => callback(err));
};
```

## 总结

Pitching Loader 的核心概念：

**执行时机**：
- Pitch 在 Normal 之前执行
- 从左到右顺序执行
- 返回值会中断后续 Loader

**参数**：
- `remainingRequest`：剩余 Loader 和资源
- `precedingRequest`：已执行的 Loader
- `data`：pitch 和 normal 共享的对象

**典型应用**：
- style-loader：生成运行时注入代码
- cache-loader：提前返回缓存结果
- thread-loader：分发到 Worker 处理

**最佳实践**：
- 需要跳过文件读取时使用
- 需要重写请求时使用
- 使用 data 对象共享状态

**下一章**：我们将学习 Loader Context 上下文对象。
