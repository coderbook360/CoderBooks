---
sidebar_position: 43
title: "NormalModuleFactory 设计"
---

# NormalModuleFactory 设计

NormalModuleFactory 是 Webpack 中最核心的工厂类，负责创建普通模块（NormalModule）。它处理模块解析、Loader 匹配、Parser 选择等关键步骤。本章深入理解其设计与职责。

## 工厂模式的意义

为什么需要工厂？思考一下创建模块需要做什么：

1. **路径解析**：`./utils` → `/project/src/utils.js`
2. **Loader 匹配**：根据规则确定使用哪些 Loader
3. **Parser 选择**：根据模块类型选择解析器
4. **Generator 选择**：根据模块类型选择代码生成器
5. **创建模块**：组装所有信息，创建 Module 实例

这些步骤复杂且可扩展，工厂模式将创建逻辑封装，提供统一的创建接口。

## NormalModuleFactory 职责

```
                    ┌─────────────────────────┐
                    │   NormalModuleFactory   │
                    └───────────┬─────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        │                       │                       │
        ▼                       ▼                       ▼
   ┌─────────┐            ┌─────────┐            ┌─────────┐
   │ Resolve │            │ Loaders │            │ Parser  │
   └─────────┘            └─────────┘            └─────────┘
        │                       │                       │
        ▼                       ▼                       ▼
   ┌─────────┐            ┌─────────┐            ┌─────────┐
   │ 路径解析 │            │ 规则匹配 │            │ 类型判断 │
   └─────────┘            └─────────┘            └─────────┘
                                │
                                ▼
                    ┌─────────────────────────┐
                    │      NormalModule       │
                    └─────────────────────────┘
```

## 基础结构

```typescript
import { Tapable, AsyncSeriesWaterfallHook, SyncWaterfallHook } from 'tapable';
import { ResolverFactory } from '../ResolverFactory';
import { RuleSetCompiler } from './RuleSetCompiler';
import { NormalModule } from '../NormalModule';

export interface ModuleFactoryCreateData {
  // 上下文（目录）
  context: string;
  
  // 依赖列表
  dependencies: Dependency[];
  
  // 上下文信息
  contextInfo: ContextInfo;
  
  // 解析选项
  resolveOptions?: ResolveOptions;
}

export interface ContextInfo {
  // 发起者
  issuer: string;
  
  // 发起者层级
  issuerLayer?: string;
  
  // 编译器名称
  compiler?: string;
}

export class NormalModuleFactory extends Tapable {
  // Compiler 引用
  private context: string;
  
  // 解析器工厂
  private resolverFactory: ResolverFactory;
  
  // 规则集编译器
  private ruleSet: RuleSetCompiler;
  
  // Parser 缓存
  private parserCache: Map<string, Parser> = new Map();
  
  // Generator 缓存
  private generatorCache: Map<string, Generator> = new Map();
  
  constructor(options: NormalModuleFactoryOptions) {
    super();
    
    this.context = options.context;
    this.resolverFactory = options.resolverFactory;
    this.ruleSet = new RuleSetCompiler(options.rules || []);
    
    this.initHooks();
  }
}
```

## Hooks 体系

NormalModuleFactory 定义了丰富的钩子，允许插件介入模块创建的各个阶段：

```typescript
export class NormalModuleFactory extends Tapable {
  hooks = {
    /**
     * 解析前钩子
     * 可以修改解析参数或跳过解析
     */
    beforeResolve: new AsyncSeriesWaterfallHook<[ResolveData]>(['data']),
    
    /**
     * 工厂化钩子
     * 核心：决定如何创建模块
     */
    factorize: new AsyncSeriesBailHook<[ResolveData], Module>(['data']),
    
    /**
     * 解析钩子
     * 执行模块路径解析
     */
    resolve: new AsyncSeriesBailHook<[ResolveData], Module>(['data']),
    
    /**
     * 解析 Loader 后钩子
     */
    resolveForScheme: new AsyncSeriesBailHook<[ResolveData], Module>(['data']),
    
    /**
     * 解析后钩子
     * 可以修改解析结果
     */
    afterResolve: new AsyncSeriesWaterfallHook<[ResolveData]>(['data']),
    
    /**
     * 创建模块钩子
     */
    createModule: new AsyncSeriesBailHook<[CreateModuleData, ResolveData], Module>(['createData', 'resolveData']),
    
    /**
     * 模块创建后钩子
     */
    module: new SyncWaterfallHook<[Module, CreateModuleData, ResolveData]>(['module', 'createData', 'resolveData']),
    
    /**
     * 创建 Parser 钩子
     */
    createParser: new HookMap(() => new SyncBailHook<[ParserOptions], Parser>(['parserOptions'])),
    
    /**
     * Parser 创建后钩子
     */
    parser: new HookMap(() => new SyncHook<[Parser, ParserOptions]>(['parser', 'parserOptions'])),
    
    /**
     * 创建 Generator 钩子
     */
    createGenerator: new HookMap(() => new SyncBailHook<[GeneratorOptions], Generator>(['generatorOptions'])),
    
    /**
     * Generator 创建后钩子
     */
    generator: new HookMap(() => new SyncHook<[Generator, GeneratorOptions]>(['generator', 'generatorOptions'])),
  };
}
```

## 核心流程

### create 方法

工厂的入口方法：

```typescript
export class NormalModuleFactory extends Tapable {
  create(
    data: ModuleFactoryCreateData,
    callback: (err: Error | null, result?: FactoryResult) => void
  ): void {
    const { context, dependencies, contextInfo, resolveOptions } = data;
    const dependency = dependencies[0];
    
    // 构建解析数据
    const resolveData: ResolveData = {
      context,
      request: dependency.request,
      dependencies,
      contextInfo,
      resolveOptions,
      fileDependencies: new Set(),
      missingDependencies: new Set(),
      contextDependencies: new Set(),
    };
    
    // 调用 beforeResolve 钩子
    this.hooks.beforeResolve.callAsync(resolveData, (err, result) => {
      if (err) return callback(err);
      
      // 返回 false 表示跳过
      if (result === false) {
        return callback(null, undefined);
      }
      
      // 调用 factorize 钩子
      this.hooks.factorize.callAsync(result || resolveData, (err, module) => {
        if (err) return callback(err);
        
        callback(null, {
          module,
          fileDependencies: resolveData.fileDependencies,
          missingDependencies: resolveData.missingDependencies,
          contextDependencies: resolveData.contextDependencies,
        });
      });
    });
  }
}
```

### 默认的 factorize 处理

```typescript
export class NormalModuleFactory extends Tapable {
  private initHooks(): void {
    // 注册默认的 factorize 处理器
    this.hooks.factorize.tapAsync(
      { name: 'NormalModuleFactory', stage: 100 },
      (resolveData, callback) => {
        // 调用 resolve 钩子
        this.hooks.resolve.callAsync(resolveData, (err, result) => {
          if (err) return callback(err);
          
          // resolve 返回 false 表示忽略
          if (result === false) {
            return callback(null, undefined);
          }
          
          // resolve 返回模块则直接使用
          if (result instanceof Module) {
            return callback(null, result);
          }
          
          // 调用 afterResolve
          this.hooks.afterResolve.callAsync(resolveData, (err, result) => {
            if (err) return callback(err);
            if (result === false) return callback(null, undefined);
            
            // 创建模块
            this.createModule(resolveData, (err, module) => {
              callback(err, module);
            });
          });
        });
      }
    );
  }
}
```

## 解析数据结构

```typescript
export interface ResolveData {
  // 上下文目录
  context: string;
  
  // 请求字符串
  request: string;
  
  // 依赖列表
  dependencies: Dependency[];
  
  // 上下文信息
  contextInfo: ContextInfo;
  
  // 解析选项
  resolveOptions?: ResolveOptions;
  
  // 解析结果
  resource?: string;           // 资源路径
  resourceQuery?: string;       // 查询字符串
  resourceFragment?: string;    // 片段
  loaders?: LoaderItem[];       // Loader 列表
  type?: string;                // 模块类型
  settings?: object;            // 规则设置
  parser?: Parser;              // 解析器
  parserOptions?: object;       // 解析器选项
  generator?: Generator;        // 生成器
  generatorOptions?: object;    // 生成器选项
  
  // 依赖文件（用于缓存）
  fileDependencies: Set<string>;
  missingDependencies: Set<string>;
  contextDependencies: Set<string>;
}
```

## 与 Compilation 的协作

```typescript
// Compilation 中调用工厂
export class Compilation {
  factorizeModule(
    options: FactorizeModuleOptions,
    callback: Callback
  ): void {
    const factory = this.dependencyFactories.get(
      options.dependencies[0].constructor
    );
    
    if (!factory) {
      return callback(
        new Error(`No module factory for ${options.dependencies[0].type}`)
      );
    }
    
    // 调用工厂的 create 方法
    factory.create(
      {
        context: options.context,
        dependencies: options.dependencies,
        contextInfo: options.contextInfo,
        resolveOptions: options.resolveOptions,
      },
      (err, result) => {
        if (err) return callback(err);
        callback(null, result);
      }
    );
  }
}
```

## 工厂注册

```typescript
export class Compiler {
  compile(callback: Callback): void {
    // 创建工厂
    const normalModuleFactory = new NormalModuleFactory({
      context: this.context,
      resolverFactory: this.resolverFactory,
      rules: this.options.module.rules,
    });
    
    const contextModuleFactory = new ContextModuleFactory(
      this.resolverFactory
    );
    
    // 传递给 Compilation
    const params: CompilationParams = {
      normalModuleFactory,
      contextModuleFactory,
    };
    
    this.createCompilation(params);
  }
}
```

## 设计要点

### 可扩展性

钩子系统使得每个步骤都可以被插件拦截：

```typescript
// 示例：修改解析结果
compiler.hooks.compile.tap('MyPlugin', (params) => {
  params.normalModuleFactory.hooks.afterResolve.tapAsync(
    'MyPlugin',
    (resolveData, callback) => {
      // 修改 Loader
      if (resolveData.resource.endsWith('.custom')) {
        resolveData.loaders.push({
          loader: require.resolve('./my-loader'),
          options: {},
        });
      }
      callback(null, resolveData);
    }
  );
});
```

### 缓存机制

Parser 和 Generator 实例被缓存复用：

```typescript
getParser(type: string, options: ParserOptions): Parser {
  const cacheKey = `${type}|${JSON.stringify(options)}`;
  
  let parser = this.parserCache.get(cacheKey);
  if (parser) return parser;
  
  // 创建新的 Parser
  parser = this.createParser(type, options);
  this.parserCache.set(cacheKey, parser);
  
  return parser;
}
```

### 解耦设计

工厂不直接依赖具体的 Resolver、Loader、Parser 实现，而是通过钩子和配置进行组装。

## 总结

NormalModuleFactory 是模块创建的核心：

**核心职责**：
- 路径解析：调用 Resolver 解析模块路径
- Loader 匹配：根据规则确定 Loader 链
- Parser/Generator 选择：根据模块类型选择处理器
- 模块创建：组装信息创建 NormalModule

**设计特点**：
- **钩子驱动**：每个步骤都可扩展
- **异步处理**：支持异步解析
- **缓存优化**：Parser/Generator 复用
- **解耦设计**：不依赖具体实现

**关键钩子**：
- `beforeResolve`：解析前
- `factorize`：工厂化
- `resolve`：执行解析
- `afterResolve`：解析后
- `createModule`：创建模块

下一章我们将详细分析 ModuleFactory 的完整 Hooks 体系。
