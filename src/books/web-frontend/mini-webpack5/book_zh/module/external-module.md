---
sidebar_position: 42
title: "ExternalModule 外部模块"
---

# ExternalModule 外部模块

Externals 是 Webpack 的重要特性，允许将某些依赖排除在打包之外，转而在运行时从外部获取。本章实现 ExternalModule。

## 为什么需要 Externals

### 典型场景

**1. CDN 加载**

```html
<script src="https://cdn.example.com/react.min.js"></script>
<script src="https://cdn.example.com/react-dom.min.js"></script>
<script src="/bundle.js"></script>
```

React 已经通过 CDN 加载，打包时不需要再包含。

**2. 微前端**

```javascript
// 主应用已加载的共享依赖
const sharedDeps = {
  'react': React,
  'react-dom': ReactDOM,
  'antd': antd,
};

// 子应用不重复打包
```

**3. Node.js 原生模块**

```javascript
// 不应该打包进去
const fs = require('fs');
const path = require('path');
```

### 配置方式

```javascript
// webpack.config.js
module.exports = {
  externals: {
    // 字符串：全局变量
    'react': 'React',
    'react-dom': 'ReactDOM',
    
    // 对象：不同环境
    'lodash': {
      commonjs: 'lodash',
      commonjs2: 'lodash',
      amd: 'lodash',
      root: '_',
    },
    
    // 函数：自定义逻辑
    ({ context, request }, callback) => {
      if (/^node:/.test(request)) {
        return callback(null, 'commonjs ' + request);
      }
      callback();
    },
  },
  
  // 目标类型
  externalsType: 'var',  // 'var' | 'module' | 'commonjs' | 'amd' | ...
};
```

## ExternalModule 类设计

### 基础结构

```typescript
import { Module, BuildMeta, BuildInfo } from './Module';
import { Source, RawSource, ConcatSource } from 'webpack-sources';

export type ExternalType = 
  | 'var'
  | 'module'
  | 'assign'
  | 'this'
  | 'window'
  | 'self'
  | 'global'
  | 'commonjs'
  | 'commonjs2'
  | 'commonjs-module'
  | 'commonjs-static'
  | 'amd'
  | 'amd-require'
  | 'umd'
  | 'umd2'
  | 'jsonp'
  | 'system'
  | 'promise'
  | 'import'
  | 'script'
  | 'node-commonjs';

export class ExternalModule extends Module {
  // 外部请求
  request: string | string[] | Record<string, string>;
  
  // 外部类型
  externalType: ExternalType;
  
  // 用户请求（用于错误信息）
  userRequest: string;
  
  constructor(
    request: string | string[] | Record<string, string>,
    type: ExternalType,
    userRequest: string
  ) {
    super('javascript/dynamic');
    
    this.request = request;
    this.externalType = type;
    this.userRequest = userRequest;
  }
  
  /**
   * 模块标识符
   */
  identifier(): string {
    return `external ${JSON.stringify(this.request)} ${this.externalType}`;
  }
  
  /**
   * 可读标识符
   */
  readableIdentifier(): string {
    return `external "${this.userRequest}"`;
  }
  
  /**
   * 库标识符（用于去重）
   */
  libIdent(): string {
    return this.userRequest;
  }
  
  /**
   * 模块大小（用于分包计算）
   */
  size(): number {
    // 外部模块几乎不占空间
    return 42;
  }
}
```

### 构建过程

```typescript
export class ExternalModule extends Module {
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
      exportsType: 'dynamic',
      defaultObject: 'redirect-warn',
    };
    
    this.buildInfo = {
      cacheable: true,
      buildTimestamp: Date.now(),
    };
    
    // 外部模块不需要真正构建
    callback();
  }
  
  /**
   * 不需要真正构建
   */
  needBuild(): boolean {
    return !this.buildMeta;
  }
}
```

## 代码生成

### 获取外部请求表达式

```typescript
export class ExternalModule extends Module {
  /**
   * 获取请求字符串
   */
  private getRequestString(type: ExternalType): string {
    const request = this.request;
    
    if (typeof request === 'object' && !Array.isArray(request)) {
      // 根据类型选择
      return request[type] || request.root || Object.values(request)[0];
    }
    
    if (Array.isArray(request)) {
      return request.join('.');
    }
    
    return request;
  }
  
  /**
   * 生成属性访问表达式
   */
  private getSourceForProperty(
    variableName: string,
    properties: string[]
  ): string {
    let expr = variableName;
    for (const prop of properties) {
      expr += `[${JSON.stringify(prop)}]`;
    }
    return expr;
  }
}
```

### 各类型代码生成

```typescript
export class ExternalModule extends Module {
  /**
   * 生成 var 类型代码
   * externals: { 'lodash': '_' }
   */
  private getSourceForVar(): Source {
    const request = this.getRequestString('var');
    const properties = Array.isArray(this.request) 
      ? this.request 
      : request.split('.');
    
    const expression = this.getSourceForProperty(
      properties[0],
      properties.slice(1)
    );
    
    return new RawSource(
      `module.exports = ${expression};`
    );
  }
  
  /**
   * 生成 commonjs 类型代码
   * externals: { 'lodash': 'commonjs lodash' }
   */
  private getSourceForCommonjs(): Source {
    const request = this.getRequestString('commonjs');
    
    return new RawSource(
      `module.exports = require(${JSON.stringify(request)});`
    );
  }
  
  /**
   * 生成 commonjs2 类型代码
   */
  private getSourceForCommonjs2(): Source {
    const request = this.getRequestString('commonjs2');
    
    return new RawSource(
      `module.exports = require(${JSON.stringify(request)});`
    );
  }
  
  /**
   * 生成 amd 类型代码
   */
  private getSourceForAmd(): Source {
    const request = this.getRequestString('amd');
    
    return new RawSource(
      `module.exports = __WEBPACK_EXTERNAL_MODULE_${this.id}__ ;`
    );
  }
  
  /**
   * 生成 module 类型代码（ESM）
   */
  private getSourceForModule(): Source {
    const request = this.getRequestString('module');
    
    const code = `
import * as __WEBPACK_EXTERNAL_MODULE__ from ${JSON.stringify(request)};
export default __WEBPACK_EXTERNAL_MODULE__;
`;
    
    return new RawSource(code);
  }
  
  /**
   * 生成 import 类型代码（动态 import）
   */
  private getSourceForImport(): Source {
    const request = this.getRequestString('import');
    
    return new RawSource(
      `module.exports = import(${JSON.stringify(request)});`
    );
  }
  
  /**
   * 生成 script 类型代码（通过 script 标签加载）
   */
  private getSourceForScript(): Source {
    const request = this.getRequestString('script');
    
    return new RawSource(`
module.exports = new Promise(function(resolve, reject) {
  var script = document.createElement('script');
  script.src = ${JSON.stringify(request)};
  script.onload = function() {
    resolve(window[${JSON.stringify(this.request)}]);
  };
  script.onerror = function() {
    reject(new Error('Failed to load ${request}'));
  };
  document.head.appendChild(script);
});
`);
  }
  
  /**
   * 生成 this 类型代码
   */
  private getSourceForThis(): Source {
    const request = this.getRequestString('this');
    const properties = request.split('.');
    
    return new RawSource(
      `module.exports = ${this.getSourceForProperty('this', properties)};`
    );
  }
  
  /**
   * 生成 window 类型代码
   */
  private getSourceForWindow(): Source {
    const request = this.getRequestString('window');
    const properties = request.split('.');
    
    return new RawSource(
      `module.exports = ${this.getSourceForProperty('window', properties)};`
    );
  }
  
  /**
   * 生成 global 类型代码
   */
  private getSourceForGlobal(): Source {
    const request = this.getRequestString('global');
    const properties = request.split('.');
    
    // 使用 webpack 的 global polyfill
    return new RawSource(
      `module.exports = ${this.getSourceForProperty('__webpack_require__.g', properties)};`
    );
  }
}
```

### 统一生成入口

```typescript
export class ExternalModule extends Module {
  /**
   * 根据类型生成源码
   */
  source(): Source {
    switch (this.externalType) {
      case 'var':
      case 'assign':
        return this.getSourceForVar();
        
      case 'this':
        return this.getSourceForThis();
        
      case 'window':
        return this.getSourceForWindow();
        
      case 'self':
      case 'global':
        return this.getSourceForGlobal();
        
      case 'commonjs':
      case 'commonjs2':
      case 'commonjs-module':
      case 'commonjs-static':
      case 'node-commonjs':
        return this.getSourceForCommonjs();
        
      case 'amd':
      case 'amd-require':
        return this.getSourceForAmd();
        
      case 'module':
        return this.getSourceForModule();
        
      case 'import':
        return this.getSourceForImport();
        
      case 'script':
        return this.getSourceForScript();
        
      default:
        return this.getSourceForVar();
    }
  }
  
  /**
   * 代码生成
   */
  codeGeneration(context: CodeGenerationContext): CodeGenerationResult {
    const sources = new Map<string, Source>();
    sources.set('javascript', this.source());
    
    const runtimeRequirements = new Set<string>();
    
    // 根据类型添加运行时需求
    if (this.externalType === 'global') {
      runtimeRequirements.add(RuntimeGlobals.global);
    }
    
    if (this.externalType === 'commonjs' || this.externalType === 'commonjs2') {
      runtimeRequirements.add(RuntimeGlobals.require);
    }
    
    return {
      sources,
      runtimeRequirements,
    };
  }
}
```

## ExternalsPlugin

处理 externals 配置的插件：

```typescript
import { Compiler } from '../Compiler';
import { NormalModuleFactory } from '../NormalModuleFactory';
import { ExternalModule, ExternalType } from './ExternalModule';

export interface ExternalsPluginOptions {
  type: ExternalType;
  externals: ExternalsConfig;
}

type ExternalsConfig = 
  | string
  | RegExp
  | ExternalsObject
  | ExternalFunction
  | (string | RegExp | ExternalsObject | ExternalFunction)[];

type ExternalsObject = Record<string, string | string[] | Record<string, string>>;
type ExternalFunction = (
  data: { context: string; request: string },
  callback: (err?: Error, result?: string, type?: ExternalType) => void
) => void;

export class ExternalsPlugin {
  type: ExternalType;
  externals: ExternalsConfig;
  
  constructor(type: ExternalType, externals: ExternalsConfig) {
    this.type = type;
    this.externals = externals;
  }
  
  apply(compiler: Compiler): void {
    compiler.hooks.compile.tap('ExternalsPlugin', (params) => {
      params.normalModuleFactory.hooks.factorize.tapAsync(
        'ExternalsPlugin',
        (data, callback) => {
          const { context, request } = data;
          
          this.handleExternal(context, request, (err, result, type) => {
            if (err) return callback(err);
            
            if (result !== undefined) {
              // 创建外部模块
              callback(null, new ExternalModule(
                result,
                type || this.type,
                request
              ));
            } else {
              // 不是外部模块，继续正常处理
              callback();
            }
          });
        }
      );
    });
  }
  
  /**
   * 处理外部依赖
   */
  private handleExternal(
    context: string,
    request: string,
    callback: (err?: Error, result?: string, type?: ExternalType) => void
  ): void {
    const externals = this.externals;
    
    // 处理数组
    if (Array.isArray(externals)) {
      let i = 0;
      const next = (): void => {
        if (i >= externals.length) {
          return callback();
        }
        
        const external = externals[i++];
        this.handleSingleExternal(context, request, external, (err, result, type) => {
          if (err) return callback(err);
          if (result !== undefined) return callback(undefined, result, type);
          next();
        });
      };
      next();
      return;
    }
    
    this.handleSingleExternal(context, request, externals, callback);
  }
  
  /**
   * 处理单个外部配置
   */
  private handleSingleExternal(
    context: string,
    request: string,
    external: string | RegExp | ExternalsObject | ExternalFunction,
    callback: (err?: Error, result?: string, type?: ExternalType) => void
  ): void {
    // 字符串
    if (typeof external === 'string') {
      if (request === external) {
        callback(undefined, external);
      } else {
        callback();
      }
      return;
    }
    
    // 正则
    if (external instanceof RegExp) {
      if (external.test(request)) {
        callback(undefined, request);
      } else {
        callback();
      }
      return;
    }
    
    // 函数
    if (typeof external === 'function') {
      external({ context, request }, callback);
      return;
    }
    
    // 对象
    if (typeof external === 'object') {
      if (request in external) {
        const value = external[request];
        callback(undefined, value as string);
      } else {
        callback();
      }
      return;
    }
    
    callback();
  }
}
```

## 实际应用

### 库开发配置

```javascript
// webpack.config.js
module.exports = {
  externals: {
    // 常用依赖外部化
    'react': 'React',
    'react-dom': 'ReactDOM',
    'lodash': '_',
  },
  
  externalsType: 'var',
  
  output: {
    library: 'MyLibrary',
    libraryTarget: 'umd',
  },
};
```

### Node.js 配置

```javascript
// webpack.config.js
const nodeExternals = require('webpack-node-externals');

module.exports = {
  target: 'node',
  
  externals: [
    // 排除所有 node_modules
    nodeExternals(),
    
    // 排除原生模块
    ({ request }, callback) => {
      if (/^(fs|path|crypto|os|child_process)$/.test(request)) {
        return callback(null, 'commonjs ' + request);
      }
      callback();
    },
  ],
};
```

### 微前端配置

```javascript
// webpack.config.js
module.exports = {
  externals: {
    // 共享依赖
    'react': 'React',
    'react-dom': 'ReactDOM',
    'antd': 'antd',
    'moment': 'moment',
  },
  
  // 或使用 Module Federation
  plugins: [
    new ModuleFederationPlugin({
      shared: {
        react: { singleton: true },
        'react-dom': { singleton: true },
      },
    }),
  ],
};
```

## 与其他模块类型对比

| 模块类型 | 来源 | 打包方式 | 运行时解析 |
|---------|------|---------|-----------|
| NormalModule | 源码/node_modules | 完整打包 | 无 |
| ExternalModule | 外部环境 | 不打包 | 全局变量/require |
| ContextModule | 动态导入 | 按规则打包 | 运行时查找 |

## 生成代码示例

配置：

```javascript
externals: {
  'react': 'React',
  'lodash': '_',
  'fs': 'commonjs fs',
}
```

生成代码：

```javascript
/******/ var __webpack_modules__ = ({

/***/ "react":
/***/ (function(module) {
  module.exports = React;
/***/ }),

/***/ "lodash":
/***/ (function(module) {
  module.exports = _;
/***/ }),

/***/ "fs":
/***/ (function(module) {
  module.exports = require("fs");
/***/ }),

/******/ });
```

## 总结

ExternalModule 实现依赖外部化：

**核心概念**：
- **外部请求**：全局变量名或模块路径
- **外部类型**：var、commonjs、amd、module 等
- **代码生成**：生成访问外部依赖的代码

**主要类型**：
| 类型 | 生成代码 | 适用环境 |
|------|---------|---------|
| var | `window.React` | 浏览器 CDN |
| commonjs | `require('lodash')` | Node.js |
| module | `import * from 'x'` | ESM 环境 |
| script | 动态创建 script | 异步加载 |

**最佳实践**：
- 库开发时外部化 peerDependencies
- Node.js 项目外部化 node_modules
- 使用 CDN 时配置常用库
- 微前端共享依赖

**下一章**：我们将进入模块工厂（Module Factory）的实现。
