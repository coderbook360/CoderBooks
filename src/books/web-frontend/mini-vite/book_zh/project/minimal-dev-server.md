# 第 32 章：实战：实现最小开发服务器

蓝图已经绘就，现在是时候拿起工具，打下 `mini-vite` 的第一块基石了。在这一章，我们将从零开始，构建一个最基础但功能完备的开发服务器。这个服务器将是后续所有高级功能（如模块图、HMR）的坚实平台。

我们的目标是实现一个能够响应浏览器请求，并实时编译和提供 JavaScript/TypeScript 模块的服务器。这涉及到三个核心任务：

1.  **启动 HTTP 服务器**：监听端口，接收请求。
2.  **处理静态资源**：正确返回 HTML、CSS、图片等文件。
3.  **编译并返回脚本**：当请求 `.js` 或 `.ts` 文件时，在服务器端实时编译，然后将结果返回。

让我们开始吧！

### 理论：中间件架构与请求处理链

Vite 的开发服务器（以及其前身 Koa 和现代大多数 Node.js web 框架）广泛采用了一种名为 **中间件（Middleware）** 的架构模式。你可以将中间件想象成一个工厂里的流水线。当一个请求（原材料）进入工厂时，它会依次通过流水线上的每一个工位（中间件）。每个工位都可以对这个请求进行检查、处理、修改，或者直接将其传递给下一个工位。

这种模式的好处是极大的灵活性和可扩展性。我们可以轻松地添加、删除或重排这些“工位”，以实现不同的功能。例如，我们可以有一个专门处理静态文件的中间件，一个专门编译 JS 的中间件，一个专门处理代理的中间件等等。

在 `mini-vite` 中，我们将使用一个非常轻量的库 `connect` 来帮助我们组织中间件。`connect` 本身就是一个中间件的调度器，它让我们可以用一种清晰、线性的方式来定义我们的请求处理逻辑。

### 实现：构建 `mini-vite` 的服务器骨架

首先，我们需要安装几个核心依赖：

-   `connect`：中间件框架。
-   `esbuild`：一个极速的 JavaScript/TypeScript 编译器和打包器，是 Vite 速度的秘密武器之一。

现在，让我们创建 `mini-vite` 的主文件 `server.js`。

```javascript
// mini-vite/server.js

import http from 'http';
import connect from 'connect';
import path from 'path';
import fs from 'fs/promises';
import { transformWithEsbuild } from 'esbuild';

const projectRoot = process.cwd();

async function createServer() {
  const app = connect();

  // 中间件 1: 静态资源服务
  // (稍后实现)

  // 中间件 2: 脚本编译
  // (稍后实现)

  const server = http.createServer(app);

  server.listen(3000, () => {
    console.log('mini-vite server is listening on port 3000...');
  });
}

createServer();
```

这段代码创建了一个 `connect` 实例和一个原生的 Node.js HTTP 服务器。现在，我们需要填充中间件的具体逻辑。

#### 静态资源中间件

这个中间件的职责很简单：检查请求的 URL 是否对应一个存在的文件。如果是，就返回文件内容；如果不是，就将请求交给下一个中间件处理。

```javascript
// 在 app = connect() 之后添加

app.use(async (req, res, next) => {
  const url = req.url;
  
  // 首页重定向：访问根路径时返回 index.html
  if (url === '/') {
    const indexPath = path.join(projectRoot, 'index.html');
    const htmlContent = await fs.readFile(indexPath, 'utf-8');
    // 设置正确的 MIME 类型，浏览器才能正确解析
    res.setHeader('Content-Type', 'text/html');
    res.end(htmlContent);
    return;  // 处理完毕，不再往下传递
  }

  // 静态文件处理 (CSS, 图片等)
  // 使用正则匹配常见的静态资源扩展名
  if (url.match(/\.(css|jpg|png|svg|ico|woff|woff2)$/)) {
    const filePath = path.join(projectRoot, url);
    try {
      const fileContent = await fs.readFile(filePath);
      // 实际项目中应该根据扩展名设置正确的 Content-Type
      // 例如：.css → text/css, .png → image/png
      res.end(fileContent);
    } catch (e) {
      // 文件不存在，调用 next() 让后续中间件处理
      // 这是中间件模式的关键：处理不了就传递
      next();
    }
    return;
  }

  // 不是静态资源，传递给下一个中间件
  next();
});
```

#### 脚本编译中间件

这是 `mini-vite` 的核心。当一个请求到达这里时，我们假设它是一个需要被编译的脚本文件（如 `.js`, `.ts`, `.jsx`）。

```javascript
// 在静态资源中间件之后添加

app.use(async (req, res, next) => {
  const url = req.url;

  // 只处理 JavaScript 和 TypeScript 文件
  if (url.endsWith('.js') || url.endsWith('.ts')) {
    // 将 URL 路径转换为文件系统路径
    const filePath = path.join(projectRoot, url);
    
    try {
      // 读取源代码
      const sourceCode = await fs.readFile(filePath, 'utf-8');

      // 使用 esbuild 进行实时编译
      // esbuild 是一个极速的 JS/TS 编译器，这正是 Vite 快的秘密之一
      const { code } = await transformWithEsbuild(sourceCode, {
        // 根据文件扩展名选择 loader
        // 'ts' loader 会移除类型注解，'js' loader 处理现代 JS 语法
        loader: url.endsWith('.ts') ? 'ts' : 'js',
        // target 指定输出的 JS 版本
        // 'esnext' 表示输出最新的 JS 语法，因为现代浏览器都支持
        target: 'esnext',
      });

      // 设置正确的 MIME 类型
      res.setHeader('Content-Type', 'application/javascript');
      res.end(code);
    } catch (e) {
      next();
    }
    return;
  }

  next();
});
```

现在，我们的服务器已经能够将 TypeScript 文件实时编译成 JavaScript 并返回给浏览器了！

### 关键挑战：裸模块路径重写

如果你现在尝试在一个 `main.js` 中写入 `import React from 'react'`，浏览器会立即报错，因为它不理解 `'react'` 是什么。浏览器只认识相对路径（`./`）、绝对路径（`/`）或完整的 URL。这种没有路径前缀的导入被称为“裸模块导入”（Bare Module Import）。

Vite 的一个天才之举就是在服务器端重写这些路径。当 Vite 遇到 `import ... from 'react'` 时，它会将其动态地重写为 `import ... from '/node_modules/react/index.js'` 这样的浏览器可识别的路径。

让我们在 `mini-vite` 中实现这个关键功能。我们将修改脚本编译中间件，在编译之前先对源码进行一次简单的正则替换。

```javascript
// 更新脚本编译中间件

app.use(async (req, res, next) => {
  const url = req.url;

  if (url.endsWith('.js') || url.endsWith('.ts')) {
    const filePath = path.join(projectRoot, url);
    try {
      let sourceCode = await fs.readFile(filePath, 'utf-8');

      // 裸模块路径重写
      // 正则解释：
      // from\s+       匹配 "from " 加上空白
      // ['|"]         匹配引号（单引号或双引号）
      // ([^\.'"/][^\'"]*)  捕获组：不以 . / " ' 开头的模块名（即裸模块）
      // ['|"]         匹配结束引号
      sourceCode = sourceCode.replace(
        /from\s+['"]([^\.'"/][^'"]*)['"]/g, 
        (match, moduleName) => {
          // 将 'react' 重写为 '/node_modules/react'
          // 真实 Vite 会解析 package.json 找到正确的入口文件
          return `from "/node_modules/${moduleName}"`;
        }
      );

      const { code } = await transformWithEsbuild(sourceCode, {
        loader: url.endsWith('.ts') ? 'ts' : 'js',
        target: 'esnext',
      });

      res.setHeader('Content-Type', 'application/javascript');
      res.end(code);
    } catch (e) {
      next();
    }
    return;
  }

  // 处理 node_modules 里的文件请求
  // 浏览器请求 /node_modules/react 时，我们需要返回实际的文件
  if (url.startsWith('/node_modules/')) {
    const filePath = path.join(projectRoot, url);
    try {
      // 读取依赖的源码
      let sourceCode = await fs.readFile(filePath, 'utf-8');
      
      // 依赖内部可能还有其他裸模块导入，也需要重写
      sourceCode = sourceCode.replace(
        /from\s+['"]([^\.'"/][^'"]*)['"]/g,
        (match, moduleName) => `from "/node_modules/${moduleName}"`
      );
      
      const { code } = await transformWithEsbuild(sourceCode, {
        loader: 'js',
        target: 'esnext',
      });
      
      res.setHeader('Content-Type', 'application/javascript');
      res.end(code);
    } catch (e) {
      next();
    }
    return;
  }

  next();
});
```

这个正则表达式会查找所有 `from 'module-name'` 形式的导入，并给它加上 `/node_modules/` 前缀。同时，我们还需要添加一个逻辑来处理对 `/node_modules/` 路径本身的请求。

### 进阶：package.json exports 与子路径导入

上面的简化实现有一个重要的局限性：真实世界中的裸模块解析要复杂得多。让我们看看真实 Vite 需要处理的场景：

**1. package.json `exports` 字段**

现代 npm 包使用 `exports` 字段来定义模块入口，这比传统的 `main` 字段强大得多：

```json
// node_modules/some-package/package.json
{
  "name": "some-package",
  "exports": {
    ".": {
      "import": "./dist/esm/index.js",
      "require": "./dist/cjs/index.js",
      "types": "./dist/types/index.d.ts"
    },
    "./utils": {
      "import": "./dist/esm/utils.js",
      "require": "./dist/cjs/utils.js"
    },
    "./styles/*": "./dist/styles/*"
  }
}
```

**2. 子路径导入（Subpath Imports）**

用户代码中经常会导入包的子路径：

```javascript
// 这些都是合法的导入，但简单的正则无法正确处理
import { debounce } from 'lodash/debounce';
import Button from '@mui/material/Button';
import { something } from 'package/internal/deep';
```

**3. 真实 Vite 的解析逻辑**

Vite 使用 `resolve` 函数来处理这些复杂情况：

```javascript
// 真实 Vite 的裸模块解析（简化版）
async function resolveBareName(bareImport, importer) {
  // 1. 解析包名和子路径
  const { packageName, subpath } = parsePackageSpecifier(bareImport);
  
  // 2. 找到 package.json
  const packageDir = path.join(projectRoot, 'node_modules', packageName);
  const packageJson = JSON.parse(
    await fs.readFile(path.join(packageDir, 'package.json'), 'utf-8')
  );
  
  // 3. 根据 exports 字段解析实际入口
  if (packageJson.exports) {
    const resolved = resolveExports(packageJson.exports, subpath, {
      conditions: ['import', 'module', 'browser', 'default']
    });
    return path.join(packageDir, resolved);
  }
  
  // 4. 降级到 module/main 字段
  const entry = packageJson.module || packageJson.main || 'index.js';
  return path.join(packageDir, entry);
}
```

我们的 `mini-vite` 简化版跳过了这些复杂性。但理解真实 Vite 的完整解析流程，能让你更好地理解为什么 Vite 需要**依赖预构建**这个步骤——它在启动时一次性解析所有依赖入口并缓存结果。

### 总结

在这一章，我们成功地搭建了 `mini-vite` 的服务器骨架。它虽然简单，但已经具备了 Vite 的两个核心特征：

1.  **基于原生 ESM 的按需编译**：没有打包，服务器根据浏览器的请求实时编译和提供模块。
2.  **裸模块路径重写**：解决了浏览器不识别裸模块导入的问题，使得我们可以像在 Node.js 中一样自然地使用 npm 包。

这个最小化的开发服务器是我们后续构建模块图、实现 HMR 等高级功能的起点。在下一章，我们将在此基础上，开始构建 `mini-vite` 的"大脑"——模块依赖图。