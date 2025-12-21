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

**特点**：
- URL 不变
- 多个路径指向同一组件
- 用于 SEO、兼容旧 URL

## 重定向实现

### 版本 1：简单重定向

```typescript
// 路由配置
interface RouteRecordRaw {
  path: string;
  component?: Component;
  redirect?: string | RouteLocationRaw;  // 新增
}

// 匹配器处理
function normalizeRouteRecord(record: RouteRecordRaw): RouteRecordNormalized {
  return {
    path: record.path,
    components: record.component ? { default: record.component } : {},
    redirect: record.redirect,  // 保存 redirect
  };
}

// 导航时处理
async function navigate(to: RouteLocation) {
  const matched = matcher.resolve(to);
  
  // 检查是否有重定向
  const lastMatch = matched.matched[matched.matched.length - 1];
  if (lastMatch?.redirect) {
    const redirectTo = typeof lastMatch.redirect === 'string'
      ? lastMatch.redirect
      : lastMatch.redirect;
    
    // 递归处理重定向
    return navigate(router.resolve(redirectTo));
  }
  
  // 正常导航...
}
```

### 版本 2：动态重定向

```typescript
interface RouteRecordRaw {
  path: string;
  component?: Component;
  redirect?: 
    | string 
    | RouteLocationRaw 
    | ((to: RouteLocation) => string | RouteLocationRaw);  // 函数
}

// 处理动态重定向
function resolveRedirect(
  redirect: NonNullable<RouteRecordNormalized['redirect']>,
  to: RouteLocation
): RouteLocation {
  if (typeof redirect === 'function') {
    return redirect(to);
  }
  return typeof redirect === 'string' 
    ? router.resolve(redirect)
    : router.resolve(redirect);
}
```

**使用示例**：

```typescript
const routes = [
  {
    path: '/search/:text',
    redirect: to => {
      // 将路径参数转换为查询参数
      return {
        path: '/search',
        query: { q: to.params.text }
      };
    }
  },
  {
    path: '/search',
    component: Search
  }
];

// 访问 /search/vue → 重定向到 /search?q=vue
```

### 版本 3：防止无限循环

```typescript
const MAX_REDIRECT_COUNT = 10;

async function navigate(
  to: RouteLocation,
  redirectCount = 0
) {
  // 新增：检查重定向次数
  if (redirectCount > MAX_REDIRECT_COUNT) {
    throw new Error(
      `Maximum redirect count exceeded. ` +
      `Possible infinite redirect loop detected.`
    );
  }
  
  const matched = matcher.resolve(to);
  const lastMatch = matched.matched[matched.matched.length - 1];
  
  if (lastMatch?.redirect) {
    const redirectTo = resolveRedirect(lastMatch.redirect, to);
    // 递增重定向计数
    return navigate(redirectTo, redirectCount + 1);
  }
  
  // ...
}
```

## 别名实现

### 版本 1：基础别名

```typescript
interface RouteRecordRaw {
  path: string;
  component?: Component;
  alias?: string | string[];  // 新增
}

// 将别名展开为多个路由记录
function normalizeRouteWithAlias(
  record: RouteRecordRaw,
  parent?: RouteRecordNormalized
): RouteRecordNormalized[] {
  const records: RouteRecordNormalized[] = [];
  
  // 主路由
  const mainRecord = normalizeRouteRecord(record, parent);
  records.push(mainRecord);
  
  // 别名路由
  const aliases = Array.isArray(record.alias) 
    ? record.alias 
    : record.alias 
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

至此，高级特性（第34-37章）全部完成！下一部分实现错误处理（第38-39章）。
  if (route.alias) {
    const aliases = Array.isArray(route.alias) ? route.alias : [route.alias];
    aliases.forEach(alias => {
      records.push({
        ...route,
        path: alias,
        alias: undefined
      });
    });
  }
  
  return records;
}
```

**重定向 vs 别名**：
- 重定向：URL 改变
- 别名：URL 不变

至此，高级特性（第34-37章）完成。下一部分实现错误处理（第38-39章）。
