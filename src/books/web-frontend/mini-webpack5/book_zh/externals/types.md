---
sidebar_position: 90
title: "外部化类型：var/commonjs/amd/umd"
---

# 外部化类型：var/commonjs/amd/umd

不同的外部化类型决定了如何从外部环境获取依赖，需要根据运行环境选择合适的类型。

## 类型概览

### 支持的类型

```javascript
// webpack.config.js
module.exports = {
  externalsType: 'var',  // 默认类型
  
  externals: {
    jquery: 'jQuery',                    // 使用默认类型
    lodash: 'commonjs lodash',           // 显式指定类型
    react: 'module react',               // ES Module
  },
};
```

### 类型对照表

| 类型 | 代码输出 | 适用环境 |
|------|---------|---------|
| var | `window.xxx` | 浏览器全局变量 |
| this | `this.xxx` | 通用 |
| global | `global.xxx` | Node.js |
| commonjs | `require('xxx')` | CommonJS |
| commonjs2 | `module.exports = require('xxx')` | Node.js |
| amd | `define(['xxx'], fn)` | AMD |
| umd | 自动检测 | 通用 |
| module | `import xxx from 'xxx'` | ES Module |
| import | `import('xxx')` | 动态 ES Module |

## var 类型

### 全局变量访问

```javascript
// 配置
externals: {
  jquery: 'jQuery',
}

// 或显式指定
externals: {
  jquery: 'var jQuery',
}
```

### 生成代码

```javascript
// 输入
import $ from 'jquery';
$('.selector').show();

// 输出
// external "jQuery" 模块
module.exports = jQuery;

// 主模块
var jquery__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__("jquery");
jquery__WEBPACK_IMPORTED_MODULE_0__(".selector").show();
```

### 实现

```typescript
class ExternalModule extends Module {
  getSourceForVar(): string {
    const request = this.request;
    
    if (typeof request === 'string') {
      return `module.exports = ${request};`;
    }
    
    // 嵌套属性访问
    // ['jQuery', 'fn', 'extend'] => jQuery["fn"]["extend"]
    const expression = request
      .map((r, i) => i === 0 ? r : `[${JSON.stringify(r)}]`)
      .join('');
    
    return `module.exports = ${expression};`;
  }
}
```

### 嵌套访问

```javascript
// 配置
externals: {
  'lodash/get': ['_', 'get'],
}

// 生成
module.exports = _["get"];
```

## commonjs 类型

### require 调用

```javascript
// 配置
externals: {
  lodash: 'commonjs lodash',
}
```

### 生成代码

```javascript
// 输入
const _ = require('lodash');
_.map([1, 2], x => x * 2);

// 输出
module.exports = require("lodash");
```

### 实现

```typescript
class ExternalModule extends Module {
  getSourceForCommonjs(): string {
    const request = this.request;
    
    if (typeof request === 'string') {
      return `module.exports = require(${JSON.stringify(request)});`;
    }
    
    // 嵌套访问
    // ['lodash', 'map'] => require("lodash")["map"]
    const base = `require(${JSON.stringify(request[0])})`;
    const props = request.slice(1)
      .map(r => `[${JSON.stringify(r)}]`)
      .join('');
    
    return `module.exports = ${base}${props};`;
  }
}
```

## commonjs2 类型

### 与 commonjs 的区别

```javascript
// commonjs: 导出到 exports
exports.xxx = require('xxx');

// commonjs2: 导出到 module.exports
module.exports = require('xxx');

// 主要区别在于导出行为，Webpack 生成的代码通常相同
```

### 适用场景

```javascript
// 开发 Node.js 库时使用
module.exports = {
  target: 'node',
  externals: {
    fs: 'commonjs2 fs',
    path: 'commonjs2 path',
  },
};
```

## amd 类型

### AMD 模块定义

```javascript
// 配置
externals: {
  jquery: 'amd jQuery',
}
```

### 生成代码

```javascript
// 完整 AMD 外部模块
define(['jQuery'], function(__WEBPACK_EXTERNAL_MODULE_jquery__) {
  return __WEBPACK_EXTERNAL_MODULE_jquery__;
});
```

### 实现

```typescript
class ExternalModule extends Module {
  getSourceForAmd(): string {
    const request = this.request;
    const id = Array.isArray(request) ? request[0] : request;
    
    return `
      define([${JSON.stringify(id)}], function(__WEBPACK_EXTERNAL_MODULE__) {
        return __WEBPACK_EXTERNAL_MODULE__;
      });
    `;
  }
  
  // 作为 AMD 依赖
  getAmdExternalDependencies(): string[] {
    const request = this.request;
    return [Array.isArray(request) ? request[0] : request];
  }
}
```

## umd 类型

### 通用模块定义

```javascript
// 配置
module.exports = {
  output: {
    library: {
      type: 'umd',
      name: 'MyLibrary',
    },
  },
  externals: {
    react: {
      root: 'React',           // 浏览器全局变量
      commonjs: 'react',       // CommonJS
      commonjs2: 'react',      // CommonJS2
      amd: 'react',            // AMD
    },
  },
};
```

### 生成代码

```javascript
(function webpackUniversalModuleDefinition(root, factory) {
  if (typeof exports === 'object' && typeof module === 'object')
    // CommonJS
    module.exports = factory(require("react"));
  else if (typeof define === 'function' && define.amd)
    // AMD
    define(["react"], factory);
  else if (typeof exports === 'object')
    // CommonJS (exports)
    exports["MyLibrary"] = factory(require("react"));
  else
    // Browser global
    root["MyLibrary"] = factory(root["React"]);
})(this, function(__WEBPACK_EXTERNAL_MODULE_react__) {
  // ... bundle code
});
```

### 实现

```typescript
class ExternalModule extends Module {
  getSourceForUmd(): string {
    const request = this.request;
    
    if (typeof request === 'object' && !Array.isArray(request)) {
      // 多环境配置
      return this.getSourceForUmdObject(request);
    }
    
    // 简单配置，所有环境使用相同值
    return this.getSourceForVar();
  }
  
  getSourceForUmdObject(config: Record<string, string>): string {
    // 根据当前构建目标选择
    const request = config[this.externalType] || config.root || config.var;
    return `module.exports = ${request};`;
  }
}
```

## module 类型

### ES Module 导入

```javascript
// 配置
module.exports = {
  experiments: {
    outputModule: true,
  },
  externalsType: 'module',
  externals: {
    react: 'react',
  },
};
```

### 生成代码

```javascript
// 外部模块
import * as __WEBPACK_EXTERNAL_MODULE_react__ from "react";
export default __WEBPACK_EXTERNAL_MODULE_react__;
export * from "react";
```

### 实现

```typescript
class ExternalModule extends Module {
  getSourceForModule(): string {
    const request = Array.isArray(this.request) 
      ? this.request[0] 
      : this.request;
    
    const id = JSON.stringify(request);
    
    return `
import * as __WEBPACK_EXTERNAL_MODULE__ from ${id};
export default __WEBPACK_EXTERNAL_MODULE__;
export * from ${id};
    `.trim();
  }
  
  getRuntimeRequirements(): Set<string> {
    // module 类型不需要 __webpack_require__
    return new Set();
  }
}
```

## import 类型

### 动态导入

```javascript
// 配置
externals: {
  lodash: 'import lodash',
}
```

### 生成代码

```javascript
// 外部模块
module.exports = import("lodash");
```

### 实现

```typescript
class ExternalModule extends Module {
  getSourceForImport(): string {
    const request = Array.isArray(this.request) 
      ? this.request[0] 
      : this.request;
    
    return `module.exports = import(${JSON.stringify(request)});`;
  }
  
  getRuntimeRequirements(): Set<string> {
    return new Set([RuntimeGlobals.module]);
  }
}
```

## 类型选择指南

### 按环境选择

```javascript
// 浏览器应用
externalsType: 'var',

// Node.js 应用
externalsType: 'commonjs2',

// 通用库
externals: {
  react: {
    root: 'React',
    commonjs: 'react',
    commonjs2: 'react',
    amd: 'react',
  },
},

// ES Module 应用
externalsType: 'module',
```

### 按输出格式选择

```javascript
// 输出 IIFE
output: {
  library: { type: 'var' },
},
externalsType: 'var',

// 输出 UMD
output: {
  library: { type: 'umd' },
},
// externals 需要多环境配置

// 输出 ES Module
output: {
  library: { type: 'module' },
},
externalsType: 'module',
```

## 总结

外部化类型的核心要点：

**var/global**：
- 全局变量访问
- 浏览器环境
- 最简单直接

**commonjs/commonjs2**：
- require 调用
- Node.js 环境
- 服务端渲染

**amd**：
- AMD 模块定义
- 异步加载
- 较少使用

**umd**：
- 通用模块
- 多环境兼容
- 库开发首选

**module/import**：
- ES Module
- 现代浏览器
- Tree Shaking

**下一章**：我们将学习函数形式的 externals 配置。
