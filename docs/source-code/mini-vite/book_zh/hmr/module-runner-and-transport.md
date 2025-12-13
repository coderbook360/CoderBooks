## 模块运行器与传输

在前面的章节中，我们已经成功地在服务器端监听文件变更并构建了模块依赖图。现在，我们面临着 HMR（热模块替换）中最关键的一步：如何将这些变更实时地应用到浏览器中，替换旧的模块逻辑，同时避免完整的页面刷新？

这个过程可以分解为两个核心问题：

1.  **通信问题 (Transport)**: 服务器如何高效、低延迟地通知浏览器“哪个文件变了”？
2.  **执行问题 (Runner)**: 浏览器收到通知后，如何安全地请求新模块、执行新代码，并处理模块间的依赖关系，最终实现“热替换”？

本章，我们将深入客户端，构建 HMR 的核心运行时，打通这“最后一公里”。

### 通信层：WebSocket 登场

为了实现服务器到客户端的实时推送，**WebSocket** 是最理想的选择。与轮询等方式相比，它提供了一个持久化的全双工通信渠道，延迟极低。

我们的任务分为两部分：

1.  **服务器端**：集成一个 WebSocket 服务器。当文件变更并分析完依赖后，服务器将一个标准化的 HMR 消息（我们称之为 **HMR 载荷 (Payload)**）通过 WebSocket 连接广播给所有连接的客户端。
2.  **客户端**：我们需要向浏览器注入一段 `client` 脚本。该脚本负责连接 WebSocket 服务器，并监听 `message` 事件，以便接收 HMR 载荷。

一个典型的 HMR 载荷（Payload）是一个 JSON 对象，它清晰地描述了更新的类型和内容：

```json
{
  "type": "update",
  "updates": [
    {
      "type": "js-update",
      "path": "/src/foo.js",
      "acceptedPath": "/src/bar.js",
      "timestamp": 1625473358000
    }
  ]
}
```

-   `type`: 消息类型，如 `update`、`full-reload`、`error` 等。
-   `path`: 发生变更的模块路径。
-   `acceptedPath`: 模块图中能够“接受”这次更新的边界模块路径。
-   `timestamp`: 时间戳，用于打破浏览器缓存。

在客户端 `client.js` 中，我们可以这样建立连接并处理消息：

```javascript
// client.js - 注入到浏览器的 HMR 客户端运行时
const socket = new WebSocket(`ws://${location.host}`);

socket.addEventListener('message', async ({ data }) => {
  const payload = JSON.parse(data);
  if (payload.type === 'update') {
    // 收到更新通知，准备执行热更新
    handleUpdate(payload);
  }
});
```

### 模块运行器：动态导入的魔力

当客户端收到 `update` 通知后，“模块运行器” (Module Runner) 就该上场了。它的核心职责是获取并执行更新后的模块代码。

现代浏览器提供的 **动态导入 `import()`** 是实现这一目标的关键。它允许我们在运行时异步加载 ES 模块。然而，直接 `import('/src/foo.js')` 会遇到一个问题：浏览器会使用其内部缓存，导致我们可能无法获取到最新的文件内容。

解决方案简单而有效：在模块路径后附加一个唯一的时间戳查询参数，以强制绕过缓存。

```javascript
// client.js - 模块运行器的核心
async function fetchUpdate({ path, timestamp }) {
  const module = await import(
    /* @vite-ignore */
    path + '?t=' + timestamp
  );
  return module;
}
```

> **注意**: `/* @vite-ignore */` 这段注释至关重要。许多现代构建工具（包括 Vite 和 Rollup）在编译时会尝试静态分析 `import()` 的参数，如果参数是动态拼接的变量，会抛出警告或构建错误，因为它无法确定需要预打包哪些模块。这段注释明确告诉构建工具：“忽略我，这是一个有意的、纯运行时的动态导入。”

### HMR 边界：`import.meta.hot`

仅仅获取到新模块还不够。直接执行新模块的代码会重新声明变量和函数，但无法替换掉那些已经被旧模块引用和使用的部分。我们需要一个机制，让模块能够“优雅地”处理自身的更新，这就是 **HMR 边界 (HMR Boundary)**。

Vite 遵循社区标准，通过 `import.meta.hot` 对象向模块暴露 HMR API。其中最核心的是 `import.meta.hot.accept()`。

当一个模块（例如 `bar.js`）调用 `import.meta.hot.accept('./foo.js', (newFoo) => { ... })` 时，它声明了一个 HMR 边界。这意味着：

-   `bar.js` 能够处理其依赖 `foo.js` 的更新。
-   当 `foo.js` 变更时，HMR 更新的传播将在此处停止。
-   HMR 运行时会执行 `accept` 提供的回调函数，并将 `foo.js` 的新模块对象作为参数 `newFoo` 传入。

在 HMR 客户端内部，我们需要一个地方来存储这些“接受者”关系。一个 `Map` 结构是理想的选择：

```javascript
// client.js
const hotModulesMap = new Map(); // key: 模块路径, value: { owners: Set, acceptCallbacks: Set }

// 在每个模块被加载时，为其创建一个 hot 上下文
export const createHotContext = (ownerPath) => {
  const hot = {
    accept(deps, callback) {
      // 简化逻辑：将回调注册到 hotModulesMap 中
      // ...
    },
    dispose(callback) {
      // 注册清理回调
      // ...
    }
  };
  return hot;
};
```

当 `fetchUpdate` 获取到新模块后，它会查询 `hotModulesMap`，找到对应的 `accept` 回调并执行它们，从而将新模块的逻辑“注入”到正在运行的应用中。

### 更新的传播与降级

并非所有模块都会调用 `import.meta.hot.accept`。如果一个变更的模块（如 `A.js`）自身没有处理更新，HMR 运行时必须足够智能，沿着模块图向上追溯：

1.  `A.js` 变更了，它自己能处理吗？-> 否。
2.  谁导入了 `A.js`？-> `B.js`。`B.js` 能处理 `A.js` 的更新吗？-> 否。
3.  谁导入了 `B.js`？-> `C.js`。`C.js` 能处理 `B.js` 的更新吗？-> 是！
4.  HMR 传播停止。客户端重新请求并执行 `C.js` 的 `accept` 回调。

这个追溯过程通常在服务器端完成，并将最终的 `acceptedPath` (`C.js` 的路径) 发送给客户端。

**那如果一直追溯到入口点都没有找到接受者呢？**

这就是 HMR 的最终降级策略：执行 `location.reload()`，进行一次完整的页面刷新。虽然这破坏了“热更新”的体验，但它保证了页面状态始终与最新的代码一致。

### 清理副作用：`dispose` 回调

现代前端模块常常会产生副作用（Side Effects），例如：

-   向 `document.body` 添加 DOM 节点。
-   设置一个 `setInterval` 定时器。
-   初始化一个全局事件监听器。

当模块被热替换时，旧模块的这些副作用需要被清理掉，否则会导致内存泄漏或应用行为异常（例如，定时器重复执行）。`import.meta.hot.dispose()` API 就是为此而生。

```javascript
// a-module-with-side-effects.js
const timer = setInterval(() => {
  console.log('tick');
}, 1000);

import.meta.hot.dispose(() => {
  // 在模块被替换前，清理定时器
  clearInterval(timer);
});
```

在 HMR 运行时中，当一个模块即将被新版本替换时（即在执行 `accept` 回调之前），必须先执行其旧版本注册的 `dispose` 回调。这确保了应用状态的纯净和可预测性。

### 总结

本章，我们构建了 `mini-vite` HMR 机制的客户端核心。我们利用 WebSocket 作为高效的**传输层**，并实现了一个基于动态 `import()` 的**模块运行器**。通过 `import.meta.hot` API（特别是 `accept` 和 `dispose`），我们建立了一套完整的模块更新、边界处理和副作用清理机制。同时，我们也定义了从更新传播到页面重载的完整处理链路和降级策略，确保了 HMR 的健壮性。
