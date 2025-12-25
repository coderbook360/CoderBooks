---
sidebar_position: 22
title: "watch 方法实现：监听模式"
---

# watch 方法实现：监听模式

监听模式是开发阶段的核心功能，它监控文件变化并自动重新构建。本章深入分析 watch 方法的实现原理。

## 监听模式概览

```typescript
const watching = compiler.watch(
  {
    aggregateTimeout: 300,
    poll: undefined,
    ignored: /node_modules/
  },
  (err, stats) => {
    console.log('Build completed')
  }
)

// 稍后停止监听
watching.close(() => {
  console.log('Watch stopped')
})
```

## 核心类：Watching

```typescript
class Watching {
  compiler: Compiler
  watchOptions: WatchOptions
  callback: WatchCallback
  
  running: boolean = false
  invalid: boolean = false
  closed: boolean = false
  
  // 文件监听器
  watcher: Watcher | null = null
  
  // 暂停状态
  suspended: boolean = false
  
  // 当前编译
  compilation: Compilation | null = null
  
  constructor(
    compiler: Compiler,
    watchOptions: WatchOptions,
    callback: WatchCallback
  ) {
    this.compiler = compiler
    this.watchOptions = watchOptions
    this.callback = callback
    
    // 立即开始首次构建
    this._go()
  }
}
```

## watch 方法实现

```typescript
class Compiler {
  watching: Watching | null = null
  
  watch(watchOptions: WatchOptions, callback: WatchCallback): Watching {
    if (this.running) {
      throw new Error('Cannot watch while compiler is running')
    }
    
    this.watching = new Watching(this, watchOptions, callback)
    return this.watching
  }
}
```

## Watching 核心流程

### 启动流程

```typescript
class Watching {
  private _go(): void {
    // 防止重复运行
    if (this.running) return
    
    this.running = true
    
    // 记录开始时间
    const startTime = Date.now()
    
    // 触发 watchRun 钩子
    this.compiler.hooks.watchRun.callAsync(this.compiler, (err) => {
      if (err) return this._done(err)
      
      // 执行编译
      this.compiler.compile((err, compilation) => {
        if (err) return this._done(err)
        
        this.compilation = compilation
        
        // 输出资源
        this.compiler.emitAssets(compilation!, (err) => {
          if (err) return this._done(err)
          
          // 创建统计信息
          const stats = new Stats(compilation!)
          
          // 完成本次构建
          this._done(null, stats)
        })
      })
    })
  }
  
  private _done(err: Error | null, stats?: Stats): void {
    this.running = false
    
    // 调用回调
    if (this.callback) {
      this.callback(err, stats)
    }
    
    // 如果已关闭，不再监听
    if (this.closed) return
    
    // 设置文件监听
    if (!this.watcher) {
      this._setupWatcher()
    }
    
    // 如果在构建期间有文件变化，重新构建
    if (this.invalid) {
      this.invalid = false
      this._go()
    }
  }
}
```

### 文件监听

```typescript
class Watching {
  private _setupWatcher(): void {
    const { compilation, compiler } = this
    
    // 收集需要监听的文件
    const files = new Set<string>()
    const directories = new Set<string>()
    const missing = new Set<string>()
    
    // 从 compilation 收集依赖
    if (compilation) {
      // 文件依赖
      for (const file of compilation.fileDependencies) {
        files.add(file)
      }
      
      // 目录依赖
      for (const dir of compilation.contextDependencies) {
        directories.add(dir)
      }
      
      // 缺失依赖（可能会创建）
      for (const file of compilation.missingDependencies) {
        missing.add(file)
      }
    }
    
    // 创建监听器
    this.watcher = compiler.watchFileSystem.watch(
      files,
      directories,
      missing,
      this.startTime,
      this.watchOptions,
      (
        err,
        filesModified,
        directoriesModified,
        missingModified,
        fileTimestamps,
        directoryTimestamps
      ) => {
        if (err) {
          return this.callback(err)
        }
        
        // 触发 invalid 钩子
        this._invalidate(filesModified, directoryTimestamps)
      },
      (fileName, changeTime) => {
        // 单个文件变化
        this.compiler.hooks.invalid.call(fileName, changeTime)
      }
    )
  }
  
  private _invalidate(
    files?: Set<string>,
    directories?: Map<string, number>
  ): void {
    // 如果正在构建，标记为无效
    if (this.running) {
      this.invalid = true
      return
    }
    
    // 触发重新构建
    this._go()
  }
}
```

### 关闭监听

```typescript
class Watching {
  close(callback?: () => void): void {
    if (this.closed) {
      callback?.()
      return
    }
    
    this.closed = true
    
    // 停止文件监听
    if (this.watcher) {
      this.watcher.close()
      this.watcher = null
    }
    
    // 触发 watchClose 钩子
    this.compiler.hooks.watchClose.call()
    
    // 清理
    this.compiler.watching = null
    
    callback?.()
  }
  
  // 暂停/恢复
  suspend(): void {
    this.suspended = true
  }
  
  resume(): void {
    if (!this.suspended) return
    this.suspended = false
    this._invalidate()
  }
}
```

## WatchOptions 详解

```typescript
interface WatchOptions {
  // 聚合延迟：文件变化后等待一段时间再构建
  // 避免保存多个文件时多次构建
  aggregateTimeout?: number  // 默认 200ms
  
  // 轮询间隔（用于网络文件系统）
  poll?: number | boolean
  
  // 忽略的文件
  ignored?: RegExp | string | string[]
  
  // 是否跟踪符号链接
  followSymlinks?: boolean
  
  // stdin 关闭时停止监听
  stdin?: boolean
}
```

### 聚合延迟的作用

```typescript
// 场景：保存多个文件
// 用户按 Ctrl+S 保存所有文件

// 没有聚合延迟：
// t=0ms:   a.js 变化 → 开始构建
// t=10ms:  b.js 变化 → 当前构建作废，重新构建
// t=20ms:  c.js 变化 → 当前构建作废，重新构建

// 有聚合延迟 (200ms)：
// t=0ms:   a.js 变化 → 等待...
// t=10ms:  b.js 变化 → 继续等待...
// t=20ms:  c.js 变化 → 继续等待...
// t=220ms: 开始构建（一次构建所有变化）
```

## 文件系统监听器

### 基于 chokidar

```typescript
import chokidar from 'chokidar'

class NodeWatchFileSystem {
  watch(
    files: Iterable<string>,
    directories: Iterable<string>,
    missing: Iterable<string>,
    startTime: number,
    options: WatchOptions,
    callback: WatchCallback,
    callbackUndelayed: (file: string, time: number) => void
  ): Watcher {
    const watchedFiles = new Set(files)
    const watchedDirs = new Set(directories)
    
    // 创建 chokidar 监听器
    const watcher = chokidar.watch(
      [...watchedFiles, ...watchedDirs],
      {
        ignored: options.ignored,
        ignoreInitial: true,
        persistent: true,
        usePolling: !!options.poll,
        interval: typeof options.poll === 'number' ? options.poll : 100
      }
    )
    
    // 收集变化
    const changes: Map<string, number> = new Map()
    let aggregateTimer: NodeJS.Timeout | null = null
    
    const onFileChange = (type: string, filePath: string) => {
      const time = Date.now()
      changes.set(filePath, time)
      
      // 立即通知
      callbackUndelayed(filePath, time)
      
      // 聚合处理
      if (aggregateTimer) {
        clearTimeout(aggregateTimer)
      }
      
      aggregateTimer = setTimeout(() => {
        const changedFiles = new Set(changes.keys())
        changes.clear()
        
        callback(
          null,
          changedFiles,
          new Set(),
          new Set(),
          new Map(),
          new Map()
        )
      }, options.aggregateTimeout || 200)
    }
    
    watcher.on('change', (path) => onFileChange('change', path))
    watcher.on('add', (path) => onFileChange('add', path))
    watcher.on('unlink', (path) => onFileChange('unlink', path))
    
    return {
      close: () => {
        if (aggregateTimer) {
          clearTimeout(aggregateTimer)
        }
        watcher.close()
      }
    }
  }
}
```

### 基于原生 fs.watch

```typescript
class NativeWatchFileSystem {
  watch(
    files: Iterable<string>,
    directories: Iterable<string>,
    missing: Iterable<string>,
    startTime: number,
    options: WatchOptions,
    callback: WatchCallback
  ): Watcher {
    const watchers: fs.FSWatcher[] = []
    
    // 监听文件
    for (const file of files) {
      try {
        const watcher = fs.watch(file, (eventType, filename) => {
          callback(null, new Set([file]), new Set(), new Set(), new Map(), new Map())
        })
        watchers.push(watcher)
      } catch (e) {
        // 文件可能不存在
      }
    }
    
    // 监听目录
    for (const dir of directories) {
      try {
        const watcher = fs.watch(dir, { recursive: true }, (eventType, filename) => {
          const fullPath = path.join(dir, filename || '')
          callback(null, new Set([fullPath]), new Set(), new Set(), new Map(), new Map())
        })
        watchers.push(watcher)
      } catch (e) {
        // 目录可能不存在
      }
    }
    
    return {
      close: () => {
        watchers.forEach(w => w.close())
      }
    }
  }
}
```

## Mini-Webpack 实现

```typescript
// src/Watching.ts
import * as fs from 'fs'
import * as path from 'path'

export class Watching {
  compiler: Compiler
  callback: WatchCallback
  running: boolean = false
  invalid: boolean = false
  closed: boolean = false
  watcher: fs.FSWatcher | null = null
  
  private aggregateTimer: NodeJS.Timeout | null = null
  private watchedFiles: Set<string> = new Set()
  
  constructor(
    compiler: Compiler,
    watchOptions: WatchOptions,
    callback: WatchCallback
  ) {
    this.compiler = compiler
    this.callback = callback
    
    // 首次构建
    this.build()
  }
  
  build(): void {
    if (this.running) return
    this.running = true
    
    const startTime = Date.now()
    
    this.compiler.hooks.watchRun.callAsync(this.compiler, (err) => {
      if (err) return this.done(err)
      
      this.compiler.compile((err, compilation) => {
        if (err) return this.done(err)
        
        this.compiler.emitAssets(compilation!, (err) => {
          if (err) return this.done(err)
          
          const stats = new Stats(compilation!)
          
          // 收集依赖文件
          this.collectWatchFiles(compilation!)
          
          this.done(null, stats)
        })
      })
    })
  }
  
  private collectWatchFiles(compilation: Compilation): void {
    // 收集所有源文件
    for (const module of compilation.modules) {
      if (module.resource) {
        this.watchedFiles.add(module.resource)
      }
    }
    
    // 添加入口文件
    for (const [name, entry] of Object.entries(this.compiler.options.entry)) {
      for (const file of entry.import) {
        const fullPath = path.resolve(this.compiler.context, file)
        this.watchedFiles.add(fullPath)
      }
    }
  }
  
  private done(err: Error | null, stats?: Stats): void {
    this.running = false
    
    // 调用回调
    this.callback(err, stats)
    
    if (this.closed) return
    
    // 设置监听
    this.setupWatcher()
    
    // 如果有变化，重新构建
    if (this.invalid) {
      this.invalid = false
      this.build()
    }
  }
  
  private setupWatcher(): void {
    // 清理旧监听器
    if (this.watcher) {
      this.watcher.close()
    }
    
    // 监听源文件目录
    const srcDir = path.resolve(this.compiler.context, 'src')
    
    if (!fs.existsSync(srcDir)) return
    
    this.watcher = fs.watch(
      srcDir,
      { recursive: true },
      (eventType, filename) => {
        if (!filename) return
        
        const fullPath = path.join(srcDir, filename)
        
        // 忽略非 JS 文件
        if (!fullPath.endsWith('.js') && !fullPath.endsWith('.ts')) {
          return
        }
        
        // 触发 invalid 钩子
        this.compiler.hooks.invalid.call(fullPath, Date.now())
        
        // 聚合延迟
        this.scheduleRebuild()
      }
    )
  }
  
  private scheduleRebuild(): void {
    if (this.aggregateTimer) {
      clearTimeout(this.aggregateTimer)
    }
    
    this.aggregateTimer = setTimeout(() => {
      this.aggregateTimer = null
      
      if (this.running) {
        this.invalid = true
      } else {
        this.build()
      }
    }, 200)
  }
  
  close(callback?: () => void): void {
    if (this.closed) {
      callback?.()
      return
    }
    
    this.closed = true
    
    if (this.watcher) {
      this.watcher.close()
      this.watcher = null
    }
    
    if (this.aggregateTimer) {
      clearTimeout(this.aggregateTimer)
    }
    
    this.compiler.hooks.watchClose.call()
    this.compiler.watching = null
    
    callback?.()
  }
}

// Compiler 中的 watch 方法
class Compiler {
  watching: Watching | null = null
  
  watch(
    watchOptions: WatchOptions,
    callback: WatchCallback
  ): Watching {
    if (this.running) {
      throw new Error('Compiler is already running')
    }
    
    this.watching = new Watching(this, watchOptions, callback)
    return this.watching
  }
}
```

## 监听模式与 HMR 的关系

```
监听模式 (watch)
    │
    │ 文件变化
    ↓
重新编译
    │
    │ 生成新资源
    ↓
通知开发服务器
    │
    │ HMR 运行时
    ↓
浏览器热更新
```

监听模式只负责**文件监听和重新编译**，HMR（热模块替换）是额外的功能，需要配合 webpack-dev-server 使用。

## 本章小结

- `watch` 方法创建 `Watching` 实例管理监听模式
- 核心流程：构建 → 监听 → 文件变化 → 重新构建
- **聚合延迟**避免频繁构建
- 文件监听基于 **chokidar** 或原生 **fs.watch**
- 监听模式与 HMR 是不同的概念

下一章我们学习 createCompilation 方法的实现。
