# Webpack 源码结构导读

在动手实现之前，让我们先了解 Webpack 官方源码的结构。这将帮助我们理解各个模块的职责和相互关系，也为我们的实现提供参考。

## 获取源码

```bash
git clone https://github.com/webpack/webpack.git
cd webpack
git checkout v5.89.0  # 切换到具体版本
npm install
```

## 顶层目录结构

```
webpack/
├── lib/                  # 核心源码
├── declarations/         # TypeScript 类型声明
├── types/               # 导出的类型定义
├── bin/                 # 命令行入口
├── schemas/             # 配置校验 Schema
├── examples/            # 示例项目
├── test/                # 测试用例
├── tooling/             # 开发工具
├── benchmark/           # 性能基准测试
└── package.json
```

核心代码在 `lib/` 目录，我们重点关注这个目录。

## lib 目录详解

`lib/` 目录包含了 Webpack 的所有核心实现：

```
lib/
├── index.js                    # 入口文件
├── webpack.js                  # webpack() 函数
├── Compiler.js                 # 编译器
├── Compilation.js              # 编译过程
├── Module.js                   # 模块基类
├── NormalModule.js             # 普通模块
├── Chunk.js                    # 代码块
├── ChunkGroup.js               # 代码块组
├── Entrypoint.js               # 入口点
├── ModuleGraph.js              # 模块依赖图
├── ChunkGraph.js               # 代码块依赖图
├── Stats.js                    # 统计信息
├── dependencies/               # 依赖类型
├── javascript/                 # JavaScript 相关
├── optimize/                   # 优化插件
├── runtime/                    # 运行时模块
├── serialization/              # 序列化（缓存）
├── util/                       # 工具函数
├── node/                       # Node.js 相关
├── web/                        # Web 相关
├── config/                     # 配置处理
├── schemes/                    # URI schemes 处理
└── ...
```

### 核心类

让我们逐个了解核心类的职责：

**Compiler.js**：编译器，Webpack 的核心调度器

```javascript
class Compiler {
  constructor(context, options) {
    this.hooks = Object.freeze({
      initialize: new SyncHook([]),
      shouldEmit: new SyncBailHook(["compilation"]),
      done: new AsyncSeriesHook(["stats"]),
      afterDone: new SyncHook(["stats"]),
      additionalPass: new AsyncSeriesHook([]),
      beforeRun: new AsyncSeriesHook(["compiler"]),
      run: new AsyncSeriesHook(["compiler"]),
      emit: new AsyncSeriesHook(["compilation"]),
      assetEmitted: new AsyncSeriesHook(["file", "info"]),
      afterEmit: new AsyncSeriesHook(["compilation"]),
      thisCompilation: new SyncHook(["compilation", "params"]),
      compilation: new SyncHook(["compilation", "params"]),
      normalModuleFactory: new SyncHook(["normalModuleFactory"]),
      contextModuleFactory: new SyncHook(["contextModuleFactory"]),
      beforeCompile: new AsyncSeriesHook(["params"]),
      compile: new SyncHook(["params"]),
      make: new AsyncParallelHook(["compilation"]),
      finishMake: new AsyncSeriesHook(["compilation"]),
      afterCompile: new AsyncSeriesHook(["compilation"]),
      readRecords: new AsyncSeriesHook([]),
      emitRecords: new AsyncSeriesHook([]),
      watchRun: new AsyncSeriesHook(["compiler"]),
      failed: new SyncHook(["error"]),
      invalid: new SyncHook(["filename", "changeTime"]),
      watchClose: new SyncHook([]),
      shutdown: new AsyncSeriesHook([]),
      infrastructureLog: new SyncBailHook(["origin", "type", "args"]),
      environment: new SyncHook([]),
      afterEnvironment: new SyncHook([]),
      afterPlugins: new SyncHook(["compiler"]),
      afterResolvers: new SyncHook(["compiler"]),
      entryOption: new SyncBailHook(["context", "entry"])
    });
    // ...
  }
}
```

Compiler 定义了整个构建流程的钩子，插件通过这些钩子介入构建过程。

**Compilation.js**：单次编译的执行者

```javascript
class Compilation {
  constructor(compiler, params) {
    this.hooks = Object.freeze({
      buildModule: new SyncHook(["module"]),
      rebuildModule: new SyncHook(["module"]),
      failedModule: new SyncHook(["module", "error"]),
      succeedModule: new SyncHook(["module"]),
      stillValidModule: new SyncHook(["module"]),
      addEntry: new SyncHook(["entry", "options"]),
      failedEntry: new SyncHook(["entry", "options", "error"]),
      succeedEntry: new SyncHook(["entry", "options", "module"]),
      dependencyReferencedExports: new SyncWaterfallHook([
        "referencedExports",
        "dependency",
        "runtime"
      ]),
      finishModules: new AsyncSeriesHook(["modules"]),
      finishRebuildingModule: new AsyncSeriesHook(["module"]),
      unseal: new SyncHook([]),
      seal: new SyncHook([]),
      beforeChunks: new SyncHook([]),
      afterChunks: new SyncHook(["chunks"]),
      optimizeDependencies: new SyncBailHook(["modules"]),
      afterOptimizeDependencies: new SyncHook(["modules"]),
      optimize: new SyncHook([]),
      optimizeModules: new SyncBailHook(["modules"]),
      afterOptimizeModules: new SyncHook(["modules"]),
      optimizeChunks: new SyncBailHook(["chunks", "chunkGroups"]),
      afterOptimizeChunks: new SyncHook(["chunks", "chunkGroups"]),
      // ... 更多钩子
    });
    
    this.modules = new Set();
    this.chunks = new Set();
    this.assets = {};
    this.moduleGraph = new ModuleGraph();
    this.chunkGraph = new ChunkGraph(this.moduleGraph);
    // ...
  }
}
```

Compilation 包含了构建过程中的所有状态：模块、chunk、资源等。

**Module.js**：模块基类

```javascript
class Module {
  constructor(type, context, layer) {
    this.type = type;
    this.context = context;
    this.layer = layer;
    this.dependencies = [];
    this.blocks = [];
  }
  
  // 核心方法
  identifier() { /* 返回模块唯一标识 */ }
  readableIdentifier(requestShortener) { /* 返回可读标识 */ }
  build(options, compilation, resolver, fs, callback) { /* 构建模块 */ }
  getSourceTypes() { /* 返回源码类型 */ }
  source(dependencyTemplates, runtimeTemplate, type) { /* 生成代码 */ }
  size(type) { /* 返回模块大小 */ }
}
```

**NormalModule.js**：最常见的模块类型

```javascript
class NormalModule extends Module {
  constructor({
    layer,
    type,
    request,
    userRequest,
    rawRequest,
    loaders,
    resource,
    resourceResolveData,
    parser,
    generator,
    // ...
  }) {
    super(type, getContext(resource), layer);
    this.request = request;
    this.loaders = loaders;
    this.resource = resource;
    this.parser = parser;
    this.generator = generator;
  }
  
  build(options, compilation, resolver, fs, callback) {
    // 1. 执行 loaders
    // 2. 解析源码，提取依赖
    // 3. 创建 Source 对象
  }
}
```

### 模块工厂

模块工厂负责创建模块实例：

```
lib/
├── NormalModuleFactory.js      # 普通模块工厂
├── ContextModuleFactory.js     # 上下文模块工厂
└── ModuleFactory.js            # 模块工厂基类
```

**NormalModuleFactory.js** 的核心流程：

1. 解析模块请求，提取 loader 和资源路径
2. 解析资源的绝对路径
3. 解析 loader 的绝对路径
4. 创建 NormalModule 实例

### 依赖系统

依赖类型定义在 `dependencies/` 目录：

```
lib/dependencies/
├── ModuleDependency.js                  # 模块依赖基类
├── HarmonyImportDependency.js           # ESM import
├── HarmonyExportImportedSpecifierDependency.js  # ESM export ... from
├── HarmonyExportSpecifierDependency.js  # ESM export
├── CommonJsRequireDependency.js         # CJS require
├── CommonJsExportsDependency.js         # CJS exports
├── ImportDependency.js                  # 动态 import()
├── EntryDependency.js                   # 入口依赖
└── ...
```

每个依赖类型都有对应的 Template，用于代码生成。

### JavaScript 处理

JavaScript 相关代码在 `javascript/` 目录：

```
lib/javascript/
├── JavascriptParser.js          # JS 解析器
├── JavascriptGenerator.js       # JS 代码生成器
├── JavascriptModulesPlugin.js   # JS 模块插件
├── BasicEvaluatedExpression.js  # 表达式求值
└── ...
```

**JavascriptParser.js** 是核心，它负责：
- 解析 JavaScript AST
- 识别 import/export/require 语句
- 创建对应的 Dependency 对象
- 进行作用域分析

### 优化相关

优化插件在 `optimize/` 目录：

```
lib/optimize/
├── SplitChunksPlugin.js           # 代码分割
├── ModuleConcatenationPlugin.js   # Scope Hoisting
├── SideEffectsFlagPlugin.js       # 副作用标记
├── FlagDependencyExportsPlugin.js # 导出使用标记
├── FlagDependencyUsagePlugin.js   # 依赖使用标记
├── MangleExportsPlugin.js         # 导出名称压缩
├── RealContentHashPlugin.js       # 真实内容哈希
└── ...
```

### 运行时

运行时模块在 `runtime/` 目录：

```
lib/runtime/
├── RuntimeModule.js             # 运行时模块基类
├── StartupChunkDependenciesRuntimeModule.js
├── PublicPathRuntimeModule.js
├── GetChunkFilenameRuntimeModule.js
├── LoadScriptRuntimeModule.js
├── CompatRuntimeModule.js
└── ...
```

运行时模块生成 `__webpack_require__`、`__webpack_chunk_load__` 等运行时代码。

### 序列化（缓存）

缓存相关代码在 `serialization/` 目录：

```
lib/serialization/
├── BinaryMiddleware.js
├── FileMiddleware.js
├── ObjectMiddleware.js
├── Serializer.js
└── ...
```

这些实现了 Webpack 5 的持久化缓存功能。

## 关键流程分析

### webpack() 函数

入口点在 `lib/webpack.js`：

```javascript
const webpack = (options, callback) => {
  // 1. 校验配置
  const webpackOptionsSchemaCheck = (options) => { /* ... */ };
  
  // 2. 处理多配置
  const create = () => {
    if (Array.isArray(options)) {
      // 创建 MultiCompiler
    } else {
      // 创建单个 Compiler
    }
  };
  
  // 3. 应用默认配置
  // 4. 创建 Compiler 实例
  // 5. 应用插件
  // 6. 返回 Compiler
};
```

### Compiler.run() 流程

```javascript
class Compiler {
  run(callback) {
    const run = () => {
      this.hooks.beforeRun.callAsync(this, err => {
        if (err) return finalCallback(err);
        
        this.hooks.run.callAsync(this, err => {
          if (err) return finalCallback(err);
          
          this.readRecords(err => {
            if (err) return finalCallback(err);
            
            this.compile(onCompiled);
          });
        });
      });
    };
    
    run();
  }
  
  compile(callback) {
    const params = this.newCompilationParams();
    
    this.hooks.beforeCompile.callAsync(params, err => {
      if (err) return callback(err);
      
      this.hooks.compile.call(params);
      
      const compilation = this.newCompilation(params);
      
      this.hooks.make.callAsync(compilation, err => {
        if (err) return callback(err);
        
        compilation.finish(err => {
          if (err) return callback(err);
          
          compilation.seal(err => {
            if (err) return callback(err);
            
            this.hooks.afterCompile.callAsync(compilation, err => {
              if (err) return callback(err);
              
              return callback(null, compilation);
            });
          });
        });
      });
    });
  }
}
```

### Compilation.seal() 流程

seal 是 Compilation 的核心方法，负责将模块组装成 chunk：

```javascript
class Compilation {
  seal(callback) {
    this.hooks.seal.call();
    
    // 1. 创建 chunk 和 chunk group
    this.hooks.beforeChunks.call();
    // ... 创建逻辑
    this.hooks.afterChunks.call(this.chunks);
    
    // 2. 优化依赖
    this.hooks.optimizeDependencies.call(this.modules);
    this.hooks.afterOptimizeDependencies.call(this.modules);
    
    // 3. 优化
    this.hooks.optimize.call();
    
    // 4. 优化模块
    while (this.hooks.optimizeModules.call(this.modules)) { /* 循环优化 */ }
    this.hooks.afterOptimizeModules.call(this.modules);
    
    // 5. 优化 chunk
    while (this.hooks.optimizeChunks.call(this.chunks, this.chunkGroups)) { /* 循环优化 */ }
    this.hooks.afterOptimizeChunks.call(this.chunks, this.chunkGroups);
    
    // 6. 更多优化阶段...
    
    // 7. 代码生成
    this.codeGeneration(err => {
      if (err) return callback(err);
      
      // 8. 创建资源
      this.createChunkAssets(err => {
        if (err) return callback(err);
        
        // 9. 处理资源
        this.hooks.processAssets.callAsync(this.assets, err => {
          callback(err);
        });
      });
    });
  }
}
```

## 代码量统计

让我们看看 Webpack 源码的规模：

| 目录/文件 | 行数（约） | 说明 |
|-----------|-----------|------|
| Compilation.js | 4,500 | 最大的单文件 |
| Compiler.js | 1,200 | 编译器 |
| NormalModule.js | 1,100 | 普通模块 |
| NormalModuleFactory.js | 800 | 模块工厂 |
| ModuleGraph.js | 600 | 模块图 |
| ChunkGraph.js | 500 | chunk 图 |
| javascript/ 目录 | 8,000+ | JS 处理 |
| dependencies/ 目录 | 15,000+ | 依赖类型 |
| optimize/ 目录 | 10,000+ | 优化插件 |
| **总计** | **100,000+** | 整个 lib 目录 |

这个规模告诉我们：Webpack 是一个非常复杂的系统。但不用担心，我们的 Mini-Webpack 会简化很多细节，专注于核心逻辑。

## 阅读源码建议

1. **从入口开始**：`lib/webpack.js` → `Compiler.js` → `Compilation.js`
2. **关注钩子**：理解每个钩子的触发时机和用途
3. **跟踪数据流**：观察模块、chunk、资源是如何流转的
4. **使用调试器**：打断点比读代码更有效
5. **参考测试用例**：`test/` 目录有丰富的测试用例

## 本章小结

- Webpack 源码主要在 `lib/` 目录，包含约 10 万行代码
- 核心类：`Compiler`（调度器）、`Compilation`（执行者）、`Module`（模块）
- 模块工厂负责创建模块，依赖系统描述模块间关系
- 构建流程：初始化 → make（构建模块）→ seal（生成 chunk）→ emit（输出资源）
- 整个流程通过 Tapable 钩子串联，插件通过钩子介入

至此，第一部分"基础概念与环境准备"结束。下一部分，我们将开始实现 Tapable 事件系统——这是 Webpack 插件机制的基础。
