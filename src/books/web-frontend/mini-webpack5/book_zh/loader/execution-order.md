---
sidebar_position: 63
title: "Loader 执行顺序与管道"
---

# Loader 执行顺序与管道

Loader 的执行顺序是理解 Webpack 构建流程的关键。本章深入剖析 Loader 如何形成处理管道。

## 执行顺序规则

### 从右到左，从下到上

```javascript
module.exports = {
  module: {
    rules: [
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader', 'postcss-loader'],
        //     3            2            1
        // 执行顺序：postcss-loader → css-loader → style-loader
      },
    ],
  },
};
```

这个顺序看似反直觉，但有其设计逻辑：

```typescript
// 概念上等价于函数组合
const result = styleLoader(cssLoader(postcssLoader(source)));
```

### 多规则匹配顺序

```javascript
module.exports = {
  module: {
    rules: [
      { test: /\.css$/, use: 'css-loader' },      // 规则 1
      { test: /\.css$/, use: 'style-loader' },    // 规则 2
    ],
  },
};
```

当多个规则匹配同一文件时：
1. 按规则定义顺序收集所有 Loader
2. 最终形成：`['style-loader', 'css-loader']`
3. 执行顺序：`css-loader → style-loader`

## Loader 管道实现

### 管道数据结构

```typescript
interface LoaderObject {
  path: string;
  query: string;
  options: any;
  ident: string;
  normal: Function | null;
  pitch: Function | null;
  raw: boolean;
  data: object;
}

interface LoaderContext {
  loaders: LoaderObject[];
  loaderIndex: number;
  resource: string;
  resourcePath: string;
  resourceQuery: string;
}
```

### 管道执行流程

```typescript
function runLoaders(options: RunLoadersOptions): Promise<RunLoadersResult> {
  const context: LoaderContext = {
    loaders: options.loaders.map(createLoaderObject),
    loaderIndex: 0,
    resource: options.resource,
    resourcePath: parseResource(options.resource).path,
    resourceQuery: parseResource(options.resource).query,
  };

  return new Promise((resolve, reject) => {
    // 阶段 1：Pitch 阶段（从左到右）
    iteratePitchingLoaders(context, (err) => {
      if (err) return reject(err);
      
      // 阶段 2：读取资源
      readResource(context, (err, content) => {
        if (err) return reject(err);
        
        // 阶段 3：Normal 阶段（从右到左）
        iterateNormalLoaders(context, content, (err, result) => {
          if (err) return reject(err);
          resolve(result);
        });
      });
    });
  });
}
```

### Pitch 阶段

```typescript
function iteratePitchingLoaders(
  context: LoaderContext,
  callback: Callback
): void {
  // 所有 Loader 的 pitch 都执行完毕
  if (context.loaderIndex >= context.loaders.length) {
    return callback();
  }

  const currentLoader = context.loaders[context.loaderIndex];

  // 加载 Loader 模块
  loadLoader(currentLoader, (err) => {
    if (err) return callback(err);

    const pitchFn = currentLoader.pitch;

    // 没有 pitch 函数，继续下一个
    if (!pitchFn) {
      context.loaderIndex++;
      return iteratePitchingLoaders(context, callback);
    }

    // 执行 pitch 函数
    runSyncOrAsync(
      pitchFn,
      context,
      [
        context.remainingRequest,
        context.previousRequest,
        currentLoader.data,
      ],
      (err, ...args) => {
        if (err) return callback(err);

        // pitch 返回值不为 undefined，跳过后续 Loader
        if (args.some((arg) => arg !== undefined)) {
          context.loaderIndex--;
          return iterateNormalLoaders(context, args[0], callback);
        }

        // 继续下一个 pitch
        context.loaderIndex++;
        iteratePitchingLoaders(context, callback);
      }
    );
  });
}
```

### Normal 阶段

```typescript
function iterateNormalLoaders(
  context: LoaderContext,
  content: Buffer | string,
  callback: Callback
): void {
  // 所有 Loader 都执行完毕
  if (context.loaderIndex < 0) {
    return callback(null, content);
  }

  const currentLoader = context.loaders[context.loaderIndex];
  const normalFn = currentLoader.normal;

  // 没有 normal 函数，继续上一个
  if (!normalFn) {
    context.loaderIndex--;
    return iterateNormalLoaders(context, content, callback);
  }

  // 处理 raw 模式
  const processedContent = currentLoader.raw
    ? convertToBuffer(content)
    : convertToString(content);

  // 执行 normal 函数
  runSyncOrAsync(
    normalFn,
    context,
    [processedContent, sourceMap, meta],
    (err, ...args) => {
      if (err) return callback(err);

      context.loaderIndex--;
      iterateNormalLoaders(context, args[0], callback);
    }
  );
}
```

## 执行顺序可视化

```
文件: style.scss

配置: ['style-loader', 'css-loader', 'sass-loader']

执行流程：
┌─────────────────────────────────────────────────────┐
│                    Pitch 阶段                        │
│  style-loader.pitch → css-loader.pitch → sass-loader.pitch
│         ↓                   ↓                  ↓     │
│       (无)               (无)               (无)     │
└─────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────┐
│                   读取文件                           │
│               style.scss 内容                        │
└─────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────┐
│                   Normal 阶段                        │
│  sass-loader → css-loader → style-loader             │
│      ↓              ↓              ↓                 │
│   SCSS→CSS      CSS→JS模块     注入样式代码          │
└─────────────────────────────────────────────────────┘
```

## enforce 属性

### 控制 Loader 顺序

```javascript
module.exports = {
  module: {
    rules: [
      { test: /\.js$/, use: 'eslint-loader', enforce: 'pre' },
      { test: /\.js$/, use: 'babel-loader' },
      { test: /\.js$/, use: 'coverage-loader', enforce: 'post' },
    ],
  },
};
```

执行顺序：`eslint-loader → babel-loader → coverage-loader`

### 实现原理

```typescript
function sortLoaders(loaders: RuleSetLoader[]): RuleSetLoader[] {
  const preLoaders: RuleSetLoader[] = [];
  const normalLoaders: RuleSetLoader[] = [];
  const postLoaders: RuleSetLoader[] = [];

  for (const loader of loaders) {
    switch (loader.enforce) {
      case 'pre':
        preLoaders.push(loader);
        break;
      case 'post':
        postLoaders.push(loader);
        break;
      default:
        normalLoaders.push(loader);
    }
  }

  // post → normal → pre（执行时从右到左）
  return [...postLoaders, ...normalLoaders, ...preLoaders];
}
```

## Inline Loader 与执行顺序

### 前缀语法

```javascript
// 禁用所有 pre 和 normal Loader
import styles from '-!css-loader!./style.css';

// 禁用所有 Loader
import raw from '!!raw-loader!./file.txt';

// 禁用所有 pre Loader
import data from '!json-loader!./data.json';
```

### 前缀处理

```typescript
function parseRequest(request: string): ParsedRequest {
  let noPreAutoLoaders = false;
  let noAutoLoaders = false;
  let noPrePostAutoLoaders = false;

  if (request.startsWith('!!')) {
    noPrePostAutoLoaders = true;
    request = request.slice(2);
  } else if (request.startsWith('-!')) {
    noPreAutoLoaders = true;
    request = request.slice(2);
  } else if (request.startsWith('!')) {
    noAutoLoaders = true;
    request = request.slice(1);
  }

  return {
    request,
    noPreAutoLoaders,
    noAutoLoaders,
    noPrePostAutoLoaders,
  };
}
```

## 管道中的数据传递

### SourceMap 传递

```typescript
function iterateNormalLoaders(
  context: LoaderContext,
  content: Buffer | string,
  sourceMap: SourceMap | null,
  meta: any,
  callback: Callback
): void {
  // ...
  runSyncOrAsync(
    normalFn,
    context,
    [content, sourceMap, meta],
    (err, newContent, newSourceMap, newMeta) => {
      // SourceMap 沿管道传递
      context.loaderIndex--;
      iterateNormalLoaders(
        context,
        newContent,
        newSourceMap,
        newMeta,
        callback
      );
    }
  );
}
```

### Meta 数据传递

```typescript
// loader-a.js
module.exports = function(source, sourceMap, meta) {
  // 添加元数据
  const newMeta = {
    ...meta,
    processedBy: 'loader-a',
    timestamp: Date.now(),
  };
  
  this.callback(null, transform(source), sourceMap, newMeta);
};

// loader-b.js
module.exports = function(source, sourceMap, meta) {
  console.log('Previous loader:', meta.processedBy);
  // ...
};
```

## 并行与串行

### 默认串行执行

```
Loader A → Loader B → Loader C
   ↓           ↓           ↓
 10ms       20ms        15ms
          总耗时: 45ms
```

### thread-loader 并行化

```javascript
module.exports = {
  module: {
    rules: [
      {
        test: /\.js$/,
        use: [
          'thread-loader',  // 开启多线程
          'babel-loader',
        ],
      },
    ],
  },
};
```

```
Worker 1: babel-loader(file1.js)
Worker 2: babel-loader(file2.js)  
Worker 3: babel-loader(file3.js)
                ↓
         并行处理，总耗时减少
```

## 总结

Loader 执行顺序的核心规则：

**基本顺序**：
- 配置数组从右到左执行
- 多规则按定义顺序合并

**两阶段执行**：
- Pitch 阶段：从左到右
- Normal 阶段：从右到左

**enforce 控制**：
- `pre`：最先执行
- 默认：正常顺序
- `post`：最后执行

**Inline 前缀**：
- `!`：禁用 normal Loader
- `-!`：禁用 pre 和 normal Loader
- `!!`：禁用所有配置的 Loader

**下一章**：我们将学习 Normal Loader 的实现细节。
