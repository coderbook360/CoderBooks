---
sidebar_position: 51
title: "enhanced-resolve 核心原理"
---

# enhanced-resolve 核心原理

Webpack 使用 enhanced-resolve 库进行模块解析。这个库提供了比 Node.js 原生解析更强大的功能。本章深入分析其核心原理。

## enhanced-resolve 简介

```bash
npm install enhanced-resolve
```

```typescript
import { ResolverFactory } from 'enhanced-resolve';

const resolver = ResolverFactory.createResolver({
  fileSystem: fs,
  extensions: ['.js', '.json'],
  mainFields: ['browser', 'module', 'main'],
});

resolver.resolve({}, '/project', 'lodash', {}, (err, result) => {
  console.log(result);  // /project/node_modules/lodash/lodash.js
});
```

## 架构概览

```
┌────────────────────────────────────────────────────┐
│                 ResolverFactory                     │
├────────────────────────────────────────────────────┤
│                    Resolver                         │
│  ┌──────────────────────────────────────────────┐  │
│  │                   Hooks                       │  │
│  │  resolve → parsedResolve → describedResolve  │  │
│  │  → rawModule → module → relative → ...       │  │
│  └──────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────┐  │
│  │                  Plugins                      │  │
│  │  ParsePlugin, DescriptionFilePlugin,         │  │
│  │  ModulesInRootPlugin, MainFieldPlugin, ...   │  │
│  └──────────────────────────────────────────────┘  │
├────────────────────────────────────────────────────┤
│                  FileSystem                         │
│  CachedInputFileSystem, SyncAsyncFileSystemDecorator│
└────────────────────────────────────────────────────┘
```

## 核心类

### Resolver

```typescript
export class Resolver {
  // 钩子系统
  hooks: {
    resolve: AsyncSeriesBailHook<[ResolveRequest, ResolveContext], ResolveResult>;
    parsedResolve: AsyncSeriesBailHook<[ResolveRequest, ResolveContext], ResolveResult>;
    describedResolve: AsyncSeriesBailHook<[ResolveRequest, ResolveContext], ResolveResult>;
    rawModule: AsyncSeriesBailHook<[ResolveRequest, ResolveContext], ResolveResult>;
    module: AsyncSeriesBailHook<[ResolveRequest, ResolveContext], ResolveResult>;
    relative: AsyncSeriesBailHook<[ResolveRequest, ResolveContext], ResolveResult>;
    describedRelative: AsyncSeriesBailHook<[ResolveRequest, ResolveContext], ResolveResult>;
    directory: AsyncSeriesBailHook<[ResolveRequest, ResolveContext], ResolveResult>;
    existingDirectory: AsyncSeriesBailHook<[ResolveRequest, ResolveContext], ResolveResult>;
    undescribedExistingDirectory: AsyncSeriesBailHook<[ResolveRequest, ResolveContext], ResolveResult>;
    existingFile: AsyncSeriesBailHook<[ResolveRequest, ResolveContext], ResolveResult>;
    resolved: AsyncSeriesHook<[ResolveRequest, ResolveContext]>;
  };
  
  // 文件系统
  fileSystem: FileSystem;
  
  // 选项
  options: ResolverOptions;
  
  /**
   * 解析入口
   */
  resolve(
    context: object,
    path: string,
    request: string,
    resolveContext: ResolveContext,
    callback: ResolveCallback
  ): void {
    const obj: ResolveRequest = {
      context,
      path,
      request,
    };
    
    // 开始解析流程
    this.doResolve(this.hooks.resolve, obj, null, resolveContext, callback);
  }
  
  /**
   * 执行解析步骤
   */
  doResolve(
    hook: AsyncSeriesBailHook<[ResolveRequest, ResolveContext], ResolveResult>,
    request: ResolveRequest,
    message: string | null,
    resolveContext: ResolveContext,
    callback: ResolveCallback
  ): void {
    // 调用钩子
    hook.callAsync(request, resolveContext, (err, result) => {
      if (err) return callback(err);
      if (result) return callback(null, result);
      callback();  // 继续下一个钩子
    });
  }
}
```

### ResolveRequest

```typescript
export interface ResolveRequest {
  // 上下文对象（透传）
  context?: object;
  
  // 当前解析路径
  path: string;
  
  // 请求字符串
  request?: string;
  
  // 查询字符串
  query?: string;
  
  // 片段
  fragment?: string;
  
  // 目录标志
  directory?: boolean;
  
  // 模块标志
  module?: boolean;
  
  // 文件标志
  file?: boolean;
  
  // 内部请求
  internal?: boolean;
  
  // 完全指定（不需要补全扩展名）
  fullySpecified?: boolean;
  
  // 描述文件信息
  descriptionFilePath?: string;
  descriptionFileData?: object;
  descriptionFileRoot?: string;
  relativePath?: string;
  
  // 忽略的符号链接
  ignoreSymlinks?: boolean;
}
```

## 插件系统

### 插件接口

```typescript
export interface ResolverPlugin {
  apply(resolver: Resolver): void;
}
```

### ParsePlugin

解析请求字符串：

```typescript
export class ParsePlugin implements ResolverPlugin {
  constructor(
    private source: string,
    private target: string
  ) {}
  
  apply(resolver: Resolver): void {
    const target = resolver.ensureHook(this.target);
    
    resolver.getHook(this.source).tapAsync(
      'ParsePlugin',
      (request, resolveContext, callback) => {
        const parsed = this.parse(request.request || '');
        
        const obj: ResolveRequest = {
          ...request,
          request: parsed.request,
          query: parsed.query,
          fragment: parsed.fragment,
          module: parsed.module,
          file: parsed.file,
          directory: parsed.directory,
          internal: parsed.internal,
        };
        
        resolver.doResolve(target, obj, null, resolveContext, callback);
      }
    );
  }
  
  private parse(request: string): ParsedRequest {
    // 解析 query 和 fragment
    let query = '';
    let fragment = '';
    
    const fragmentIndex = request.indexOf('#');
    if (fragmentIndex >= 0) {
      fragment = request.slice(fragmentIndex);
      request = request.slice(0, fragmentIndex);
    }
    
    const queryIndex = request.indexOf('?');
    if (queryIndex >= 0) {
      query = request.slice(queryIndex);
      request = request.slice(0, queryIndex);
    }
    
    // 判断类型
    const module = !request.startsWith('.') && !path.isAbsolute(request);
    const directory = request.endsWith('/');
    const internal = request.startsWith('#');
    
    return {
      request: directory ? request.slice(0, -1) : request,
      query,
      fragment,
      module,
      directory,
      internal,
      file: !directory,
    };
  }
}
```

### DescriptionFilePlugin

读取 package.json：

```typescript
export class DescriptionFilePlugin implements ResolverPlugin {
  constructor(
    private source: string,
    private filenames: string[],
    private target: string
  ) {}
  
  apply(resolver: Resolver): void {
    const target = resolver.ensureHook(this.target);
    
    resolver.getHook(this.source).tapAsync(
      'DescriptionFilePlugin',
      (request, resolveContext, callback) => {
        const directory = request.path;
        
        // 向上查找描述文件
        this.findDescriptionFile(
          resolver.fileSystem,
          directory,
          this.filenames,
          (err, descriptionFilePath, descriptionFileData) => {
            if (err) return callback(err);
            
            if (descriptionFilePath) {
              const obj: ResolveRequest = {
                ...request,
                descriptionFilePath,
                descriptionFileData,
                descriptionFileRoot: path.dirname(descriptionFilePath),
                relativePath: path.relative(
                  path.dirname(descriptionFilePath),
                  request.path
                ) || '.',
              };
              
              resolver.doResolve(target, obj, null, resolveContext, callback);
            } else {
              // 没有找到，继续
              resolver.doResolve(target, request, null, resolveContext, callback);
            }
          }
        );
      }
    );
  }
  
  private findDescriptionFile(
    fs: FileSystem,
    directory: string,
    filenames: string[],
    callback: DescriptionFileCallback
  ): void {
    const tryFile = (index: number): void => {
      if (index >= filenames.length) {
        // 当前目录没有，尝试父目录
        const parent = path.dirname(directory);
        if (parent === directory) {
          return callback(null);  // 到根目录了
        }
        return this.findDescriptionFile(fs, parent, filenames, callback);
      }
      
      const filePath = path.join(directory, filenames[index]);
      fs.readFile(filePath, (err, content) => {
        if (err) {
          return tryFile(index + 1);
        }
        
        try {
          const data = JSON.parse(content.toString());
          callback(null, filePath, data);
        } catch {
          tryFile(index + 1);
        }
      });
    };
    
    tryFile(0);
  }
}
```

### ModulesInRootPlugin

在指定目录查找模块：

```typescript
export class ModulesInRootPlugin implements ResolverPlugin {
  constructor(
    private source: string,
    private path: string,
    private target: string
  ) {}
  
  apply(resolver: Resolver): void {
    const target = resolver.ensureHook(this.target);
    
    resolver.getHook(this.source).tapAsync(
      'ModulesInRootPlugin',
      (request, resolveContext, callback) => {
        const modulePath = path.join(this.path, request.request || '');
        
        const obj: ResolveRequest = {
          ...request,
          path: modulePath,
          request: undefined,
        };
        
        resolver.doResolve(target, obj, null, resolveContext, callback);
      }
    );
  }
}
```

### ModulesInHierarchicalDirectoriesPlugin

逐级向上查找 node_modules：

```typescript
export class ModulesInHierarchicalDirectoriesPlugin implements ResolverPlugin {
  constructor(
    private source: string,
    private directories: string[],
    private target: string
  ) {}
  
  apply(resolver: Resolver): void {
    const target = resolver.ensureHook(this.target);
    
    resolver.getHook(this.source).tapAsync(
      'ModulesInHierarchicalDirectoriesPlugin',
      (request, resolveContext, callback) => {
        const startPath = request.path;
        const moduleName = request.request;
        
        // 生成所有可能的路径
        const paths = this.generatePaths(startPath, this.directories);
        
        // 依次尝试
        const tryPath = (index: number): void => {
          if (index >= paths.length) {
            return callback();  // 都没找到
          }
          
          const modulePath = path.join(paths[index], moduleName || '');
          
          resolver.fileSystem.stat(modulePath, (err, stat) => {
            if (!err && stat) {
              const obj: ResolveRequest = {
                ...request,
                path: modulePath,
                request: undefined,
              };
              resolver.doResolve(target, obj, null, resolveContext, callback);
            } else {
              tryPath(index + 1);
            }
          });
        };
        
        tryPath(0);
      }
    );
  }
  
  private generatePaths(startPath: string, directories: string[]): string[] {
    const paths: string[] = [];
    let current = startPath;
    
    while (true) {
      for (const dir of directories) {
        paths.push(path.join(current, dir));
      }
      
      const parent = path.dirname(current);
      if (parent === current) break;
      current = parent;
    }
    
    return paths;
  }
}
```

### MainFieldPlugin

处理 package.json 的主字段：

```typescript
export class MainFieldPlugin implements ResolverPlugin {
  constructor(
    private source: string,
    private field: string,
    private target: string
  ) {}
  
  apply(resolver: Resolver): void {
    const target = resolver.ensureHook(this.target);
    
    resolver.getHook(this.source).tapAsync(
      'MainFieldPlugin',
      (request, resolveContext, callback) => {
        if (!request.descriptionFileData) {
          return callback();
        }
        
        const fieldValue = request.descriptionFileData[this.field];
        if (!fieldValue) {
          return callback();
        }
        
        // 解析字段值
        const mainPath = path.join(
          request.descriptionFileRoot || request.path,
          fieldValue
        );
        
        const obj: ResolveRequest = {
          ...request,
          path: mainPath,
          request: undefined,
        };
        
        resolver.doResolve(target, obj, null, resolveContext, callback);
      }
    );
  }
}
```

### ExtensionsPlugin（FileAppendPlugin）

尝试扩展名：

```typescript
export class FileAppendPlugin implements ResolverPlugin {
  constructor(
    private source: string,
    private appendings: string[],
    private target: string
  ) {}
  
  apply(resolver: Resolver): void {
    const target = resolver.ensureHook(this.target);
    
    resolver.getHook(this.source).tapAsync(
      'FileAppendPlugin',
      (request, resolveContext, callback) => {
        const basePath = request.path;
        
        // 如果已经完全指定，不添加扩展名
        if (request.fullySpecified) {
          return callback();
        }
        
        // 依次尝试扩展名
        const tryAppending = (index: number): void => {
          if (index >= this.appendings.length) {
            return callback();
          }
          
          const appendPath = basePath + this.appendings[index];
          
          resolver.fileSystem.stat(appendPath, (err, stat) => {
            if (!err && stat?.isFile()) {
              const obj: ResolveRequest = {
                ...request,
                path: appendPath,
              };
              resolver.doResolve(target, obj, null, resolveContext, callback);
            } else {
              tryAppending(index + 1);
            }
          });
        };
        
        tryAppending(0);
      }
    );
  }
}
```

## 钩子流程

标准解析流程中的钩子顺序：

```
resolve
   │
   ▼
parsedResolve (ParsePlugin)
   │
   ├── 模块请求 ──► rawModule
   │                   │
   │                   ▼
   │               module (ModulesInHierarchicalDirectoriesPlugin)
   │                   │
   │                   ▼
   │               rawFile/rawDirectory
   │
   └── 相对请求 ──► relative
                       │
                       ▼
                   describedRelative (DescriptionFilePlugin)
                       │
                       ├── 目录 ──► directory
                       │              │
                       │              ▼
                       │          existingDirectory (MainFieldPlugin)
                       │
                       └── 文件 ──► existingFile (FileAppendPlugin)
                                      │
                                      ▼
                                   resolved (最终结果)
```

## 文件系统抽象

### CachedInputFileSystem

```typescript
export class CachedInputFileSystem {
  private statCache = new Map<string, Stat>();
  private readdirCache = new Map<string, string[]>();
  private readFileCache = new Map<string, Buffer>();
  
  constructor(
    private fileSystem: FileSystem,
    private cacheDuration: number
  ) {}
  
  stat(path: string, callback: StatCallback): void {
    const cached = this.statCache.get(path);
    if (cached) {
      return callback(null, cached);
    }
    
    this.fileSystem.stat(path, (err, stat) => {
      if (!err && stat) {
        this.statCache.set(path, stat);
        setTimeout(() => this.statCache.delete(path), this.cacheDuration);
      }
      callback(err, stat);
    });
  }
  
  purge(path?: string): void {
    if (path) {
      this.statCache.delete(path);
      this.readdirCache.delete(path);
      this.readFileCache.delete(path);
    } else {
      this.statCache.clear();
      this.readdirCache.clear();
      this.readFileCache.clear();
    }
  }
}
```

## 总结

enhanced-resolve 的核心设计：

**插件化架构**：
- 每个解析步骤都是一个插件
- 插件通过钩子连接
- 易于扩展和修改

**钩子流程**：
- resolve → parsedResolve → 分支处理
- 模块路径和相对路径分开处理
- 最终汇聚到 resolved

**性能优化**：
- CachedInputFileSystem 缓存文件系统操作
- 解析结果缓存
- 延迟加载

**下一章**：我们将实现 ResolverFactory。
