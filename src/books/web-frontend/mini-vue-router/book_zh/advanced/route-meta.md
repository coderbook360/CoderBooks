# 路由元信息与权限控制

路由元信息（meta）是存储路由额外信息的机制。本章实现完整的元信息系统和权限控制。

## 元信息的设计动机

首先要问一个问题：**为什么需要路由元信息？**

### 问题场景

```typescript
const routes = [
  { path: '/admin', component: Admin },
  { path: '/user', component: User }
];

// 如何标记哪些路由需要登录？
// 如何设置页面标题？
// 如何控制访问权限？
```

**解决方案**：在路由配置中添加 `meta` 字段。

```typescript
const routes = [
  {
    path: '/admin',
    component: Admin,
    meta: {
      requiresAuth: true,
      roles: ['admin'],
      title: '管理后台'
    }
  },
  {
    path: '/user',
    component: User,
    meta: {
      requiresAuth: true,
      title: '用户中心'
    }
  },
  {
    path: '/about',
    component: About,
    meta: {
      title: '关于我们'
    }
  }
];
```

## 元信息类型定义

```typescript
// types.ts

interface RouteRecordRaw {
  path: string;
  component?: Component;
  meta?: RouteMeta;
  children?: RouteRecordRaw[];
}

interface RouteMeta {
  // 权限相关
  requiresAuth?: boolean;
  roles?: string[];
  permissions?: string[];
  
  // 页面信息
  title?: string;
  description?: string;
  keywords?: string[];
  
  // UI 相关
  layout?: string;
  keepAlive?: boolean;
  transition?: string;
  
  // 其他自定义字段
  [key: string]: any;
}
```

## 实现 meta 系统

### 版本 1：基础实现

```typescript
// src/matcher/index.ts

function normalizeRouteRecord(record: RouteRecordRaw): RouteRecordNormalized {
  return {
    path: record.path,
    components: { default: record.component },
    meta: record.meta || {},  // 保存 meta
    // ...其他字段
  };
}
```

### 版本 2：嵌套路由 meta 合并

```typescript
// 计算合并后的 meta
function extractMeta(matched: RouteRecordNormalized[]): RouteMeta {
  return matched.reduce((meta, record) => {
    return { ...meta, ...record.meta };
  }, {} as RouteMeta);
}

// 在路由对象中提供合并后的 meta
const route: RouteLocationNormalized = {
  // ...其他字段
  meta: extractMeta(matched)
};
```

**为什么需要合并？**

```typescript
const routes = [
  {
    path: '/admin',
    meta: { layout: 'admin' },
    children: [
      {
        path: 'users',
        meta: { requiresAuth: true },
        children: [
          {
            path: ':id',
            meta: { title: '用户详情' }
          }
        ]
      }
    ]
  }
];

// 访问 /admin/users/123
route.meta = {
  layout: 'admin',        // 从第一层继承
  requiresAuth: true,     // 从第二层继承
  title: '用户详情'      // 从第三层
};
```

## 权限控制实现

### 基础权限守卫

```typescript
// src/guards/auth.ts

import type { NavigationGuard } from '../types';

export function createAuthGuard(): NavigationGuard {
  return (to, from) => {
    // 检查是否需要登录
    if (to.meta.requiresAuth) {
      const isLoggedIn = checkAuth();
      
      if (!isLoggedIn) {
        // 重定向到登录页，并保存目标路径
        return {
          name: 'Login',
          query: { redirect: to.fullPath }
        };
      }
    }
  };
}

function checkAuth(): boolean {
  // 检查是否已登录
  return !!localStorage.getItem('token');
}
```

### 角色权限守卫

```typescript
export function createRoleGuard(): NavigationGuard {
  return (to, from) => {
    const requiredRoles = to.meta.roles as string[] | undefined;
    
    if (!requiredRoles || requiredRoles.length === 0) {
      return;  // 不需要角色检查
    }
    
    const userRoles = getUserRoles();
    
    // 检查用户是否有任一所需角色
    const hasRole = requiredRoles.some(role => userRoles.includes(role));
    
    if (!hasRole) {
      // 无权访问
      return '/403';
    }
  };
}

function getUserRoles(): string[] {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  return user.roles || [];
}
```

### 细粒度权限守卫

```typescript
export function createPermissionGuard(): NavigationGuard {
  return (to, from) => {
    const requiredPermissions = to.meta.permissions as string[] | undefined;
    
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return;
    }
    
    const userPermissions = getUserPermissions();
    
    // 检查用户是否拥有所有所需权限
    const hasAllPermissions = requiredPermissions.every(
      permission => userPermissions.includes(permission)
    );
    
    if (!hasAllPermissions) {
      return '/403';
    }
  };
}

function getUserPermissions(): string[] {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  return user.permissions || [];
}
```

### 注册守卫

```typescript
const router = createRouter({ /* ... */ });

// 注册权限守卫
router.beforeEach(createAuthGuard());
router.beforeEach(createRoleGuard());
router.beforeEach(createPermissionGuard());
```

## 实战场景

### 场景1：页面标题管理

```typescript
// 路由配置
const routes = [
  {
    path: '/home',
    component: Home,
    meta: { title: '首页' }
  },
  {
    path: '/user/:id',
    component: User,
    meta: { title: '用户详情' }
  }
];

// 全局守卫设置标题
router.afterEach((to) => {
  document.title = to.meta.title || '默认标题';
});
```

### 场景2：面包屑导航

```typescript
const routes = [
  {
    path: '/admin',
    meta: { breadcrumb: '管理后台' },
    children: [
      {
        path: 'users',
        meta: { breadcrumb: '用户管理' },
        children: [
          {
            path: ':id',
            meta: { breadcrumb: '用户详情' }
          }
        ]
      }
    ]
  }
];

// 组件中使用
const breadcrumbs = computed(() => {
  return route.matched
    .filter(r => r.meta.breadcrumb)
    .map(r => r.meta.breadcrumb);
});
// 结果: ['管理后台', '用户管理', '用户详情']
```

### 场景3：页面布局切换

```typescript
const routes = [
  {
    path: '/admin',
    component: Admin,
    meta: { layout: 'admin' }
  },
  {
    path: '/user',
    component: User,
    meta: { layout: 'default' }
  }
];
```

```vue
<!-- App.vue -->
<template>
  <component :is="layoutComponent">
    <router-view />
  </component>
</template>

<script setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import DefaultLayout from './layouts/DefaultLayout.vue';
import AdminLayout from './layouts/AdminLayout.vue';

const route = useRoute();

const layoutComponent = computed(() => {
  const layout = route.meta.layout || 'default';
  return layout === 'admin' ? AdminLayout : DefaultLayout;
});
</script>
```

### 场景4：KeepAlive 控制

```typescript
const routes = [
  {
    path: '/list',
    component: List,
    meta: { keepAlive: true }  // 需要缓存
  },
  {
    path: '/detail/:id',
    component: Detail,
    meta: { keepAlive: false }  // 不缓存
  }
];
```

```vue
<template>
  <router-view v-slot="{ Component, route }">
    <keep-alive>
      <component
        v-if="route.meta.keepAlive"
        :is="Component"
        :key="route.fullPath"
      />
    </keep-alive>
    <component
      v-if="!route.meta.keepAlive"
      :is="Component"
      :key="route.fullPath"
    />
  </router-view>
</template>
```

### 场景5：权限按钮显示

```vue
<template>
  <button v-if="canEdit">编辑</button>
  <button v-if="canDelete">删除</button>
</template>

<script setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();

const permissions = computed(() => route.meta.permissions as string[] || []);
const canEdit = computed(() => permissions.value.includes('user:edit'));
const canDelete = computed(() => permissions.value.includes('user:delete'));
</script>
```

## 常见陷阱

### 陷阱1：忘记合并嵌套 meta

```typescript
// ❌ 错误：只获取当前层级 meta
const meta = route.matched[route.matched.length - 1].meta;

// ✅ 正确：合并所有层级 meta
const meta = route.matched.reduce(
  (acc, record) => ({ ...acc, ...record.meta }),
  {}
);
```

### 陷阱2：直接修改 meta

```typescript
// ❌ 错误
route.meta.visited = true;

// ✅ 正确：使用响应式状态
const visitedPages = ref(new Set());
watchEffect(() => {
  visitedPages.value.add(route.fullPath);
});
```

### 陷阱3：权限检查时机错误

```typescript
// ❌ 错误：在 afterEach 检查权限（已经导航了）
router.afterEach((to) => {
  if (to.meta.requiresAuth && !isLoggedIn()) {
    router.push('/login');  // 已经晚了
  }
});

// ✅ 正确：在 beforeEach 检查
router.beforeEach((to) => {
  if (to.meta.requiresAuth && !isLoggedIn()) {
    return '/login';  // 阻止导航
  }
});
```

## 小结

本章实现了完整的路由元信息与权限控制系统：

**核心概念**：
- 元信息存储路由额外数据
- 嵌套路由 meta 自动合并
- 通过守卫实现权限控制

**权限体系**：
- 登录检查（requiresAuth）
- 角色检查（roles）
- 权限检查（permissions）

**实战应用**：
- 页面标题管理
- 面包屑导航
- 布局切换
- KeepAlive 控制
- 按钮权限显示

下一章实现命名视图与多视图渲染。
