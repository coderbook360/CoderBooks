# Webpack 5 新特性概览

Webpack 5 于 2020 年 10 月发布，距离 Webpack 4 已有两年。这次大版本升级带来了许多重要变化，既有性能优化，也有架构调整。

本章将介绍 Webpack 5 的核心新特性，理解这些变化将帮助我们在实现 Mini-Webpack 时做出正确的设计决策。

## 持久化缓存（Persistent Caching）

这是 Webpack 5 最重要的性能优化之一。

### 问题背景

在 Webpack 4 中，每次构建都需要重新解析和编译所有模块。即使代码没有变化，构建时间也不会减少。虽然可以使用 `cache-loader` 或 `hard-source-webpack-plugin`，但这些是第三方方案，配置复杂且不够稳定。

### Webpack 5 的解决方案

Webpack 5 内置了持久化缓存，只需简单配置：

```javascript
module.exports = {
  cache: {
    type: 'filesystem',
    buildDependencies: {
      config: [__filename]
    }
  }
};
```

- `type: 'filesystem'`：将缓存存储到文件系统
- `buildDependencies`：声明构建依赖，当配置文件变化时自动失效缓存

**效果如何？**

首次构建后，后续构建时间可以减少 60-90%。这对于大型项目的开发体验是质的飞跃。

### 缓存失效策略

Webpack 5 的缓存失效非常智能：

- **文件内容变化**：基于内容哈希检测
- **配置变化**：`buildDependencies` 中声明的文件变化
- **依赖版本变化**：`package-lock.json` 或 `yarn.lock` 变化
- **Webpack 版本变化**：升级 Webpack 后自动失效

在我们实现 Mini-Webpack 时，会在附录中简化实现缓存机制。

## 模块联邦（Module Federation）

模块联邦是 Webpack 5 的革命性特性，它解决了**微前端架构中代码共享**的难题。

### 问题背景

传统微前端方案中，多个应用独立构建和部署。如果它们都使用 React，每个应用都会打包一份 React 代码，造成重复加载。

### 模块联邦的理念

模块联邦允许**运行时动态加载远程模块**，多个应用可以共享代码：

```javascript
// app1/webpack.config.js - 暴露模块
const { ModuleFederationPlugin } = require('webpack').container;

module.exports = {
  plugins: [
    new ModuleFederationPlugin({
      name: 'app1',
      filename: 'remoteEntry.js',
      exposes: {
        './Button': './src/components/Button'
      },
      shared: ['react', 'react-dom']
    })
  ]
};

// app2/webpack.config.js - 消费模块
module.exports = {
  plugins: [
    new ModuleFederationPlugin({
      name: 'app2',
      remotes: {
        app1: 'app1@http://localhost:3001/remoteEntry.js'
      },
      shared: ['react', 'react-dom']
    })
  ]
};
```

在 app2 中使用 app1 的组件：

```javascript
// app2/src/App.js
import React, { Suspense, lazy } from 'react';

const RemoteButton = lazy(() => import('app1/Button'));

function App() {
  return (
    <Suspense fallback="Loading...">
      <RemoteButton />
    </Suspense>
  );
}
```

**核心优势**：
- **运行时加载**：无需重新构建即可更新共享模块
- **版本协商**：智能处理共享模块的版本冲突
- **去中心化**：每个应用可以独立部署

模块联邦的实现涉及复杂的运行时加载和版本协商机制，我们将在附录中概述其原理。

## 资源模块（Asset Modules）

Webpack 5 内置了资源处理能力，不再需要 `file-loader`、`url-loader`、`raw-loader`。

### Webpack 4 的方式

```javascript
module.exports = {
  module: {
    rules: [
      {
        test: /\.(png|jpg|gif)$/,
        use: [
          {
            loader: 'url-loader',
            options: {
              limit: 8192,
              fallback: 'file-loader'
            }
          }
        ]
      }
    ]
  }
};
```

### Webpack 5 的方式

```javascript
module.exports = {
  module: {
    rules: [
      {
        test: /\.(png|jpg|gif)$/,
        type: 'asset',
        parser: {
          dataUrlCondition: {
            maxSize: 8 * 1024 // 8KB
          }
        }
      }
    ]
  }
};
```

四种资源模块类型：

| 类型 | 描述 | 等价于 |
|------|------|--------|
| `asset/resource` | 输出单独文件 | `file-loader` |
| `asset/inline` | 导出 Data URI | `url-loader` |
| `asset/source` | 导出源代码 | `raw-loader` |
| `asset` | 自动选择 | 带 limit 的 `url-loader` |

这简化了配置，也减少了依赖数量。

## 更好的 Tree Shaking

Webpack 5 对 Tree Shaking 进行了多项改进。

### 嵌套 Tree Shaking

Webpack 5 可以追踪嵌套模块的导出使用情况：

```javascript
// utils/index.js
export { add, subtract } from './math';
export { formatDate } from './date';

// app.js
import { add } from './utils';
console.log(add(1, 2));
```

在 Webpack 5 中，`subtract`、`formatDate` 以及 `./date.js` 模块会被完全删除。Webpack 4 只能删除 `./utils` 中未使用的导出，无法追踪到嵌套模块。

### 内部模块 Tree Shaking

Webpack 5 引入了 `optimization.innerGraph`，可以分析模块内部的依赖关系：

```javascript
// utils.js
import { unused } from './unused';

export function used() {
  return 'used';
}

export function notUsed() {
  return unused(); // 只有 notUsed 使用了 unused
}

// app.js
import { used } from './utils';
console.log(used());
```

Webpack 5 可以识别 `unused` 只被 `notUsed` 使用，而 `notUsed` 没有被使用，因此 `unused` 模块可以被删除。

### CommonJS Tree Shaking

Webpack 5 开始支持 CommonJS 模块的部分 Tree Shaking：

```javascript
// utils.js
exports.add = (a, b) => a + b;
exports.subtract = (a, b) => a - b;

// app.js
const { add } = require('./utils');
console.log(add(1, 2));
```

在某些情况下，`subtract` 可以被删除。但由于 CommonJS 的动态特性，支持程度有限。

## 更好的代码生成

### 真实的内容哈希

Webpack 4 的 `[contenthash]` 存在问题：模块 ID 的变化可能导致哈希变化，即使文件内容没变。

Webpack 5 使用真正基于内容的哈希，只有当模块内容实际变化时，哈希才会改变。

```javascript
module.exports = {
  output: {
    filename: '[name].[contenthash].js'
  },
  optimization: {
    realContentHash: true // Webpack 5 默认开启
  }
};
```

这对于长期缓存至关重要。

### 更小的运行时

Webpack 5 优化了运行时代码生成：

- 更小的 `__webpack_require__` 实现
- 按需生成运行时代码
- 支持 ES6 语法输出（减少转译开销）

```javascript
module.exports = {
  target: ['web', 'es2015'], // 输出 ES6 代码
  output: {
    environment: {
      arrowFunction: true,
      const: true,
      destructuring: true
    }
  }
};
```

## 移除的功能

Webpack 5 移除了一些过时或很少使用的功能：

### 移除 Node.js Polyfill

Webpack 4 会自动为 Node.js 核心模块（如 `crypto`、`path`、`fs`）注入浏览器端的 polyfill。

Webpack 5 不再自动注入，需要手动配置：

```javascript
module.exports = {
  resolve: {
    fallback: {
      path: require.resolve('path-browserify'),
      crypto: require.resolve('crypto-browserify'),
      stream: require.resolve('stream-browserify')
    }
  }
};
```

这个变化可能导致迁移问题，但使打包结果更可控。

### 移除 require.ensure

`require.ensure` 是 Webpack 特有的动态加载语法，现在应使用标准的 `import()`：

```javascript
// 旧语法（已移除）
require.ensure(['./module'], function(require) {
  const module = require('./module');
});

// 新语法
import('./module').then(module => {
  // ...
});
```

## 开发体验改进

### 更好的错误提示

Webpack 5 改进了错误和警告的显示：

```
ERROR in ./src/index.js 1:0-24

Module not found: Error: Can't resolve './not-exists' in '/project/src'

Did you mean 'not-exist.js'?

@ ./src/index.js 1:0-24
```

现在会提供建议和更清晰的堆栈信息。

### 更快的启动速度

Webpack 5 优化了初始化流程：
- 延迟加载不必要的模块
- 改进插件初始化顺序
- 减少不必要的配置验证

## 配置变化

### 自动推断 target

Webpack 5 可以根据 `browserslist` 配置自动推断 target：

```javascript
// package.json
{
  "browserslist": [
    "last 2 versions",
    "> 1%"
  ]
}

// webpack.config.js - 不需要配置 target
module.exports = {
  // target 将基于 browserslist 自动推断
};
```

### 新的 experiments 配置

Webpack 5 引入了 `experiments` 配置，用于启用实验性功能：

```javascript
module.exports = {
  experiments: {
    topLevelAwait: true,    // 顶层 await
    asyncWebAssembly: true, // 异步 WebAssembly
    outputModule: true      // 输出 ES Module
  }
};
```

这些功能在稳定后会移入正式配置。

## 对 Mini-Webpack 实现的影响

了解 Webpack 5 的新特性后，我们在实现 Mini-Webpack 时需要考虑：

1. **模块图设计**：需要支持更细粒度的 Tree Shaking
2. **运行时生成**：按需生成运行时代码
3. **资源处理**：内置 Asset Modules 支持
4. **缓存架构**：设计合理的缓存失效策略
5. **模块联邦**：虽然复杂，但了解其原理有助于理解现代构建工具

## 本章小结

Webpack 5 的主要新特性：

- **持久化缓存**：内置文件系统缓存，大幅提升构建速度
- **模块联邦**：支持运行时模块共享，适用于微前端
- **资源模块**：内置资源处理，替代 file-loader 等
- **Tree Shaking 增强**：嵌套模块、内部模块、CommonJS 支持
- **更好的代码生成**：真实内容哈希、更小的运行时
- **移除 Node.js Polyfill**：需要手动配置
- **开发体验提升**：更好的错误提示、更快的启动

下一章，我们将介绍 Tapable 事件系统——这是理解 Webpack 插件机制的基础。
