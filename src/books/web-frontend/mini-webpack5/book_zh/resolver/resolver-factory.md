---
sidebar_position: 52
title: "ResolverFactory 实现"
---

# ResolverFactory 实现

ResolverFactory 是创建 Resolver 实例的工厂类。它负责根据配置组装插件，创建不同类型的解析器。

## 设计目标

```typescript
// 创建普通解析器
const normalResolver = ResolverFactory.createResolver({
  extensions: ['.js', '.json'],
  mainFields: ['browser', 'module', 'main'],
  modules: ['node_modules'],
});

// 创建 Loader 解析器
const loaderResolver = ResolverFactory.createResolver({
  extensions: ['.js'],
  mainFields: ['loader', 'main'],
  modules: ['node_modules'],
});
```

## ResolverFactory 实现

```typescript
export interface ResolverOptions {
  // 文件系统
  fileSystem: FileSystem;
  
  // 文件扩展名
  extensions?: string[];
  
  // package.json 主字段
  mainFields?: (string | string[])[];
  
  // 模块目录
  modules?: string[];
  
  // 别名
  alias?: Record<string, string | false>;
  
  // 强制扩展名
  enforceExtension?: boolean;
  
  // 完全指定
  fullySpecified?: boolean;
  
  // 符号链接
  symlinks?: boolean;
  
  // 描述文件
  descriptionFiles?: string[];
  
  // 主文件
  mainFiles?: string[];
  
  // 插件
  plugins?: ResolverPlugin[];
  
  // 缓存
  cache?: boolean;
  cacheDuration?: number;
  
  // exports 字段
  exportsFields?: string[];
  conditionNames?: string[];
  
  // imports 字段
  importsFields?: string[];
}

export class ResolverFactory {
  /**
   * 创建解析器
   */
  static createResolver(options: ResolverOptions): Resolver {
    // 合并默认选项
    const mergedOptions = this.mergeOptions(options);
    
    // 创建文件系统
    const fileSystem = this.createFileSystem(mergedOptions);
    
    // 创建 Resolver 实例
    const resolver = new Resolver(fileSystem, mergedOptions);
    
    // 注册插件
    this.registerPlugins(resolver, mergedOptions);
    
    return resolver;
  }
  
  /**
   * 合并默认选项
   */
  private static mergeOptions(options: ResolverOptions): Required<ResolverOptions> {
    return {
      fileSystem: options.fileSystem,
      extensions: options.extensions || ['.js', '.json', '.node'],
      mainFields: options.mainFields || ['browser', 'module', 'main'],
      modules: options.modules || ['node_modules'],
      alias: options.alias || {},
      enforceExtension: options.enforceExtension ?? false,
      fullySpecified: options.fullySpecified ?? false,
      symlinks: options.symlinks ?? true,
      descriptionFiles: options.descriptionFiles || ['package.json'],
      mainFiles: options.mainFiles || ['index'],
      plugins: options.plugins || [],
      cache: options.cache ?? true,
      cacheDuration: options.cacheDuration ?? 60000,
      exportsFields: options.exportsFields || ['exports'],
      conditionNames: options.conditionNames || ['import', 'require', 'node'],
      importsFields: options.importsFields || ['imports'],
    };
  }
  
  /**
   * 创建文件系统
   */
  private static createFileSystem(options: Required<ResolverOptions>): FileSystem {
    if (options.cache) {
      return new CachedInputFileSystem(
        options.fileSystem,
        options.cacheDuration
      );
    }
    return options.fileSystem;
  }
  
  /**
   * 注册插件
   */
  private static registerPlugins(
    resolver: Resolver,
    options: Required<ResolverOptions>
  ): void {
    // 解析请求
    new ParsePlugin('resolve', 'parsedResolve').apply(resolver);
    
    // 处理别名
    for (const [key, value] of Object.entries(options.alias)) {
      new AliasPlugin('parsedResolve', key, value, 'resolve').apply(resolver);
    }
    
    // 分支：模块 vs 相对路径
    new ModuleKindPlugin('parsedResolve').apply(resolver);
    
    // 模块解析
    this.registerModulePlugins(resolver, options);
    
    // 相对路径解析
    this.registerRelativePlugins(resolver, options);
    
    // 目录解析
    this.registerDirectoryPlugins(resolver, options);
    
    // 文件解析
    this.registerFilePlugins(resolver, options);
    
    // 用户自定义插件
    for (const plugin of options.plugins) {
      plugin.apply(resolver);
    }
  }
  
  /**
   * 注册模块解析插件
   */
  private static registerModulePlugins(
    resolver: Resolver,
    options: Required<ResolverOptions>
  ): void {
    // 层级目录查找
    new ModulesInHierarchicalDirectoriesPlugin(
      'rawModule',
      options.modules,
      'module'
    ).apply(resolver);
    
    // 模块到相对路径
    new JoinRequestPlugin('module', 'relative').apply(resolver);
  }
  
  /**
   * 注册相对路径解析插件
   */
  private static registerRelativePlugins(
    resolver: Resolver,
    options: Required<ResolverOptions>
  ): void {
    // 查找描述文件
    new DescriptionFilePlugin(
      'relative',
      options.descriptionFiles,
      'describedRelative'
    ).apply(resolver);
    
    // 分支：目录 vs 文件
    new DirectoryExistsPlugin('describedRelative', 'directory').apply(resolver);
    new FileExistsPlugin('describedRelative', 'existingFile').apply(resolver);
  }
  
  /**
   * 注册目录解析插件
   */
  private static registerDirectoryPlugins(
    resolver: Resolver,
    options: Required<ResolverOptions>
  ): void {
    // 处理 exports 字段
    for (const field of options.exportsFields) {
      new ExportsFieldPlugin(
        'directory',
        options.conditionNames,
        field,
        'relative'
      ).apply(resolver);
    }
    
    // 处理主字段
    for (const mainField of options.mainFields) {
      const field = Array.isArray(mainField) ? mainField : [mainField];
      for (const f of field) {
        new MainFieldPlugin('directory', f, 'relative').apply(resolver);
      }
    }
    
    // 处理主文件
    for (const mainFile of options.mainFiles) {
      new MainFilePlugin('directory', mainFile, 'existingFile').apply(resolver);
    }
  }
  
  /**
   * 注册文件解析插件
   */
  private static registerFilePlugins(
    resolver: Resolver,
    options: Required<ResolverOptions>
  ): void {
    // 符号链接处理
    if (options.symlinks) {
      new SymlinkPlugin('existingFile', 'file').apply(resolver);
    } else {
      new NextPlugin('existingFile', 'file').apply(resolver);
    }
    
    // 扩展名补全
    if (!options.enforceExtension) {
      for (const ext of options.extensions) {
        new FileAppendPlugin('file', ext, 'existingFile').apply(resolver);
      }
    }
    
    // 完成解析
    new ResultPlugin('existingFile').apply(resolver);
  }
}
```

## 核心插件详解

### ModuleKindPlugin

区分模块请求和相对路径请求：

```typescript
export class ModuleKindPlugin implements ResolverPlugin {
  constructor(private source: string) {}
  
  apply(resolver: Resolver): void {
    const moduleHook = resolver.ensureHook('rawModule');
    const relativeHook = resolver.ensureHook('relative');
    
    resolver.getHook(this.source).tapAsync(
      'ModuleKindPlugin',
      (request, resolveContext, callback) => {
        if (request.module) {
          // 模块请求
          resolver.doResolve(
            moduleHook,
            request,
            'resolve as module',
            resolveContext,
            callback
          );
        } else {
          // 相对路径请求
          const obj: ResolveRequest = {
            ...request,
            path: path.resolve(request.path, request.request || ''),
            request: undefined,
          };
          
          resolver.doResolve(
            relativeHook,
            obj,
            'resolve as relative',
            resolveContext,
            callback
          );
        }
      }
    );
  }
}
```

### JoinRequestPlugin

拼接路径：

```typescript
export class JoinRequestPlugin implements ResolverPlugin {
  constructor(
    private source: string,
    private target: string
  ) {}
  
  apply(resolver: Resolver): void {
    const target = resolver.ensureHook(this.target);
    
    resolver.getHook(this.source).tapAsync(
      'JoinRequestPlugin',
      (request, resolveContext, callback) => {
        const obj: ResolveRequest = {
          ...request,
          path: path.join(request.path, request.request || ''),
          relativePath: request.request,
          request: undefined,
        };
        
        resolver.doResolve(target, obj, null, resolveContext, callback);
      }
    );
  }
}
```

### AliasPlugin

处理别名：

```typescript
export class AliasPlugin implements ResolverPlugin {
  constructor(
    private source: string,
    private name: string,
    private alias: string | false,
    private target: string
  ) {}
  
  apply(resolver: Resolver): void {
    const target = resolver.ensureHook(this.target);
    
    resolver.getHook(this.source).tapAsync(
      'AliasPlugin',
      (request, resolveContext, callback) => {
        const requestStr = request.request || '';
        
        // 检查是否匹配别名
        if (this.matchAlias(requestStr)) {
          // 如果别名为 false，表示忽略
          if (this.alias === false) {
            return callback(null, false as any);
          }
          
          // 替换别名
          const newRequest = this.replaceAlias(requestStr);
          
          const obj: ResolveRequest = {
            ...request,
            request: newRequest,
          };
          
          resolver.doResolve(target, obj, null, resolveContext, callback);
        } else {
          callback();  // 不匹配，继续
        }
      }
    );
  }
  
  private matchAlias(request: string): boolean {
    // 精确匹配
    if (request === this.name) return true;
    
    // 前缀匹配（带 /）
    if (request.startsWith(this.name + '/')) return true;
    
    // 通配符匹配
    if (this.name.endsWith('$') && request === this.name.slice(0, -1)) {
      return true;
    }
    
    return false;
  }
  
  private replaceAlias(request: string): string {
    if (request === this.name) {
      return this.alias as string;
    }
    
    return (this.alias as string) + request.slice(this.name.length);
  }
}
```

### DirectoryExistsPlugin

检查目录是否存在：

```typescript
export class DirectoryExistsPlugin implements ResolverPlugin {
  constructor(
    private source: string,
    private target: string
  ) {}
  
  apply(resolver: Resolver): void {
    const target = resolver.ensureHook(this.target);
    
    resolver.getHook(this.source).tapAsync(
      'DirectoryExistsPlugin',
      (request, resolveContext, callback) => {
        const fsPath = request.path;
        
        resolver.fileSystem.stat(fsPath, (err, stat) => {
          if (!err && stat?.isDirectory()) {
            resolver.doResolve(
              target,
              request,
              'existing directory',
              resolveContext,
              callback
            );
          } else {
            callback();  // 不是目录，继续
          }
        });
      }
    );
  }
}
```

### SymlinkPlugin

处理符号链接：

```typescript
export class SymlinkPlugin implements ResolverPlugin {
  constructor(
    private source: string,
    private target: string
  ) {}
  
  apply(resolver: Resolver): void {
    const target = resolver.ensureHook(this.target);
    
    resolver.getHook(this.source).tapAsync(
      'SymlinkPlugin',
      (request, resolveContext, callback) => {
        const fsPath = request.path;
        
        // 解析真实路径
        resolver.fileSystem.realpath(fsPath, (err, realPath) => {
          if (err) {
            return callback();
          }
          
          if (realPath === fsPath) {
            // 不是符号链接
            resolver.doResolve(target, request, null, resolveContext, callback);
          } else {
            // 是符号链接，更新路径
            const obj: ResolveRequest = {
              ...request,
              path: realPath,
            };
            
            resolver.doResolve(
              target,
              obj,
              `resolved symlink to ${realPath}`,
              resolveContext,
              callback
            );
          }
        });
      }
    );
  }
}
```

### ResultPlugin

完成解析：

```typescript
export class ResultPlugin implements ResolverPlugin {
  constructor(private source: string) {}
  
  apply(resolver: Resolver): void {
    resolver.getHook(this.source).tapAsync(
      'ResultPlugin',
      (request, resolveContext, callback) => {
        // 验证文件存在
        resolver.fileSystem.stat(request.path, (err, stat) => {
          if (err || !stat?.isFile()) {
            return callback();
          }
          
          // 构建最终结果
          const result: ResolveResult = {
            path: request.path,
            query: request.query || '',
            fragment: request.fragment || '',
            descriptionFilePath: request.descriptionFilePath,
            descriptionFileData: request.descriptionFileData,
          };
          
          // 触发 resolved 钩子
          resolver.hooks.resolved.callAsync(request, resolveContext, err => {
            if (err) return callback(err);
            callback(null, result);
          });
        });
      }
    );
  }
}
```

## Webpack 中的使用

```typescript
export class WebpackResolverFactory {
  private resolverCache = new Map<string, Resolver>();
  
  /**
   * 获取或创建解析器
   */
  get(
    type: 'normal' | 'context' | 'loader',
    resolveOptions: ResolveOptions
  ): Resolver {
    const cacheKey = type + JSON.stringify(resolveOptions);
    
    let resolver = this.resolverCache.get(cacheKey);
    if (!resolver) {
      resolver = this.createResolver(type, resolveOptions);
      this.resolverCache.set(cacheKey, resolver);
    }
    
    return resolver;
  }
  
  private createResolver(
    type: 'normal' | 'context' | 'loader',
    options: ResolveOptions
  ): Resolver {
    const defaultOptions = this.getDefaultOptions(type);
    
    return ResolverFactory.createResolver({
      ...defaultOptions,
      ...options,
      fileSystem: this.fileSystem,
    });
  }
  
  private getDefaultOptions(type: string): Partial<ResolverOptions> {
    switch (type) {
      case 'normal':
        return {
          extensions: ['.js', '.json', '.wasm'],
          mainFields: ['browser', 'module', 'main'],
          conditionNames: ['import', 'require', 'node'],
        };
        
      case 'loader':
        return {
          extensions: ['.js'],
          mainFields: ['loader', 'main'],
          conditionNames: ['require', 'node'],
        };
        
      case 'context':
        return {
          extensions: ['.js', '.json'],
          mainFields: ['browser', 'module', 'main'],
        };
        
      default:
        return {};
    }
  }
}
```

## 总结

ResolverFactory 的核心职责：

**插件组装**：
- 根据配置选择和组装插件
- 插件按顺序注册到钩子
- 支持用户自定义插件

**解析器创建**：
- 合并默认配置
- 创建带缓存的文件系统
- 返回可用的 Resolver 实例

**类型支持**：
- 普通模块解析
- Loader 解析
- 上下文模块解析

**下一章**：我们将深入解析算法与查找策略。
