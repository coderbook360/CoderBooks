# Webpack 概览与核心概念

在开始实现 Mini-Webpack 之前，我们需要先回答一个根本性的问题：**Webpack 到底在做什么？**

这个问题看似简单，但如果你只能回答"打包 JavaScript"，那说明我们对它的理解还停留在表面。让我们从更深的层次来剖析。

## 从一个问题开始

假设你有这样一个项目：

```
src/
├── index.js          # 入口文件
├── utils/
│   ├── math.js       # 数学工具函数
│   └── string.js     # 字符串处理函数
├── components/
│   ├── Button.js     # 按钮组件
│   └── Modal.js      # 弹窗组件
└── styles/
    └── main.css      # 样式文件
```

浏览器能直接运行这些文件吗？

答案是：**取决于情况**。现代浏览器支持 ES Modules，理论上可以直接加载 `.js` 文件。但现实中，你会遇到这些问题：

1. **网络请求过多**：每个模块都是一个 HTTP 请求，模块依赖越多，请求越多
2. **语法兼容性**：并非所有浏览器都支持最新的 ES 语法
3. **非 JS 资源**：CSS、图片、JSON 等资源无法直接被 JS 模块引用
4. **环境差异**：Node.js 模块（CJS）无法在浏览器中运行

这些问题的本质是什么？是**模块化带来的复杂性**与**浏览器运行时限制**之间的矛盾。

Webpack 的核心使命，就是**弥合开发体验与运行时环境之间的鸿沟**。

## Webpack 的核心定位

Webpack 本质上是一个**静态模块打包器**（Static Module Bundler）。

让我们拆解这个定义：

- **静态**：在构建时（编译期）完成所有工作，而非运行时
- **模块**：一切皆模块——JS、CSS、图片、字体都可以是模块
- **打包**：将多个模块合并为少数几个 bundle

但这只是 Webpack 功能的冰山一角。更准确地说，Webpack 是一个**可编程的资源处理管道**：

```
源代码 → [解析] → [转换] → [优化] → [输出] → 产物
```

每个阶段都可以通过 Loader 和 Plugin 进行扩展，这就是 Webpack 强大且灵活的原因。

## 核心概念全景图

在深入源码之前，我们需要建立对 Webpack 核心概念的全局认知。以下是你必须掌握的 7 个核心概念：

### Entry：入口

入口告诉 Webpack 从哪个模块开始构建依赖图。

```javascript
// webpack.config.js
module.exports = {
  entry: './src/index.js'
};
```

为什么需要入口？因为 Webpack 需要一个起点来分析模块依赖。它会从入口开始，递归解析所有被引用的模块，构建出完整的**依赖图**（Dependency Graph）。

入口可以是单个文件，也可以是多个：

```javascript
module.exports = {
  entry: {
    main: './src/index.js',
    admin: './src/admin.js'
  }
};
```

多入口场景适用于多页面应用（MPA），每个入口会生成独立的 bundle。

### Output：输出

输出配置告诉 Webpack 如何以及在哪里生成打包后的文件。

```javascript
const path = require('path');

module.exports = {
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].[contenthash].js'
  }
};
```

这里有两个关键配置：
- `path`：输出目录的绝对路径
- `filename`：输出文件名模板，支持占位符

`[name]` 是 chunk 名称，`[contenthash]` 是基于内容的哈希值，用于缓存优化。

### Loader：加载器

这是第一个需要深入理解的概念。

**Webpack 原生只理解 JavaScript 和 JSON。** 那 CSS、图片、TypeScript 怎么处理？

答案是 Loader。Loader 是**模块转换器**，它将非 JS 资源转换为有效的模块，让 Webpack 能够处理它们。

```javascript
module.exports = {
  module: {
    rules: [
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      }
    ]
  }
};
```

Loader 的执行有一个重要特性：**从右到左、从下到上**。上面的配置中，`css-loader` 先执行，将 CSS 转换为 JS 模块；然后 `style-loader` 执行，将样式注入到 DOM 中。

思考一下：为什么要设计成从右到左？

这是函数组合（Function Composition）的经典模式。`use: [a, b, c]` 等价于 `a(b(c(source)))`，这与 Unix 管道、Redux 中间件的设计思想一脉相承。

### Plugin：插件

如果说 Loader 是"转换器"，那 Plugin 就是"增强器"。

Plugin 可以介入 Webpack 构建流程的任何阶段，执行范围广泛的任务：从打包优化、资源管理到环境变量注入。

```javascript
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  plugins: [
    new HtmlWebpackPlugin({
      template: './src/index.html'
    })
  ]
};
```

Plugin 和 Loader 的本质区别是什么？

- **Loader**：模块级别的转换，处理单个文件
- **Plugin**：构建级别的扩展，访问整个编译过程

Plugin 通过 Webpack 的**事件系统**（Tapable）挂载到构建流程中。我们将在后续章节深入实现 Tapable。

### Module：模块

在 Webpack 的世界里，**一切皆模块**。

```javascript
// JavaScript 模块
import { add } from './math.js';

// CSS 模块（通过 css-loader）
import './styles.css';

// 图片模块（通过 asset modules 或 file-loader）
import logo from './logo.png';

// JSON 模块（原生支持）
import config from './config.json';
```

每个模块都会被 Webpack 解析、转换，最终被分配到某个 Chunk 中。

模块的类型远不止这些。Webpack 内部有多种模块类型：

- `NormalModule`：普通模块，最常见的类型
- `ContextModule`：上下文模块，如 `require.context()`
- `ExternalModule`：外部模块，通过 externals 配置
- `RuntimeModule`：运行时模块，Webpack 注入的运行时代码

### Chunk：代码块

Chunk 是 Webpack 打包过程中的中间产物。

**Module 是输入，Chunk 是中间态，Bundle 是输出。**

一个 Chunk 可以包含多个 Module，一个 Module 也可以存在于多个 Chunk 中（共享模块）。

Chunk 的生成有三种方式：

1. **入口 Chunk**：每个 entry 生成一个 Chunk
2. **异步 Chunk**：动态导入 `import()` 生成的 Chunk
3. **分割 Chunk**：通过 `SplitChunksPlugin` 分割出的公共 Chunk

```javascript
// 入口 Chunk
import { init } from './app.js';

// 异步 Chunk
const Modal = await import('./Modal.js');
```

### Dependency Graph：依赖图

这是理解 Webpack 工作原理的关键。

Webpack 从入口开始，递归分析每个模块的 `import` 和 `require` 语句，构建出一张**有向图**。图中的节点是模块，边是依赖关系。

```
index.js
├── math.js
│   └── constants.js
├── Button.js
│   └── styles.css
└── utils.js
    └── lodash (external)
```

这张图包含了所有需要打包的模块及其依赖关系。Webpack 基于这张图进行代码分割、Tree Shaking、哈希计算等操作。

## 构建流程概览

理解了核心概念后，让我们看看 Webpack 的完整构建流程：

```
┌─────────────────────────────────────────────────────────────┐
│                    Webpack 构建流程                          │
├─────────────────────────────────────────────────────────────┤
│  1. 初始化阶段                                               │
│     ├── 读取配置文件                                         │
│     ├── 合并默认配置                                         │
│     └── 创建 Compiler 实例                                   │
├─────────────────────────────────────────────────────────────┤
│  2. 编译阶段                                                 │
│     ├── 创建 Compilation 实例                                │
│     ├── 从入口开始递归解析模块                                │
│     ├── 调用 Loader 转换模块                                 │
│     └── 构建模块依赖图                                       │
├─────────────────────────────────────────────────────────────┤
│  3. 生成阶段                                                 │
│     ├── 根据依赖图生成 Chunk                                 │
│     ├── 执行优化（Tree Shaking、代码分割等）                  │
│     └── 为每个 Chunk 生成代码                                │
├─────────────────────────────────────────────────────────────┤
│  4. 输出阶段                                                 │
│     ├── 生成最终的 Bundle 文件                               │
│     ├── 写入文件系统                                         │
│     └── 输出统计信息                                         │
└─────────────────────────────────────────────────────────────┘
```

每个阶段都通过 Tapable 钩子暴露出来，这也是 Plugin 能够介入构建流程的原因。

## Compiler 与 Compilation

这两个类是 Webpack 的核心，理解它们是理解 Webpack 架构的关键。

**Compiler**：代表整个 Webpack 环境
- 全局唯一，在 Webpack 启动时创建
- 包含完整的配置信息
- 控制整个构建流程的生命周期
- 在 watch 模式下持续存在

**Compilation**：代表一次编译过程
- 每次构建（包括 watch 模式的重新编译）创建新实例
- 包含当前编译的模块、Chunk、资源等
- 提供模块构建和代码生成的方法
- 构建完成后可能被销毁

用一个比喻来理解：

- **Compiler** 是工厂，负责整体调度
- **Compilation** 是生产线，负责具体生产

```javascript
// Compiler 示例
const webpack = require('webpack');
const compiler = webpack(config);

// Compilation 在 compiler.run() 时创建
compiler.run((err, stats) => {
  // stats 包含本次 compilation 的统计信息
});
```

## 为什么要手写 Webpack？

学习源码最好的方式是**动手实现**。通过实现 Mini-Webpack，你将获得：

1. **深入理解构建原理**：不再是配置工程师，而是真正理解每个配置背后的实现
2. **掌握大型项目架构**：学习 Webpack 如何组织几十万行代码
3. **提升调试能力**：遇到问题时能快速定位到源码层面
4. **扩展能力飞跃**：编写高质量的 Loader 和 Plugin 不再困难

在接下来的章节中，我们将从模块化的历史开始，逐步构建起完整的 Mini-Webpack。

## 本章小结

- Webpack 是一个**静态模块打包器**，本质上是一个可编程的资源处理管道
- 7 个核心概念：Entry、Output、Loader、Plugin、Module、Chunk、Dependency Graph
- 构建流程分为：初始化 → 编译 → 生成 → 输出 四个阶段
- **Compiler** 是全局调度器，**Compilation** 是单次编译的执行者
- 理解 Webpack 的关键是理解**模块依赖图**的构建过程

下一章，我们将回顾 JavaScript 模块化的发展历程，理解为什么模块化如此重要，以及 Webpack 是如何处理不同模块格式的。
