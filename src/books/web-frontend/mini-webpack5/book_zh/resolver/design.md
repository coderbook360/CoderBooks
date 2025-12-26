---
sidebar_position: 50
title: "Resolver 设计理念"
---

# Resolver 设计理念

模块解析是 Webpack 构建的基础能力。当你写下 `import lodash from 'lodash'` 时，Resolver 负责找到 `node_modules/lodash/lodash.js` 的实际路径。本章深入理解 Resolver 的设计理念。

## 为什么需要 Resolver

### Node.js 的模块解析

Node.js 有自己的模块解析算法：

```javascript
// 相对路径
require('./utils');  // → ./utils.js 或 ./utils/index.js

// 核心模块
require('fs');  // → Node.js 内置模块

// 第三方模块
require('lodash');  // → node_modules/lodash/...
```

### Webpack 的挑战

Webpack 面临更复杂的场景：

1. **多环境**：浏览器、Node.js、Web Worker
2. **多入口**：main、module、browser 字段
3. **别名**：`@` → `src/`
4. **扩展名**：`.ts`、`.tsx`、`.vue`
5. **条件导出**：ESM vs CJS
6. **Loader 解析**：与模块解析规则不同

## 设计目标

```
┌─────────────────────────────────────────────────────┐
│                    Resolver                          │
├─────────────────────────────────────────────────────┤
│  输入：请求字符串 + 上下文                           │
│  输出：绝对路径 + 元信息                             │
├─────────────────────────────────────────────────────┤
│  特性：                                              │
│  - 可配置的解析策略                                  │
│  - 插件化的扩展机制                                  │
│  - 高性能的缓存系统                                  │
│  - 完善的错误提示                                    │
└─────────────────────────────────────────────────────┘
```

## 核心概念

### 请求类型

```typescript
type RequestType = 
  | 'relative'    // 相对路径：./utils, ../lib
  | 'absolute'    // 绝对路径：/opt/lib, C:\lib
  | 'module'      // 模块路径：lodash, @scope/pkg
  | 'internal'    // 内部模块：#internal
  | 'data'        // 数据 URL：data:text/javascript,...
  | 'file';       // 文件 URL：file:///path/to/file
```

### 解析结果

```typescript
export interface ResolveResult {
  // 解析后的绝对路径
  path: string;
  
  // 查询字符串
  query: string;
  
  // 片段标识
  fragment: string;
  
  // package.json 信息
  descriptionFilePath?: string;
  descriptionFileData?: PackageJson;
  descriptionFileRoot?: string;
  
  // 相对路径（相对于 package）
  relativePath?: string;
}
```

## 解析流程

```
请求字符串
    │
    ▼
┌─────────────────┐
│  解析请求类型   │
└────────┬────────┘
         │
    ┌────┴────┐
    ▼         ▼
相对/绝对    模块
    │         │
    ▼         ▼
┌─────────┐ ┌─────────────┐
│尝试扩展名│ │查找node_modules│
└────┬────┘ └──────┬──────┘
     │             │
     ▼             ▼
┌─────────┐ ┌─────────────┐
│尝试目录 │ │解析package.json│
└────┬────┘ └──────┬──────┘
     │             │
     └──────┬──────┘
            ▼
    ┌───────────────┐
    │   返回结果    │
    └───────────────┘
```

## 插件化架构

Resolver 采用类似 Tapable 的钩子系统：

```typescript
export class Resolver {
  hooks = {
    // 解析开始
    resolve: new AsyncSeriesBailHook<[ResolveRequest, ResolveContext], ResolveResult>(['request', 'context']),
    
    // 解析单个步骤
    resolveStep: new SyncHook<[string, ResolveRequest]>(['type', 'request']),
    
    // 没有找到模块
    noResolve: new SyncHook<[ResolveRequest, Error]>(['request', 'error']),
    
    // 解析结果
    result: new AsyncSeriesHook<[ResolveResult, ResolveContext]>(['result', 'context']),
    
    // 描述文件（package.json）
    descriptionFile: new AsyncSeriesHook<[ResolveRequest]>(['request']),
    
    // 目录解析
    directory: new AsyncSeriesHook<[ResolveRequest]>(['request']),
    
    // 文件解析
    file: new AsyncSeriesHook<[ResolveRequest]>(['request']),
  };
}
```

### 内置插件

```typescript
// 解析相对路径
class RelativePlugin {
  apply(resolver: Resolver): void {
    resolver.hooks.resolve.tapAsync('RelativePlugin', (request, context, callback) => {
      if (!request.request.startsWith('.')) {
        return callback();  // 不处理非相对路径
      }
      
      const resolved = path.resolve(request.path, request.request);
      resolver.doResolve(resolver.hooks.file, { ...request, path: resolved }, context, callback);
    });
  }
}

// 解析模块
class ModulePlugin {
  apply(resolver: Resolver): void {
    resolver.hooks.resolve.tapAsync('ModulePlugin', (request, context, callback) => {
      if (request.request.startsWith('.') || path.isAbsolute(request.request)) {
        return callback();  // 不处理相对/绝对路径
      }
      
      // 逐级查找 node_modules
      this.findModuleDirectory(request, context, callback);
    });
  }
}

// 尝试扩展名
class ExtensionsPlugin {
  constructor(private extensions: string[]) {}
  
  apply(resolver: Resolver): void {
    resolver.hooks.file.tapAsync('ExtensionsPlugin', (request, context, callback) => {
      const file = request.path;
      
      // 依次尝试扩展名
      const tryNext = (index: number) => {
        if (index >= this.extensions.length) {
          return callback();  // 全部尝试完毕
        }
        
        const ext = this.extensions[index];
        resolver.fileSystem.stat(file + ext, (err, stat) => {
          if (!err && stat.isFile()) {
            callback(null, { ...request, path: file + ext });
          } else {
            tryNext(index + 1);
          }
        });
      };
      
      tryNext(0);
    });
  }
}
```

## 配置选项

```javascript
// webpack.config.js
module.exports = {
  resolve: {
    // 模块查找目录
    modules: ['node_modules'],
    
    // 扩展名
    extensions: ['.js', '.json', '.wasm'],
    
    // 主文件
    mainFiles: ['index'],
    
    // 主字段
    mainFields: ['browser', 'module', 'main'],
    
    // 别名
    alias: {
      '@': path.resolve(__dirname, 'src'),
      'vue$': 'vue/dist/vue.esm.js',
    },
    
    // 条件名称
    conditionNames: ['webpack', 'production', 'module'],
    
    // 描述文件
    descriptionFiles: ['package.json'],
    
    // exports 字段
    exportsFields: ['exports'],
    
    // imports 字段
    importsFields: ['imports'],
    
    // 是否强制扩展名
    enforceExtension: false,
    
    // 符号链接
    symlinks: true,
    
    // 缓存
    cache: true,
    
    // 回退
    fallback: {
      'path': require.resolve('path-browserify'),
    },
  },
};
```

## 缓存策略

### 多级缓存

```typescript
export class CachedResolver {
  // 解析结果缓存
  private resultCache = new Map<string, ResolveResult>();
  
  // 文件存在性缓存
  private fileExistsCache = new Map<string, boolean>();
  
  // 目录内容缓存
  private directoryCache = new Map<string, string[]>();
  
  // package.json 缓存
  private packageJsonCache = new Map<string, PackageJson>();
  
  resolve(
    context: string,
    request: string,
    callback: ResolveCallback
  ): void {
    const cacheKey = `${context}|${request}`;
    
    // 检查缓存
    const cached = this.resultCache.get(cacheKey);
    if (cached) {
      return callback(null, cached);
    }
    
    // 执行解析
    this.doResolve(context, request, (err, result) => {
      if (!err && result) {
        this.resultCache.set(cacheKey, result);
      }
      callback(err, result);
    });
  }
}
```

### 缓存失效

```typescript
export class CachedResolver {
  /**
   * 清除特定路径的缓存
   */
  purge(path: string): void {
    // 清除相关的结果缓存
    for (const [key, value] of this.resultCache) {
      if (value.path.startsWith(path)) {
        this.resultCache.delete(key);
      }
    }
    
    // 清除文件存在性缓存
    this.fileExistsCache.delete(path);
    
    // 清除目录缓存
    this.directoryCache.delete(path);
  }
  
  /**
   * 清除所有缓存
   */
  purgeAll(): void {
    this.resultCache.clear();
    this.fileExistsCache.clear();
    this.directoryCache.clear();
    this.packageJsonCache.clear();
  }
}
```

## 错误处理

### 友好的错误信息

```typescript
export class Resolver {
  private createNotFoundError(
    request: ResolveRequest,
    triedPaths: string[]
  ): Error {
    const message = [
      `Module not found: Can't resolve '${request.request}'`,
      `in '${request.path}'`,
      '',
      'Tried:',
      ...triedPaths.map(p => `  - ${p}`),
      '',
      'Possible solutions:',
      `  - Install the package: npm install ${request.request}`,
      `  - Check if the path is correct`,
      `  - Add an alias in webpack config`,
    ].join('\n');
    
    const error = new Error(message);
    error.name = 'ModuleNotFoundError';
    return error;
  }
}
```

## 与 Node.js 解析的区别

| 特性 | Node.js | Webpack Resolver |
|------|---------|------------------|
| 扩展名 | .js, .json, .node | 可配置 |
| 主字段 | main | browser, module, main |
| 条件导出 | 支持 | 支持 + 自定义条件 |
| 别名 | 不支持 | 支持 |
| 回退 | 不支持 | 支持 |
| 缓存 | 有 | 可配置 |
| 插件 | 不支持 | 支持 |

## 设计原则

1. **可配置性**：所有解析行为都可以通过配置修改
2. **可扩展性**：插件系统支持自定义解析逻辑
3. **高性能**：多级缓存减少文件系统访问
4. **兼容性**：兼容 Node.js 解析算法
5. **可调试性**：详细的错误信息和调试日志

## 总结

Resolver 是 Webpack 的基础设施：

**核心职责**：
- 将请求字符串转换为绝对路径
- 支持多种请求类型
- 提供丰富的配置选项

**设计特点**：
- 插件化架构
- 多级缓存
- 友好错误提示
- 高度可配置

**下一章**：我们将深入 enhanced-resolve 库的核心原理。
