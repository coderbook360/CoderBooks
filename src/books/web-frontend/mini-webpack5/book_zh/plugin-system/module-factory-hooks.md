---
sidebar_position: 137
title: "ModuleFactory Hooks"
---

# ModuleFactory Hooks

ModuleFactory 是创建模块的工厂，包括 NormalModuleFactory 和 ContextModuleFactory。本章深入解析这两个工厂的钩子。

## NormalModuleFactory

### 基本结构

```typescript
class NormalModuleFactory {
  hooks = {
    // 解析前
    beforeResolve: new AsyncSeriesBailHook(['resolveData']),
    
    // 工厂解析
    factorize: new AsyncSeriesBailHook(['resolveData']),
    
    // 解析
    resolve: new AsyncSeriesBailHook(['resolveData']),
    
    // 解析 loader
    resolveForScheme: new AsyncSeriesBailHook(['resourceData', 'resolveData']),
    
    // 解析后
    afterResolve: new AsyncSeriesBailHook(['resolveData']),
    
    // 创建模块
    createModule: new AsyncSeriesBailHook(['createData', 'resolveData']),
    
    // 模块创建后
    module: new SyncWaterfallHook(['module', 'createData', 'resolveData']),
    
    // Parser
    parser: new HookMap(() => new SyncHook(['parser', 'options'])),
    
    // Generator
    generator: new HookMap(() => new SyncHook(['generator', 'options'])),
  };
}
```

### beforeResolve

```typescript
// 在解析模块请求前触发
compiler.hooks.normalModuleFactory.tap('MyPlugin', (nmf) => {
  nmf.hooks.beforeResolve.tap('MyPlugin', (resolveData) => {
    console.log('Resolving:', resolveData.request);
    console.log('Context:', resolveData.context);
    console.log('Issuer:', resolveData.contextInfo.issuer);
    
    // 忽略某些模块
    if (resolveData.request.includes('ignored')) {
      return false; // 返回 false 阻止解析
    }
    
    // 重写请求
    if (resolveData.request === 'old-package') {
      resolveData.request = 'new-package';
    }
  });
});
```

### resolve

```typescript
// 解析模块
nmf.hooks.resolve.tapAsync('MyPlugin', (resolveData, callback) => {
  // 处理自定义协议
  if (resolveData.request.startsWith('virtual:')) {
    resolveData.createData = {
      request: resolveData.request,
      resource: `virtual:${resolveData.request.slice(8)}`,
      loaders: [],
      type: 'javascript/auto',
    };
    
    return callback(null, resolveData);
  }
  
  callback();
});
```

### afterResolve

```typescript
// 解析完成后
nmf.hooks.afterResolve.tap('MyPlugin', (resolveData) => {
  console.log('Resolved to:', resolveData.createData.resource);
  console.log('Loaders:', resolveData.createData.loaders);
  
  // 可以修改解析结果
  if (resolveData.createData.resource.endsWith('.custom')) {
    resolveData.createData.loaders.unshift({
      loader: require.resolve('./custom-loader'),
    });
  }
});
```

### createModule

```typescript
// 创建模块实例
nmf.hooks.createModule.tapAsync('MyPlugin', (createData, resolveData, callback) => {
  // 创建自定义模块
  if (createData.resource.includes('virtual')) {
    const module = new VirtualModule(createData);
    return callback(null, module);
  }
  
  callback();
});
```

### module

```typescript
// 模块创建后
nmf.hooks.module.tap('MyPlugin', (module, createData, resolveData) => {
  // 修改模块
  module.buildInfo = module.buildInfo || {};
  module.buildInfo.customData = {
    resolvedAt: Date.now(),
  };
  
  return module; // Waterfall hook，必须返回模块
});
```

## Parser Hooks

### 获取 Parser

```typescript
compiler.hooks.normalModuleFactory.tap('MyPlugin', (nmf) => {
  // 获取 JavaScript Parser
  nmf.hooks.parser
    .for('javascript/auto')
    .tap('MyPlugin', (parser, options) => {
      // 注册 parser hooks
      this.setupParserHooks(parser);
    });
  
  // ESM Parser
  nmf.hooks.parser
    .for('javascript/esm')
    .tap('MyPlugin', (parser, options) => {
      this.setupParserHooks(parser);
    });
});
```

### Parser Hook 类型

```typescript
class JavascriptParser {
  hooks = {
    // 语句处理
    program: new SyncBailHook(['ast', 'comments']),
    statement: new SyncBailHook(['statement']),
    
    // 表达式处理
    expression: new HookMap(() => new SyncBailHook(['expression'])),
    expressionMemberChain: new HookMap(() => new SyncBailHook(['expression', 'members'])),
    
    // 调用处理
    call: new HookMap(() => new SyncBailHook(['expression'])),
    callMemberChain: new HookMap(() => new SyncBailHook(['expression', 'calleeMembers', 'callMembers'])),
    
    // 变量处理
    varDeclaration: new HookMap(() => new SyncBailHook(['declaration'])),
    varDeclarationConst: new HookMap(() => new SyncBailHook(['declaration'])),
    varDeclarationLet: new HookMap(() => new SyncBailHook(['declaration'])),
    
    // import/export
    import: new SyncBailHook(['statement', 'source']),
    importSpecifier: new SyncBailHook(['statement', 'source', 'exportName', 'identifierName']),
    export: new SyncBailHook(['statement']),
    exportDeclaration: new SyncBailHook(['statement', 'declaration']),
    
    // 特殊标识符
    typeof: new HookMap(() => new SyncBailHook(['expression'])),
    evaluate: new HookMap(() => new SyncBailHook(['expression'])),
  };
}
```

### Parser Hook 使用

```typescript
function setupParserHooks(parser: JavascriptParser): void {
  // 处理 import 语句
  parser.hooks.import.tap('MyPlugin', (statement, source) => {
    console.log(`Import from: ${source}`);
  });
  
  // 处理函数调用
  parser.hooks.call.for('myFunction').tap('MyPlugin', (expr) => {
    console.log('myFunction called at line:', expr.loc.start.line);
    
    // 添加依赖
    parser.state.current.addDependency(
      new MyFunctionDependency(expr.arguments)
    );
    
    return true; // 阻止默认处理
  });
  
  // 处理全局变量访问
  parser.hooks.expression.for('__CUSTOM__').tap('MyPlugin', (expr) => {
    // 替换为常量
    const dep = new ConstDependency(JSON.stringify('custom value'), expr.range);
    parser.state.current.addDependency(dep);
    
    return true;
  });
  
  // 处理 require 调用
  parser.hooks.call.for('require').tap('MyPlugin', (expr) => {
    if (expr.arguments.length === 1) {
      const arg = parser.evaluateExpression(expr.arguments[0]);
      
      if (arg.isString()) {
        console.log('require:', arg.string);
      }
    }
  });
}
```

### 表达式求值

```typescript
// 使用 evaluate hook 进行常量求值
parser.hooks.evaluate.for('Identifier').tap('MyPlugin', (expr) => {
  if (expr.name === 'MY_CONSTANT') {
    const result = new BasicEvaluatedExpression();
    result.setString('constant_value');
    return result;
  }
});

parser.hooks.evaluate.for('CallExpression').tap('MyPlugin', (expr) => {
  if (
    expr.callee.type === 'Identifier' &&
    expr.callee.name === 'getConfig'
  ) {
    const result = new BasicEvaluatedExpression();
    result.setString(process.env.CONFIG_VALUE || 'default');
    return result;
  }
});
```

## Generator Hooks

### 获取 Generator

```typescript
compiler.hooks.normalModuleFactory.tap('MyPlugin', (nmf) => {
  nmf.hooks.generator
    .for('javascript/auto')
    .tap('MyPlugin', (generator, options) => {
      // 包装 generator
      return new CustomGenerator(generator);
    });
});
```

## ContextModuleFactory

### 基本结构

```typescript
class ContextModuleFactory {
  hooks = {
    // 解析前
    beforeResolve: new AsyncSeriesWaterfallHook(['data']),
    
    // 解析后
    afterResolve: new AsyncSeriesWaterfallHook(['data']),
    
    // 上下文模块创建
    contextModuleFiles: new SyncWaterfallHook(['files']),
    
    // 替代方案
    alternatives: new AsyncSeriesWaterfallHook(['alternatives']),
  };
}
```

### 处理动态导入

```typescript
compiler.hooks.contextModuleFactory.tap('MyPlugin', (cmf) => {
  // 处理 require.context
  cmf.hooks.beforeResolve.tap('MyPlugin', (data) => {
    console.log('Context request:', data.request);
    console.log('Context directory:', data.context);
    console.log('Recursive:', data.recursive);
    console.log('RegExp:', data.regExp);
    
    return data;
  });
  
  // 过滤文件
  cmf.hooks.contextModuleFiles.tap('MyPlugin', (files) => {
    return files.filter(file => !file.includes('.test.'));
  });
  
  cmf.hooks.afterResolve.tap('MyPlugin', (data) => {
    // 修改上下文模块的依赖
    console.log('Dependencies:', data.dependencies.length);
    
    return data;
  });
});
```

## 实用示例

### 虚拟模块插件

```typescript
class VirtualModulesPlugin {
  private modules: Map<string, string> = new Map();
  
  constructor(modules: Record<string, string> = {}) {
    for (const [path, content] of Object.entries(modules)) {
      this.modules.set(path, content);
    }
  }
  
  apply(compiler: Compiler): void {
    const pluginName = 'VirtualModulesPlugin';
    
    compiler.hooks.normalModuleFactory.tap(pluginName, (nmf) => {
      nmf.hooks.beforeResolve.tap(pluginName, (resolveData) => {
        if (resolveData.request.startsWith('virtual:')) {
          const virtualPath = resolveData.request.slice(8);
          
          if (this.modules.has(virtualPath)) {
            return resolveData;
          }
        }
      });
      
      nmf.hooks.resolve.tap(pluginName, (resolveData) => {
        if (resolveData.request.startsWith('virtual:')) {
          const virtualPath = resolveData.request.slice(8);
          const content = this.modules.get(virtualPath);
          
          if (content) {
            resolveData.createData = {
              request: resolveData.request,
              resource: `virtual:${virtualPath}`,
              loaders: [],
              type: 'javascript/auto',
              settings: {},
              data: { virtualContent: content },
            };
            
            return resolveData;
          }
        }
      });
    });
  }
  
  // 动态添加模块
  writeModule(path: string, content: string): void {
    this.modules.set(path, content);
  }
}
```

### 模块重定向插件

```typescript
class ModuleRedirectPlugin {
  private redirects: Map<string, string>;
  
  constructor(redirects: Record<string, string>) {
    this.redirects = new Map(Object.entries(redirects));
  }
  
  apply(compiler: Compiler): void {
    compiler.hooks.normalModuleFactory.tap('ModuleRedirect', (nmf) => {
      nmf.hooks.beforeResolve.tap('ModuleRedirect', (resolveData) => {
        const target = this.redirects.get(resolveData.request);
        
        if (target) {
          console.log(`Redirecting ${resolveData.request} -> ${target}`);
          resolveData.request = target;
        }
      });
    });
  }
}

// 使用
new ModuleRedirectPlugin({
  'lodash': 'lodash-es',
  'moment': 'dayjs',
});
```

### 导入分析插件

```typescript
class ImportAnalyzerPlugin {
  private imports: Map<string, Set<string>> = new Map();
  
  apply(compiler: Compiler): void {
    compiler.hooks.normalModuleFactory.tap('ImportAnalyzer', (nmf) => {
      nmf.hooks.parser
        .for('javascript/auto')
        .tap('ImportAnalyzer', (parser) => {
          parser.hooks.importSpecifier.tap(
            'ImportAnalyzer',
            (statement, source, exportName, identifierName) => {
              if (!this.imports.has(source)) {
                this.imports.set(source, new Set());
              }
              
              this.imports.get(source)!.add(exportName || 'default');
            }
          );
        });
    });
    
    compiler.hooks.done.tap('ImportAnalyzer', () => {
      console.log('Import Analysis:');
      
      for (const [source, names] of this.imports) {
        console.log(`  ${source}:`, Array.from(names).join(', '));
      }
    });
  }
}
```

## 总结

ModuleFactory Hooks 的核心要点：

**NormalModuleFactory**：
- beforeResolve：解析前处理
- resolve：自定义解析
- afterResolve：解析后处理
- createModule：创建模块

**Parser Hooks**：
- 处理 import/export
- 处理函数调用
- 表达式求值
- 添加依赖

**ContextModuleFactory**：
- 处理动态导入
- 过滤文件列表

**实用场景**：
- 虚拟模块
- 模块重定向
- 导入分析

**下一章**：我们将学习 JavascriptParser Hooks。
