# 第 27 章：预览服务器与静态部署

经过 `vite build` 的洗礼，我们的项目代码已经被打包、优化，并静静地躺在 `dist` 目录中。这些由 JS、CSS、HTML 和静态资源组成的文件，就是我们即将交付给最终用户的“成品”。

但在将它部署到真实的服务器之前，我们如何能确保它在生产环境中的行为与预期一致？这就是 `vite preview` 命令存在的意义。

### 理论：预览（Preview） vs. 开发（Dev）

`vite preview` 命令启动一个简单的本地静态 Web 服务器，将 `dist` 目录作为根目录。它让你可以在本地环境中，模拟最终用户访问你网站时的真实情况。这与 `vite dev` 有着本质的区别：

*   **`vite dev` (开发服务器)**：
    *   **目标**：提供极致的开发体验。
    *   **机制**：动态地、按需地编译和提供文件，不进行打包。利用浏览器原生 ESM 支持，并附带 HMR 功能。
    *   **服务内容**：直接服务于你的源代码（`src` 目录）。

*   **`vite preview` (预览服务器)**：
    *   **目标**：验证生产构建产物。
    *   **机制**：一个纯粹的静态文件服务器，它不会进行任何代码转换或打包。它只是忠实地提供 `dist` 目录下的文件。
    *   **服务内容**：服务于构建后的产物（`dist` 目录）。

使用 `preview` 服务器的主要目的是，在部署前捕获那些只有在生产构建后才会出现的问题，例如：

*   **路径问题**：构建后的资源路径（如图片、API 请求）是否正确？
*   **代码压缩问题**：代码压缩（Minify）是否意外地破坏了某些逻辑？
*   **Tree-shaking 问题**：是否有不应被移除的代码被错误地清除了？

### Vite 源码剖析：`preview` 命令的简洁实现

Vite 的预览服务器实现非常轻量，其核心逻辑位于 `packages/vite/src/node/preview.ts` 的 `preview` 函数中。

```typescript
// packages/vite/src/node/preview.ts

export async function preview(inlineConfig: InlineConfig = {}): Promise<PreviewServer> {
  // 1. 解析配置，但这次是为预览服务器
  const config = await resolveConfig(inlineConfig, 'serve', 'production')

  // 2. 创建一个 Connect 实例 (类似于 Koa 或 Express)
  const app = connect()

  // 3. 使用 sirv 作为静态文件服务中间件
  // sirv 是一个非常快速、轻量的静态资源服务库
  app.use(
    config.base,
    sirv(config.build.outDir, {
      etag: true,
      single: true, // 对于单页应用 (SPA) 很重要
    }),
  )

  // 4. 创建并启动一个 Node.js HTTP 服务器
  const server = await createServer(app)
  server.listen(config.preview.port)

  // ...

  return server
}
```

从源码中我们可以看到，`preview` 命令的实现非常直白：

1.  它同样会解析配置，以确定诸如 `base` 路径、输出目录 `outDir` 和预览端口 `port` 等信息。
2.  它使用了一个轻量的 Node.js 服务框架 `connect`。
3.  核心是 `sirv` 这个库。Vite 用它来创建一个静态文件服务中间件，指向 `dist` 目录 (`config.build.outDir`)。
    *   `single: true` 这个选项对于单页应用（SPA）至关重要。它意味着当服务器收到一个无法匹配任何静态文件的请求时（例如，用户直接访问 `/user/profile`），它不会返回 404，而是会返回 `index.html`。这样，前端路由库就能接管并正确地渲染页面。
4.  最后，它创建一个标准的 Node.js HTTP 服务器，承载 `connect` 应用，并在指定的端口上进行监听。

### mini-vite 实践：实现 `preview` 命令

让我们为 `mini-vite` 添加一个 `preview` 命令。我们将使用 Node.js 内置的 `http` 模块和一个社区流行的静态服务库 `sirv` 来实现。

首先，安装 `sirv`：

```bash
npm install sirv -D
```

然后，创建一个 `preview.js` 文件：

```javascript
// preview.js
import http from 'http';
import sirv from 'sirv';
import path from 'path';

async function runPreview() {
  const port = 5173; // 模拟 Vite 的默认预览端口
  const distDir = path.resolve(process.cwd(), 'dist');

  console.log(`Starting mini-vite preview server on port ${port}...`);

  // 1. 创建一个 sirv 中间件
  // 它将服务于 'dist' 目录
  const serve = sirv(distDir, {
    single: true, // 开启 SPA 模式
    dev: false,   // 确保在生产模式下运行
    etag: true,   // 开启 ETag
  });

  // 2. 创建 HTTP 服务器
  const server = http.createServer((req, res) => {
    // 将请求交给 sirv 处理
    serve(req, res, () => {
      // 如果 sirv 没有处理该请求 (例如，找不到文件且未开启 single 模式)
      res.statusCode = 404;
      res.end('Not Found');
    });
  });

  // 3. 监听端口
  server.listen(port, () => {
    console.log(`Preview server is running at http://localhost:${port}`);
  });
}

runPreview();
```

这个 `preview.js` 脚本做了什么？

1.  它引入了 `http` 和 `sirv`。
2.  它创建了一个 `sirv` 实例，配置它来服务 `dist` 目录，并开启了 `single: true` 以支持 SPA。
3.  它创建了一个基础的 Node.js `http.Server`。在请求处理函数中，它将 `req` 和 `res` 对象直接传递给 `sirv` 中间件。
4.  服务器在 `5173` 端口启动，并打印出一个访问链接。

现在，更新你的 `package.json`，加入 `preview` 脚本：

```json
"scripts": {
  "dev": "node server.js",
  "build": "node build.js",
  "preview": "node preview.js"
}
```

现在，你可以体验一个完整的开发->构建->预览流程了：

1.  `npm run dev`：在开发模式下进行编码和调试。
2.  `npm run build`：将你的应用打包到 `dist` 目录。
3.  `npm run preview`：在本地启动一个静态服务器，预览最终的生产产物。

至此，`mini-vite` 已经拥有了从开发到构建再到预览的完整工具链，真正成为了一个微缩版的现代前端构建工具。