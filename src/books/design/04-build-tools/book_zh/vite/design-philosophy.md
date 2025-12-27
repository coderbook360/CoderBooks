# Vite 设计理念与架构

> Vite 是新一代前端构建工具，它利用浏览器原生 ES 模块和现代 JavaScript 特性，提供极快的开发体验。理解其设计理念对于高效使用 Vite 至关重要。

## Vite 的核心理念

### 问题：传统构建工具的瓶颈

```
传统构建流程（Webpack）
┌─────────────────────────────────────┐
│  源代码                              │
│    ↓                                │
│  解析所有模块                        │ ← 启动慢
│    ↓                                │
│  构建依赖图                          │
│    ↓                                │
│  打包所有代码                        │
│    ↓                                │
│  开发服务器就绪                       │
└─────────────────────────────────────┘
时间：项目越大越慢（可能数分钟）
```

### 解决：Vite 的双引擎架构

```
Vite 开发模式
┌─────────────────────────────────────┐
│  预构建依赖（esbuild）               │ ← 一次性，极快
│    ↓                                │
│  开发服务器立即启动                   │ ← 毫秒级
│    ↓                                │
│  浏览器请求模块时按需编译              │ ← 原生 ESM
└─────────────────────────────────────┘

Vite 生产模式
┌─────────────────────────────────────┐
│  Rollup 打包                         │ ← 成熟稳定
│    ↓                                │
│  优化的生产构建                       │
└─────────────────────────────────────┘
```

## 核心设计原则

### 1. 原生 ES 模块（Native ESM）

```typescript
// 浏览器直接支持 ES 模块
<script type="module" src="/src/main.ts"></script>

// main.ts
import { createApp } from 'vue';      // 浏览器发起请求
import App from './App.vue';          // 按需加载
import './styles/index.css';          // Vite 处理

createApp(App).mount('#app');
```

**工作原理**：

```
浏览器请求流程

1. 浏览器请求 main.ts
   ↓
2. Vite 开发服务器接收请求
   ↓
3. Vite 即时编译 TypeScript → JavaScript
   ↓
4. 返回编译后的代码（保留 import 语句）
   ↓
5. 浏览器解析 import，发起新请求
   ↓
6. 重复步骤 2-5 直到所有模块加载完成
```

### 2. 依赖预构建（Dependency Pre-Bundling）

```typescript
// vite.config.ts
export default defineConfig({
  optimizeDeps: {
    // 预构建的依赖
    include: ['lodash-es', 'axios'],
    
    // 排除不需要预构建的依赖
    exclude: ['your-local-package'],
  },
});
```

**为什么需要预构建**：

```typescript
// 问题 1: CommonJS 转 ESM
// lodash 是 CommonJS 格式
import { debounce } from 'lodash';  // ❌ 浏览器不支持

// Vite 预构建后
import { debounce } from '/node_modules/.vite/lodash.js'; // ✅ ESM

// 问题 2: 减少请求数量
// lodash-es 有 600+ 个模块
import { debounce } from 'lodash-es';
// 如果不预构建，可能触发 600+ 个请求

// Vite 预构建：将 lodash-es 打包成单个文件
```

### 3. 热模块替换（HMR）

```typescript
// Vite 的 HMR API
if (import.meta.hot) {
  // 接受自身更新
  import.meta.hot.accept();
  
  // 接受依赖更新
  import.meta.hot.accept('./module.js', (newModule) => {
    // 使用新模块
  });
  
  // 清理副作用
  import.meta.hot.dispose(() => {
    // 清理代码
  });
}

// Vue/React 组件自动支持 HMR
// 修改组件时，只更新该组件，保持状态
```

**HMR 精确更新**：

```
传统 HMR（Webpack）
修改组件 → 整个模块树重新编译 → 刷新

Vite HMR
修改组件 → 只编译该组件 → 精确替换

结果：修改到反馈 < 50ms
```

## 架构详解

### 开发服务器架构

```typescript
// Vite 开发服务器简化架构
interface ViteDevServer {
  // HTTP 服务器
  httpServer: http.Server;
  
  // WebSocket 服务器（用于 HMR）
  ws: WebSocketServer;
  
  // 模块图
  moduleGraph: ModuleGraph;
  
  // 插件容器
  pluginContainer: PluginContainer;
  
  // 文件监听器
  watcher: FSWatcher;
  
  // 中间件
  middlewares: Connect.Server;
}

// 请求处理流程
async function handleRequest(url: string) {
  // 1. 检查是否是依赖（node_modules）
  if (isOptimizedDep(url)) {
    return serveOptimizedDep(url);
  }
  
  // 2. 执行插件的 resolveId
  const resolved = await pluginContainer.resolveId(url);
  
  // 3. 执行插件的 load
  let code = await pluginContainer.load(resolved.id);
  
  // 4. 执行插件的 transform
  code = await pluginContainer.transform(code, resolved.id);
  
  // 5. 返回转换后的代码
  return code;
}
```

### 插件系统

```typescript
// Vite 插件兼容 Rollup 插件
import type { Plugin } from 'vite';

function myPlugin(): Plugin {
  return {
    name: 'my-plugin',
    
    // Vite 特有钩子
    configureServer(server) {
      // 配置开发服务器
      server.middlewares.use((req, res, next) => {
        // 自定义中间件
        next();
      });
    },
    
    // Rollup 兼容钩子
    resolveId(id) {
      if (id === 'virtual:my-module') {
        return id;
      }
    },
    
    load(id) {
      if (id === 'virtual:my-module') {
        return 'export default "Hello from virtual module"';
      }
    },
    
    transform(code, id) {
      if (id.endsWith('.custom')) {
        return transformCustomFormat(code);
      }
    },
  };
}
```

## 与 Webpack 的对比

| 特性 | Vite | Webpack |
|------|------|----------|
| 开发启动 | 毫秒级 | 秒/分钟级 |
| HMR 速度 | < 50ms | 100ms - 数秒 |
| 配置复杂度 | 简单 | 复杂 |
| 生态成熟度 | 快速增长 | 非常成熟 |
| 生产构建 | Rollup | Webpack |
| 浏览器支持 | 现代浏览器 | 可配置 |

## 总结

Vite 的设计理念：

1. **原生 ESM**：利用浏览器原生能力，按需编译
2. **预构建**：使用 esbuild 快速处理依赖
3. **精确 HMR**：只更新变化的模块
4. **双引擎**：开发用 esbuild/ESM，生产用 Rollup

Vite 适合：
- 现代浏览器项目
- 追求开发体验
- Vue/React/Svelte 项目
- 中大型项目