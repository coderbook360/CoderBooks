---
sidebar_position: 35
title: "NormalModule 实现：普通模块"
---

# NormalModule 实现：普通模块

NormalModule 是 Webpack 中最核心的模块类型，对应磁盘上的一个具体文件。无论是 JavaScript、TypeScript、CSS 还是其他资源，只要来自文件系统，都会被创建为 NormalModule。

## NormalModule 的职责

NormalModule 需要处理：

1. **文件读取**：从磁盘加载源码
2. **Loader 执行**：应用 Loader 链转换内容
3. **依赖分析**：使用 Parser 解析并提取依赖
4. **代码生成**：使用 Generator 输出最终代码

整个流程可以概括为：

```
源文件 → Loader 链 → Parser 解析 → 依赖列表 → Generator → 输出代码
```

## 类设计

### 核心属性

```typescript
import { Module, BuildInfo } from './Module';
import type { Source } from 'webpack-sources';
import type { LoaderContext } from './LoaderContext';

export class NormalModule extends Module {
  // ========== 文件信息 ==========
  
  /**
   * 模块请求路径（完整的 loader!resource 格式）
   */
  request: string;
  
  /**
   * 用户请求路径（原始的 import/require 路径）
   */
  userRequest: string;
  
  /**
   * 原始请求（未解析的请求）
   */
  rawRequest: string;
  
  /**
   * 资源文件的绝对路径
   */
  resource: string;
  
  /**
   * 资源查询字符串（?xxx）
   */
  resourceQuery: string;
  
  /**
   * 资源片段（#xxx）
   */
  resourceFragment: string;
  
  // ========== Loader 相关 ==========
  
  /**
   * Loader 列表（从右到左执行）
   */
  loaders: LoaderItem[];
  
  /**
   * 匹配的规则
   */
  matchResource: string | null = null;
  
  // ========== 解析相关 ==========
  
  /**
   * Parser 实例
   */
  parser: Parser;
  
  /**
   * Generator 实例
   */
  generator: Generator;
  
  /**
   * 解析选项
   */
  parserOptions: Record<string, any>;
  
  /**
   * 生成选项
   */
  generatorOptions: Record<string, any>;
  
  // ========== 构建结果 ==========
  
  /**
   * 经过 Loader 处理后的源码
   */
  private _source: Source | null = null;
  
  /**
   * AST（可选缓存）
   */
  private _ast: any = null;
  
  constructor(options: NormalModuleOptions) {
    super(options.type, options.context);
    
    this.request = options.request;
    this.userRequest = options.userRequest;
    this.rawRequest = options.rawRequest;
    this.resource = options.resource;
    this.resourceQuery = options.resourceQuery || '';
    this.resourceFragment = options.resourceFragment || '';
    
    this.loaders = options.loaders;
    this.parser = options.parser;
    this.generator = options.generator;
    this.parserOptions = options.parserOptions || {};
    this.generatorOptions = options.generatorOptions || {};
  }
}

interface NormalModuleOptions {
  type: string;
  context: string;
  request: string;
  userRequest: string;
  rawRequest: string;
  resource: string;
  resourceQuery?: string;
  resourceFragment?: string;
  loaders: LoaderItem[];
  parser: Parser;
  generator: Generator;
  parserOptions?: Record<string, any>;
  generatorOptions?: Record<string, any>;
}

interface LoaderItem {
  loader: string;       // Loader 的绝对路径
  options: any;         // Loader 配置
  ident?: string;       // Loader 唯一标识
  type?: string;        // Loader 类型
}
```

### 请求路径详解

```typescript
// 原始代码
import utils from './utils?foo=bar#section';

// 各字段的值
rawRequest: './utils?foo=bar#section'      // 原始请求
userRequest: '/project/src/utils.js?foo=bar#section'  // 解析后的路径
resource: '/project/src/utils.js'          // 资源文件路径
resourceQuery: '?foo=bar'                  // 查询字符串
resourceFragment: '#section'               // 片段标识

// 如果有 Loader
request: '/path/to/babel-loader!/project/src/utils.js?foo=bar#section'
```

## 实现 identifier 方法

```typescript
export class NormalModule extends Module {
  /**
   * 模块唯一标识符
   * 格式：type|loaders|resource
   */
  identifier(): string {
    let result = this.type;
    
    // 添加 layer
    if (this.layer) {
      result += `|${this.layer}`;
    }
    
    // 添加 loaders
    for (const loader of this.loaders) {
      result += `|${loader.loader}`;
      if (loader.options) {
        result += `?${typeof loader.options === 'string' 
          ? loader.options 
          : JSON.stringify(loader.options)}`;
      }
    }
    
    // 添加资源路径
    result += `|${this.resource}`;
    result += this.resourceQuery;
    result += this.resourceFragment;
    
    return result;
  }
  
  /**
   * 可读标识符
   */
  readableIdentifier(requestShortener: RequestShortener): string {
    return requestShortener.shorten(this.userRequest);
  }
}
```

**为什么 identifier 包含 loaders？**

同一个文件用不同的 loader 处理，结果完全不同：

```javascript
// 这两个是不同的模块
import styles from './style.css';              // css-loader
import styleUrl from '!url-loader!./style.css'; // url-loader
```

## 实现 build 方法

build 是 NormalModule 的核心，完成整个构建流程：

```typescript
export class NormalModule extends Module {
  /**
   * 构建模块
   * 流程：读取文件 → 执行 Loaders → 解析依赖
   */
  build(
    options: WebpackOptions,
    compilation: Compilation,
    resolver: Resolver,
    fs: InputFileSystem,
    callback: (err?: Error | null) => void
  ): void {
    // 重置构建状态
    this.buildMeta = {};
    this.buildInfo = {
      strict: undefined,
      cacheable: true,
      parsed: true,
      hash: undefined,
      assets: undefined,
      fileDependencies: new Set(),
      contextDependencies: new Set(),
      missingDependencies: new Set(),
      buildDependencies: new Set(),
    };
    
    // 清除之前的依赖
    this.clearDependenciesAndBlocks();
    
    // 执行 Loader 和解析
    this.doBuild(options, compilation, resolver, fs, (err) => {
      if (err) {
        return callback(err);
      }
      
      // 解析成功后的处理
      this._initBuildHash(compilation);
      callback();
    });
  }
  
  /**
   * 执行构建：Loader + Parser
   */
  private doBuild(
    options: WebpackOptions,
    compilation: Compilation,
    resolver: Resolver,
    fs: InputFileSystem,
    callback: (err?: Error | null) => void
  ): void {
    // 创建 Loader 上下文
    const loaderContext = this.createLoaderContext(
      compilation,
      resolver,
      fs,
      options
    );
    
    // 执行 Loader 链
    runLoaders(
      {
        resource: this.resource + this.resourceQuery + this.resourceFragment,
        loaders: this.loaders,
        context: loaderContext,
        readResource: (resource, callback) => {
          fs.readFile(resource, callback);
        },
      },
      (err, result) => {
        if (err) {
          return callback(err);
        }
        
        // Loader 执行结果
        const source = result.result[0];  // 转换后的内容
        const sourceMap = result.result[1];  // SourceMap
        const ast = result.result[2];  // 可选的 AST
        
        // 记录文件依赖（用于 watch 模式）
        for (const fileDependency of result.fileDependencies) {
          this.buildInfo.fileDependencies!.add(fileDependency);
        }
        
        for (const contextDependency of result.contextDependencies) {
          this.buildInfo.contextDependencies!.add(contextDependency);
        }
        
        for (const missingDependency of result.missingDependencies) {
          this.buildInfo.missingDependencies!.add(missingDependency);
        }
        
        // 设置缓存标志
        this.buildInfo.cacheable = result.cacheable;
        
        // 处理 Loader 返回的内容
        this.processResult(source, sourceMap, ast, callback);
      }
    );
  }
  
  /**
   * 处理 Loader 结果，执行 Parser
   */
  private processResult(
    source: string | Buffer,
    sourceMap: any,
    ast: any,
    callback: (err?: Error | null) => void
  ): void {
    // 转换为字符串
    const sourceStr = typeof source === 'string' 
      ? source 
      : source.toString('utf-8');
    
    // 创建 Source 对象
    if (sourceMap) {
      this._source = new SourceMapSource(
        sourceStr,
        this.userRequest,
        sourceMap
      );
    } else {
      this._source = new RawSource(sourceStr);
    }
    
    // 缓存 AST（如果 Loader 提供了）
    this._ast = ast;
    
    // 使用 Parser 解析依赖
    try {
      const result = this.parser.parse(
        this._ast || sourceStr,
        {
          module: this,
          compilation: this.compilation,
          source: sourceStr,
        }
      );
      
      // Parser 可能返回新的 AST
      if (result !== undefined) {
        this._ast = result;
      }
      
      callback();
    } catch (err) {
      callback(err as Error);
    }
  }
}
```

## Loader 上下文

```typescript
export class NormalModule extends Module {
  /**
   * 创建 Loader 执行上下文
   */
  private createLoaderContext(
    compilation: Compilation,
    resolver: Resolver,
    fs: InputFileSystem,
    options: WebpackOptions
  ): LoaderContext {
    const loaderContext: LoaderContext = {
      // 基础信息
      version: 2,
      context: this.context!,
      rootContext: options.context,
      
      // 资源信息
      resource: this.resource,
      resourcePath: this.resource,
      resourceQuery: this.resourceQuery,
      resourceFragment: this.resourceFragment,
      
      // 模块信息
      target: options.target,
      mode: options.mode,
      sourceMap: options.devtool !== false,
      
      // 解析方法
      resolve: (context, request, callback) => {
        resolver.resolve({}, context, request, {}, callback);
      },
      
      // 文件系统
      fs: fs,
      
      // 添加依赖
      addDependency: (file) => {
        this.buildInfo.fileDependencies!.add(file);
      },
      
      addContextDependency: (context) => {
        this.buildInfo.contextDependencies!.add(context);
      },
      
      addMissingDependency: (missing) => {
        this.buildInfo.missingDependencies!.add(missing);
      },
      
      // 添加构建依赖
      addBuildDependency: (file) => {
        this.buildInfo.buildDependencies!.add(file);
      },
      
      // 异步标记
      async: function() {
        return this.callback;
      },
      
      callback: null as any,  // 由 loader-runner 填充
      
      // Emit 文件
      emitFile: (name, content, sourceMap, assetInfo) => {
        if (!this.buildInfo.assets) {
          this.buildInfo.assets = {};
        }
        this.buildInfo.assets[name] = {
          source: createSource(content, sourceMap),
          info: assetInfo,
        };
      },
      
      // 获取 Logger
      getLogger: (name) => {
        return compilation.getLogger(`webpack.${name || 'Loader'}`);
      },
      
      // Webpack 特有的方法
      _module: this,
      _compilation: compilation,
      _compiler: compilation.compiler,
    };
    
    return loaderContext;
  }
}
```

## 实现 source 方法

```typescript
export class NormalModule extends Module {
  /**
   * 生成模块代码
   */
  source(
    dependencyTemplates: Map<Function, DependencyTemplate>,
    runtimeTemplate: RuntimeTemplate,
    type: string = 'javascript'
  ): Source {
    // 使用 Generator 生成代码
    return this.generator.generate(this, {
      dependencyTemplates,
      runtimeTemplate,
      moduleGraph: runtimeTemplate.compilation.moduleGraph,
      chunkGraph: runtimeTemplate.compilation.chunkGraph,
      type,
    });
  }
  
  /**
   * 获取原始源码
   */
  originalSource(): Source | null {
    return this._source;
  }
  
  /**
   * 获取模块大小
   */
  size(type?: string): number {
    const source = this._source;
    if (!source) {
      return 0;
    }
    return source.size();
  }
}
```

## 实现 needRebuild 方法

```typescript
export class NormalModule extends Module {
  /**
   * 检查模块是否需要重新构建
   */
  needRebuild(
    fileTimestamps: Map<string, number>,
    contextTimestamps: Map<string, number>
  ): boolean {
    // 如果不可缓存，总是需要重建
    if (!this.buildInfo.cacheable) {
      return true;
    }
    
    // 检查文件依赖
    const fileDependencies = this.buildInfo.fileDependencies;
    if (fileDependencies) {
      for (const file of fileDependencies) {
        const timestamp = fileTimestamps.get(file);
        // 如果文件不存在或时间戳更新，需要重建
        if (!timestamp || timestamp > this.buildInfo.buildTimestamp!) {
          return true;
        }
      }
    }
    
    // 检查目录依赖
    const contextDependencies = this.buildInfo.contextDependencies;
    if (contextDependencies) {
      for (const context of contextDependencies) {
        const timestamp = contextTimestamps.get(context);
        if (!timestamp || timestamp > this.buildInfo.buildTimestamp!) {
          return true;
        }
      }
    }
    
    return false;
  }
}
```

## 完整实现

创建 `src/NormalModule.ts`：

```typescript
import { Module, BuildInfo, UpdateHashContext } from './Module';
import { RawSource, SourceMapSource, Source } from 'webpack-sources';
import { runLoaders } from 'loader-runner';
import type { Hash } from './util/Hash';
import type { Compilation } from './Compilation';
import type { Resolver } from './Resolver';
import type { InputFileSystem } from './util/fs';
import type { RequestShortener } from './RequestShortener';

export interface NormalModuleOptions {
  type: string;
  context: string;
  layer?: string | null;
  request: string;
  userRequest: string;
  rawRequest: string;
  resource: string;
  resourceQuery?: string;
  resourceFragment?: string;
  matchResource?: string | null;
  loaders: LoaderItem[];
  parser: Parser;
  generator: Generator;
  parserOptions?: Record<string, any>;
  generatorOptions?: Record<string, any>;
}

export interface LoaderItem {
  loader: string;
  options: any;
  ident?: string;
  type?: string;
}

export class NormalModule extends Module {
  request: string;
  userRequest: string;
  rawRequest: string;
  resource: string;
  resourceQuery: string;
  resourceFragment: string;
  matchResource: string | null;
  loaders: LoaderItem[];
  parser: Parser;
  generator: Generator;
  parserOptions: Record<string, any>;
  generatorOptions: Record<string, any>;
  
  private _source: Source | null = null;
  private _ast: any = null;
  private _buildTimestamp: number | undefined;
  
  constructor(options: NormalModuleOptions) {
    super(options.type, options.context);
    
    this.layer = options.layer || null;
    this.request = options.request;
    this.userRequest = options.userRequest;
    this.rawRequest = options.rawRequest;
    this.resource = options.resource;
    this.resourceQuery = options.resourceQuery || '';
    this.resourceFragment = options.resourceFragment || '';
    this.matchResource = options.matchResource || null;
    this.loaders = options.loaders;
    this.parser = options.parser;
    this.generator = options.generator;
    this.parserOptions = options.parserOptions || {};
    this.generatorOptions = options.generatorOptions || {};
  }
  
  identifier(): string {
    let id = this.type;
    if (this.layer) id += `|${this.layer}`;
    for (const loader of this.loaders) {
      id += `|${loader.loader}`;
    }
    id += `|${this.resource}${this.resourceQuery}${this.resourceFragment}`;
    return id;
  }
  
  readableIdentifier(requestShortener: RequestShortener): string {
    return requestShortener.shorten(this.userRequest);
  }
  
  // build, doBuild, processResult, source, size, needRebuild
  // ... 如上所述
}
```

## 总结

NormalModule 是 Webpack 模块系统的核心：

**构建流程**：
```
资源文件 → Loader 链处理 → Parser 解析 → 依赖列表 → Generator 生成代码
```

**关键设计**：
1. **请求路径分离**：区分 request、userRequest、resource
2. **Loader 上下文**：为 Loader 提供丰富的 API
3. **增量构建**：通过依赖追踪实现高效的 watch 模式
4. **可缓存性**：支持持久化缓存

下一章我们将讨论模块类型系统（ModuleType）的设计。
