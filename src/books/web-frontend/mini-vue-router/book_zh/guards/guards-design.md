# 导航守卫设计思想

> "好的架构不是限制自由，而是在正确的地方提供控制点。"

在构建真实应用时，我们经常需要在路由跳转的过程中执行一些逻辑：检查用户是否登录、验证权限、保存未提交的表单、记录页面访问日志... 这些需求有一个共同点——它们都需要**拦截**路由导航，在特定时机执行特定逻辑。

本章我们将深入理解 Vue Router 导航守卫的设计思想，为后续实现打下坚实的理论基础。

## 从真实需求出发

### 场景一：登录验证

```javascript
// 用户访问 /dashboard，但未登录
// 期望：自动重定向到 /login
```

### 场景二：权限控制

```javascript
// 普通用户访问 /admin/settings
// 期望：显示"无权限"或重定向到首页
```

### 场景三：表单保护

```javascript
// 用户在表单页面填写了内容，但未保存就要离开
// 期望：弹出确认框"确定要离开吗？未保存的内容将丢失"
```

### 场景四：数据预加载

```javascript
// 进入文章详情页前，需要先加载文章数据
// 期望：数据加载完成后再渲染页面
```

**思考一下**：如果让你设计一个系统来满足这些需求，你会怎么做？

## 设计思想：AOP 与中间件模式

### 什么是 AOP（面向切面编程）？

AOP 的核心思想是：**在不修改原有逻辑的情况下，在特定时机插入额外的处理逻辑**。

```javascript
// 没有 AOP 的做法：把验证逻辑硬编码到每个页面
const Dashboard = {
  created() {
    if (!isLoggedIn()) {
      this.$router.push('/login');
      return;
    }
    // 正常的页面逻辑...
  }
};

// 有 AOP 的做法：在路由层面统一处理
router.beforeEach((to) => {
  if (to.meta.requiresAuth && !isLoggedIn()) {
    return '/login';
  }
});
```

**AOP 的优势**：
- **关注点分离**：认证逻辑与业务逻辑分离
- **代码复用**：一处定义，处处生效
- **易于维护**：修改认证规则只需改一个地方

### 中间件模式

如果你熟悉 Express 或 Koa，你会发现导航守卫与中间件非常相似：

```javascript
// Express 中间件
app.use((req, res, next) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }
  next();  // 继续下一个中间件
});

// Vue Router 守卫
router.beforeEach((to, from) => {
  if (!isLoggedIn()) {
    return '/login';  // 重定向
  }
  // 不返回任何值 = 继续导航
});
```

**核心相似点**：
1. 按顺序执行
2. 可以中断执行链
3. 可以修改请求/导航的目标

## 守卫的本质：可取消的异步钩子

**首先要问一个问题**：守卫函数应该返回什么？

Vue Router 4 的设计非常优雅，守卫的返回值直接决定导航行为：

```typescript
type NavigationGuardReturn =
  | void           // 继续导航（什么都不返回）
  | true           // 继续导航（显式确认）
  | false          // 取消导航
  | string         // 重定向到指定路径
  | RouteLocation  // 重定向到指定位置
  | Error          // 抛出错误，取消导航

// 或者返回 Promise
type NavigationGuard = (to, from) => 
  NavigationGuardReturn | Promise<NavigationGuardReturn>
```

**为什么这样设计？**

1. **符合直觉**：`return false` 取消，`return '/login'` 重定向
2. **支持异步**：返回 Promise 可以等待异步操作
3. **类型安全**：TypeScript 可以完整推断返回类型

### 与 Vue Router 3 的对比

```javascript
// Vue Router 3：必须调用 next()
router.beforeEach((to, from, next) => {
  if (!isLoggedIn()) {
    next('/login');
  } else {
    next();  // 容易忘记调用！
  }
});

// Vue Router 4：返回值决定行为
router.beforeEach((to, from) => {
  if (!isLoggedIn()) {
    return '/login';
  }
  // 不返回 = 继续（更简洁，不易出错）
});
```

**设计演进的原因**：
- `next()` 容易被遗忘，导致导航卡住
- `next()` 被多次调用会产生警告
- 返回值模式更符合现代 JavaScript 的编程风格

## 守卫的三个层级

**现在我要问第二个问题**：守卫应该定义在哪里？

Vue Router 提供了三个层级的守卫，适用于不同的场景：

### 层级一：全局守卫

**作用范围**：所有路由跳转

```javascript
// 全局前置守卫 - 最常用
router.beforeEach((to, from) => {
  console.log(`从 ${from.path} 导航到 ${to.path}`);
});

// 全局解析守卫 - 在组件守卫之后、确认之前
router.beforeResolve((to, from) => {
  // 确保所有组件守卫都通过了
});

// 全局后置钩子 - 导航完成后
router.afterEach((to, from) => {
  // 记录页面访问日志
  analytics.trackPageView(to.path);
});
```

**典型用途**：
- 登录状态检查
- 权限验证
- 页面访问日志
- 进度条控制（NProgress）

### 层级二：路由独享守卫

**作用范围**：特定路由

```javascript
const routes = [
  {
    path: '/admin',
    component: AdminPanel,
    beforeEnter: (to, from) => {
      // 只在进入 /admin 时执行
      if (!isAdmin()) {
        return { name: 'Forbidden' };
      }
    }
  }
];
```

**为什么需要路由独享守卫？**

有些验证逻辑只对特定路由有意义，放在全局守卫中会增加不必要的判断：

```javascript
// 不好的做法：在全局守卫中判断路由
router.beforeEach((to) => {
  if (to.path === '/admin' && !isAdmin()) {
    return '/forbidden';
  }
  if (to.path === '/vip' && !isVip()) {
    return '/upgrade';
  }
  // ... 更多条件判断
});

// 好的做法：使用路由独享守卫
const routes = [
  { 
    path: '/admin', 
    beforeEnter: requireAdmin 
  },
  { 
    path: '/vip', 
    beforeEnter: requireVip 
  }
];
```

### 层级三：组件内守卫

**作用范围**：组件级别

```javascript
export default {
  // 进入前调用（组件实例未创建）
  beforeRouteEnter(to, from) {
    // 注意：这里不能访问 this
  },
  
  // 路由更新时调用（组件复用）
  beforeRouteUpdate(to, from) {
    // 可以访问 this
    this.fetchData(to.params.id);
  },
  
  // 离开前调用
  beforeRouteLeave(to, from) {
    // 可以访问 this
    if (this.hasUnsavedChanges) {
      return confirm('确定要离开吗？');
    }
  }
};
```

**组件内守卫的特殊之处**：

1. **`beforeRouteEnter` 不能访问 `this`**：因为组件实例还未创建
2. **`beforeRouteUpdate` 只在组件复用时调用**：比如从 `/user/1` 到 `/user/2`
3. **`beforeRouteLeave` 适合表单保护**：在用户离开前确认

## 完整的执行流程

**这是最关键的问题**：多个守卫的执行顺序是什么？

```
导航触发（push、replace 或 URL 变化）
           │
           ▼
┌─────────────────────────────────────┐
│  1. 失活组件的 beforeRouteLeave     │  ← 即将离开的组件
└─────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────┐
│  2. 全局 beforeEach                 │  ← 全局前置守卫
└─────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────┐
│  3. 复用组件的 beforeRouteUpdate    │  ← 组件复用时
└─────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────┐
│  4. 路由配置的 beforeEnter          │  ← 路由独享守卫
└─────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────┐
│  5. 解析异步路由组件                 │  ← 懒加载组件
└─────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────┐
│  6. 激活组件的 beforeRouteEnter     │  ← 即将进入的组件
└─────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────┐
│  7. 全局 beforeResolve              │  ← 最后确认机会
└─────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────┐
│  8. 导航确认，更新 currentRoute     │  ← 导航完成
└─────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────┐
│  9. 全局 afterEach                  │  ← 后置钩子
└─────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────┐
│  10. DOM 更新                       │  ← 视图渲染
└─────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────┐
│  11. beforeRouteEnter 的 next 回调  │  ← 组件实例创建后
└─────────────────────────────────────┘
```

### 为什么是这个顺序？

1. **先处理离开**：`beforeRouteLeave` 最先执行，因为用户可能要保存数据
2. **全局守卫早执行**：`beforeEach` 在路由独享守卫之前，可以尽早拦截
3. **组件守卫靠后**：需要等异步组件加载完成
4. **`beforeResolve` 是最后一道防线**：所有守卫都通过后才调用
5. **`afterEach` 不能阻止导航**：因为导航已经确认

## 守卫的取消机制

**思考一下**：如果某个守卫返回 `false`，后续守卫还会执行吗？

答案是**不会**。这是责任链模式的典型应用：

```javascript
async function runGuards(guards, to, from) {
  for (const guard of guards) {
    const result = await guard(to, from);
    
    // 任何非 undefined/true 的值都会中断执行
    if (result === false) {
      throw new NavigationAborted(to, from);
    }
    if (typeof result === 'string' || isRouteLocation(result)) {
      throw new NavigationRedirect(result);
    }
    if (result instanceof Error) {
      throw result;
    }
    // result === undefined || result === true → 继续
  }
}
```

**设计要点**：
- **短路执行**：一旦有守卫返回取消/重定向，立即停止
- **异常即中断**：使用异常来中断执行流，清晰且高效
- **区分中断原因**：`NavigationAborted` vs `NavigationRedirect`

## 最佳实践

### 1. 守卫应该做什么

✅ **适合在守卫中做的事**：
- 权限验证
- 重定向逻辑
- 取消导航
- 记录日志

❌ **不适合在守卫中做的事**：
- 复杂的数据获取（使用组件的 `setup` 或 `onMounted`）
- 修改 DOM
- 长时间的同步操作

### 2. 守卫应该保持简洁

```javascript
// ❌ 不好：守卫中做太多事情
router.beforeEach(async (to) => {
  const user = await fetchUser();
  const permissions = await fetchPermissions(user.id);
  const settings = await fetchSettings();
  // ... 更多异步操作
});

// ✅ 好：守卫只做决策，数据获取交给组件
router.beforeEach((to) => {
  if (to.meta.requiresAuth && !store.isLoggedIn) {
    return '/login';
  }
});
```

### 3. 使用 meta 字段传递配置

```javascript
const routes = [
  {
    path: '/admin',
    component: Admin,
    meta: { 
      requiresAuth: true,
      requiredRole: 'admin'
    }
  }
];

router.beforeEach((to) => {
  if (to.meta.requiresAuth && !isLoggedIn()) {
    return '/login';
  }
  if (to.meta.requiredRole && !hasRole(to.meta.requiredRole)) {
    return '/forbidden';
  }
});
```

## 小结

本章我们理解了导航守卫的设计思想：

1. **AOP 思想**：在不修改业务代码的情况下，在路由层面统一处理横切关注点
2. **三个层级**：全局守卫、路由独享守卫、组件内守卫，各有适用场景
3. **返回值决定行为**：Vue Router 4 用返回值替代 `next()`，更简洁不易出错
4. **精确的执行顺序**：从 `beforeRouteLeave` 到 `afterEach`，每个节点都有明确的职责
5. **短路执行**：任何守卫返回取消/重定向，后续守卫不再执行

下一章，我们将动手实现全局守卫系统。
