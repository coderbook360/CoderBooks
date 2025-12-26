---
sidebar_position: 38
title: "模块构建流程详解"
---

# 模块构建流程详解

模块构建是 Webpack 的核心流程之一。本章详细剖析从源文件到可执行模块的完整构建过程。

## 构建流程概览

一个模块的构建经历以下阶段：

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  读取文件   │ ──▶ │ 执行 Loader │ ──▶ │ 解析源码    │
└─────────────┘     └─────────────┘     └─────────────┘
                                               │
                                               ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ 代码生成    │ ◀── │ 依赖连接    │ ◀── │ 提取依赖    │
└─────────────┘     └─────────────┘     └─────────────┘
```

每个阶段的职责：

1. **读取文件**：从文件系统加载源码
2. **执行 Loader**：应用 Loader 链转换内容
3. **解析源码**：使用 Parser 分析代码结构
4. **提取依赖**：识别 import/require 等依赖声明
5. **依赖连接**：将依赖解析为具体模块
6. **代码生成**：使用 Generator 生成运行时代码

## 构建触发点

模块构建的入口是 `Compilation.buildModule`：

```typescript
export class Compilation {
  /**
   * 构建模块
   */
  buildModule(
    module: Module,
    callback: (err?: Error | null) => void
  ): void {
    // 触发构建开始钩子
    this.hooks.buildModule.call(module);
    
    // 记录构建开始时间
    const startTime = Date.now();
    
    // 调用模块的 build 方法
    module.build(
      this.options,
      this,
      this.resolverFactory.get('normal'),
      this.inputFileSystem,
      (err) => {
        // 记录构建时间
        module.buildInfo.buildTimestamp = startTime;
        
        if (err) {
          // 触发构建失败钩子
          this.hooks.failedModule.call(module, err);
          return callback(err);
        }
        
        // 触发构建成功钩子
        this.hooks.succeedModule.call(module);
        callback();
      }
    );
  }
}
```

## Loader 执行阶段

### Loader 链的组织

Loader 按照配置顺序组织成链：

```typescript
// webpack.config.js
module.exports = {
  module: {
    rules: [
      {
        test: /\.css$/,
        use: [
          'style-loader',    // 第三个执行（pitching 第一个）
          'css-loader',      // 第二个执行
          'postcss-loader',  // 第一个执行
        ],
      },
    ],
  },
};
```

**执行顺序**：

```
postcss-loader → css-loader → style-loader
(从右到左，从下到上)
```

### Loader Runner

使用 loader-runner 执行 Loader 链：

```typescript
import { runLoaders, LoaderContext } from 'loader-runner';

export class NormalModule extends Module {
  private runLoaders(
    loaderContext: LoaderContext,
    callback: (err: Error | null, result: any) => void
  ): void {
    runLoaders(
      {
        resource: this.resource + this.resourceQuery + this.resourceFragment,
        loaders: this.loaders.map(l => ({
          loader: l.loader,
          options: l.options,
          ident: l.ident,
        })),
        context: loaderContext,
        readResource: (resource, callback) => {
          // 使用 Webpack 的文件系统读取
          this.fs.readFile(resource, callback);
        },
      },
      (err, result) => {
        if (err) {
          return callback(err, null);
        }
        
        // result.result = [源码, sourceMap, AST]
        callback(null, result);
      }
    );
  }
}
```

### Pitching 阶段

Loader 还有一个 pitching 阶段，从左到右执行：

```javascript
// 自定义 Loader
module.exports = function(source) {
  // Normal 阶段
  return transformedSource;
};

module.exports.pitch = function(remainingRequest, precedingRequest, data) {
  // Pitching 阶段
  // 如果返回内容，会跳过后续 Loader
};
```

**执行流程**：

```
Pitching: style-loader.pitch → css-loader.pitch → postcss-loader.pitch
Normal:   postcss-loader → css-loader → style-loader
```

### Loader 执行结果

```typescript
interface LoaderResult {
  // 转换后的源码（必须）
  result: [
    string | Buffer,      // 源码
    any,                  // SourceMap（可选）
    any,                  // AST（可选）
  ];
  
  // 依赖信息
  fileDependencies: string[];     // 文件依赖
  contextDependencies: string[];  // 目录依赖
  missingDependencies: string[];  // 缺失依赖
  
  // 缓存标记
  cacheable: boolean;
}
```

## Parser 解析阶段

Loader 执行完成后，Parser 负责解析代码：

### JavaScript Parser

```typescript
export class JavascriptParser {
  /**
   * 解析 JavaScript 代码
   */
  parse(
    source: string | object,  // 源码或 AST
    options: ParseOptions
  ): any {
    // 如果是字符串，先解析为 AST
    const ast = typeof source === 'string'
      ? this.parseToAst(source)
      : source;
    
    // 遍历 AST
    this.walkProgram(ast);
    
    return ast;
  }
  
  /**
   * 解析为 AST
   */
  private parseToAst(source: string): any {
    return acorn.parse(source, {
      ecmaVersion: 'latest',
      sourceType: this.sourceType,  // 'module' | 'script' | 'auto'
      locations: true,
      ranges: true,
    });
  }
  
  /**
   * 遍历程序
   */
  private walkProgram(ast: any): void {
    // 遍历所有语句
    for (const statement of ast.body) {
      this.walkStatement(statement);
    }
  }
  
  /**
   * 遍历语句
   */
  private walkStatement(statement: any): void {
    switch (statement.type) {
      case 'ImportDeclaration':
        this.walkImportDeclaration(statement);
        break;
        
      case 'ExportDefaultDeclaration':
        this.walkExportDefaultDeclaration(statement);
        break;
        
      case 'ExportNamedDeclaration':
        this.walkExportNamedDeclaration(statement);
        break;
        
      case 'ExpressionStatement':
        this.walkExpression(statement.expression);
        break;
        
      // ... 其他语句类型
    }
  }
}
```

### 依赖识别

Parser 通过钩子识别各种依赖：

```typescript
export class JavascriptParser {
  hooks = {
    // ESM 导入
    import: new SyncBailHook(['statement', 'source']),
    importSpecifier: new SyncBailHook(['statement', 'source', 'exportName', 'identifierName']),
    
    // ESM 导出
    export: new SyncBailHook(['statement']),
    exportImport: new SyncBailHook(['statement', 'source']),
    
    // CommonJS
    call: new HookMap(() => new SyncBailHook(['expression'])),
    
    // 动态导入
    importCall: new SyncBailHook(['expression']),
  };
  
  /**
   * 处理 import 声明
   */
  private walkImportDeclaration(statement: any): void {
    const source = statement.source.value;
    
    // 触发 import 钩子
    if (this.hooks.import.call(statement, source) !== undefined) {
      return;  // 钩子处理了
    }
    
    // 创建依赖
    for (const specifier of statement.specifiers) {
      if (specifier.type === 'ImportDefaultSpecifier') {
        this.hooks.importSpecifier.call(
          statement,
          source,
          'default',
          specifier.local.name
        );
      } else if (specifier.type === 'ImportSpecifier') {
        this.hooks.importSpecifier.call(
          statement,
          source,
          specifier.imported.name,
          specifier.local.name
        );
      }
    }
  }
}
```

### 依赖创建

依赖插件监听 Parser 钩子，创建依赖对象：

```typescript
export class HarmonyImportDependencyParserPlugin {
  apply(parser: JavascriptParser): void {
    parser.hooks.import.tap('HarmonyImportDependencyParserPlugin', 
      (statement, source) => {
        // 创建 import 依赖
        const dependency = new HarmonyImportSideEffectDependency(source);
        dependency.loc = statement.loc;
        
        parser.state.module.addDependency(dependency);
        
        return true;  // 已处理
      }
    );
    
    parser.hooks.importSpecifier.tap('HarmonyImportDependencyParserPlugin',
      (statement, source, exportName, identifierName) => {
        // 创建导入说明符依赖
        const dependency = new HarmonyImportSpecifierDependency(
          source,
          exportName,
          identifierName
        );
        
        parser.state.module.addDependency(dependency);
        
        return true;
      }
    );
  }
}
```

## 依赖处理阶段

模块构建完成后，需要处理它的依赖：

```typescript
export class Compilation {
  /**
   * 处理模块依赖
   */
  processModuleDependencies(
    module: Module,
    callback: (err?: Error | null) => void
  ): void {
    // 收集所有依赖
    const dependencies: DependencyWithLocation[] = [];
    
    // 同步依赖
    for (const dep of module.dependencies) {
      dependencies.push({
        dependency: dep,
        block: null,
      });
    }
    
    // 异步依赖块中的依赖
    for (const block of module.blocks) {
      for (const dep of block.dependencies) {
        dependencies.push({
          dependency: dep,
          block: block,
        });
      }
    }
    
    // 并行处理所有依赖
    asyncLib.forEach(
      dependencies,
      (item, callback) => {
        this.handleModuleDependency(module, item, callback);
      },
      callback
    );
  }
  
  /**
   * 处理单个依赖
   */
  private handleModuleDependency(
    originModule: Module,
    item: DependencyWithLocation,
    callback: (err?: Error | null) => void
  ): void {
    const { dependency, block } = item;
    
    // 获取模块工厂
    const factory = this.getModuleFactory(dependency);
    if (!factory) {
      return callback();  // 不需要解析的依赖
    }
    
    // 解析依赖为模块
    this.factorizeModule(
      {
        originModule,
        dependency,
        factory,
      },
      (err, module) => {
        if (err) return callback(err);
        if (!module) return callback();
        
        // 在 ModuleGraph 中建立连接
        this.moduleGraph.setResolvedModule(dependency, module);
        
        // 递归构建依赖的模块
        this.buildModule(module, (err) => {
          if (err) return callback(err);
          
          // 递归处理新模块的依赖
          this.processModuleDependencies(module, callback);
        });
      }
    );
  }
}
```

## 构建缓存

为了提高性能，Webpack 缓存构建结果：

```typescript
export class NormalModule extends Module {
  /**
   * 检查是否需要重建
   */
  needRebuild(
    fileTimestamps: Map<string, number>,
    contextTimestamps: Map<string, number>
  ): boolean {
    // 不可缓存的模块总是需要重建
    if (!this.buildInfo.cacheable) {
      return true;
    }
    
    // 检查文件依赖的时间戳
    for (const file of this.buildInfo.fileDependencies || []) {
      const timestamp = fileTimestamps.get(file);
      if (!timestamp || timestamp > this.buildInfo.buildTimestamp!) {
        return true;
      }
    }
    
    // 检查目录依赖
    for (const context of this.buildInfo.contextDependencies || []) {
      const timestamp = contextTimestamps.get(context);
      if (!timestamp || timestamp > this.buildInfo.buildTimestamp!) {
        return true;
      }
    }
    
    return false;
  }
}
```

### 持久化缓存

Webpack 5 支持将缓存持久化到文件系统：

```typescript
// webpack.config.js
module.exports = {
  cache: {
    type: 'filesystem',
    cacheDirectory: '.webpack-cache',
    buildDependencies: {
      config: [__filename],
    },
  },
};
```

## 构建错误处理

```typescript
export class Compilation {
  /**
   * 报告构建错误
   */
  private handleBuildError(
    module: Module,
    error: Error
  ): void {
    // 包装为模块构建错误
    const buildError = new ModuleBuildError(module, error);
    
    // 添加到错误列表
    this.errors.push(buildError);
    
    // 触发失败钩子
    this.hooks.failedModule.call(module, buildError);
  }
}

class ModuleBuildError extends WebpackError {
  constructor(module: Module, error: Error) {
    super(`Module build failed: ${error.message}`);
    
    this.name = 'ModuleBuildError';
    this.module = module;
    this.error = error;
    
    // 提取位置信息
    this.loc = extractLocation(error);
  }
}
```

## 总结

模块构建是一个复杂但有序的过程：

**关键阶段**：
1. **Loader 执行**：转换源码格式
2. **Parser 解析**：分析代码结构
3. **依赖提取**：识别模块依赖
4. **依赖处理**：递归构建依赖

**设计要点**：
- Loader 链从右到左执行
- Parser 通过钩子系统可扩展
- 依赖处理支持并行和递归
- 缓存机制提高增量构建性能

**扩展点**：
- 自定义 Loader：转换任意格式
- Parser 插件：识别自定义依赖
- 构建钩子：监控和修改构建过程

下一章我们将讨论 Source 与 SourceMap 的处理。
