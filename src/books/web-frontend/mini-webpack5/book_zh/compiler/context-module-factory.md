---
sidebar_position: 25
title: "ContextModuleFactory 上下文模块工厂"
---

# ContextModuleFactory 上下文模块工厂

ContextModuleFactory 负责处理 `require.context` 等动态上下文导入。本章深入分析其设计与实现。

## 什么是上下文模块

上下文模块处理动态导入场景：

```javascript
// require.context 创建上下文
const ctx = require.context('./modules', true, /\.js$/)
ctx.keys().forEach(key => {
  const module = ctx(key)
  console.log(key, module)
})

// 动态 require（部分动态）
const name = 'foo'
const module = require('./modules/' + name + '.js')

// 完全动态（无法静态分析）
const path = getPath()
const module = require(path)  // ⚠️ Webpack 无法处理
```

## 与 NormalModuleFactory 的区别

| 特性 | NormalModuleFactory | ContextModuleFactory |
|------|---------------------|---------------------|
| 处理对象 | 静态导入路径 | 动态/模式导入 |
| 输入 | 确定的文件路径 | 目录 + 匹配模式 |
| 输出 | 单个 NormalModule | ContextModule（包含多个模块） |
| 解析方式 | 精确解析 | 目录扫描 + 正则匹配 |

## ContextModuleFactory 类结构

```typescript
class ContextModuleFactory extends Tapable {
  hooks = {
    // 创建模块前
    beforeResolve: new AsyncSeriesWaterfallHook(['data']),
    // 解析后
    afterResolve: new AsyncSeriesWaterfallHook(['data']),
    // 替代模块
    alternativeRequests: new AsyncSeriesWaterfallHook(['data']),
    // 上下文模块代码
    contextModuleFiles: new SyncWaterfallHook(['files'])
  }
  
  constructor(resolverFactory: ResolverFactory) {
    super()
    this.resolverFactory = resolverFactory
  }
  
  create(
    data: ContextModuleCreateData,
    callback: (err: Error | null, result?: ContextModuleResult) => void
  ): void {
    // 创建上下文模块
  }
}
```

## require.context 语法

```javascript
require.context(
  directory,    // 目录路径
  useSubdirs,   // 是否包含子目录，默认 true
  regExp,       // 匹配模式，默认 /^\.\/.*$/
  mode          // 加载模式：'sync' | 'eager' | 'weak' | 'lazy' | 'lazy-once'
)
```

### 使用示例

```javascript
// 同步加载 ./components 下所有 .vue 文件
const components = require.context('./components', true, /\.vue$/)
components.keys().forEach(key => {
  const component = components(key)
  // 注册组件
})

// 懒加载模式
const pages = require.context('./pages', true, /\.js$/, 'lazy')
async function loadPage(name) {
  const module = await pages(`./${name}.js`)
  return module.default
}
```

## create 方法实现

```typescript
class ContextModuleFactory {
  create(
    data: {
      context: string
      dependencies: ContextDependency[]
      resolveOptions: ResolveOptions
    },
    callback: Callback
  ): void {
    const dependency = data.dependencies[0]
    
    // 提取上下文信息
    const contextData = {
      context: data.context,
      request: dependency.request,
      recursive: dependency.recursive,
      regExp: dependency.regExp,
      mode: dependency.mode,
      category: dependency.category,
      resolveOptions: data.resolveOptions
    }
    
    // beforeResolve 钩子
    this.hooks.beforeResolve.callAsync(contextData, (err, result) => {
      if (err) return callback(err)
      if (!result) return callback()  // 返回 false 跳过
      
      // 解析上下文目录
      this.resolveContext(result, (err, resolved) => {
        if (err) return callback(err)
        
        // afterResolve 钩子
        this.hooks.afterResolve.callAsync(resolved, (err, result) => {
          if (err) return callback(err)
          if (!result) return callback()
          
          // 创建 ContextModule
          const module = new ContextModule(result)
          
          callback(null, {
            module,
            dependencies: data.dependencies
          })
        })
      })
    })
  }
}
```

## 上下文解析

```typescript
class ContextModuleFactory {
  resolveContext(
    data: ContextResolveData,
    callback: Callback
  ): void {
    const { context, request, recursive, regExp } = data
    
    // 解析目录路径
    const contextPath = path.resolve(context, request)
    
    // 验证目录存在
    this.fs.stat(contextPath, (err, stats) => {
      if (err) return callback(err)
      if (!stats.isDirectory()) {
        return callback(new Error(`${contextPath} is not a directory`))
      }
      
      // 扫描目录
      this.scanDirectory(contextPath, recursive, regExp, (err, files) => {
        if (err) return callback(err)
        
        // contextModuleFiles 钩子（可以过滤文件）
        const filteredFiles = this.hooks.contextModuleFiles.call(files)
        
        callback(null, {
          ...data,
          resource: contextPath,
          files: filteredFiles
        })
      })
    })
  }
  
  scanDirectory(
    dir: string,
    recursive: boolean,
    regExp: RegExp,
    callback: (err: Error | null, files?: string[]) => void
  ): void {
    const files: string[] = []
    
    const scan = (currentDir: string, done: Callback) => {
      this.fs.readdir(currentDir, (err, entries) => {
        if (err) return done(err)
        
        let pending = entries.length
        if (pending === 0) return done()
        
        for (const entry of entries) {
          const fullPath = path.join(currentDir, entry)
          
          this.fs.stat(fullPath, (err, stats) => {
            if (err) {
              pending--
              if (pending === 0) done()
              return
            }
            
            if (stats.isDirectory()) {
              if (recursive) {
                scan(fullPath, () => {
                  pending--
                  if (pending === 0) done()
                })
              } else {
                pending--
                if (pending === 0) done()
              }
            } else {
              // 检查是否匹配正则
              const relativePath = './' + path.relative(dir, fullPath)
              if (regExp.test(relativePath)) {
                files.push(relativePath)
              }
              pending--
              if (pending === 0) done()
            }
          })
        }
      })
    }
    
    scan(dir, (err) => callback(err, files))
  }
}
```

## ContextModule 结构

```typescript
class ContextModule extends Module {
  // 上下文目录
  context: string
  
  // 匹配的文件列表
  files: string[]
  
  // 匹配配置
  recursive: boolean
  regExp: RegExp
  mode: ContextMode
  
  constructor(options: ContextModuleOptions) {
    super('context')
    this.context = options.resource
    this.files = options.files
    this.recursive = options.recursive
    this.regExp = options.regExp
    this.mode = options.mode || 'sync'
  }
  
  identifier(): string {
    return `${this.context}|${this.recursive}|${this.regExp}|${this.mode}`
  }
  
  // 生成上下文模块代码
  source(): string {
    const map = this.generateMap()
    
    return `
var map = ${JSON.stringify(map, null, 2)};

function webpackContext(req) {
  var id = webpackContextResolve(req);
  return __webpack_require__(id);
}

function webpackContextResolve(req) {
  if (!Object.prototype.hasOwnProperty.call(map, req)) {
    var e = new Error("Cannot find module '" + req + "'");
    e.code = 'MODULE_NOT_FOUND';
    throw e;
  }
  return map[req];
}

webpackContext.keys = function webpackContextKeys() {
  return Object.keys(map);
};

webpackContext.resolve = webpackContextResolve;
webpackContext.id = ${JSON.stringify(this.identifier())};
module.exports = webpackContext;
    `.trim()
  }
  
  generateMap(): Record<string, string> {
    const map: Record<string, string> = {}
    
    for (const file of this.files) {
      const fullPath = path.join(this.context, file)
      map[file] = fullPath
    }
    
    return map
  }
}
```

## 加载模式

### sync 模式

```javascript
// 同步加载，打包到主 bundle
const ctx = require.context('./modules', true, /\.js$/, 'sync')
const module = ctx('./foo.js')  // 同步获取
```

### lazy 模式

```javascript
// 每个模块单独打包成 chunk
const ctx = require.context('./modules', true, /\.js$/, 'lazy')
ctx('./foo.js').then(module => {  // 返回 Promise
  // 使用模块
})
```

### lazy-once 模式

```javascript
// 所有模块打包成一个 chunk，首次请求时加载
const ctx = require.context('./modules', true, /\.js$/, 'lazy-once')
ctx('./foo.js').then(module => {
  // 首次加载会下载整个 chunk
})
ctx('./bar.js').then(module => {
  // 已经在内存中
})
```

### eager 模式

```javascript
// 立即加载但返回 Promise
const ctx = require.context('./modules', true, /\.js$/, 'eager')
ctx('./foo.js').then(module => {
  // 代码已在主 bundle，但 API 是 Promise
})
```

### weak 模式

```javascript
// 不生成额外代码，仅在模块已加载时获取
const ctx = require.context('./modules', true, /\.js$/, 'weak')
try {
  const module = ctx('./foo.js')  // 如果模块未加载，抛出错误
} catch (e) {
  // 模块未加载
}
```

## Mini-Webpack 实现

```typescript
// src/ContextModuleFactory.ts
import * as fs from 'fs'
import * as path from 'path'

export class ContextModuleFactory {
  hooks = {
    beforeResolve: new AsyncSeriesWaterfallHook<[ContextData]>(['data']),
    afterResolve: new AsyncSeriesWaterfallHook<[ContextData]>(['data'])
  }
  
  create(
    data: {
      context: string
      request: string
      recursive: boolean
      regExp: RegExp
    },
    callback: (err: Error | null, module?: ContextModule) => void
  ): void {
    const contextData = {
      context: data.context,
      request: data.request,
      recursive: data.recursive,
      regExp: data.regExp
    }
    
    this.hooks.beforeResolve.callAsync(contextData, (err, result) => {
      if (err) return callback(err)
      if (!result) return callback(null)
      
      // 解析目录
      const contextPath = path.resolve(result.context, result.request)
      
      // 扫描文件
      this.scanDirectory(
        contextPath,
        result.recursive,
        result.regExp,
        (err, files) => {
          if (err) return callback(err)
          
          const resolvedData = {
            ...result,
            resource: contextPath,
            files
          }
          
          this.hooks.afterResolve.callAsync(resolvedData, (err, final) => {
            if (err) return callback(err)
            if (!final) return callback(null)
            
            const module = new ContextModule(final)
            callback(null, module)
          })
        }
      )
    })
  }
  
  private scanDirectory(
    dir: string,
    recursive: boolean,
    regExp: RegExp,
    callback: (err: Error | null, files?: string[]) => void
  ): void {
    const files: string[] = []
    
    const scan = (currentDir: string): void => {
      const entries = fs.readdirSync(currentDir)
      
      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry)
        const stats = fs.statSync(fullPath)
        
        if (stats.isDirectory() && recursive) {
          scan(fullPath)
        } else if (stats.isFile()) {
          const relativePath = './' + path.relative(dir, fullPath)
          if (regExp.test(relativePath)) {
            files.push(relativePath)
          }
        }
      }
    }
    
    try {
      scan(dir)
      callback(null, files)
    } catch (err) {
      callback(err as Error)
    }
  }
}

// ContextModule 实现
export class ContextModule {
  context: string
  files: string[]
  recursive: boolean
  regExp: RegExp
  
  constructor(data: ContextData) {
    this.context = data.resource!
    this.files = data.files || []
    this.recursive = data.recursive
    this.regExp = data.regExp
  }
  
  identifier(): string {
    return `context|${this.context}|${this.recursive}|${this.regExp}`
  }
  
  source(): string {
    const map: Record<string, string> = {}
    
    for (const file of this.files) {
      map[file] = path.join(this.context, file)
    }
    
    return `
var map = ${JSON.stringify(map, null, 2)};

function webpackContext(req) {
  if (!map[req]) {
    throw new Error("Cannot find module '" + req + "'");
  }
  return __webpack_require__(map[req]);
}

webpackContext.keys = function() {
  return Object.keys(map);
};

module.exports = webpackContext;
    `.trim()
  }
}
```

## 本章小结

- ContextModuleFactory 处理**动态上下文导入**
- 核心功能是**目录扫描 + 正则匹配**
- 生成 ContextModule，包含所有匹配文件的映射
- 支持多种加载模式：sync、lazy、lazy-once、eager、weak
- `require.context` 是实现**动态导入**的关键 API

至此，第三部分 Compiler 核心已全部完成。下一章进入第四部分：Compilation 核心。
