# addRoute 与 removeRoute 动态路由

实现动态添加和删除路由。

```typescript
function addRoute(
  parentName: string | RouteRecordRaw,
  route?: RouteRecordRaw
): () => void {
  if (typeof parentName === 'string') {
    const parent = matcher.getRoutes().find(r => r.name === parentName);
    return matcher.addRoute(route!, parent);
  }
  return matcher.addRoute(parentName);
}

function removeRoute(name: string) {
  matcher.removeRoute(name);
}

function hasRoute(name: string): boolean {
  return matcher.getRoutes().some(r => r.name === name);
}

function getRoutes() {
  return matcher.getRoutes();
}
```

**使用示例**：

```typescript
// 动态添加
const removeRoute = router.addRoute({
  path: '/admin',
  component: Admin
});

// 删除
removeRoute();
```

至此，Router 核心（第22-27章）完成。下一部分实现 Vue 集成（第28-33章）。
