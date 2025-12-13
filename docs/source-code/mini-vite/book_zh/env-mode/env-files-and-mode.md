# 16. 环境文件与模式

在任何一个严肃的前端项目中，管理不同环境（如本地开发、测试服务器、生产环境）的配置都是一项必不可少的工作。你可能需要为每个环境提供不同的 API 端点、功能开关或第三方服务的密钥。

Vite 在这方面提供了极其优雅和直观的解决方案，其核心是两个概念：

1.  **.env 文件**：一种存放环境变量的标准化文件格式。
2.  **模式 (Mode)**：一个用于区分部署环境的顶层概念，例如 `development` 或 `production`。

本章，我们将深入探讨 Vite 是如何将这两者结合起来，实现灵活且强大的环境配置管理的。

## 16.1. .env 文件的加载规则

Vite 会在启动时，自动从你的项目根目录加载 `.env` 系列文件中的环境变量。它遵循一套清晰的加载优先级规则，这套规则的设计让你能够精细地控制每个环境的变量覆盖关系。

假设当前的工作目录是 `/path/to/project`，并且当前的“模式”是 `production`，Vite 会按照以下顺序寻找并加载文件：

1.  `.env`：所有模式下都会加载的基础配置文件。就像是餐厅里所有套餐都包含的“基础调味包”。
2.  `.env.local`：所有模式下都会加载，但会被 git 忽略。通常用于存放一些本地特有的、敏感的配置，比如个人的 API Token。它的优先级高于 `.env`。
3.  `.env.[mode]`：特定模式下才会加载的文件。例如，`.env.production` 只会在 `production` 模式下加载。这就像是为“麻辣套餐”额外准备的“辣椒包”。
4.  `.env.[mode].local`：特定模式下加载，且被 git 忽略。这是最高优先级的文件，通常用于在本地临时覆盖特定模式下的配置，比如在本地调试生产环境构建时，临时指向一个测试 API。

**加载优先级从高到低依次是**：

`env.[mode].local` > `env.[mode]` > `env.local` > `env`

这意味着，在不同文件中定义的同名变量，高优先级文件中的值会覆盖低优先级文件中的值。例如，如果在 `.env` 和 `.env.production` 中都定义了 `VITE_API_URL`，那么在 `production` 模式下，`.env.production` 中的值会生效。

这个加载过程由 Vite 内部的 `loadEnv` 函数负责，它位于 `packages/vite/src/node/config.ts`。这个函数会根据当前 `mode` 和 `envDir`（存放 .env 文件的目录，默认为项目根目录）来解析和加载这些文件。

## 16.2. 什么是“模式” (Mode)？

“模式”是 Vite 中一个非常核心的概念，它决定了 `.env` 文件的加载行为以及 `vite.config.js` 的某些默认行为。

Vite 主要有两种内置模式：

*   `development`：当你运行 `vite` 或 `vite dev` 时，默认使用的模式。
*   `production`：当你运行 `vite build` 时，默认使用的模式。

你可以通过在命令行中添加 `--mode` 标志来覆盖默认的模式。例如，假设你有一个用于模拟线上环境的“预发布”环境，叫做 `staging`。你可以创建一个 `.env.staging` 文件，并在构建时使用以下命令：

```bash
vite build --mode staging
```

执行此命令时，Vite 会：

1.  将 `mode` 设置为 `staging`。
2.  加载 `.env`、`.env.local`、`.env.staging` 和 `.env.staging.local` 文件。
3.  将 `process.env.NODE_ENV` 设置为 `production`（因为 `build` 命令的默认行为）。

值得注意的是，`mode` 和 `NODE_ENV` 是两个独立但相关的概念。`mode` 主要用于加载 `.env` 文件和区分配置，而 `NODE_ENV` 则更多地被第三方库（如 React、Vue）用来判断是否开启生产环境优化（如关闭警告、启用代码压缩等）。

## 16.3. 在配置和代码中使用环境变量

Vite 加载的环境变量，可以通过两种方式被消费：

1.  **在 `vite.config.js` 中**：通过 `process.env` 对象直接访问。这使得你可以在配置文件中根据环境变量动态地设置代理、别名等。

    ```javascript
    // vite.config.js
    import { defineConfig, loadEnv } from 'vite';

    export default ({ mode }) => {
      // loadEnv 接受 mode 和 envDir 作为参数
      const env = loadEnv(mode, process.cwd());

      return defineConfig({
        server: {
          // 使用环境变量来配置代理
          proxy: {
            '/api': {
              target: env.VITE_API_URL,
              changeOrigin: true,
            },
          },
        },
      });
    };
    ```

2.  **在前端代码中**：通过特殊的 `import.meta.env` 对象访问。这是 Vite 暴露给客户端代码的唯一方式。我们将在下一章详细探讨它。

## 16.4. mini-vite 的实现

让我们在 `mini-vite` 中实现一个简化版的 `loadEnv` 函数。这个函数将根据给定的模式，读取并解析相应的 `.env` 文件。

```javascript
// src/config.js

import { promises as fs } from 'fs';
import path from 'path';
import { parse } from 'dotenv'; // 需要安装 dotenv 库: npm i dotenv

/**
 * 加载 .env 文件
 * @param {string} mode - 当前模式
 * @param {string} envDir - .env 文件所在的目录
 * @returns {object} - 解析后的环境变量对象
 */
export async function loadEnv(mode, envDir) {
  const env = {};
  const envFiles = [
    `.env`,
    `.env.local`,
    `.env.${mode}`,
    `.env.${mode}.local`,
  ];

  for (const file of envFiles) {
    try {
      const filePath = path.join(envDir, file);
      const content = await fs.readFile(filePath, 'utf-8');
      const parsed = parse(content); // 使用 dotenv 解析文件内容

      // 将解析出的变量合并到 env 对象中
      Object.assign(env, parsed);
    } catch (e) {
      // 文件不存在，直接忽略
      if (e.code !== 'ENOENT') {
        throw e;
      }
    }
  }

  return env;
}
```

在这个实现中：

1.  我们依赖 `dotenv` 这个久经考验的库来解析 `.env` 文件的语法。
2.  我们定义了与 Vite 相同的 `envFiles` 加载顺序（这里为了简化，是从低到高，后加载的会覆盖先加载的）。
3.  我们遍历这个列表，尝试读取并解析每一个文件。
4.  如果文件不存在（`ENOENT` 错误），我们就静默地忽略它，这是符合预期的行为。
5.  通过 `Object.assign`，我们实现了高优先级文件覆盖低优先级文件的效果。

通过本章的学习，我们掌握了 Vite 环境管理的核心机制。现在，我们的 `mini-vite` 也拥有了加载和解析 `.env` 文件的能力，为后续实现环境变量的前端暴露打下了坚实的基础。
