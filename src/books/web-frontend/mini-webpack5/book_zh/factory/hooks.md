---
sidebar_position: 44
title: "ModuleFactory Hooks 体系"
---

# ModuleFactory Hooks 体系

NormalModuleFactory 的钩子系统是 Webpack 可扩展性的核心。理解这些钩子的触发时机、参数和用途，是开发高级插件的基础。

## Hooks 全景图

```
create() 入口
    │
    ▼
┌──────────────────┐
│  beforeResolve   │  ← 解析前，可跳过或修改请求
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│    factorize     │  ← 工厂化入口，可直接返回模块
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│     resolve      │  ← 执行路径解析
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│   afterResolve   │  ← 解析后，可修改结果
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│   createModule   │  ← 创建模块实例
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│      module      │  ← 模块创建后，可包装或替换
└────────┬─────────┘
         │
         ▼
    返回模块
```

## beforeResolve

### 定义

```typescript
hooks.beforeResolve: AsyncSeriesWaterfallHook<[ResolveData | false]>
```

### 触发时机

在任何解析工作之前触发，是最早的介入点。

### 用途

- 跳过特定模块的解析
- 修改请求字符串
- 添加额外的上下文信息

### 示例

```typescript
// 跳过某些模块
normalModuleFactory.hooks.beforeResolve.tapAsync(
  'IgnorePlugin',
  (resolveData, callback) => {
    // 返回 false 跳过此模块
    if (/ignored-module/.test(resolveData.request)) {
      return callback(null, false);
    }
    callback(null, resolveData);
  }
);

// 重写请求
normalModuleFactory.hooks.beforeResolve.tapAsync(
  'AliasPlugin',
  (resolveData, callback) => {
    if (resolveData.request === '@utils') {
      resolveData.request = './src/utils/index.js';
    }
    callback(null, resolveData);
  }
);
```

## factorize

### 定义

```typescript
hooks.factorize: AsyncSeriesBailHook<[ResolveData], Module | undefined>
```

### 触发时机

beforeResolve 之后，是实际创建模块的核心钩子。

### 用途

- 完全接管模块创建
- 返回自定义模块类型
- 实现外部模块等特殊场景

### 示例

```typescript
// ExternalsPlugin 使用 factorize 返回 ExternalModule
normalModuleFactory.hooks.factorize.tapAsync(
  'ExternalsPlugin',
  (resolveData, callback) => {
    const request = resolveData.request;
    
    if (this.externals[request]) {
      // 直接返回外部模块，不走后续解析
      const externalModule = new ExternalModule(
        this.externals[request],
        'var',
        request
      );
      return callback(null, externalModule);
    }
    
    // 返回 undefined 继续正常流程
    callback(null, undefined);
  }
);
```

## resolve

### 定义

```typescript
hooks.resolve: AsyncSeriesBailHook<[ResolveData], Module | false | undefined>
```

### 触发时机

factorize 内部调用，负责实际的路径解析。

### 职责

1. 解析模块路径
2. 匹配 Loader 规则
3. 解析 Loader 路径
4. 获取 Parser 和 Generator

### 默认实现

```typescript
hooks.resolve.tapAsync(
  { name: 'NormalModuleFactory', stage: 100 },
  (resolveData, callback) => {
    const { context, request } = resolveData;
    
    // 1. 解析模块路径
    this.resolver.resolve(
      {},
      context,
      request,
      {},
      (err, resource, resourceResolveData) => {
        if (err) return callback(err);
        
        resolveData.resource = resource;
        resolveData.resourceQuery = resourceResolveData.query || '';
        resolveData.resourceFragment = resourceResolveData.fragment || '';
        
        // 2. 匹配 Loader 规则
        const matchedRules = this.ruleSet.exec({
          resource,
          realResource: resource,
          resourceQuery: resolveData.resourceQuery,
          issuer: resolveData.contextInfo.issuer,
        });
        
        resolveData.loaders = [];
        resolveData.type = 'javascript/auto';
        
        for (const rule of matchedRules) {
          if (rule.type) resolveData.type = rule.type;
          if (rule.use) {
            resolveData.loaders.push(...rule.use);
          }
        }
        
        // 3. 解析 Loader 路径
        this.resolveLoaders(resolveData.loaders, (err, loaders) => {
          if (err) return callback(err);
          
          resolveData.loaders = loaders;
          callback(null, undefined);  // 继续后续流程
        });
      }
    );
  }
);
```

## afterResolve

### 定义

```typescript
hooks.afterResolve: AsyncSeriesWaterfallHook<[ResolveData | false]>
```

### 触发时机

resolve 完成后，创建模块前的最后机会。

### 用途

- 最终修改解析结果
- 添加额外的 Loader
- 根据解析结果决定是否跳过

### 示例

```typescript
// 为特定文件添加 Loader
normalModuleFactory.hooks.afterResolve.tapAsync(
  'AddLoaderPlugin',
  (resolveData, callback) => {
    if (resolveData.resource.endsWith('.vue')) {
      // 确保 vue-loader 在最前面
      resolveData.loaders.unshift({
        loader: require.resolve('vue-loader'),
        options: {},
      });
    }
    callback(null, resolveData);
  }
);

// 条件性跳过
normalModuleFactory.hooks.afterResolve.tapAsync(
  'ConditionalIgnore',
  (resolveData, callback) => {
    // 根据解析后的实际路径判断
    if (resolveData.resource.includes('/test/')) {
      return callback(null, false);  // 跳过测试文件
    }
    callback(null, resolveData);
  }
);
```

## createModule

### 定义

```typescript
hooks.createModule: AsyncSeriesBailHook<[CreateModuleData, ResolveData], Module | undefined>
```

### 触发时机

afterResolve 之后，准备创建模块实例时。

### 用途

- 创建自定义模块类型
- 完全接管模块实例化

### 示例

```typescript
normalModuleFactory.hooks.createModule.tapAsync(
  'CustomModulePlugin',
  (createData, resolveData, callback) => {
    if (resolveData.type === 'custom/module') {
      const module = new CustomModule(createData);
      return callback(null, module);
    }
    callback(null, undefined);  // 使用默认创建
  }
);
```

### CreateModuleData 结构

```typescript
interface CreateModuleData {
  // 模块类型
  type: string;
  
  // 层级
  layer?: string;
  
  // 上下文
  context: string;
  
  // 请求信息
  request: string;
  userRequest: string;
  rawRequest: string;
  
  // 资源信息
  resource: string;
  resourceQuery: string;
  resourceFragment: string;
  
  // Loader 链
  loaders: LoaderItem[];
  
  // 解析器
  parser: Parser;
  parserOptions: object;
  
  // 生成器
  generator: Generator;
  generatorOptions: object;
  
  // 规则设置
  settings: object;
}
```

## module

### 定义

```typescript
hooks.module: SyncWaterfallHook<[Module, CreateModuleData, ResolveData]>
```

### 触发时机

模块实例创建后，返回前的最后处理。

### 用途

- 包装模块
- 添加额外属性
- 记录模块信息

### 示例

```typescript
normalModuleFactory.hooks.module.tap(
  'ModuleWrapperPlugin',
  (module, createData, resolveData) => {
    // 添加自定义属性
    module.customData = {
      createdAt: Date.now(),
      issuer: resolveData.contextInfo.issuer,
    };
    
    return module;
  }
);
```

## Parser 相关钩子

### createParser

```typescript
hooks.createParser: HookMap<SyncBailHook<[ParserOptions], Parser>>
```

按模块类型创建 Parser：

```typescript
// 为 javascript/auto 类型注册 Parser 创建
normalModuleFactory.hooks.createParser
  .for('javascript/auto')
  .tap('JavascriptModulesPlugin', (parserOptions) => {
    return new JavascriptParser(parserOptions);
  });

// 为 json 类型注册
normalModuleFactory.hooks.createParser
  .for('json')
  .tap('JsonModulesPlugin', (parserOptions) => {
    return new JsonParser(parserOptions);
  });
```

### parser

```typescript
hooks.parser: HookMap<SyncHook<[Parser, ParserOptions]>>
```

Parser 创建后的配置钩子：

```typescript
// 配置 JavaScript Parser
normalModuleFactory.hooks.parser
  .for('javascript/auto')
  .tap('ProvidePlugin', (parser, parserOptions) => {
    // 添加变量注入
    parser.hooks.expression
      .for('jQuery')
      .tap('ProvidePlugin', (expr) => {
        // 注入 require('jquery')
        return this.addDependency(parser, 'jquery');
      });
  });
```

## Generator 相关钩子

### createGenerator

```typescript
hooks.createGenerator: HookMap<SyncBailHook<[GeneratorOptions], Generator>>
```

```typescript
normalModuleFactory.hooks.createGenerator
  .for('javascript/auto')
  .tap('JavascriptModulesPlugin', (generatorOptions) => {
    return new JavascriptGenerator(generatorOptions);
  });
```

### generator

```typescript
hooks.generator: HookMap<SyncHook<[Generator, GeneratorOptions]>>
```

```typescript
normalModuleFactory.hooks.generator
  .for('javascript/auto')
  .tap('MyPlugin', (generator, options) => {
    // 配置生成器
  });
```

## 钩子调用链实现

```typescript
export class NormalModuleFactory {
  create(data: ModuleFactoryCreateData, callback: Callback): void {
    // 构建 resolveData
    const resolveData = this.buildResolveData(data);
    
    // 1. beforeResolve
    this.hooks.beforeResolve.callAsync(resolveData, (err, result) => {
      if (err) return callback(err);
      if (result === false) return callback(null, undefined);
      
      const data = result || resolveData;
      
      // 2. factorize
      this.hooks.factorize.callAsync(data, (err, module) => {
        if (err) return callback(err);
        
        callback(null, {
          module,
          fileDependencies: data.fileDependencies,
          missingDependencies: data.missingDependencies,
          contextDependencies: data.contextDependencies,
        });
      });
    });
  }
  
  private setupDefaultHooks(): void {
    // factorize 默认处理
    this.hooks.factorize.tapAsync(
      { name: 'NormalModuleFactory', stage: 100 },
      (resolveData, callback) => {
        // 3. resolve
        this.hooks.resolve.callAsync(resolveData, (err, result) => {
          if (err) return callback(err);
          if (result === false) return callback(null, undefined);
          if (result instanceof Module) return callback(null, result);
          
          // 4. afterResolve
          this.hooks.afterResolve.callAsync(resolveData, (err, result) => {
            if (err) return callback(err);
            if (result === false) return callback(null, undefined);
            
            // 构建 createData
            const createData = this.buildCreateData(resolveData);
            
            // 5. createModule
            this.hooks.createModule.callAsync(
              createData,
              resolveData,
              (err, createdModule) => {
                if (err) return callback(err);
                
                // 默认创建 NormalModule
                let module = createdModule;
                if (!module) {
                  module = new NormalModule(createData);
                }
                
                // 6. module
                module = this.hooks.module.call(
                  module,
                  createData,
                  resolveData
                );
                
                callback(null, module);
              }
            );
          });
        });
      }
    );
  }
}
```

## 实际应用示例

### IgnorePlugin

```typescript
class IgnorePlugin {
  constructor(options) {
    this.resourceRegExp = options.resourceRegExp;
    this.contextRegExp = options.contextRegExp;
  }
  
  apply(compiler) {
    compiler.hooks.compile.tap('IgnorePlugin', (params) => {
      params.normalModuleFactory.hooks.beforeResolve.tap(
        'IgnorePlugin',
        (resolveData) => {
          if (
            this.resourceRegExp.test(resolveData.request) &&
            (!this.contextRegExp || this.contextRegExp.test(resolveData.context))
          ) {
            return false;  // 忽略此模块
          }
        }
      );
    });
  }
}
```

### NormalModuleReplacementPlugin

```typescript
class NormalModuleReplacementPlugin {
  constructor(resourceRegExp, newResource) {
    this.resourceRegExp = resourceRegExp;
    this.newResource = newResource;
  }
  
  apply(compiler) {
    compiler.hooks.compile.tap('NormalModuleReplacementPlugin', (params) => {
      params.normalModuleFactory.hooks.beforeResolve.tap(
        'NormalModuleReplacementPlugin',
        (resolveData) => {
          if (this.resourceRegExp.test(resolveData.request)) {
            if (typeof this.newResource === 'function') {
              this.newResource(resolveData);
            } else {
              resolveData.request = this.newResource;
            }
          }
        }
      );
    });
  }
}
```

## 总结

NormalModuleFactory 的钩子体系提供了完整的扩展能力：

**钩子执行顺序**：
1. `beforeResolve` → 可跳过或修改
2. `factorize` → 可直接返回模块
3. `resolve` → 执行路径解析
4. `afterResolve` → 修改解析结果
5. `createModule` → 创建模块实例
6. `module` → 包装或修改模块

**常见用途**：
- `beforeResolve`：忽略、替换模块
- `factorize`：外部化、自定义模块
- `afterResolve`：添加 Loader
- `createModule`：自定义模块类型
- `parser/generator`：配置解析和生成

下一章我们将实现 create 方法的完整逻辑。
