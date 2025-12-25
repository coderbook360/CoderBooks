---
sidebar_position: 21
title: "run 方法实现：启动编译流程"
---

# run 方法实现：启动编译流程

`run` 方法是 Webpack 构建的入口点，它启动整个编译流程。本章详细分析 run 方法的实现逻辑。

## run 方法概览

```typescript
compiler.run((err, stats) => {
  if (err) {
    console.error(err)
    return
  }
  console.log(stats.toString())
})
```

这一个简单的调用背后，发生了什么？

## 执行流程

```
run(callback)
    │
    ├─→ 检查是否已在运行
    │
    ├─→ 设置 running = true
    │
    ├─→ hooks.beforeRun.callAsync
    │       │
    │       └─→ 读取 records（增量构建）
    │
    ├─→ hooks.run.callAsync
    │
    ├─→ readRecords()
    │
    ├─→ compile()
    │       │
    │       ├─→ hooks.beforeCompile
    │       ├─→ hooks.compile
    │       ├─→ newCompilation()
    │       ├─→ hooks.make（添加入口）
    │       ├─→ compilation.seal()
    │       └─→ hooks.afterCompile
    │
    ├─→ emitAssets()
    │       │
    │       ├─→ hooks.emit
    │       ├─→ 写入文件
    │       └─→ hooks.afterEmit
    │
    ├─→ emitRecords()
    │
    ├─→ hooks.done.callAsync
    │
    └─→ callback(err, stats)
```

## 源码分析

### 基础结构

```typescript
class Compiler {
  running: boolean = false
  
  run(callback: RunCallback): void {
    // 防止重复运行
    if (this.running) {
      return callback(new ConcurrentCompilationError())
    }
    
    // 最终回调（确保只调用一次）
    let finalCallback: RunCallback | null = callback
    
    const onComplete = (err: Error | null, stats?: Stats) => {
      if (finalCallback === null) return
      const cb = finalCallback
      finalCallback = null
      
      this.running = false
      this.idle = true
      
      // 关闭缓存
      this.cache.endIdle((err2) => {
        if (err2) return cb(err2)
        cb(err, stats)
      })
    }
    
    // 开始运行
    this.running = true
    this.idle = false
    
    // 进入构建流程
    this._run(onComplete)
  }
  
  private _run(callback: RunCallback): void {
    // beforeRun 钩子
    this.hooks.beforeRun.callAsync(this, (err) => {
      if (err) return callback(err)
      
      // run 钩子
      this.hooks.run.callAsync(this, (err) => {
        if (err) return callback(err)
        
        // 读取 records
        this.readRecords((err) => {
          if (err) return callback(err)
          
          // 执行编译
          this.compile((err, compilation) => {
            if (err) return callback(err)
            
            // 输出资源
            this.emitAssets(compilation!, (err) => {
              if (err) return callback(err)
              
              // 保存 records
              this.emitRecords((err) => {
                if (err) return callback(err)
                
                // 创建统计信息
                const stats = new Stats(compilation!)
                
                // done 钩子
                this.hooks.done.callAsync(stats, (err) => {
                  callback(err, stats)
                })
              })
            })
          })
        })
      })
    })
  }
}
```

### Records 机制

Records 用于跨构建保持一致性（如 Module ID）：

```typescript
class Compiler {
  records: Records = {}
  recordsInputPath: string | null = null
  recordsOutputPath: string | null = null
  
  readRecords(callback: Callback): void {
    if (!this.recordsInputPath) {
      return callback()
    }
    
    this.inputFileSystem.readFile(this.recordsInputPath, (err, content) => {
      if (err) {
        // 文件不存在不算错误
        if (err.code === 'ENOENT') {
          return callback()
        }
        return callback(err)
      }
      
      try {
        this.records = JSON.parse(content.toString())
      } catch (e) {
        return callback(e)
      }
      
      callback()
    })
  }
  
  emitRecords(callback: Callback): void {
    if (!this.recordsOutputPath) {
      return callback()
    }
    
    const content = JSON.stringify(this.records)
    
    this.outputFileSystem.mkdirp(
      path.dirname(this.recordsOutputPath),
      (err) => {
        if (err) return callback(err)
        
        this.outputFileSystem.writeFile(
          this.recordsOutputPath,
          content,
          callback
        )
      }
    )
  }
}
```

### compile 方法

```typescript
class Compiler {
  compile(callback: CompileCallback): void {
    const params = this.newCompilationParams()
    
    // beforeCompile 钩子
    this.hooks.beforeCompile.callAsync(params, (err) => {
      if (err) return callback(err)
      
      // compile 钩子（同步）
      this.hooks.compile.call(params)
      
      // 创建 Compilation
      const compilation = this.newCompilation(params)
      
      // make 钩子（并行）
      // 这里 EntryPlugin 会添加入口
      this.hooks.make.callAsync(compilation, (err) => {
        if (err) return callback(err)
        
        // finishMake 钩子
        this.hooks.finishMake.callAsync(compilation, (err) => {
          if (err) return callback(err)
          
          // 处理剩余工作
          process.nextTick(() => {
            // 完成模块处理
            compilation.finish((err) => {
              if (err) return callback(err)
              
              // 封装阶段
              compilation.seal((err) => {
                if (err) return callback(err)
                
                // afterCompile 钩子
                this.hooks.afterCompile.callAsync(compilation, (err) => {
                  callback(err, compilation)
                })
              })
            })
          })
        })
      })
    })
  }
  
  newCompilationParams(): CompilationParams {
    return {
      normalModuleFactory: this.createNormalModuleFactory(),
      contextModuleFactory: this.createContextModuleFactory()
    }
  }
  
  createNormalModuleFactory(): NormalModuleFactory {
    const factory = new NormalModuleFactory({
      context: this.options.context,
      fs: this.inputFileSystem,
      resolverFactory: this.resolverFactory,
      options: this.options.module
    })
    
    // 触发钩子
    this.hooks.normalModuleFactory.call(factory)
    
    return factory
  }
}
```

### 资源输出

```typescript
class Compiler {
  emitAssets(compilation: Compilation, callback: Callback): void {
    let outputPath: string
    
    const emitFiles = (err?: Error) => {
      if (err) return callback(err)
      
      const assets = compilation.getAssets()
      
      // 并发写入，限制并发数
      asyncLib.forEachLimit(
        assets,
        15,
        (asset, callback) => {
          const targetPath = path.join(outputPath, asset.name)
          const content = asset.source.source()
          
          // 确保目录存在
          this.outputFileSystem.mkdirp(
            path.dirname(targetPath),
            (err) => {
              if (err) return callback(err)
              
              // 写入文件
              this.outputFileSystem.writeFile(targetPath, content, (err) => {
                if (err) return callback(err)
                
                // 单个资源输出完成钩子
                this.hooks.assetEmitted.callAsync(asset.name, { 
                  content,
                  source: asset.source,
                  outputPath,
                  targetPath
                }, callback)
              })
            }
          )
        },
        (err) => {
          if (err) return callback(err)
          
          // afterEmit 钩子
          this.hooks.afterEmit.callAsync(compilation, callback)
        }
      )
    }
    
    // emit 钩子（最后机会修改资源）
    this.hooks.emit.callAsync(compilation, (err) => {
      if (err) return callback(err)
      
      outputPath = compilation.getPath(this.outputPath)
      
      // 创建输出目录
      this.outputFileSystem.mkdirp(outputPath, emitFiles)
    })
  }
}
```

## Mini-Webpack 实现

```typescript
// src/Compiler.ts
import * as fs from 'fs'
import * as path from 'path'

export class Compiler {
  options: NormalizedOptions
  context: string
  running: boolean = false
  
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
    done: new AsyncSeriesHook<[Stats]>(['stats']),
    failed: new SyncHook<[Error]>(['error'])
  }
  
  constructor(options: NormalizedOptions) {
    this.options = options
    this.context = options.context
    
    // 应用插件
    this.applyPlugins()
  }
  
  private applyPlugins(): void {
    // 应用入口插件
    new EntryPlugin(this.options.entry).apply(this)
    
    // 应用用户插件
    this.options.plugins.forEach(plugin => plugin.apply(this))
  }
  
  run(callback: (err: Error | null, stats?: Stats) => void): void {
    if (this.running) {
      return callback(new Error('Compiler is already running'))
    }
    
    this.running = true
    
    const onComplete = (err: Error | null, stats?: Stats) => {
      this.running = false
      
      if (err) {
        this.hooks.failed.call(err)
        return callback(err)
      }
      
      callback(null, stats)
    }
    
    // 执行构建流程
    this.hooks.beforeRun.callAsync(this, (err) => {
      if (err) return onComplete(err)
      
      this.hooks.run.callAsync(this, (err) => {
        if (err) return onComplete(err)
        
        this.compile((err, compilation) => {
          if (err) return onComplete(err)
          
          this.emitAssets(compilation!, (err) => {
            if (err) return onComplete(err)
            
            const stats = new Stats(compilation!)
            
            this.hooks.done.callAsync(stats, (err) => {
              onComplete(err, stats)
            })
          })
        })
      })
    })
  }
  
  compile(callback: (err: Error | null, compilation?: Compilation) => void): void {
    const params: CompilationParams = {
      normalModuleFactory: new NormalModuleFactory(this)
    }
    
    this.hooks.beforeCompile.callAsync(params, (err) => {
      if (err) return callback(err)
      
      this.hooks.compile.call(params)
      
      const compilation = new Compilation(this)
      
      this.hooks.thisCompilation.call(compilation, params)
      this.hooks.compilation.call(compilation, params)
      
      // make 钩子，入口插件会在这里添加入口
      this.hooks.make.callAsync(compilation, (err) => {
        if (err) return callback(err)
        
        // 完成模块构建
        compilation.finish((err) => {
          if (err) return callback(err)
          
          // 封装阶段
          compilation.seal((err) => {
            if (err) return callback(err)
            
            this.hooks.afterCompile.callAsync(compilation, (err) => {
              callback(err, compilation)
            })
          })
        })
      })
    })
  }
  
  emitAssets(compilation: Compilation, callback: (err: Error | null) => void): void {
    this.hooks.emit.callAsync(compilation, (err) => {
      if (err) return callback(err)
      
      const outputPath = this.options.output.path
      
      // 确保输出目录存在
      if (!fs.existsSync(outputPath)) {
        fs.mkdirSync(outputPath, { recursive: true })
      }
      
      // 写入资源文件
      for (const [name, source] of Object.entries(compilation.assets)) {
        const filePath = path.join(outputPath, name)
        const dir = path.dirname(filePath)
        
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true })
        }
        
        fs.writeFileSync(filePath, source.source())
      }
      
      this.hooks.afterEmit.callAsync(compilation, callback)
    })
  }
}
```

### EntryPlugin 实现

```typescript
// src/plugins/EntryPlugin.ts
export class EntryPlugin {
  constructor(private entry: Record<string, { import: string[] }>) {}
  
  apply(compiler: Compiler): void {
    compiler.hooks.make.tapAsync('EntryPlugin', (compilation, callback) => {
      const entries = Object.entries(this.entry)
      let remaining = entries.length
      
      if (remaining === 0) {
        return callback()
      }
      
      for (const [name, config] of entries) {
        for (const request of config.import) {
          compilation.addEntry(
            compiler.context,
            request,
            { name },
            (err) => {
              if (err) return callback(err)
              
              remaining--
              if (remaining === 0) {
                callback()
              }
            }
          )
        }
      }
    })
  }
}
```

## 错误处理

### 构建错误分类

```typescript
class Compiler {
  run(callback: RunCallback): void {
    try {
      this._run((err, stats) => {
        if (err) {
          // 构建过程错误
          return callback(err)
        }
        
        // 检查编译错误（不影响输出）
        if (stats.hasErrors()) {
          // 有错误但仍然输出
        }
        
        callback(null, stats)
      })
    } catch (err) {
      // 同步异常
      callback(err as Error)
    }
  }
}
```

### 错误恢复

```typescript
class Compiler {
  compile(callback: CompileCallback): void {
    this.hooks.make.callAsync(compilation, (err) => {
      // 即使有错误，也尝试完成构建
      // 这样可以输出部分结果和完整的错误信息
      
      const finish = () => {
        compilation.finish((err2) => {
          if (err || err2) {
            return callback(err || err2)
          }
          
          compilation.seal((err3) => {
            callback(err3, compilation)
          })
        })
      }
      
      if (err) {
        compilation.errors.push(err)
      }
      
      finish()
    })
  }
}
```

## 本章小结

- `run` 方法是构建的入口，触发完整编译流程
- 流程包括：beforeRun → run → compile → emit → done
- **Records** 用于跨构建保持 ID 一致性
- `compile` 方法创建 Compilation 并执行模块构建
- 资源输出支持**并发写入**，提高效率

下一章我们学习 watch 方法的实现。
