---
sidebar_position: 79
title: "Top-Level Await 顶层 await 支持"
---

# Top-Level Await 顶层 await 支持

Top-Level Await (TLA) 是 ES2022 的特性，允许在模块顶层直接使用 await，Webpack 5 对此提供了完整支持。

## Top-Level Await 基础

### 语法示例

```javascript
// data.js - 顶层 await 模块
const response = await fetch('/api/config');
export const config = await response.json();

// app.js - 使用该模块
import { config } from './data.js';
console.log(config); // 配置已加载
```

### 传统异步模块对比

```javascript
// 传统方式 - 导出 Promise
export const configPromise = fetch('/api/config').then(r => r.json());

// 使用者必须处理 Promise
import { configPromise } from './data.js';
configPromise.then(config => {
  console.log(config);
});

// TLA 方式 - 直接导出值
export const config = await fetch('/api/config').then(r => r.json());

// 使用者直接使用
import { config } from './data.js';
console.log(config);
```

## 解析 Top-Level Await

### 检测顶层 await

```typescript
class JavascriptParser {
  isAsync = false;  // 是否在异步上下文
  topLevelAwait = false;  // 是否有顶层 await
  
  walkAwaitExpression(expression: AwaitExpression): void {
    // 检查是否在顶层
    if (!this.isAsync && this.scope.inTry === false) {
      // 顶层 await
      this.topLevelAwait = true;
      
      // 触发 hook
      this.hooks.topLevelAwait.call(expression);
    }
    
    // 继续遍历 argument
    this.walkExpression(expression.argument);
  }
  
  walkFunctionDeclaration(statement: FunctionDeclaration): void {
    const wasAsync = this.isAsync;
    this.isAsync = statement.async;
    
    this.walkFunctionBody(statement.body);
    
    this.isAsync = wasAsync;
  }
  
  walkArrowFunctionExpression(expression: ArrowFunctionExpression): void {
    const wasAsync = this.isAsync;
    this.isAsync = expression.async;
    
    if (expression.body.type === 'BlockStatement') {
      this.walkStatement(expression.body);
    } else {
      this.walkExpression(expression.body);
    }
    
    this.isAsync = wasAsync;
  }
}
```

### for-await-of 支持

```typescript
class JavascriptParser {
  walkForOfStatement(statement: ForOfStatement): void {
    // 检查是否是 for await...of
    if (statement.await && !this.isAsync) {
      this.topLevelAwait = true;
      this.hooks.topLevelAwait.call(statement);
    }
    
    this.walkExpression(statement.right);
    this.walkForBinding(statement.left);
    this.walkStatement(statement.body);
  }
}
```

## 异步依赖处理

### 创建异步边界

```typescript
class AsyncDependenciesBlock extends DependenciesBlock {
  groupOptions?: {
    name?: string;
    preloadOrder?: number;
    prefetchOrder?: number;
  };
  
  constructor(
    groupOptions: object | undefined,
    loc: SourceLocation,
    request?: string
  ) {
    super();
    this.groupOptions = groupOptions;
    this.loc = loc;
    this.request = request;
  }
}

class TopLevelAwaitDependenciesBlock extends AsyncDependenciesBlock {
  constructor(loc: SourceLocation) {
    super(undefined, loc, undefined);
  }
}
```

### 模块标记

```typescript
class JavascriptModulesPlugin {
  apply(compiler: Compiler): void {
    compiler.hooks.compilation.tap(
      'JavascriptModulesPlugin',
      (compilation) => {
        compilation.hooks.buildModule.tap(
          'JavascriptModulesPlugin',
          (module: Module) => {
            // 解析后检查是否有 TLA
            module.buildInfo = module.buildInfo || {};
          }
        );
        
        compilation.hooks.succeedModule.tap(
          'JavascriptModulesPlugin',
          (module: Module) => {
            if (module.buildInfo?.topLevelAwait) {
              // 标记模块为异步
              module.buildMeta.async = true;
            }
          }
        );
      }
    );
  }
}
```

## 异步模块传播

### 依赖图分析

```typescript
class AsyncModulesPlugin {
  apply(compiler: Compiler): void {
    compiler.hooks.compilation.tap('AsyncModulesPlugin', (compilation) => {
      compilation.hooks.finishModules.tapAsync(
        'AsyncModulesPlugin',
        (modules, callback) => {
          // 收集直接异步模块
          const asyncModules = new Set<Module>();
          
          for (const module of modules) {
            if (module.buildMeta?.async) {
              asyncModules.add(module);
            }
          }
          
          // 传播异步性
          this.propagateAsync(compilation, asyncModules);
          
          callback();
        }
      );
    });
  }
  
  propagateAsync(compilation: Compilation, asyncModules: Set<Module>): void {
    const moduleGraph = compilation.moduleGraph;
    let changed = true;
    
    while (changed) {
      changed = false;
      
      for (const module of compilation.modules) {
        if (asyncModules.has(module)) continue;
        
        // 检查依赖是否有异步模块
        const outgoing = moduleGraph.getOutgoingConnections(module);
        
        for (const connection of outgoing) {
          if (!connection.module) continue;
          
          // 如果依赖异步模块，且不是异步边界
          if (asyncModules.has(connection.module) &&
              !this.isAsyncBoundary(connection.dependency)) {
            asyncModules.add(module);
            module.buildMeta = module.buildMeta || {};
            module.buildMeta.async = true;
            changed = true;
            break;
          }
        }
      }
    }
  }
  
  isAsyncBoundary(dependency: Dependency): boolean {
    // import() 创建异步边界
    return dependency instanceof ImportDependency;
  }
}
```

### 循环依赖检测

```typescript
class AsyncModulesPlugin {
  checkAsyncCycles(compilation: Compilation): void {
    const moduleGraph = compilation.moduleGraph;
    const visited = new Set<Module>();
    const stack = new Set<Module>();
    
    const dfs = (module: Module, path: Module[]): boolean => {
      if (stack.has(module)) {
        // 检查循环中是否有异步模块
        const cycleStart = path.indexOf(module);
        const cycle = path.slice(cycleStart);
        
        const hasAsync = cycle.some(m => m.buildMeta?.async);
        if (hasAsync) {
          compilation.errors.push(
            new WebpackError(
              `Async module cycle detected:\n${cycle.map(m => m.identifier()).join(' -> ')}`
            )
          );
          return false;
        }
      }
      
      if (visited.has(module)) return true;
      
      visited.add(module);
      stack.add(module);
      
      for (const connection of moduleGraph.getOutgoingConnections(module)) {
        if (connection.module && !this.isAsyncBoundary(connection.dependency)) {
          if (!dfs(connection.module, [...path, module])) {
            return false;
          }
        }
      }
      
      stack.delete(module);
      return true;
    };
    
    for (const module of compilation.modules) {
      dfs(module, []);
    }
  }
}
```

## 代码生成

### 异步模块包装

```typescript
class AsyncModuleRuntimeModule extends RuntimeModule {
  generate(): string {
    return `
      __webpack_require__.a = function(module, body, hasAwait) {
        var queue;
        hasAwait && ((queue = []).d = -1);
        
        var depQueues = new Set();
        var exports = module.exports;
        var currentDeps;
        var outerResolve;
        var reject;
        
        var promise = new Promise(function(resolve, rej) {
          reject = rej;
          outerResolve = resolve;
        });
        
        promise[Symbol.toStringTag] = "Module";
        
        var fn = function(deps) {
          currentDeps = wrapDeps(deps);
          var getResult;
          
          var innerPromise = new Promise(function(resolve) {
            getResult = function() {
              return body().then(function(r) {
                if (hasAwait) queue.d = 0;
                resolve(exports);
                return exports;
              });
            };
          });
          
          return innerPromise.then(function() {
            return Promise.all(currentDeps).then(getResult);
          });
        };
        
        fn.e = function(err) {
          if (queue) queue.d = 1;
          reject(err);
        };
        
        module.exports = promise;
        
        return body;
      };
    `;
  }
}
```

### 模块执行

```typescript
class JavascriptGenerator {
  generateAsyncModule(module: Module, runtime: RuntimeState): string {
    const source = module.originalSource;
    
    if (!module.buildMeta?.async) {
      return source;
    }
    
    // 获取依赖的异步模块
    const asyncDeps = this.getAsyncDependencies(module);
    
    return `
      __webpack_require__.a(module, async function(__webpack_handle_async_dependencies__, __webpack_async_result__) {
        try {
          ${asyncDeps.length > 0 ? `
          var __webpack_async_dependencies__ = __webpack_handle_async_dependencies__([${asyncDeps.join(', ')}]);
          [${asyncDeps.join(', ')}] = __webpack_async_dependencies__.then ? (await __webpack_async_dependencies__)() : __webpack_async_dependencies__;
          ` : ''}
          
          ${source}
          
          __webpack_async_result__();
        } catch(e) {
          __webpack_async_result__(e);
        }
      }, ${module.buildInfo?.topLevelAwait ? '1' : '0'});
    `;
  }
  
  getAsyncDependencies(module: Module): string[] {
    const deps: string[] = [];
    
    for (const dep of module.dependencies) {
      const refModule = this.moduleGraph.getModule(dep);
      if (refModule?.buildMeta?.async) {
        deps.push(this.getModuleReference(refModule));
      }
    }
    
    return deps;
  }
}
```

## 实际示例

### 动态配置加载

```javascript
// config.js
const env = await fetch('/api/environment').then(r => r.json());

export const config = {
  apiUrl: env.API_URL,
  debug: env.DEBUG,
  features: env.FEATURES,
};

export default config;

// 打包后
__webpack_require__.a(module, async (__webpack_handle_async_dependencies__, __webpack_async_result__) => {
  try {
    const env = await fetch('/api/environment').then(r => r.json());
    
    const config = {
      apiUrl: env.API_URL,
      debug: env.DEBUG,
      features: env.FEATURES,
    };
    
    __webpack_exports__["default"] = config;
    __webpack_exports__.config = config;
    
    __webpack_async_result__();
  } catch (e) {
    __webpack_async_result__(e);
  }
}, 1);
```

### 条件依赖

```javascript
// feature.js
let feature;

if (await checkFeatureFlag('new-algorithm')) {
  const { newAlgorithm } = await import('./algorithms/new.js');
  feature = newAlgorithm;
} else {
  const { oldAlgorithm } = await import('./algorithms/old.js');
  feature = oldAlgorithm;
}

export { feature };
```

## 兼容性处理

### 配置选项

```javascript
// webpack.config.js
module.exports = {
  experiments: {
    topLevelAwait: true,  // Webpack 5 需要显式开启
  },
};
```

### 目标环境检查

```typescript
class TopLevelAwaitPlugin {
  apply(compiler: Compiler): void {
    compiler.hooks.thisCompilation.tap(
      'TopLevelAwaitPlugin',
      (compilation) => {
        const { outputOptions } = compilation;
        
        // 检查目标环境
        if (outputOptions.module === false) {
          compilation.warnings.push(
            new WebpackError(
              'Top-level await requires output.module to be true'
            )
          );
        }
        
        if (!this.supportsAsyncModules(outputOptions.environment)) {
          compilation.errors.push(
            new WebpackError(
              'Target environment does not support top-level await'
            )
          );
        }
      }
    );
  }
  
  supportsAsyncModules(env: Environment): boolean {
    return env.asyncFunction && env.dynamicImport;
  }
}
```

## 性能影响

### 瀑布效应

```javascript
// 问题：串行等待
// a.js
export const a = await fetchA();  // 1s

// b.js
import { a } from './a.js';
export const b = await fetchB();  // 需要等 a 完成后再等 1s

// c.js
import { b } from './b.js';
export const c = await fetchC();  // 再等 1s

// 总耗时：3s
```

### 优化：并行加载

```javascript
// data.js
const [a, b, c] = await Promise.all([
  fetchA(),
  fetchB(),
  fetchC(),
]);

export { a, b, c };
// 总耗时：max(1s, 1s, 1s) = 1s
```

## 总结

Top-Level Await 支持的核心要点：

**解析检测**：
- 识别模块顶层的 await 表达式
- 检测 for-await-of 循环
- 标记模块为异步

**依赖传播**：
- 异步性向上传播
- import() 作为异步边界
- 循环依赖检测

**代码生成**：
- 异步模块包装函数
- 依赖等待机制
- Promise 链管理

**注意事项**：
- 需要 experiments.topLevelAwait
- 注意瀑布效应
- 循环依赖限制

**下一章**：我们将学习 new Worker() 语法解析。
