# 嵌套路由与路由树

嵌套路由让我们可以构建复杂的页面结构。本章实现路由树和嵌套匹配。

## 嵌套路由的需求

```javascript
const routes = [
  {
    path: '/user/:id',
    component: User,
    children: [
      {
        path: 'profile',
        component: UserProfile
      },
      {
        path: 'posts',
        component: UserPosts
      }
    ]
  }
];

// 访问 /user/123/profile
// 需要渲染: User 组件 + UserProfile 组件
```

## 路由树结构

```typescript
interface RouteRecordNormalized {
  path: string;
  regex: RegExp;
  component: Component;
  parent?: RouteRecordNormalized;
  children: RouteRecordNormalized[];
}

function normalizeRoutes(
  routes: RouteRecordRaw[],
  parent?: RouteRecordNormalized
): RouteRecordNormalized[] {
  return routes.map(route => {
    // 计算完整路径
    const fullPath = parent
      ? joinPath(parent.path, route.path)
      : route.path;
    
    const normalized: RouteRecordNormalized = {
      path: fullPath,
      regex: parsePathToRegex(fullPath).regex,
      component: route.component,
      parent,
      children: []
    };
    
    // 递归处理子路由
    if (route.children) {
      normalized.children = normalizeRoutes(route.children, normalized);
    }
    
    return normalized;
  });
}

function joinPath(parent: string, child: string): string {
  return `${parent}/${child}`.replace(/\/+/g, '/');
}
```

## 嵌套匹配

```typescript
function matchRoutes(
  url: string,
  routes: RouteRecordNormalized[]
): RouteRecordNormalized[] | null {
  for (const route of routes) {
    const match = url.match(route.regex);
    
    if (match) {
      // 如果有子路由，继续匹配
      if (route.children.length > 0) {
        const childMatch = matchRoutes(url, route.children);
        if (childMatch) {
          return [route, ...childMatch];
        }
      }
      
      return [route];
    }
  }
  
  return null;
}

// 测试
const routes = normalizeRoutes([
  {
    path: '/user/:id',
    component: User,
    children: [
      { path: 'profile', component: UserProfile }
    ]
  }
]);

matchRoutes('/user/123/profile', routes);
// [
//   { path: '/user/:id', component: User },
//   { path: '/user/:id/profile', component: UserProfile }
// ]
```

## 渲染嵌套视图

```vue
<!-- User.vue -->
<template>
  <div>
    <h1>User {{ $route.params.id }}</h1>
    <router-view /> <!-- 渲染子路由 -->
  </div>
</template>

<!-- UserProfile.vue -->
<template>
  <div>User Profile</div>
</template>
```

## 总结

实现了嵌套路由：
- 路由树结构
- 完整路径计算
- 递归匹配
- 返回匹配链

下一章实现路由优先级与权重计算。
