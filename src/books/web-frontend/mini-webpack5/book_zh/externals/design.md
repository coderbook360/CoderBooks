---
sidebar_position: 88
title: "Externals 设计理念与使用场景"
---

# Externals 设计理念与使用场景

Externals 允许将某些依赖排除在打包之外，从外部环境获取，是优化打包体积和复用公共资源的关键机制。

## 什么是 Externals

### 核心概念

```javascript
// 不使用 externals
// React 会被打包进 bundle
import React from 'react';

// 使用 externals
// webpack.config.js
module.exports = {
  externals: {
    react: 'React',  // 从全局变量 React 获取
  },
};

// 打包后的代码
// React 不在 bundle 中，而是从 window.React 获取
const React = window.React;
```

### 工作原理

```
源代码: import React from 'react'
    ↓
Webpack 识别 externals 配置
    ↓
不打包 react 模块
    ↓
生成外部模块引用代码
    ↓
运行时从外部获取 React
```

## 使用场景

### 场景一：CDN 引入

```html
<!-- HTML -->
<script src="https://cdn.example.com/react.min.js"></script>
<script src="https://cdn.example.com/react-dom.min.js"></script>
<script src="/bundle.js"></script>
```

```javascript
// webpack.config.js
module.exports = {
  externals: {
    react: 'React',
    'react-dom': 'ReactDOM',
  },
};
```

**优势**：
- 利用 CDN 缓存
- 多应用共享依赖
- 减小 bundle 体积

### 场景二：库开发

```javascript
// 开发一个 React 组件库
module.exports = {
  externals: {
    react: {
      commonjs: 'react',
      commonjs2: 'react',
      amd: 'react',
      root: 'React',
    },
    'react-dom': {
      commonjs: 'react-dom',
      commonjs2: 'react-dom',
      amd: 'react-dom',
      root: 'ReactDOM',
    },
  },
};
```

**优势**：
- 避免依赖重复打包
- 让使用者自行提供依赖
- 减小库体积

### 场景三：Node.js 应用

```javascript
// 排除 Node.js 内置模块
module.exports = {
  target: 'node',
  externals: [
    // 排除 node_modules
    nodeExternals(),
    // 排除内置模块
    'fs',
    'path',
    'http',
  ],
};
```

### 场景四：微前端

```javascript
// 共享依赖
module.exports = {
  externals: {
    // 从主应用获取
    vue: 'Vue',
    vuex: 'Vuex',
    'vue-router': 'VueRouter',
  },
};
```

## 配置形式

### 字符串形式

```javascript
// 最简单的形式
externals: {
  jquery: 'jQuery',
}

// import $ from 'jquery'
// => var $ = window.jQuery;
```

### 对象形式

```javascript
// 指定不同环境的访问方式
externals: {
  lodash: {
    commonjs: 'lodash',        // require('lodash')
    commonjs2: 'lodash',       // module.exports = require('lodash')
    amd: 'lodash',             // define(['lodash'], ...)
    root: '_',                 // window._
  },
}
```

### 数组形式

```javascript
// 多个配置组合
externals: [
  // 字符串
  'fs',
  // 对象
  { path: 'path' },
  // 函数
  function({ request }, callback) {
    if (/^my-lib/.test(request)) {
      return callback(null, 'commonjs ' + request);
    }
    callback();
  },
  // 正则
  /^(jquery|\$)$/i,
]
```

### 函数形式

```javascript
externals: [
  function({ context, request }, callback) {
    // 动态决定是否外部化
    if (/^@company\//.test(request)) {
      // 公司内部包使用 commonjs
      return callback(null, 'commonjs ' + request);
    }
    
    if (request === 'react') {
      // React 使用全局变量
      return callback(null, 'React');
    }
    
    // 继续打包
    callback();
  },
]
```

### 正则形式

```javascript
externals: [
  // 匹配所有 lodash 子模块
  /^lodash\/.*/,
  
  // 匹配特定模式
  /^@babel\/runtime/,
]
```

## 外部化类型

### 类型概览

```javascript
externals: {
  // 全局变量（默认）
  jquery: 'jQuery',
  
  // CommonJS
  lodash: 'commonjs lodash',
  
  // AMD
  angular: 'amd angular',
  
  // 模块系统
  react: 'module react',
}
```

### 类型对比

| 类型 | 运行时代码 | 适用场景 |
|------|-----------|---------|
| var | `window.xxx` | 浏览器全局变量 |
| commonjs | `require('xxx')` | Node.js/CommonJS |
| commonjs2 | `module.exports = require('xxx')` | Node.js 导出 |
| amd | `define(['xxx'], ...)` | AMD 模块 |
| umd | 自动检测 | 通用模块 |
| module | `import` | ES Module |

## 实际应用模式

### 模式一：完全外部化

```javascript
// 将所有依赖外部化
const nodeExternals = require('webpack-node-externals');

module.exports = {
  target: 'node',
  externals: [nodeExternals()],
};
```

### 模式二：选择性外部化

```javascript
// 只外部化大型依赖
externals: {
  react: 'React',
  'react-dom': 'ReactDOM',
  moment: 'moment',
},
```

### 模式三：条件外部化

```javascript
externals: [
  function({ request }, callback) {
    // 生产环境外部化
    if (process.env.NODE_ENV === 'production') {
      if (request === 'react') {
        return callback(null, 'React');
      }
    }
    callback();
  },
],
```

## 与其他特性的关系

### 与 splitChunks 对比

```javascript
// splitChunks: 分割但仍打包
optimization: {
  splitChunks: {
    cacheGroups: {
      vendor: {
        test: /[\\/]node_modules[\\/]/,
        name: 'vendors',
      },
    },
  },
},

// externals: 完全不打包
externals: {
  react: 'React',
},
```

### 与 resolve.alias 对比

```javascript
// alias: 重定向请求
resolve: {
  alias: {
    react: path.resolve('./node_modules/react'),
  },
},

// externals: 排除请求
externals: {
  react: 'React',
},
```

## 注意事项

### 版本一致性

```html
<!-- 确保 CDN 版本与 package.json 一致 -->
<script src="https://cdn.example.com/react@18.2.0/umd/react.production.min.js">
</script>
```

### 加载顺序

```html
<!-- 依赖必须先加载 -->
<script src="react.js"></script>
<script src="react-dom.js"></script>  <!-- 依赖 react -->
<script src="bundle.js"></script>      <!-- 依赖 react 和 react-dom -->
```

### Tree Shaking

```javascript
// externals 的模块无法 tree shake
// 整个库都会被加载

// 考虑使用按需加载的 CDN
<script src="https://cdn.example.com/lodash.get.min.js"></script>
```

## 总结

Externals 设计的核心要点：

**设计目的**：
- 排除依赖不打包
- 从外部环境获取
- 减小 bundle 体积

**使用场景**：
- CDN 引入公共库
- 库开发避免重复
- Node.js 排除内置模块

**配置形式**：
- 字符串/对象/数组/函数/正则
- 灵活匹配规则
- 多环境支持

**注意事项**：
- 版本一致性
- 加载顺序
- 无法 Tree Shake

**下一章**：我们将学习 ExternalsPlugin 实现。
