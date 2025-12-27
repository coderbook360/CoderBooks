# Webpack 架构设计概览

> Webpack 是一个现代 JavaScript 应用的静态模块打包器——它将你的代码和依赖打包成优化的静态资源。

## 什么是 Webpack？

Webpack 的核心功能是：**从入口文件开始，分析依赖关系，将所有模块打包成一个或多个 bundle**。

```
   入口文件                          输出文件
     │                                 │
     ▼                                 ▼
┌─────────┐                      ┌─────────┐
│ index.js │                     │ main.js │
└─────────┘                      └─────────┘
     │                                 ▲
     ├── import App                    │
     ├── import React                  │
     ├── import './styles.css'         │
     └── import './utils.js'    ──────►│
           │                           │
           └── import lodash    ──────►│
```

## Webpack 的核心概念

### 1. Entry（入口）

指定打包的起点：

```javascript
// webpack.config.js
module.exports = {
  // 单入口
  entry: './src/index.js',
  
  // 多入口
  entry: {
    main: './src/index.js',
    admin: './src/admin.js'
  },
  
  // 动态入口
  entry: () => fetchEntryPoints()
};
```

### 2. Output（输出）

指定打包结果的位置和命名：

```javascript
const path = require('path');

module.exports = {
  output: {
    // 输出目录（绝对路径）
    path: path.resolve(__dirname, 'dist'),
    
    // 输出文件名
    filename: '[name].[contenthash].js',
    
    // chunk 文件名
    chunkFilename: '[name].[contenthash].chunk.js',
    
    // 公共路径（CDN 地址）
    publicPath: 'https://cdn.example.com/assets/',
    
    // 清理输出目录
    clean: true
  }
};
```

### 3. Loader（加载器）

Webpack 原生只能处理 JavaScript 和 JSON。Loader 让它能处理其他类型的文件：

```javascript
module.exports = {
  module: {
    rules: [
      // 处理 TypeScript
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/
      },
      
      // 处理 CSS
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']  // 从右向左执行
      },
      
      // 处理图片
      {
        test: /\.(png|jpg|gif|svg)$/,
        type: 'asset/resource'
      },
      
      // 处理 Babel
      {
        test: /\.jsx?$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-react']
          }
        }
      }
    ]
  }
};
```

### 4. Plugin（插件）

扩展 Webpack 的功能：

```javascript
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');

module.exports = {
  plugins: [
    // 生成 HTML 文件
    new HtmlWebpackPlugin({
      template: './src/index.html',
      minify: true
    }),
    
    // 提取 CSS 到单独文件
    new MiniCssExtractPlugin({
      filename: '[name].[contenthash].css'
    }),
    
    // 分析 bundle 大小
    new BundleAnalyzerPlugin()
  ]
};
```

### 5. Mode（模式）

预设不同环境的配置：

```javascript
module.exports = {
  mode: 'development',  // 或 'production' 或 'none'
};

// development 模式：
// - 不压缩代码
// - 包含详细的错误信息
// - 启用开发工具（source map）

// production 模式：
// - 代码压缩和混淆
// - Tree shaking
// - 作用域提升（Scope Hoisting）
```

## Webpack 构建流程

Webpack 的构建过程分为三个阶段：

```
┌─────────────────────────────────────────────────────────┐
│                     1. 初始化阶段                        │
├─────────────────────────────────────────────────────────┤
│  - 合并配置（webpack.config.js + 命令行参数）            │
│  - 创建 Compiler 对象                                    │
│  - 初始化插件，调用 plugin.apply()                       │
└──────────────────────────┬──────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                     2. 编译阶段                          │
├─────────────────────────────────────────────────────────┤
│  - 从 Entry 开始，递归分析依赖                            │
│  - 对每个模块调用对应的 Loader                           │
│  - 生成 AST，分析模块依赖关系                            │
│  - 生成依赖图（Dependency Graph）                        │
└──────────────────────────┬──────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                     3. 输出阶段                          │
├─────────────────────────────────────────────────────────┤
│  - 根据依赖图生成 Chunk                                  │
│  - 将 Chunk 转换成最终的 bundle 文件                     │
│  - 写入文件系统                                          │
└─────────────────────────────────────────────────────────┘
```

## 核心对象

### Compiler

Compiler 是 Webpack 的核心对象，代表整个编译过程：

```javascript
const webpack = require('webpack');
const config = require('./webpack.config.js');

const compiler = webpack(config);

// Compiler 提供的钩子
compiler.hooks.run.tap('MyPlugin', () => {
  console.log('开始编译');
});

compiler.hooks.done.tap('MyPlugin', (stats) => {
  console.log('编译完成');
});

// 运行编译
compiler.run((err, stats) => {
  if (err) {
    console.error(err);
  } else {
    console.log(stats.toString());
  }
});
```

### Compilation

Compilation 代表一次具体的编译过程：

```javascript
compiler.hooks.compilation.tap('MyPlugin', (compilation) => {
  // 编译开始，可以访问模块和依赖
  
  compilation.hooks.buildModule.tap('MyPlugin', (module) => {
    console.log('正在构建模块:', module.identifier());
  });
  
  compilation.hooks.succeedModule.tap('MyPlugin', (module) => {
    console.log('模块构建成功:', module.identifier());
  });
});
```

### Module

表示一个模块（源文件）：

```javascript
// 模块的主要属性
{
  // 模块标识符
  identifier: '/path/to/src/index.js',
  
  // 模块类型
  type: 'javascript/auto',
  
  // 使用的 Loader
  loaders: ['babel-loader'],
  
  // 依赖的其他模块
  dependencies: [
    { module: './utils.js' },
    { module: 'lodash' }
  ]
}
```

### Chunk

Chunk 是代码分割的单位，由一个或多个 Module 组成：

```javascript
// Entry Chunk: 入口文件及其依赖
// Async Chunk: 动态 import() 的模块
// Runtime Chunk: Webpack 运行时代码

module.exports = {
  optimization: {
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        // 将 node_modules 的代码分离到 vendors chunk
        vendors: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all'
        }
      }
    },
    // 分离运行时代码
    runtimeChunk: 'single'
  }
};
```

## Tapable 插件架构

Webpack 使用 Tapable 库实现插件系统：

```javascript
const { SyncHook, AsyncSeriesHook } = require('tapable');

class Compiler {
  constructor() {
    // 定义各种钩子
    this.hooks = {
      // 同步钩子
      run: new SyncHook(['compiler']),
      
      // 异步钩子
      emit: new AsyncSeriesHook(['compilation']),
      
      // 带返回值的钩子
      compilation: new SyncHook(['compilation', 'params'])
    };
  }
  
  run() {
    // 触发钩子
    this.hooks.run.call(this);
    // ...
  }
}

// 插件注册钩子
class MyPlugin {
  apply(compiler) {
    // 同步方式
    compiler.hooks.run.tap('MyPlugin', (compiler) => {
      console.log('编译开始');
    });
    
    // 异步方式
    compiler.hooks.emit.tapAsync('MyPlugin', (compilation, callback) => {
      setTimeout(() => {
        console.log('异步操作完成');
        callback();
      }, 1000);
    });
    
    // Promise 方式
    compiler.hooks.emit.tapPromise('MyPlugin', async (compilation) => {
      await someAsyncOperation();
      console.log('Promise 完成');
    });
  }
}
```

## 依赖图（Dependency Graph）

Webpack 通过分析 import/require 语句构建依赖图：

```
                    index.js
                       │
          ┌────────────┼────────────┐
          ▼            ▼            ▼
       App.js      utils.js    styles.css
          │            │            │
     ┌────┴────┐       │            │
     ▼         ▼       ▼            ▼
 Header.js  Footer.js lodash   global.css
```

```javascript
// 简化的依赖图结构
const dependencyGraph = {
  './src/index.js': {
    dependencies: ['./App.js', './utils.js', './styles.css'],
    code: '...'
  },
  './src/App.js': {
    dependencies: ['./Header.js', './Footer.js'],
    code: '...'
  },
  // ...
};
```

## 常见优化配置

```javascript
module.exports = {
  mode: 'production',
  
  optimization: {
    // 最小化代码
    minimize: true,
    
    // 代码分割
    splitChunks: {
      chunks: 'all',
      minSize: 20000,
      maxSize: 244000,
      cacheGroups: {
        defaultVendors: {
          test: /[\\/]node_modules[\\/]/,
          priority: -10,
          reuseExistingChunk: true
        }
      }
    },
    
    // 模块ID优化
    moduleIds: 'deterministic',
    
    // 运行时代码分离
    runtimeChunk: 'single',
    
    // Tree Shaking
    usedExports: true,
    sideEffects: true
  },
  
  // 外部依赖
  externals: {
    react: 'React',
    'react-dom': 'ReactDOM'
  },
  
  // 缓存
  cache: {
    type: 'filesystem'
  }
};
```

## 总结

Webpack 架构的核心要点：

1. **核心概念**：Entry、Output、Loader、Plugin、Mode
2. **构建流程**：初始化 → 编译 → 输出
3. **核心对象**：Compiler、Compilation、Module、Chunk
4. **插件系统**：基于 Tapable 的事件钩子机制
5. **依赖图**：通过分析 import 语句构建模块依赖关系

理解 Webpack 的架构有助于我们编写更高效的配置，甚至开发自己的 Loader 和 Plugin。
