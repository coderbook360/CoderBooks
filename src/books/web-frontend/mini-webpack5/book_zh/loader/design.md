---
sidebar_position: 61
title: "Loader 设计理念"
---

# Loader 设计理念

Loader 是 Webpack 的核心概念之一。它让 Webpack 能够处理 JavaScript 之外的任何类型文件。

## 什么是 Loader

```typescript
// Loader 本质是一个函数
function loader(source: string | Buffer): string | Buffer {
  // 转换 source
  return transformedSource;
}
```

Loader 将文件内容从一种形式转换为另一种形式：

```
TypeScript → JavaScript
SCSS → CSS
Markdown → HTML
图片 → Base64/URL
```

## 设计理念

### 单一职责

每个 Loader 只做一件事：

```typescript
// ✓ 好的设计：每个 Loader 单一职责
{
  test: /\.scss$/,
  use: [
    'style-loader',     // 将 CSS 注入 DOM
    'css-loader',       // 解析 CSS 中的 @import 和 url()
    'postcss-loader',   // 运行 PostCSS 转换
    'sass-loader',      // 将 SCSS 编译为 CSS
  ],
}

// ✗ 不好的设计：一个 Loader 做太多事
{
  test: /\.scss$/,
  use: 'everything-loader',  // 一个 Loader 处理所有事情
}
```

### 链式调用

Loader 可以链式组合：

```
源文件 → loader3 → loader2 → loader1 → 最终结果
         (最后执行)           (最先执行)

// 注意：执行顺序是从右到左，从下到上
```

```typescript
// 数组中的顺序
use: ['style-loader', 'css-loader', 'sass-loader']
// 执行顺序：sass-loader → css-loader → style-loader
```

### 无状态

Loader 应该是纯函数，不保存状态：

```typescript
// ✓ 无状态 Loader
function loader(source) {
  return source.replace(/foo/g, 'bar');
}

// ✗ 有状态 Loader（不推荐）
let count = 0;
function loader(source) {
  count++;  // 依赖外部状态
  return source + `/* processed ${count} times */`;
}
```

### 可组合

Loader 应该设计成可与其他 Loader 组合使用：

```typescript
// babel-loader 可以接收任何 JavaScript
// 不管前面是 ts-loader 还是其他 Loader 的输出
use: [
  'babel-loader',
  'ts-loader',  // 输出 JavaScript
]
```

## 核心接口

### LoaderContext

```typescript
interface LoaderContext {
  // 资源路径
  resourcePath: string;
  resourceQuery: string;
  resourceFragment: string;
  
  // 回调
  callback: LoaderCallback;
  async: () => LoaderCallback;
  
  // 依赖追踪
  addDependency: (file: string) => void;
  addContextDependency: (directory: string) => void;
  addMissingDependency: (file: string) => void;
  
  // 缓存
  cacheable: (flag?: boolean) => void;
  
  // 数据传递
  data: object;
  
  // SourceMap
  sourceMap: boolean;
  
  // 模式
  mode: 'development' | 'production' | 'none';
  
  // 解析
  resolve: (context: string, request: string, callback: ResolveCallback) => void;
  
  // 发射文件
  emitFile: (name: string, content: Buffer | string, sourceMap?: object) => void;
  
  // 错误和警告
  emitError: (error: Error) => void;
  emitWarning: (warning: Error) => void;
  
  // 获取选项
  getOptions: (schema?: object) => object;
}
```

### LoaderCallback

```typescript
type LoaderCallback = (
  err: Error | null,
  content?: string | Buffer,
  sourceMap?: object,
  additionalData?: object
) => void;
```

## Loader 类型

### 同步 Loader

```typescript
// 方式1：直接返回
module.exports = function(source) {
  const result = source.replace(/foo/g, 'bar');
  return result;
};

// 方式2：使用 this.callback
module.exports = function(source) {
  const result = source.replace(/foo/g, 'bar');
  const sourceMap = null;
  this.callback(null, result, sourceMap);
};
```

### 异步 Loader

```typescript
module.exports = function(source) {
  const callback = this.async();
  
  someAsyncOperation(source)
    .then(result => {
      callback(null, result);
    })
    .catch(err => {
      callback(err);
    });
};

// 使用 async/await
module.exports = async function(source) {
  const result = await someAsyncOperation(source);
  return result;
};
```

### Raw Loader

处理二进制内容：

```typescript
module.exports = function(source) {
  // source 是 Buffer
  const buffer = source;
  
  // 处理二进制数据
  const base64 = buffer.toString('base64');
  
  return `export default "data:image/png;base64,${base64}"`;
};

// 标记为 raw
module.exports.raw = true;
```

### Pitching Loader

```typescript
module.exports = function(source) {
  // Normal 阶段
  return source + '/* normal */';
};

module.exports.pitch = function(remainingRequest, precedingRequest, data) {
  // Pitch 阶段
  // 如果返回值，则跳过后续 Loader
  if (shouldSkip) {
    return 'export default "skipped";';
  }
  
  // 不返回值，继续执行
  data.myData = 'passed to normal';
};
```

## Loader 执行流程

```
loader1.pitch → loader2.pitch → loader3.pitch
                                     ↓
                                读取文件内容
                                     ↓
loader1 ← loader2 ← loader3 (normal 阶段，逆序执行)
    ↓
  输出结果
```

如果 pitch 返回值：

```
loader1.pitch → loader2.pitch (返回值)
                     ↓
              跳过 loader3.pitch 和 loader3
                     ↓
               loader1 (使用 loader2.pitch 的返回值)
                     ↓
                  输出结果
```

## Loader 选项

### 配置选项

```typescript
module.exports = {
  module: {
    rules: [
      {
        test: /\.js$/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env'],
            plugins: ['@babel/plugin-proposal-decorators'],
          },
        },
      },
    ],
  },
};
```

### 获取选项

```typescript
const { validate } = require('schema-utils');

const schema = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    debug: { type: 'boolean' },
  },
  additionalProperties: false,
};

module.exports = function(source) {
  const options = this.getOptions(schema);
  
  // 使用选项
  if (options.debug) {
    console.log('Processing:', this.resourcePath);
  }
  
  return source;
};
```

## 最佳实践

### 保持简单

```typescript
// ✓ 简单明了
module.exports = function(source) {
  return source.replace(/DEBUG/g, 'false');
};

// ✗ 过度复杂
module.exports = function(source) {
  const ast = parse(source);
  traverse(ast, { /* 复杂逻辑 */ });
  return generate(ast);
};
```

### 支持缓存

```typescript
module.exports = function(source) {
  // 标记为可缓存（默认 true）
  this.cacheable(true);
  
  return transform(source);
};
```

### 正确处理错误

```typescript
module.exports = function(source) {
  try {
    return transform(source);
  } catch (err) {
    // 使用 callback 报告错误
    this.callback(err);
  }
};
```

### 提供 SourceMap

```typescript
module.exports = function(source, inputSourceMap) {
  const result = transform(source);
  const outputSourceMap = generateSourceMap(source, result);
  
  this.callback(null, result, outputSourceMap);
};
```

## 总结

Loader 设计的核心原则：

**单一职责**：
- 每个 Loader 只做一件事
- 通过链式组合实现复杂转换

**纯函数**：
- 无状态
- 相同输入产生相同输出

**可组合**：
- 输入输出格式一致
- 可以与其他 Loader 自由组合

**下一章**：我们将实现 LoaderRunner。
