---
sidebar_position: 31
title: "factorizeModule 方法：模块工厂化"
---

# factorizeModule 方法：模块工厂化

当 Webpack 遇到一个依赖时，它需要创建对应的模块对象。这个过程被称为"工厂化"（Factorize）——通过模块工厂，将依赖转换为模块实例。

## 为什么需要"工厂化"？

思考一下：一个 `import './utils'` 语句，Webpack 如何知道应该创建什么样的模块？

```javascript
// 这些都是有效的依赖
import './utils';           // 普通 JS 模块
import './styles.css';      // CSS 模块
import './data.json';       // JSON 模块
import './image.png';       // 资源模块
require.context('./dir');   // 上下文模块
```

不同类型的依赖需要创建不同类型的模块。工厂模式正好解决这个问题：

```
依赖类型                    模块工厂                     模块类型
─────────────────────────────────────────────────────────────────
EntryDependency      ───▶  NormalModuleFactory    ───▶  NormalModule
HarmonyImportDependency ──▶ NormalModuleFactory   ───▶  NormalModule
ContextDependency    ───▶  ContextModuleFactory   ───▶  ContextModule
ExternalDependency   ───▶  ExternalModuleFactory  ───▶  ExternalModule
```

## factorizeModule 的职责

```
          Dependency
              │
              ▼
    ┌──────────────────────┐
    │   factorizeModule    │
    │                      │
    │  1. 查找模块工厂      │
    │  2. 解析模块路径      │
    │  3. 匹配 Loaders     │
    │  4. 创建模块实例      │
    │                      │
    └──────────┬───────────┘
              │
              ▼
           Module
```

factorizeModule 是 Make 阶段的核心方法，负责：

1. 根据依赖类型选择合适的模块工厂
2. 调用工厂的 create 方法
3. 返回创建好的模块实例

## 基础实现

```typescript
export interface FactorizeModuleOptions {
  /** 模块工厂 */
  factory: ModuleFactory;
  /** 触发工厂化的依赖列表 */
  dependencies: Dependency[];
  /** 上下文目录 */
  context: string;
  /** 来源模块（谁依赖的） */
  originModule: Module | null;
  /** 上下文信息 */
  contextInfo?: ModuleContextInfo;
}

export interface FactorizeResult {
  /** 创建的模块 */
  module: Module;
  /** 依赖的工厂结果 */
  factoryMeta?: FactoryMeta;
}

export interface ModuleContextInfo {
  issuer: string;
  compiler?: string;
}

export class Compilation {
  /**
   * 工厂化模块
   */
  factorizeModule(
    options: FactorizeModuleOptions,
    callback: (err?: Error, result?: FactorizeResult) => void
  ): void {
    const { factory, dependencies, context, originModule, contextInfo } = options;
    
    // 获取主依赖（通常是第一个）
    const dependency = dependencies[0];
    
    // 准备工厂创建参数
    const resolveData: ResolveData = {
      context,
      request: dependency.request,
      dependencies,
      contextInfo: contextInfo ?? {
        issuer: originModule?.identifier() ?? '',
      },
    };
    
    // 触发 factorize 钩子
    this.hooks.factorize.callAsync(resolveData, (err, result) => {
      if (err) return callback(err);
      
      // 如果钩子已经处理，直接返回
      if (result !== undefined) {
        return callback(undefined, { module: result });
      }
      
      // 调用工厂创建模块
      factory.create(resolveData, (err, factoryResult) => {
        if (err) {
          return callback(err);
        }
        
        if (!factoryResult || !factoryResult.module) {
          return callback();
        }
        
        callback(undefined, {
          module: factoryResult.module,
          factoryMeta: factoryResult.factoryMeta,
        });
      });
    });
  }
}
```

## ModuleFactory 接口

所有模块工厂都实现同一个接口：

```typescript
export interface ResolveData {
  /** 解析上下文目录 */
  context: string;
  /** 请求路径 */
  request: string;
  /** 依赖列表 */
  dependencies: Dependency[];
  /** 上下文信息 */
  contextInfo: ModuleContextInfo;
  /** 解析选项 */
  resolveOptions?: ResolveOptions;
}

export interface FactoryResult {
  /** 创建的模块 */
  module?: Module;
  /** 工厂元信息 */
  factoryMeta?: FactoryMeta;
}

export interface FactoryMeta {
  sideEffectFree?: boolean;
}

export interface ModuleFactory {
  /**
   * 创建模块
   */
  create(
    data: ResolveData,
    callback: (err?: Error, result?: FactoryResult) => void
  ): void;
}
```

## NormalModuleFactory 的 create 流程

NormalModuleFactory 是最常用的模块工厂，处理普通 JS/CSS/JSON 等模块：

```typescript
export class NormalModuleFactory implements ModuleFactory {
  hooks = {
    beforeResolve: new AsyncSeriesBailHook<[ResolveData], false | void>(['data']),
    resolve: new AsyncSeriesBailHook<[ResolveData], Module | false | void>(['data']),
    afterResolve: new AsyncSeriesBailHook<[ResolveData], false | void>(['data']),
    createModule: new AsyncSeriesBailHook<[CreateModuleData, ResolveData], Module | void>(['data', 'resolveData']),
    module: new SyncWaterfallHook<[Module, CreateModuleData, ResolveData]>(['module', 'data', 'resolveData']),
  };
  
  create(
    data: ResolveData,
    callback: (err?: Error, result?: FactoryResult) => void
  ): void {
    const { context, request } = data;
    
    // 1. beforeResolve 钩子（可以跳过模块）
    this.hooks.beforeResolve.callAsync(data, (err, result) => {
      if (err) return callback(err);
      
      // 返回 false 表示跳过这个模块
      if (result === false) {
        return callback();
      }
      
      // 2. resolve 钩子（核心解析逻辑）
      this.hooks.resolve.callAsync(data, (err, result) => {
        if (err) return callback(err);
        
        // 如果钩子返回了模块，直接使用
        if (result instanceof Module) {
          return callback(undefined, { module: result });
        }
        
        if (result === false) {
          return callback();
        }
        
        // 3. 执行默认解析逻辑
        this.resolveModule(data, (err, resolveResult) => {
          if (err) return callback(err);
          
          // 4. afterResolve 钩子
          this.hooks.afterResolve.callAsync(resolveResult!, (err, result) => {
            if (err) return callback(err);
            if (result === false) return callback();
            
            // 5. 创建模块
            this.createModule(resolveResult!, data, callback);
          });
        });
      });
    });
  }
  
  /**
   * 解析模块
   */
  private resolveModule(
    data: ResolveData,
    callback: (err?: Error, result?: ResolveResult) => void
  ): void {
    const { context, request } = data;
    
    // 解析模块路径
    this.resolver.resolve(context, request, (err, resource, resourceResolveData) => {
      if (err) return callback(err);
      
      // 匹配 Loaders
      const loaders = this.matchLoaders(resource!, data);
      
      // 解析 Loader 路径
      this.resolveLoaders(loaders, (err, resolvedLoaders) => {
        if (err) return callback(err);
        
        callback(undefined, {
          resource: resource!,
          resourceResolveData,
          loaders: resolvedLoaders!,
          parser: this.getParser(resource!),
          generator: this.getGenerator(resource!),
        });
      });
    });
  }
  
  /**
   * 创建模块实例
   */
  private createModule(
    resolveResult: ResolveResult,
    resolveData: ResolveData,
    callback: (err?: Error, result?: FactoryResult) => void
  ): void {
    const createData: CreateModuleData = {
      resource: resolveResult.resource,
      loaders: resolveResult.loaders,
      parser: resolveResult.parser,
      generator: resolveResult.generator,
      request: resolveData.request,
      context: resolveData.context,
    };
    
    // createModule 钩子
    this.hooks.createModule.callAsync(createData, resolveData, (err, module) => {
      if (err) return callback(err);
      
      // 如果钩子没有创建模块，使用默认逻辑
      if (!module) {
        module = new NormalModule({
          resource: createData.resource,
          loaders: createData.loaders,
          parser: createData.parser,
          generator: createData.generator,
          request: createData.request,
          context: createData.context,
        });
      }
      
      // module 钩子（允许修改模块）
      module = this.hooks.module.call(module, createData, resolveData);
      
      callback(undefined, { module });
    });
  }
}
```

## Loader 匹配

工厂化过程中的一个重要环节是匹配 Loaders：

```typescript
interface RuleSetResult {
  loaders: LoaderItem[];
  type?: string;
  sideEffects?: boolean;
}

class NormalModuleFactory {
  /**
   * 根据规则匹配 Loaders
   */
  matchLoaders(resource: string, data: ResolveData): LoaderItem[] {
    const loaders: LoaderItem[] = [];
    
    // 从 webpack.config.js 的 module.rules 匹配
    for (const rule of this.rules) {
      if (this.matchRule(rule, resource, data)) {
        // 收集 loaders
        if (rule.use) {
          const use = Array.isArray(rule.use) ? rule.use : [rule.use];
          loaders.push(...use.map(this.normalizeLoader));
        }
        
        if (rule.loader) {
          loaders.push(this.normalizeLoader(rule.loader));
        }
      }
    }
    
    // 处理 inline loaders
    const { request } = data;
    if (request.includes('!')) {
      const inlineLoaders = this.parseInlineLoaders(request);
      loaders.unshift(...inlineLoaders);
    }
    
    return loaders;
  }
  
  /**
   * 检查规则是否匹配
   */
  private matchRule(rule: Rule, resource: string, data: ResolveData): boolean {
    // test 匹配
    if (rule.test) {
      if (rule.test instanceof RegExp) {
        if (!rule.test.test(resource)) return false;
      } else if (typeof rule.test === 'function') {
        if (!rule.test(resource)) return false;
      }
    }
    
    // include 匹配
    if (rule.include) {
      const includes = Array.isArray(rule.include) ? rule.include : [rule.include];
      const matched = includes.some(pattern => {
        if (typeof pattern === 'string') {
          return resource.startsWith(pattern);
        }
        if (pattern instanceof RegExp) {
          return pattern.test(resource);
        }
        return false;
      });
      if (!matched) return false;
    }
    
    // exclude 排除
    if (rule.exclude) {
      const excludes = Array.isArray(rule.exclude) ? rule.exclude : [rule.exclude];
      const excluded = excludes.some(pattern => {
        if (typeof pattern === 'string') {
          return resource.startsWith(pattern);
        }
        if (pattern instanceof RegExp) {
          return pattern.test(resource);
        }
        return false;
      });
      if (excluded) return false;
    }
    
    return true;
  }
}
```

## 模块去重

同一个模块可能被多个地方依赖，工厂化时需要去重：

```typescript
export class Compilation {
  // 模块缓存
  private _modules: Map<string, Module> = new Map();
  
  /**
   * 添加模块（带去重）
   */
  addModule(
    module: Module,
    callback: (err?: Error, module?: Module) => void
  ): void {
    const identifier = module.identifier();
    
    // 检查是否已存在
    const existingModule = this._modules.get(identifier);
    if (existingModule) {
      // 返回已存在的模块
      return callback(undefined, existingModule);
    }
    
    // 添加新模块
    this._modules.set(identifier, module);
    this.modules.add(module);
    
    // 触发钩子
    this.hooks.addModule.call(module);
    
    callback(undefined, module);
  }
  
  /**
   * 处理模块创建（包含去重）
   */
  handleModuleCreation(
    options: {
      factory: ModuleFactory;
      dependencies: Dependency[];
      context: string;
      originModule: Module | null;
    },
    callback: (err?: Error, result?: { module: Module }) => void
  ): void {
    const { factory, dependencies, context, originModule } = options;
    
    this.factorizeModule(
      { factory, dependencies, context, originModule },
      (err, factoryResult) => {
        if (err) return callback(err);
        if (!factoryResult) return callback();
        
        const newModule = factoryResult.module;
        
        // 添加模块（会自动去重）
        this.addModule(newModule, (err, module) => {
          if (err) return callback(err);
          
          // 检查是否是新模块
          const isNewModule = module === newModule;
          
          // 建立依赖关系
          for (const dep of dependencies) {
            this.moduleGraph.setResolvedModule(originModule, dep, module!);
          }
          
          if (isNewModule) {
            // 新模块需要构建
            this.buildModule(module!, (err) => {
              if (err) return callback(err);
              
              this.processModuleDependencies(module!, (err) => {
                callback(err, { module: module! });
              });
            });
          } else {
            // 已存在的模块不需要重新构建
            callback(undefined, { module: module! });
          }
        });
      }
    );
  }
}
```

## 并行处理

大型项目可能有数千个模块，串行处理太慢。Webpack 使用并行队列：

```typescript
import { AsyncQueue } from './AsyncQueue';

export class Compilation {
  // 工厂化队列
  private factorizeQueue: AsyncQueue<FactorizeModuleOptions, FactorizeResult>;
  
  // 添加模块队列
  private addModuleQueue: AsyncQueue<Module, Module>;
  
  // 构建队列
  private buildQueue: AsyncQueue<Module, Module>;
  
  constructor(compiler: Compiler, params: CompilationParams) {
    // 初始化并行队列
    this.factorizeQueue = new AsyncQueue({
      name: 'factorize',
      parallelism: 100, // 最多同时处理 100 个
      processor: this._factorizeModule.bind(this),
    });
    
    this.addModuleQueue = new AsyncQueue({
      name: 'addModule',
      parallelism: 100,
      processor: this._addModule.bind(this),
    });
    
    this.buildQueue = new AsyncQueue({
      name: 'build',
      parallelism: 100,
      processor: this._buildModule.bind(this),
    });
  }
  
  /**
   * 使用队列的工厂化方法
   */
  factorizeModule(
    options: FactorizeModuleOptions,
    callback: (err?: Error, result?: FactorizeResult) => void
  ): void {
    this.factorizeQueue.add(options, callback);
  }
}
```

## 错误处理

工厂化失败时的处理：

```typescript
export class Compilation {
  factorizeModule(
    options: FactorizeModuleOptions,
    callback: (err?: Error, result?: FactorizeResult) => void
  ): void {
    const { factory, dependencies, context, originModule } = options;
    const dependency = dependencies[0];
    
    factory.create(
      { context, request: dependency.request, dependencies, contextInfo: {} },
      (err, result) => {
        if (err) {
          // 包装错误，添加更多上下文
          const error = new ModuleNotFoundError(
            originModule,
            err,
            dependency.loc
          );
          
          // 添加到编译错误
          this.errors.push(error);
          
          // 如果配置了 bail，立即停止
          if (this.bail) {
            return callback(error);
          }
          
          // 否则继续，但返回 undefined
          return callback();
        }
        
        callback(undefined, result ? { module: result.module! } : undefined);
      }
    );
  }
}

// 模块未找到错误
class ModuleNotFoundError extends Error {
  constructor(
    public module: Module | null,
    public originalError: Error,
    public loc?: DependencyLocation
  ) {
    super(`Module not found: ${originalError.message}`);
    this.name = 'ModuleNotFoundError';
  }
}
```

## 完整流程示例

```typescript
// 假设有这样的代码:
// src/index.js
// import { add } from './math.js';

// 1. EntryPlugin 创建 EntryDependency
const entryDep = new EntryDependency('./src/index.js');

// 2. addEntry 调用 handleModuleCreation
compilation.handleModuleCreation({
  factory: normalModuleFactory,
  dependencies: [entryDep],
  context: '/project',
  originModule: null,
}, callback);

// 3. factorizeModule 调用工厂
normalModuleFactory.create({
  context: '/project',
  request: './src/index.js',
  dependencies: [entryDep],
}, (err, result) => {
  // result.module 是创建的 NormalModule
});

// 4. 解析过程
// - resolve: './src/index.js' → '/project/src/index.js'
// - 匹配 loaders: babel-loader
// - 创建 NormalModule

// 5. buildModule 构建模块
// - 运行 loaders 转换代码
// - 解析 AST，找到 import 语句
// - 创建 HarmonyImportDependency

// 6. processModuleDependencies 处理依赖
// - 对 './math.js' 重复 handleModuleCreation 流程
```

## 小结

factorizeModule 是连接"依赖"和"模块"的桥梁。理解它，你就理解了 Webpack 如何将代码中的 import 转换为可处理的模块对象。

关键要点：

1. **工厂模式**：不同依赖类型使用不同的模块工厂
2. **解析流程**：路径解析 → Loader 匹配 → 模块创建
3. **钩子扩展**：beforeResolve、resolve、afterResolve、createModule
4. **去重机制**：同一模块只创建一次
5. **并行处理**：使用队列提高效率

下一节，我们将学习 buildModule——模块如何被构建和转换。
