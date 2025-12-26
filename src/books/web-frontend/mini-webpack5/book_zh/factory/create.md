---
sidebar_position: 45
title: "create 方法实现"
---

# create 方法实现

create 方法是 NormalModuleFactory 的核心入口，它协调解析、匹配、创建等步骤，最终返回一个可用的模块实例。本章详细实现这个关键方法。

## 方法签名

```typescript
export interface FactoryResult {
  module?: Module;
  fileDependencies: Set<string>;
  missingDependencies: Set<string>;
  contextDependencies: Set<string>;
}

create(
  data: ModuleFactoryCreateData,
  callback: (err: Error | null, result?: FactoryResult) => void
): void;
```

## 完整实现

### 入口与准备

```typescript
export class NormalModuleFactory {
  create(
    data: ModuleFactoryCreateData,
    callback: (err: Error | null, result?: FactoryResult) => void
  ): void {
    const { context, dependencies, contextInfo, resolveOptions } = data;
    
    // 获取第一个依赖（通常只有一个）
    const dependency = dependencies[0];
    
    // 解析内联 Loader
    const { request, elements } = this.parseRequest(dependency.request);
    
    // 构建解析数据对象
    const resolveData: ResolveData = {
      context,
      request,
      dependencies,
      contextInfo,
      resolveOptions,
      
      // 内联 Loader 信息
      elements,
      
      // 解析结果（后续填充）
      resource: undefined,
      resourceQuery: '',
      resourceFragment: '',
      loaders: [],
      type: 'javascript/auto',
      settings: {},
      parser: undefined,
      parserOptions: {},
      generator: undefined,
      generatorOptions: {},
      
      // 依赖追踪
      fileDependencies: new Set(),
      missingDependencies: new Set(),
      contextDependencies: new Set(),
      
      // 创建数据（后续填充）
      createData: undefined,
    };
    
    this.resolveAndCreate(resolveData, callback);
  }
}
```

### 解析内联 Loader

```typescript
export class NormalModuleFactory {
  /**
   * 解析请求字符串中的内联 Loader
   * 
   * 示例：
   * - "!!raw-loader!./file.txt" → 禁用所有配置 Loader
   * - "-!css-loader!./style.css" → 禁用前置和普通 Loader
   * - "!style-loader!css-loader!./style.css" → 禁用普通 Loader
   */
  private parseRequest(request: string): ParsedRequest {
    // 检查前缀
    let noPreAutoLoaders = false;
    let noAutoLoaders = false;
    let noPrePostAutoLoaders = false;
    
    if (request.startsWith('!!')) {
      noPrePostAutoLoaders = true;
      request = request.slice(2);
    } else if (request.startsWith('-!')) {
      noPreAutoLoaders = true;
      request = request.slice(2);
    } else if (request.startsWith('!')) {
      noAutoLoaders = true;
      request = request.slice(1);
    }
    
    // 分割 Loader 和资源
    const elements = request.split('!');
    const resource = elements.pop()!;
    const loaders = elements;
    
    return {
      request: resource,
      elements: loaders,
      noPreAutoLoaders,
      noAutoLoaders,
      noPrePostAutoLoaders,
    };
  }
}
```

### 解析与创建流程

```typescript
export class NormalModuleFactory {
  private resolveAndCreate(
    resolveData: ResolveData,
    callback: (err: Error | null, result?: FactoryResult) => void
  ): void {
    // 第一步：beforeResolve 钩子
    this.hooks.beforeResolve.callAsync(resolveData, (err, result) => {
      if (err) {
        return callback(err);
      }
      
      // 返回 false 表示跳过此模块
      if (result === false) {
        return callback(null, {
          module: undefined,
          fileDependencies: resolveData.fileDependencies,
          missingDependencies: resolveData.missingDependencies,
          contextDependencies: resolveData.contextDependencies,
        });
      }
      
      // 使用修改后的数据或原始数据
      const data = result || resolveData;
      
      // 第二步：factorize 钩子
      this.hooks.factorize.callAsync(data, (err, module) => {
        if (err) {
          return callback(err);
        }
        
        // 返回创建结果
        callback(null, {
          module,
          fileDependencies: data.fileDependencies,
          missingDependencies: data.missingDependencies,
          contextDependencies: data.contextDependencies,
        });
      });
    });
  }
}
```

### 默认的 factorize 处理

```typescript
export class NormalModuleFactory {
  constructor(options: NormalModuleFactoryOptions) {
    // ... 其他初始化
    
    this.setupDefaultResolve();
  }
  
  private setupDefaultResolve(): void {
    // 注册默认的 factorize 处理器
    this.hooks.factorize.tapAsync(
      { name: 'NormalModuleFactory', stage: 100 },
      (resolveData, callback) => {
        this.hooks.resolve.callAsync(resolveData, (err, result) => {
          if (err) return callback(err);
          
          // resolve 返回 false 表示忽略
          if (result === false) {
            return callback(null, undefined);
          }
          
          // resolve 直接返回模块
          if (result instanceof Module) {
            return callback(null, result);
          }
          
          // 继续 afterResolve
          this.hooks.afterResolve.callAsync(resolveData, (err, result) => {
            if (err) return callback(err);
            if (result === false) return callback(null, undefined);
            
            // 创建模块
            this.createModule(resolveData, callback);
          });
        });
      }
    );
    
    // 注册默认的 resolve 处理器
    this.hooks.resolve.tapAsync(
      { name: 'NormalModuleFactory', stage: 100 },
      (resolveData, callback) => {
        this.resolveResource(resolveData, (err) => {
          if (err) return callback(err);
          
          this.resolveLoaders(resolveData, (err) => {
            if (err) return callback(err);
            
            this.resolveParserAndGenerator(resolveData);
            callback(null, undefined);
          });
        });
      }
    );
  }
}
```

### 解析资源路径

```typescript
export class NormalModuleFactory {
  private resolveResource(
    resolveData: ResolveData,
    callback: (err: Error | null) => void
  ): void {
    const { context, request, resolveOptions } = resolveData;
    
    // 获取解析器
    const resolver = this.getResolver('normal', resolveOptions);
    
    // 执行解析
    resolver.resolve(
      {},
      context,
      request,
      { fileDependencies: resolveData.fileDependencies },
      (err, resource, resolverResult) => {
        if (err) {
          // 添加到缺失依赖
          resolveData.missingDependencies.add(request);
          return callback(err);
        }
        
        // 保存解析结果
        resolveData.resource = resource!;
        resolveData.resourceQuery = resolverResult?.query || '';
        resolveData.resourceFragment = resolverResult?.fragment || '';
        
        // 添加文件依赖
        resolveData.fileDependencies.add(resource!);
        
        // 匹配规则
        this.matchRules(resolveData);
        
        callback(null);
      }
    );
  }
}
```

### 规则匹配

```typescript
export class NormalModuleFactory {
  private matchRules(resolveData: ResolveData): void {
    const { resource, resourceQuery, contextInfo } = resolveData;
    
    // 执行规则集匹配
    const result = this.ruleSet.exec({
      resource,
      realResource: resource,
      resourceQuery,
      resourceFragment: resolveData.resourceFragment,
      issuer: contextInfo.issuer,
      compiler: contextInfo.compiler,
    });
    
    // 收集匹配结果
    const settings: any = {};
    const useLoaders: LoaderItem[] = [];
    const useLoadersPost: LoaderItem[] = [];
    const useLoadersPre: LoaderItem[] = [];
    
    for (const item of result) {
      if (item.type === 'type') {
        settings.type = item.value;
      } else if (item.type === 'sideEffects') {
        settings.sideEffects = item.value;
      } else if (item.type === 'parser') {
        Object.assign(settings, { parser: item.value });
      } else if (item.type === 'generator') {
        Object.assign(settings, { generator: item.value });
      } else if (item.type === 'use') {
        if (item.enforce === 'post') {
          useLoadersPost.push(item.value);
        } else if (item.enforce === 'pre') {
          useLoadersPre.push(item.value);
        } else {
          useLoaders.push(item.value);
        }
      }
    }
    
    // 根据内联标记过滤 Loader
    let loaders: LoaderItem[] = [];
    
    if (!resolveData.noPrePostAutoLoaders) {
      loaders.push(...useLoadersPost);
    }
    
    // 内联 Loader
    if (resolveData.elements.length > 0) {
      loaders.push(
        ...resolveData.elements.map((loader) => ({
          loader,
          options: undefined,
          ident: undefined,
        }))
      );
    }
    
    if (!resolveData.noAutoLoaders && !resolveData.noPrePostAutoLoaders) {
      loaders.push(...useLoaders);
    }
    
    if (!resolveData.noPreAutoLoaders && !resolveData.noPrePostAutoLoaders) {
      loaders.push(...useLoadersPre);
    }
    
    resolveData.loaders = loaders;
    resolveData.type = settings.type || 'javascript/auto';
    resolveData.settings = settings;
  }
}
```

### 解析 Loader 路径

```typescript
export class NormalModuleFactory {
  private resolveLoaders(
    resolveData: ResolveData,
    callback: (err: Error | null) => void
  ): void {
    const { loaders, context } = resolveData;
    
    if (loaders.length === 0) {
      return callback(null);
    }
    
    // 获取 Loader 解析器
    const resolver = this.getResolver('loader');
    
    // 并行解析所有 Loader
    const resolvePromises = loaders.map((loaderItem, index) => {
      return new Promise<void>((resolve, reject) => {
        const loaderRequest = typeof loaderItem === 'string'
          ? loaderItem
          : loaderItem.loader;
        
        resolver.resolve(
          {},
          context,
          loaderRequest,
          { fileDependencies: resolveData.fileDependencies },
          (err, loaderPath) => {
            if (err) {
              return reject(err);
            }
            
            // 更新为解析后的路径
            if (typeof loaderItem === 'string') {
              loaders[index] = {
                loader: loaderPath!,
                options: undefined,
                ident: undefined,
              };
            } else {
              loaderItem.loader = loaderPath!;
            }
            
            resolve();
          }
        );
      });
    });
    
    Promise.all(resolvePromises)
      .then(() => callback(null))
      .catch(callback);
  }
}
```

### 解析 Parser 和 Generator

```typescript
export class NormalModuleFactory {
  private resolveParserAndGenerator(resolveData: ResolveData): void {
    const { type, settings } = resolveData;
    
    // 获取 Parser 选项
    const parserOptions = {
      ...this.defaultParserOptions[type],
      ...settings.parser,
    };
    
    // 获取 Parser
    resolveData.parser = this.getParser(type, parserOptions);
    resolveData.parserOptions = parserOptions;
    
    // 获取 Generator 选项
    const generatorOptions = {
      ...this.defaultGeneratorOptions[type],
      ...settings.generator,
    };
    
    // 获取 Generator
    resolveData.generator = this.getGenerator(type, generatorOptions);
    resolveData.generatorOptions = generatorOptions;
  }
  
  getParser(type: string, parserOptions: object): Parser {
    const cacheKey = `${type}|${JSON.stringify(parserOptions)}`;
    
    // 检查缓存
    let parser = this.parserCache.get(cacheKey);
    if (parser) return parser;
    
    // 调用 createParser 钩子
    parser = this.hooks.createParser.for(type).call(parserOptions);
    
    if (!parser) {
      throw new Error(`No parser registered for ${type}`);
    }
    
    // 调用 parser 钩子进行配置
    this.hooks.parser.for(type).call(parser, parserOptions);
    
    // 缓存
    this.parserCache.set(cacheKey, parser);
    
    return parser;
  }
  
  getGenerator(type: string, generatorOptions: object): Generator {
    const cacheKey = `${type}|${JSON.stringify(generatorOptions)}`;
    
    let generator = this.generatorCache.get(cacheKey);
    if (generator) return generator;
    
    generator = this.hooks.createGenerator.for(type).call(generatorOptions);
    
    if (!generator) {
      throw new Error(`No generator registered for ${type}`);
    }
    
    this.hooks.generator.for(type).call(generator, generatorOptions);
    this.generatorCache.set(cacheKey, generator);
    
    return generator;
  }
}
```

### 创建模块

```typescript
export class NormalModuleFactory {
  private createModule(
    resolveData: ResolveData,
    callback: (err: Error | null, module?: Module) => void
  ): void {
    // 构建 createData
    const createData: CreateModuleData = {
      type: resolveData.type,
      layer: resolveData.layer,
      context: resolveData.context,
      
      request: this.formatRequest(resolveData),
      userRequest: this.formatUserRequest(resolveData),
      rawRequest: resolveData.request,
      
      resource: resolveData.resource!,
      resourceQuery: resolveData.resourceQuery,
      resourceFragment: resolveData.resourceFragment,
      
      loaders: resolveData.loaders,
      
      parser: resolveData.parser!,
      parserOptions: resolveData.parserOptions,
      
      generator: resolveData.generator!,
      generatorOptions: resolveData.generatorOptions,
      
      settings: resolveData.settings,
    };
    
    // 调用 createModule 钩子
    this.hooks.createModule.callAsync(
      createData,
      resolveData,
      (err, createdModule) => {
        if (err) return callback(err);
        
        // 使用钩子返回的模块或创建默认模块
        let module = createdModule;
        if (!module) {
          module = new NormalModule(createData);
        }
        
        // 调用 module 钩子
        module = this.hooks.module.call(module, createData, resolveData);
        
        callback(null, module);
      }
    );
  }
  
  private formatRequest(resolveData: ResolveData): string {
    const parts: string[] = [];
    
    // Loader 路径
    for (const loader of resolveData.loaders) {
      const l = typeof loader === 'string' ? loader : loader.loader;
      parts.push(l);
    }
    
    // 资源路径
    parts.push(resolveData.resource!);
    
    return parts.join('!');
  }
  
  private formatUserRequest(resolveData: ResolveData): string {
    // 用户友好的路径表示
    const parts: string[] = [];
    
    for (const loader of resolveData.loaders) {
      const l = typeof loader === 'string' ? loader : loader.loader;
      parts.push(this.shortenPath(l));
    }
    
    parts.push(this.shortenPath(resolveData.resource!));
    
    return parts.join('!');
  }
}
```

## 错误处理

```typescript
export class NormalModuleFactory {
  private resolveResource(
    resolveData: ResolveData,
    callback: (err: Error | null) => void
  ): void {
    // ... 解析逻辑
    
    resolver.resolve(
      {},
      context,
      request,
      {},
      (err, resource) => {
        if (err) {
          // 创建更友好的错误信息
          const error = new ModuleNotFoundError(
            `Module not found: ${request}`,
            {
              request,
              context,
              issuer: resolveData.contextInfo.issuer,
            }
          );
          
          // 记录尝试过的路径
          error.details = err.message;
          
          return callback(error);
        }
        
        // ...
      }
    );
  }
}

class ModuleNotFoundError extends Error {
  constructor(message: string, public info: object) {
    super(message);
    this.name = 'ModuleNotFoundError';
  }
}
```

## 完整流程图

```
create(data)
    │
    ├──► 解析内联 Loader 前缀（!!, -!, !）
    │
    ├──► 构建 resolveData
    │
    ├──► beforeResolve 钩子
    │         │
    │         ├── false → 返回 undefined
    │         └── data → 继续
    │
    ├──► factorize 钩子
    │         │
    │         └── 默认处理器：
    │               │
    │               ├──► resolve 钩子
    │               │         │
    │               │         ├── 解析资源路径
    │               │         ├── 匹配规则
    │               │         ├── 解析 Loader 路径
    │               │         └── 获取 Parser/Generator
    │               │
    │               ├──► afterResolve 钩子
    │               │
    │               ├──► createModule 钩子
    │               │
    │               └──► module 钩子
    │
    └──► 返回 { module, dependencies }
```

## 总结

create 方法是模块创建的入口：

**处理步骤**：
1. **解析请求**：处理内联 Loader 语法
2. **beforeResolve**：允许跳过或修改
3. **factorize**：核心工厂化逻辑
4. **resolve**：路径解析和规则匹配
5. **afterResolve**：最终修改机会
6. **createModule**：创建模块实例
7. **module**：包装或增强模块

**关键点**：
- 钩子系统提供完整可扩展性
- 依赖追踪支持增量构建
- Parser/Generator 缓存优化性能
- 内联 Loader 语法支持灵活配置

下一章我们将深入 resolve 方法的实现细节。
