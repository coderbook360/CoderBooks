
# 33. 实战：实现模块图与基本 HMR

在上一章，我们搭建了 `mini-vite` 的骨架——一个能够提供静态资源和实时编译脚本的开发服务器。然而，它还缺少现代开发服务器最核心的两个功能：**模块依赖图 (Module Graph)** 和 **热模块替换 (HMR)**。

模块图是 Vite “按需编译”理念的基石，也是实现 HMR 的前提。没有它，服务器就无法理解文件之间的依赖关系，也就不知道当一个文件改变时，应该更新哪些模块。

本章，我们将为 `mini-vite` 注入灵魂，亲手实现这两个核心功能。

## 1. 理论：模块图是 HMR 的大脑

想象一下，你的项目是一个庞大的家族，每个文件都是一个家庭成员。模块图就像一张详细的“家族族谱”，它清晰地记录了谁“引入”（`import`）了谁，谁又被谁“依赖”。

- **节点 (Node)**：族谱中的每个“成员”，即项目中的每个模块文件。
- **边 (Edge)**：连接成员的“关系线”，即模块之间的 `import` 关系。

当一个文件（一个家庭成员）发生变化时，Vite 会立即查阅这张族谱，并沿着关系线向上查找：
1.  **找到直接“长辈”**：哪些模块直接 `import` 了这个变化的文件？
2.  **通知相关成员**：Vite 会通知这些“长辈”模块，告诉它们“你依赖的某个东西变了”。
3.  **确定更新边界**：Vite 会继续向上追溯，直到找到一个能够“消化”这次更新的模块（即接受 HMR 的模块），或者一直追溯到根节点，最终触发页面刷新。

这个过程，就是 HMR 的核心逻辑。而模块图，正是这一切的“大脑”和指挥中心。

### Vite 源码中的 `ModuleGraph`

在 Vite 源码中，`moduleGraph.ts` 文件定义了 `ModuleGraph` 类。这是 Vite 整个依赖关系管理的核心。它主要通过以下几个属性来维护这张图：

- `urlToModuleMap`: 一个 `Map` 对象，键是模块的 URL，值是对应的模块节点 (`ModuleNode`) 对象。
- `fileToModulesMap`: 一个 `Map` 对象，键是文件的绝对路径，值是一个 `Set`，包含该文件对应的所有模块节点（因为一个文件可能因为 URL 参数不同而对应多个模块）。

每个 `ModuleNode` 对象则存储了模块自身的信息，以及它的依赖关系：
- `importers`: 一个 `Set`，记录了所有直接 `import` 当前模块的模块节点。这就是我们的“家族族谱”向上追溯的关键。
- `importedModules`: 一个 `Set`，记录了当前模块直接 `import` 的所有模块节点。

## 2. 实践：为 `mini-vite` 构建模块图

现在，让我们在 `mini-vite` 中实现一个简化的模块图。

### 2.1. 创建 `ModuleGraph` 类

首先，在 `mini-vite` 项目中创建一个新文件 `moduleGraph.js`。

```javascript
// mini-vite/moduleGraph.js

export class ModuleNode {
  constructor(url) {
    this.url = url; // 模块的 URL
    this.importers = new Set(); // 依赖当前模块的模块
    this.importedModules = new Set(); // 当前模块依赖的模块
    this.transformResult = null; // 模块的转换结果
  }
}

export class ModuleGraph {
  constructor() {
    this.urlToModuleMap = new Map();
    this.fileToModulesMap = new Map();
  }

  getModule(url) {
    return this.urlToModuleMap.get(url);
  }

  // 确保模块存在于图中
  ensureEntry(url) {
    if (!this.urlToModuleMap.has(url)) {
      this.urlToModuleMap.set(url, new ModuleNode(url));
    }
    return this.urlToModuleMap.get(url);
  }

  // 更新模块信息
  async updateModuleInfo(mod, importedModules) {
    mod.importedModules.clear();
    for (const imported of importedModules) {
      const depMod = this.ensureEntry(imported);
      depMod.importers.add(mod);
      mod.importedModules.add(depMod);
    }
  }
}
```

这个简化的 `ModuleGraph` 包含了最核心的功能：通过 URL 获取模块、确保模块存在，以及更新模块间的依赖关系。

### 2.2. 集成模块图到服务器

接下来，我们需要修改 `server.js`，在处理请求的过程中构建和更新模块图。

首先，在 `server.js` 顶部引入 `ModuleGraph` 并实例化它。

```javascript
// mini-vite/server.js
import { ModuleGraph } from './moduleGraph.js';
// ... 其他 import

async function createServer() {
  const moduleGraph = new ModuleGraph();
  const app = connect();
  // ...
}
```

然后，修改我们的脚本编译中间件。在每次编译文件后，我们需要解析出它的 `import` 语句，并用这些信息来更新模块图。

为了解析 `import`，我们可以使用一个轻量级的 AST 解析库，比如 `es-module-lexer`。

```bash
npm install es-module-lexer
```

然后更新中间件：

```javascript
// mini-vite/server.js
import { parse } from 'es-module-lexer';
// ...

// 脚本编译中间件
app.use(async (req, res, next) => {
  const url = req.url;
  if (url.endsWith('.js') || url.endsWith('.ts')) {
    const filePath = path.join(projectRoot, url);
    let sourceCode = await fs.readFile(filePath, 'utf-8');

    // 1. 获取或创建模块节点
    const mod = moduleGraph.ensureEntry(url);

    // 如果已有缓存，直接返回
    if (mod.transformResult) {
      res.setHeader('Content-Type', 'application/javascript');
      res.end(mod.transformResult.code);
      return;
    }

    // 2. 转换代码
    const { code } = await transformWithEsbuild(sourceCode, { /* ... */ });

    // 3. 解析 imports 并更新模块图
    await parse(code); // 必须先 await parse，否则 lexer 可能未初始化
    const [imports] = parse(code);
    const importedUrls = new Set();
    for (const { s, e } of imports) {
      const importUrl = code.substring(s, e);
      // 简单处理，实际 Vite 更复杂
      if (importUrl.startsWith('./') || importUrl.startsWith('../')) {
        // 将相对路径转换为绝对 URL 路径
        const resolvedUrl = path.join(path.dirname(url), importUrl);
        importedUrls.add(resolvedUrl);
      }
    }
    await moduleGraph.updateModuleInfo(mod, importedUrls);

    // 4. 缓存转换结果并返回
    mod.transformResult = { code };
    res.setHeader('Content-Type', 'application/javascript');
    res.end(code);
    return;
  }
  next();
});
```

现在，每次你请求一个 JS/TS 文件，`mini-vite` 都会解析它的依赖，并在模块图中建立起关系。

## 3. 实践：实现基本 HMR

有了模块图，我们就可以实现 HMR 了。这需要客户端和服务器协同工作。

### 3.1. 客户端 HMR 逻辑

我们需要向 `index.html` 注入一小段客户端脚本，用于连接 WebSocket 服务器并处理 HMR 消息。

首先，创建一个 `hmr-client.js` 文件：

```javascript
// mini-vite/hmr-client.js
console.log('[mini-vite] HMR client connected.');

// 1. 创建 WebSocket 客户端
// 这里的地址要与服务器端 WebSocket 的地址一致
const socket = new WebSocket('ws://localhost:3000');

socket.addEventListener('message', async ({ data }) => {
  const { type, path } = JSON.parse(data);
  if (type === 'update') {
    console.log(`[mini-vite] File updated: ${path}`);
    
    // 2. 动态导入更新的模块
    // 通过在 URL 后附加时间戳，强制浏览器重新请求模块
    await import(`${path}?t=${Date.now()}`);
    
    // 3. 简单起见，我们直接重新加载页面
    // 一个完整的 HMR 实现会在这里执行更复杂的热替换逻辑
    window.location.reload();
  }
});
```

这个客户端脚本非常简单：连接 WebSocket，监听 `update` 消息，然后通过在 URL 后附加时间戳的方式重新导入模块，并刷新页面。这是一个“热重载”（Hot Reload），而非真正的“热替换”（Hot Replacement），但它是实现完整 HMR 的第一步。

### 3.2. 服务器端 HMR 逻辑

服务器需要做三件事：
1.  创建一个 WebSocket 服务器。
2.  监听文件变化。
3.  当文件变化时，通过模块图找到受影响的模块，并通知客户端。

我们需要安装 `ws` 和 `chokidar`：

```bash
npm install ws chokidar
```

现在，更新 `server.js`：

```javascript
// mini-vite/server.js
import { WebSocketServer } from 'ws';
import chokidar from 'chokidar';
// ...

async function createServer() {
  // ...
  const server = http.createServer(app);

  // 1. 创建 WebSocket 服务器
  const wss = new WebSocketServer({ server });
  wss.on('connection', (ws) => {
    console.log('[mini-vite] WebSocket client connected.');
    ws.on('message', (msg) => console.log(`Message from client: ${msg}`));
  });

  // 2. 创建文件监听器
  const watcher = chokidar.watch(projectRoot, {
    ignored: ['**/node_modules/**', '**/.git/**'],
    ignoreInitial: true, // 不处理初始化的文件
  });

  // 3. 监听文件变化
  watcher.on('change', async (file) => {
    const url = '/' + path.relative(projectRoot, file).replace(/\/g, '/');
    console.log(`[mini-vite] File changed: ${url}`);

    // 清除模块缓存
    const mod = moduleGraph.getModule(url);
    if (mod) {
      mod.transformResult = null;
    }

    // 通知客户端更新
    wss.clients.forEach((client) => {
      if (client.readyState === 1) { // WebSocket.OPEN
        client.send(JSON.stringify({ type: 'update', path: url }));
      }
    });
  });

  // 4. 向 index.html 注入客户端脚本
  app.use(async (req, res, next) => {
    if (req.url === '/') {
      const indexPath = path.join(projectRoot, 'index.html');
      let html = await fs.readFile(indexPath, 'utf-8');
      // 注入 hmr-client.js
      html = html.replace(
        '</head>',
        '<script type="module" src="/hmr-client.js"></script></head>'
      );
      res.setHeader('Content-Type', 'text/html');
      res.end(html);
      return;
    }
    next();
  });

  // ... 启动服务器
  server.listen(3000, () => { /* ... */ });
}

createServer();
```

现在，当你启动 `mini-vite` 并修改项目中的任何一个 JS/TS 文件时，你会看到：
1.  服务器控制台打印出文件变化的日志。
2.  浏览器控制台打印出 `File updated` 的日志。
3.  页面自动刷新。

我们成功地在 `mini-vite` 中实现了一个包含模块图和基本 HMR 功能的开发服务器！虽然它还很初级，但已经完整地贯穿了现代构建工具最核心的开发时思想。

在下一章，我们将继续完善它，为它添加一个简化的插件系统。
