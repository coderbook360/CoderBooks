# 第 30 章：SSR 清单与样式预加载

想象一下，你精心准备了一场盛大的晚宴（你的 SSR 应用）。你将主菜（HTML 内容）完美地呈现在餐桌上，但客人（用户）坐下后却发现，餐具（JavaScript）和酒水（CSS）还在从遥远的厨房里一件件地送过来。在等待的过程中，体验无疑是大打折扣的。这正是许多 SSR 应用面临的“首屏性能”窘境。

服务器虽然快速生成了 HTML，但浏览器为了让页面变得可交互和样式正确，还需要加载一系列的 JS 和 CSS 文件。如果这些资源的加载是串行的，或者浏览器在解析 HTML 时才后知后觉地发现需要它们，就会导致页面白屏、内容闪烁（FOUC）或交互延迟。

Vite 通过 **SSR 清单（SSR Manifest）** 和 **预加载指令（Preload Directives）** 这对组合拳，将“被动等待”变为了“主动预取”，极大地优化了首屏加载性能。

### 理论：SSR 清单——一份详尽的“备餐单”

SSR 清单是一个在构建（`vite build --ssr`）过程中生成的 JSON 文件（通常是 `dist/client/ssr-manifest.json`）。它就像一份详尽的“备餐单”，记录了客户端构建产物中每个源模块（source module）与它最终生成的代码块（chunk）、CSS 文件和静态资源之间的完整依赖关系。

一个简化的 SSR 清单条目可能长这样：

```json
{
  "src/entry-client.js": {
    "file": "assets/entry-client.8a9f5a5e.js",
    "src": "src/entry-client.js",
    "isEntry": true,
    "imports": ["_vendor.c13c5a33.js"],
    "css": ["assets/entry-client.7a6f4a3f.css"]
  },
  "src/components/MyComponent.vue": {
    "file": "assets/MyComponent.b2c3d4e5.js",
    "src": "src/components/MyComponent.vue",
    "imports": ["_vendor.c13c5a33.js"],
    "css": ["assets/MyComponent.6b8e2c1d.css"],
    "assets": ["assets/logo.a5d5e6f7.svg"]
  }
}
```

这份清单告诉我们：

-   `src/components/MyComponent.vue` 这个源文件，在构建后对应的 JS chunk 是 `assets/MyComponent.b2c3d4e5.js`。
-   它还依赖一个共享的 vendor chunk `_vendor.c13c5a33.js`。
-   渲染这个组件需要加载 `assets/MyComponent.6b8e2c1d.css` 这个 CSS 文件。
-   它还使用到了 `assets/logo.a5d5e6f7.svg` 这个静态资源。

**那么，这份清单有什么用呢？**

在服务器进行 SSR 时，Vite 会记录下当前渲染路径上用到了哪些模块（例如，渲染 `/home` 页面用到了 `HomePage.vue` 和 `MyComponent.vue`）。当 HTML 渲染完成后，Vite 会拿着这个“已使用模块列表”，去查询 SSR 清单。

通过查询，Vite 就能精确地知道，为了在客户端完美地“激活”（hydrate）这段 HTML，浏览器需要下载哪些 JS 和 CSS 文件。然后，Vite 会将这些文件的 `<link rel="modulepreload">` (针对 JS) 和 `<link rel="stylesheet">` (针对 CSS) 标签，智能地注入到即将发送给浏览器的 HTML 的 `<head>` 部分。

`<link rel="modulepreload">` 是一个现代浏览器的特性，它告诉浏览器：“嘿，这个 JS 文件你马上就会用到，现在就开始下载吧，但先别执行。” 这样，当浏览器解析到 HTML 的 `<body>` 部分，真正需要执行脚本时，文件很可能已经下载完毕，从而大大缩短了等待时间。

### 源码：清单生成与预加载注入

1.  **清单生成**：清单的生成是在客户端构建（`vite build`）的最后阶段，由一个内部的 Rollup 插件完成的。这个插件会分析 Rollup 生成的所有 chunk，建立起源文件和产物文件之间的映射关系，并最终写入 `ssr-manifest.json`。

2.  **预加载注入**：在生产环境的 SSR 过程中，开发者通常会使用 `renderToString` 或类似的函数来渲染应用。Vite 推荐的做法是在渲染完成后，通过一个后处理步骤来注入预加载链接。Vite 的生态系统（如 `vite-plugin-ssr`）通常会封装好这个逻辑。

一个简化的注入逻辑可能如下：

```javascript
// server.js - 生产环境 SSR 服务器
import manifest from './dist/client/ssr-manifest.json';

async function handleRequest(req, res) {
  // 1. 在 SSR 期间收集用到的模块 ID
  const { render, usedModules } = await import('./dist/server/entry-server.js';
  const appHtml = render(req.url, usedModules); // usedModules 是一个 Set

  // 2. 根据用到的模块和清单，生成预加载链接
  const preloadLinks = renderPreloadLinks(usedModules, manifest);

  // 3. 读取 HTML 模板并注入
  let html = fs.readFileSync('./dist/client/index.html', 'utf-8');
  html = html.replace(`<!--preload-links-->`, preloadLinks)
             .replace(`<!--app-html-->`, appHtml);

  res.send(html);
}

function renderPreloadLinks(modules, manifest) {
  let links = '';
  const seen = new Set();
  modules.forEach(id => {
    const files = manifest[id];
    if (files) {
      files.forEach(file => {
        if (!seen.has(file)) {
          seen.add(file);
          links += `<link rel="modulepreload" href="${file}">\n`;
        }
      });
    }
  });
  return links;
}
```

### 实现：`mini-vite` 的清单模拟

在 `mini-vite` 中，我们可以模拟这个流程的核心思想。我们将不会实现一个完整的 Rollup 插件，而是手动创建一个简单的清单文件，并编写一个函数来模拟预加载链接的注入。

1.  **手动创建 `ssr-manifest.json`**

    假设我们的 `mini-vite` 构建后产生了两个文件：`main.js` 和 `style.css`。我们可以手动在 `dist/` 目录下创建一个 `ssr-manifest.json`：

    ```json
    // dist/ssr-manifest.json
    {
      "src/main.js": {
        "file": "/main.js",
        "css": ["/style.css"]
      }
    }
    ```

2.  **实现 `renderPreloadLinks`**

    现在，我们编写一个函数，它接收“用到的模块”和一个清单，然后返回预加载链接字符串。

    ```javascript
    // mini-vite/ssr-helpers.js

    export function renderPreloadLinks(usedModules, manifest) {
      let links = '';
      const seen = new Set();

      for (const moduleId of usedModules) {
        const entry = manifest[moduleId];
        if (!entry) continue;

        // 预加载 JS 文件及其依赖
        if (entry.file && !seen.has(entry.file)) {
          links += `<link rel="modulepreload" as="script" crossorigin href="${entry.file}">\n`;
          seen.add(entry.file);
        }
        // (真实场景中，这里还需要递归处理 entry.imports)

        // 预加载 CSS 文件
        if (entry.css) {
          for (const cssFile of entry.css) {
            if (!seen.has(cssFile)) {
              links += `<link rel="stylesheet" href="${cssFile}">\n`;
              seen.add(cssFile);
            }
          }
        }
      }
      return links;
    }
    ```

3.  **在 SSR 中使用**

    在我们的 SSR 入口，我们可以这样使用它：

    ```javascript
    // server.js
    import manifest from './dist/ssr-manifest.json';
    import { renderPreloadLinks } from './mini-vite/ssr-helpers.js';

    // ...
    const usedModules = new Set(['src/main.js']); // 模拟：假设渲染用到了 main.js
    const preloadLinks = renderPreloadLinks(usedModules, manifest);

    // 将 preloadLinks 注入到 HTML 模板中
    // ...
    ```

这个简单的实现抓住了 SSR 清单的核心价值：**它在服务器端和客户端之间建立了一座桥梁，使得服务器能够预知客户端的需求，并主动引导浏览器进行性能优化。**

### 总结

SSR 清单是 Vite 实现高性能服务器端渲染的关键一环。它将构建时的产物信息与运行时的模块使用情况相结合，实现了精确到模块级别的资源预加载。这不仅解决了 CSS 的加载顺序问题，避免了页面样式闪烁，更通过 `modulepreload` 大大缩短了页面的可交互时间（TTI）。

理解了 SSR 清单的机制，你不仅能更好地利用 Vite 进行 SSR 开发，还能将这种“清单化”的性能优化思想应用到更广泛的前端架构设计中。