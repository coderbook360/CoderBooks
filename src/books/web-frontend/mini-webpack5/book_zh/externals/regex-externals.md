---
sidebar_position: 92
title: "正则表达式匹配外部模块"
---

# 正则表达式匹配外部模块

正则表达式提供了一种简洁的方式来批量匹配需要外部化的模块。

## 基础语法

### 简单匹配

```javascript
module.exports = {
  externals: [
    // 匹配所有以 lodash/ 开头的请求
    /^lodash\/.*/,
    
    // 匹配精确的模块名
    /^jquery$/,
  ],
};
```

### 匹配规则

```javascript
// 输入 import
import get from 'lodash/get';
import map from 'lodash/map';
import React from 'react';

// 正则配置
externals: [/^lodash\/.*/]

// 结果
// lodash/get - 匹配，外部化
// lodash/map - 匹配，外部化
// react - 不匹配，正常打包
```

## 常用模式

### 模块前缀匹配

```javascript
externals: [
  // @babel/runtime 所有子模块
  /^@babel\/runtime/,
  
  // @scope 下的所有包
  /^@mycompany\//,
  
  // core-js polyfills
  /^core-js/,
],
```

### 文件类型匹配

```javascript
externals: [
  // 排除所有 CSS 文件
  /\.css$/,
  
  // 排除所有图片资源
  /\.(png|jpe?g|gif|svg)$/,
],
```

### 复杂模式

```javascript
externals: [
  // lodash 主包或子模块
  /^lodash(\/.*)?$/,
  
  // rxjs 及其操作符
  /^rxjs(\/operators)?$/,
  
  // 任何以 node: 开头的模块（Node.js 前缀）
  /^node:/,
],
```

## 实现原理

### 正则匹配逻辑

```typescript
class ExternalModuleFactoryPlugin {
  resolveExternal(
    context: string,
    request: string,
    dependency: Dependency,
    externals: Externals,
    callback: Callback
  ): void {
    // 处理正则表达式
    if (externals instanceof RegExp) {
      if (externals.test(request)) {
        // 匹配成功，使用请求字符串作为外部值
        callback(null, request);
      } else {
        // 不匹配，继续正常处理
        callback();
      }
      return;
    }
    
    // ... 其他类型处理
  }
}
```

### 外部模块创建

```typescript
class ExternalModuleFactoryPlugin {
  handleRegExpMatch(request: string): ExternalModule {
    // 正则匹配使用请求本身作为外部值
    return new ExternalModule(
      request,
      this.type,  // 使用默认类型（如 'commonjs'）
      request
    );
  }
}
```

## 与类型结合

### 默认类型

```javascript
module.exports = {
  // 正则匹配使用此类型
  externalsType: 'commonjs',
  
  externals: [
    /^lodash\/.*/,  // => commonjs lodash/xxx
  ],
};
```

### 自定义类型

```javascript
// 正则不能直接指定类型，需要使用函数
externals: [
  function({ request }, callback) {
    if (/^lodash\/.*/.test(request)) {
      // 使用特定类型
      return callback(null, 'commonjs2 ' + request);
    }
    callback();
  },
],
```

### 混合配置

```javascript
externals: [
  // 精确匹配使用对象
  {
    react: 'React',
    'react-dom': 'ReactDOM',
  },
  
  // 模式匹配使用正则
  /^@babel\/runtime/,
  
  // 复杂逻辑使用函数
  function({ request }, callback) {
    if (/^lodash/.test(request)) {
      return callback(null, {
        commonjs: request,
        amd: request,
        root: '_',
      });
    }
    callback();
  },
],
```

## 实际应用

### 应用一：Node.js 开发

```javascript
const builtinModules = require('module').builtinModules;

// 创建匹配所有内置模块的正则
const builtinRegex = new RegExp(
  `^(${builtinModules.join('|')})(/.*)?$`
);

module.exports = {
  target: 'node',
  externalsType: 'commonjs2',
  externals: [
    builtinRegex,  // 匹配 fs, path, fs/promises 等
  ],
};
```

### 应用二：排除 polyfills

```javascript
module.exports = {
  externals: [
    // core-js polyfills
    /^core-js/,
    
    // regenerator-runtime
    /^regenerator-runtime/,
    
    // @babel/runtime helpers
    /^@babel\/runtime/,
  ],
};
```

### 应用三：Monorepo 包

```javascript
// 匹配组织内的所有包
const orgPackages = /^@myorg\/[a-z0-9-]+$/;

module.exports = {
  externals: [
    orgPackages,
  ],
};
```

### 应用四：peer dependencies

```javascript
// 读取 package.json
const pkg = require('./package.json');
const peerDeps = Object.keys(pkg.peerDependencies || {});

// 创建匹配正则
const peerDepsRegex = new RegExp(
  `^(${peerDeps.map(d => d.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})(/.*)?$`
);

module.exports = {
  externals: [peerDepsRegex],
};
```

## 正则技巧

### 转义特殊字符

```javascript
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// 包名可能包含特殊字符
const packageName = '@scope/my-package';
const regex = new RegExp(`^${escapeRegExp(packageName)}(/.*)?$`);
```

### 动态生成

```javascript
function createExternalsRegex(packages) {
  const escaped = packages.map(pkg => 
    pkg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  );
  return new RegExp(`^(${escaped.join('|')})(/.*)?$`);
}

const externalsRegex = createExternalsRegex([
  '@babel/runtime',
  'lodash',
  'moment',
]);
```

### 负向匹配

```javascript
// 使用函数实现负向逻辑
externals: [
  function({ request }, callback) {
    // 外部化所有 node_modules，除了特定包
    const excludePattern = /^(react|react-dom)$/;
    const includePattern = /^[a-z@]/;  // 非相对路径
    
    if (includePattern.test(request) && !excludePattern.test(request)) {
      return callback(null, 'commonjs ' + request);
    }
    
    callback();
  },
],
```

## 调试正则

### 测试匹配

```javascript
// 调试脚本
const testCases = [
  'lodash',
  'lodash/get',
  'lodash/fp/get',
  '@babel/runtime/helpers/asyncToGenerator',
  'react',
  'react-dom',
];

const regex = /^lodash(\/.*)?$/;

testCases.forEach(request => {
  console.log(`${request}: ${regex.test(request) ? 'matched' : 'not matched'}`);
});
```

### 可视化工具

```javascript
// 使用调试日志
externals: [
  function({ request }, callback) {
    const patterns = [
      { regex: /^lodash/, name: 'lodash' },
      { regex: /^@babel\/runtime/, name: 'babel-runtime' },
    ];
    
    for (const { regex, name } of patterns) {
      if (regex.test(request)) {
        console.log(`[externals] ${request} matched by ${name}`);
        return callback(null, 'commonjs ' + request);
      }
    }
    
    callback();
  },
],
```

## 性能考虑

### 正则优化

```javascript
// 避免复杂正则
// 不好
/^(lodash|moment|react|react-dom|vue|angular|...很多包...)/

// 更好：使用 Set
const externalPackages = new Set(['lodash', 'moment', 'react', '...']);

externals: [
  function({ request }, callback) {
    const packageName = request.split('/')[0];
    if (externalPackages.has(packageName)) {
      return callback(null, 'commonjs ' + request);
    }
    callback();
  },
],
```

### 缓存编译

```javascript
// 预编译正则
const lodashRegex = /^lodash\/.*/;
const babelRegex = /^@babel\/runtime/;

externals: [
  // 使用预编译的正则而非内联
  lodashRegex,
  babelRegex,
],
```

## 总结

正则表达式匹配的核心要点：

**基础用法**：
- 简洁的模式匹配
- 测试请求字符串
- 使用默认外部化类型

**常用模式**：
- 前缀匹配 `/^prefix/`
- 可选子路径 `(/.*)?$`
- 精确匹配 `/^name$/`

**与其他配置组合**：
- 对象用于精确映射
- 正则用于模式匹配
- 函数用于复杂逻辑

**最佳实践**：
- 转义特殊字符
- 预编译正则
- 适当调试验证

本章完成了 Externals 外部化系统部分的学习，接下来将进入 Chunk 代码块系统部分。
