---
sidebar_position: 63
title: "Loader 执行上下文"
---

# Loader 执行上下文

Loader 执行上下文（`this`）提供了丰富的 API，让 Loader 能够与 Webpack 交互。本章详细介绍这些 API。

## 上下文属性

### 资源信息

```typescript
module.exports = function(source) {
  // 资源完整路径
  console.log(this.resourcePath);  // /project/src/index.js
  
  // 查询字符串
  console.log(this.resourceQuery);  // ?foo=bar
  
  // 片段
  console.log(this.resourceFragment);  // #section
  
  // 完整资源标识
  console.log(this.resource);  // /project/src/index.js?foo=bar#section
  
  return source;
};
```

### 请求信息

```typescript
module.exports = function(source) {
  // 完整请求（包含所有 Loader）
  console.log(this.request);
  // /loaders/a.js!/loaders/b.js!/src/index.js
  
  // 剩余请求（当前 Loader 之后的）
  console.log(this.remainingRequest);
  // /loaders/b.js!/src/index.js
  
  // 当前请求（从当前 Loader 开始）
  console.log(this.currentRequest);
  // /loaders/a.js!/loaders/b.js!/src/index.js
  
  // 之前的请求（当前 Loader 之前的）
  console.log(this.previousRequest);
  // 空或之前的 Loader 路径
  
  return source;
};
```

### Loader 选项

```typescript
module.exports = function(source) {
  // 获取选项（推荐方式）
  const options = this.getOptions();
  
  // 旧方式（兼容）
  const query = this.query;
  // 如果是对象，返回 options
  // 如果是字符串，返回查询字符串
  
  console.log(options);  // { debug: true, name: 'foo' }
  
  return source;
};

// 配置
{
  loader: 'my-loader',
  options: {
    debug: true,
    name: 'foo',
  },
}
```

### 模式信息

```typescript
module.exports = function(source) {
  // 构建模式
  console.log(this.mode);  // 'development' | 'production' | 'none'
  
  // 根据模式处理
  if (this.mode === 'production') {
    return minify(source);
  }
  
  return source;
};
```

## 核心方法

### async 和 callback

```typescript
// 同步 Loader
module.exports = function(source) {
  return source.toUpperCase();
};

// 异步 Loader
module.exports = function(source) {
  const callback = this.async();
  
  setTimeout(() => {
    callback(null, source.toUpperCase());
  }, 100);
};

// callback 签名
module.exports = function(source, inputSourceMap, additionalData) {
  // callback(error, content, sourceMap?, additionalData?)
  this.callback(null, source, inputSourceMap, { custom: 'data' });
};
```

### 依赖追踪

```typescript
module.exports = function(source) {
  // 添加文件依赖（文件变化时重新编译）
  this.addDependency('/path/to/config.json');
  
  // 添加目录依赖（目录内任何文件变化时重新编译）
  this.addContextDependency('/path/to/partials');
  
  // 添加缺失依赖（文件创建时重新编译）
  this.addMissingDependency('/path/to/optional.json');
  
  // 读取依赖文件
  const config = JSON.parse(
    require('fs').readFileSync('/path/to/config.json', 'utf-8')
  );
  
  return source;
};
```

### 缓存控制

```typescript
module.exports = function(source) {
  // 默认启用缓存
  this.cacheable(true);
  
  // 如果依赖外部状态，禁用缓存
  if (usesRandomness) {
    this.cacheable(false);
  }
  
  return source;
};
```

### 发射文件

```typescript
module.exports = function(source) {
  // 生成额外文件
  this.emitFile('manifest.json', JSON.stringify({
    timestamp: Date.now(),
    files: ['index.js'],
  }));
  
  // 生成二进制文件
  this.emitFile('font.woff', fontBuffer);
  
  // 生成带 SourceMap 的文件
  this.emitFile('chunk.js', code, sourceMap);
  
  return source;
};
```

### 解析路径

```typescript
module.exports = function(source) {
  const callback = this.async();
  
  // 解析模块路径
  this.resolve(this.context, './utils', (err, result) => {
    if (err) return callback(err);
    
    console.log(result);  // /project/src/utils.js
    
    callback(null, source);
  });
};

// 同步解析（已废弃，不推荐）
// this.resolveSync 已被移除
```

### 错误和警告

```typescript
module.exports = function(source) {
  // 发出警告（不中断构建）
  this.emitWarning(new Error('This feature is deprecated'));
  
  // 发出错误（构建失败，但继续处理其他模块）
  this.emitError(new Error('Invalid syntax'));
  
  // 严重错误（立即中断）
  // throw new Error('Fatal error');
  // 或
  // this.callback(new Error('Fatal error'));
  
  return source;
};
```

## 高级属性

### Loader 链信息

```typescript
module.exports = function(source) {
  // 当前 Loader 索引
  console.log(this.loaderIndex);  // 0, 1, 2, ...
  
  // 所有 Loader
  console.log(this.loaders);
  // [{ path: '/loaders/a.js', options: {} }, ...]
  
  // 当前 Loader
  console.log(this.loaders[this.loaderIndex]);
  
  return source;
};
```

### 数据传递

```typescript
// pitch 阶段传递数据到 normal 阶段
module.exports = function(source) {
  // 读取 pitch 阶段设置的数据
  console.log(this.data.value);  // 'from pitch'
  
  return source;
};

module.exports.pitch = function(remainingRequest, precedingRequest, data) {
  // 设置数据
  data.value = 'from pitch';
};
```

### 编译相关

```typescript
module.exports = function(source) {
  // Webpack 编译实例
  const compilation = this._compilation;
  
  // Webpack 编译器实例
  const compiler = this._compiler;
  
  // 模块对象
  const module = this._module;
  
  // 注意：以 _ 开头的属性是内部 API，可能会变化
  
  return source;
};
```

### 目标环境

```typescript
module.exports = function(source) {
  // 构建目标
  console.log(this.target);  // 'web', 'node', 'webworker', ...
  
  // 根据目标处理
  if (this.target === 'node') {
    return source.replace('__PLATFORM__', 'node');
  }
  
  return source.replace('__PLATFORM__', 'browser');
};
```

## 上下文创建

Webpack 如何创建 Loader 上下文：

```typescript
export function createLoaderContext(
  compilation: Compilation,
  module: NormalModule,
  loaderRunner: LoaderRunner
): LoaderContext {
  const loaderContext: LoaderContext = {
    // 版本
    version: 2,
    
    // 资源信息
    get resource() {
      return module.resource;
    },
    get resourcePath() {
      return module.resourcePath;
    },
    get resourceQuery() {
      return module.resourceQuery;
    },
    get resourceFragment() {
      return module.resourceFragment;
    },
    
    // 模式
    get mode() {
      return compilation.options.mode || 'none';
    },
    
    // 目标
    get target() {
      return compilation.options.target || 'web';
    },
    
    // 源映射
    get sourceMap() {
      return compilation.options.devtool !== false;
    },
    
    // 解析
    resolve: (context, request, callback) => {
      compilation.resolverFactory
        .get('normal')
        .resolve({}, context, request, {}, callback);
    },
    
    // 发射文件
    emitFile: (name, content, sourceMap) => {
      compilation.emitAsset(name, new RawSource(content));
    },
    
    // 错误处理
    emitError: (error) => {
      module.addError(error);
    },
    emitWarning: (warning) => {
      module.addWarning(warning);
    },
    
    // 获取选项
    getOptions: (schema) => {
      const loader = loaderContext.loaders[loaderContext.loaderIndex];
      const options = loader.options || {};
      
      if (schema) {
        validate(schema, options, { name: loader.path });
      }
      
      return options;
    },
    
    // 内部引用（谨慎使用）
    _compilation: compilation,
    _compiler: compilation.compiler,
    _module: module,
    
    // ...其他属性
  };
  
  return loaderContext;
}
```

## 选项验证

```typescript
import { validate } from 'schema-utils';

const schema = {
  type: 'object',
  properties: {
    name: {
      type: 'string',
      description: 'The name to use',
    },
    debug: {
      type: 'boolean',
      default: false,
    },
    targets: {
      type: 'array',
      items: { type: 'string' },
    },
  },
  required: ['name'],
  additionalProperties: false,
};

module.exports = function(source) {
  // 自动验证选项
  const options = this.getOptions(schema);
  
  // options 已验证，可以安全使用
  console.log(options.name);
  
  return source;
};
```

## 实际应用示例

### 带依赖追踪的 Loader

```typescript
const fs = require('fs');
const path = require('path');

module.exports = function(source) {
  const callback = this.async();
  const configPath = path.resolve(this.context, 'config.json');
  
  // 添加配置文件依赖
  this.addDependency(configPath);
  
  fs.readFile(configPath, 'utf-8', (err, content) => {
    if (err) {
      // 配置文件不存在，添加为缺失依赖
      this.addMissingDependency(configPath);
      return callback(null, source);
    }
    
    const config = JSON.parse(content);
    const result = source.replace('__CONFIG__', JSON.stringify(config));
    
    callback(null, result);
  });
};
```

### 生成额外资源的 Loader

```typescript
const path = require('path');

module.exports = function(source) {
  const filename = path.basename(this.resourcePath, '.css');
  
  // 生成 CSS 变量文件
  const variables = extractVariables(source);
  this.emitFile(
    `${filename}.variables.json`,
    JSON.stringify(variables, null, 2)
  );
  
  return source;
};
```

## 总结

Loader 上下文的核心功能：

**资源信息**：
- resourcePath、resourceQuery、resourceFragment
- 请求链信息

**异步支持**：
- async() 和 callback
- 支持 Promise

**依赖追踪**：
- addDependency、addContextDependency
- addMissingDependency

**输出控制**：
- emitFile、emitError、emitWarning
- cacheable

**下一章**：我们将探讨 Pitch Loader 机制。
