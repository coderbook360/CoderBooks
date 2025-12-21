# Vue Router 4 架构设计解析

上一章我们理解了前端路由的演进历史。现在，我们要问一个关键问题：**如何设计一个生产级的路由库？**

Vue Router 4 经过多年演进，形成了清晰的模块化架构。在动手实现 Mini Vue Router 之前，先建立全局视角。

## 一个路由库需要什么

从用户的使用场景出发，我们需要：

**基础功能**：
- 定义路由规则（路径 → 组件）
- 切换路由（push/replace/go）
- 监听路由变化并渲染对应组件

**高级功能**：
- 动态路由匹配（`/user/:id`）
- 嵌套路由（父子路由）
- 命名路由和命名视图
- 路由守卫（权限控制）
- 懒加载（代码分割）
- 滚动行为控制

思考一下，要实现这些功能，需要哪些模块？

## Vue Router 4 核心模块

Vue Router 4 的架构可以分为五大核心模块：

### 1. History 模块：URL 管理

**职责**：封装不同的 URL 操作方式。

无论是 Hash 模式、History 模式，还是 Memory 模式，对外提供统一的接口：

```typescript
interface RouterHistory {
  location: string;              // 当前路径
  state: StateEntry;             // 当前状态
  push(to: string): void;        // 跳转
  replace(to: string): void;     // 替换
  go(delta: number): void;       // 前进/后退
  listen(callback: NavigationCallback): () => void;  // 监听变化
}
```

**为什么这样设计？**

因为底层 API 不同（`location.hash` vs `history.pushState`），但路由逻辑应该与底层无关。通过接口抽象，让上层代码可以无感切换模式。

### 2. Matcher 模块：路由匹配

**职责**：管理路由表，匹配路径到路由记录。

```typescript
interface RouterMatcher {
  addRoute(record: RouteRecordRaw): () => void;  // 添加路由
  removeRoute(name: string | symbol): void;      // 删除路由
  getRoutes(): RouteRecord[];                    // 获取所有路由
  resolve(location: string): RouteLocationNormalized;  // 解析路径
}
```

这是 Vue Router 最复杂的模块，需要处理：

- **路径解析**：`/user/:id` → 正则表达式
- **参数提取**：`/user/123` → `{ id: '123' }`
- **嵌套匹配**：父路由 + 子路由
- **优先级排序**：静态路由 > 动态路由 > 通配符

### 3. Router 模块：核心控制器

**职责**：协调各个模块，提供对外 API。

```typescript
interface Router {
  currentRoute: RouteLocationNormalizedLoaded;  // 当前路由
  options: RouterOptions;                       // 配置选项
  
  // 导航方法
  push(to: RouteLocationRaw): Promise<void>;
  replace(to: RouteLocationRaw): Promise<void>;
  go(delta: number): void;
  back(): void;
  forward(): void;
  
  // 路由管理
  addRoute(parentName: string, route: RouteRecordRaw): void;
  removeRoute(name: string): void;
  hasRoute(name: string): boolean;
  getRoutes(): RouteRecord[];
  resolve(to: RouteLocationRaw): RouteLocation;
  
  // 守卫
  beforeEach(guard: NavigationGuard): () => void;
  afterEach(guard: NavigationHookAfter): () => void;
  
  // Vue 集成
  install(app: App): void;
}
```

Router 是整个库的门面，它内部协调：
- 使用 **History** 监听 URL 变化
- 使用 **Matcher** 匹配路由
- 触发 **守卫队列**
- 更新 **响应式路由状态**

### 4. Guards 模块：导航守卫

**职责**：在路由切换过程中执行拦截逻辑。

守卫执行流程：

```
导航触发
  ↓
beforeRouteLeave (组件内守卫)
  ↓
beforeEach (全局前置守卫)
  ↓
beforeRouteUpdate (复用组件守卫)
  ↓
beforeEnter (路由独享守卫)
  ↓
beforeRouteEnter (组件内守卫)
  ↓
beforeResolve (全局解析守卫)
  ↓
导航确认
  ↓
afterEach (全局后置钩子)
  ↓
DOM 更新
  ↓
beforeRouteEnter 的 next 回调
```

每个守卫可以：
- 继续导航：`next()`
- 取消导航：`next(false)`
- 重定向：`next('/login')`
- 返回 Promise（异步守卫）

**设计挑战**：如何构建一个可扩展的异步队列执行机制？

### 5. Integration 模块：Vue 集成

**职责**：将路由与 Vue 组件系统结合。

核心组件：

```vue-html
<!-- RouterView：路由出口 -->
<router-view />

<!-- RouterLink：导航链接 -->
<router-link to="/user">用户页</router-link>
```

Composition API：

```javascript
import { useRouter, useRoute } from 'vue-router';

const router = useRouter();  // Router 实例
const route = useRoute();    // 当前路由（响应式）

// 使用
router.push('/home');
console.log(route.params.id);
```

**技术要点**：
- 使用 Vue 的 **provide/inject** 实现依赖注入
- 使用 Vue 的 **响应式系统** 驱动组件更新
- 利用 Vue 的 **插件机制** 注册全局组件

## 架构图解

```
                    用户操作
                       ↓
        ┌──────────────────────────────┐
        │        Router 实例            │
        │  (核心控制器，协调各模块)      │
        └──────────────────────────────┘
                 ↓     ↓     ↓
         ┌───────┐ ┌────────┐ ┌─────────┐
         │History│ │Matcher │ │ Guards  │
         │ 模块  │ │  模块  │ │  模块   │
         └───────┘ └────────┘ └─────────┘
              ↓         ↓          ↓
        监听URL变化  匹配路由    执行守卫
              ↓         ↓          ↓
        ┌────────────────────────────────┐
        │     Vue Integration 模块        │
        │  (RouterView/RouterLink/Hooks) │
        └────────────────────────────────┘
                       ↓
                  渲染组件
```

## 数据流转过程

让我们追踪一次完整的路由跳转：

**场景**：用户点击 `<router-link to="/user/123">`

### 步骤1：触发导航

```javascript
// RouterLink 内部调用
router.push('/user/123');
```

### 步骤2：Router 调用 Matcher 解析路径

```javascript
const resolved = matcher.resolve('/user/123');
// 返回：
// {
//   name: 'User',
//   path: '/user/123',
//   params: { id: '123' },
//   matched: [{ path: '/user/:id', component: UserComponent }]
// }
```

### 步骤3：执行导航守卫队列

```javascript
// 按顺序执行所有守卫
await executeGuards([
  ...beforeRouteLeaveGuards,
  ...globalBeforeEachGuards,
  ...routeBeforeEnterGuards,
  ...beforeRouteEnterGuards,
  ...globalBeforeResolveGuards
]);
```

如果任何守卫返回 `false` 或重定向，导航中断。

### 步骤4：更新 History

```javascript
history.push('/user/123');
```

浏览器 URL 更新为 `/user/123`，但页面不刷新。

### 步骤5：更新响应式路由

```javascript
currentRoute.value = resolved;
```

所有依赖 `currentRoute` 的组件自动更新。

### 步骤6：RouterView 渲染新组件

```javascript
// RouterView 内部逻辑
const component = currentRoute.value.matched[depth].component;
return h(component);
```

### 步骤7：执行后置钩子

```javascript
globalAfterEachGuards.forEach(guard => guard(to, from));
```

### 步骤8：滚动行为

```javascript
if (scrollBehavior) {
  const position = scrollBehavior(to, from, savedPosition);
  scrollToPosition(position);
}
```

完整流程结束。

## 关键设计思想

### 1. 模块化与职责分离

每个模块只负责一件事：
- History 只管 URL
- Matcher 只管匹配
- Router 只做协调

好处：**易测试、易扩展、易维护**。

### 2. 抽象接口与多态

History 接口统一了三种模式的差异，让上层代码无需关心底层实现。

这是典型的**策略模式**：行为可以在运行时替换。

### 3. 异步流程控制

路由跳转是异步的，守卫可能返回 Promise。Vue Router 构建了一套完整的异步队列机制。

### 4. 响应式驱动

利用 Vue 3 的响应式系统，当路由变化时，所有依赖路由的组件自动更新，无需手动订阅。

### 5. TypeScript 类型安全

Vue Router 4 完全使用 TypeScript 编写，提供了完善的类型推导：

```typescript
const router = createRouter({ ... });
const route = useRoute();

// TypeScript 自动推导 params 类型
route.params.id;  // string | string[]
```

## 与 Vue Router 3 的对比

Vue Router 4 相比 3 有重大改进：

| 特性 | Vue Router 3 | Vue Router 4 |
|------|--------------|--------------|
| Vue 版本 | Vue 2 | Vue 3 |
| 响应式系统 | Vue 2 响应式 | Composition API |
| TypeScript | 部分支持 | 完全类型安全 |
| 动态路由 | `addRoutes` | `addRoute/removeRoute` |
| 导航返回值 | 无 | Promise |
| History 抽象 | 紧耦合 | 完全解耦 |
| 包体积 | 较大 | 更小（Tree-shaking） |

**关键改进**：

1. **更好的 TypeScript 支持**：完全重写，类型推导更准确
2. **更灵活的动态路由**：可以删除路由，返回删除函数
3. **Promise 化导航**：`router.push()` 返回 Promise，可以 `await`
4. **更现代的 API**：拥抱 Composition API

## 总结

Vue Router 4 的架构设计体现了：

**模块化**：History、Matcher、Guards、Router、Integration 各司其职。

**抽象化**：通过接口统一不同模式的差异。

**响应式**：利用 Vue 3 响应式系统驱动组件更新。

**异步化**：完整的异步导航流程控制。

**类型安全**：完全的 TypeScript 支持。

**核心思想**：将复杂的路由功能分解为多个独立模块，通过清晰的接口组合，形成强大的路由系统。

下一章，我们将详细定义路由系统中的核心概念与术语，为后续的代码实现打下理论基础。
