# 路由独享守卫实现

路由独享守卫在路由配置中定义，只对特定路由生效。

## 实现

```typescript
interface RouteRecordNormalized {
  path: string;
  beforeEnter?: NavigationGuard | NavigationGuard[];
  // ...
}

async function runRouteBeforeEnter(
  matched: RouteRecordNormalized[],
  to,
  from
) {
  for (const record of matched) {
    if (record.beforeEnter) {
      const guards = Array.isArray(record.beforeEnter)
        ? record.beforeEnter
        : [record.beforeEnter];
      
      for (const guard of guards) {
        const result = await guard(to, from);
        if (result !== undefined) return result;
      }
    }
  }
}
```

## 使用示例

```javascript
const routes = [
  {
    path: '/admin',
    component: Admin,
    beforeEnter: [
      (to, from) => {
        if (!isAuthenticated()) return '/login';
      },
      (to, from) => {
        if (!isAdmin()) return '/403';
      }
    ]
  }
];
```

下一章实现组件内守卫。
