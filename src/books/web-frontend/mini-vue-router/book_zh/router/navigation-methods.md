# push 与 replace 导航

上一章实现了路由状态管理，本章实现最常用的两个导航方法：`push` 和 `replace`。

**首先要问一个问题**：`push` 和 `replace` 有什么区别？

```
浏览器历史栈：[ /home, /about, /contact ]
                               ↑ 当前位置

push('/user'):   [ /home, /about, /contact, /user ]  ← 新增一条
                                             ↑

replace('/user'): [ /home, /about, /user ]  ← 替换当前
                                   ↑
```

- **push**：在历史栈中**添加**新记录，用户可以点击后退返回
- **replace**：**替换**当前记录，用户无法后退到被替换的页面

## 基础实现

### 第一版：最简单的实现

```typescript
// src/router.ts

function push(to: RouteLocationRaw): void {
  const resolved = matcher.resolve(normalizeLocation(to));
  history.push(resolved.fullPath);
  currentRoute.value = resolved;
}

function replace(to: RouteLocationRaw): void {
  const resolved = matcher.resolve(normalizeLocation(to));
  history.replace(resolved.fullPath);
  currentRoute.value = resolved;
}
```

**问题**：这个实现有什么缺陷？

1. **没有执行守卫**：绕过了所有导航守卫
2. **没有处理重定向**：无法处理 `{ redirect: '/other' }` 配置
3. **没有返回值**：调用者不知道导航是否成功
4. **没有处理异步**：守卫可能是异步的

### 第二版：支持守卫和返回值

```typescript
async function push(to: RouteLocationRaw): Promise<NavigationFailure | void> {
  return navigateTo(to, 'push');
}

async function replace(to: RouteLocationRaw): Promise<NavigationFailure | void> {
  return navigateTo(to, 'replace');
}

async function navigateTo(
  to: RouteLocationRaw, 
  type: 'push' | 'replace'
): Promise<NavigationFailure | void> {
  const targetLocation = resolve(to);
  const from = currentRoute.value;
  
  try {
    // 执行导航守卫
    await runGuards(targetLocation, from);
    
    // 更新 URL
    history[type](targetLocation.fullPath);
    
    // 更新路由状态
    updateRouteState(targetLocation);
    
  } catch (error) {
    if (isNavigationFailure(error)) {
      return error;  // 返回错误但不抛出
    }
    throw error;
  }
}
```

**现在我要问第二个问题**：为什么返回错误而不是抛出？

```typescript
// 抛出错误（不推荐）
try {
  await router.push('/admin');
} catch (error) {
  // 每次导航都要 try/catch？太啰嗦了
}

// 返回错误（推荐）
const failure = await router.push('/admin');
if (failure) {
  // 只在需要时处理
  console.log('导航失败:', failure.type);
}
```

这是一种更友好的 API 设计，避免了过多的 try/catch。

### 第三版：支持重定向

```typescript
async function pushWithRedirect(
  to: RouteLocationRaw,
  redirectedFrom?: RouteLocationNormalized
): Promise<NavigationFailure | void> {
  const targetLocation = resolve(to);
  
  // 记录重定向来源
  if (redirectedFrom) {
    targetLocation.redirectedFrom = redirectedFrom;
  }
  
  const from = currentRoute.value;
  
  try {
    await runGuards(targetLocation, from);
    
    // 检查是否需要重定向
    if (targetLocation.redirect) {
      return pushWithRedirect(targetLocation.redirect, targetLocation);
    }
    
    history.push(targetLocation.fullPath);
    updateRouteState(targetLocation);
    
  } catch (error) {
    // 守卫返回重定向
    if (error instanceof NavigationRedirect) {
      return pushWithRedirect(error.to, targetLocation);
    }
    
    if (isNavigationFailure(error)) {
      return error;
    }
    throw error;
  }
}
```

**重定向的两种方式**：

1. **路由配置**：`{ path: '/old', redirect: '/new' }`
2. **守卫返回**：`next('/login')` 或 `return { path: '/login' }`

两种方式都通过递归调用 `pushWithRedirect` 处理。

## 位置规范化

`push` 和 `replace` 接收的参数类型很灵活：

```typescript
// 字符串
router.push('/user/123');

// 带参数的字符串
router.push('/user/123?tab=profile#settings');

// 对象（路径形式）
router.push({ path: '/user/123' });

// 对象（命名路由）
router.push({ name: 'user', params: { id: '123' } });

// 带 query 和 hash
router.push({ 
  name: 'user', 
  params: { id: '123' },
  query: { tab: 'profile' },
  hash: '#settings'
});
```

需要一个规范化函数处理这些情况：

```typescript
// src/utils/location.ts

export function normalizeLocation(to: RouteLocationRaw): RouteLocationNormalized {
  if (typeof to === 'string') {
    return parseURL(to);
  }
  
  // 对象形式
  const location: RouteLocationNormalized = {
    path: to.path || '',
    name: to.name,
    params: to.params || {},
    query: to.query || {},
    hash: to.hash || ''
  };
  
  // 命名路由需要解析路径
  if (to.name && !to.path) {
    const route = matcher.getRouteByName(to.name);
    if (route) {
      location.path = fillParams(route.path, to.params);
    }
  }
  
  // 构建完整路径
  location.fullPath = buildFullPath(location);
  
  return location;
}

function parseURL(url: string): RouteLocationNormalized {
  const [pathWithQuery, hash = ''] = url.split('#');
  const [path, queryString = ''] = pathWithQuery.split('?');
  
  return {
    path,
    query: parseQuery(queryString),
    hash: hash ? '#' + hash : '',
    fullPath: url,
    params: {},
    name: undefined
  };
}
```

## 处理 replace 选项

Vue Router 支持在 `push` 中传入 `replace: true`：

```typescript
// 这两行等价
router.push({ path: '/about', replace: true });
router.replace({ path: '/about' });
```

实现这个功能：

```typescript
async function push(to: RouteLocationRaw): Promise<NavigationFailure | void> {
  // 检查是否指定了 replace
  const shouldReplace = typeof to === 'object' && to.replace === true;
  
  return pushWithRedirect(to, undefined, shouldReplace ? 'replace' : 'push');
}

async function replace(to: RouteLocationRaw): Promise<NavigationFailure | void> {
  return pushWithRedirect(to, undefined, 'replace');
}
```

## 导航完成回调

有时需要在导航完成后执行操作：

```typescript
// Promise 方式
await router.push('/about');
console.log('导航完成');

// 回调方式（Vue Router 2 风格）
router.push('/about', () => {
  console.log('成功');
}, (err) => {
  console.log('失败', err);
});
```

为了兼容性，同时支持两种方式：

```typescript
function push(
  to: RouteLocationRaw,
  onComplete?: () => void,
  onAbort?: (err: Error) => void
): Promise<NavigationFailure | void> {
  return pushWithRedirect(to).then(onComplete).catch(onAbort);
}
```

## 防止重复导航

**思考一个场景**：用户双击了链接会发生什么？

```typescript
router.push('/about');  // 导航 1
router.push('/about');  // 导航 2（相同目标）
```

第二次导航应该被忽略：

```typescript
async function navigateTo(to: RouteLocationRaw, type: 'push' | 'replace') {
  const targetLocation = resolve(to);
  const from = currentRoute.value;
  
  // 检查是否是相同位置
  if (isSameRouteLocation(from, targetLocation)) {
    // 返回重复导航错误
    return createNavigationDuplicatedError(from, targetLocation);
  }
  
  // 继续正常导航...
}

function isSameRouteLocation(
  a: RouteLocationNormalized, 
  b: RouteLocationNormalized
): boolean {
  return (
    a.path === b.path &&
    isEqual(a.query, b.query) &&
    a.hash === b.hash
  );
}
```

## 完整实现

```typescript
// src/router.ts

async function push(to: RouteLocationRaw): Promise<NavigationFailure | void> {
  const shouldReplace = typeof to === 'object' && to.replace === true;
  return pushWithRedirect(to, undefined, shouldReplace ? 'replace' : 'push');
}

async function replace(to: RouteLocationRaw): Promise<NavigationFailure | void> {
  return pushWithRedirect(to, undefined, 'replace');
}

async function pushWithRedirect(
  to: RouteLocationRaw,
  redirectedFrom?: RouteLocationNormalized,
  type: 'push' | 'replace' = 'push'
): Promise<NavigationFailure | void> {
  const targetLocation = resolve(to);
  const from = currentRoute.value;
  
  // 记录重定向来源
  if (redirectedFrom) {
    targetLocation.redirectedFrom = redirectedFrom;
  }
  
  // 检查重复导航
  if (isSameRouteLocation(from, targetLocation) && !redirectedFrom) {
    return createNavigationDuplicatedError(from, targetLocation);
  }
  
  try {
    // 标记导航开始
    isNavigating.value = true;
    pendingLocation.value = targetLocation;
    
    // 执行导航守卫
    await runGuards(targetLocation, from);
    
    // 检查是否被取消
    if (pendingLocation.value !== targetLocation) {
      throw createNavigationCancelledError(targetLocation, from);
    }
    
    // 处理重定向
    if (targetLocation.redirect) {
      return pushWithRedirect(targetLocation.redirect, targetLocation, type);
    }
    
    // 更新 URL
    history[type](targetLocation.fullPath);
    
    // 更新路由状态
    updateRouteState(targetLocation);
    
  } catch (error) {
    if (error instanceof NavigationRedirect) {
      return pushWithRedirect(error.to, targetLocation, type);
    }
    
    isNavigating.value = false;
    
    if (isNavigationFailure(error)) {
      failure.value = error;
      return error;
    }
    
    throw error;
  }
}
```

## 本章小结

`push` 和 `replace` 的核心要点：

1. **Promise 返回值**：支持 `await`，返回错误而不是抛出
2. **重定向处理**：递归调用处理多级重定向
3. **位置规范化**：统一处理字符串、对象、命名路由等格式
4. **防重复导航**：检测并阻止相同位置的重复导航
5. **并发控制**：使用 `pendingLocation` 处理竞争条件

下一章实现 `go`、`back`、`forward` 历史导航方法。
