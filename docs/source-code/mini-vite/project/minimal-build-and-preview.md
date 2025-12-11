
# 35. 实战：构建与预览的简化版

至此，我们的 `mini-vite` 已经是一个相当不错的开发服务器了。它拥有按需编译、模块图、HMR 和插件系统。然而，Vite 的使命不止于开发阶段，它还提供了一流的构建和预览功能，确保开发和生产的一致性。

- **`vite build`**: 使用 Rollup 将你的应用打包成高度优化的静态资源，用于生产部署。
- **`vite preview`**: 在本地启动一个静态 Web 服务器，用于预览构建后的产物。

本章，我们将为 `mini-vite` 实现这两个命令的简化版本，完成从开发到部署的完整闭环。

## 1. 理论：构建是通往生产的桥梁

为什么我们需要“构建”这一步？

开发时，我们追求的是快速的反馈和灵活的调试，因此 Vite 采用了原生 ES 模块和按需编译的策略。但到了生产环境，我们的首要目标变成了**性能**和**兼容性**。

构建过程主要做了以下几件事：
1.  **打包 (Bundling)**：将项目中成百上千个模块合并成少数几个文件，以减少 HTTP 请求次数。
2.  **代码压缩 (Minification)**：移除代码中的空格、注释，并缩短变量名，以减小文件体积。
3.  **Tree-shaking**: 移除代码中未被使用的部分，进一步减小体积。
4.  **资源优化**: 处理 CSS、图片等静态资源，比如合并、压缩。

Vite 选择 Rollup 作为其生产环境的打包器。因为 Rollup 专注于 ES 模块，其输出的代码干净、高效，非常适合构建现代前端应用和库。

## 2. 实践：实现 `mini-vite` 的构建命令

我们将创建一个 `build.js` 脚本，使用 Rollup 的 JavaScript API 来打包我们的项目。

首先，安装 `rollup` 和一个用于解析 `node_modules` 依赖的插件。

```bash
npm install rollup @rollup/plugin-node-resolve
```

现在，创建 `mini-vite/build.js` 文件：

```javascript
// mini-vite/build.js
import { rollup } from 'rollup';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import path from 'path';

const projectRoot = process.cwd();

async function runBuild() {
  console.log('Building for production...');

  const bundle = await rollup({
    // 1. 输入
    // 我们直接将 main.js 作为入口，简化处理
    input: path.join(projectRoot, 'main.js'),

    // 2. 插件
    // @rollup/plugin-node-resolve 用于解析 node_modules 中的模块
    plugins: [nodeResolve()],
  });

  // 3. 输出
  await bundle.write({
    // 输出目录
    dir: path.join(projectRoot, 'dist'),
    // 输出格式
    format: 'es',
    // 是否生成 sourcemap
    sourcemap: true,
  });

  console.log('Build complete!');
}

runBuild();
```

这个构建脚本非常基础：
- 它将 `main.js` 作为打包入口。
- 使用 `@rollup/plugin-node-resolve` 插件来帮助 Rollup 找到像 `react` 这样的第三方库。
- 将打包结果输出到 `dist` 目录，格式为 ES 模块。

为了运行它，我们可以在 `package.json` 中添加一个 `build` 脚本：

```json
// package.json
{
  "scripts": {
    "dev": "node mini-vite/server.js",
    "build": "node mini-vite/build.js"
  }
}
```

现在，运行 `npm run build`，你会在项目根目录下看到一个 `dist` 文件夹，里面包含了打包后的代码。

## 3. 实践：实现 `mini-vite` 的预览命令

构建完成后，我们需要一种方式来验证产物是否能正常工作。这就是 `preview` 命令的作用。它本质上是一个简单的静态文件服务器，将 `dist` 目录作为根目录。

我们可以使用 `sirv` 这个轻量级的静态资源服务工具。

```bash
npm install sirv
```

然后，创建 `mini-vite/preview.js` 文件：

```javascript
// mini-vite/preview.js
import sirv from 'sirv';
import http from 'http';
import path from 'path';

const projectRoot = process.cwd();

function runPreview() {
  const port = 5000;
  const distDir = path.join(projectRoot, 'dist');

  // 创建一个 sirv 实例，为 dist 目录提供服务
  const serve = sirv(distDir, {
    // 单页应用模式
    single: true,
    dev: false,
  });

  // 创建 HTTP 服务器
  http.createServer((req, res) => {
    serve(req, res);
  }).listen(port, () => {
    console.log(`Preview server is running at http://localhost:${port}`);
  });
}

runPreview();
```

同样，在 `package.json` 中添加 `preview` 脚本：

```json
// package.json
{
  "scripts": {
    "dev": "node mini-vite/server.js",
    "build": "node mini-vite/build.js",
    "preview": "node mini-vite/preview.js"
  }
}
```

现在，构建流程变成了：
1.  运行 `npm run build` 来打包你的应用。
2.  运行 `npm run preview` 来启动预览服务器。
3.  在浏览器中打开 `http://localhost:5000`，你将看到生产版本的应用。

通过实现 `build` 和 `preview` 命令，我们的 `mini-vite` 已经覆盖了从开发到部署的整个生命周期。虽然每一部分都经过了极大的简化，但它完整地体现了 Vite 的核心设计哲学：**在开发时提供极致的速度和灵活性，在生产时提供高度优化的可靠产物。**

在本书的最后一章，我们将把所有这些碎片化的功能整合起来，并讨论如何对这个迷你项目进行测试和验证。
