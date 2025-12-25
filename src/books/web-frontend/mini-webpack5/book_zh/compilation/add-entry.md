---
sidebar_position: 30
title: "addEntry 方法：入口添加"
---

# addEntry 方法：入口添加

每一次 Webpack 构建都从入口开始。`addEntry` 方法是这个旅程的起点——它接收入口配置，创建入口依赖，然后启动模块的解析和构建。

## 入口的本质

思考一下：入口是什么？

从配置角度看，入口是一个文件路径：

```javascript
// webpack.config.js
module.exports = {
  entry: './src/index.js',
  // 或多入口
  entry: {
    main: './src/main.js',
    admin: './src/admin.js',
  },
};
```

但在 Webpack 内部，入口被转换为**依赖对象（Dependency）**。为什么？

因为 Webpack 的模块系统是以依赖为核心的：
- 入口是"对入口模块的依赖"
- import 语句是"对其他模块的依赖"
- require 调用是"对其他模块的依赖"

统一用依赖对象表示，可以复用同一套解析和构建流程。

## addEntry 的职责

```
           入口配置
               │
               ▼
    ┌──────────────────────┐
    │      addEntry        │
    │                      │
    │  1. 创建 EntryDependency │
    │  2. 记录入口信息      │
    │  3. 调用 addModuleTree │
    │  4. 创建 Entrypoint   │
    │                      │
    └──────────┬───────────┘
               │
               ▼
         模块解析与构建
```

`addEntry` 是 Compilation 的公开方法，由 EntryPlugin 调用。它的职责是：

1. 创建入口依赖对象
2. 在 Compilation 中记录入口信息
3. 触发模块的解析和构建
4. 创建对应的 Entrypoint（入口点）

## EntryDependency

首先，我们需要一个入口依赖类：

```typescript
import { ModuleDependency } from './ModuleDependency';

/**
 * 入口依赖
 */
export class EntryDependency extends ModuleDependency {
  /**
   * @param request 入口路径
   */
  constructor(request: string) {
    super(request);
  }
  
  get type(): string {
    return 'entry';
  }
  
  get category(): string {
    return 'esm'; // 入口默认当作 ES Module
  }
}
```

## EntryPlugin：入口插件

入口的添加由 EntryPlugin 触发：

```typescript
import { Compiler, Compilation } from './Compiler';
import { EntryDependency } from './EntryDependency';

export interface EntryOptions {
  name: string;
  filename?: string;
  runtime?: string | false;
  dependOn?: string | string[];
  publicPath?: string;
}

export class EntryPlugin {
  private context: string;
  private entry: string;
  private options: EntryOptions;
  
  constructor(context: string, entry: string, options: EntryOptions | string) {
    this.context = context;
    this.entry = entry;
    this.options = typeof options === 'string' 
      ? { name: options } 
      : options;
  }
  
  apply(compiler: Compiler) {
    compiler.hooks.compilation.tap(
      'EntryPlugin',
      (compilation, { normalModuleFactory }) => {
        // 注册入口依赖的模块工厂
        compilation.dependencyFactories.set(
          EntryDependency,
          normalModuleFactory
        );
      }
    );
    
    // 在 make 阶段添加入口
    compiler.hooks.make.tapAsync('EntryPlugin', (compilation, callback) => {
      const dep = new EntryDependency(this.entry);
      dep.loc = { name: this.options.name };
      
      compilation.addEntry(
        this.context,
        dep,
        this.options,
        (err) => {
          callback(err);
        }
      );
    });
  }
}
```

## addEntry 实现

```typescript
export interface EntryData {
  /** 入口依赖列表 */
  dependencies: Dependency[];
  /** 额外包含的依赖 */
  includeDependencies: Dependency[];
  /** 入口选项 */
  options: EntryOptions;
}

export class Compilation {
  entries: Map<string, EntryData> = new Map();
  
  /**
   * 添加入口
   */
  addEntry(
    context: string,
    dependency: Dependency,
    options: EntryOptions,
    callback: (err?: Error, module?: Module) => void
  ): void {
    // 入口名称
    const name = options.name;
    
    // 获取或创建入口数据
    let entryData = this.entries.get(name);
    
    if (!entryData) {
      entryData = {
        dependencies: [],
        includeDependencies: [],
        options: {
          name,
          ...options,
        },
      };
      this.entries.set(name, entryData);
    }
    
    // 添加依赖到入口
    entryData.dependencies.push(dependency);
    
    // 触发 addEntry 钩子
    this.hooks.addEntry.call(dependency, options);
    
    // 开始构建模块树
    this.addModuleTree(
      {
        context,
        dependency,
        contextInfo: { issuer: '' },
      },
      (err, module) => {
        if (err) {
          this.hooks.failedEntry.call(dependency, options, err);
          return callback(err);
        }
        
        this.hooks.succeedEntry.call(dependency, options, module!);
        callback(undefined, module);
      }
    );
  }
  
  /**
   * 添加模块树（从依赖开始构建）
   */
  addModuleTree(
    options: {
      context: string;
      dependency: Dependency;
      contextInfo?: { issuer: string };
    },
    callback: (err?: Error, module?: Module) => void
  ): void {
    const { context, dependency } = options;
    
    // 获取依赖对应的模块工厂
    const Dep = dependency.constructor as typeof Dependency;
    const moduleFactory = this.dependencyFactories.get(Dep);
    
    if (!moduleFactory) {
      return callback(
        new Error(
          `No module factory available for dependency type: ${dependency.constructor.name}`
        )
      );
    }
    
    // 调用 handleModuleCreation 创建模块
    this.handleModuleCreation(
      {
        factory: moduleFactory,
        dependencies: [dependency],
        context,
        originModule: null,
      },
      (err, result) => {
        if (err) {
          return callback(err);
        }
        callback(undefined, result?.module);
      }
    );
  }
  
  /**
   * 处理模块创建
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
    
    // 1. 工厂化模块
    this.factorizeModule(
      {
        factory,
        dependencies,
        context,
        originModule,
      },
      (err, factoryResult) => {
        if (err) {
          return callback(err);
        }
        
        if (!factoryResult) {
          return callback();
        }
        
        const newModule = factoryResult.module;
        
        // 2. 添加模块到 compilation
        this.addModule(newModule, (err, module) => {
          if (err) {
            return callback(err);
          }
          
          // 3. 建立依赖关系
          for (const dep of dependencies) {
            this.moduleGraph.setResolvedModule(
              originModule,
              dep,
              module!
            );
          }
          
          // 4. 构建模块
          this.buildModule(module!, (err) => {
            if (err) {
              return callback(err);
            }
            
            // 5. 处理模块的依赖
            this.processModuleDependencies(module!, (err) => {
              if (err) {
                return callback(err);
              }
              
              callback(undefined, { module: module! });
            });
          });
        });
      }
    );
  }
}
```

## Entrypoint 创建

入口模块构建完成后，需要创建对应的 Entrypoint：

```typescript
import { ChunkGroup, Entrypoint } from './ChunkGroup';
import { Chunk } from './Chunk';

export class Compilation {
  /**
   * 在 seal 阶段创建入口的 Chunk 和 Entrypoint
   */
  private createEntryChunks(): void {
    for (const [name, entryData] of this.entries) {
      // 创建入口 Chunk
      const chunk = new Chunk(name);
      chunk.name = name;
      this.chunks.add(chunk);
      
      // 创建 Entrypoint（特殊的 ChunkGroup）
      const entrypoint = new Entrypoint(name);
      entrypoint.setRuntimeChunk(chunk);
      entrypoint.pushChunk(chunk);
      
      // 设置文件名
      if (entryData.options.filename) {
        entrypoint.options.filename = entryData.options.filename;
      }
      
      // 记录 Entrypoint
      this.entrypoints.set(name, entrypoint);
      this.chunkGroups.push(entrypoint);
      
      // 连接入口模块到 Chunk
      for (const dep of entryData.dependencies) {
        const module = this.moduleGraph.getModule(dep);
        if (module) {
          this.chunkGraph.connectChunkAndEntryModule(
            chunk,
            module,
            entrypoint
          );
        }
      }
    }
  }
}
```

## 完整的入口处理流程

```
                 webpack.config.js
                        │
                        │ entry: './src/index.js'
                        ▼
            ┌───────────────────────┐
            │    WebpackOptionsApply │
            │    创建 EntryPlugin    │
            └───────────┬───────────┘
                        │
                        │ make 钩子
                        ▼
            ┌───────────────────────┐
            │      EntryPlugin       │
            │  创建 EntryDependency  │
            │  调用 addEntry        │
            └───────────┬───────────┘
                        │
                        ▼
            ┌───────────────────────┐
            │       addEntry        │
            │  记录入口信息          │
            │  调用 addModuleTree   │
            └───────────┬───────────┘
                        │
                        ▼
            ┌───────────────────────┐
            │   handleModuleCreation │
            │                        │
            │  factorizeModule       │
            │       ↓                │
            │  addModule            │
            │       ↓                │
            │  buildModule          │
            │       ↓                │
            │  processModuleDependencies │
            └───────────┬───────────┘
                        │
                        │ 递归处理所有依赖
                        ▼
            ┌───────────────────────┐
            │       seal            │
            │  createEntryChunks    │
            │  创建 Entrypoint      │
            └───────────────────────┘
```

## 多入口处理

Webpack 支持多入口配置：

```javascript
module.exports = {
  entry: {
    main: './src/main.js',
    admin: './src/admin.js',
  },
};
```

这会创建两个 EntryPlugin，分别在 make 阶段添加入口：

```typescript
// 多入口的处理
class EntryOptionPlugin {
  apply(compiler: Compiler) {
    compiler.hooks.entryOption.tap('EntryOptionPlugin', (context, entry) => {
      if (typeof entry === 'string') {
        // 单入口字符串
        new EntryPlugin(context, entry, { name: 'main' }).apply(compiler);
      } else if (Array.isArray(entry)) {
        // 数组形式（多个文件合并到一个入口）
        for (const item of entry) {
          new EntryPlugin(context, item, { name: 'main' }).apply(compiler);
        }
      } else if (typeof entry === 'object') {
        // 对象形式（多入口）
        for (const [name, value] of Object.entries(entry)) {
          if (typeof value === 'string') {
            new EntryPlugin(context, value, { name }).apply(compiler);
          } else if (Array.isArray(value)) {
            for (const item of value) {
              new EntryPlugin(context, item, { name }).apply(compiler);
            }
          } else {
            // 完整配置对象
            const { import: imports, ...options } = value;
            for (const item of [].concat(imports)) {
              new EntryPlugin(context, item, { name, ...options }).apply(compiler);
            }
          }
        }
      }
    });
  }
}
```

## dependOn：入口依赖

Webpack 5 支持入口之间的依赖关系：

```javascript
module.exports = {
  entry: {
    vendor: './src/vendor.js',
    main: {
      import: './src/main.js',
      dependOn: 'vendor', // main 依赖 vendor
    },
  },
};
```

这意味着 `main` 入口假设 `vendor` 已经加载，不会重复打包公共模块：

```typescript
class Compilation {
  // 在 seal 阶段处理 dependOn
  private handleEntryDependOn(): void {
    for (const [name, entryData] of this.entries) {
      const { dependOn } = entryData.options;
      
      if (!dependOn) continue;
      
      const dependOnEntries = Array.isArray(dependOn) ? dependOn : [dependOn];
      const entrypoint = this.entrypoints.get(name);
      
      for (const dep of dependOnEntries) {
        const depEntrypoint = this.entrypoints.get(dep);
        
        if (!depEntrypoint) {
          this.errors.push(
            new Error(`Entry "${name}" depends on "${dep}", which is not found`)
          );
          continue;
        }
        
        // 建立 ChunkGroup 之间的依赖关系
        entrypoint?.addParent(depEntrypoint);
        depEntrypoint?.addChild(entrypoint!);
      }
    }
  }
}
```

## 钩子扩展点

addEntry 过程中有多个钩子可以扩展：

```typescript
// Compilation 的入口相关钩子
hooks: {
  addEntry: new SyncHook<[Dependency, EntryOptions]>(['dependency', 'options']),
  failedEntry: new SyncHook<[Dependency, EntryOptions, Error]>(['dependency', 'options', 'error']),
  succeedEntry: new SyncHook<[Dependency, EntryOptions, Module]>(['dependency', 'options', 'module']),
}

// 使用示例
compilation.hooks.addEntry.tap('MyPlugin', (dependency, options) => {
  console.log(`Adding entry: ${options.name}`);
});

compilation.hooks.succeedEntry.tap('MyPlugin', (dependency, options, module) => {
  console.log(`Entry ${options.name} resolved to ${module.identifier()}`);
});
```

## Mini-Webpack 完整实现

```typescript
export class Compilation {
  entries: Map<string, EntryData> = new Map();
  entrypoints: Map<string, Entrypoint> = new Map();
  
  dependencyFactories: Map<typeof Dependency, ModuleFactory> = new Map();
  
  hooks = {
    addEntry: new SyncHook<[Dependency, EntryOptions]>(['dependency', 'options']),
    failedEntry: new SyncHook<[Dependency, EntryOptions, Error]>(['dependency', 'options', 'error']),
    succeedEntry: new SyncHook<[Dependency, EntryOptions, Module]>(['dependency', 'options', 'module']),
    // ... 其他钩子
  };
  
  addEntry(
    context: string,
    dependency: Dependency,
    options: EntryOptions,
    callback: (err?: Error, module?: Module) => void
  ): void {
    const name = options.name;
    
    // 获取或创建入口数据
    let entryData = this.entries.get(name);
    if (!entryData) {
      entryData = {
        dependencies: [],
        includeDependencies: [],
        options: { name, ...options },
      };
      this.entries.set(name, entryData);
    }
    
    entryData.dependencies.push(dependency);
    
    // 触发钩子
    this.hooks.addEntry.call(dependency, options);
    
    // 开始构建
    this.addModuleTree({ context, dependency }, (err, module) => {
      if (err) {
        this.hooks.failedEntry.call(dependency, options, err);
        return callback(err);
      }
      
      this.hooks.succeedEntry.call(dependency, options, module!);
      callback(undefined, module);
    });
  }
  
  addModuleTree(
    options: { context: string; dependency: Dependency },
    callback: (err?: Error, module?: Module) => void
  ): void {
    const { context, dependency } = options;
    const Dep = dependency.constructor as typeof Dependency;
    const factory = this.dependencyFactories.get(Dep);
    
    if (!factory) {
      return callback(new Error(`No factory for ${Dep.name}`));
    }
    
    this.handleModuleCreation(
      { factory, dependencies: [dependency], context, originModule: null },
      (err, result) => callback(err, result?.module)
    );
  }
}
```

## 小结

addEntry 是 Webpack 构建的起点。理解它，你就理解了整个构建流程是如何启动的。

关键要点：

1. **入口即依赖**：入口被表示为 EntryDependency
2. **EntryPlugin**：负责在 make 阶段调用 addEntry
3. **addModuleTree**：从入口依赖开始构建模块树
4. **多入口**：每个入口对应一个 Entrypoint
5. **dependOn**：Webpack 5 支持入口间依赖

下一节，我们将学习 factorizeModule——模块是如何被"工厂化"创建的。
