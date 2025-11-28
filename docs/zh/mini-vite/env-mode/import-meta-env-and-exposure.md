# 17. import.meta.env 与前端暴露

在上一章，我们成功地在 Vite 的 Node.js 环境中加载了 `.env` 文件。但这些环境变量存在于服务器的内存中，与运行在浏览器中的客户端代码是完全隔离的。直接将服务器的所有环境变量（`process.env`）暴露给前端是极其危险的，这可能导致数据库密码、API 密钥等敏感信息泄露。

Vite 通过一种巧妙且安全的方式，解决了这个问题。它利用了现代 JavaScript 的一个标准特性——`import.meta`，并约定了一个简单的前缀规则，来充当后端与前端之间传递环境变量的桥梁。

## 17.1. `import.meta`：模块的元信息

`import.meta` 是一个由 ECMAScript 标准提供的对象，它包含了关于当前模块的特定上下文信息。最常见的例子是 `import.meta.url`，它可以返回当前模块文件的 URL 地址。

```javascript
// 在 /src/main.js 模块中
console.log(import.meta.url); // 输出: file:///path/to/project/src/main.js
```

`import.meta` 的设计是可扩展的，JavaScript 宿主环境（如浏览器或 Node.js）可以向其中添加自定义属性。Vite 正是利用了这一点，向 `import.meta` 对象上挂载了一个 `env` 属性，专门用于存放暴露给客户端的环境变量。

## 17.2. `VITE_` 前缀：安全的“通行证”

Vite 规定，只有以 `VITE_` 为前缀的变量，才会被暴露给客户端代码。这是一个强制性的安全约定。

例如，你在 `.env` 文件中定义了两个变量：

```env
DB_PASSWORD=my-secret-password
VITE_API_URL=https://api.example.com
```

*   `DB_PASSWORD`：由于它没有 `VITE_` 前缀，它只存在于 Node.js 环境中，前端代码**永远无法**访问到它。
*   `VITE_API_URL`：因为它有 `VITE_` 前缀，Vite 会将其视为一个“公共”变量，并允许在前端代码中通过 `import.meta.env.VITE_API_URL` 来访问。

这个简单的规则，像一道防火墙，有效地防止了开发者无意中将敏感的服务器端变量泄露到客户端。

## 17.3. 工作原理：静态替换

你可能会认为 Vite 在 `import.meta.env` 对象上做了一些复杂的代理或动态注入。但实际上，它的实现方式出奇地简单——**纯粹的静态文本替换**。

在开发服务器处理你的代码时（或在构建时），Vite 的一个内置插件 (`vite:define`) 会扫描你的代码。当它找到 `import.meta.env.VITE_SOME_KEY` 这样的模式时，它会：

1.  从已加载的环境变量中查找 `VITE_SOME_KEY` 的值。
2.  用这个值的**字符串形式**，直接替换掉代码中 `import.meta.env.VITE_SOME_KEY` 这段文本。

让我们看一个直观的例子。

**你的源代码 (`main.js`)**：

```javascript
console.log("API 地址是:", import.meta.env.VITE_API_URL);
```

**经过 Vite 处理后，浏览器实际得到的代码**：

```javascript
console.log("API 地址是:", "https://api.example.com");
```

看到了吗？`import.meta.env.VITE_API_URL` 已经完全消失了，取而代之的是一个硬编码的字符串。这意味着，在你的代码执行时，它访问的根本不是一个真实存在的 `import.meta.env` 对象，而是一个已经被 Vite “烘焙”到代码里的常量。

这种静态替换的方式有两个好处：

*   **零运行时开销**：代码在浏览器中执行时，不需要任何额外的逻辑来获取这些变量。
*   **支持摇树优化 (Tree-shaking)**：如果某个 `import.meta.env` 变量没有被使用，或者在某个 `if (false)` 的代码块中，构建工具（如 Rollup）可以智能地将其从最终的产物中移除。

## 17.4. 内置环境变量

除了 `VITE_` 前缀的变量，Vite 还在 `import.meta.env` 上提供了一些内置的、随时可用的变量，方便你根据环境编写逻辑：

*   `import.meta.env.MODE`: `{string}` 当前的[模式](#162-什么是模式-mode)。
*   `import.meta.env.BASE_URL`: `{string}` 部署应用时的基本 URL。 它由 `base` 配置项决定。
*   `import.meta.env.PROD`: `{boolean}` 当前是否为生产环境 (`process.env.NODE_ENV === 'production')`。
*   `import.meta.env.DEV`: `{boolean}` 当前是否为开发环境 (总是与 `import.meta.env.PROD` 相反)。
*   `import.meta.env.SSR`: `{boolean}` 是否是[服务器端渲染](../ssr/environment-and-module-loader.md)环境。

这些变量同样是通过静态替换的方式注入的。

## 17.5. mini-vite 的实现

要在 `mini-vite` 中实现这个功能，最理想的方式是编写一个插件，该插件在 `transform` 钩子中执行文本替换。

```javascript
// src/plugins/define.js

/**
 * 一个模拟 vite:define 插件，用于实现 import.meta.env 的静态替换
 * @param {object} config - mini-vite 的配置对象，其中包含 env 环境变量
 * @returns {object} - 插件对象
 */
export function definePlugin(config) {
  return {
    name: 'mini-vite:define',
    transform(code, id) {
      // 我们只处理 JS 文件
      if (!id.endsWith('.js')) {
        return null;
      }

      // 准备要替换的环境变量
      const replacements = {};
      const env = config.env || {}; // 从配置中获取已加载的环境变量

      // 1. 注入所有 VITE_ 前缀的变量
      for (const key in env) {
        if (key.startsWith('VITE_')) {
          replacements[`import.meta.env.${key}`] = JSON.stringify(env[key]);
        }
      }

      // 2. 注入内置变量
      replacements['import.meta.env.MODE'] = JSON.stringify(config.mode);
      replacements['import.meta.env.DEV'] = JSON.stringify(config.mode !== 'production');
      replacements['import.meta.env.PROD'] = JSON.stringify(config.mode === 'production');

      // 3. 使用正则表达式进行批量替换
      let replacedCode = code;
      for (const key in replacements) {
        // 使用正则表达式，并开启全局匹配 (g)
        const regex = new RegExp(key.replace(/\./g, '\\.'), 'g');
        replacedCode = replacedCode.replace(regex, replacements[key]);
      }

      return {
        code: replacedCode,
      };
    },
  };
}
```

在这个插件中：

1.  我们创建了一个 `replacements` 对象，用于存放所有需要被替换的“键”和“值”。
2.  我们遍历从配置中拿到的环境变量，筛选出 `VITE_` 前缀的变量，并使用 `JSON.stringify` 来确保值被正确地转换为字符串字面量（例如，`'hello'` 变为 `"'hello'"`）。
3.  我们同样处理了 `MODE`, `DEV`, `PROD` 等内置变量。
4.  最后，我们遍历 `replacements` 对象，使用正则表达式对源代码进行全局替换。

将这个插件加入到 `mini-vite` 的插件系统中，我们就拥有了与 Vite 几乎一致的环境变量暴露能力。至此，我们打通了从 `.env` 文件到前端代码的完整链路。
