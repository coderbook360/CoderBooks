---
sidebar_position: 66
title: "Loader Context 上下文对象"
---

# Loader Context 上下文对象

Loader Context 是 Loader 函数中的 `this` 对象，提供了丰富的 API 用于与 Webpack 交互。

## Context 核心属性

### 资源信息

```typescript
module.exports = function(source) {
  // 资源的完整请求路径
  console.log(this.resource);
  // "/path/to/file.js?query=value"
  
  // 资源文件路径（不含 query）
  console.log(this.resourcePath);
  // "/path/to/file.js"
  
  // 资源的 query 部分
  console.log(this.resourceQuery);
  // "?query=value"
  
  // 资源的 fragment 部分
  console.log(this.resourceFragment);
  // "#hash"
  
  return source;
};
```

### Loader 信息

```typescript
module.exports = function(source) {
  // 所有 Loader 数组
  console.log(this.loaders);
  // [{ path, query, options, ... }, ...]
  
  // 当前 Loader 索引
  console.log(this.loaderIndex);
  // 1
  
  // 当前 Loader 数据
  console.log(this.data);
  // {} （pitch 阶段设置的数据）
  
  return source;
};
```

### 请求信息

```typescript
module.exports = function(source) {
  // 完整请求（包含所有 Loader）
  console.log(this.request);
  // "loader-a!loader-b!./file.js"
  
  // 剩余请求（当前 Loader 之后）
  console.log(this.remainingRequest);
  // "loader-c!./file.js"
  
  // 当前及剩余请求
  console.log(this.currentRequest);
  // "loader-b!loader-c!./file.js"
  
  // 之前的请求
  console.log(this.previousRequest);
  // "loader-a"
  
  return source;
};
```

## Context 核心方法

### async() 和 callback()

```typescript
// 异步 Loader
module.exports = function(source) {
  const callback = this.async();
  
  // callback 签名
  // callback(err, content, sourceMap?, meta?)
  
  processAsync(source)
    .then(result => {
      callback(null, result.code, result.map, result.meta);
    })
    .catch(err => {
      callback(err);
    });
};
```

### getOptions()

```typescript
module.exports = function(source) {
  // 获取 Loader 配置
  const options = this.getOptions();
  
  // 可传入 JSON Schema 进行验证
  const options2 = this.getOptions({
    type: 'object',
    properties: {
      name: { type: 'string' },
      debug: { type: 'boolean' },
    },
  });
  
  return transform(source, options);
};
```

### cacheable()

```typescript
module.exports = function(source) {
  // 声明 Loader 结果可缓存（默认 true）
  this.cacheable(true);
  
  // 依赖外部状态时禁用缓存
  if (dependsOnEnv()) {
    this.cacheable(false);
  }
  
  return transform(source);
};
```

### emitFile()

```typescript
module.exports = function(source) {
  // 输出文件到构建目录
  const filename = 'assets/data.json';
  const content = JSON.stringify(extractData(source));
  
  this.emitFile(filename, content);
  
  // 返回引用该文件的代码
  return `export default __webpack_public_path__ + ${JSON.stringify(filename)};`;
};
```

### emitWarning() 和 emitError()

```typescript
module.exports = function(source) {
  // 发出警告（不中断构建）
  if (source.includes('deprecated')) {
    this.emitWarning(new Error('使用了已废弃的 API'));
  }
  
  // 发出错误（不中断构建，但标记为失败）
  if (!isValid(source)) {
    this.emitError(new Error('文件格式无效'));
    return '';
  }
  
  return transform(source);
};
```

## 依赖管理

### addDependency()

```typescript
module.exports = function(source) {
  const callback = this.async();
  
  // 添加文件依赖（文件变化会触发重新构建）
  const configPath = path.resolve(this.context, 'config.json');
  this.addDependency(configPath);
  
  fs.readFile(configPath, 'utf-8', (err, config) => {
    if (err) return callback(err);
    
    const result = transform(source, JSON.parse(config));
    callback(null, result);
  });
};
```

### addContextDependency()

```typescript
module.exports = function(source) {
  // 添加目录依赖（目录内任何文件变化触发重新构建）
  const templatesDir = path.resolve(this.context, 'templates');
  this.addContextDependency(templatesDir);
  
  const templates = loadTemplates(templatesDir);
  return compile(source, templates);
};
```

### addMissingDependency()

```typescript
module.exports = function(source) {
  const optionalConfigPath = path.resolve(this.context, 'optional.config.js');
  
  // 即使文件不存在也添加依赖
  // 文件被创建时会触发重新构建
  this.addMissingDependency(optionalConfigPath);
  
  if (fs.existsSync(optionalConfigPath)) {
    const config = require(optionalConfigPath);
    return transform(source, config);
  }
  
  return transform(source, {});
};
```

### getDependencies()

```typescript
module.exports = function(source) {
  const result = transform(source);
  
  // 获取所有依赖
  const deps = this.getDependencies();
  console.log('Dependencies:', deps);
  
  return result;
};
```

### clearDependencies()

```typescript
module.exports = function(source) {
  // 清除之前 Loader 添加的依赖
  this.clearDependencies();
  
  // 重新添加正确的依赖
  this.addDependency(this.resourcePath);
  
  return source;
};
```

## 构建信息

### mode 和 environment

```typescript
module.exports = function(source) {
  // Webpack mode
  console.log(this.mode);
  // "development" | "production" | "none"
  
  // 目标环境
  console.log(this.target);
  // "web" | "node" | ...
  
  // 环境特性
  console.log(this.environment);
  // { arrowFunction: true, const: true, ... }
  
  return source;
};
```

### rootContext

```typescript
module.exports = function(source) {
  // 项目根目录
  console.log(this.rootContext);
  // "/path/to/project"
  
  // 当前文件所在目录
  console.log(this.context);
  // "/path/to/project/src"
  
  return source;
};
```

### sourceMap

```typescript
module.exports = function(source) {
  // 是否应该生成 SourceMap
  if (this.sourceMap) {
    const { code, map } = transformWithSourceMap(source);
    this.callback(null, code, map);
  } else {
    this.callback(null, transform(source));
  }
};
```

## 模块解析

### resolve()

```typescript
module.exports = function(source) {
  const callback = this.async();
  
  // 解析模块路径
  this.resolve(this.context, './utils', (err, result) => {
    if (err) return callback(err);
    
    console.log('Resolved path:', result);
    // "/path/to/project/src/utils.js"
    
    // 使用解析后的路径
    callback(null, source);
  });
};
```

### getResolve()

```typescript
module.exports = function(source) {
  const callback = this.async();
  
  // 创建自定义解析器
  const resolve = this.getResolve({
    extensions: ['.ts', '.tsx', '.js'],
    mainFields: ['module', 'main'],
  });
  
  resolve(this.context, './module', (err, result) => {
    if (err) return callback(err);
    callback(null, transform(source, result));
  });
};
```

## 日志系统

### getLogger()

```typescript
module.exports = function(source) {
  const logger = this.getLogger('my-loader');
  
  logger.info('Processing file:', this.resourcePath);
  logger.warn('Deprecated syntax detected');
  logger.error('Transform failed');
  logger.debug('Debug info:', { source: source.length });
  
  // 分组日志
  logger.group('Transform steps');
  logger.log('Step 1: Parse');
  logger.log('Step 2: Transform');
  logger.log('Step 3: Generate');
  logger.groupEnd();
  
  return transform(source);
};
```

## 热更新支持

### hot

```typescript
module.exports = function(source) {
  // 检查是否启用 HMR
  if (this.hot) {
    // 添加 HMR 相关代码
    return `
      ${transform(source)}
      
      if (module.hot) {
        module.hot.accept();
      }
    `;
  }
  
  return transform(source);
};
```

## 完整的 Context 接口

```typescript
interface LoaderContext {
  // 版本
  version: number;
  
  // 资源信息
  resource: string;
  resourcePath: string;
  resourceQuery: string;
  resourceFragment: string;
  
  // 路径信息
  context: string;
  rootContext: string;
  
  // Loader 信息
  loaders: LoaderObject[];
  loaderIndex: number;
  data: object;
  
  // 请求信息
  request: string;
  remainingRequest: string;
  currentRequest: string;
  previousRequest: string;
  
  // 构建信息
  mode: 'development' | 'production' | 'none';
  target: string;
  sourceMap: boolean;
  hot: boolean;
  environment: Environment;
  
  // 核心方法
  async(): LoaderCallback;
  callback: LoaderCallback;
  cacheable(flag?: boolean): void;
  
  // 配置
  getOptions(schema?: Schema): object;
  
  // 文件操作
  emitFile(name: string, content: Buffer | string, sourceMap?: any): void;
  
  // 错误和警告
  emitWarning(warning: Error): void;
  emitError(error: Error): void;
  
  // 依赖管理
  addDependency(file: string): void;
  addContextDependency(directory: string): void;
  addMissingDependency(file: string): void;
  getDependencies(): string[];
  getContextDependencies(): string[];
  getMissingDependencies(): string[];
  clearDependencies(): void;
  
  // 解析
  resolve(context: string, request: string, callback: ResolveCallback): void;
  getResolve(options?: ResolveOptions): ResolveFunction;
  
  // 日志
  getLogger(name?: string): Logger;
  
  // 废弃但仍可用
  query: string | object;  // 使用 getOptions() 替代
  
  // 内部使用
  _compiler: Compiler;
  _compilation: Compilation;
  _module: NormalModule;
}
```

## 实战示例

### 完整的图片处理 Loader

```typescript
import path from 'path';
import crypto from 'crypto';
import imagemin from 'imagemin';

interface ImageLoaderOptions {
  limit: number;
  outputPath: string;
  publicPath: string;
  quality: number;
}

module.exports = async function(source: Buffer) {
  const callback = this.async();
  const options = this.getOptions() as ImageLoaderOptions;
  const logger = this.getLogger('image-loader');
  
  const {
    limit = 8192,
    outputPath = 'images/',
    publicPath = '',
    quality = 80,
  } = options;
  
  try {
    // 启用缓存
    this.cacheable(true);
    
    logger.info('Processing:', this.resourcePath);
    
    // 小于 limit 使用 base64
    if (source.length < limit) {
      const base64 = source.toString('base64');
      const ext = path.extname(this.resourcePath).slice(1);
      const dataUrl = `data:image/${ext};base64,${base64}`;
      
      logger.debug('Using base64, size:', source.length);
      return callback(null, `export default ${JSON.stringify(dataUrl)};`);
    }
    
    // 压缩图片
    const optimized = await imagemin.buffer(source, {
      plugins: [
        require('imagemin-mozjpeg')({ quality }),
        require('imagemin-pngquant')({ quality: [0.6, 0.8] }),
      ],
    });
    
    // 生成文件名
    const hash = crypto.createHash('md5').update(optimized).digest('hex').slice(0, 8);
    const ext = path.extname(this.resourcePath);
    const name = path.basename(this.resourcePath, ext);
    const filename = `${outputPath}${name}.${hash}${ext}`;
    
    // 输出文件
    this.emitFile(filename, optimized);
    
    // 返回公共路径
    const url = publicPath + filename;
    logger.info('Emitted:', filename, 'size:', optimized.length);
    
    callback(null, `export default ${JSON.stringify(url)};`);
  } catch (err) {
    logger.error('Failed:', err.message);
    callback(err);
  }
};

module.exports.raw = true;
```

## 总结

Loader Context 提供的核心能力：

**资源信息**：
- `resourcePath`：文件路径
- `context`：所在目录
- `rootContext`：项目根目录

**异步支持**：
- `async()`：获取异步回调
- `callback()`：返回结果

**依赖追踪**：
- `addDependency()`：添加文件依赖
- `addContextDependency()`：添加目录依赖

**文件输出**：
- `emitFile()`：输出额外文件

**模块解析**：
- `resolve()`：解析模块路径
- `getResolve()`：创建自定义解析器

**日志系统**：
- `getLogger()`：获取日志记录器

**下一章**：我们将学习 Raw Loader 与 Buffer 处理。
