---
sidebar_position: 20
title: "Compiler Hooks 体系"
---

# Compiler Hooks 体系

Compiler 通过丰富的钩子体系暴露构建生命周期的各个阶段。本章详细分析每个钩子的触发时机与用途。

## 钩子体系概览

```typescript
class Compiler {
  hooks = {
    // 环境准备阶段
    environment: new SyncHook([]),
    afterEnvironment: new SyncHook([]),
    
    // 入口处理阶段
    entryOption: new SyncBailHook(['context', 'entry']),
    afterPlugins: new SyncHook(['compiler']),
    afterResolvers: new SyncHook(['compiler']),
    
    // 运行阶段
    initialize: new SyncHook([]),
    beforeRun: new AsyncSeriesHook(['compiler']),
    run: new AsyncSeriesHook(['compiler']),
    
    // 监听模式
    watchRun: new AsyncSeriesHook(['compiler']),
    
    // 编译阶段
    normalModuleFactory: new SyncHook(['normalModuleFactory']),
    contextModuleFactory: new SyncHook(['contextModuleFactory']),
    beforeCompile: new AsyncSeriesHook(['params']),
    compile: new SyncHook(['params']),
    thisCompilation: new SyncHook(['compilation', 'params']),
    compilation: new SyncHook(['compilation', 'params']),
    make: new AsyncParallelHook(['compilation']),
    finishMake: new AsyncSeriesHook(['compilation']),
    afterCompile: new AsyncSeriesHook(['compilation']),
    
    // 输出阶段
    shouldEmit: new SyncBailHook(['compilation']),
    emit: new AsyncSeriesHook(['compilation']),
    assetEmitted: new AsyncSeriesHook(['file', 'info']),
    afterEmit: new AsyncSeriesHook(['compilation']),
    
    // 完成阶段
    done: new AsyncSeriesHook(['stats']),
    additionalPass: new AsyncSeriesHook([]),
    failed: new SyncHook(['error']),
    
    // 缓存相关
    invalid: new SyncHook(['filename', 'changeTime']),
    watchClose: new SyncHook([]),
    shutdown: new AsyncSeriesHook([])
  }
}
```

## 生命周期钩子详解

### 1. 环境准备阶段

```typescript
// environment: 在配置环境设置之后
compiler.hooks.environment.tap('MyPlugin', () => {
  // 可以修改 compiler 实例
  // 此时 options 已设置
})

// afterEnvironment: 环境设置完成后
compiler.hooks.afterEnvironment.tap('MyPlugin', () => {
  // 所有环境配置完成
})
```

### 2. 入口处理阶段

```typescript
// entryOption: 入口配置处理
// 返回 true 表示已处理，跳过默认处理
compiler.hooks.entryOption.tap('MyPlugin', (context, entry) => {
  // context: 项目根目录
  // entry: 入口配置
  console.log('Entry:', entry)
  // 返回 undefined 继续默认处理
})

// afterPlugins: 所有插件应用后
compiler.hooks.afterPlugins.tap('MyPlugin', (compiler) => {
  // 可以添加额外插件
  new AdditionalPlugin().apply(compiler)
})

// afterResolvers: 解析器创建后
compiler.hooks.afterResolvers.tap('MyPlugin', (compiler) => {
  // 可以访问 resolverFactory
  const resolver = compiler.resolverFactory.get('normal')
})
```

### 3. 运行阶段

```typescript
// initialize: 初始化完成
compiler.hooks.initialize.tap('MyPlugin', () => {
  console.log('Compiler initialized')
})

// beforeRun: 运行前（仅 run 模式）
compiler.hooks.beforeRun.tapAsync('MyPlugin', (compiler, callback) => {
  // 异步操作
  setTimeout(() => {
    console.log('Before run')
    callback()
  }, 100)
})

// run: 开始运行
compiler.hooks.run.tapAsync('MyPlugin', (compiler, callback) => {
  console.log('Running...')
  callback()
})

// watchRun: 监听模式开始运行
compiler.hooks.watchRun.tapAsync('MyPlugin', (compiler, callback) => {
  console.log('Watch mode running...')
  callback()
})
```

### 4. 编译阶段

```typescript
// normalModuleFactory: 普通模块工厂创建后
compiler.hooks.normalModuleFactory.tap('MyPlugin', (nmf) => {
  // 可以修改模块工厂行为
  nmf.hooks.resolve.tap('MyPlugin', (data) => {
    console.log('Resolving:', data.request)
  })
})

// beforeCompile: 编译前
compiler.hooks.beforeCompile.tapAsync('MyPlugin', (params, callback) => {
  // params 包含 normalModuleFactory 和 contextModuleFactory
  callback()
})

// compile: 编译开始
compiler.hooks.compile.tap('MyPlugin', (params) => {
  console.log('Compile started')
})

// thisCompilation: 当前 compilation 创建后
// 仅在当前编译器触发，子编译器不触发
compiler.hooks.thisCompilation.tap('MyPlugin', (compilation, params) => {
  // 只为当前编译器的 compilation 添加钩子
})

// compilation: compilation 创建后
// 子编译器也会触发
compiler.hooks.compilation.tap('MyPlugin', (compilation, params) => {
  // 为所有 compilation 添加钩子
  compilation.hooks.buildModule.tap('MyPlugin', (module) => {
    console.log('Building:', module.identifier())
  })
})

// make: 开始构建模块（并行钩子）
compiler.hooks.make.tapAsync('EntryPlugin', (compilation, callback) => {
  // 添加入口
  compilation.addEntry(
    context,
    new EntryDependency('./src/index.js'),
    { name: 'main' },
    callback
  )
})

// finishMake: make 完成后
compiler.hooks.finishMake.tapAsync('MyPlugin', (compilation, callback) => {
  console.log('All entries processed')
  callback()
})

// afterCompile: 编译完成后
compiler.hooks.afterCompile.tapAsync('MyPlugin', (compilation, callback) => {
  // 可以添加额外的文件依赖
  compilation.fileDependencies.add('/path/to/file')
  callback()
})
```

### 5. 输出阶段

```typescript
// shouldEmit: 决定是否输出（熔断钩子）
compiler.hooks.shouldEmit.tap('MyPlugin', (compilation) => {
  // 返回 false 阻止输出
  if (compilation.errors.length > 0) {
    return false
  }
})

// emit: 输出前
compiler.hooks.emit.tapAsync('MyPlugin', (compilation, callback) => {
  // 可以修改或添加资源
  compilation.assets['extra.txt'] = {
    source: () => 'Extra content',
    size: () => 13
  }
  callback()
})

// assetEmitted: 单个资源输出后
compiler.hooks.assetEmitted.tapAsync('MyPlugin', (file, info, callback) => {
  console.log(`Emitted: ${file}, size: ${info.size}`)
  callback()
})

// afterEmit: 所有资源输出后
compiler.hooks.afterEmit.tapAsync('MyPlugin', (compilation, callback) => {
  console.log('All assets emitted')
  callback()
})
```

### 6. 完成阶段

```typescript
// done: 构建完成
compiler.hooks.done.tapAsync('MyPlugin', (stats, callback) => {
  console.log('Build done!')
  console.log(stats.toString({ colors: true }))
  callback()
})

// failed: 构建失败
compiler.hooks.failed.tap('MyPlugin', (error) => {
  console.error('Build failed:', error.message)
})

// invalid: 文件变化（监听模式）
compiler.hooks.invalid.tap('MyPlugin', (filename, changeTime) => {
  console.log(`File changed: ${filename}`)
})

// watchClose: 停止监听
compiler.hooks.watchClose.tap('MyPlugin', () => {
  console.log('Watch stopped')
})
```

## 钩子调用顺序

### 单次构建（run）

```
1. initialize
2. beforeRun
3. run
4. normalModuleFactory
5. contextModuleFactory
6. beforeCompile
7. compile
8. thisCompilation
9. compilation
10. make (并行处理入口)
11. finishMake
12. afterCompile
13. shouldEmit
14. emit
15. assetEmitted (每个文件)
16. afterEmit
17. done
```

### 监听模式（watch）

```
[首次构建]
1. initialize
2. watchRun
3. ... (同上 4-17)

[文件变化后]
1. invalid
2. watchRun
3. ... (同上 4-17)

[停止监听]
1. watchClose
```

## 钩子类型选择指南

| 钩子类型 | 适用场景 |
|---------|---------|
| SyncHook | 简单通知，无需返回值 |
| SyncBailHook | 需要决策，返回非 undefined 中断 |
| AsyncSeriesHook | 异步操作，按顺序执行 |
| AsyncParallelHook | 异步操作，并行执行 |

## 实际应用示例

### 构建时间统计

```typescript
class BuildTimePlugin {
  apply(compiler: Compiler) {
    let startTime: number
    
    compiler.hooks.compile.tap('BuildTimePlugin', () => {
      startTime = Date.now()
    })
    
    compiler.hooks.done.tap('BuildTimePlugin', (stats) => {
      const duration = Date.now() - startTime
      console.log(`Build time: ${duration}ms`)
    })
  }
}
```

### 资源大小监控

```typescript
class AssetSizePlugin {
  constructor(private maxSize: number) {}
  
  apply(compiler: Compiler) {
    compiler.hooks.emit.tap('AssetSizePlugin', (compilation) => {
      for (const [name, asset] of Object.entries(compilation.assets)) {
        const size = asset.size()
        if (size > this.maxSize) {
          compilation.warnings.push(
            new Error(`Asset ${name} exceeds ${this.maxSize} bytes (${size})`)
          )
        }
      }
    })
  }
}
```

### 自定义资源输出

```typescript
class ManifestPlugin {
  apply(compiler: Compiler) {
    compiler.hooks.emit.tap('ManifestPlugin', (compilation) => {
      const manifest: Record<string, string> = {}
      
      for (const chunk of compilation.chunks) {
        for (const file of chunk.files) {
          manifest[chunk.name || chunk.id] = file
        }
      }
      
      compilation.assets['manifest.json'] = {
        source: () => JSON.stringify(manifest, null, 2),
        size: () => JSON.stringify(manifest).length
      }
    })
  }
}
```

## Mini-Webpack 钩子实现

```typescript
// src/Compiler.ts
import {
  SyncHook,
  SyncBailHook,
  AsyncSeriesHook,
  AsyncParallelHook
} from './tapable'

export class Compiler {
  hooks = {
    // 运行阶段
    beforeRun: new AsyncSeriesHook<[Compiler]>(['compiler']),
    run: new AsyncSeriesHook<[Compiler]>(['compiler']),
    
    // 编译阶段
    beforeCompile: new AsyncSeriesHook<[CompilationParams]>(['params']),
    compile: new SyncHook<[CompilationParams]>(['params']),
    thisCompilation: new SyncHook<[Compilation, CompilationParams]>(['compilation', 'params']),
    compilation: new SyncHook<[Compilation, CompilationParams]>(['compilation', 'params']),
    make: new AsyncParallelHook<[Compilation]>(['compilation']),
    afterCompile: new AsyncSeriesHook<[Compilation]>(['compilation']),
    
    // 输出阶段
    emit: new AsyncSeriesHook<[Compilation]>(['compilation']),
    afterEmit: new AsyncSeriesHook<[Compilation]>(['compilation']),
    
    // 完成阶段
    done: new AsyncSeriesHook<[Stats]>(['stats']),
    failed: new SyncHook<[Error]>(['error'])
  }
  
  run(callback: RunCallback): void {
    const finalCallback = (err: Error | null, stats?: Stats) => {
      if (err) {
        this.hooks.failed.call(err)
      }
      callback(err, stats)
    }
    
    this.hooks.beforeRun.callAsync(this, (err) => {
      if (err) return finalCallback(err)
      
      this.hooks.run.callAsync(this, (err) => {
        if (err) return finalCallback(err)
        
        this.compile((err, compilation) => {
          if (err) return finalCallback(err)
          
          this.emitAssets(compilation!, (err) => {
            if (err) return finalCallback(err)
            
            const stats = new Stats(compilation!)
            this.hooks.done.callAsync(stats, (err) => {
              finalCallback(err, stats)
            })
          })
        })
      })
    })
  }
  
  compile(callback: CompileCallback): void {
    const params = this.newCompilationParams()
    
    this.hooks.beforeCompile.callAsync(params, (err) => {
      if (err) return callback(err)
      
      this.hooks.compile.call(params)
      
      const compilation = this.newCompilation(params)
      
      this.hooks.make.callAsync(compilation, (err) => {
        if (err) return callback(err)
        
        compilation.seal((err) => {
          if (err) return callback(err)
          
          this.hooks.afterCompile.callAsync(compilation, (err) => {
            callback(err, compilation)
          })
        })
      })
    })
  }
}
```

## 本章小结

- Compiler 通过**20+钩子**暴露完整构建生命周期
- 钩子按阶段分为：环境、入口、运行、编译、输出、完成
- 不同钩子类型适用不同场景
- **thisCompilation** vs **compilation**：前者不包含子编译器
- **make** 是并行钩子，用于添加入口

下一章我们学习 run 方法的实现。
