---
sidebar_position: 24
title: "compile 方法实现：编译入口"
---

# compile 方法实现：编译入口

`compile` 方法是 Webpack 编译的核心入口，它协调模块工厂创建、入口添加、模块构建和代码封装等全部过程。本章深入分析其实现细节。

## compile 方法全貌

```typescript
class Compiler {
  compile(callback: (err: Error | null, compilation?: Compilation) => void): void {
    const params = this.newCompilationParams()
    
    this.hooks.beforeCompile.callAsync(params, (err) => {
      if (err) return callback(err)
      
      this.hooks.compile.call(params)
      
      const compilation = this.newCompilation(params)
      
      this.hooks.make.callAsync(compilation, (err) => {
        if (err) return callback(err)
        
        this.hooks.finishMake.callAsync(compilation, (err) => {
          if (err) return callback(err)
          
          process.nextTick(() => {
            compilation.finish((err) => {
              if (err) return callback(err)
              
              compilation.seal((err) => {
                if (err) return callback(err)
                
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
}
```

## 执行阶段详解

### 阶段1：创建编译参数

```typescript
newCompilationParams(): CompilationParams {
  return {
    normalModuleFactory: this.createNormalModuleFactory(),
    contextModuleFactory: this.createContextModuleFactory()
  }
}
```

**触发钩子**：
- `normalModuleFactory`: 创建普通模块工厂后
- `contextModuleFactory`: 创建上下文模块工厂后

**插件可以做什么**：
- 修改工厂行为
- 添加解析插件
- 注入自定义逻辑

### 阶段2：beforeCompile 钩子

```typescript
this.hooks.beforeCompile.callAsync(params, (err) => {
  // 编译前准备工作
})
```

**典型用途**：
- 清理缓存
- 准备外部资源
- 异步加载配置

```typescript
// 示例：DLL 引用
class DllReferencePlugin {
  apply(compiler: Compiler) {
    compiler.hooks.beforeCompile.tapAsync('DllReferencePlugin', (params, callback) => {
      // 加载 DLL manifest
      fs.readFile(this.manifestPath, (err, content) => {
        if (err) return callback(err)
        this.manifest = JSON.parse(content.toString())
        callback()
      })
    })
  }
}
```

### 阶段3：compile 钩子（同步）

```typescript
this.hooks.compile.call(params)
```

**典型用途**：
- 记录编译开始时间
- 设置编译上下文

### 阶段4：创建 Compilation

```typescript
const compilation = this.newCompilation(params)
```

创建后触发：
1. `thisCompilation` 钩子
2. `compilation` 钩子

### 阶段5：make 钩子（并行）

```typescript
this.hooks.make.callAsync(compilation, (err) => {
  // 模块构建完成
})
```

**这是最核心的阶段**，EntryPlugin 在此添加入口：

```typescript
class EntryPlugin {
  apply(compiler: Compiler) {
    compiler.hooks.make.tapAsync('EntryPlugin', (compilation, callback) => {
      compilation.addEntry(
        this.context,
        this.dependency,
        this.options,
        callback
      )
    })
  }
}
```

make 钩子是**并行钩子**，多个入口同时处理：

```typescript
// 多入口配置
entry: {
  main: './src/index.js',
  admin: './src/admin.js'
}

// 两个 EntryPlugin 同时触发 make 钩子
// compilation.addEntry 并行执行
```

### 阶段6：finishMake 钩子

```typescript
this.hooks.finishMake.callAsync(compilation, (err) => {
  // 所有入口处理完成
})
```

**用途**：
- 确保所有入口模块都已添加
- 在 finish 之前做最后检查

### 阶段7：compilation.finish

```typescript
compilation.finish((err) => {
  // 模块构建收尾
})
```

**内部逻辑**：

```typescript
class Compilation {
  finish(callback: Callback): void {
    // 触发 finishModules 钩子
    this.hooks.finishModules.callAsync(this.modules, (err) => {
      if (err) return callback(err)
      
      // 处理模块警告和错误
      for (const module of this.modules) {
        const warnings = module.getWarnings()
        const errors = module.getErrors()
        
        if (warnings) {
          for (const warning of warnings) {
            this.warnings.push(warning)
          }
        }
        if (errors) {
          for (const error of errors) {
            this.errors.push(error)
          }
        }
      }
      
      callback()
    })
  }
}
```

### 阶段8：compilation.seal

```typescript
compilation.seal((err) => {
  // 代码封装完成
})
```

seal 是构建的**封装阶段**，包括：
1. 创建 Chunk
2. 优化模块和 Chunk
3. 生成代码
4. 创建资源

```typescript
class Compilation {
  seal(callback: Callback): void {
    this.hooks.seal.call()
    
    // 创建 Chunk
    this.hooks.beforeChunks.call()
    this.createChunks()
    this.hooks.afterChunks.call(this.chunks)
    
    // 优化
    this.hooks.optimize.call()
    
    // 优化模块
    while (this.hooks.optimizeModules.call(this.modules)) {
      // 循环直到不需要优化
    }
    this.hooks.afterOptimizeModules.call(this.modules)
    
    // 优化 Chunk
    while (this.hooks.optimizeChunks.call(this.chunks, this.chunkGroups)) {
      // 循环直到不需要优化
    }
    this.hooks.afterOptimizeChunks.call(this.chunks, this.chunkGroups)
    
    // Tree Shaking
    this.hooks.optimizeTree.callAsync(this.chunks, this.modules, (err) => {
      if (err) return callback(err)
      
      // 代码生成
      this.createModuleHashes()
      this.codeGeneration((err) => {
        if (err) return callback(err)
        
        // 创建资源
        this.createChunkAssets((err) => {
          if (err) return callback(err)
          
          // 处理资源
          this.hooks.processAssets.callAsync(this.assets, (err) => {
            if (err) return callback(err)
            
            this.hooks.afterProcessAssets.call(this.assets)
            callback()
          })
        })
      })
    })
  }
}
```

### 阶段9：afterCompile 钩子

```typescript
this.hooks.afterCompile.callAsync(compilation, (err) => {
  callback(err, compilation)
})
```

**用途**：
- 添加额外的文件依赖
- 记录构建结果
- 触发后续处理

```typescript
// 示例：添加配置文件依赖
compiler.hooks.afterCompile.tapAsync('ConfigPlugin', (compilation, callback) => {
  // 让 webpack 监听配置文件
  compilation.fileDependencies.add(configPath)
  callback()
})
```

## 错误处理策略

### 构建过程中的错误

```typescript
class Compilation {
  // 模块构建错误不会中断整个构建
  buildModule(module: Module, callback: Callback): void {
    module.build(this, (err) => {
      if (err) {
        // 记录错误，但继续构建其他模块
        this.errors.push(err)
        this.hooks.failedModule.call(module, err)
      } else {
        this.hooks.succeedModule.call(module)
      }
      callback()  // 不传递错误
    })
  }
}
```

### 严重错误中断构建

```typescript
class Compilation {
  seal(callback: Callback): void {
    try {
      this.createChunks()
    } catch (err) {
      // 严重错误中断构建
      return callback(err)
    }
    
    // 继续其他步骤
  }
}
```

## process.nextTick 的作用

```typescript
this.hooks.finishMake.callAsync(compilation, (err) => {
  process.nextTick(() => {
    compilation.finish((err) => {
      // ...
    })
  })
})
```

**为什么使用 process.nextTick？**

1. **避免栈溢出**：深度递归时释放调用栈
2. **确保异步**：让其他事件有机会处理
3. **隔离阶段**：清晰地分隔 make 和 seal 阶段

## Mini-Webpack 完整实现

```typescript
// src/Compiler.ts
export class Compiler {
  compile(callback: CompileCallback): void {
    // 1. 创建参数
    const params = this.newCompilationParams()
    
    // 2. beforeCompile 钩子
    this.hooks.beforeCompile.callAsync(params, (err) => {
      if (err) return callback(err)
      
      // 3. compile 钩子（同步）
      this.hooks.compile.call(params)
      
      // 4. 创建 Compilation
      const compilation = this.newCompilation(params)
      
      // 5. make 钩子（入口处理）
      this.hooks.make.callAsync(compilation, (err) => {
        if (err) return callback(err)
        
        // 6. 等待所有模块构建完成
        setImmediate(() => {
          compilation.finish((err) => {
            if (err) return callback(err)
            
            // 7. seal 封装阶段
            compilation.seal((err) => {
              if (err) return callback(err)
              
              // 8. afterCompile 钩子
              this.hooks.afterCompile.callAsync(compilation, (err) => {
                callback(err, compilation)
              })
            })
          })
        })
      })
    })
  }
  
  newCompilationParams(): CompilationParams {
    const normalModuleFactory = new NormalModuleFactory(this)
    
    return { normalModuleFactory }
  }
  
  newCompilation(params: CompilationParams): Compilation {
    const compilation = new Compilation(this)
    compilation.params = params
    
    this.hooks.thisCompilation.call(compilation, params)
    this.hooks.compilation.call(compilation, params)
    
    return compilation
  }
}

// 使用示例
const compiler = new Compiler(options)

compiler.run((err, stats) => {
  if (err) {
    console.error('Build failed:', err)
    return
  }
  
  if (stats.hasErrors()) {
    console.error('Build has errors:')
    stats.compilation.errors.forEach(e => console.error(e))
  }
  
  console.log('Build successful!')
  console.log(stats.toString())
})
```

## compile 方法时序图

```
Compiler                          Compilation                     Module
   │                                  │                              │
   │ beforeCompile.callAsync          │                              │
   │────────────────────────────────► │                              │
   │                                  │                              │
   │ compile.call                     │                              │
   │────────────────────────────────► │                              │
   │                                  │                              │
   │ newCompilation                   │                              │
   │──────────────────────────────────┤                              │
   │                                  │                              │
   │ thisCompilation.call             │                              │
   │──────────────────────────────────┤                              │
   │                                  │                              │
   │ compilation.call                 │                              │
   │──────────────────────────────────┤                              │
   │                                  │                              │
   │ make.callAsync                   │                              │
   │────────────────────────────────► │                              │
   │                                  │ addEntry                     │
   │                                  │────────────────────────────► │
   │                                  │                              │
   │                                  │ build                        │
   │                                  │◄───────────────────────────┤│
   │                                  │                              │
   │ finishMake.callAsync             │                              │
   │────────────────────────────────► │                              │
   │                                  │                              │
   │                                  │ finish                       │
   │                                  │────────────────────────────► │
   │                                  │                              │
   │                                  │ seal                         │
   │                                  │────────────────────────────► │
   │                                  │                              │
   │ afterCompile.callAsync           │                              │
   │────────────────────────────────► │                              │
   │                                  │                              │
   │ callback(err, compilation)       │                              │
   │◄──────────────────────────────── │                              │
```

## 本章小结

- `compile` 方法协调整个编译过程
- **make 钩子**是模块构建的起点
- **seal** 阶段执行优化和代码生成
- 错误分为**可恢复**和**严重**两类
- `process.nextTick` 用于隔离阶段和避免栈溢出

下一章我们学习 ContextModuleFactory 上下文模块工厂。
