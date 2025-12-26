---
sidebar_position: 62
title: "LoaderRunner 实现"
---

# LoaderRunner 实现

LoaderRunner 是 Webpack 中负责执行 Loader 链的核心模块。它管理 Loader 的 pitch 阶段和 normal 阶段的执行。

## 设计目标

```typescript
// 使用 LoaderRunner
runLoaders({
  resource: '/path/to/file.scss',
  loaders: [
    '/path/to/style-loader.js',
    '/path/to/css-loader.js',
    '/path/to/sass-loader.js',
  ],
  context: {},
  readResource: fs.readFile.bind(fs),
}, (err, result) => {
  console.log(result.result);     // 最终内容
  console.log(result.resourceBuffer);  // 原始内容
  console.log(result.cacheable);  // 是否可缓存
  console.log(result.fileDependencies);  // 文件依赖
});
```

## 核心数据结构

### LoaderObject

```typescript
interface LoaderObject {
  // Loader 路径
  path: string;
  
  // 查询字符串
  query: string;
  
  // Loader 选项
  options: object | null;
  
  // 标识符
  ident: string | null;
  
  // 是否为 raw Loader
  raw: boolean;
  
  // 模块对象
  normal: Function | null;
  pitch: Function | null;
  
  // 数据（pitch 到 normal 传递）
  data: object;
  
  // pitching 阶段返回值
  pitchExecuted: boolean;
  normalExecuted: boolean;
}
```

### LoaderContext

```typescript
interface LoaderContext {
  // 版本
  version: number;
  
  // 资源信息
  resource: string;
  resourcePath: string;
  resourceQuery: string;
  resourceFragment: string;
  
  // Loader 信息
  loaders: LoaderObject[];
  loaderIndex: number;
  
  // 回调函数
  async: () => LoaderCallback;
  callback: LoaderCallback;
  
  // 依赖
  addDependency: (file: string) => void;
  dependency: (file: string) => void;  // 别名
  addContextDependency: (directory: string) => void;
  addMissingDependency: (file: string) => void;
  getDependencies: () => string[];
  getContextDependencies: () => string[];
  getMissingDependencies: () => string[];
  clearDependencies: () => void;
  
  // 缓存
  cacheable: (flag?: boolean) => void;
  
  // 输出
  emitFile: (name: string, content: Buffer | string, sourceMap?: object) => void;
  
  // 解析
  resolve: (context: string, request: string, callback: ResolveCallback) => void;
  
  // 获取选项
  getOptions: (schema?: object) => object;
  
  // 数据
  data: object;
  
  // 请求字符串
  request: string;
  remainingRequest: string;
  currentRequest: string;
  previousRequest: string;
  query: string | object;
}
```

## LoaderRunner 实现

```typescript
import * as fs from 'fs';
import * as path from 'path';

export interface RunLoaderOptions {
  resource: string;
  loaders: Array<string | LoaderObject>;
  context: object;
  readResource: (path: string, callback: (err: Error | null, buffer?: Buffer) => void) => void;
}

export interface RunLoaderResult {
  result: (string | Buffer)[] | undefined;
  resourceBuffer: Buffer | null;
  cacheable: boolean;
  fileDependencies: string[];
  contextDependencies: string[];
  missingDependencies: string[];
}

export function runLoaders(
  options: RunLoaderOptions,
  callback: (err: Error | null, result?: RunLoaderResult) => void
): void {
  // 解析资源路径
  const {
    resourcePath,
    resourceQuery,
    resourceFragment,
  } = parseResource(options.resource);
  
  // 创建 Loader 对象
  const loaders = createLoaderObjects(options.loaders);
  
  // 创建上下文
  const loaderContext = createLoaderContext(
    resourcePath,
    resourceQuery,
    resourceFragment,
    loaders,
    options.context,
    options.readResource
  );
  
  // 结果收集
  const result: RunLoaderResult = {
    result: undefined,
    resourceBuffer: null,
    cacheable: true,
    fileDependencies: [],
    contextDependencies: [],
    missingDependencies: [],
  };
  
  // 执行 pitching 阶段
  iteratePitchingLoaders(loaderContext, loaders, result, callback);
}

function parseResource(resource: string): {
  resourcePath: string;
  resourceQuery: string;
  resourceFragment: string;
} {
  const fragmentIndex = resource.indexOf('#');
  let resourceFragment = '';
  
  if (fragmentIndex >= 0) {
    resourceFragment = resource.slice(fragmentIndex);
    resource = resource.slice(0, fragmentIndex);
  }
  
  const queryIndex = resource.indexOf('?');
  let resourceQuery = '';
  
  if (queryIndex >= 0) {
    resourceQuery = resource.slice(queryIndex);
    resource = resource.slice(0, queryIndex);
  }
  
  return {
    resourcePath: resource,
    resourceQuery,
    resourceFragment,
  };
}
```

### 创建 Loader 对象

```typescript
function createLoaderObjects(loaders: Array<string | LoaderObject>): LoaderObject[] {
  return loaders.map(loader => {
    if (typeof loader === 'string') {
      const { path: loaderPath, query, ident } = parseLoaderRequest(loader);
      
      return {
        path: loaderPath,
        query,
        options: query ? parseQuery(query) : null,
        ident,
        raw: false,
        normal: null,
        pitch: null,
        data: {},
        pitchExecuted: false,
        normalExecuted: false,
      };
    }
    
    return {
      ...loader,
      data: {},
      pitchExecuted: false,
      normalExecuted: false,
    };
  });
}

function parseLoaderRequest(request: string): {
  path: string;
  query: string;
  ident: string | null;
} {
  const queryIndex = request.indexOf('?');
  
  if (queryIndex >= 0) {
    return {
      path: request.slice(0, queryIndex),
      query: request.slice(queryIndex),
      ident: null,
    };
  }
  
  return {
    path: request,
    query: '',
    ident: null,
  };
}
```

### 加载 Loader 模块

```typescript
function loadLoader(loaderObject: LoaderObject, callback: (err?: Error) => void): void {
  if (loaderObject.normal) {
    return callback();  // 已加载
  }
  
  try {
    const module = require(loaderObject.path);
    
    loaderObject.normal = typeof module === 'function' ? module : module.default;
    loaderObject.pitch = module.pitch;
    loaderObject.raw = module.raw || false;
    
    callback();
  } catch (err) {
    callback(err as Error);
  }
}
```

### Pitching 阶段

```typescript
function iteratePitchingLoaders(
  loaderContext: LoaderContext,
  loaders: LoaderObject[],
  result: RunLoaderResult,
  callback: (err: Error | null, result?: RunLoaderResult) => void
): void {
  // 越界检查
  if (loaderContext.loaderIndex >= loaders.length) {
    // pitching 阶段结束，读取资源
    return processResource(loaderContext, loaders, result, callback);
  }
  
  const currentLoader = loaders[loaderContext.loaderIndex];
  
  // 如果已经 pitch 过，继续下一个
  if (currentLoader.pitchExecuted) {
    loaderContext.loaderIndex++;
    return iteratePitchingLoaders(loaderContext, loaders, result, callback);
  }
  
  // 加载 Loader
  loadLoader(currentLoader, err => {
    if (err) return callback(err);
    
    const pitchFn = currentLoader.pitch;
    currentLoader.pitchExecuted = true;
    
    // 没有 pitch 函数，继续下一个
    if (!pitchFn) {
      loaderContext.loaderIndex++;
      return iteratePitchingLoaders(loaderContext, loaders, result, callback);
    }
    
    // 执行 pitch
    runPitch(
      loaderContext,
      currentLoader,
      pitchFn,
      (err, ...args) => {
        if (err) return callback(err);
        
        // pitch 返回了值，跳过后续 Loader
        const hasArg = args.some(arg => arg !== undefined);
        if (hasArg) {
          loaderContext.loaderIndex--;
          return iterateNormalLoaders(loaderContext, loaders, args, result, callback);
        }
        
        // 继续下一个 Loader 的 pitch
        loaderContext.loaderIndex++;
        iteratePitchingLoaders(loaderContext, loaders, result, callback);
      }
    );
  });
}

function runPitch(
  loaderContext: LoaderContext,
  loader: LoaderObject,
  pitchFn: Function,
  callback: LoaderCallback
): void {
  // 构建请求字符串
  const remainingRequest = loaderContext.remainingRequest;
  const previousRequest = loaderContext.previousRequest;
  
  // 准备同步/异步回调
  let isSync = true;
  let isDone = false;
  
  const innerCallback: LoaderCallback = (err, ...args) => {
    if (isDone) return;
    isDone = true;
    isSync = false;
    callback(err, ...args);
  };
  
  loaderContext.callback = innerCallback;
  loaderContext.async = () => {
    isSync = false;
    return innerCallback;
  };
  
  // 设置 data
  loaderContext.data = loader.data;
  
  try {
    const result = pitchFn.call(
      loaderContext,
      remainingRequest,
      previousRequest,
      loader.data
    );
    
    if (isSync) {
      if (result === undefined) {
        return callback(null);
      }
      return callback(null, result);
    }
  } catch (err) {
    callback(err as Error);
  }
}
```

### 读取资源

```typescript
function processResource(
  loaderContext: LoaderContext,
  loaders: LoaderObject[],
  result: RunLoaderResult,
  callback: (err: Error | null, result?: RunLoaderResult) => void
): void {
  // 添加资源依赖
  loaderContext.addDependency(loaderContext.resourcePath);
  
  // 读取资源文件
  loaderContext.readResource(loaderContext.resourcePath, (err, buffer) => {
    if (err) return callback(err);
    
    result.resourceBuffer = buffer!;
    
    // 进入 normal 阶段
    loaderContext.loaderIndex = loaders.length - 1;
    iterateNormalLoaders(
      loaderContext,
      loaders,
      [buffer],
      result,
      callback
    );
  });
}
```

### Normal 阶段

```typescript
function iterateNormalLoaders(
  loaderContext: LoaderContext,
  loaders: LoaderObject[],
  args: any[],
  result: RunLoaderResult,
  callback: (err: Error | null, result?: RunLoaderResult) => void
): void {
  // 越界检查
  if (loaderContext.loaderIndex < 0) {
    // 所有 Loader 执行完毕
    result.result = args;
    result.fileDependencies = loaderContext.getDependencies();
    result.contextDependencies = loaderContext.getContextDependencies();
    result.missingDependencies = loaderContext.getMissingDependencies();
    return callback(null, result);
  }
  
  const currentLoader = loaders[loaderContext.loaderIndex];
  
  // 如果已经执行过 normal，继续上一个
  if (currentLoader.normalExecuted) {
    loaderContext.loaderIndex--;
    return iterateNormalLoaders(loaderContext, loaders, args, result, callback);
  }
  
  // 加载 Loader
  loadLoader(currentLoader, err => {
    if (err) return callback(err);
    
    const normalFn = currentLoader.normal;
    currentLoader.normalExecuted = true;
    
    if (!normalFn) {
      loaderContext.loaderIndex--;
      return iterateNormalLoaders(loaderContext, loaders, args, result, callback);
    }
    
    // 转换输入
    const input = args[0];
    const inputBuffer = currentLoader.raw && typeof input === 'string'
      ? Buffer.from(input)
      : input;
    
    // 执行 normal
    runNormal(
      loaderContext,
      currentLoader,
      normalFn,
      [inputBuffer, ...args.slice(1)],
      (err, ...outputArgs) => {
        if (err) return callback(err);
        
        loaderContext.loaderIndex--;
        iterateNormalLoaders(
          loaderContext,
          loaders,
          outputArgs,
          result,
          callback
        );
      }
    );
  });
}

function runNormal(
  loaderContext: LoaderContext,
  loader: LoaderObject,
  normalFn: Function,
  args: any[],
  callback: LoaderCallback
): void {
  let isSync = true;
  let isDone = false;
  
  const innerCallback: LoaderCallback = (err, ...results) => {
    if (isDone) return;
    isDone = true;
    isSync = false;
    callback(err, ...results);
  };
  
  loaderContext.callback = innerCallback;
  loaderContext.async = () => {
    isSync = false;
    return innerCallback;
  };
  
  loaderContext.data = loader.data;
  
  try {
    const result = normalFn.apply(loaderContext, args);
    
    if (isSync) {
      if (result === undefined) {
        return callback(null);
      }
      
      // 处理 Promise
      if (result && typeof result.then === 'function') {
        result.then(
          (res: any) => callback(null, res),
          (err: Error) => callback(err)
        );
        return;
      }
      
      return callback(null, result);
    }
  } catch (err) {
    callback(err as Error);
  }
}
```

### 创建 LoaderContext

```typescript
function createLoaderContext(
  resourcePath: string,
  resourceQuery: string,
  resourceFragment: string,
  loaders: LoaderObject[],
  context: object,
  readResource: Function
): LoaderContext {
  const fileDependencies: string[] = [];
  const contextDependencies: string[] = [];
  const missingDependencies: string[] = [];
  let cacheable = true;
  
  const loaderContext: LoaderContext = {
    version: 2,
    
    resource: resourcePath + resourceQuery + resourceFragment,
    resourcePath,
    resourceQuery,
    resourceFragment,
    
    loaders,
    loaderIndex: 0,
    
    async: null as any,
    callback: null as any,
    
    addDependency: (file: string) => {
      fileDependencies.push(file);
    },
    dependency: (file: string) => {
      fileDependencies.push(file);
    },
    addContextDependency: (dir: string) => {
      contextDependencies.push(dir);
    },
    addMissingDependency: (file: string) => {
      missingDependencies.push(file);
    },
    getDependencies: () => fileDependencies,
    getContextDependencies: () => contextDependencies,
    getMissingDependencies: () => missingDependencies,
    clearDependencies: () => {
      fileDependencies.length = 0;
      contextDependencies.length = 0;
      missingDependencies.length = 0;
    },
    
    cacheable: (flag = true) => {
      cacheable = cacheable && flag;
    },
    
    emitFile: () => {},
    resolve: () => {},
    
    getOptions: () => {
      const loader = loaders[loaderContext.loaderIndex];
      return loader.options || {};
    },
    
    data: {},
    
    get request() {
      return loaders
        .map(l => l.path + (l.query || ''))
        .concat([resourcePath + resourceQuery + resourceFragment])
        .join('!');
    },
    
    get remainingRequest() {
      return loaders
        .slice(loaderContext.loaderIndex + 1)
        .map(l => l.path + (l.query || ''))
        .concat([resourcePath + resourceQuery + resourceFragment])
        .join('!');
    },
    
    get currentRequest() {
      return loaders
        .slice(loaderContext.loaderIndex)
        .map(l => l.path + (l.query || ''))
        .concat([resourcePath + resourceQuery + resourceFragment])
        .join('!');
    },
    
    get previousRequest() {
      return loaders
        .slice(0, loaderContext.loaderIndex)
        .map(l => l.path + (l.query || ''))
        .join('!');
    },
    
    get query() {
      const loader = loaders[loaderContext.loaderIndex];
      return loader.options || loader.query;
    },
    
    readResource,
    
    ...context,
  };
  
  return loaderContext;
}
```

## 总结

LoaderRunner 的核心机制：

**两阶段执行**：
- Pitch 阶段：从左到右
- Normal 阶段：从右到左

**关键特性**：
- 支持同步和异步 Loader
- 支持 raw Loader（处理 Buffer）
- 支持 pitch 阶段跳过后续 Loader

**依赖追踪**：
- 文件依赖
- 目录依赖
- 缺失依赖

**下一章**：我们将深入 Loader 执行上下文。
