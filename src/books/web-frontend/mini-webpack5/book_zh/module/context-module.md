---
sidebar_position: 41
title: "ContextModule 上下文模块"
---

# ContextModule 上下文模块

当使用动态 `require` 或 `import()` 时，Webpack 无法在编译时确定具体模块，需要创建一个"上下文模块"来处理运行时解析。本章实现 ContextModule。

## 什么是上下文模块

### 动态导入场景

```javascript
// 动态 require
const module = require('./components/' + name + '.js');

// 动态 import
const module = await import(`./locales/${lang}.json`);

// require.context
const ctx = require.context('./modules', true, /\.js$/);
```

Webpack 无法静态分析 `name` 或 `lang` 的值，因此会：

1. 分析目录结构
2. 匹配符合条件的文件
3. 创建一个包含所有可能模块的"上下文"

### require.context API

```javascript
// 创建上下文
const context = require.context(
  './modules',    // 目录
  true,           // 递归子目录
  /\.js$/         // 匹配正则
);

// 获取所有 key
context.keys();  // ['./a.js', './b.js', './sub/c.js']

// 加载模块
const moduleA = context('./a.js');

// 获取模块 ID
context.id;  // 上下文模块的 ID
```

## ContextModule 类设计

### 基础结构

```typescript
import { Module, BuildMeta, BuildInfo } from './Module';
import { Source, RawSource } from 'webpack-sources';
import path from 'path';
import fs from 'fs';

export interface ContextModuleOptions {
  // 上下文目录
  context: string;
  
  // 请求正则
  request: string;
  
  // 是否递归
  recursive: boolean;
  
  // 匹配正则
  regExp: RegExp;
  
  // 模块类型
  mode: 'sync' | 'lazy' | 'eager' | 'weak' | 'lazy-once';
  
  // 包含的模块
  include?: RegExp;
  
  // 排除的模块
  exclude?: RegExp;
  
  // 分组正则（用于 chunk 命名）
  groupOptions?: {
    groupName: string;
    regExp: RegExp;
  };
}

export class ContextModule extends Module {
  context: string;
  request: string;
  recursive: boolean;
  regExp: RegExp;
  mode: string;
  
  // 发现的模块映射
  private resolveDependencies: Map<string, string> = new Map();
  
  constructor(options: ContextModuleOptions) {
    super('javascript/dynamic');
    
    this.context = options.context;
    this.request = options.request;
    this.recursive = options.recursive;
    this.regExp = options.regExp;
    this.mode = options.mode;
  }
  
  /**
   * 模块标识符
   */
  identifier(): string {
    const parts = [
      this.context,
      this.recursive ? 'recursive' : 'nonrecursive',
      this.regExp.toString(),
      this.mode,
    ];
    return parts.join('|');
  }
  
  /**
   * 可读的请求字符串
   */
  readableIdentifier(requestShortener: any): string {
    return `${this.context} ${this.mode} ${this.regExp}`;
  }
  
  /**
   * 库标识符
   */
  libIdent(): string {
    return `${this.context.replace(/\\/g, '/')} ${this.regExp.toString()}`;
  }
}
```

### 模块发现

```typescript
export class ContextModule extends Module {
  /**
   * 扫描目录发现模块
   */
  private scanDirectory(
    dir: string,
    recursive: boolean,
    regExp: RegExp
  ): string[] {
    const results: string[] = [];
    
    const files = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const file of files) {
      const filePath = path.join(dir, file.name);
      const relativePath = path.relative(this.context, filePath);
      
      if (file.isDirectory()) {
        if (recursive) {
          results.push(...this.scanDirectory(filePath, recursive, regExp));
        }
      } else {
        // 测试是否匹配正则
        if (regExp.test('./' + relativePath.replace(/\\/g, '/'))) {
          results.push('./' + relativePath.replace(/\\/g, '/'));
        }
      }
    }
    
    return results;
  }
  
  /**
   * 构建模块
   */
  build(
    options: any,
    compilation: any,
    resolver: any,
    fs: any,
    callback: (err?: Error) => void
  ): void {
    this.buildMeta = {
      exportsType: 'default',
    };
    
    this.buildInfo = {
      cacheable: true,
      buildTimestamp: Date.now(),
      fileDependencies: new Set([this.context]),
      contextDependencies: new Set([this.context]),
    };
    
    // 扫描目录
    const keys = this.scanDirectory(
      this.context,
      this.recursive,
      this.regExp
    );
    
    // 解析每个模块
    const resolvePromises = keys.map((key) => {
      return new Promise<void>((resolve, reject) => {
        const request = path.join(this.context, key);
        
        resolver.resolve({}, this.context, request, {}, (err: Error | null, result: string) => {
          if (err) {
            reject(err);
          } else {
            this.resolveDependencies.set(key, result);
            resolve();
          }
        });
      });
    });
    
    Promise.all(resolvePromises)
      .then(() => {
        // 添加依赖
        for (const [key, resource] of this.resolveDependencies) {
          const dep = new ContextElementDependency(resource, key);
          this.addDependency(dep);
        }
        callback();
      })
      .catch(callback);
  }
}
```

## 代码生成

### 同步模式

```typescript
export class ContextModule extends Module {
  /**
   * 生成同步模式代码
   */
  private generateSyncSource(): Source {
    const map: Record<string, string> = {};
    
    for (const [key, resource] of this.resolveDependencies) {
      // 获取模块 ID
      const moduleId = this.compilation?.moduleGraph.getModuleId(resource);
      if (moduleId !== undefined) {
        map[key] = moduleId.toString();
      }
    }
    
    const code = `
var map = ${JSON.stringify(map, null, 2)};

function webpackContext(req) {
  var id = webpackContextResolve(req);
  return __webpack_require__(id);
}

function webpackContextResolve(req) {
  if(!Object.prototype.hasOwnProperty.call(map, req)) {
    var e = new Error("Cannot find module '" + req + "'");
    e.code = 'MODULE_NOT_FOUND';
    throw e;
  }
  return map[req];
}

webpackContext.keys = function webpackContextKeys() {
  return Object.keys(map);
};

webpackContext.resolve = webpackContextResolve;
webpackContext.id = ${JSON.stringify(this.id)};

module.exports = webpackContext;
`;
    
    return new RawSource(code);
  }
}
```

### 懒加载模式

```typescript
export class ContextModule extends Module {
  /**
   * 生成懒加载模式代码
   */
  private generateLazySource(): Source {
    const map: Record<string, [string, string]> = {};
    
    for (const [key, resource] of this.resolveDependencies) {
      const moduleId = this.compilation?.moduleGraph.getModuleId(resource);
      const chunkId = this.compilation?.chunkGraph.getChunkId(resource);
      
      if (moduleId !== undefined) {
        map[key] = [chunkId?.toString() || '', moduleId.toString()];
      }
    }
    
    const code = `
var map = ${JSON.stringify(map, null, 2)};

function webpackAsyncContext(req) {
  if(!Object.prototype.hasOwnProperty.call(map, req)) {
    return Promise.reject(new Error("Cannot find module '" + req + "'"));
  }
  
  var ids = map[req];
  return __webpack_require__.e(ids[0]).then(function() {
    return __webpack_require__(ids[1]);
  });
}

webpackAsyncContext.keys = function webpackAsyncContextKeys() {
  return Object.keys(map);
};

webpackAsyncContext.id = ${JSON.stringify(this.id)};

module.exports = webpackAsyncContext;
`;
    
    return new RawSource(code);
  }
}
```

### Eager 模式

```typescript
export class ContextModule extends Module {
  /**
   * 生成 eager 模式代码（同步加载，但返回 Promise）
   */
  private generateEagerSource(): Source {
    const map: Record<string, string> = {};
    
    for (const [key, resource] of this.resolveDependencies) {
      const moduleId = this.compilation?.moduleGraph.getModuleId(resource);
      if (moduleId !== undefined) {
        map[key] = moduleId.toString();
      }
    }
    
    const code = `
var map = ${JSON.stringify(map, null, 2)};

function webpackAsyncContext(req) {
  if(!Object.prototype.hasOwnProperty.call(map, req)) {
    return Promise.reject(new Error("Cannot find module '" + req + "'"));
  }
  return Promise.resolve(__webpack_require__(map[req]));
}

webpackAsyncContext.keys = function() {
  return Object.keys(map);
};

webpackAsyncContext.id = ${JSON.stringify(this.id)};

module.exports = webpackAsyncContext;
`;
    
    return new RawSource(code);
  }
}
```

### Weak 模式

```typescript
export class ContextModule extends Module {
  /**
   * 生成 weak 模式代码（仅当模块已加载时返回）
   */
  private generateWeakSource(): Source {
    const map: Record<string, string> = {};
    
    for (const [key, resource] of this.resolveDependencies) {
      const moduleId = this.compilation?.moduleGraph.getModuleId(resource);
      if (moduleId !== undefined) {
        map[key] = moduleId.toString();
      }
    }
    
    const code = `
var map = ${JSON.stringify(map, null, 2)};

function webpackContext(req) {
  var id = webpackContextResolve(req);
  if(!__webpack_require__.m[id]) {
    var e = new Error("Module '" + req + "' is not available (weak dependency)");
    e.code = 'MODULE_NOT_FOUND';
    throw e;
  }
  return __webpack_require__(id);
}

function webpackContextResolve(req) {
  if(!Object.prototype.hasOwnProperty.call(map, req)) {
    var e = new Error("Cannot find module '" + req + "'");
    e.code = 'MODULE_NOT_FOUND';
    throw e;
  }
  return map[req];
}

webpackContext.keys = function() {
  return Object.keys(map);
};

webpackContext.resolve = webpackContextResolve;
webpackContext.id = ${JSON.stringify(this.id)};

module.exports = webpackContext;
`;
    
    return new RawSource(code);
  }
}
```

### 统一生成入口

```typescript
export class ContextModule extends Module {
  /**
   * 获取生成的源码
   */
  source(): Source {
    switch (this.mode) {
      case 'sync':
        return this.generateSyncSource();
      case 'lazy':
      case 'lazy-once':
        return this.generateLazySource();
      case 'eager':
        return this.generateEagerSource();
      case 'weak':
        return this.generateWeakSource();
      default:
        return this.generateSyncSource();
    }
  }
  
  /**
   * 代码生成
   */
  codeGeneration(context: CodeGenerationContext): CodeGenerationResult {
    const sources = new Map<string, Source>();
    sources.set('javascript', this.source());
    
    return {
      sources,
      runtimeRequirements: new Set([
        RuntimeGlobals.require,
        RuntimeGlobals.module,
      ]),
    };
  }
}
```

## ContextElementDependency

上下文模块的每个子模块都是一个依赖：

```typescript
export class ContextElementDependency extends Dependency {
  request: string;
  userRequest: string;
  
  constructor(request: string, userRequest: string) {
    super();
    this.request = request;
    this.userRequest = userRequest;
  }
  
  get type(): string {
    return 'context element';
  }
  
  get category(): string {
    return 'commonjs';
  }
  
  getResourceIdentifier(): string {
    return this.request;
  }
}
```

## ContextModuleFactory

创建上下文模块的工厂：

```typescript
export class ContextModuleFactory extends ModuleFactory {
  hooks = {
    beforeResolve: new AsyncSeriesWaterfallHook<[ContextModuleOptions]>(['data']),
    afterResolve: new AsyncSeriesWaterfallHook<[ContextModuleOptions]>(['data']),
    contextModuleFiles: new SyncWaterfallHook<[string[]]>(['files']),
    alternatives: new AsyncSeriesWaterfallHook<[any[]]>(['alternatives']),
  };
  
  /**
   * 创建上下文模块
   */
  create(
    data: ModuleFactoryCreateData,
    callback: ModuleFactoryCallback
  ): void {
    const { dependencies, context, contextInfo } = data;
    const dependency = dependencies[0] as ContextDependency;
    
    const options: ContextModuleOptions = {
      context: dependency.options.context || context,
      request: dependency.options.request,
      recursive: dependency.options.recursive !== false,
      regExp: dependency.options.regExp || /^\.\/.*$/,
      mode: dependency.options.mode || 'sync',
    };
    
    // 前置钩子
    this.hooks.beforeResolve.callAsync(options, (err, result) => {
      if (err) return callback(err);
      if (!result) return callback(null);  // 跳过
      
      // 后置钩子
      this.hooks.afterResolve.callAsync(result, (err, finalResult) => {
        if (err) return callback(err);
        if (!finalResult) return callback(null);
        
        // 创建模块
        const contextModule = new ContextModule(finalResult);
        
        callback(null, {
          module: contextModule,
        });
      });
    });
  }
}
```

## 实际应用示例

### 动态加载组件

```javascript
// 组件目录结构
// components/
// ├── Button.js
// ├── Input.js
// └── Modal.js

// 动态加载
async function loadComponent(name) {
  // webpack 会创建 ContextModule
  const module = await import(
    /* webpackChunkName: "component-[request]" */
    `./components/${name}.js`
  );
  return module.default;
}

// 使用
const Button = await loadComponent('Button');
```

### 国际化

```javascript
// locales/
// ├── en.json
// ├── zh.json
// └── ja.json

const localeContext = require.context('./locales', false, /\.json$/);

function loadLocale(lang) {
  const key = `./${lang}.json`;
  if (localeContext.keys().includes(key)) {
    return localeContext(key);
  }
  return localeContext('./en.json');  // 默认
}
```

### 自动注册

```javascript
// modules/
// ├── userModule.js
// ├── orderModule.js
// └── productModule.js

// 自动注册所有模块
const moduleContext = require.context('./modules', false, /Module\.js$/);

const modules = {};
moduleContext.keys().forEach((key) => {
  const moduleName = key.replace(/^\.\/(.*)Module\.js$/, '$1');
  modules[moduleName] = moduleContext(key).default;
});

export default modules;
```

## 优化建议

### 限制匹配范围

```javascript
// ❌ 太宽泛
require.context('./src', true, /\.js$/);

// ✅ 精确匹配
require.context('./src/components', false, /^\.\/[A-Z][a-z]+\.js$/);
```

### 使用 Magic Comments

```javascript
// 命名 chunk
import(/* webpackChunkName: "locale-[request]" */ `./locales/${lang}.json`);

// 预加载
import(/* webpackPrefetch: true */ `./heavy/${name}.js`);

// 指定模式
import(/* webpackMode: "lazy-once" */ `./optional/${name}.js`);
```

## 总结

ContextModule 处理动态导入场景：

**核心概念**：
- **上下文目录**：扫描的根目录
- **匹配规则**：正则表达式
- **加载模式**：sync、lazy、eager、weak

**加载模式对比**：

| 模式 | 打包方式 | 返回类型 | 适用场景 |
|------|---------|---------|---------|
| sync | 全部打入主包 | 同步 | 小量必需模块 |
| lazy | 每个模块单独 chunk | Promise | 按需加载 |
| eager | 全部打入主包 | Promise | API 统一 |
| weak | 不打包 | 同步 | SSR |

**生成的运行时代码**：
- `webpackContext(req)`：加载模块
- `webpackContext.keys()`：所有可用 key
- `webpackContext.resolve(req)`：解析模块 ID

下一章我们将实现 ExternalModule（外部模块）。
