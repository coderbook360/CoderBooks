# 源码结构与阅读指南

阅读框架源码是提升技术深度的有效途径，但面对一个成熟项目的代码库，很容易迷失方向。这一章提供 Vue Router 源码的地图，帮助你建立整体认知，找到阅读的切入点。

## 获取源码

Vue Router 的源码托管在 GitHub：

```bash
git clone https://github.com/vuejs/router.git
cd router
```

我们分析的是 Vue Router 4.x 版本，它是为 Vue 3 设计的。如果你还在使用 Vue 2，对应的是 Vue Router 3.x，两者架构有显著差异。

安装依赖后可以运行测试，确保代码处于可工作状态：

```bash
pnpm install
pnpm test
```

## 目录结构

打开项目根目录，核心源码在 `packages/router/src` 下：

```
packages/router/src/
├── history/           # History 模式实现
│   ├── common.ts      # 公共工具和类型
│   ├── html5.ts       # createWebHistory
│   ├── hash.ts        # createWebHashHistory
│   └── memory.ts      # createMemoryHistory
├── matcher/           # 路由匹配器
│   ├── index.ts       # 匹配器入口
│   ├── pathMatcher.ts # 路径匹配逻辑
│   ├── pathParserRanker.ts # 路径解析与排序
│   └── pathTokenizer.ts    # 路径分词
├── encoding.ts        # URL 编码处理
├── errors.ts          # 错误定义
├── injectionSymbols.ts # provide/inject 的 key
├── navigationGuards.ts # 导航守卫逻辑
├── query.ts           # 查询字符串处理
├── router.ts          # Router 主类
├── RouterLink.ts      # RouterLink 组件
├── RouterView.ts      # RouterView 组件
├── scrollBehavior.ts  # 滚动行为
├── types/             # TypeScript 类型定义
├── useApi.ts          # Composition API 导出
└── utils/             # 工具函数
```

这个结构清晰地反映了功能划分：History 模块处理 URL，Matcher 模块处理匹配，Router 是中央协调者，组件负责渲染。

## 阅读顺序建议

不建议从 `router.ts` 开始——它是所有逻辑的汇合点，一上来就读会很困难。建议的阅读顺序是从边缘模块开始，逐步向核心靠拢：

**第一阶段：基础模块**

从 `types/` 目录开始，了解核心数据结构。`RouteLocationNormalized`、`RouteRecordNormalized`、`NavigationGuard` 这些类型定义了系统的骨架。

然后读 `encoding.ts` 和 `query.ts`，这两个是工具模块，逻辑相对独立，能快速建立成就感。

**第二阶段：History 模块**

按顺序阅读：

1. `history/common.ts` — 公共工具和基础类型
2. `history/html5.ts` — 最常用的 History 模式
3. `history/hash.ts` — Hash 模式，会复用 html5 的部分逻辑
4. `history/memory.ts` — 最简单的实现

History 模块相对独立，可以单独理解。

**第三阶段：Matcher 模块**

这是算法密集的部分：

1. `matcher/pathTokenizer.ts` — 路径分词
2. `matcher/pathParserRanker.ts` — 路径解析和排序
3. `matcher/pathMatcher.ts` — 单个路由的匹配器
4. `matcher/index.ts` — 匹配器的整体协调

理解 Matcher 需要一些正则表达式和编译器的基础知识。

**第四阶段：导航与守卫**

1. `navigationGuards.ts` — 守卫的执行逻辑
2. `router.ts` 中的 `push`、`navigate` 等方法

这部分涉及异步流程控制，需要耐心跟踪。

**第五阶段：组件**

1. `RouterView.ts`
2. `RouterLink.ts`
3. `useApi.ts`

这部分与 Vue 的渲染系统紧密相关，需要了解 Vue 的 `h()` 函数和 Composition API。

**第六阶段：Router 主类**

最后回到 `router.ts`，此时你已经了解了各个模块，能够理解它们如何被组装在一起。

## 调试技巧

阅读源码不只是看，还要运行和调试。

**创建最小测试用例**：

```javascript
// playground/main.ts
import { createRouter, createWebHistory } from '../src'
import { createApp, h } from 'vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: { render: () => h('div', 'Home') } },
    { path: '/about', component: { render: () => h('div', 'About') } }
  ]
})

const app = createApp({
  render: () => h('div', [
    h('router-link', { to: '/' }, 'Home'),
    h('router-link', { to: '/about' }, 'About'),
    h('router-view')
  ])
})

app.use(router)
app.mount('#app')
```

**使用断点**：

在 VS Code 中，配置 launch.json 来调试测试或示例：

```json
{
  "type": "node",
  "request": "launch",
  "name": "Debug Tests",
  "program": "${workspaceFolder}/node_modules/vitest/vitest.mjs",
  "args": ["--run", "--no-coverage"],
  "cwd": "${workspaceFolder}/packages/router"
}
```

**添加日志**：

有时候最简单的方法最有效。在关键位置添加 `console.log`，观察执行流程：

```typescript
// 在 navigate 函数开头添加
console.log('navigate called:', to, from)
```

## 阅读源码的心态

源码阅读是一个渐进的过程。第一遍可能只能理解 30%，这很正常。不要试图一次性搞懂所有细节。

**先抓主干**：理解函数的输入输出和主要流程，忽略边界情况处理。

**善用测试**：测试用例是最好的文档。看一个函数不明白时，找到它的测试用例，通过用例理解预期行为。

```bash
# 运行特定测试文件
pnpm test packages/router/__tests__/router.spec.ts
```

**阅读提交历史**：有些代码的意图不明显时，`git blame` 可以找到引入这段代码的提交，提交信息往往解释了原因。

**对照文档**：官方文档描述的是行为，源码展示的是实现。两者对照阅读效果更好。

## 需要的前置知识

有效阅读 Vue Router 源码，需要这些基础：

**JavaScript/TypeScript**：源码使用 TypeScript 编写，需要理解泛型、类型推导、类型守卫等概念。

**Vue 3 Composition API**：`ref`、`reactive`、`computed`、`provide`/`inject`、渲染函数。

**浏览器 API**：History API（`pushState`、`replaceState`、`popstate`）、Location 对象。

**正则表达式**：Matcher 模块大量使用正则。

**Promise 和异步**：导航守卫涉及复杂的异步流程。

如果某个领域不熟悉，遇到时再补充，不需要一开始就全部准备好。

## 本章小结

Vue Router 源码约 5000 行（不含测试），规模适中，是学习框架设计的好材料。代码组织清晰，模块边界明确。

建议从类型定义和工具模块开始，逐步深入到 History、Matcher、导航守卫，最后理解 Router 主类如何协调各模块。

结合断点调试和测试用例，比单纯阅读更有效。保持耐心，多次迭代，每一遍都会有新的收获。
