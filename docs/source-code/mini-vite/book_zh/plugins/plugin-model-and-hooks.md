# 9. 插件模型与钩子

如果说开发服务器是 Vite 的“骨架”，那么插件系统就是 Vite 的“神经与血肉”。它让 Vite 从一个单纯的工具，变成了一个充满无限可能性的、可扩展的**生态系统**。

你所熟知的 Vue 支持、React 支持、TypeScript 编译、CSS 预处理器集成……所有这些核心功能，在 Vite 中几乎都是通过插件来实现的。理解了插件，你就理解了 Vite 的力量源泉。

## 你的智能手机与 App Store

要理解 Vite 的插件系统，最好的比喻就是你的智能手机和它的 App Store。

-   **Vite 核心**：就像是手机的操作系统（iOS 或 Android）。它提供了最基础、最核心的能力，比如打电话、发短信、连接网络、文件管理等。它本身功能完备，但潜力有限。

-   **Vite 插件**：就像是 App Store 里的各种 App。每个 App 都为你的手机增加了一项新功能。`@vitejs/plugin-vue` 就像一个“Vue App”，让你的手机能“运行”`.vue` 文件；`@vitejs/plugin-react` 就像一个“React App”，提供了对 JSX 的支持。

-   **插件钩子 (Hooks)**：就像是操作系统提供给 App 开发者的 API。例如，操作系统提供了“在收到通知时执行一段代码”的 API（钩子），地图 App 用它来提醒你该出发了；操作系统提供了“访问相机”的 API（钩子），社交 App 用它来让你拍照分享。Vite 的钩子也是如此，它在自身工作流程的各个关键节点（如“开始解析配置时”、“准备转换一个文件时”、“服务器即将启动时”）开放出接口，让插件可以“挂载”自己的功能。

一个插件，就是通过在这些钩子上注册自己的逻辑，来扩展或改变 Vite 的默认行为的。

## 一个插件的“解剖学”

在 Vite 中，一个插件本质上只是一个普通的 JavaScript 对象。这个对象有一些约定的属性，其中最重要的两个是 `name` 和一系列的**钩子函数**。

```javascript
// 一个最简单的 Vite 插件示例
const myFirstPlugin = () => {
  return {
    // 插件名称，用于在日志和错误信息中识别插件
    // 名称格式约定：vite-plugin-xxx（社区插件）或 @scope/vite-plugin-xxx
    name: 'my-first-plugin',

    // 这是一个钩子，在 Vite 解析完配置后被调用
    // resolvedConfig 包含完整的 Vite 配置，包括用户配置和默认值的合并
    configResolved(resolvedConfig) {
      console.log('Vite 的最终配置是：', resolvedConfig);
    },

    // 这也是一个钩子，在每次有模块需要被转换时调用
    // code: 模块的原始内容
    // id: 模块的完整路径（包含查询参数，如 /path/to/file.vue?type=style）
    transform(code, id) {
      // id 是模块的路径
      if (id.endsWith('.txt')) {
        // 如果是一个 .txt 文件，我们把它转换成一个 JS 模块
        // 返回值可以是 string 或 { code, map } 对象
        return `export default \`${code}\`;`;
      }
      // 如果不是，我们返回 null，让其他插件处理
      // 返回 null 或 undefined 表示"跳过，交给下一个插件"
      return null;
    }
  };
};
```

这个简单的插件做了两件事：
1.  通过 `configResolved` 钩子，读取并打印出 Vite 的最终配置。
2.  通过 `transform` 钩子，实现了一个自定义功能：将所有 `.txt` 文件的内容转换成一个默认导出的 JavaScript 字符串。

## `apply` 选项：控制插件何时生效

Vite 插件有一个重要但经常被忽视的属性：**`apply`**。它决定了插件在开发模式还是构建模式下生效：

```javascript
const myPlugin = () => {
  return {
    name: 'my-plugin',
    
    // apply 选项有三种可能的值：
    // 1. 'serve' - 只在开发模式（vite dev）下生效
    // 2. 'build' - 只在构建模式（vite build）下生效
    // 3. 不设置（默认）- 两种模式都生效
    apply: 'serve',  // 这个插件只在开发时运行
    
    // 也可以是一个函数，根据配置动态决定
    // config: 用户配置
    // env: { mode, command, isSsrBuild, isPreview }
    apply(config, { command, mode }) {
      // 例如：只在非 SSR 的生产构建中启用
      return command === 'build' && !config.build?.ssr;
    },
    
    transform(code, id) {
      // ...
    }
  };
};
```

**何时使用 `apply`？**

```javascript
// 示例1：开发时的 Mock 数据插件
const mockPlugin = () => ({
  name: 'vite-plugin-mock',
  apply: 'serve',  // Mock 数据只在开发时需要
  configureServer(server) {
    server.middlewares.use('/api', mockMiddleware);
  }
});

// 示例2：构建时的代码压缩插件
const minifyPlugin = () => ({
  name: 'vite-plugin-minify',
  apply: 'build',  // 压缩只在构建时需要
  renderChunk(code) {
    return minify(code);
  }
});

// 示例3：根据环境动态决定
const conditionalPlugin = () => ({
  name: 'vite-plugin-conditional',
  apply(config, { mode }) {
    // 只在 production 模式下启用
    return mode === 'production';
  }
});
```

## `enforce` 选项：控制插件执行顺序

另一个重要属性是 **`enforce`**，它决定了插件在执行链中的位置：

```javascript
const myPlugin = () => {
  return {
    name: 'my-plugin',
    
    // enforce 选项决定执行顺序：
    // 1. 'pre' - 在 Vite 核心插件之前执行
    // 2. 不设置（默认）- 在 Vite 核心插件之后执行
    // 3. 'post' - 在构建插件之后执行
    enforce: 'pre',
    
    transform(code, id) {
      // 因为是 'pre'，这个 transform 会在其他插件之前执行
      // 适合做代码预处理
    }
  };
};
```

**执行顺序的完整链路：**

```
1. Alias 解析插件
2. 用户插件（enforce: 'pre'）    ← 最早执行
3. Vite 核心插件
4. 用户插件（无 enforce）        ← 默认位置
5. Vite 构建插件
6. 用户插件（enforce: 'post'）   ← 最后执行
```

## 钩子：在正确的时间做正确的事

Vite 提供了极其丰富的钩子，它们覆盖了从配置、启动、编译到构建的整个生命周期。这些钩子大致可以分为三类：

1.  **通用钩子 (Universal Hooks)**
    -   **描述**：无论是在开发模式 (`serve`) 还是构建模式 (`build`) 下都会执行。
    -   **代表**：`resolveId`, `load`, `transform`。这三个钩子是 Vite 插件体系的基石，它们共同模拟了 Rollup 的核心构建流程，负责定位、加载和转换每一个模块。

2.  **开发服务器钩子 (Serve-specific Hooks)**
    -   **描述**：只在运行 `vite` 命令启动开发服务器时执行。
    -   **代表**：`configureServer`。这个钩子允许你访问 Vite 开发服务器的实例，从而可以添加自定义的中间件，或者与 WebSocket 服务器交互。这为实现复杂的开发时功能（如 Mock 数据、自定义路由）提供了可能。

3.  **构建钩子 (Build-specific Hooks)**
    -   **描述**：只在运行 `vite build` 命令进行生产环境构建时执行。
    -   **代表**：`renderChunk`。这个钩子允许你在 Rollup 生成最终的产物文件（chunk）之前，对代码进行最后一次修改。例如，你可以用它来注入一些统计代码或者修改产物的格式。

4.  **HTML 转换钩子**
    -   **描述**：专门用于处理 HTML 文件的钩子，执行时机可以精确控制。
    -   **代表**：`transformIndexHtml`。

## `transformIndexHtml`：HTML 转换的时机控制

`transformIndexHtml` 是 Vite 独有的钩子，用于转换入口 HTML 文件。这个钩子有一个常被忽略但非常重要的特性：**执行顺序控制**。

```javascript
const htmlPlugin = () => ({
  name: 'vite-plugin-html',
  
  // 方式1：简单函数形式（默认在所有插件处理后执行）
  transformIndexHtml(html) {
    return html.replace(
      '</head>',
      '<meta name="generator" content="Vite" /></head>'
    );
  }
});

// 方式2：对象形式，精确控制执行顺序
const htmlPluginAdvanced = () => ({
  name: 'vite-plugin-html-advanced',
  
  transformIndexHtml: {
    // order 控制执行时机：
    // 'pre'  - 在其他 HTML 插件之前执行
    // 默认  - 正常顺序执行
    // 'post' - 在所有其他 HTML 插件之后执行
    order: 'pre',
    
    // handler 是实际的转换函数
    // 可以是同步或异步函数
    async handler(html, ctx) {
      // html: 原始 HTML 字符串
      // ctx: 上下文对象，包含有用信息
      const { path, filename, server, bundle, chunk } = ctx;
      
      // server 只在开发模式下存在
      // bundle 和 chunk 只在构建模式下存在
      
      // 返回值可以是：
      // 1. 字符串 - 新的 HTML 内容
      // 2. 对象 { html, tags } - HTML 内容加上要注入的标签
      return {
        html,
        tags: [
          {
            tag: 'script',
            attrs: { src: '/analytics.js' },
            injectTo: 'body'  // 'head' | 'body' | 'head-prepend' | 'body-prepend'
          },
          {
            tag: 'meta',
            attrs: { name: 'version', content: '1.0.0' },
            injectTo: 'head-prepend'  // 在 <head> 最开始插入
          }
        ]
      };
    }
  }
});
```

**执行时机的实际应用场景：**

```javascript
// 场景1：在任何处理之前注入环境变量占位符
const envPlugin = () => ({
  name: 'vite-plugin-env',
  transformIndexHtml: {
    order: 'pre',  // 确保最先执行
    handler(html) {
      // 在 HTML 被其他插件处理之前，注入占位符
      return html.replace(
        '</head>',
        '<script>window.__ENV__ = "__ENV_PLACEHOLDER__"</script></head>'
      );
    }
  }
});

// 场景2：在所有处理之后进行最终优化
const minifyHtmlPlugin = () => ({
  name: 'vite-plugin-minify-html',
  apply: 'build',
  transformIndexHtml: {
    order: 'post',  // 确保最后执行
    handler(html) {
      // 在所有其他插件完成后，进行 HTML 压缩
      return minifyHtml(html);
    }
  }
});
```

## 兼容 Rollup：站在巨人的肩膀上

Vite 的插件模型设计得非常巧妙，它**兼容了 Rollup 的插件接口**。

这意味着，一个为 Rollup 编写的插件，在绝大多数情况下，可以直接在 Vite 中使用。Vite 内部会将自己的钩子和 Rollup 的钩子进行映射和适配。

这种设计带来了巨大的好处：
-   **丰富的生态**：Vite 一诞生就继承了 Rollup 社区多年积累下来的庞大而成熟的插件生态。你需要的功能，很可能已经有人为你写好了 Rollup 插件。
-   **统一的体验**：无论是开发还是构建，你都可以使用同一套插件和逻辑，减少了心智负担。

当然，Vite 也扩展了一些 Rollup 没有的、专为开发服务器设计的钩子（如 `configureServer` 和 `handleHotUpdate`），以满足其在开发体验上的极致追求。

理解了 Vite 的插件模型和钩子，就等于拿到了打开 Vite 生态大门的钥匙。在下一章，我们将深入到插件系统的心脏——插件容器，看看 Vite 是如何管理和执行这些插件的。
