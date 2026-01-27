# 项目架构设计

在动手实现之前，我们需要规划 mini-router 的整体架构。一个好的架构让代码更易理解和扩展。

## 目标定义

我们的 mini-router 将实现以下核心功能：

1. 路由匹配与渲染
2. 编程式导航
3. 导航守卫
4. 响应式路由状态

我们不会实现的高级功能：

- 命名视图
- 路由别名
- 滚动行为
- 路由懒加载（虽然可以配合使用）

## 模块划分

```
mini-router/
├── index.ts          # 入口，导出 API
├── router.ts         # createRouter 实现
├── matcher.ts        # 路由匹配
├── history.ts        # 历史管理
├── components/
│   ├── RouterView.ts
│   └── RouterLink.ts
├── composables/
│   ├── useRouter.ts
│   └── useRoute.ts
└── types.ts          # 类型定义
```

## 类型设计

先定义核心类型，这是 TypeScript 项目的基础：

```typescript
// types.ts

// 路由配置
export interface RouteRecordRaw {
  path: string
  name?: string
  component: Component
  children?: RouteRecordRaw[]
  meta?: Record<string, any>
  beforeEnter?: NavigationGuard | NavigationGuard[]
}

// 规范化后的路由记录
export interface RouteRecordNormalized {
  path: string
  name?: string
  component: Component
  meta: Record<string, any>
  parent?: RouteRecordNormalized
}

// 路由位置
export interface RouteLocationNormalized {
  path: string
  name?: string
  params: Record<string, string>
  query: Record<string, string>
  hash: string
  matched: RouteRecordNormalized[]
  meta: Record<string, any>
  fullPath: string
}

// 导航守卫
export type NavigationGuard = (
  to: RouteLocationNormalized,
  from: RouteLocationNormalized
) => void | false | string | RouteLocationRaw | Promise<void | false | string | RouteLocationRaw>

// 路由器选项
export interface RouterOptions {
  history: RouterHistory
  routes: RouteRecordRaw[]
}

// 历史接口
export interface RouterHistory {
  location: string
  push(to: string): void
  replace(to: string): void
  go(delta: number): void
  listen(callback: (to: string, from: string) => void): () => void
}
```

## 核心流程

简化的导航流程：

```
push(to)
    ↓
resolve(to)      // 匹配路由
    ↓
runGuards()      // 执行守卫
    ↓
updateURL()      // 更新浏览器 URL
    ↓
updateRoute()    // 更新响应式状态
```

## Router 接口

```typescript
export interface Router {
  // 当前路由
  currentRoute: ShallowRef<RouteLocationNormalized>
  
  // 导航方法
  push(to: RouteLocationRaw): Promise<void>
  replace(to: RouteLocationRaw): Promise<void>
  go(delta: number): void
  back(): void
  forward(): void
  
  // 守卫
  beforeEach(guard: NavigationGuard): () => void
  afterEach(guard: NavigationHookAfter): () => void
  
  // 解析
  resolve(to: RouteLocationRaw): RouteLocationNormalized
  
  // 安装
  install(app: App): void
}
```

## 依赖关系

```
Router
  ├── 依赖 History（管理 URL）
  ├── 依赖 Matcher（匹配路由）
  └── 提供给 Components（RouterView/RouterLink）
       └── 通过 provide/inject
```

## 实现策略

我们采用渐进式实现：

1. **第一步**：实现 History，管理 URL
2. **第二步**：实现 Matcher，匹配路由
3. **第三步**：实现 Router，组合功能
4. **第四步**：实现组件，渲染 UI
5. **第五步**：添加守卫，完善功能

## 开发环境

创建项目：

```bash
npm create vite@latest mini-router-demo -- --template vue-ts
cd mini-router-demo
npm install
```

项目结构：

```
mini-router-demo/
├── src/
│   ├── mini-router/    # 我们的路由实现
│   ├── views/          # 测试用的页面
│   ├── App.vue
│   └── main.ts
└── package.json
```

## 本章小结

开始编码前，我们明确了：

1. **目标功能**：核心路由功能
2. **模块划分**：history、matcher、router、components
3. **类型定义**：TypeScript 接口
4. **实现策略**：渐进式开发

接下来，我们开始逐个模块实现。
