# 路由解析与 resolve 方法

`resolve` 方法将 `RouteLocationRaw` 解析为完整的路由位置。

```typescript
function resolve(to: RouteLocationRaw): RouteLocation {
  // 字符串形式
  if (typeof to === 'string') {
    return matcher.resolve(to);
  }
  
  // 对象形式
  if (to.name) {
    // 命名路由
    const route = matcher.getRoutes().find(r => r.name === to.name);
    if (!route) {
      throw new Error(`No route named ${to.name}`);
    }
    return buildLocation(route, to.params, to.query, to.hash);
  }
  
  if (to.path) {
    // 路径形式
    return matcher.resolve(to.path);
  }
  
  throw new Error('Invalid route location');
}
```

下一章实现动态路由 API。
