---
sidebar_position: 18
title: "Compiler 类设计与职责"
---

# Compiler 类设计与职责

Compiler 是 Webpack 的核心调度器，负责整个构建流程的编排与控制。本章深入剖析 Compiler 类的设计理念与核心职责。

## Compiler 在架构中的位置

```
webpack(config)
    ↓
┌─────────────────────────────────────────────────┐
│                   Compiler                       │
│  ┌───────────────────────────────────────────┐  │
│  │  配置管理 | 钩子体系 | 生命周期控制         │  │
│  └───────────────────────────────────────────┘  │
│                      ↓                           │
│  ┌───────────────────────────────────────────┐  │
│  │             Compilation                    │  │
│  │  模块构建 | 依赖分析 | 代码生成             │  │
│  └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
    ↓
输出文件
```

**核心定位**：
- **构建调度中心**：协调各子系统的工作
- **配置持有者**：管理用户配置和内部选项
- **生命周期管理**：通过钩子控制构建流程
- **Compilation 工厂**：创建和管理 Compilation 实例

## 类结构设计

### 基础结构

```typescript
import { Tapable } from './tapable'
import type { WebpackOptions, Stats, OutputFileSystem } from './types'

class Compiler extends Tapable {
  // 配置相关
  options: WebpackOptions
  context: string  // 项目根目录
  
  // 文件系统
  inputFileSystem: InputFileSystem
  outputFileSystem: OutputFileSystem
  watchFileSystem: WatchFileSystem
  
  // 构建状态
  running: boolean
  watching: Watching | null
  
  // 模块工厂
  resolverFactory: ResolverFactory
  
  // 钩子体系
  hooks: CompilerHooks
  
  constructor(context: string) {
    super()
    this.context = context
    this.hooks = this.createHooks()
    this.running = false
    this.watching = null
  }
}
```

### 属性详解

```typescript
interface CompilerProperties {
  // 核心配置
  options: WebpackOptions        // 完整配置对象
  context: string                // 项目根目录（所有相对路径基于此）
  
  // 入口相关
  entry: EntryOption             // 入口配置
  name?: string                  // 编译器名称（多编译器场景）
  
  // 文件系统抽象
  inputFileSystem: InputFileSystem      // 读取源文件
  outputFileSystem: OutputFileSystem    // 写入输出文件
  intermediateFileSystem: IntermediateFileSystem  // 中间文件
  watchFileSystem: WatchFileSystem      // 文件监听
  
  // 解析器
  resolverFactory: ResolverFactory      // 模块解析工厂
  
  // 基础设施
  infrastructureLogger: Logger          // 基础日志
  cache: Cache                          // 缓存系统
  
  // 运行状态
  running: boolean                      // 是否正在运行
  idle: boolean                         // 是否空闲
  watching: Watching | null             // 监听实例
  
  // 统计信息
  records: Records                      // 记录信息（用于增量构建）
  compilationDependencies: Set<string>  // 编译依赖的文件
}
```

## 核心职责

### 1. 配置管理

```typescript
class Compiler {
  // 应用配置
  applyOptions(options: WebpackOptions): void {
    this.options = options
    this.context = options.context || process.cwd()
    
    // 初始化入口
    this.entry = options.entry
    
    // 初始化输出配置
    this.outputPath = options.output?.path || 'dist'
    
    // 应用内置插件
    this.applyBuiltinPlugins()
  }
  
  // 应用内置插件
  private applyBuiltinPlugins(): void {
    const { options } = this
    
    // 入口插件
    new EntryOptionPlugin().apply(this)
    
    // 解析插件
    new ResolverPlugin().apply(this)
    
    // 根据 mode 应用不同插件
    if (options.mode === 'development') {
      new DevelopmentModePlugin().apply(this)
    } else if (options.mode === 'production') {
      new ProductionModePlugin().apply(this)
    }
  }
}
```

### 2. 生命周期控制

```typescript
class Compiler {
  // 运行构建
  run(callback: RunCallback): void {
    if (this.running) {
      return callback(new Error('Compiler is already running'))
    }
    
    this.running = true
    
    const onComplete = (err: Error | null, stats?: Stats) => {
      this.running = false
      this.hooks.done.call(stats)
      callback(err, stats)
    }
    
    // 触发构建前钩子
    this.hooks.beforeRun.callAsync(this, (err) => {
      if (err) return onComplete(err)
      
      this.hooks.run.callAsync(this, (err) => {
        if (err) return onComplete(err)
        
        // 开始编译
        this.compile(onComplete)
      })
    })
  }
  
  // 监听模式
  watch(watchOptions: WatchOptions, callback: WatchCallback): Watching {
    if (this.running) {
      throw new Error('Compiler is already running')
    }
    
    this.watching = new Watching(this, watchOptions, callback)
    return this.watching
  }
}
```

### 3. Compilation 创建

```typescript
class Compiler {
  // 创建 Compilation 实例
  createCompilation(): Compilation {
    return new Compilation(this)
  }
  
  // 创建新的 Compilation 并触发钩子
  newCompilation(params: CompilationParams): Compilation {
    const compilation = this.createCompilation()
    compilation.params = params
    
    // 触发钩子，允许插件修改
    this.hooks.thisCompilation.call(compilation, params)
    this.hooks.compilation.call(compilation, params)
    
    return compilation
  }
  
  // 编译入口
  compile(callback: CompileCallback): void {
    const params = this.newCompilationParams()
    
    this.hooks.beforeCompile.callAsync(params, (err) => {
      if (err) return callback(err)
      
      this.hooks.compile.call(params)
      
      const compilation = this.newCompilation(params)
      
      // 开始构建
      this.hooks.make.callAsync(compilation, (err) => {
        if (err) return callback(err)
        
        // 封装阶段
        compilation.seal((err) => {
          if (err) return callback(err)
          
          this.hooks.afterCompile.callAsync(compilation, (err) => {
            if (err) return callback(err)
            
            callback(null, compilation)
          })
        })
      })
    })
  }
}
```

### 4. 资源输出

```typescript
class Compiler {
  // 输出资源
  emitAssets(compilation: Compilation, callback: Callback): void {
    const outputPath = this.outputPath
    
    // 触发输出前钩子
    this.hooks.emit.callAsync(compilation, (err) => {
      if (err) return callback(err)
      
      // 确保输出目录存在
      this.outputFileSystem.mkdirp(outputPath, (err) => {
        if (err) return callback(err)
        
        // 写入每个资源文件
        const assets = compilation.assets
        const assetNames = Object.keys(assets)
        
        asyncLib.forEachLimit(
          assetNames,
          15,  // 并发数
          (name, callback) => {
            this.writeAsset(outputPath, name, assets[name], callback)
          },
          (err) => {
            if (err) return callback(err)
            
            this.hooks.afterEmit.callAsync(compilation, callback)
          }
        )
      })
    })
  }
  
  // 写入单个资源
  private writeAsset(
    outputPath: string,
    name: string,
    source: Source,
    callback: Callback
  ): void {
    const targetPath = path.join(outputPath, name)
    const content = source.source()
    
    this.outputFileSystem.writeFile(targetPath, content, callback)
  }
}
```

## 文件系统抽象

Webpack 通过文件系统抽象实现平台无关性：

```typescript
interface InputFileSystem {
  readFile(path: string, callback: Callback<Buffer>): void
  readdir(path: string, callback: Callback<string[]>): void
  stat(path: string, callback: Callback<Stats>): void
  realpath(path: string, callback: Callback<string>): void
}

interface OutputFileSystem {
  writeFile(path: string, data: Buffer | string, callback: Callback): void
  mkdir(path: string, callback: Callback): void
  mkdirp(path: string, callback: Callback): void
  rmdir(path: string, callback: Callback): void
}

// 默认使用 Node.js 文件系统
class Compiler {
  constructor(context: string) {
    this.inputFileSystem = fs
    this.outputFileSystem = fs
  }
}
```

**抽象的好处**：
- 支持内存文件系统（webpack-dev-middleware）
- 支持虚拟文件系统（测试场景）
- 支持远程文件系统（分布式构建）

## 与其他组件的关系

```typescript
class Compiler {
  // 解析器工厂
  resolverFactory: ResolverFactory
  
  // 缓存系统
  cache: Cache
  
  // 获取解析器
  getResolver(type: 'normal' | 'context' | 'loader'): Resolver {
    return this.resolverFactory.get(type, this.options.resolve)
  }
  
  // 获取缓存
  getCache(name: string): CacheFacade {
    return this.cache.getChildCache(name)
  }
}

// Compilation 通过 Compiler 访问共享资源
class Compilation {
  constructor(compiler: Compiler) {
    this.compiler = compiler
    this.resolver = compiler.getResolver('normal')
    this.cache = compiler.getCache('compilation')
  }
}
```

## Mini-Webpack 实现

```typescript
// src/Compiler.ts
import { EventEmitter } from 'events'
import * as fs from 'fs'
import * as path from 'path'

interface MiniWebpackOptions {
  context?: string
  entry: string | string[] | Record<string, string>
  output: {
    path: string
    filename: string
  }
  module?: {
    rules: Rule[]
  }
  plugins?: Plugin[]
}

export class Compiler extends EventEmitter {
  options: MiniWebpackOptions
  context: string
  running: boolean
  
  // 钩子
  hooks = {
    beforeRun: new AsyncSeriesHook<[Compiler]>(['compiler']),
    run: new AsyncSeriesHook<[Compiler]>(['compiler']),
    beforeCompile: new AsyncSeriesHook<[CompilationParams]>(['params']),
    compile: new SyncHook<[CompilationParams]>(['params']),
    thisCompilation: new SyncHook<[Compilation, CompilationParams]>(['compilation', 'params']),
    compilation: new SyncHook<[Compilation, CompilationParams]>(['compilation', 'params']),
    make: new AsyncParallelHook<[Compilation]>(['compilation']),
    afterCompile: new AsyncSeriesHook<[Compilation]>(['compilation']),
    emit: new AsyncSeriesHook<[Compilation]>(['compilation']),
    afterEmit: new AsyncSeriesHook<[Compilation]>(['compilation']),
    done: new AsyncSeriesHook<[Stats]>(['stats'])
  }
  
  constructor(context: string, options: MiniWebpackOptions) {
    super()
    this.context = context
    this.options = options
    this.running = false
    
    // 应用插件
    options.plugins?.forEach(plugin => plugin.apply(this))
  }
  
  run(callback: (err: Error | null, stats?: Stats) => void): void {
    if (this.running) {
      return callback(new Error('Compiler already running'))
    }
    
    this.running = true
    
    const onComplete = (err: Error | null, compilation?: Compilation) => {
      this.running = false
      
      if (err) {
        callback(err)
        return
      }
      
      const stats = new Stats(compilation!)
      this.hooks.done.callAsync(stats, () => {
        callback(null, stats)
      })
    }
    
    this.hooks.beforeRun.callAsync(this, (err) => {
      if (err) return onComplete(err)
      
      this.hooks.run.callAsync(this, (err) => {
        if (err) return onComplete(err)
        
        this.compile(onComplete)
      })
    })
  }
  
  compile(callback: (err: Error | null, compilation?: Compilation) => void): void {
    const params = this.newCompilationParams()
    
    this.hooks.beforeCompile.callAsync(params, (err) => {
      if (err) return callback(err)
      
      this.hooks.compile.call(params)
      
      const compilation = this.newCompilation(params)
      
      // 触发 make 钩子，由 EntryPlugin 添加入口
      this.hooks.make.callAsync(compilation, (err) => {
        if (err) return callback(err)
        
        compilation.seal((err) => {
          if (err) return callback(err)
          
          this.hooks.afterCompile.callAsync(compilation, (err) => {
            if (err) return callback(err)
            
            callback(null, compilation)
          })
        })
      })
    })
  }
  
  newCompilationParams(): CompilationParams {
    return {
      normalModuleFactory: new NormalModuleFactory(this),
      contextModuleFactory: new ContextModuleFactory(this)
    }
  }
  
  newCompilation(params: CompilationParams): Compilation {
    const compilation = new Compilation(this)
    this.hooks.thisCompilation.call(compilation, params)
    this.hooks.compilation.call(compilation, params)
    return compilation
  }
  
  emitAssets(compilation: Compilation, callback: Callback): void {
    const outputPath = this.options.output.path
    
    this.hooks.emit.callAsync(compilation, (err) => {
      if (err) return callback(err)
      
      // 确保目录存在
      fs.mkdirSync(outputPath, { recursive: true })
      
      // 写入资源
      for (const [name, source] of Object.entries(compilation.assets)) {
        const filePath = path.join(outputPath, name)
        fs.writeFileSync(filePath, source.source())
      }
      
      this.hooks.afterEmit.callAsync(compilation, callback)
    })
  }
}
```

## 本章小结

- Compiler 是 Webpack 的**构建调度中心**
- 核心职责包括：配置管理、生命周期控制、Compilation 创建、资源输出
- 通过**文件系统抽象**实现平台无关性
- 通过**钩子体系**支持插件扩展
- Compilation 是实际的构建执行者，Compiler 是编排者

下一章我们学习配置解析与标准化。
