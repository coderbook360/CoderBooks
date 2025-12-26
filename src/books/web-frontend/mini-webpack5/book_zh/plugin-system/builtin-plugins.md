---
sidebar_position: 139
title: "内置插件实现分析"
---

# 内置插件实现分析

Webpack 内置了大量插件来实现核心功能。本章分析几个重要内置插件的实现原理。

## EntryPlugin

### 功能描述

EntryPlugin 负责将配置中的入口转换为依赖，并添加到编译过程。

### 实现分析

```typescript
class EntryPlugin {
  private context: string;
  private entry: string;
  private options: EntryOptions;
  
  constructor(context: string, entry: string, options: EntryOptions = {}) {
    this.context = context;
    this.entry = entry;
    this.options = {
      name: 'main',
      ...options,
    };
  }
  
  apply(compiler: Compiler): void {
    compiler.hooks.compilation.tap(
      'EntryPlugin',
      (compilation, { normalModuleFactory }) => {
        // 注册依赖工厂
        compilation.dependencyFactories.set(
          EntryDependency,
          normalModuleFactory
        );
      }
    );
    
    compiler.hooks.make.tapAsync('EntryPlugin', (compilation, callback) => {
      // 创建入口依赖
      const dep = new EntryDependency(this.entry);
      dep.loc = { name: this.options.name };
      
      // 添加入口
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
  
  // 静态方法：创建依赖
  static createDependency(entry: string, name: string): EntryDependency {
    const dep = new EntryDependency(entry);
    dep.loc = { name };
    return dep;
  }
}
```

### 使用示例

```typescript
// 多入口配置转换为多个 EntryPlugin
const entries = {
  main: './src/main.js',
  admin: './src/admin.js',
};

for (const [name, entry] of Object.entries(entries)) {
  new EntryPlugin(context, entry, { name }).apply(compiler);
}
```

## DefinePlugin

### 功能描述

DefinePlugin 用于在编译时替换代码中的变量为常量值。

### 实现分析

```typescript
class DefinePlugin {
  private definitions: Record<string, any>;
  
  constructor(definitions: Record<string, any>) {
    this.definitions = definitions;
  }
  
  apply(compiler: Compiler): void {
    const definitions = this.definitions;
    
    compiler.hooks.compilation.tap(
      'DefinePlugin',
      (compilation, { normalModuleFactory }) => {
        // 注册依赖模板
        compilation.dependencyTemplates.set(
          ConstDependency,
          new ConstDependency.Template()
        );
        
        // 处理 parser
        const handler = (parser: JavascriptParser) => {
          const walkDefinitions = (
            definitions: Record<string, any>,
            prefix: string
          ) => {
            for (const key of Object.keys(definitions)) {
              const fullKey = prefix ? `${prefix}.${key}` : key;
              const value = definitions[key];
              
              if (
                value !== null &&
                typeof value === 'object' &&
                !Array.isArray(value)
              ) {
                // 嵌套对象，递归处理
                walkDefinitions(value, fullKey);
              } else {
                // 注册替换
                this.applyDefine(parser, fullKey, value);
              }
            }
          };
          
          walkDefinitions(definitions, '');
        };
        
        normalModuleFactory.hooks.parser
          .for('javascript/auto')
          .tap('DefinePlugin', handler);
        
        normalModuleFactory.hooks.parser
          .for('javascript/esm')
          .tap('DefinePlugin', handler);
      }
    );
  }
  
  private applyDefine(
    parser: JavascriptParser,
    key: string,
    value: any
  ): void {
    const code = this.toCode(value);
    
    // 表达式替换
    parser.hooks.expression.for(key).tap('DefinePlugin', (expr) => {
      const dep = new ConstDependency(code, expr.range, [key]);
      dep.loc = expr.loc;
      parser.state.current.addDependency(dep);
      return true;
    });
    
    // typeof 替换
    parser.hooks.typeof.for(key).tap('DefinePlugin', (expr) => {
      const typeofCode = this.toCode(typeof this.toValue(value));
      const dep = new ConstDependency(typeofCode, expr.range);
      dep.loc = expr.loc;
      parser.state.current.addDependency(dep);
      return true;
    });
    
    // 求值
    parser.hooks.evaluateIdentifier.for(key).tap('DefinePlugin', (expr) => {
      return this.evaluateToExpression(value, expr.range);
    });
  }
  
  private toCode(value: any): string {
    if (value === undefined) return 'undefined';
    if (value === null) return 'null';
    if (typeof value === 'function') return value.toString();
    return JSON.stringify(value);
  }
  
  private toValue(value: any): any {
    if (typeof value === 'string') {
      try {
        return eval(value);
      } catch {
        return value;
      }
    }
    return value;
  }
  
  private evaluateToExpression(
    value: any,
    range: [number, number]
  ): BasicEvaluatedExpression {
    const result = new BasicEvaluatedExpression();
    result.setRange(range);
    
    const val = this.toValue(value);
    
    if (typeof val === 'string') {
      result.setString(val);
    } else if (typeof val === 'number') {
      result.setNumber(val);
    } else if (typeof val === 'boolean') {
      result.setBoolean(val);
    } else if (val === null) {
      result.setNull();
    }
    
    return result;
  }
}
```

## ProvidePlugin

### 功能描述

ProvidePlugin 自动加载模块，无需 import 或 require。

### 实现分析

```typescript
class ProvidePlugin {
  private definitions: Record<string, string | string[]>;
  
  constructor(definitions: Record<string, string | string[]>) {
    this.definitions = definitions;
  }
  
  apply(compiler: Compiler): void {
    const definitions = this.definitions;
    
    compiler.hooks.compilation.tap(
      'ProvidePlugin',
      (compilation, { normalModuleFactory }) => {
        // 注册依赖工厂
        compilation.dependencyFactories.set(
          ProvideSharedDependency,
          normalModuleFactory
        );
        
        compilation.dependencyTemplates.set(
          ProvideSharedDependency,
          new ProvideSharedDependency.Template()
        );
        
        const handler = (parser: JavascriptParser) => {
          for (const name of Object.keys(definitions)) {
            const request = definitions[name];
            const requests = Array.isArray(request) ? request : [request];
            const [module, ...properties] = requests;
            
            // 处理表达式
            parser.hooks.expression.for(name).tap('ProvidePlugin', (expr) => {
              const dep = new ProvideSharedDependency(
                module,
                name,
                properties,
                expr.range
              );
              dep.loc = expr.loc;
              parser.state.current.addDependency(dep);
              return true;
            });
            
            // 处理成员链调用
            parser.hooks.call.for(name).tap('ProvidePlugin', (expr) => {
              const dep = new ProvideSharedDependency(
                module,
                name,
                properties,
                expr.callee.range
              );
              dep.loc = expr.callee.loc;
              parser.state.current.addDependency(dep);
              parser.walkExpressions(expr.arguments);
              return true;
            });
          }
        };
        
        normalModuleFactory.hooks.parser
          .for('javascript/auto')
          .tap('ProvidePlugin', handler);
        
        normalModuleFactory.hooks.parser
          .for('javascript/esm')
          .tap('ProvidePlugin', handler);
      }
    );
  }
}

// 使用示例
new ProvidePlugin({
  $: 'jquery',
  jQuery: 'jquery',
  React: 'react',
  process: 'process/browser',
  Buffer: ['buffer', 'Buffer'],
});
```

## BannerPlugin

### 功能描述

BannerPlugin 在每个生成的 chunk 顶部添加注释。

### 实现分析

```typescript
class BannerPlugin {
  private options: BannerPluginOptions;
  
  constructor(options: string | BannerPluginOptions) {
    if (typeof options === 'string') {
      this.options = { banner: options };
    } else {
      this.options = options;
    }
  }
  
  apply(compiler: Compiler): void {
    const options = this.options;
    const banner = this.createBanner();
    const matchAsset = this.createAssetMatcher();
    
    compiler.hooks.compilation.tap('BannerPlugin', (compilation) => {
      compilation.hooks.processAssets.tap(
        {
          name: 'BannerPlugin',
          stage: Compilation.PROCESS_ASSETS_STAGE_ADDITIONS,
        },
        (assets) => {
          for (const [name, source] of Object.entries(assets)) {
            if (!matchAsset(name)) {
              continue;
            }
            
            // 计算 banner
            const bannerText = typeof banner === 'function'
              ? banner({ chunk: this.getChunk(compilation, name) })
              : banner;
            
            // 添加 banner
            const newSource = options.footer
              ? new ConcatSource(source, '\n', bannerText)
              : new ConcatSource(bannerText, '\n', source);
            
            compilation.updateAsset(name, newSource);
          }
        }
      );
    });
  }
  
  private createBanner(): string | ((data: any) => string) {
    const { banner, raw } = this.options;
    
    if (typeof banner === 'function') {
      return banner;
    }
    
    // 包装为注释
    return raw ? banner : `/*! ${banner} */`;
  }
  
  private createAssetMatcher(): (name: string) => boolean {
    const { test, include, exclude } = this.options;
    
    return (name: string) => {
      if (test && !this.matchPattern(name, test)) {
        return false;
      }
      if (include && !this.matchPattern(name, include)) {
        return false;
      }
      if (exclude && this.matchPattern(name, exclude)) {
        return false;
      }
      
      // 默认只处理 JS 文件
      if (!test && !include) {
        return /\.js$/i.test(name);
      }
      
      return true;
    };
  }
  
  private matchPattern(name: string, pattern: RegExp | string): boolean {
    if (typeof pattern === 'string') {
      return name.includes(pattern);
    }
    return pattern.test(name);
  }
}

interface BannerPluginOptions {
  banner: string | ((data: any) => string);
  raw?: boolean;
  footer?: boolean;
  test?: RegExp | string;
  include?: RegExp | string;
  exclude?: RegExp | string;
}
```

## IgnorePlugin

### 功能描述

IgnorePlugin 阻止生成匹配正则的模块。

### 实现分析

```typescript
class IgnorePlugin {
  private options: IgnorePluginOptions;
  
  constructor(options: IgnorePluginOptions) {
    this.options = options;
  }
  
  apply(compiler: Compiler): void {
    compiler.hooks.normalModuleFactory.tap('IgnorePlugin', (nmf) => {
      nmf.hooks.beforeResolve.tap('IgnorePlugin', (resolveData) => {
        if (this.checkIgnore(resolveData)) {
          return false; // 阻止解析
        }
      });
    });
    
    compiler.hooks.contextModuleFactory.tap('IgnorePlugin', (cmf) => {
      cmf.hooks.beforeResolve.tap('IgnorePlugin', (resolveData) => {
        if (this.checkIgnore(resolveData)) {
          return false;
        }
      });
    });
  }
  
  private checkIgnore(resolveData: ResolveData): boolean {
    if (this.options.checkResource) {
      return this.options.checkResource(resolveData.request, resolveData.context);
    }
    
    const { resourceRegExp, contextRegExp } = this.options;
    
    // 检查资源
    if (resourceRegExp && !resourceRegExp.test(resolveData.request)) {
      return false;
    }
    
    // 检查上下文
    if (contextRegExp && !contextRegExp.test(resolveData.context)) {
      return false;
    }
    
    return true;
  }
}

interface IgnorePluginOptions {
  resourceRegExp?: RegExp;
  contextRegExp?: RegExp;
  checkResource?: (resource: string, context: string) => boolean;
}

// 使用示例：忽略 moment 的语言包
new IgnorePlugin({
  resourceRegExp: /^\.\/locale$/,
  contextRegExp: /moment$/,
});
```

## ProgressPlugin

### 功能描述

ProgressPlugin 报告编译进度。

### 实现分析

```typescript
class ProgressPlugin {
  private handler: ProgressHandler;
  
  constructor(options?: ProgressPluginOptions | ProgressHandler) {
    if (typeof options === 'function') {
      this.handler = options;
    } else {
      this.handler = this.createDefaultHandler(options);
    }
  }
  
  apply(compiler: Compiler): void {
    const handler = this.handler;
    
    compiler.hooks.beforeRun.tap('ProgressPlugin', () => {
      handler(0, 'Starting');
    });
    
    compiler.hooks.run.tap('ProgressPlugin', () => {
      handler(0.1, 'Running');
    });
    
    compiler.hooks.compilation.tap('ProgressPlugin', (compilation) => {
      let moduleCount = 0;
      let doneModules = 0;
      
      compilation.hooks.buildModule.tap('ProgressPlugin', () => {
        moduleCount++;
        this.updateProgress(doneModules, moduleCount, handler);
      });
      
      compilation.hooks.succeedModule.tap('ProgressPlugin', () => {
        doneModules++;
        this.updateProgress(doneModules, moduleCount, handler);
      });
      
      compilation.hooks.failedModule.tap('ProgressPlugin', () => {
        doneModules++;
        this.updateProgress(doneModules, moduleCount, handler);
      });
    });
    
    compiler.hooks.emit.tap('ProgressPlugin', () => {
      handler(0.9, 'Emitting');
    });
    
    compiler.hooks.done.tap('ProgressPlugin', () => {
      handler(1, 'Done');
    });
  }
  
  private updateProgress(
    done: number,
    total: number,
    handler: ProgressHandler
  ): void {
    const progress = 0.1 + (done / Math.max(total, 1)) * 0.8;
    handler(progress, `Building modules (${done}/${total})`);
  }
  
  private createDefaultHandler(options?: ProgressPluginOptions): ProgressHandler {
    return (percentage, message) => {
      const percent = (percentage * 100).toFixed(0);
      process.stdout.write(`\r${percent}% ${message}`);
      
      if (percentage === 1) {
        process.stdout.write('\n');
      }
    };
  }
}

type ProgressHandler = (percentage: number, message: string) => void;
```

## 总结

内置插件的实现要点：

**EntryPlugin**：
- make 阶段添加入口
- 创建入口依赖

**DefinePlugin**：
- Parser hooks 替换表达式
- 支持嵌套定义

**ProvidePlugin**：
- 自动注入依赖
- 处理全局变量

**BannerPlugin**：
- processAssets 阶段修改资源
- 支持模板函数

**IgnorePlugin**：
- beforeResolve 阻止解析
- 支持正则和函数

**下一章**：我们将学习如何编写自定义插件。
