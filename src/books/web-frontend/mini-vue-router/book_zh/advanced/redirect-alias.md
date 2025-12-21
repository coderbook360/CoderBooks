# 重定向与别名

重定向和别名是路由系统中的两种重要机制。本章实现完整的重定向和别名功能。

## 设计动机

首先要问一个问题：**重定向和别名有什么区别？**

### 重定向（Redirect）

**目的**：将一个路径转发到另一个路径

```typescript
const routes = [
  { path: '/home', redirect: '/' },
  { path: '/', component: Home }
];

// 访问 /home → 重定向到 / → URL 变为 /
```

**特点**：
- URL 会变化
- 浏览器历史会记录重定向
- 用于路径迁移、默认路由

### 别名（Alias）

**目的**：为同一个路由提供多个访问路径

```typescript
const routes = [
  {
    path: '/users',
    component: Users,
    alias: ['/people', '/u']
  }
];

// 访问 /users → 渲染 Users → URL 保持 /users
// 访问 /people → 渲染 Users → URL 保持 /people
```

简单来说：重定向会改变 URL，别名不会。

## 重定向实现

### 版本 1：简单重定向

先来实现最基础的重定向。思路很简单：导航时检查目标路由有没有配置 `redirect`，有的话就跳过去。

```typescript
interface RouteRecordRaw {
  path: string;
  component?: Component;
  redirect?: string | RouteLocationRaw;
}

function normalizeRouteRecord(record: RouteRecordRaw): RouteRecordNormalized {
  return {
    path: record.path,
    components: record.component ? { default: record.component } : {},
    redirect: record.redirect,
  };
}

async function navigate(to: RouteLocation) {
  const matched = matcher.resolve(to);
  const lastMatch = matched.matched[matched.matched.length - 1];
  
  if (lastMatch?.redirect) {
    const redirectTo = typeof lastMatch.redirect === 'string'
      ? lastMatch.redirect
      : lastMatch.redirect;
    
    // 递归导航到重定向目标
    return navigate(router.resolve(redirectTo));
  }
  
  // 正常导航...
}
```

这里用了递归，所以多级重定向（A → B → C）也能正常工作。

流程是这样的：

```
访问 /home → 匹配到 { path: '/home', redirect: '/' }
    ↓
检测到 redirect，递归调用 navigate('/')
    ↓
匹配到 { path: '/', component: Home }
    ↓
无重定向，渲染 Home，URL 变为 /
       ↓
matcher.resolve('/home') → 找到 { path: '/home', redirect: '/' }
       ↓
检测到 redirect: '/'
       ↓
递归调用 navigate('/')
       ↓
matcher.resolve('/') → 找到 { path: '/', component: Home }
       ↓
无重定向，渲染 Home，URL 变为 /
```

### 版本 2：动态重定向

有时候重定向目标不是固定的，需要根据当前路由动态决定。比如把路径参数转成查询参数：

```typescript
interface RouteRecordRaw {
  path: string;
  component?: Component;
  redirect?: 
    | string
    | RouteLocationRaw
    | ((to: RouteLocation) => string | RouteLocationRaw);  // 支持函数
}

function resolveRedirect(
  redirect: NonNullable<RouteRecordNormalized['redirect']>,
  to: RouteLocation
): RouteLocation {
  if (typeof redirect === 'function') {
    return redirect(to);  // 函数形式，传入当前路由让它决定
  }
  return typeof redirect === 'string' 
    ? router.resolve(redirect)
    : router.resolve(redirect);
}
```

用法：

```typescript
const routes = [
  {
    path: '/search/:text',
    redirect: to => ({
      path: '/search',
      query: { q: to.params.text }
    })
  },
  {
    path: '/search',
    component: Search
  }
];

// /search/vue → /search?q=vue
```

### 版本 3：防止无限循环

递归有个风险：如果配置错了，可能会无限循环。

```typescript
// 错误配置，会无限循环
const routes = [
  { path: '/a', redirect: '/b' },
  { path: '/b', redirect: '/a' }  // A → B → A → B → ...
];
```

解决办法很简单，加个计数器，超过一定次数就报错：

```typescript
const MAX_REDIRECT_COUNT = 10;

async function navigate(to: RouteLocation, redirectCount = 0) {
  if (redirectCount > MAX_REDIRECT_COUNT) {
    throw new Error('Redirect loop detected');
  }
  
  const matched = matcher.resolve(to);
  const lastMatch = matched.matched[matched.matched.length - 1];
  
  if (lastMatch?.redirect) {
    const redirectTo = resolveRedirect(lastMatch.redirect, to);
    return navigate(redirectTo, redirectCount + 1);
  }
  
  // 正常导航...
}
```

为什么是 10 次？正常应用的重定向链条不会超过 3-5 次，10 次足够检测问题了。

## 别名实现

别名与重定向不同，它不会改变 URL，而是为同一个路由提供多个访问路径。

我们将分两个版本实现别名功能：

1. **版本 1**：基础别名 - 支持单个或多个别名
2. **版本 2**：嵌套路由别名 - 正确处理父路径拼接

### 版本 1：基础别名

**目标**：支持为一个路由配置一个或多个别名。

**核心思路**：将别名展开为多个独立的路由记录，它们指向同一个组件。

```typescript
interface RouteRecordRaw {
  path: string;
  component?: Component;
  alias?: string | string[];  // 新增：支持字符串或字符串数组
}

// 将一个路由记录展开为多个记录（主路由 + 别名路由）
function normalizeRouteWithAlias(
  record: RouteRecordRaw,
  parent?: RouteRecordNormalized
): RouteRecordNormalized[] {
  const records: RouteRecordNormalized[] = [];
  
  // 1. 首先创建主路由记录
  const mainRecord = normalizeRouteRecord(record, parent);
  records.push(mainRecord);
  
  // 2. 处理别名，统一转换为数组
  const aliases = Array.isArray(record.alias) 
    ? record.alias        // 已经是数组
    : record.alias        // 单个字符串 
      ? [record.alias] 
      : [];
  
  for (const alias of aliases) {
    const aliasRecord = {
      ...mainRecord,
      path: alias,
      // 指向主记录
      aliasOf: mainRecord
    };
    records.push(aliasRecord);
  }
  
  return records;
}
```

**关键设计**：
- 别名创建独立的路由记录
- 通过 `aliasOf` 指向主记录
- 共享同一组件和子路由

### 版本 2：嵌套路由别名

```typescript
function normalizeRouteWithAlias(
  record: RouteRecordRaw,
  parent?: RouteRecordNormalized
): RouteRecordNormalized[] {
  const records: RouteRecordNormalized[] = [];
  
  // 解析绝对路径
  const fullPath = parent 
    ? joinPaths(parent.path, record.path)
    : record.path;
  
  const mainRecord = {
    path: fullPath,
    // ...其他字段
  };
  records.push(mainRecord);
  
  // 别名：也需要考虑父路径
  const aliases = Array.isArray(record.alias) ? record.alias : [record.alias || ''];
  
  for (const alias of aliases.filter(Boolean)) {
    const aliasFullPath = parent
      ? joinPaths(parent.path, alias)  // 拼接父路径
      : alias;
    
    records.push({
      ...mainRecord,
      path: aliasFullPath,
      aliasOf: mainRecord
    });
  }
  
  return records;
}
```

## 完整实现

```typescript
// src/matcher/index.ts

export function createRouterMatcher(routes: RouteRecordRaw[]) {
  const matchers: RouteRecordMatcher[] = [];
  
  function addRoute(record: RouteRecordRaw, parent?: RouteRecordNormalized) {
    // 展开别名
    const records = normalizeRouteWithAlias(record, parent);
    
    for (const normalized of records) {
      // 添加到匹配器
      matchers.push(createRouteMatcher(normalized));
      
      // 递归处理子路由
      if (record.children) {
        for (const child of record.children) {
          addRoute(child, normalized);
        }
      }
    }
  }
  
  function resolve(location: RouteLocation): RouteLocationMatched {
    const matched = findMatchedRoute(location);
    
    // 处理重定向
    const lastMatch = matched[matched.length - 1];
    if (lastMatch?.redirect) {
      const redirectTo = resolveRedirect(lastMatch.redirect, location);
      return resolve(redirectTo);  // 递归
    }
    
    return { matched, /* ... */ };
  }
  
  // 初始化
  for (const route of routes) {
    addRoute(route);
  }
  
  return { addRoute, resolve };
}
```

## 实战场景

### 场景1：默认路由

```typescript
const routes = [
  { path: '/', component: Home },
  { path: '/home', redirect: '/' }
];
```

### 场景2：URL 迁移

```typescript
const routes = [
  // 旧 URL 重定向到新 URL
  { path: '/old-path', redirect: '/new-path' },
  { path: '/new-path', component: NewPage }
];
```

### 场景3：多语言路径

```typescript
const routes = [
  {
    path: '/users',
    component: Users,
    alias: ['/utilisateurs', '/usuarios', '/用户']
  }
];
```

### 场景4：参数转换

```typescript
const routes = [
  {
    path: '/search/:text',
    redirect: to => ({
      path: '/search',
      query: { q: to.params.text }
    })
  },
  { path: '/search', component: Search }
];
```

### 场景5：命名路由重定向

```typescript
const routes = [
  {
    path: '/admin',
    redirect: to => {
      // 根据条件重定向
      return isAdmin()
        ? { name: 'AdminDashboard' }
        : { name: 'Login' };
    }
  }
];
```

## 常见陷阱

### 陷阱1：无限重定向循环

```typescript
// ❌ 错误
const routes = [
  { path: '/a', redirect: '/b' },
  { path: '/b', redirect: '/a' }  // 循环！
];

// ✅ 正确：在 navigate 中限制次数
if (redirectCount > MAX_REDIRECT_COUNT) {
  throw new Error('Infinite redirect loop');
}
```

### 陷阱2：别名和重定向混淆

```typescript
// ❌ 错误：同时使用
const routes = [
  {
    path: '/users',
    redirect: '/people',
    alias: '/u'  // 不应该同时使用
  }
];

// ✅ 正确：只用别名
const routes = [
  {
    path: '/users',
    component: Users,
    alias: ['/people', '/u']
  }
];
```

### 陷阱3：忘记处理嵌套路由

```typescript
// ❌ 错误：别名未考虑父路径
const routes = [
  {
    path: '/admin',
    children: [
      {
        path: 'users',
        alias: 'people'  // 应该是 /admin/people
      }
    ]
  }
];

// ✅ 正确：别名拼接父路径
const aliasFullPath = joinPaths(parent.path, alias);
```

## 小结

本章实现了重定向和别名功能：

**重定向**：
- 支持字符串、对象、函数
- 递归处理多级重定向
- 防止无限循环

**别名**：
- 为同一组件提供多个路径
- 支持嵌套路由别名
- URL 保持不变

**应用场景**：
- URL 迁移
- 多语言路径
- 参数格式转换
- SEO 优化

至此，高级特性全部完成！下一部分实现错误处理章节。
