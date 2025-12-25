---
sidebar_position: 23
title: "createCompilation 方法实现"
---

# createCompilation 方法实现

Compilation 是每次构建的核心对象，负责模块的构建、依赖分析和代码生成。本章详细分析 Compilation 的创建过程。

## Compilation 在架构中的角色

```
Compiler（编译器）
    │
    │ 每次构建创建新的
    ↓
Compilation（编译过程）
    │
    ├─→ 模块工厂（ModuleFactory）
    │       │
    │       └─→ 创建 Module 实例
    │
    ├─→ 模块图（ModuleGraph）
    │       │
    │       └─→ 记录模块间依赖关系
    │
    └─→ 代码块图（ChunkGraph）
            │
            └─→ 记录 Chunk 与 Module 的关系
```

**关键区别**：
- **Compiler**：整个构建生命周期只有一个
- **Compilation**：每次构建（包括 watch 重新构建）创建新的

## 创建流程

### newCompilation 方法

```typescript
class Compiler {
  createCompilation(): Compilation {
    return new Compilation(this)
  }
  
  newCompilation(params: CompilationParams): Compilation {
    // 1. 创建 Compilation 实例
    const compilation = this.createCompilation()
    
    // 2. 设置参数
    compilation.params = params
    compilation.name = this.name
    
    // 3. 设置文件时间戳（增量构建）
    compilation.fileTimestamps = this.inputFileSystem.fileTimestamps
    compilation.directoryTimestamps = this.inputFileSystem.directoryTimestamps
    
    // 4. 触发 thisCompilation 钩子
    // 仅当前编译器触发，子编译器不触发
    this.hooks.thisCompilation.call(compilation, params)
    
    // 5. 触发 compilation 钩子
    // 当前编译器和子编译器都触发
    this.hooks.compilation.call(compilation, params)
    
    return compilation
  }
}
```

### CompilationParams 结构

```typescript
interface CompilationParams {
  // 普通模块工厂
  normalModuleFactory: NormalModuleFactory
  
  // 上下文模块工厂（处理 require.context）
  contextModuleFactory: ContextModuleFactory
}

class Compiler {
  newCompilationParams(): CompilationParams {
    const params: CompilationParams = {
      normalModuleFactory: this.createNormalModuleFactory(),
      contextModuleFactory: this.createContextModuleFactory()
    }
    
    // 触发工厂钩子
    this.hooks.normalModuleFactory.call(params.normalModuleFactory)
    this.hooks.contextModuleFactory.call(params.contextModuleFactory)
    
    return params
  }
  
  createNormalModuleFactory(): NormalModuleFactory {
    return new NormalModuleFactory({
      context: this.options.context,
      fs: this.inputFileSystem,
      resolverFactory: this.resolverFactory,
      options: this.options.module,
      associatedObjectForCache: this.cache
    })
  }
  
  createContextModuleFactory(): ContextModuleFactory {
    return new ContextModuleFactory(this.resolverFactory)
  }
}
```

## Compilation 类结构

### 核心属性

```typescript
class Compilation {
  // 关联的编译器
  compiler: Compiler
  
  // 配置选项
  options: WebpackOptions
  
  // 模块工厂
  params: CompilationParams
  
  // 模块相关
  modules: Set<Module>           // 所有模块
  chunks: Set<Chunk>             // 所有代码块
  assets: Record<string, Source> // 输出资源
  
  // 依赖图
  moduleGraph: ModuleGraph       // 模块依赖图
  chunkGraph: ChunkGraph         // 代码块依赖图
  
  // 入口
  entries: Map<string, EntryData>
  
  // 文件依赖
  fileDependencies: Set<string>
  contextDependencies: Set<string>
  missingDependencies: Set<string>
  
  // 构建结果
  errors: WebpackError[]
  warnings: WebpackError[]
  
  // 钩子
  hooks: CompilationHooks
  
  constructor(compiler: Compiler) {
    this.compiler = compiler
    this.options = compiler.options
    this.hooks = this.createHooks()
    
    // 初始化
    this.modules = new Set()
    this.chunks = new Set()
    this.assets = {}
    this.entries = new Map()
    
    this.moduleGraph = new ModuleGraph()
    this.chunkGraph = new ChunkGraph()
    
    this.errors = []
    this.warnings = []
    
    this.fileDependencies = new Set()
    this.contextDependencies = new Set()
    this.missingDependencies = new Set()
  }
}
```

### 钩子体系

```typescript
class Compilation {
  createHooks(): CompilationHooks {
    return {
      // 模块构建阶段
      buildModule: new SyncHook(['module']),
      rebuildModule: new SyncHook(['module']),
      failedModule: new SyncHook(['module', 'error']),
      succeedModule: new SyncHook(['module']),
      
      // 依赖阶段
      addEntry: new SyncHook(['entry', 'options']),
      failedEntry: new SyncHook(['entry', 'options', 'error']),
      succeedEntry: new SyncHook(['entry', 'options', 'module']),
      
      // 封装阶段
      seal: new SyncHook([]),
      beforeChunks: new SyncHook([]),
      afterChunks: new SyncHook(['chunks']),
      
      // 优化阶段
      optimize: new SyncHook([]),
      optimizeModules: new SyncBailHook(['modules']),
      afterOptimizeModules: new SyncHook(['modules']),
      optimizeChunks: new SyncBailHook(['chunks', 'chunkGroups']),
      afterOptimizeChunks: new SyncHook(['chunks', 'chunkGroups']),
      
      // Tree Shaking
      optimizeTree: new AsyncSeriesHook(['chunks', 'modules']),
      
      // 代码生成
      beforeModuleHash: new SyncHook([]),
      afterModuleHash: new SyncHook([]),
      beforeCodeGeneration: new SyncHook([]),
      afterCodeGeneration: new SyncHook([]),
      
      // 资源生成
      processAssets: new AsyncSeriesHook(['assets']),
      afterProcessAssets: new SyncHook(['assets'])
    }
  }
}
```

## thisCompilation vs compilation

这两个钩子的区别很重要：

```typescript
class Compiler {
  // 触发 thisCompilation：仅当前编译器
  // 触发 compilation：当前编译器 + 子编译器
}

// 使用场景

// thisCompilation：只影响当前构建的逻辑
compiler.hooks.thisCompilation.tap('MyPlugin', (compilation) => {
  // 例如：添加入口模块
  // 只希望主编译器处理，子编译器忽略
})

// compilation：影响所有构建的逻辑
compiler.hooks.compilation.tap('MyPlugin', (compilation) => {
  // 例如：注册通用的模块处理逻辑
  // 主编译器和子编译器都需要
  compilation.hooks.buildModule.tap('MyPlugin', (module) => {
    // ...
  })
})
```

### 子编译器场景

```typescript
// 创建子编译器
class HtmlWebpackPlugin {
  apply(compiler: Compiler) {
    compiler.hooks.thisCompilation.tap('HtmlWebpackPlugin', (compilation) => {
      // 使用子编译器处理 HTML 模板
      const childCompiler = compilation.createChildCompiler(
        'html-webpack-plugin',
        { filename: '[name].html' }
      )
      
      // 添加入口
      new SingleEntryPlugin(
        compiler.context,
        './src/template.html',
        'html'
      ).apply(childCompiler)
      
      // 运行子编译器
      childCompiler.runAsChild((err, entries, childCompilation) => {
        // 子编译器会触发自己的 compilation 钩子
        // 但不会触发父编译器的 thisCompilation 钩子
      })
    })
  }
}
```

## 初始化过程

### 1. 设置入口信息

```typescript
class Compilation {
  addEntry(
    context: string,
    dependency: Dependency,
    options: EntryOptions | string,
    callback: Callback
  ): void {
    const name = typeof options === 'string' 
      ? options 
      : options.name || ''
    
    // 记录入口
    let entry = this.entries.get(name)
    if (!entry) {
      entry = {
        dependencies: [],
        options: typeof options === 'object' ? options : {}
      }
      this.entries.set(name, entry)
    }
    entry.dependencies.push(dependency)
    
    // 触发钩子
    this.hooks.addEntry.call(dependency, options)
    
    // 添加模块
    this._addModuleTree(context, dependency, (err, module) => {
      if (err) {
        this.hooks.failedEntry.call(dependency, options, err)
        return callback(err)
      }
      
      this.hooks.succeedEntry.call(dependency, options, module)
      callback(null, module)
    })
  }
}
```

### 2. 关联模块工厂

```typescript
class Compilation {
  constructor(compiler: Compiler) {
    // ...
    
    // 依赖类型到工厂的映射
    this.dependencyFactories = new Map()
    
    // 依赖类型到模板的映射
    this.dependencyTemplates = new Map()
  }
  
  // 在 compilation 钩子中设置
  // 由 NormalModuleFactory 等插件注册
}

// NormalModuleFactory 插件
class NormalModuleFactory {
  apply(compiler: Compiler) {
    compiler.hooks.compilation.tap(
      'NormalModuleFactory',
      (compilation, { normalModuleFactory }) => {
        // 注册依赖工厂
        compilation.dependencyFactories.set(
          EntryDependency,
          normalModuleFactory
        )
        compilation.dependencyFactories.set(
          HarmonyImportDependency,
          normalModuleFactory
        )
        
        // 注册依赖模板
        compilation.dependencyTemplates.set(
          EntryDependency,
          new EntryDependencyTemplate()
        )
        compilation.dependencyTemplates.set(
          HarmonyImportDependency,
          new HarmonyImportDependencyTemplate()
        )
      }
    )
  }
}
```

## Mini-Webpack 实现

```typescript
// src/Compilation.ts
import { Module } from './Module'
import { Chunk } from './Chunk'
import { Source } from './Source'

export interface CompilationParams {
  normalModuleFactory: NormalModuleFactory
}

export class Compilation {
  compiler: Compiler
  options: NormalizedOptions
  params: CompilationParams
  
  modules: Set<Module> = new Set()
  chunks: Set<Chunk> = new Set()
  assets: Record<string, Source> = {}
  
  entries: Map<string, EntryData> = new Map()
  moduleGraph: ModuleGraph
  
  errors: Error[] = []
  warnings: Error[] = []
  
  fileDependencies: Set<string> = new Set()
  
  hooks = {
    buildModule: new SyncHook<[Module]>(['module']),
    succeedModule: new SyncHook<[Module]>(['module']),
    failedModule: new SyncHook<[Module, Error]>(['module', 'error']),
    seal: new SyncHook([]),
    afterChunks: new SyncHook<[Set<Chunk>]>(['chunks']),
    processAssets: new AsyncSeriesHook<[Record<string, Source>]>(['assets'])
  }
  
  constructor(compiler: Compiler) {
    this.compiler = compiler
    this.options = compiler.options
    this.moduleGraph = new ModuleGraph()
  }
  
  addEntry(
    context: string,
    request: string,
    options: { name: string },
    callback: (err: Error | null, module?: Module) => void
  ): void {
    const name = options.name
    
    // 创建入口记录
    let entry = this.entries.get(name)
    if (!entry) {
      entry = { dependencies: [], options }
      this.entries.set(name, entry)
    }
    
    // 创建模块
    this.addModule(context, request, (err, module) => {
      if (err) return callback(err)
      
      entry!.dependencies.push(module!)
      callback(null, module)
    })
  }
  
  addModule(
    context: string,
    request: string,
    callback: (err: Error | null, module?: Module) => void
  ): void {
    const { normalModuleFactory } = this.params
    
    // 使用工厂创建模块
    normalModuleFactory.create(
      { context, request },
      (err, module) => {
        if (err) return callback(err)
        
        // 检查是否已存在
        const existingModule = this.findModule(module!.identifier())
        if (existingModule) {
          return callback(null, existingModule)
        }
        
        // 添加到模块集合
        this.modules.add(module!)
        
        // 构建模块
        this.buildModule(module!, callback)
      }
    )
  }
  
  buildModule(
    module: Module,
    callback: (err: Error | null, module?: Module) => void
  ): void {
    this.hooks.buildModule.call(module)
    
    module.build(this, (err) => {
      if (err) {
        this.hooks.failedModule.call(module, err)
        return callback(err)
      }
      
      this.hooks.succeedModule.call(module)
      
      // 处理模块依赖
      this.processDependencies(module, (err) => {
        callback(err, module)
      })
    })
  }
  
  processDependencies(
    module: Module,
    callback: (err: Error | null) => void
  ): void {
    const dependencies = module.dependencies || []
    let remaining = dependencies.length
    
    if (remaining === 0) {
      return callback(null)
    }
    
    for (const dep of dependencies) {
      this.addModule(module.context, dep.request, (err, depModule) => {
        if (err) return callback(err)
        
        // 记录依赖关系
        this.moduleGraph.setResolvedModule(module, dep, depModule!)
        
        remaining--
        if (remaining === 0) {
          callback(null)
        }
      })
    }
  }
  
  finish(callback: (err: Error | null) => void): void {
    // 等待所有模块完成
    callback(null)
  }
  
  seal(callback: (err: Error | null) => void): void {
    this.hooks.seal.call()
    
    // 创建 Chunk
    for (const [name, entry] of this.entries) {
      const chunk = new Chunk(name)
      
      // 将入口模块添加到 chunk
      for (const module of entry.dependencies) {
        this.addModuleToChunk(module, chunk)
      }
      
      this.chunks.add(chunk)
    }
    
    this.hooks.afterChunks.call(this.chunks)
    
    // 生成代码
    this.createAssets(callback)
  }
  
  private addModuleToChunk(module: Module, chunk: Chunk): void {
    chunk.addModule(module)
    
    // 递归添加依赖模块
    const deps = this.moduleGraph.getOutgoingConnections(module)
    for (const dep of deps) {
      if (!chunk.hasModule(dep.module)) {
        this.addModuleToChunk(dep.module, chunk)
      }
    }
  }
  
  private createAssets(callback: (err: Error | null) => void): void {
    for (const chunk of this.chunks) {
      const filename = this.options.output.filename.replace(
        '[name]',
        chunk.name || 'main'
      )
      
      const source = this.generateChunkSource(chunk)
      this.assets[filename] = source
    }
    
    this.hooks.processAssets.callAsync(this.assets, callback)
  }
  
  private generateChunkSource(chunk: Chunk): Source {
    // 生成代码（简化版）
    const modules = chunk.getModules()
    const moduleCode = modules.map(m => m.source()).join('\n')
    
    return new Source(`
(function(modules) {
  var installedModules = {};
  function __webpack_require__(moduleId) {
    if(installedModules[moduleId]) return installedModules[moduleId].exports;
    var module = installedModules[moduleId] = { exports: {} };
    modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
    return module.exports;
  }
  return __webpack_require__(0);
})([
${moduleCode}
]);
    `.trim())
  }
  
  private findModule(identifier: string): Module | undefined {
    for (const module of this.modules) {
      if (module.identifier() === identifier) {
        return module
      }
    }
    return undefined
  }
}
```

## 本章小结

- `createCompilation` 创建新的 Compilation 实例
- `newCompilation` 还会触发钩子和设置参数
- **thisCompilation** vs **compilation**：是否包含子编译器
- Compilation 持有模块、代码块、资源等构建产物
- 通过 **ModuleGraph** 和 **ChunkGraph** 管理依赖关系

下一章我们学习 compile 方法的完整实现。
