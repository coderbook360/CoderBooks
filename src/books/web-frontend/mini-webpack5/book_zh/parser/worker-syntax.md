---
sidebar_position: 80
title: "new Worker() 语法解析"
---

# new Worker() 语法解析

Web Workers 允许在后台线程运行脚本，Webpack 提供了对 `new Worker()` 语法的原生支持，自动处理 Worker 文件的打包。

## Worker 语法基础

### 标准 Web Worker

```javascript
// 创建 Worker
const worker = new Worker(new URL('./worker.js', import.meta.url));

// 发送消息
worker.postMessage({ type: 'start', data: 100 });

// 接收消息
worker.onmessage = (event) => {
  console.log('Result:', event.data);
};

// worker.js
self.onmessage = (event) => {
  const result = heavyComputation(event.data);
  self.postMessage(result);
};
```

### Webpack 支持的语法

```javascript
// 推荐方式：使用 new URL
const worker = new Worker(new URL('./worker.js', import.meta.url));

// 也支持字符串路径（需要配置）
const worker = new Worker('./worker.js');

// SharedWorker
const shared = new SharedWorker(new URL('./shared.js', import.meta.url));
```

## 语法识别

### 识别 Worker 构造

```typescript
class WorkerPlugin {
  apply(parser: JavascriptParser): void {
    const processWorker = (
      expression: NewExpression,
      callee: string
    ): boolean | void => {
      // 验证是 new Worker/SharedWorker
      if (expression.callee.type !== 'Identifier') return;
      if (!['Worker', 'SharedWorker'].includes(expression.callee.name)) return;
      
      const arg = expression.arguments[0];
      if (!arg) return;
      
      // 检查是否是 new URL(...)
      if (this.isNewURLPattern(arg)) {
        return this.handleNewURLWorker(parser, expression, arg);
      }
      
      // 检查是否是字符串字面量
      if (arg.type === 'Literal' && typeof arg.value === 'string') {
        return this.handleStringWorker(parser, expression, arg.value);
      }
    };
    
    parser.hooks.new.for('Worker').tap('WorkerPlugin', processWorker);
    parser.hooks.new.for('SharedWorker').tap('WorkerPlugin', processWorker);
  }
}
```

### 识别 new URL 模式

```typescript
class WorkerPlugin {
  isNewURLPattern(node: Expression): node is NewExpression {
    if (node.type !== 'NewExpression') return false;
    if (node.callee.type !== 'Identifier') return false;
    if (node.callee.name !== 'URL') return false;
    
    // 第一个参数应该是字符串
    const firstArg = node.arguments[0];
    if (!firstArg) return false;
    
    // 第二个参数应该是 import.meta.url
    const secondArg = node.arguments[1];
    if (!this.isImportMetaUrl(secondArg)) return false;
    
    return true;
  }
  
  isImportMetaUrl(node: Expression | undefined): boolean {
    if (!node) return false;
    if (node.type !== 'MemberExpression') return false;
    if (node.object.type !== 'MetaProperty') return false;
    if (node.property.type !== 'Identifier') return false;
    if (node.property.name !== 'url') return false;
    
    // import.meta
    const meta = node.object;
    return meta.meta.name === 'import' && meta.property.name === 'meta';
  }
}
```

## 创建 Worker 依赖

### WorkerDependency 类

```typescript
interface WorkerDependencyOptions {
  publicPath?: string;
  filename?: string;
  chunkLoading?: string;
  wasmLoading?: string;
}

class WorkerDependency extends Dependency {
  request: string;
  range: [number, number];
  options: WorkerDependencyOptions;
  
  constructor(
    request: string,
    range: [number, number],
    options: WorkerDependencyOptions = {}
  ) {
    super();
    this.request = request;
    this.range = range;
    this.options = options;
  }
  
  get type(): string {
    return 'new Worker()';
  }
  
  get category(): string {
    return 'worker';
  }
  
  getReferencedExports(): string[][] {
    return []; // Worker 不直接使用导出
  }
}
```

### 处理 Worker 创建

```typescript
class WorkerPlugin {
  handleNewURLWorker(
    parser: JavascriptParser,
    expression: NewExpression,
    urlExpr: NewExpression
  ): boolean {
    // 获取模块路径
    const firstArg = urlExpr.arguments[0];
    const evaluated = parser.evaluateExpression(firstArg);
    
    if (!evaluated.isString()) {
      parser.state.module.addWarning(
        new Warning('Worker URL must be a string literal')
      );
      return;
    }
    
    const request = evaluated.string!;
    
    // 解析 Worker 选项
    const options = this.parseWorkerOptions(expression.arguments[1]);
    
    // 创建依赖
    const dep = new WorkerDependency(
      request,
      expression.range!,
      options
    );
    
    // 添加到异步块
    const block = new AsyncDependenciesBlock(
      {
        name: options.name,
        entryOptions: {
          chunkLoading: options.chunkLoading || 'import-scripts',
          wasmLoading: options.wasmLoading || 'fetch',
        },
      },
      expression.loc,
      request
    );
    
    block.addDependency(dep);
    parser.state.module.addBlock(block);
    
    return true;
  }
  
  parseWorkerOptions(node: Expression | undefined): WorkerDependencyOptions {
    if (!node || node.type !== 'ObjectExpression') {
      return {};
    }
    
    const options: WorkerDependencyOptions = {};
    
    for (const prop of node.properties) {
      if (prop.type !== 'Property') continue;
      if (prop.key.type !== 'Identifier') continue;
      
      const key = prop.key.name;
      
      switch (key) {
        case 'name':
          if (prop.value.type === 'Literal') {
            options.filename = `[name].${prop.value.value}.js`;
          }
          break;
        case 'type':
          // type: 'module' for ES modules worker
          break;
      }
    }
    
    return options;
  }
}
```

## Worker 入口点处理

### 创建子编译

```typescript
class WorkerPlugin {
  apply(compiler: Compiler): void {
    compiler.hooks.compilation.tap(
      'WorkerPlugin',
      (compilation, { normalModuleFactory }) => {
        compilation.dependencyFactories.set(
          WorkerDependency,
          normalModuleFactory
        );
        
        compilation.dependencyTemplates.set(
          WorkerDependency,
          new WorkerDependencyTemplate()
        );
      }
    );
    
    compiler.hooks.make.tapAsync(
      'WorkerPlugin',
      (compilation, callback) => {
        // Worker 作为独立入口处理
        this.processWorkerEntries(compilation, callback);
      }
    );
  }
  
  processWorkerEntries(compilation: Compilation, callback: Callback): void {
    const workerDeps = this.collectWorkerDependencies(compilation);
    
    if (workerDeps.length === 0) {
      return callback();
    }
    
    asyncLib.forEach(
      workerDeps,
      (dep, done) => {
        const entry = {
          import: [dep.request],
          runtime: `worker-${dep.id}`,
          chunkLoading: 'import-scripts',
        };
        
        compilation.addEntry(
          compilation.compiler.context,
          dep,
          entry,
          (err) => done(err)
        );
      },
      callback
    );
  }
}
```

### Worker 特定优化

```typescript
class WorkerPlugin {
  applyWorkerDefaults(options: EntryOptions): void {
    // Worker 环境配置
    options.library = undefined;  // Worker 不需要导出
    options.runtime = false;  // 可以共享或独立 runtime
    
    // Worker 加载方式
    if (!options.chunkLoading) {
      options.chunkLoading = 'import-scripts';
    }
    
    // Worker 中的 WASM 加载
    if (!options.wasmLoading) {
      options.wasmLoading = 'fetch';
    }
  }
}
```

## 代码生成

### URL 替换

```typescript
class WorkerDependencyTemplate extends DependencyTemplate {
  apply(
    dep: WorkerDependency,
    source: ReplaceSource,
    runtime: RuntimeState
  ): void {
    const { module, compilation } = runtime;
    const chunkGraph = compilation.chunkGraph;
    
    // 获取 Worker chunk
    const block = module.blocks.find(b => 
      b.dependencies.includes(dep)
    );
    
    if (!block) return;
    
    const entrypoint = chunkGraph.getBlockChunkGroup(block);
    const chunks = entrypoint?.chunks || [];
    const workerChunk = chunks[0];
    
    if (!workerChunk) return;
    
    // 生成 Worker URL
    const workerUrl = this.getWorkerUrl(workerChunk, compilation);
    
    // 替换整个 new Worker(...) 表达式
    source.replace(
      dep.range[0],
      dep.range[1] - 1,
      `new Worker(${workerUrl})`
    );
  }
  
  getWorkerUrl(chunk: Chunk, compilation: Compilation): string {
    const filename = compilation.getPath(
      compilation.outputOptions.workerChunkLoading === 'universal'
        ? '[file]'
        : compilation.outputOptions.filename as string,
      { chunk }
    );
    
    // 使用 __webpack_public_path__
    return `__webpack_require__.p + ${JSON.stringify(filename)}`;
  }
}
```

### ES Module Worker

```typescript
class WorkerDependencyTemplate {
  apply(dep: WorkerDependency, source: ReplaceSource, runtime: RuntimeState): void {
    const workerUrl = this.getWorkerUrl(dep, runtime);
    const options = dep.options;
    
    let replacement: string;
    
    if (options.type === 'module') {
      // ES Module Worker
      replacement = `new Worker(${workerUrl}, { type: "module" })`;
    } else {
      // Classic Worker
      replacement = `new Worker(${workerUrl})`;
    }
    
    source.replace(dep.range[0], dep.range[1] - 1, replacement);
  }
}
```

## SharedWorker 支持

### 语法识别

```typescript
class WorkerPlugin {
  apply(parser: JavascriptParser): void {
    // SharedWorker 处理
    parser.hooks.new.for('SharedWorker').tap(
      'WorkerPlugin',
      (expression) => {
        return this.handleWorker(parser, expression, 'SharedWorker');
      }
    );
  }
  
  handleWorker(
    parser: JavascriptParser,
    expression: NewExpression,
    workerType: 'Worker' | 'SharedWorker'
  ): boolean | void {
    const arg = expression.arguments[0];
    if (!arg || !this.isNewURLPattern(arg)) return;
    
    const request = this.extractRequest(parser, arg);
    if (!request) return;
    
    const dep = new WorkerDependency(request, expression.range!, {
      workerType,
    });
    
    const block = new AsyncDependenciesBlock(
      { name: request },
      expression.loc,
      request
    );
    
    block.addDependency(dep);
    parser.state.module.addBlock(block);
    
    return true;
  }
}
```

## Service Worker 支持

### 注册语法

```javascript
// Service Worker 注册
navigator.serviceWorker.register(
  new URL('./sw.js', import.meta.url)
);
```

```typescript
class ServiceWorkerPlugin {
  apply(parser: JavascriptParser): void {
    parser.hooks.callMemberChain
      .for('navigator')
      .tap('ServiceWorkerPlugin', (expression, members) => {
        if (members.length !== 2) return;
        if (members[0] !== 'serviceWorker') return;
        if (members[1] !== 'register') return;
        
        return this.handleServiceWorkerRegister(parser, expression);
      });
  }
  
  handleServiceWorkerRegister(
    parser: JavascriptParser,
    expression: CallExpression
  ): boolean | void {
    const arg = expression.arguments[0];
    if (!arg) return;
    
    // 同样支持 new URL 模式
    if (this.isNewURLPattern(arg)) {
      const request = this.extractRequest(parser, arg);
      if (!request) return;
      
      const dep = new ServiceWorkerDependency(request, expression.range!);
      parser.state.module.addDependency(dep);
      
      return true;
    }
  }
}
```

## 实际示例

### CPU 密集任务

```javascript
// main.js
const worker = new Worker(
  new URL('./heavy-computation.worker.js', import.meta.url)
);

document.getElementById('calculate').addEventListener('click', () => {
  worker.postMessage({
    type: 'fibonacci',
    n: 45,
  });
});

worker.onmessage = (event) => {
  console.log('Result:', event.data.result);
};

// heavy-computation.worker.js
const fibonacci = (n) => {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
};

self.onmessage = (event) => {
  const { type, n } = event.data;
  
  if (type === 'fibonacci') {
    const result = fibonacci(n);
    self.postMessage({ result });
  }
};
```

### 打包结果

```javascript
// main.bundle.js
const worker = new Worker(
  __webpack_require__.p + "heavy-computation.worker.bundle.js"
);

// heavy-computation.worker.bundle.js
// 独立的 Worker bundle
(function() {
  const fibonacci = (n) => {
    if (n <= 1) return n;
    return fibonacci(n - 1) + fibonacci(n - 2);
  };
  
  self.onmessage = (event) => {
    const { type, n } = event.data;
    if (type === 'fibonacci') {
      const result = fibonacci(n);
      self.postMessage({ result });
    }
  };
})();
```

## 配置选项

### Worker 输出配置

```javascript
// webpack.config.js
module.exports = {
  output: {
    // Worker chunk 文件名
    workerChunkLoading: 'import-scripts',
    
    // Worker 文件名模式
    chunkFilename: '[name].[contenthash].js',
  },
  
  module: {
    parser: {
      javascript: {
        // 自动识别 new Worker
        worker: ['Worker', 'SharedWorker'],
      },
    },
  },
};
```

## 错误处理

### 警告与错误

```typescript
class WorkerPlugin {
  handleWorker(parser: JavascriptParser, expression: NewExpression): boolean | void {
    const arg = expression.arguments[0];
    
    // 动态路径警告
    if (arg.type !== 'NewExpression') {
      if (arg.type !== 'Literal') {
        parser.state.module.addWarning(
          new Warning(
            'Worker requires "new URL(\'./path\', import.meta.url)" syntax'
          )
        );
        return;
      }
    }
    
    // 验证 URL 构造
    if (!this.isNewURLPattern(arg)) {
      parser.state.module.addWarning(
        new Warning(
          'Worker path should use "new URL(\'./path\', import.meta.url)"'
        )
      );
      return;
    }
    
    // 验证路径可解析
    const request = this.extractRequest(parser, arg);
    if (!request) {
      parser.state.module.addError(
        new Error('Worker path must be a string literal')
      );
      return;
    }
    
    return this.createWorkerDependency(parser, expression, request);
  }
}
```

## 总结

new Worker() 语法解析的核心要点：

**语法识别**：
- `new URL('./path', import.meta.url)` 模式
- Worker/SharedWorker/ServiceWorker
- 构造函数选项解析

**依赖处理**：
- 创建 WorkerDependency
- 作为独立入口点
- 异步块管理

**代码生成**：
- URL 替换为运行时路径
- 支持 ES Module Worker
- 独立 bundle 输出

**配置选项**：
- workerChunkLoading
- 文件名模式
- 环境适配

本章完成了 Parser 语法解析器部分的学习，接下来将进入 Dependency 依赖系统部分。
