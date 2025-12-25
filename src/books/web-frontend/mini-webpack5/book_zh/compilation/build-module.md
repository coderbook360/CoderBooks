---
sidebar_position: 32
title: "buildModule 方法：模块构建"
---

# buildModule 方法：模块构建

模块被创建（factorize）后，下一步是构建（build）。构建过程读取源码、运行 Loaders、解析 AST、提取依赖——这是 Webpack 理解你代码的核心环节。

## 构建的核心任务

```
          Module（空壳）
              │
              ▼
    ┌──────────────────────┐
    │     buildModule      │
    │                      │
    │  1. 读取源文件        │
    │  2. 运行 Loaders      │
    │  3. 解析 AST          │
    │  4. 提取依赖          │
    │  5. 生成 Source       │
    │                      │
    └──────────┬───────────┘
              │
              ▼
       Module（已构建）
       - source: 转换后的代码
       - dependencies: 依赖列表
       - buildInfo: 构建信息
```

一个刚创建的模块只有基本信息（路径、loaders 等）。构建完成后，模块获得：

- **source**：经过 Loaders 转换的代码
- **dependencies**：代码中的依赖（import/require）
- **buildInfo**：构建元信息（hash、时间戳等）

## NormalModule 的 build 方法

构建逻辑主要在 NormalModule 中实现：

```typescript
export interface BuildInfo {
  /** 是否需要缓存 */
  cacheable: boolean;
  /** 文件依赖（用于 watch） */
  fileDependencies: Set<string>;
  /** 上下文依赖 */
  contextDependencies: Set<string>;
  /** 缺失的依赖 */
  missingDependencies: Set<string>;
  /** 构建时的文件哈希 */
  hash?: string;
  /** 是否有副作用 */
  sideEffectFree?: boolean;
}

export interface BuildMeta {
  /** 模块类型 */
  type?: string;
  /** 是否是严格模式 */
  strictHarmonyModule?: boolean;
  /** 导出模式 */
  exportsType?: 'namespace' | 'default-with-named' | 'default-only';
}

export class NormalModule extends Module {
  // 基本属性
  resource: string;
  loaders: LoaderItem[];
  parser: Parser;
  generator: Generator;
  
  // 构建结果
  private _source: Source | null = null;
  private _ast: any = null;
  buildInfo: BuildInfo | null = null;
  buildMeta: BuildMeta | null = null;
  
  /**
   * 构建模块
   */
  build(
    options: WebpackOptions,
    compilation: Compilation,
    resolver: Resolver,
    fs: InputFileSystem,
    callback: (err?: Error) => void
  ): void {
    // 初始化构建信息
    this.buildInfo = {
      cacheable: true,
      fileDependencies: new Set(),
      contextDependencies: new Set(),
      missingDependencies: new Set(),
    };
    this.buildMeta = {};
    
    // 清空之前的依赖
    this.dependencies.length = 0;
    this.blocks.length = 0;
    
    // 执行 Loaders
    this.doBuild(options, compilation, resolver, fs, (err) => {
      if (err) {
        return callback(err);
      }
      
      // 解析转换后的代码
      try {
        this.parseSource(compilation);
        callback();
      } catch (e) {
        callback(e as Error);
      }
    });
  }
  
  /**
   * 执行 Loaders
   */
  private doBuild(
    options: WebpackOptions,
    compilation: Compilation,
    resolver: Resolver,
    fs: InputFileSystem,
    callback: (err?: Error) => void
  ): void {
    // 创建 Loader 上下文
    const loaderContext = this.createLoaderContext(
      compilation,
      resolver,
      fs
    );
    
    // 运行 loader-runner
    runLoaders(
      {
        resource: this.resource,
        loaders: this.loaders,
        context: loaderContext,
        readResource: fs.readFile.bind(fs),
      },
      (err, result) => {
        if (err) {
          return callback(err);
        }
        
        // 保存转换结果
        const source = result.result![0];
        const sourceMap = result.result![1];
        
        // 处理源码
        if (Buffer.isBuffer(source)) {
          this._source = new RawSource(source);
        } else {
          this._source = sourceMap
            ? new SourceMapSource(source, this.resource, sourceMap)
            : new RawSource(source);
        }
        
        // 记录文件依赖
        for (const dep of result.fileDependencies || []) {
          this.buildInfo!.fileDependencies.add(dep);
        }
        
        // 记录缓存状态
        this.buildInfo!.cacheable = result.cacheable !== false;
        
        callback();
      }
    );
  }
  
  /**
   * 解析源码
   */
  private parseSource(compilation: Compilation): void {
    const source = this._source!.source();
    const sourceStr = typeof source === 'string' 
      ? source 
      : source.toString();
    
    // 使用 Parser 解析
    const ast = this.parser.parse(sourceStr, {
      module: this,
      compilation,
    });
    
    // 保存 AST（可选）
    this._ast = ast;
    
    // Parser 会在解析过程中收集依赖
    // 依赖被添加到 this.dependencies 和 this.blocks
  }
}
```

## Compilation 的 buildModule 方法

Compilation 包装了模块的 build 调用：

```typescript
export class Compilation {
  /**
   * 构建模块
   */
  buildModule(
    module: Module,
    callback: (err?: Error) => void
  ): void {
    // 触发构建开始钩子
    this.hooks.buildModule.call(module);
    
    // 调用模块的 build 方法
    module.build(
      this.options,
      this,
      this.compiler.resolverFactory.get('normal'),
      this.inputFileSystem,
      (err) => {
        if (err) {
          // 构建失败
          this.hooks.failedModule.call(module, err);
          return callback(err);
        }
        
        // 构建成功
        this.hooks.succeedModule.call(module);
        callback();
      }
    );
  }
}
```

## 使用构建队列

为了并行构建，使用队列管理：

```typescript
export class Compilation {
  private buildQueue: AsyncQueue<Module, Module>;
  
  constructor(compiler: Compiler, params: CompilationParams) {
    this.buildQueue = new AsyncQueue({
      name: 'build',
      parallelism: 100,
      getKey: (module) => module.identifier(),
      processor: this._buildModule.bind(this),
    });
  }
  
  private _buildModule(
    module: Module,
    callback: (err?: Error, module?: Module) => void
  ): void {
    // 检查缓存
    const cacheEntry = this.cache.getModuleCache(module);
    if (cacheEntry && this.isModuleUnchanged(module, cacheEntry)) {
      // 使用缓存
      this.restoreModuleFromCache(module, cacheEntry);
      return callback(undefined, module);
    }
    
    // 执行构建
    this.hooks.buildModule.call(module);
    
    module.build(
      this.options,
      this,
      this.resolverFactory.get('normal'),
      this.inputFileSystem,
      (err) => {
        if (err) {
          this.hooks.failedModule.call(module, err);
          return callback(err);
        }
        
        // 保存到缓存
        this.cache.storeModuleCache(module);
        
        this.hooks.succeedModule.call(module);
        callback(undefined, module);
      }
    );
  }
  
  /**
   * 公开的构建方法（使用队列）
   */
  buildModule(
    module: Module,
    callback: (err?: Error) => void
  ): void {
    this.buildQueue.add(module, (err) => callback(err));
  }
}
```

## Loader Context 创建

Loaders 通过 context 访问 Webpack 提供的功能：

```typescript
class NormalModule {
  createLoaderContext(
    compilation: Compilation,
    resolver: Resolver,
    fs: InputFileSystem
  ): LoaderContext {
    const { compiler } = compilation;
    
    return {
      // 基本信息
      version: 2,
      resource: this.resource,
      resourcePath: this.resource.split('?')[0],
      resourceQuery: this.resource.includes('?') 
        ? '?' + this.resource.split('?')[1] 
        : '',
      
      // 上下文
      context: path.dirname(this.resource),
      rootContext: compiler.context,
      
      // 文件系统
      fs,
      
      // 模块解析
      resolve: (context: string, request: string, callback: ResolveCallback) => {
        resolver.resolve({}, context, request, {}, callback);
      },
      
      // 获取依赖
      getResolve: (options?: ResolveOptions) => {
        return (context: string, request: string, callback: ResolveCallback) => {
          const childResolver = compiler.resolverFactory.get('normal', options);
          childResolver.resolve({}, context, request, {}, callback);
        };
      },
      
      // 添加依赖
      addDependency: (file: string) => {
        this.buildInfo!.fileDependencies.add(file);
      },
      addContextDependency: (dir: string) => {
        this.buildInfo!.contextDependencies.add(dir);
      },
      addMissingDependency: (file: string) => {
        this.buildInfo!.missingDependencies.add(file);
      },
      
      // 缓存控制
      cacheable: (flag = true) => {
        this.buildInfo!.cacheable = this.buildInfo!.cacheable && flag;
      },
      
      // 发射文件
      emitFile: (name: string, content: Buffer | string, sourceMap?: any) => {
        compilation.emitAsset(name, 
          sourceMap 
            ? new SourceMapSource(content, name, sourceMap)
            : new RawSource(content)
        );
      },
      
      // 发射警告和错误
      emitWarning: (warning: Error) => {
        compilation.warnings.push(warning);
      },
      emitError: (error: Error) => {
        compilation.errors.push(error);
      },
      
      // Webpack 配置
      mode: compiler.options.mode,
      target: compiler.options.target,
      sourceMap: !!compiler.options.devtool,
      
      // 异步标记
      async: () => {
        // 标记 loader 为异步
        return this.createAsyncCallback();
      },
      
      // 获取 options
      getOptions: (schema?: any) => {
        const loaderIndex = this.loaders.indexOf(this.currentLoader);
        const options = this.loaders[loaderIndex]?.options ?? {};
        
        if (schema) {
          // 验证 options
          validateOptions(schema, options, { name: this.currentLoader.loader });
        }
        
        return options;
      },
    };
  }
}
```

## Parser 解析

构建过程中，Parser 负责解析代码并提取依赖：

```typescript
export class JavascriptParser {
  hooks = {
    // 语句钩子
    import: new HookMap(() => new SyncBailHook(['statement', 'source'])),
    export: new SyncBailHook(['statement']),
    call: new HookMap(() => new SyncBailHook(['expression'])),
    
    // 表达式钩子
    expression: new HookMap(() => new SyncBailHook(['expression'])),
    evaluate: new HookMap(() => new SyncBailHook(['expression'])),
  };
  
  parse(source: string, options: ParserOptions): ast.Program {
    // 使用 acorn 解析
    const ast = acorn.parse(source, {
      ecmaVersion: 'latest',
      sourceType: 'module',
      locations: true,
    });
    
    // 设置当前模块
    this.state = {
      module: options.module,
      compilation: options.compilation,
      current: options.module,
    };
    
    // 遍历 AST
    this.walkProgram(ast);
    
    return ast;
  }
  
  private walkProgram(ast: ast.Program): void {
    for (const statement of ast.body) {
      this.walkStatement(statement);
    }
  }
  
  private walkStatement(statement: ast.Statement): void {
    switch (statement.type) {
      case 'ImportDeclaration':
        this.walkImportDeclaration(statement);
        break;
      case 'ExportNamedDeclaration':
      case 'ExportDefaultDeclaration':
      case 'ExportAllDeclaration':
        this.walkExportDeclaration(statement);
        break;
      case 'ExpressionStatement':
        this.walkExpression(statement.expression);
        break;
      // ... 其他语句类型
    }
  }
  
  private walkImportDeclaration(statement: ast.ImportDeclaration): void {
    const source = statement.source.value as string;
    
    // 触发 import 钩子
    const hook = this.hooks.import.get(source);
    if (hook?.call(statement, source) === true) {
      return; // 钩子已处理
    }
    
    // 创建导入依赖
    const dep = new HarmonyImportSideEffectDependency(source);
    dep.loc = statement.loc;
    this.state.module.addDependency(dep);
    
    // 处理具名导入
    for (const specifier of statement.specifiers) {
      if (specifier.type === 'ImportSpecifier') {
        const dep = new HarmonyImportSpecifierDependency(
          source,
          specifier.imported.name,
          specifier.local.name
        );
        this.state.module.addDependency(dep);
      }
    }
  }
  
  private walkExpression(expression: ast.Expression): void {
    switch (expression.type) {
      case 'CallExpression':
        this.walkCallExpression(expression);
        break;
      // ... 其他表达式类型
    }
  }
  
  private walkCallExpression(expression: ast.CallExpression): void {
    // 检查是否是 require() 调用
    if (
      expression.callee.type === 'Identifier' &&
      expression.callee.name === 'require'
    ) {
      const arg = expression.arguments[0];
      if (arg?.type === 'Literal' && typeof arg.value === 'string') {
        const dep = new CommonJsRequireDependency(arg.value);
        dep.loc = expression.loc;
        this.state.module.addDependency(dep);
      }
    }
    
    // 检查是否是动态 import()
    if (expression.callee.type === 'Import') {
      const arg = expression.arguments[0];
      if (arg?.type === 'Literal' && typeof arg.value === 'string') {
        const dep = new ImportDependency(arg.value);
        dep.loc = expression.loc;
        
        // 动态导入创建异步块
        const block = new AsyncDependenciesBlock(null, dep.loc);
        block.addDependency(dep);
        this.state.module.addBlock(block);
      }
    }
  }
}
```

## 构建错误处理

构建失败时的错误处理：

```typescript
export class Compilation {
  private _buildModule(
    module: Module,
    callback: (err?: Error, module?: Module) => void
  ): void {
    this.hooks.buildModule.call(module);
    
    module.build(
      this.options,
      this,
      this.resolverFactory.get('normal'),
      this.inputFileSystem,
      (err) => {
        if (err) {
          // 包装错误
          const buildError = new ModuleBuildError(module, err);
          
          // 添加到模块错误
          module.addError(buildError);
          
          this.hooks.failedModule.call(module, buildError);
          
          // 如果配置了 bail，直接返回错误
          if (this.bail) {
            return callback(buildError);
          }
          
          // 否则标记模块有错误，但继续构建其他模块
          return callback();
        }
        
        this.hooks.succeedModule.call(module);
        callback(undefined, module);
      }
    );
  }
}

class ModuleBuildError extends Error {
  constructor(public module: Module, public originalError: Error) {
    super(
      `Module build failed: ${module.identifier()}\n${originalError.message}`
    );
    this.name = 'ModuleBuildError';
  }
}
```

## 构建缓存

Webpack 5 支持持久化缓存：

```typescript
export class Compilation {
  /**
   * 检查模块是否可以使用缓存
   */
  private isModuleUnchanged(module: Module, cache: ModuleCache): boolean {
    // 检查文件是否变化
    const buildInfo = cache.buildInfo;
    
    for (const file of buildInfo.fileDependencies) {
      const currentHash = this.getFileHash(file);
      const cachedHash = cache.fileHashes.get(file);
      
      if (currentHash !== cachedHash) {
        return false;
      }
    }
    
    return true;
  }
  
  /**
   * 从缓存恢复模块
   */
  private restoreModuleFromCache(module: Module, cache: ModuleCache): void {
    // 恢复构建信息
    module.buildInfo = cache.buildInfo;
    module.buildMeta = cache.buildMeta;
    
    // 恢复依赖
    for (const dep of cache.dependencies) {
      module.addDependency(this.deserializeDependency(dep));
    }
    
    // 恢复源码
    module._source = cache.source;
  }
}
```

## 完整构建流程

```
              NormalModule.build()
                      │
                      ▼
    ┌─────────────────────────────────────┐
    │           初始化构建信息              │
    │  - buildInfo: { cacheable, ... }    │
    │  - 清空 dependencies                 │
    └─────────────────┬───────────────────┘
                      │
                      ▼
    ┌─────────────────────────────────────┐
    │             doBuild()                │
    │  - 创建 Loader Context              │
    │  - 运行 loader-runner               │
    │  - 保存转换后的源码                  │
    └─────────────────┬───────────────────┘
                      │
                      ▼
    ┌─────────────────────────────────────┐
    │           parseSource()              │
    │  - 使用 Parser 解析 AST             │
    │  - 遍历 AST 节点                    │
    │  - 触发相应钩子                      │
    │  - 创建 Dependency 对象              │
    └─────────────────┬───────────────────┘
                      │
                      ▼
                 构建完成
           module.dependencies 已填充
```

## 小结

buildModule 是 Webpack 理解代码的核心环节。理解它，你就理解了 Webpack 如何将源文件转换为可分析的模块。

关键要点：

1. **Loader 执行**：通过 loader-runner 运行 Loaders
2. **源码解析**：Parser 解析 AST，提取依赖
3. **依赖收集**：import/require 被转换为 Dependency 对象
4. **并行构建**：使用队列并行处理多个模块
5. **缓存支持**：持久化缓存加速重复构建

下一节，我们将学习 processModuleDependencies——如何递归处理模块的依赖。
